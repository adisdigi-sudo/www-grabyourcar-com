import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_VERIFY_TOKEN) {
    console.error("Missing WhatsApp configuration");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);

  // Webhook verification (GET request from Meta)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Webhook verification request:", { mode, token, challenge });

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      console.log("Webhook verified successfully");
      return new Response(challenge, { status: 200 });
    } else {
      console.error("Webhook verification failed");
      return new Response("Forbidden", { status: 403 });
    }
  }

  // Handle incoming messages (POST request from Meta)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Incoming webhook:", JSON.stringify(body, null, 2));

      // Process the webhook payload
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Handle incoming messages
      if (value?.messages?.[0]) {
        const message = value.messages[0];
        const contact = value.contacts?.[0];
        const from = message.from; // Sender's phone number
        const messageType = message.type;
        const messageText = message.text?.body || "";
        const senderName = contact?.profile?.name || "Unknown";

        console.log(`Message from ${senderName} (${from}): ${messageText}`);

        // Create Supabase client for lead capture
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // Save as lead in database
        const { error: leadError } = await supabase.from("leads").insert({
          customer_name: senderName,
          phone: from.replace(/^91/, "+91 ").replace(/(\d{5})(\d{5})$/, "$1 $2"),
          source: "whatsapp",
          lead_type: "whatsapp_inquiry",
          notes: `WhatsApp message: ${messageText}`,
          status: "new",
          priority: "high", // WhatsApp leads are high intent
        });

        if (leadError) {
          console.error("Failed to save lead:", leadError);
        } else {
          console.log("Lead saved successfully");
        }

        // Send auto-reply
        const autoReplyText = getAutoReply(messageText.toLowerCase());
        await sendWhatsAppMessage(
          WHATSAPP_PHONE_NUMBER_ID,
          WHATSAPP_ACCESS_TOKEN,
          from,
          autoReplyText
        );
      }

      // Handle message status updates
      if (value?.statuses?.[0]) {
        const status = value.statuses[0];
        console.log(`Message status update: ${status.status} for ${status.id}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response(JSON.stringify({ error: "Processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

// Generate smart auto-reply based on message content
function getAutoReply(message: string): string {
  if (message.includes("price") || message.includes("on-road") || message.includes("cost")) {
    return `🚗 *GrabYourCar - Best Price Guarantee*

Thank you for reaching out! 

For the best on-road price and exclusive offers, our car expert will call you within 5 minutes.

Meanwhile, you can:
📱 Browse cars: grabyourcar.lovable.app/cars
💰 Check EMI: grabyourcar.lovable.app/car-loans
🏪 Find dealers: grabyourcar.lovable.app/dealers

_Your dream car is just a call away!_`;
  }

  if (message.includes("loan") || message.includes("emi") || message.includes("finance")) {
    return `💰 *GrabYourCar Car Finance*

Great! We offer:
✅ Lowest interest rates from 8.5%
✅ Up to 100% on-road funding
✅ 7-year flexible tenure
✅ Instant approval

Our finance expert will call you shortly with personalized options.

📱 Calculate EMI now: grabyourcar.lovable.app/car-loans`;
  }

  if (message.includes("insurance")) {
    return `🛡️ *GrabYourCar Insurance*

We partner with top insurers for:
✅ Up to 70% discount on premium
✅ Zero paperwork
✅ Instant policy issuance
✅ 24/7 claim support

Our insurance advisor will reach out shortly!

📱 Get quotes: grabyourcar.lovable.app/car-insurance`;
  }

  if (message.includes("dealer") || message.includes("showroom") || message.includes("visit")) {
    return `🏪 *GrabYourCar Dealer Network*

We have 20+ verified dealers across India!

Our team will connect you with the nearest authorized dealer with exclusive GrabYourCar offers.

📱 Find dealers: grabyourcar.lovable.app/dealers`;
  }

  // Default reply
  return `👋 *Welcome to GrabYourCar!*

India's Smarter Way to Buy New Cars.

Thank you for reaching out! Our car buying expert will call you within 5 minutes.

*What we offer:*
🚗 Best Price Guarantee
🏪 20+ Verified Dealers
💰 Easy Car Finance
🛡️ Comprehensive Insurance

📱 Explore: grabyourcar.lovable.app

_How can we help you today?_`;
}

// Send WhatsApp message via Cloud API
async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<void> {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to,
          type: "text",
          text: { body: text },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("WhatsApp API error:", response.status, errorData);
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Message sent successfully:", result);
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    throw error;
  }
}
