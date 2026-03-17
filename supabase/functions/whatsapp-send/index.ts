import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * WhatsApp Send — Direct Meta Cloud API
 * Base URL: https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages
 * Auth: Bearer WHATSAPP_ACCESS_TOKEN (permanent system user token)
 *
 * Supports: text, template, image, document, video, audio
 */

interface SendMessageRequest {
  to: string;
  message?: string;
  messageType?: "text" | "template" | "image" | "document" | "video" | "audio";
  template_name?: string;
  template_variables?: Record<string, string>;
  mediaUrl?: string;
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

async function sendViaMeta(
  token: string,
  phoneNumberId: string,
  to: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
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
    return { success: true, messageId: result.messages[0].id };
  }

  const errorMsg = result.error?.message || JSON.stringify(result);
  return { success: false, error: errorMsg };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return new Response(
        JSON.stringify({ error: "WhatsApp Meta API not configured. Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Health check action for Integration Hub
    if (body.action === "health_check") {
      return new Response(
        JSON.stringify({ status: "ok", configured: true, phoneNumberId: WHATSAPP_PHONE_NUMBER_ID.slice(-4) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, message, messageType = "text", template_name, template_variables, mediaUrl }: SendMessageRequest = body;

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Phone number required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phone = normalizePhone(to);
    if (!phone.valid) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: { success: boolean; messageId?: string; error?: string };

    if (messageType === "template" && template_name) {
      const components: unknown[] = [];
      if (template_variables && Object.keys(template_variables).length > 0) {
        components.push({
          type: "body",
          parameters: Object.values(template_variables).map((val) => ({
            type: "text",
            text: val,
          })),
        });
      }

      result = await sendViaMeta(WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, phone.full, {
        type: "template",
        template: {
          name: template_name,
          language: { code: "en_US" },
          ...(components.length > 0 ? { components } : {}),
        },
      });
    } else if (messageType === "image" && mediaUrl) {
      result = await sendViaMeta(WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, phone.full, {
        type: "image",
        image: { link: mediaUrl, caption: message || "" },
      });
    } else if (messageType === "document" && mediaUrl) {
      result = await sendViaMeta(WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, phone.full, {
        type: "document",
        document: { link: mediaUrl, caption: message || "", filename: "document.pdf" },
      });
    } else {
      result = await sendViaMeta(WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, phone.full, {
        type: "text",
        text: { preview_url: false, body: message || "Hello from GrabYourCar!" },
      });
    }

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, messageId: result.messageId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Failed to send message", details: result.error }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
