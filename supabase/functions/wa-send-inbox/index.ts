import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolveTemplateVariables(content: string, variables: Record<string, string>) {
  return content.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.trim();
    return variables[key] ?? variables[key.toLowerCase()] ?? _match;
  });
}

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
    const WHATSAPP_BUSINESS_ACCOUNT_ID =
      Deno.env.get("WHATSAPP_WABA_ID") || Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID");

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return jsonResponse({ success: false, error: "WhatsApp API not configured", fallback: true });
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
      template_components,
      media_url,
      media_filename,
      sent_by,
      sent_by_name,
    } = body;

    if (!phone) {
      return jsonResponse({ success: false, error: "phone required" });
    }

    let convo: { window_expires_at: string | null; last_customer_message_at: string | null; customer_name: string | null } | null = null;
    if (conversation_id) {
      const { data } = await supabase
        .from("wa_conversations")
        .select("window_expires_at, last_customer_message_at, customer_name")
        .eq("id", conversation_id)
        .single();
      convo = data as typeof convo;
    }

    const windowOpen = convo?.window_expires_at && new Date(convo.window_expires_at) > new Date();

    if (!windowOpen && message_type === "text") {
      return jsonResponse({
        success: false,
        error: "24-hour window expired. Please use a template message.",
        window_expired: true,
      });
    }

    let effectiveMessageType = message_type;
    let costSaved = false;
    let metaCategory = "service";

    const messageContext = body.message_context || "inbox_reply";
    const { data: categoryRule } = await supabase
      .from("wa_category_rules")
      .select("meta_category, requires_template, opt_out_footer_required")
      .eq("message_context", messageContext)
      .eq("is_active", true)
      .single();

    if (categoryRule) {
      metaCategory = categoryRule.meta_category;
    }

    const resolvedContent = content && content.trim()
      ? resolveTemplateVariables(content, {
          customer_name: convo?.customer_name || sent_by_name || "Customer",
          name: convo?.customer_name || sent_by_name || "Customer",
          phone,
        }).trim()
      : content;

    if (windowOpen && message_type === "template" && template_name && resolvedContent && resolvedContent.trim()) {
      const minutesLeft = Math.round((new Date(convo.window_expires_at).getTime() - Date.now()) / 60000);
      console.log(`💰 Cost-saving: downgrading ${metaCategory} template "${template_name}" to free text (window open, ${minutesLeft}min left)`);
      effectiveMessageType = "text";
      costSaved = true;
      metaCategory = "service";
    }

    let optOutFooter = "";
    if (effectiveMessageType === "text" && metaCategory === "service") {
      if (messageContext !== "inbox_reply") {
        optOutFooter = "\n\n_Reply STOP to unsubscribe_";
      }
    }

    const to = phone.startsWith("91") ? phone : `91${phone.replace(/\D/g, "")}`;
    let metaPayload: Record<string, unknown>;

    if (effectiveMessageType === "template" && template_name) {
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
        const { data: tplData } = await supabase
          .from("wa_templates")
          .select("body, buttons, category, header_type, header_content, variables, language, status")
          .eq("name", template_name)
          .single();

        if (tplData && String(tplData.status || "").toLowerCase() !== "approved") {
          return jsonResponse({
            success: false,
            error: `Template "${template_name}" is not approved (status: ${tplData.status}). Only approved templates can be sent.`,
            template_not_approved: true,
          });
        }

        const components: Record<string, unknown>[] = [];
        let tplBody = tplData?.body || "";
        let tplLang = tplData?.language || "en";
        let tplHeaderType = String(tplData?.header_type || "").toLowerCase();
        let tplHeaderContent = (tplData?.header_content as string | null) || null;
        let tplButtons: Array<Record<string, unknown>> = Array.isArray(tplData?.buttons)
          ? (tplData!.buttons as Array<Record<string, unknown>>)
          : [];
        const vars = (template_variables || {}) as Record<string, string>;

        // ── Authoritative source: Meta template registry. The local DB cache
        // can drift (e.g. a header was rejected during approval), and any
        // mismatch between the payload we send and the live template causes
        // Meta error #132018. Always reconcile against Meta before sending.
        if (WHATSAPP_BUSINESS_ACCOUNT_ID) {
          try {
            const metaTplResp = await fetch(
              `https://graph.facebook.com/v25.0/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?name=${encodeURIComponent(template_name)}&fields=name,language,status,components`,
              { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } },
            );
            const metaTplJson = await metaTplResp.json();
            const metaTpl = (metaTplJson?.data || []).find(
              (t: Record<string, unknown>) =>
                String(t.name) === template_name &&
                String(t.status || "").toUpperCase() === "APPROVED",
            );
            if (metaTpl) {
              tplLang = String(metaTpl.language || tplLang);
              const metaComps = Array.isArray(metaTpl.components)
                ? (metaTpl.components as Array<Record<string, unknown>>)
                : [];
              const headerComp = metaComps.find(
                (c) => String(c.type).toUpperCase() === "HEADER",
              );
              const bodyComp = metaComps.find(
                (c) => String(c.type).toUpperCase() === "BODY",
              );
              const buttonsComp = metaComps.find(
                (c) => String(c.type).toUpperCase() === "BUTTONS",
              );
              if (bodyComp && typeof bodyComp.text === "string") {
                tplBody = bodyComp.text;
              }
              if (headerComp) {
                tplHeaderType = String(headerComp.format || "TEXT").toLowerCase();
                if (typeof headerComp.text === "string") {
                  tplHeaderContent = headerComp.text;
                }
              } else {
                tplHeaderType = "";
                tplHeaderContent = null;
              }
              tplButtons =
                buttonsComp && Array.isArray(buttonsComp.buttons)
                  ? (buttonsComp.buttons as Array<Record<string, unknown>>)
                  : [];
            }
          } catch (metaLookupErr) {
            console.warn("Meta template lookup failed, falling back to DB cache", metaLookupErr);
          }
        }

        // ── HEADER component (text / image / video / document) ──
        if (tplHeaderType === "text" && tplHeaderContent) {
          const headerVarMatches = tplHeaderContent.match(/\{\{(\w+)\}\}/g) || [];
          if (headerVarMatches.length > 0) {
            const headerVarName = headerVarMatches[0].replace(/[{}]/g, "");
            const headerValue =
              vars[headerVarName] || vars["header_1"] || vars["var_1"] || "";
            if (headerValue) {
              components.push({
                type: "header",
                parameters: [{ type: "text", text: String(headerValue) }],
              });
            }
          }
        } else if (
          (tplHeaderType === "image" || tplHeaderType === "video" || tplHeaderType === "document") &&
          (media_url || tplHeaderContent)
        ) {
          const headerLink = media_url || tplHeaderContent || "";
          if (headerLink) {
            const mediaParam: Record<string, unknown> = { link: headerLink };
            if (tplHeaderType === "document" && media_filename) {
              mediaParam.filename = media_filename;
            }
            components.push({
              type: "header",
              parameters: [{ type: tplHeaderType, [tplHeaderType]: mediaParam }],
            });
          }
        }

        // ── BODY params (always send if template has {{n}} placeholders) ──
        const bodyVarMatches = tplBody.match(/\{\{(\w+)\}\}/g) || [];
        const uniqueVars: string[] = [];
        for (const m of bodyVarMatches) {
          const varName = m.replace(/[{}]/g, "");
          if (!uniqueVars.includes(varName)) uniqueVars.push(varName);
        }

        if (uniqueVars.length > 0) {
          const bodyParams: Record<string, unknown>[] = [];
          for (let i = 0; i < uniqueVars.length; i++) {
            const varName = uniqueVars[i];
            const fallback =
              vars[varName] ??
              vars[`var_${i + 1}`] ??
              vars[String(i + 1)] ??
              vars["customer_name"] ??
              vars["name"] ??
              "";
            bodyParams.push({ type: "text", text: String(fallback || " ") });
          }
          components.push({ type: "body", parameters: bodyParams });
        } else if (template_variables && Object.keys(template_variables).length > 0) {
          const sortedKeys = Object.keys(template_variables)
            .filter((k) => /^(var_\d+|\d+)$/.test(k))
            .sort((a, b) => {
              const numA = parseInt(a.replace("var_", ""));
              const numB = parseInt(b.replace("var_", ""));
              return numA - numB;
            });
          const bodyParams: Record<string, unknown>[] = [];
          for (const key of sortedKeys) {
            bodyParams.push({ type: "text", text: String(template_variables[key]) });
          }
          if (bodyParams.length > 0) {
            components.push({ type: "body", parameters: bodyParams });
          }
        }

        // ── BUTTON components (only URL/COPY_CODE with dynamic var) ──
        if (tplButtons.length > 0) {
          tplButtons.forEach((btn, idx) => {
            const btnType = String(btn.type || "").toUpperCase();
            const btnUrl = String(btn.url || "");

            if (btnType === "URL" && btnUrl.includes("{{")) {
              const urlVar =
                vars["btn_url_" + idx] ||
                vars["button_" + (idx + 1)] ||
                vars["var_1"] ||
                Object.values(vars)[0] ||
                "";
              if (urlVar) {
                components.push({
                  type: "button",
                  sub_type: "url",
                  index: idx,
                  parameters: [{ type: "text", text: String(urlVar) }],
                });
              }
            }
            // QUICK_REPLY / PHONE_NUMBER / static URL buttons: Meta does NOT
            // accept a button component when the button text/url has no
            // {{var}} placeholder — including one returns error #132018.
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
        image: { link: media_url, caption: resolvedContent || undefined },
      };
    } else if (effectiveMessageType === "document" && media_url) {
      metaPayload = {
        type: "document",
        document: { link: media_url, filename: media_filename || "document", caption: resolvedContent || undefined },
      };
    } else {
      const textBody = (resolvedContent || "") + optOutFooter;
      metaPayload = {
        type: "text",
        text: { body: textBody },
      };
    }

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

    const rawResult = await response.text();
    let result: any = {};
    try {
      result = rawResult ? JSON.parse(rawResult) : {};
    } catch {
      result = { error: { message: rawResult || `Meta API error (${response.status})` } };
    }
    console.log("Meta API response:", JSON.stringify(result));

    const waMessageId = result.messages?.[0]?.id || null;
    const success = response.ok && !!waMessageId;

    let displayContent = resolvedContent || "";
    if (message_type === "template" && template_name) {
      displayContent = resolvedContent || `[Template: ${template_name}]`;
    }

    if (conversation_id) {
      await supabase.from("wa_inbox_messages").insert({
        conversation_id,
        direction: "outbound",
        message_type: costSaved ? "text" : message_type,
        content: displayContent,
        media_url: media_url || null,
        media_filename: media_filename || null,
        template_name: costSaved ? null : (template_name || null),
        template_variables: costSaved ? null : (template_variables || null),
        wa_message_id: waMessageId,
        status: success ? "sent" : "failed",
        status_updated_at: new Date().toISOString(),
        error_message: success ? null : (result.error?.message || result.error?.error_user_msg || "Send failed"),
        error_code: success ? null : (result.error?.code?.toString() || null),
        sent_by,
        sent_by_name,
      });

      await supabase.from("wa_conversations").update({
        last_message: displayContent.slice(0, 200),
        last_message_at: new Date().toISOString(),
      }).eq("id", conversation_id);
    }

    await supabase.from("wa_message_logs").insert({
      phone: to,
      message_type: costSaved ? "text_downgraded" : message_type,
      message_content: displayContent || template_name || "",
      trigger_event: costSaved ? "inbox_send_cost_saved" : "inbox_send",
      status: success ? "sent" : "failed",
      provider: "meta",
      provider_message_id: waMessageId,
      sent_at: new Date().toISOString(),
    });

    if (success && !costSaved && message_type === "template" && template_name) {
      await supabase.rpc("increment_counter", { table_name: "wa_templates", column_name: "sent_count", row_id_column: "name", row_id_value: template_name }).catch(() => {
        supabase.from("wa_templates").select("id, sent_count").eq("name", template_name).single().then(({ data: t }) => {
          if (t) supabase.from("wa_templates").update({ sent_count: (t.sent_count || 0) + 1, last_sent_at: new Date().toISOString() }).eq("id", t.id);
        });
      });
    }

    return jsonResponse({
      success,
      messageId: waMessageId,
      window_open: windowOpen,
      cost_saved: costSaved,
      sent_as: costSaved ? "free_text" : effectiveMessageType,
      fallback: !success,
      ...(success ? {} : { error: result.error?.message || result.error?.error_user_msg || "Send failed", meta_error_code: result.error?.code }),
    });
  } catch (error) {
    console.error("wa-send-inbox error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      fallback: true,
    });
  }
});
