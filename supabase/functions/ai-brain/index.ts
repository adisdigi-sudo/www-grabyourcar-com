import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "openai/gpt-5-mini",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const {
      messages,
      channel = "website", // whatsapp | website | crm
      customer_name,
      customer_phone,
      page_context,
      stream = false,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load knowledge base from DB
    const { data: knowledgeRows } = await supabase
      .from("ai_knowledge_base")
      .select("category, title, content")
      .eq("is_active", true)
      .order("sort_order");

    const knowledgeContext = (knowledgeRows || [])
      .map((r: any) => `[${r.category.toUpperCase()}] ${r.title}: ${r.content}`)
      .join("\n\n");

    // Channel-specific instructions
    const channelInstructions: Record<string, string> = {
      whatsapp: `You are GrabYourCar's WhatsApp AI assistant. Keep responses under 200 words. Use emojis sparingly. Use a friendly Hindi-English mix tone. Always try to capture the customer's name, phone (if not known), preferred car, and city. End with a call-to-action.`,
      website: `You are GrabYourCar's website car advisor chatbot. Be helpful, informative, and guide users to explore cars on the website. Mention specific car pages and features. You can be slightly longer than WhatsApp responses.`,
      crm: `You are GrabYourCar's internal CRM AI assistant. Help staff with lead analysis, follow-up suggestions, draft messages, and data insights. Be concise and action-oriented.`,
    };

    const systemPrompt = `${channelInstructions[channel] || channelInstructions.website}

=== COMPANY KNOWLEDGE BASE ===
${knowledgeContext}

=== RESPONSE FORMAT ===
You MUST respond with valid JSON in this exact format:
{
  "response": "Your helpful response text here",
  "intent": "car_inquiry|insurance|loan|test_drive|hsrp|accessories|self_drive|complaint|general",
  "lead_data": {
    "name": "extracted customer name or null",
    "phone": "extracted phone or null",
    "car_interest": "car model mentioned or null",
    "city": "city mentioned or null",
    "service_category": "new_car|insurance|loan|hsrp|accessories|rental|general"
  },
  "suggested_actions": ["action1", "action2"],
  "high_intent": true/false
}

${page_context ? `The user is currently viewing: ${page_context}` : ""}
${customer_name ? `Customer name: ${customer_name}` : ""}
${customer_phone ? `Customer phone: ${customer_phone}` : ""}

IMPORTANT: Always respond with valid JSON. The "response" field contains what the customer sees.`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-15),
    ];

    // Streaming mode for website chatbot
    if (stream) {
      const response = await callAI(LOVABLE_API_KEY, aiMessages, true);
      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, please try again" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI error: ${status}`);
      }
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming mode for WhatsApp / CRM
    const aiResult = await callAIWithFallback(LOVABLE_API_KEY, aiMessages);

    // Try to parse structured response
    let parsed: any;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = aiResult;
      const jsonMatch = aiResult.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      
      // Try direct parse
      parsed = JSON.parse(jsonStr);
    } catch {
      // Fallback: treat entire response as plain text
      parsed = {
        response: aiResult,
        intent: "general",
        lead_data: null,
        suggested_actions: [],
        high_intent: false,
      };
    }

    // Auto-capture lead if high intent detected
    if (parsed.high_intent && parsed.lead_data && customer_phone) {
      try {
        const leadName = parsed.lead_data.name || customer_name || "WhatsApp Lead";
        const leadPhone = parsed.lead_data.phone || customer_phone;

        await supabase.from("leads").upsert({
          phone: leadPhone,
          customer_name: leadName,
          source: channel === "whatsapp" ? "whatsapp_ai_bot" : "website_chatbot",
          service_category: parsed.lead_data.service_category || "new_car",
          notes: `AI Intent: ${parsed.intent}. Car Interest: ${parsed.lead_data.car_interest || "N/A"}. City: ${parsed.lead_data.city || "N/A"}`,
          status: "new",
          priority: "high",
          city: parsed.lead_data.city || null,
        }, { onConflict: "phone" });
      } catch (e) {
        console.error("Lead capture error:", e);
      }
    }

    // Log analytics
    try {
      await supabase.from("ai_conversation_analytics").insert({
        channel,
        intent_detected: parsed.intent || "general",
        lead_captured: !!(parsed.high_intent && parsed.lead_data),
        message_count: messages.length,
      });
    } catch (e) {
      console.error("Analytics log error:", e);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Brain error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("credits") ? 402 : message.includes("Rate") ? 429 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callAI(apiKey: string, messages: any[], stream = false) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      stream,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });
}

async function callAIWithFallback(apiKey: string, messages: any[]): Promise<string> {
  for (const model of AI_MODELS) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages, max_tokens: 1000, temperature: 0.7 }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      }
      if (response.status === 402) throw new Error("AI credits exhausted");
      if (response.status === 429 || response.status === 404) continue;
      const errText = await response.text();
      console.error(`AI error ${model}: ${response.status} ${errText}`);
    } catch (e) {
      if ((e as Error).message?.includes("credits")) throw e;
      console.error(`AI exception ${model}:`, e);
    }
  }
  throw new Error("All AI models failed");
}
