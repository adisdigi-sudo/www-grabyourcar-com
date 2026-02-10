import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Finbite API endpoint (same as whatsapp-otp)
const FINBITE_API_URL = "https://wbiztool.com/api/v1/send_msg/";

interface SendMessageRequest {
  to: string;
  message?: string;
  messageType?: number;
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
      console.error("Missing Finbite configuration:", { 
        hasClientId: !!FINBITE_CLIENT_ID, 
        hasApiKey: !!FINBITE_API_KEY, 
        hasWhatsAppClient: !!FINBITE_WHATSAPP_CLIENT 
      });
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

    // Format phone number - extract just the 10-digit number
    const cleanPhone = to.replace(/\D/g, "").replace(/^0+/, "");
    let normalizedPhone = cleanPhone;
    if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
      normalizedPhone = cleanPhone.slice(2);
    }

    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build form-encoded payload (matching whatsapp-otp format)
    const formData = new URLSearchParams();
    formData.append("client_id", FINBITE_CLIENT_ID);
    formData.append("api_key", FINBITE_API_KEY);
    formData.append("whatsapp_client", FINBITE_WHATSAPP_CLIENT);
    formData.append("phone", normalizedPhone);
    formData.append("country_code", "91");
    formData.append("msg", message || "Hello from GrabYourCar!");
    formData.append("msg_type", messageType.toString());
    
    if (mediaUrl && messageType > 0) {
      formData.append("media_url", mediaUrl);
    }

    console.log("Sending WhatsApp message to:", normalizedPhone);
    console.log("DEBUG - client_id length:", FINBITE_CLIENT_ID.length, "api_key length:", FINBITE_API_KEY.length, "wa_client length:", FINBITE_WHATSAPP_CLIENT.length);
    console.log("DEBUG - api_key first 8 chars:", FINBITE_API_KEY.substring(0, 8));
    console.log("DEBUG - client_id value:", FINBITE_CLIENT_ID);

    const response = await fetch(FINBITE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    // Check content type before parsing
    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      const result = await response.json();
      console.log("Finbite API response:", result);

      if (!response.ok || result.status === false || result.error) {
        console.error("Finbite API error:", result);
        return new Response(
          JSON.stringify({ error: "Failed to send message", details: result }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // API returned non-JSON (likely HTML error page)
      const textBody = await response.text();
      console.error("Finbite API returned non-JSON:", textBody.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "WhatsApp service temporarily unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Send message error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
