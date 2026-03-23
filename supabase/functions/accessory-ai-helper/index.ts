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

async function callAI(messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  for (const model of AI_MODELS) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1000 }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      }
      if (res.status === 429) continue;
      if (res.status === 402) throw new Error("AI credits exhausted. Please add funds.");
    } catch (e) { if ((e as Error).message.includes("credits")) throw e; }
  }
  throw new Error("All AI models failed");
}

async function generateImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { action, category, name, description, features } = await req.json();

    if (action === "generate_name") {
      const result = await callAI([
        { role: "system", content: "You are a product naming expert for an Indian car accessories e-commerce store. Generate a single professional, catchy product name. Return ONLY the product name, nothing else. Keep it under 60 characters. Make it sound premium and marketable." },
        { role: "user", content: `Generate a professional product name for a car accessory in the "${category || 'General'}" category.${description ? ` Description hint: ${description}` : ''}${features ? ` Features: ${features}` : ''}` },
      ], apiKey);
      return new Response(JSON.stringify({ name: result.replace(/^["']|["']$/g, '') }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_description") {
      const result = await callAI([
        { role: "system", content: "You are a professional copywriter for an Indian car accessories e-commerce store. Write a compelling, SEO-friendly product description. Keep it 2-3 sentences max. Be specific about benefits. Return ONLY the description text." },
        { role: "user", content: `Write a product description for: "${name || 'Car Accessory'}" in category "${category || 'General'}".${features ? ` Key features: ${features}` : ''}` },
      ], apiKey);
      return new Response(JSON.stringify({ description: result.replace(/^["']|["']$/g, '') }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_image") {
      const prompt = `Professional product photography of a car accessory: ${name || category || 'car accessory'}. Clean white background, studio lighting, high-quality e-commerce product photo style. No text or watermarks. On a clean white background.`;
      const imageUrl = await generateImage(prompt, apiKey);
      if (!imageUrl) throw new Error("Image generation failed");
      return new Response(JSON.stringify({ image: imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("credits") ? 402 : msg.includes("Rate") ? 429 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
