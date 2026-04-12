import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildTemplateParameters(templateVariables?: Record<string, unknown> | null) {
  if (!templateVariables) return [];

  const entries = Object.entries(templateVariables).filter(([, value]) => {
    if (value === null || value === undefined) return false;
    return String(value).trim().length > 0;
  });

  const positionalEntries = entries
    .map(([key, value]) => {
      const match = key.match(/^var_(\d+)$/) || key.match(/^(\d+)$/);
      return match ? { index: Number(match[1]), value } : null;
    })
    .filter((entry): entry is { index: number; value: unknown } => entry !== null)
    .sort((a, b) => a.index - b.index);

  if (positionalEntries.length === entries.length) {
    return positionalEntries.map(({ value }) => ({
      type: "text",
      text: String(value),
    }));
  }

  return entries.map(([key, value]) => ({
    type: "text",
    parameter_name: key,
    text: String(value),
  }));
}

/**
 * wa-send-inbox — Sends messages from the CRM Inbox
 * Enforces 24hr window: free text inside window, templates outside
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
      template_components,
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

    // Build Meta API payload
    const to = phone.startsWith("91") ? phone : `91${phone.replace(/\D/g, "")}`;
    let metaPayload: Record<string, unknown>;

    if (message_type === "template" && template_name) {
      // Build components from template_variables if no explicit components provided
      let finalComponents = template_components;
      if (!finalComponents && template_variables && Object.keys(template_variables).length > 0) {
        const parameters = buildTemplateParameters(template_variables);
        finalComponents = [{
          type: "body",
          parameters,
        }];
      }
      metaPayload = {
        type: "template",
        template: {
          name: template_name,
          language: { code: "en" },
          ...(finalComponents ? { components: finalComponents } : {}),
        },
      };
    } else if (message_type === "image" && media_url) {
      metaPayload = {
        type: "image",
        image: { link: media_url, caption: content || undefined },
      };
    } else if (message_type === "document" && media_url) {
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
    const waMessageId = result.messages?.[0]?.id || null;
    const success = response.ok && !!waMessageId;

    // Insert into wa_inbox_messages
    await supabase.from("wa_inbox_messages").insert({
      conversation_id,
      direction: "outbound",
      message_type,
      content: content || (template_name ? `[Template: ${template_name}]` : ""),
      media_url: media_url || null,
      media_filename: media_filename || null,
      template_name: template_name || null,
      template_variables: template_variables || null,
      wa_message_id: waMessageId,
      status: success ? "sent" : "failed",
      status_updated_at: new Date().toISOString(),
      error_message: success ? null : (result.error?.message || "Send failed"),
      error_code: success ? null : (result.error?.code?.toString() || null),
      sent_by,
      sent_by_name,
    });

    // Update conversation
    await supabase.from("wa_conversations").update({
      last_message: (content || `[${message_type}]`).slice(0, 200),
      last_message_at: new Date().toISOString(),
    }).eq("id", conversation_id);

    // Also log in legacy wa_message_logs
    await supabase.from("wa_message_logs").insert({
      phone: to,
      message_type: message_type,
      message_content: content || template_name || "",
      trigger_event: "inbox_send",
      status: success ? "sent" : "failed",
      provider: "meta",
      provider_message_id: waMessageId,
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success,
      messageId: waMessageId,
      window_open: windowOpen,
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
