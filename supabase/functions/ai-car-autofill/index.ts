import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brand, model } = await req.json();
    if (!brand || !model) {
      return new Response(JSON.stringify({ error: "Brand and model are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an Indian automotive data expert. You provide accurate, up-to-date car specifications, variant details, and pricing for Indian market cars.

CRITICAL: Return ONLY valid JSON with no markdown, no code blocks, no explanations. Just raw JSON.

The JSON must follow this exact structure:
{
  "body_type": "string (Hatchback/Sedan/Compact SUV/Mid-Size SUV/Full-Size SUV/MPV/MUV/Coupe/Pickup/Crossover)",
  "tagline": "string (official tagline or marketing line)",
  "overview": "string (2-3 sentence description)",
  "fuel_types": ["Petrol", "Diesel"],
  "transmission_types": ["Manual", "Automatic"],
  "is_hot": false,
  "is_new": true,
  "is_upcoming": false,
  "is_bestseller": false,
  "variants": [
    {
      "name": "variant name like LXi, VXi, ZXi",
      "fuel_type": "Petrol",
      "transmission": "Manual",
      "ex_showroom": 750000,
      "features": "feature1, feature2, feature3"
    }
  ],
  "colors": [
    { "name": "Arctic White", "hex_code": "#FFFFFF" },
    { "name": "Midnight Black", "hex_code": "#1A1A1A" }
  ],
  "specifications": [
    { "category": "engine", "label": "Displacement", "value": "1197 cc" },
    { "category": "engine", "label": "Max Power", "value": "88.7 bhp @ 6000 rpm" },
    { "category": "engine", "label": "Max Torque", "value": "113 Nm @ 4200 rpm" },
    { "category": "engine", "label": "No. of Cylinders", "value": "4" },
    { "category": "dimensions", "label": "Length", "value": "3995 mm" },
    { "category": "dimensions", "label": "Width", "value": "1735 mm" },
    { "category": "dimensions", "label": "Height", "value": "1515 mm" },
    { "category": "dimensions", "label": "Wheelbase", "value": "2520 mm" },
    { "category": "dimensions", "label": "Ground Clearance", "value": "163 mm" },
    { "category": "dimensions", "label": "Boot Space", "value": "268 L" },
    { "category": "dimensions", "label": "Kerb Weight", "value": "875 kg" },
    { "category": "dimensions", "label": "Fuel Tank Capacity", "value": "37 L" },
    { "category": "performance", "label": "Top Speed", "value": "180 kmph" },
    { "category": "performance", "label": "Mileage (ARAI)", "value": "23.2 kmpl" },
    { "category": "performance", "label": "Drive Type", "value": "FWD" },
    { "category": "features", "label": "Infotainment", "value": "9-inch Touchscreen" },
    { "category": "features", "label": "Sunroof", "value": "Electric Sunroof" },
    { "category": "features", "label": "Climate Control", "value": "Auto AC" },
    { "category": "safety", "label": "Airbags", "value": "6 Airbags" },
    { "category": "safety", "label": "ABS with EBD", "value": "Yes" },
    { "category": "safety", "label": "NCAP Rating", "value": "5 Star (Global)" }
  ],
  "pros": "Good mileage\\nStylish design\\nFeature-rich",
  "cons": "Cramped rear seat\\nNo diesel option\\nAverage boot space",
  "key_highlights": "Best-in-class mileage\\n6 airbags standard\\nConnected car tech"
}

Rules:
- Include ALL variants available in India with accurate ex-showroom Delhi prices in INR (number, not string)
- Group variants by fuel type (list all Petrol variants, then Diesel, then EV etc.)
- Include at least 5-8 colors with accurate hex codes
- All specs should be for the base variant unless noted
- ex_showroom prices must be realistic current Indian market prices
- If the car is discontinued or upcoming, reflect that in is_upcoming/is_hot flags`;

    const userPrompt = `Generate complete car data for the ${brand} ${model} for the Indian market. Include all current variants with accurate 2024-2025 pricing.`;

    const models = ["google/gemini-3-flash-preview", "google/gemini-2.5-flash", "openai/gpt-5-mini"];
    let lastError = "";

    for (const modelName of models) {
      try {
        console.log(`Trying model: ${modelName}`);
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
          }),
        });

        if (response.status === 429) {
          lastError = "Rate limited";
          continue;
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!response.ok) {
          lastError = `Model ${modelName} failed: ${response.status}`;
          continue;
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || "";
        
        // Strip markdown code blocks if present
        content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

        const parsed = JSON.parse(content);

        return new Response(JSON.stringify({ success: true, data: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        console.error(`Model ${modelName} error:`, lastError);
        continue;
      }
    }

    return new Response(JSON.stringify({ error: `All models failed. Last error: ${lastError}` }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-car-autofill error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
