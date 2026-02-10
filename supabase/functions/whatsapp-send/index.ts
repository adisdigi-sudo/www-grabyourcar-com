import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * WhatsApp Send — Updated for Finbite v2 API
 * Base URL: https://app.finbite.in/api/v2/whatsapp-business/messages
 * Auth: API Key (Bearer) + Phone ID (X-Phone-ID header)
 * 
 * Supports: text, template, image, document, video, audio
 * Falls back to v1 if v2 fails.
 */

const FINBITE_V2_URL = "https://app.finbite.in/api/v2/whatsapp-business/messages";
const FINBITE_V1_URL = "https://wbiztool.com/api/v1/send_msg/";

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

async function sendV2(
  apiKey: string,
  phoneId: string,
  to: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  console.log("Sending via Finbite v2:", JSON.stringify(payload));

  // Try multiple auth approaches
  const headers1 = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
    "X-Phone-ID": phoneId,
  };
  
  console.log("Attempt 1 - Bearer auth");
  let response = await fetch(FINBITE_V2_URL, {
    method: "POST",
    headers: headers1,
    body: JSON.stringify({ messaging_product: "whatsapp", to, ...payload }),
  });

  let ct = response.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const result = await response.json();
    if (response.ok && !result.error && !result.message?.includes("invalid")) {
      console.log("Bearer auth worked:", JSON.stringify(result));
      return { success: true, data: result };
    }
    console.log("Bearer failed:", JSON.stringify(result));
  } else {
    await response.text();
  }

  // Attempt 2: api_key in body
  console.log("Attempt 2 - api_key in body");
  response = await fetch(FINBITE_V2_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, api_key: apiKey, phone_number_id: phoneId, ...payload }),
  });

  ct = response.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const result = await response.json();
    console.log("Finbite v2 response:", JSON.stringify(result));
    if (response.ok && !result.error) {
      return { success: true, data: result };
    }
    return { success: false, error: JSON.stringify(result) };
  }

  const text = await response.text();
  console.error("Finbite v2 non-JSON:", text.substring(0, 200));
  return { success: false, error: `Non-JSON response (${response.status})` };
}

async function sendV1Fallback(
  clientId: string,
  apiKey: string,
  waClient: string,
  phone: string,
  message: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const formData = new URLSearchParams();
  formData.append("client_id", clientId);
  formData.append("api_key", apiKey);
  formData.append("whatsapp_client", waClient);
  formData.append("phone", phone);
  formData.append("country_code", "91");
  formData.append("msg", message);
  formData.append("msg_type", "0");

  const response = await fetch(FINBITE_V1_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const ct = response.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const result = await response.json();
    if (response.ok && result.status !== false && !result.error) {
      return { success: true, data: result };
    }
    return { success: false, error: JSON.stringify(result) };
  }
  const text = await response.text();
  return { success: false, error: `Non-JSON (${response.status})` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FINBITE_API_KEY = (Deno.env.get("FINBITE_API_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim();
    const FINBITE_WHATSAPP_CLIENT = (Deno.env.get("FINBITE_WHATSAPP_CLIENT") || "").replace(/[^\x20-\x7E]/g, "").trim();
    const FINBITE_CLIENT_ID = (Deno.env.get("FINBITE_CLIENT_ID") || "").replace(/[^\x20-\x7E]/g, "").trim();
    
    console.log("API Key length:", FINBITE_API_KEY.length, "Phone ID length:", FINBITE_WHATSAPP_CLIENT.length);

    if (!FINBITE_API_KEY || !FINBITE_WHATSAPP_CLIENT) {
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, message, messageType = "text", template_name, template_variables, mediaUrl }: SendMessageRequest = await req.json();

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

    let result: { success: boolean; data?: unknown; error?: string };

    // Try v2 API first
    if (messageType === "template" && template_name) {
      // Template message
      const components: Array<Record<string, unknown>> = [];
      if (template_variables && Object.keys(template_variables).length > 0) {
        components.push({
          type: "body",
          parameters: Object.values(template_variables).map(v => ({ type: "text", text: v })),
        });
      }

      result = await sendV2(FINBITE_API_KEY, FINBITE_WHATSAPP_CLIENT, phone.full, {
        type: "template",
        template: {
          name: template_name,
          language: { code: "en" },
          ...(components.length > 0 ? { components } : {}),
        },
      });
    } else if (messageType === "image" && mediaUrl) {
      result = await sendV2(FINBITE_API_KEY, FINBITE_WHATSAPP_CLIENT, phone.full, {
        type: "image",
        image: { link: mediaUrl, caption: message || "" },
      });
    } else if (messageType === "document" && mediaUrl) {
      result = await sendV2(FINBITE_API_KEY, FINBITE_WHATSAPP_CLIENT, phone.full, {
        type: "document",
        document: { link: mediaUrl, caption: message || "", filename: "document.pdf" },
      });
    } else {
      // Text message
      result = await sendV2(FINBITE_API_KEY, FINBITE_WHATSAPP_CLIENT, phone.full, {
        type: "text",
        text: { body: message || "Hello from GrabYourCar!" },
      });
    }

    // Fallback to v1 for text messages if v2 fails
    if (!result.success && messageType === "text" && FINBITE_CLIENT_ID) {
      console.log("v2 failed, attempting v1 fallback...");
      result = await sendV1Fallback(
        FINBITE_CLIENT_ID,
        FINBITE_API_KEY,
        FINBITE_WHATSAPP_CLIENT,
        phone.short,
        message || "Hello from GrabYourCar!"
      );
    }

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, result: result.data }),
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
