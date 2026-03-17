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
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  // GET — Meta webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN && challenge) {
      console.log("Webhook verified");
      return new Response(challenge, { status: 200 });
    }

    return new Response(JSON.stringify({ status: "Webhook endpoint active" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST — incoming messages + delivery status updates from Meta
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Meta webhook payload:", JSON.stringify(body));

      // Health check
      if (body.action === "health_check") {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Process Meta webhook format
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        // Legacy Finbite format fallback
        return await handleLegacyWebhook(body, supabase, LOVABLE_API_KEY);
      }

      // --- Handle delivery status updates ---
      if (value.statuses && value.statuses.length > 0) {
        for (const statusUpdate of value.statuses) {
          const messageId = statusUpdate.id;
          const status = statusUpdate.status; // sent, delivered, read, failed
          const timestamp = statusUpdate.timestamp
            ? new Date(parseInt(statusUpdate.timestamp) * 1000).toISOString()
            : new Date().toISOString();

          console.log(`Status update: ${messageId} → ${status}`);

          const updates: Record<string, any> = { status };

          if (status === "sent") {
            updates.sent_at = timestamp;
          } else if (status === "delivered") {
            updates.delivered_at = timestamp;
          } else if (status === "read") {
            updates.read_at = timestamp;
          } else if (status === "failed") {
            const errorInfo = statusUpdate.errors?.[0];
            updates.error_message = errorInfo?.title || errorInfo?.message || "Delivery failed";
          }

          // Update wa_message_logs by provider_message_id
          const { error } = await supabase
            .from("wa_message_logs")
            .update(updates)
            .eq("provider_message_id", messageId);

          if (error) {
            console.error(`Failed to update status for ${messageId}:`, error);
          }
        }

        return new Response(JSON.stringify({ success: true, processed: "statuses" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // --- Handle incoming messages ---
      if (value.messages && value.messages.length > 0) {
        for (const msg of value.messages) {
          const from = msg.from;
          const messageText = msg.text?.body || msg.caption || "";
          const contactName = value.contacts?.[0]?.profile?.name || "Customer";

          console.log(`Incoming message from ${contactName} (${from}): ${messageText}`);

          // Upsert conversation
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
          } else {
            const { data: newConvo } = await supabase
              .from("whatsapp_conversations")
              .insert({
                phone_number: from,
                customer_name: contactName,
                messages: [],
                status: "active",
              })
              .select()
              .single();
            conversationId = newConvo?.id;
          }

          conversationHistory.push({ role: "user", content: messageText });

          // Generate AI response
          let aiResponse = getStaticResponse(messageText.toLowerCase());
          if (LOVABLE_API_KEY) {
            try {
              aiResponse = await generateAIResponse(LOVABLE_API_KEY, contactName, messageText, conversationHistory);
            } catch (e) {
              console.error("AI response error:", e);
            }
          }

          conversationHistory.push({ role: "assistant", content: aiResponse });

          // Update conversation
          await supabase
            .from("whatsapp_conversations")
            .update({
              messages: conversationHistory.slice(-20),
              last_message_at: new Date().toISOString(),
            })
            .eq("id", conversationId);

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

          // Log to wa_message_logs
          await supabase.from("wa_message_logs").insert({
            phone: from,
            customer_name: contactName,
            message_type: "text",
            message_content: aiResponse,
            trigger_event: "chatbot_reply",
            status: "sent",
            provider: "meta",
            sent_at: new Date().toISOString(),
          });

          // Save as lead
          if (!existingConvo || detectHighIntent(messageText)) {
            await supabase.from("leads").upsert({
              phone: formatPhoneDisplay(from),
              customer_name: contactName,
              source: "whatsapp_chatbot",
              lead_type: detectLeadType(messageText),
              notes: `Latest: ${messageText}`,
              status: existingConvo ? "contacted" : "new",
              priority: detectHighIntent(messageText) ? "high" : "medium",
            }, { onConflict: "phone" });
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
      console.error("Webhook processing error:", error);
      return new Response(JSON.stringify({ error: "Processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

// Legacy Finbite webhook handler
async function handleLegacyWebhook(body: any, supabase: any, lovableApiKey: string | undefined) {
  const from = body.phone || body.from || body.sender;
  const messageText = body.message || body.msg || body.text || "";

  if (!from || !messageText) {
    return new Response(JSON.stringify({ success: true, status: "acknowledged" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// AI response generation
async function generateAIResponse(
  apiKey: string,
  customerName: string,
  currentMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  const systemPrompt = `You are GrabYourCar's WhatsApp car buying assistant. Keep responses under 200 words. Be friendly and helpful. Brands: Maruti, Hyundai, Tata, Mahindra, Kia, Toyota, Honda, MG, Skoda, VW. Services: New cars, loans (8.5%+), insurance (up to 70% discount), HSRP. Website: www.grabyourcar.com`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-10),
      ],
      max_tokens: 500,
    }),
  });

  if (!response.ok) return getStaticResponse(currentMessage.toLowerCase());
  const data = await response.json();
  return data.choices?.[0]?.message?.content || getStaticResponse(currentMessage.toLowerCase());
}

function getStaticResponse(message: string): string {
  if (message.includes("price") || message.includes("cost")) {
    return `🚗 For the best on-road price in your city, our expert will call you within 5 minutes.\n\nBrowse cars: www.grabyourcar.com/cars`;
  }
  if (message.includes("loan") || message.includes("emi")) {
    return `💰 Car Finance: Interest from 8.5%, up to 100% funding, instant approval.\n\nCalculate EMI: www.grabyourcar.com/car-loans`;
  }
  if (message.includes("hi") || message.includes("hello")) {
    return `👋 Welcome to GrabYourCar!\n\n1️⃣ Find the perfect car\n2️⃣ Check prices & offers\n3️⃣ Calculate EMI\n4️⃣ Locate nearest dealer\n\nJust ask!`;
  }
  return `Thank you! Our car expert will connect with you shortly.\n\nExplore: www.grabyourcar.com`;
}

function detectHighIntent(message: string): boolean {
  const keywords = ["buy", "purchase", "book", "price", "offer", "discount", "loan", "emi", "dealer", "test drive"];
  return keywords.some(k => message.toLowerCase().includes(k));
}

function detectLeadType(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("loan") || lower.includes("emi")) return "finance_inquiry";
  if (lower.includes("insurance")) return "insurance_inquiry";
  return "car_inquiry";
}

function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}
