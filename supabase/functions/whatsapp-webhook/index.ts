import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Finbite API endpoint for sending messages
const FINBITE_API_URL = "https://app.finbite.in/api/v1/send_msg/";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const FINBITE_CLIENT_ID = Deno.env.get("FINBITE_CLIENT_ID");
  const FINBITE_API_KEY = Deno.env.get("FINBITE_API_KEY");
  const FINBITE_WHATSAPP_CLIENT = Deno.env.get("FINBITE_WHATSAPP_CLIENT");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!FINBITE_CLIENT_ID || !FINBITE_API_KEY || !FINBITE_WHATSAPP_CLIENT) {
    console.error("Missing Finbite configuration");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Handle incoming webhook from Finbite (POST request)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Incoming Finbite webhook:", JSON.stringify(body, null, 2));

      // Finbite webhook format - extract message details
      // Common fields: phone, message, sender_name, timestamp
      const from = body.phone || body.from || body.sender;
      const messageText = body.message || body.msg || body.text || "";
      const senderName = body.sender_name || body.name || "Customer";

      if (!from || !messageText) {
        console.log("No message content in webhook, might be status update");
        return new Response(JSON.stringify({ success: true, status: "acknowledged" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Message from ${senderName} (${from}): ${messageText}`);

      // Create Supabase client
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Format phone number for consistency
      const formattedPhone = from.replace(/\D/g, "");

      // Get or create conversation history for this phone number
      const { data: existingConvo } = await supabase
        .from("whatsapp_conversations")
        .select("*")
        .eq("phone_number", formattedPhone)
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
            phone_number: formattedPhone,
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
          phone: formatPhoneNumber(formattedPhone),
          customer_name: senderName,
          source: "whatsapp_chatbot",
          lead_type: detectLeadType(messageText),
          notes: `Latest: ${messageText}`,
          status: existingConvo ? "contacted" : "new",
          priority: detectHighIntent(messageText) ? "high" : "medium",
        }, { onConflict: "phone" });
      }

      // Send response via Finbite API
      await sendFinbiteMessage(
        FINBITE_CLIENT_ID,
        FINBITE_API_KEY,
        FINBITE_WHATSAPP_CLIENT,
        formattedPhone,
        aiResponse
      );

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

  // Handle GET request for webhook verification (if Finbite requires it)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("challenge") || url.searchParams.get("hub.challenge");
    
    if (challenge) {
      console.log("Webhook verification challenge:", challenge);
      return new Response(challenge, { status: 200 });
    }
    
    return new Response(JSON.stringify({ status: "Webhook endpoint active" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
- Website: www.grabyourcar.com

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

// Send WhatsApp message via Finbite API
async function sendFinbiteMessage(
  clientId: string,
  apiKey: string,
  whatsappClient: string,
  to: string,
  text: string
): Promise<void> {
  try {
    // Ensure phone has country code
    const phoneWithCountry = to.startsWith("91") ? to : `91${to}`;

    const payload = {
      client_id: parseInt(clientId),
      api_key: apiKey,
      whatsapp_client: parseInt(whatsappClient),
      phone: phoneWithCountry,
      msg: text,
      msg_type: 0, // Text message
    };

    console.log("Sending via Finbite:", JSON.stringify({ ...payload, api_key: "[REDACTED]" }));

    const response = await fetch(FINBITE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Finbite API error:", response.status, errorData);
    } else {
      const result = await response.json();
      console.log("Message sent successfully via Finbite:", result);
    }
  } catch (error) {
    console.error("Failed to send Finbite message:", error);
  }
}
