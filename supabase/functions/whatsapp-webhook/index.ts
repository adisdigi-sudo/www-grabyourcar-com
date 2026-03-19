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

      // --- Handle incoming messages via AI Brain ---
      if (value.messages?.length > 0) {
        for (const msg of value.messages) {
          const from = msg.from;
          const messageText = msg.text?.body || msg.caption || "";
          const contactName = value.contacts?.[0]?.profile?.name || "Customer";

          console.log(`Incoming from ${contactName} (${from}): ${messageText}`);

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

            // If human takeover is active, skip AI response
            if (existingConvo.human_takeover) {
              console.log(`Human takeover active for ${from}, skipping AI`);
              conversationHistory.push({ role: "user", content: messageText });
              await supabase.from("whatsapp_conversations").update({
                messages: conversationHistory.slice(-20),
                last_message_at: new Date().toISOString(),
              }).eq("id", conversationId);
              continue;
            }
          } else {
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

          // Call AI Brain for intelligent response
          let aiResponse = getFallbackResponse(messageText.toLowerCase());
          let intentDetected = "general";

          try {
            const brainResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-brain`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                messages: conversationHistory.slice(-10),
                channel: "whatsapp",
                customer_name: contactName,
                customer_phone: from,
              }),
            });

            if (brainResponse.ok) {
              const brainData = await brainResponse.json();
              aiResponse = brainData.response || aiResponse;
              intentDetected = brainData.intent || "general";

              // Update conversation intent
              await supabase.from("whatsapp_conversations").update({
                intent_detected: intentDetected,
              }).eq("id", conversationId);
            }
          } catch (e) {
            console.error("AI Brain call failed, using fallback:", e);
          }

          conversationHistory.push({ role: "assistant", content: aiResponse });

          // Update conversation
          await supabase.from("whatsapp_conversations").update({
            messages: conversationHistory.slice(-20),
            last_message_at: new Date().toISOString(),
          }).eq("id", conversationId);

          // Send reply via Meta API
          const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
          const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

          if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
            await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
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
          }

          // Log message
          await supabase.from("wa_message_logs").insert({
            phone: from,
            customer_name: contactName,
            message_type: "text",
            message_content: aiResponse,
            trigger_event: "ai_brain_reply",
            status: "sent",
            provider: "meta",
            sent_at: new Date().toISOString(),
          });
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
      return new Response(JSON.stringify({ error: "Processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

function getFallbackResponse(message: string): string {
  if (message.includes("price") || message.includes("cost")) {
    return `🚗 For the best on-road price, our expert will call you within 5 minutes.\n\nBrowse cars: www.grabyourcar.com/cars`;
  }
  if (message.includes("loan") || message.includes("emi")) {
    return `💰 Car Finance: Interest from 8.5%, up to 100% funding.\n\nCalculate EMI: www.grabyourcar.com/car-loans`;
  }
  if (message.includes("insurance")) {
    return `🛡️ Car Insurance with up to 70% discount!\n\nGet quote: www.grabyourcar.com/car-insurance`;
  }
  if (message.includes("hi") || message.includes("hello")) {
    return `👋 Welcome to GrabYourCar!\n\n1️⃣ Find the perfect car\n2️⃣ Check prices & offers\n3️⃣ Calculate EMI\n4️⃣ Get Insurance Quote\n\nJust ask!`;
  }
  return `Thank you! Our car expert will connect with you shortly.\n\nExplore: www.grabyourcar.com`;
}
