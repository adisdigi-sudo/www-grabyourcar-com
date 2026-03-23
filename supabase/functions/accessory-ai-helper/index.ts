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

const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";

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

async function callAIJSON(messages: Array<{ role: string; content: string }>, apiKey: string, toolDef: any): Promise<any> {
  for (const model of AI_MODELS) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model, messages, temperature: 0.7, max_tokens: 1500,
          tools: [{ type: "function", function: toolDef }],
          tool_choice: { type: "function", function: { name: toolDef.name } },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          return JSON.parse(toolCall.function.arguments);
        }
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
        model: IMAGE_MODEL,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  } catch { return null; }
}

async function generateMultipleImages(prompt: string, apiKey: string, imageCount = 3): Promise<string[]> {
  const shotVariants = [
    "Front-facing hero angle, centered composition, clean studio lighting.",
    "Three-quarter angle showing depth and form, premium commercial photography.",
    "Close-up detail shot highlighting finish, texture, and build quality.",
    "Lifestyle in-car usage shot while keeping the product clearly visible.",
  ];

  const images: string[] = [];
  const total = Math.min(Math.max(imageCount || 1, 1), 4);

  for (let index = 0; index < total; index += 1) {
    const variantPrompt = `${prompt} ${shotVariants[index] || shotVariants[0]}`;
    const image = await generateImage(variantPrompt, apiKey);
    if (image) images.push(image);
  }

  return images;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { action, category, name, description, features, imagePrompt, imageCount, userIdea } = await req.json();

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

    if (action === "generate_features") {
      const result = await callAI([
        { role: "system", content: "You are a product specialist for car accessories. Generate 4-6 key product features/highlights. Return ONLY a comma-separated list like: Feature1, Feature2, Feature3. No numbering, no bullets, no extra text." },
        { role: "user", content: `Generate key features for: "${name || 'Car Accessory'}" in category "${category || 'General'}".${description ? ` Description: ${description}` : ''}` },
      ], apiKey);
      return new Response(JSON.stringify({ features: result.replace(/^["']|["']$/g, '') }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_badge") {
      const result = await callAI([
        { role: "system", content: "You are a marketing expert. Suggest ONE short product badge label (1-2 words max) for an e-commerce product card. Examples: Bestseller, New, Hot Deal, Premium, Top Rated, Limited, Staff Pick. Return ONLY the badge text, nothing else." },
        { role: "user", content: `Suggest a badge for: "${name || 'Car Accessory'}" in "${category || 'General'}".${description ? ` ${description}` : ''}` },
      ], apiKey);
      return new Response(JSON.stringify({ badge: result.replace(/^["']|["']$/g, '') }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_image_prompt") {
      const result = await callAI([
        {
          role: "system",
          content: "You are an expert e-commerce product art director. Turn messy user requests into one precise image-generation prompt for a car accessory product photo. Return ONLY the final prompt. Make it specific about product appearance, angle, lighting, background, realism, and what must or must not appear. Keep it under 120 words.",
        },
        {
          role: "user",
          content: `Create a polished image prompt for this product. Category: ${category || 'General'}. Name: ${name || 'Car Accessory'}. Description: ${description || 'Not provided'}. Features: ${features || 'Not provided'}. User idea: ${userIdea || 'Professional clean product photos for website listing'}.`,
        },
      ], apiKey);

      return new Response(JSON.stringify({ prompt: result.replace(/^"|"$/g, '') }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "auto_fill_all") {
      const toolDef = {
        name: "fill_product",
        description: "Generate complete product details for a car accessory",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Professional product name, under 60 chars" },
            description: { type: "string", description: "SEO-friendly description, 2-3 sentences" },
            fullDescription: { type: "string", description: "Detailed description for the product detail page, 4-6 sentences" },
            features: { type: "string", description: "Comma-separated key features, 4-6 items" },
            badge: { type: "string", description: "Short badge label, 1-2 words (e.g. Bestseller, New, Hot Deal)" },
            slug: { type: "string", description: "SEO-friendly slug in lowercase with hyphens only" },
            imagePrompt: { type: "string", description: "Professional image generation prompt for this product" },
            price: { type: "number", description: "Suggested MRP in INR (Indian Rupees), realistic market price" },
            originalPrice: { type: "number", description: "Original/strikethrough price in INR, slightly higher than price" },
          },
          required: ["name", "description", "fullDescription", "features", "badge", "slug", "imagePrompt", "price", "originalPrice"],
          additionalProperties: false,
        },
      };
      const result = await callAIJSON([
        { role: "system", content: "You are an expert product manager for an Indian car accessories e-commerce store (GrabYourCar). Generate complete, realistic product details. Prices should be in Indian Rupees (INR) and reflect real Indian market pricing. Write everything in a professional, sales-ready tone." },
        { role: "user", content: `Generate complete product details for a car accessory in the "${category || 'General'}" category.${name ? ` Product hint: ${name}` : ''}${description ? ` Description hint: ${description}` : ''}` },
      ], apiKey, toolDef);
      return new Response(JSON.stringify({ product: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_image" || action === "generate_images") {
      const prompt = imagePrompt || `Professional product photography of a car accessory: ${name || category || 'car accessory'}. Clean white background, studio lighting, high-quality e-commerce product photo style. No text or watermarks. Show the product clearly and realistically.`;
      const images = await generateMultipleImages(prompt, apiKey, Number(imageCount) || (action === "generate_images" ? 3 : 1));
      if (!images.length) throw new Error("Image generation failed");
      return new Response(JSON.stringify({ image: images[0], images, prompt }), {
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
