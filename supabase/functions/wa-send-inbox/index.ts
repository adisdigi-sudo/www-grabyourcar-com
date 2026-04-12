import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * wa-send-inbox — Sends messages from the CRM Inbox
 * Enforces 24hr window: free text inside window, templates outside
 * Builds Meta-compliant template components from DB metadata
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return new Response(JSON.stringify({ error: "WhatsApp API not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    const {
      conversation_id,
      phone,
      message_type = "text",
      content,
      template_name,
      template_variables,
      template_components, // explicit components override
      media_url,
      media_filename,
      sent_by,
      sent_by_name,
    } = body;

    if (!conversation_id || !phone) {
      return new Response(JSON.stringify({ error: "conversation_id and phone required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check 24hr window
    const { data: convo } = await supabase
      .from("wa_conversations")
      .select("window_expires_at, last_customer_message_at")
      .eq("id", conversation_id)
      .single();

    const windowOpen = convo?.window_expires_at && new Date(convo.window_expires_at) > new Date();

    // If window closed and not a template, reject
    if (!windowOpen && message_type === "text") {
      return new Response(JSON.stringify({
        error: "24-hour window expired. Please use a template message.",
        window_expired: true,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── COST-SAVING STRATEGY ───
    // If window IS open and agent is sending a template, auto-downgrade to free text
    // This saves money: free service conversation vs paid template message
    // Meta policy: inside 24hr window, free-form text is FREE
    let effectiveMessageType = message_type;
    let costSaved = false;

    if (windowOpen && message_type === "template" && template_name && content && content.trim()) {
      // We have rendered content from the Fill Template dialog — send as free text instead
      console.log(`💰 Cost-saving: downgrading template "${template_name}" to free text (window open, ${
        Math.round((new Date(convo.window_expires_at).getTime() - Date.now()) / 60000)
      }min left)`);
      effectiveMessageType = "text";
      costSaved = true;
    }

    // Build Meta API payload
    const to = phone.startsWith("91") ? phone : `91${phone.replace(/\D/g, "")}`;
    let metaPayload: Record<string, unknown>;

    if (effectiveMessageType === "template" && template_name) {
      // ─── STRICT META-COMPLIANT TEMPLATE BUILDING ───
      
      // If explicit components provided (from Fill Template Dialog), use them directly
      if (template_components && Array.isArray(template_components) && template_components.length > 0) {
        metaPayload = {
          type: "template",
          template: {
            name: template_name,
            language: { code: "en" },
            components: template_components,
          },
        };
      } else {
        // Lookup template from DB for full metadata
        const { data: tplData } = await supabase
          .from("wa_templates")
          .select("body, buttons, category, header_type, header_content, variables, language, status")
          .eq("name", template_name)
          .single();

        // Block sending unapproved templates
        if (tplData && tplData.status !== "approved") {
          return new Response(JSON.stringify({ 
            error: `Template "${template_name}" is not approved (status: ${tplData.status}). Only approved templates can be sent.`,
            template_not_approved: true,
          }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const components: Record<string, unknown>[] = [];
        const tplBody = tplData?.body || "";
        const tplLang = tplData?.language || "en";

        // 1. HEADER component — if template has header with variables
        if (tplData?.header_type === "text" && tplData.header_content) {
          const headerVarMatches = (tplData.header_content as string).match(/\{\{(\w+)\}\}/g) || [];
          if (headerVarMatches.length > 0) {
            // Map header variable
            const headerVarName = headerVarMatches[0].replace(/[{}]/g, "");
            const headerValue = template_variables?.[headerVarName] || template_variables?.["header_1"] || template_variables?.["var_1"] || "";
            if (headerValue) {
              components.push({
                type: "header",
                parameters: [{ type: "text", text: String(headerValue) }],
              });
            }
          }
        }

        // 2. BODY component — map named variables to positional {{1}}, {{2}}
        if (template_variables && Object.keys(template_variables).length > 0) {
          // Extract variable names from template body to maintain order
          const bodyVarMatches = tplBody.match(/\{\{(\w+)\}\}/g) || [];
          const uniqueVars: string[] = [];
          for (const m of bodyVarMatches) {
            const varName = m.replace(/[{}]/g, "");
            if (!uniqueVars.includes(varName)) uniqueVars.push(varName);
          }

          // Build parameters in correct positional order
          const bodyParams: Record<string, unknown>[] = [];

          if (uniqueVars.length > 0) {
            // Named variables — map in order they appear in body
            for (const varName of uniqueVars) {
              const value = template_variables[varName] 
                || template_variables[`var_${uniqueVars.indexOf(varName) + 1}`] 
                || "";
              bodyParams.push({ type: "text", text: String(value) });
            }
          } else {
            // Positional variables (var_1, var_2, etc.)
            const sortedKeys = Object.keys(template_variables)
              .filter(k => /^(var_\d+|\d+)$/.test(k))
              .sort((a, b) => {
                const numA = parseInt(a.replace("var_", ""));
                const numB = parseInt(b.replace("var_", ""));
                return numA - numB;
              });
            for (const key of sortedKeys) {
              bodyParams.push({ type: "text", text: String(template_variables[key]) });
            }

            // If no positional keys, try all entries as sequential params
            if (bodyParams.length === 0) {
              for (const [, value] of Object.entries(template_variables)) {
                if (value !== null && value !== undefined && String(value).trim()) {
                  bodyParams.push({ type: "text", text: String(value) });
                }
              }
            }
          }

          if (bodyParams.length > 0) {
            components.push({ type: "body", parameters: bodyParams });
          }
        }

        // 3. BUTTON components — build from DB button metadata
        if (tplData?.buttons && Array.isArray(tplData.buttons)) {
          const buttons = tplData.buttons as Array<Record<string, unknown>>;
          buttons.forEach((btn, idx) => {
            const btnType = String(btn.type || "").toUpperCase();
            const btnUrl = String(btn.url || "");
            const btnPhone = String(btn.phone_number || "");

            if (btnType === "URL" && btnUrl.includes("{{")) {
              // Dynamic URL button — needs parameter
              const urlVar = template_variables?.["btn_url_" + idx] 
                || template_variables?.["var_1"] 
                || template_variables?.[Object.keys(template_variables || {})[0]] 
                || "";
              if (urlVar) {
                components.push({
                  type: "button",
                  sub_type: "url",
                  index: idx,
                  parameters: [{ type: "text", text: String(urlVar) }],
                });
              }
            }
            // QUICK_REPLY and static URL buttons don't need parameters
            // PHONE_NUMBER buttons don't need parameters
          });
        }

        metaPayload = {
          type: "template",
          template: {
            name: template_name,
            language: { code: tplLang },
            ...(components.length > 0 ? { components } : {}),
          },
        };
      }

      console.log("Template payload:", JSON.stringify(metaPayload));

    } else if (effectiveMessageType === "image" && media_url) {
      metaPayload = {
        type: "image",
        image: { link: media_url, caption: content || undefined },
      };
    } else if (effectiveMessageType === "document" && media_url) {
      metaPayload = {
        type: "document",
        document: { link: media_url, filename: media_filename || "document", caption: content || undefined },
      };
    } else {
      metaPayload = {
        type: "text",
        text: { body: content || "" },
      };
    }

    // Send via Meta Cloud API
    const metaUrl = `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const response = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        ...metaPayload,
      }),
    });

    const result = await response.json();
    console.log("Meta API response:", JSON.stringify(result));
    
    const waMessageId = result.messages?.[0]?.id || null;
    const success = response.ok && !!waMessageId;

    // Build display content for inbox
    let displayContent = content || "";
    if (message_type === "template" && template_name) {
      displayContent = content || `[Template: ${template_name}]`;
    }

    // Insert into wa_inbox_messages
    await supabase.from("wa_inbox_messages").insert({
      conversation_id,
      direction: "outbound",
      message_type,
      content: displayContent,
      media_url: media_url || null,
      media_filename: media_filename || null,
      template_name: template_name || null,
      template_variables: template_variables || null,
      wa_message_id: waMessageId,
      status: success ? "sent" : "failed",
      status_updated_at: new Date().toISOString(),
      error_message: success ? null : (result.error?.message || result.error?.error_user_msg || "Send failed"),
      error_code: success ? null : (result.error?.code?.toString() || null),
      sent_by,
      sent_by_name,
    });

    // Update conversation
    await supabase.from("wa_conversations").update({
      last_message: displayContent.slice(0, 200),
      last_message_at: new Date().toISOString(),
    }).eq("id", conversation_id);

    // Log in legacy wa_message_logs
    await supabase.from("wa_message_logs").insert({
      phone: to,
      message_type: message_type,
      message_content: displayContent || template_name || "",
      trigger_event: "inbox_send",
      status: success ? "sent" : "failed",
      provider: "meta",
      provider_message_id: waMessageId,
      sent_at: new Date().toISOString(),
    });

    // Update template sent_count if applicable
    if (success && message_type === "template" && template_name) {
      await supabase.rpc("increment_counter", { table_name: "wa_templates", column_name: "sent_count", row_id_column: "name", row_id_value: template_name }).catch(() => {
        // Fallback: direct update
        supabase.from("wa_templates").select("id, sent_count").eq("name", template_name).single().then(({ data: t }) => {
          if (t) supabase.from("wa_templates").update({ sent_count: (t.sent_count || 0) + 1, last_sent_at: new Date().toISOString() }).eq("id", t.id);
        });
      });
    }

    return new Response(JSON.stringify({
      success,
      messageId: waMessageId,
      window_open: windowOpen,
      ...(success ? {} : { error: result.error?.message || result.error?.error_user_msg || "Send failed", meta_error_code: result.error?.code }),
    }), {
      status: success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("wa-send-inbox error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
