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
  template_components?: unknown[];
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    Name: (name || "Customer").trim(),
    Message: message.trim() || "Hello from GrabYourCar!",
  };

  console.log("WABB webhook request:", JSON.stringify({ ...payload, webhookUrl: webhookUrl.substring(0, 40) + "..." }));

  let lastError = "Unknown WABB error";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      const trimmedResponse = responseText.trim();
      console.log(`WABB webhook response attempt ${attempt}:`, response.status, trimmedResponse.substring(0, 300));

      if (response.ok) {
        let parsed: Record<string, unknown> | null = null;
        if (trimmedResponse) {
          try {
            parsed = JSON.parse(trimmedResponse);
          } catch {
            parsed = null;
          }
        }

        const messageId = typeof parsed?.id === "string"
          ? parsed.id
          : typeof parsed?.message_id === "string"
            ? parsed.message_id
            : undefined;

        const accepted =
          typeof parsed?.success === "boolean"
            ? parsed.success
            : typeof parsed?.status === "string"
              ? ["success", "accepted", "queued", "sent"].includes(parsed.status.toLowerCase())
              : false;

        if (messageId || accepted) {
          return { success: true, messageId: messageId || `wabb_${Date.now()}`, provider: "wabb" };
        }

        // WABB Catch Webhook uses fire-and-forget model:
        // A 200 response (even empty {} or empty body) means the webhook accepted the payload.
        // The message will be processed and delivered asynchronously.
        if (trimmedResponse.length === 0 || trimmedResponse === "{}") {
          console.log(`WABB webhook accepted payload (fire-and-forget) on attempt ${attempt}`);
          return { success: true, messageId: `wabb_${Date.now()}`, provider: "wabb" };
        }

        // If we got a 200 with unexpected content, still treat as accepted but log warning
        console.warn(`WABB webhook returned 200 with unexpected body: ${trimmedResponse.substring(0, 200)}`);
        return { success: true, messageId: `wabb_${Date.now()}`, provider: "wabb" };
      } else {
        lastError = `WABB webhook error (${response.status}): ${trimmedResponse.substring(0, 200) || "empty response"}`;
        const shouldRetry =
          attempt < 3 && (
            response.status === 429 ||
            response.status >= 500 ||
            ((response.status === 400 || response.status === 405) && trimmedResponse.length === 0)
          );

        if (!shouldRetry) {
          return { success: false, error: lastError, provider: "wabb" };
        }

        console.warn(`Retrying WABB webhook after attempt ${attempt} failed with status ${response.status}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown WABB network error";

      if (attempt === 3) {
        return { success: false, error: `WABB webhook network error: ${lastError}`, provider: "wabb" };
      }

      console.warn(`Retrying WABB webhook after network failure on attempt ${attempt}:`, lastError);
    }

    await sleep(400 * attempt);
  }

  return { success: false, error: lastError, provider: "wabb" };
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
  templateComponents?: unknown[],
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
      // If caller provided raw components array, use it directly (supports buttons with dynamic URLs)
      const finalComponents = templateComponents && templateComponents.length > 0 ? templateComponents : components;
      payload = { type: "template", template: { name: templateName, language: { code: "en" }, ...(finalComponents.length > 0 ? { components: finalComponents } : {}) } };
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
    // WABB Catch Webhook doesn't support templates — use Meta API for template sends
    if (messageType === "template" && templateName) {
      const metaToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
      const metaPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
      if (metaToken && metaPhoneId) {
        console.log("WABB: Template message — routing via Meta Cloud API");
        const components: unknown[] = [];
        if (templateVars && Object.keys(templateVars).length > 0) {
          components.push({
            type: "body",
            parameters: Object.values(templateVars).map(val => ({ type: "text", text: val })),
          });
        }
        const payload = { type: "template", template: { name: templateName, language: { code: "en" }, ...(components.length > 0 ? { components } : {}) } };
        return sendViaMeta(metaToken, metaPhoneId, phone.full, payload);
      }
      console.warn("WABB: Template requested but Meta API credentials missing, falling back to text");
    }

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
      template_components,
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
      mediaUrl,
      name,
      template_components,
    );

    const deliveryStatus = result.success ? "queued" : "failed";

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
      status: deliveryStatus,
      provider: result.provider || providerName,
      provider_message_id: result.messageId || null,
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
      failed_at: result.success ? null : new Date().toISOString(),
    });

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, messageId: result.messageId, provider: result.provider, status: deliveryStatus }),
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
