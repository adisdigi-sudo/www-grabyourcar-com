import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
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

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Handle incoming messages
      if (value?.messages?.[0]) {
        const message = value.messages[0];
        const contact = value.contacts?.[0];
        const from = message.from;
        const messageType = message.type;
        const messageText = message.text?.body || "";
        const senderName = contact?.profile?.name || "Customer";

        console.log(`Message from ${senderName} (${from}): ${messageText}`);

        // Create Supabase client
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // Get or create conversation history for this phone number
        const { data: existingConvo } = await supabase
          .from("whatsapp_conversations")
          .select("*")
          .eq("phone_number", from)
          .single();

        let conversationHistory: Array<{ role: string; content: string }> = [];
        let conversationId: string;

        if (existingConvo) {
          conversationId = existingConvo.id;
          conversationHistory = existingConvo.messages || [];
        } else {
          // Create new conversation
          const { data: newConvo, error } = await supabase
            .from("whatsapp_conversations")
            .insert({
              phone_number: from,
              customer_name: senderName,
              messages: [],
              status: "active",
            })
            .select()
            .single();

          if (error) {
            console.error("Failed to create conversation:", error);
          }
          conversationId = newConvo?.id;
        }

        // Add user message to history
        conversationHistory.push({ role: "user", content: messageText });

        // Generate AI response
        let aiResponse: string;
        
        if (LOVABLE_API_KEY) {
          aiResponse = await generateAIResponse(LOVABLE_API_KEY, senderName, messageText, conversationHistory);
        } else {
          aiResponse = getStaticResponse(messageText.toLowerCase());
        }

        // Add AI response to history
        conversationHistory.push({ role: "assistant", content: aiResponse });

        // Update conversation in database (keep last 20 messages)
        const trimmedHistory = conversationHistory.slice(-20);
        await supabase
          .from("whatsapp_conversations")
          .update({
            messages: trimmedHistory,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", conversationId);

        // Save as lead (only for new conversations or important intents)
        if (!existingConvo || detectHighIntent(messageText)) {
          await supabase.from("leads").upsert({
            phone: formatPhoneNumber(from),
            customer_name: senderName,
            source: "whatsapp_chatbot",
            lead_type: detectLeadType(messageText),
            notes: `Latest: ${messageText}`,
            status: existingConvo ? "contacted" : "new",
            priority: detectHighIntent(messageText) ? "high" : "medium",
          }, { onConflict: "phone" });
        }

        // Send response via WhatsApp
        await sendWhatsAppMessage(
          WHATSAPP_PHONE_NUMBER_ID,
          WHATSAPP_ACCESS_TOKEN,
          from,
          aiResponse
        );
      }

      // Handle message status updates
      if (value?.statuses?.[0]) {
        const status = value.statuses[0];
        console.log(`Message status: ${status.status} for ${status.id}`);
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

// Generate AI response using Lovable AI
async function generateAIResponse(
  apiKey: string,
  customerName: string,
  currentMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  const systemPrompt = `You are GrabYourCar's WhatsApp car buying assistant. You help customers find their perfect car in India.

PERSONALITY:
- Friendly, professional, and helpful
- Use emojis sparingly (1-2 per message max)
- Keep responses concise (under 200 words) - this is WhatsApp
- Use bullet points for lists
- Always be proactive in offering help

KNOWLEDGE:
- Brands available: Maruti Suzuki, Hyundai, Tata, Mahindra, Kia, Toyota, Honda, MG, Skoda, Volkswagen
- Services: New car sales, car loans (8.5% onwards), insurance (up to 70% discount), HSRP, accessories
- We have 20+ verified dealers across major Indian cities
- Website: grabyourcar.lovable.app

CAPABILITIES:
- Recommend cars based on budget, preferences, family size
- Explain differences between variants
- Provide approximate price ranges
- Answer questions about features, mileage, safety
- Help with loan/EMI calculations
- Connect with nearest dealer

RESPONSE FORMAT:
- Start with a brief acknowledgment
- Provide clear, actionable information
- End with a follow-up question OR offer to connect with expert

IMPORTANT:
- If customer wants to speak to a human, say our expert will call within 5 minutes
- For exact prices, say "Our team will share the best on-road price for your city"
- Never make up specific prices - give ranges like "₹8-12 Lakh"`;

  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10), // Last 10 messages for context
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status);
      return getStaticResponse(currentMessage.toLowerCase());
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || getStaticResponse(currentMessage.toLowerCase());
  } catch (error) {
    console.error("AI generation error:", error);
    return getStaticResponse(currentMessage.toLowerCase());
  }
}

// Fallback static responses
function getStaticResponse(message: string): string {
  if (message.includes("price") || message.includes("cost") || message.includes("kitna")) {
    return `🚗 *Best Price Guarantee*

Thank you for your interest! For the best on-road price in your city, our car expert will call you within 5 minutes.

Quick links:
• Browse cars: grabyourcar.lovable.app/cars
• EMI Calculator: grabyourcar.lovable.app/car-loans

Which car model are you interested in?`;
  }

  if (message.includes("loan") || message.includes("emi") || message.includes("finance")) {
    return `💰 *Car Finance Made Easy*

We offer:
• Interest from 8.5%
• Up to 100% funding
• 7-year tenure
• Instant approval

Our finance expert will call you shortly!

Calculate EMI: grabyourcar.lovable.app/car-loans`;
  }

  if (message.includes("hi") || message.includes("hello") || message.includes("hey")) {
    return `👋 *Welcome to GrabYourCar!*

India's Smarter Way to Buy New Cars.

How can I help you today?
1️⃣ Find the perfect car
2️⃣ Check prices & offers
3️⃣ Calculate EMI
4️⃣ Locate nearest dealer

Just type your preference or ask any question!`;
  }

  return `Thank you for your message! 🚗

Our car expert will connect with you shortly to assist you better.

Meanwhile, explore: grabyourcar.lovable.app

What specific car or query can I help you with?`;
}

// Detect high-intent messages
function detectHighIntent(message: string): boolean {
  const highIntentKeywords = [
    "buy", "purchase", "book", "price", "offer", "discount",
    "loan", "emi", "finance", "dealer", "showroom", "test drive",
    "delivery", "available", "stock", "waiting"
  ];
  const lowerMessage = message.toLowerCase();
  return highIntentKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Detect lead type from message
function detectLeadType(message: string): string {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("loan") || lowerMessage.includes("emi") || lowerMessage.includes("finance")) {
    return "finance_inquiry";
  }
  if (lowerMessage.includes("insurance")) {
    return "insurance_inquiry";
  }
  if (lowerMessage.includes("dealer") || lowerMessage.includes("showroom")) {
    return "dealer_visit";
  }
  return "car_inquiry";
}

// Format phone number for display
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

// Send WhatsApp message
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
    } else {
      console.log("Message sent successfully");
    }
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
  }
}
