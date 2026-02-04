import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Finbite API endpoint
const FINBITE_API_URL = "https://app.finbite.in/api/v1/send_msg/";

interface SendMessageRequest {
  to: string;
  message?: string;
  messageType?: number; // 0 = text, 1 = image, 2 = PDF
  mediaUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FINBITE_CLIENT_ID = Deno.env.get("FINBITE_CLIENT_ID");
    const FINBITE_API_KEY = Deno.env.get("FINBITE_API_KEY");
    const FINBITE_WHATSAPP_CLIENT = Deno.env.get("FINBITE_WHATSAPP_CLIENT");

    if (!FINBITE_CLIENT_ID || !FINBITE_API_KEY || !FINBITE_WHATSAPP_CLIENT) {
      console.error("Missing Finbite configuration");
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, message, messageType = 0, mediaUrl }: SendMessageRequest = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Phone number required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number (ensure it starts with country code, no + sign)
    const formattedPhone = to.replace(/\D/g, "").replace(/^0+/, "");
    const phoneWithCountry = formattedPhone.startsWith("91") ? formattedPhone : `91${formattedPhone}`;

    // Build Finbite API payload
    const payload: Record<string, unknown> = {
      client_id: parseInt(FINBITE_CLIENT_ID),
      api_key: FINBITE_API_KEY,
      whatsapp_client: parseInt(FINBITE_WHATSAPP_CLIENT),
      phone: phoneWithCountry,
      msg: message || "Hello from GrabYourCar!",
      msg_type: messageType,
    };

    // Add media URL if sending image/file
    if (mediaUrl && messageType > 0) {
      payload.media_url = mediaUrl;
    }

    console.log("Sending WhatsApp message via Finbite:", JSON.stringify({ ...payload, api_key: "[REDACTED]" }));

    const response = await fetch(FINBITE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Finbite API error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send message", details: result }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Message sent successfully via Finbite:", result);
    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
