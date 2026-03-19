import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "grabyourcar_webhook_verify";

  // GET — Meta webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }

    return new Response(JSON.stringify({ status: "Webhook endpoint active" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST — incoming messages + delivery status updates
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Meta webhook payload:", JSON.stringify(body).slice(0, 500));

      if (body.action === "health_check") {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        return new Response(JSON.stringify({ success: true, status: "acknowledged" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // --- Handle delivery status updates ---
      if (value.statuses?.length > 0) {
        for (const statusUpdate of value.statuses) {
          const updates: Record<string, any> = { status: statusUpdate.status };
          const timestamp = statusUpdate.timestamp
            ? new Date(parseInt(statusUpdate.timestamp) * 1000).toISOString()
            : new Date().toISOString();

          if (statusUpdate.status === "sent") updates.sent_at = timestamp;
          else if (statusUpdate.status === "delivered") updates.delivered_at = timestamp;
          else if (statusUpdate.status === "read") updates.read_at = timestamp;
          else if (statusUpdate.status === "failed") {
            updates.error_message = statusUpdate.errors?.[0]?.title || "Delivery failed";
          }

          await supabase
            .from("wa_message_logs")
            .update(updates)
            .eq("provider_message_id", statusUpdate.id);
        }
        return new Response(JSON.stringify({ success: true, processed: "statuses" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // --- Handle incoming messages ---
      if (value.messages?.length > 0) {
        for (const msg of value.messages) {
          const from = msg.from;
          const messageText = msg.text?.body || msg.caption || "";
          const contactName = value.contacts?.[0]?.profile?.name || "Customer";
          const messageType = msg.type || "text";

          console.log(`Incoming from ${contactName} (${from}): [${messageType}] ${messageText}`);

          // Get or create conversation
          const { data: existingConvo } = await supabase
            .from("whatsapp_conversations")
            .select("*")
            .eq("phone_number", from)
            .single();

          let conversationHistory: Array<{ role: string; content: string }> = [];
          let conversationId: string;

          if (existingConvo) {
            conversationId = existingConvo.id;
            conversationHistory = (existingConvo.messages as any[]) || [];

            // If human takeover is active, just save message and skip AI
            if (existingConvo.human_takeover) {
              console.log(`Human takeover active for ${from}, skipping AI`);
              conversationHistory.push({ role: "user", content: messageText });
              await supabase.from("whatsapp_conversations").update({
                messages: conversationHistory.slice(-20),
                last_message_at: new Date().toISOString(),
                customer_name: contactName,
              }).eq("id", conversationId);
              continue;
            }
          } else {
            // New conversation — send greeting
            const { data: newConvo } = await supabase
              .from("whatsapp_conversations")
              .insert({
                phone_number: from,
                customer_name: contactName,
                messages: [],
                status: "active",
                ai_enabled: true,
              })
              .select()
              .single();
            conversationId = newConvo?.id;
          }

          conversationHistory.push({ role: "user", content: messageText });

          // Call AI Brain v2 for intelligent response
          let aiResponse = getFallbackResponse(messageText.toLowerCase());
          let intentDetected = "general";
          let leadCaptured = false;

          try {
            const brainResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-brain`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                messages: conversationHistory.slice(-12),
                channel: "whatsapp",
                customer_name: contactName,
                customer_phone: from,
              }),
            });

            if (brainResponse.ok) {
              const brainData = await brainResponse.json();
              aiResponse = brainData.response || aiResponse;
              intentDetected = brainData.intent || "general";
              leadCaptured = brainData.lead_captured || false;
            } else {
              console.error("AI Brain error:", brainResponse.status, await brainResponse.text());
            }
          } catch (e) {
            console.error("AI Brain call failed, using fallback:", e);
          }

          conversationHistory.push({ role: "assistant", content: aiResponse });

          // Update conversation with intent
          await supabase.from("whatsapp_conversations").update({
            messages: conversationHistory.slice(-20),
            last_message_at: new Date().toISOString(),
            customer_name: contactName,
            intent_detected: intentDetected,
          }).eq("id", conversationId);

          // Send reply via Meta API
          const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
          const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

          if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
            const sendResult = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: from,
                type: "text",
                text: { body: aiResponse },
              }),
            });

            const sendData = await sendResult.json();
            const providerMessageId = sendData.messages?.[0]?.id || null;

            // Log outgoing message
            await supabase.from("wa_message_logs").insert({
              phone: from,
              customer_name: contactName,
              message_type: "text",
              message_content: aiResponse,
              trigger_event: "ai_brain_v2_reply",
              status: sendResult.ok ? "sent" : "failed",
              provider: "meta",
              provider_message_id: providerMessageId,
              sent_at: new Date().toISOString(),
            });
          }
        }

        return new Response(JSON.stringify({ success: true, processed: "messages" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, status: "no_action" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      // Always return 200 to Meta to prevent webhook deactivation
      return new Response(JSON.stringify({ error: "Processing failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

function getFallbackResponse(message: string): string {
  if (message.includes("price") || message.includes("cost") || message.includes("kitna")) {
    return `🚗 For the best on-road price, our expert will call you within 5 minutes!\n\nBrowse cars: www.grabyourcar.com/cars`;
  }
  if (message.includes("loan") || message.includes("emi") || message.includes("finance")) {
    return `💰 Car Finance: Interest from 8.5%, up to 100% funding!\n\nCalculate EMI: www.grabyourcar.com/car-loans`;
  }
  if (message.includes("insurance") || message.includes("bima")) {
    return `🛡️ Car Insurance with up to 70% discount!\n\nGet quote: www.grabyourcar.com/car-insurance`;
  }
  if (message.includes("hi") || message.includes("hello") || message.includes("namaste")) {
    return `👋 Welcome to GrabYourCar!\n\nI'm your AI car assistant. I can help with:\n\n1️⃣ Find the perfect car\n2️⃣ Check prices & offers\n3️⃣ Calculate EMI\n4️⃣ Get Insurance Quote\n5️⃣ Book Test Drive\n\nJust ask me anything! 🚗`;
  }
  return `Thank you for your message! Our car expert will connect with you shortly.\n\nMeanwhile, explore: www.grabyourcar.com`;
}
