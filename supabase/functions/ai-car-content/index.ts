import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODELS = ["google/gemini-3-flash-preview", "google/gemini-2.5-flash", "openai/gpt-5-mini"];

async function callAI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  let lastError = "";
  for (const model of AI_MODELS) {
    try {
      console.log(`Trying model: ${model}`);
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: 0.4,
        }),
      });

      if (response.status === 429) { lastError = "Rate limited"; continue; }
      if (response.status === 402) throw new Error("AI credits exhausted. Please add funds in Settings > Workspace > Usage.");
      if (!response.ok) { lastError = `${model}: ${response.status}`; continue; }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) return content;
      lastError = "Empty response";
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (lastError.includes("credits")) throw e;
    }
  }
  throw new Error(`All models failed: ${lastError}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brand, model, body_type, fuel_types, transmission_types, variants, specifications, field } = await req.json();

    if (!brand || !model || !field) {
      return new Response(JSON.stringify({ error: "brand, model, and field are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const carContext = `Car: ${brand} ${model}
Body Type: ${body_type || "Unknown"}
Fuel Types: ${fuel_types?.join(", ") || "Unknown"}
Transmission: ${transmission_types?.join(", ") || "Unknown"}
Variants: ${variants?.map((v: any) => `${v.name} (₹${v.ex_showroom || "N/A"})`).join(", ") || "None"}
Specs: ${specifications?.filter((s: any) => s.value).map((s: any) => `${s.label}: ${s.value}`).join(", ") || "None"}`;

    const systemBase = "You are an Indian automotive expert writing for GrabYourCar.com, a leading Indian car marketplace. Be factual, engaging, and SEO-friendly. Write for Indian buyers.";

    let systemPrompt = systemBase;
    let userPrompt = "";

    switch (field) {
      case "overview":
        systemPrompt += " Write compelling car overviews that highlight key features, value proposition, and target audience.";
        userPrompt = `Write a 150-200 word SEO-friendly overview/description for the ${brand} ${model}. Cover its design, performance, features, safety, and value. Make it engaging and informative for Indian car buyers. Return ONLY the paragraph text, no headings or formatting.\n\n${carContext}`;
        break;

      case "tagline":
        systemPrompt += " Create catchy, memorable taglines for cars.";
        userPrompt = `Create a short, catchy marketing tagline (3-8 words) for the ${brand} ${model}. It should capture the car's essence and appeal to Indian buyers. Return ONLY the tagline text.\n\n${carContext}`;
        break;

      case "pros":
        systemPrompt += " Provide balanced, honest pros for cars based on real-world ownership experience in India.";
        userPrompt = `List 5-7 pros/advantages of the ${brand} ${model} for Indian buyers. Consider mileage, features, build quality, comfort, value for money, after-sales. Return each pro on a new line, no numbering, no bullets.\n\n${carContext}`;
        break;

      case "cons":
        systemPrompt += " Provide balanced, honest cons for cars based on real-world ownership experience in India.";
        userPrompt = `List 4-6 cons/disadvantages of the ${brand} ${model} for Indian buyers. Be fair and balanced — mention genuine weak points like rear seat space, missing features, after-sales concerns. Return each con on a new line, no numbering, no bullets.\n\n${carContext}`;
        break;

      case "key_highlights":
        systemPrompt += " Identify the most compelling selling points of cars for the Indian market.";
        userPrompt = `List 5-7 key highlights/USPs of the ${brand} ${model}. Focus on what makes it stand out — safety, mileage, features, tech. Return each highlight on a new line, no numbering, no bullets.\n\n${carContext}`;
        break;

      case "specifications":
        systemPrompt += ` You provide accurate technical specifications for Indian market cars. Return ONLY valid JSON array, no markdown.\n\nFormat: [{"category":"engine","label":"Displacement","value":"1197 cc"},...]`;
        userPrompt = `Generate complete technical specifications for the ${brand} ${model} (Indian market, base variant). Include these categories and labels:
Engine: Displacement, Max Power, Max Torque, No. of Cylinders, Valve Configuration, Bore x Stroke
Dimensions: Length, Width, Height, Wheelbase, Ground Clearance, Boot Space, Kerb Weight, Fuel Tank Capacity
Performance: Top Speed, 0-100 kmph, Mileage (ARAI), Drive Type
Features: Infotainment, Instrument Cluster, Sunroof, Steering, Climate Control, Cruise Control, Wireless Charging, Connected Car
Safety: Airbags, ABS with EBD, NCAP Rating, Parking Sensors, Camera, TPMS, ESC, Hill Assist

Return ONLY the JSON array.\n\n${carContext}`;
        break;

      case "seo_slug":
        userPrompt = `Generate an SEO-friendly URL slug for the ${brand} ${model}. Use format: brand-model (lowercase, hyphens). Return ONLY the slug text.`;
        break;

      case "competitors":
        systemPrompt += " You know the Indian car market competitive landscape well.";
        userPrompt = `List 4-6 direct competitors of the ${brand} ${model} in the Indian market (same segment, similar price). Return as comma-separated slugs in format: brand-model (e.g., hyundai-i20, tata-altroz). Return ONLY the comma-separated list.\n\n${carContext}`;
        break;

      default:
        return new Response(JSON.stringify({ error: `Unknown field: ${field}. Supported: overview, tagline, pros, cons, key_highlights, specifications, seo_slug, competitors` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    console.log(`Generating ${field} for ${brand} ${model}`);
    let content = await callAI(systemPrompt, userPrompt, LOVABLE_API_KEY);

    // Parse specifications as JSON
    if (field === "specifications") {
      content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify({ success: true, field, content: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, field, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-car-content error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("credits") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
