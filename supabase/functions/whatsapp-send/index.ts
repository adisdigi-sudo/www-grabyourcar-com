import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * WhatsApp Send — Provider-Agnostic Gateway
 *
 * Reads active WhatsApp provider from `channel_providers` table.
 * Supported providers: meta, waab
 *
 * Supports: text, template, image, document, video, audio
 */

interface SendMessageRequest {
  to: string;
  phone?: string;
  message?: string;
  messageType?: "text" | "template" | "image" | "document" | "video" | "audio";
  template_name?: string;
  template_variables?: Record<string, string>;
  mediaUrl?: string;
  action?: string;
  name?: string;
  logEvent?: string;
  lead_id?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

function normalizePhone(phone: string): { full: string; short: string; valid: boolean } {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  let short = clean;
  if (clean.startsWith("91") && clean.length === 12) {
    short = clean.slice(2);
  }
  const valid = /^[6-9]\d{9}$/.test(short);
  return { full: `91${short}`, short, valid };
}

// ── Meta Cloud API Provider ──
async function sendViaMeta(
  token: string,
  phoneNumberId: string,
  to: string,
  payload: Record<string, unknown>
): Promise<SendResult> {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    ...payload,
  };

  console.log("Meta API request:", JSON.stringify(body));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  console.log("Meta API response:", JSON.stringify(result));

  if (response.ok && result.messages?.[0]?.id) {
    return { success: true, messageId: result.messages[0].id, provider: "meta" };
  }

  return { success: false, error: result.error?.message || JSON.stringify(result), provider: "meta" };
}

// ── WAAB Provider (legacy REST API) ──
async function sendViaWaab(
  apiKey: string,
  baseUrl: string,
  to: string,
  payload: { type: "text"; message: string } | { type: "template"; template_name: string; variables?: Record<string, string> }
): Promise<SendResult> {
  const endpoint = `${baseUrl}/api/v1/messages/send`;

  let body: Record<string, unknown>;
  if (payload.type === "template") {
    body = {
      to,
      type: "template",
      template: { name: payload.template_name, language: "en" },
    };
    if (payload.variables && Object.keys(payload.variables).length > 0) {
      (body.template as any).parameters = Object.values(payload.variables).map(v => ({ type: "text", text: v }));
    }
  } else {
    body = { to, type: "text", text: { body: payload.message } };
  }

  console.log("WAAB API request:", JSON.stringify(body));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const result = await response.json();
    console.log("WAAB API response:", JSON.stringify(result));
    if (response.ok && (result.success || result.messages?.[0]?.id || result.message_id)) {
      return { success: true, messageId: result.messages?.[0]?.id || result.message_id || result.id, provider: "waab" };
    }
    return { success: false, error: JSON.stringify(result), provider: "waab" };
  }

  const text = await response.text();
  console.error("WAAB non-JSON:", text.substring(0, 300));
  return { success: false, error: `Non-JSON response (${response.status})`, provider: "waab" };
}

// ── WABB.in Provider (Webhook-based) ──
async function sendViaWabb(
  webhookUrl: string,
  to: string,
  message: string,
  name?: string,
): Promise<SendResult> {
  const payload = {
    Phone: to,
    Name: name || "",
    Message: message,
  };

  console.log("WABB webhook request:", JSON.stringify({ ...payload, webhookUrl: webhookUrl.substring(0, 40) + "..." }));

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log("WABB webhook response:", response.status, responseText.substring(0, 300));

  if (response.ok) {
    // WABB webhooks typically return 200 on success
    let messageId = "wabb_" + Date.now();
    try {
      const parsed = JSON.parse(responseText);
      messageId = parsed.id || parsed.message_id || messageId;
    } catch { /* non-JSON OK for webhooks */ }
    return { success: true, messageId, provider: "wabb" };
  }

  return { success: false, error: `WABB webhook error (${response.status}): ${responseText.substring(0, 200)}`, provider: "wabb" };
}

