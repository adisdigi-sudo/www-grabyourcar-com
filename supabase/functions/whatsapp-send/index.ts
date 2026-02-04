import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

interface SendMessageRequest {
  to: string;
  message?: string;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.error("Missing WhatsApp configuration");
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, message, templateName, templateLanguage, templateParams }: SendMessageRequest = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Phone number required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number (ensure it starts with country code)
    const formattedPhone = to.replace(/\D/g, "").replace(/^0+/, "");
    const phoneWithCountry = formattedPhone.startsWith("91") ? formattedPhone : `91${formattedPhone}`;

    let payload: Record<string, unknown>;

    if (templateName) {
      // Send template message
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneWithCountry,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguage || "en" },
          components: templateParams?.length
            ? [
                {
                  type: "body",
                  parameters: templateParams.map((p) => ({ type: "text", text: p })),
                },
              ]
            : undefined,
        },
      };
    } else {
      // Send text message
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneWithCountry,
        type: "text",
        text: { body: message || "Hello from GrabYourCar!" },
      };
    }

    console.log("Sending WhatsApp message:", JSON.stringify(payload));

    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send message", details: result }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Message sent successfully:", result);
    return new Response(
      JSON.stringify({ success: true, messageId: result.messages?.[0]?.id }),
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
