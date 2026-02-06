import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GeneratedCarData {
  brand: string;
  name: string;
  slug: string;
  body_type: string;
  tagline: string;
  overview: string;
  fuel_types: string[];
  transmission_types: string[];
  key_highlights: string[];
  variants: Array<{
    name: string;
    price: string;
    price_numeric: number;
    fuel_type: string;
    transmission: string;
    ex_showroom: number;
    rto: number;
    insurance: number;
    registration: number;
    handling: number;
    tcs: number;
    fastag: number;
    features: string[];
  }>;
  colors: Array<{
    name: string;
    hex_code: string;
  }>;
  specifications: Array<{
    category: string;
    label: string;
    value: string;
  }>;
  features: Array<{
    category: string;
    feature_name: string;
    is_standard: boolean;
  }>;
}

async function generateCarDataWithAI(carName: string): Promise<GeneratedCarData> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const systemPrompt = `You are an expert automotive data specialist for the Indian car market. 
Generate accurate, detailed car data for Indian cars including variants, colors, specifications, and pricing.
Always use INR for pricing. Be specific and realistic about Indian market data.
For on-road pricing, include: ex-showroom, RTO, insurance, registration, handling charges, TCS, and FASTAG.`;

  const userPrompt = `Generate complete, detailed data for the car: "${carName}"
Focus on Indian market data with current pricing (2024-2025).
Return structured JSON with: brand, model name, slug, body_type, tagline, overview, fuel_types, transmission_types, 
key_highlights (array), variants (with prices and breakups), colors (with hex codes), specifications (by category), 
and features (with category and standard/optional flag).

Variants should include: base, mid, and top variants with realistic prices.
Colors should have realistic hex codes.
Specifications should cover: Engine, Performance, Safety, Comfort, Interior, Exterior.
On-road prices should be realistic for Indian market with proper tax breakdown.`;

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
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("AI Gateway error:", error);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response from AI");
  }

  // Extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not extract JSON from AI response");
  }

  const carData = JSON.parse(jsonMatch[0]) as GeneratedCarData;
  return carData;
}

async function saveCarDataToDatabase(carData: GeneratedCarData, userId: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  // Create car entry
  const { data: car, error: carError } = await supabase
    .from("cars")
    .insert({
      brand: carData.brand,
      name: carData.name,
      slug: carData.slug,
      body_type: carData.body_type,
      tagline: carData.tagline,
      overview: carData.overview,
      fuel_types: carData.fuel_types,
      transmission_types: carData.transmission_types,
      key_highlights: carData.key_highlights,
      price_numeric: Math.min(...carData.variants.map(v => v.price_numeric)),
      availability: "available",
      is_new: true,
    })
    .select()
    .single();

  if (carError) {
    console.error("Car insert error:", carError);
    throw new Error(`Failed to save car: ${carError.message}`);
  }

  const carId = car.id;

  // Save variants
  for (const variant of carData.variants) {
    const { error: variantError } = await supabase.from("car_variants").insert({
      car_id: carId,
      name: variant.name,
      price: variant.price,
      price_numeric: variant.price_numeric,
      fuel_type: variant.fuel_type,
      transmission: variant.transmission,
      ex_showroom: variant.ex_showroom,
      rto: variant.rto,
      insurance: variant.insurance,
      registration: variant.registration,
      handling: variant.handling,
      tcs: variant.tcs,
      fastag: variant.fastag,
      on_road_price: variant.ex_showroom + variant.rto + variant.insurance + variant.registration + variant.handling + variant.tcs + variant.fastag,
      features: variant.features,
    });
    if (variantError) console.error("Variant insert error:", variantError);
  }

  // Save colors
  for (const color of carData.colors) {
    const { error: colorError } = await supabase.from("car_colors").insert({
      car_id: carId,
      name: color.name,
      hex_code: color.hex_code,
    });
    if (colorError) console.error("Color insert error:", colorError);
  }

  // Save specifications
  for (const spec of carData.specifications) {
    const { error: specError } = await supabase.from("car_specifications").insert({
      car_id: carId,
      category: spec.category,
      label: spec.label,
      value: spec.value,
    });
    if (specError) console.error("Specification insert error:", specError);
  }

  // Save features
  for (const feature of carData.features) {
    const { error: featureError } = await supabase.from("car_features").insert({
      car_id: carId,
      category: feature.category,
      feature_name: feature.feature_name,
      is_standard: feature.is_standard,
    });
    if (featureError) console.error("Feature insert error:", featureError);
  }

  return car;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { carName, saveToDatabase } = await req.json();

    if (!carName) {
      return new Response(JSON.stringify({ error: "Car name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating car data for: ${carName}`);
    const carData = await generateCarDataWithAI(carName);

    if (saveToDatabase) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") || "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
      );

      const token = authHeader.substring(7);
      const { data: userData } = await supabase.auth.getUser(token);
      const userId = userData?.user?.id;

      if (!userId) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const savedCar = await saveCarDataToDatabase(carData, userId);
      return new Response(
        JSON.stringify({
          success: true,
          data: carData,
          savedCar,
          message: `Car "${carData.name}" added successfully!`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, data: carData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
