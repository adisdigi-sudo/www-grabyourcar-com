import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "openai/gpt-5-mini",
];

async function callAIWithFallback(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  let lastError: Error | null = null;

  for (const model of AI_MODELS) {
    try {
      console.log(`Trying model: ${model}`);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.max_tokens ?? 2000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          console.log(`Success with model: ${model}`);
          return content;
        }
      }

      if (response.status === 429) {
        console.log(`Rate limited on ${model}, trying next...`);
        continue;
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to your workspace.");
      }
      if (response.status === 404 || response.status === 410) {
        console.log(`Model ${model} unavailable, trying next...`);
        continue;
      }

      const errorText = await response.text();
      console.error(`Error with ${model}: ${response.status} - ${errorText}`);
      lastError = new Error(`AI error: ${response.status}`);
    } catch (error) {
      if ((error as Error).message?.includes("credits")) throw error;
      console.error(`Exception with ${model}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error("All AI models failed. Please try again later.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("AI service not configured");
    }

    const body = await req.json();
    const { prompt, systemPrompt, messages, temperature, max_tokens } = body;

    // Support both simple prompt mode and full messages mode
    let aiMessages: Array<{ role: string; content: string }>;

    if (messages && Array.isArray(messages)) {
      aiMessages = messages;
    } else if (prompt) {
      aiMessages = [];
      if (systemPrompt) {
        aiMessages.push({ role: "system", content: systemPrompt });
      }
      aiMessages.push({ role: "user", content: prompt });
    } else {
      return new Response(
        JSON.stringify({ error: "Either 'prompt' or 'messages' is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = await callAIWithFallback(aiMessages, LOVABLE_API_KEY, {
      temperature,
      max_tokens,
    });

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI generate error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("credits") ? 402 : message.includes("Rate") ? 429 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