// ── Provider Router ──
async function sendMessage(
  providerName: string,
  providerConfig: Record<string, any>,
  to: string,
  messageType: string,
  message: string,
  templateName?: string,
  templateVars?: Record<string, string>,
  mediaUrl?: string,
  name?: string,
): Promise<SendResult> {
  const phone = normalizePhone(to);
  if (!phone.valid) {
    return { success: false, error: "Invalid phone number format" };
  }

  if (providerName === "meta") {
    const token = providerConfig?.access_token || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = providerConfig?.phone_number_id || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    if (!token || !phoneNumberId) {
      return { success: false, error: "Meta API credentials not configured", provider: "meta" };
    }

    let payload: Record<string, unknown>;
    if (messageType === "template" && templateName) {
      const components: unknown[] = [];
      if (templateVars && Object.keys(templateVars).length > 0) {
        components.push({
          type: "body",
          parameters: Object.values(templateVars).map(val => ({ type: "text", text: val })),
        });
      }
      payload = { type: "template", template: { name: templateName, language: { code: "en_US" }, ...(components.length > 0 ? { components } : {}) } };
    } else if (messageType === "image" && mediaUrl) {
      payload = { type: "image", image: { link: mediaUrl, caption: message || "" } };
    } else if (messageType === "document" && mediaUrl) {
      payload = { type: "document", document: { link: mediaUrl, caption: message || "", filename: "document.pdf" } };
    } else {
      payload = { type: "text", text: { preview_url: false, body: message || "Hello from GrabYourCar!" } };
    }

    return sendViaMeta(token, phoneNumberId, phone.full, payload);
  }

  if (providerName === "waab") {
    const apiKey = providerConfig?.api_key || Deno.env.get("WAAB_API_KEY");
    const baseUrl = providerConfig?.base_url || Deno.env.get("WAAB_BASE_URL") || "";
    if (!apiKey || !baseUrl) {
      return { success: false, error: "WAAB credentials not configured. Add API Key and Base URL in Channel Providers.", provider: "waab" };
    }

    if (messageType === "template" && templateName) {
      return sendViaWaab(apiKey, baseUrl, phone.full, { type: "template", template_name: templateName, variables: templateVars });
    }
    return sendViaWaab(apiKey, baseUrl, phone.full, { type: "text", message: message || "" });
  }

  if (providerName === "wabb") {
    const webhookUrl = providerConfig?.webhook_url || Deno.env.get("WABB_WEBHOOK_URL");
    if (!webhookUrl) {
      return { success: false, error: "WABB webhook URL not configured. Add it in Channel Providers or set WABB_WEBHOOK_URL secret.", provider: "wabb" };
    }
    return sendViaWabb(webhookUrl, phone.full, message || "Hello from GrabYourCar!", name);
  }

  return { success: false, error: `Unknown provider: ${providerName}` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    // Health check
    if (body.action === "health_check") {
      const { data: provider } = await supabase
        .from("channel_providers")
        .select("*")
        .eq("channel", "whatsapp")
        .single();

      return new Response(
        JSON.stringify({
          status: "ok",
          configured: !!provider?.is_active,
          provider: provider?.provider_name || "none",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve target phone
    const to = body.to || body.phone;
    if (!to) {
      return new Response(
        JSON.stringify({ error: "Phone number required (to or phone)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      message = "",
      messageType = "text",
      template_name,
      template_variables,
      mediaUrl,
      name,
      logEvent,
      lead_id,
    }: SendMessageRequest = body;

    // Get active WhatsApp provider from DB
    const { data: provider } = await supabase
      .from("channel_providers")
      .select("*")
      .eq("channel", "whatsapp")
      .single();

    const providerName = provider?.provider_name || "meta";
    const providerConfig = provider?.config_json || {};
    const isActive = provider?.is_active ?? false;

    if (!isActive) {
      return new Response(
        JSON.stringify({ success: false, status: "not_configured", error: "WhatsApp channel is not active. Enable it in Channel Providers settings." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via the active provider
    const result = await sendMessage(
      providerName,
      providerConfig,
      to,
      messageType,
      message,
      template_name,
      template_variables,
      mediaUrl
    );

    // Log to wa_message_logs
    const phoneNorm = normalizePhone(to);
    await supabase.from("wa_message_logs").insert({
      phone: phoneNorm.full,
      customer_name: name || null,
      message_type: messageType === "template" ? "template" : "text",
      message_content: message || null,
      template_name: template_name || null,
      trigger_event: logEvent || "api_send",
      lead_id: lead_id || null,
      status: result.success ? "sent" : "failed",
      provider: result.provider || providerName,
      provider_message_id: result.messageId || null,
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
      failed_at: result.success ? null : new Date().toISOString(),
    });

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, messageId: result.messageId, provider: result.provider }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: result.error, provider: result.provider }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("whatsapp-send error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
