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

function generateSlug(brand: string, name: string): string {
  return `${brand}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generateCarDataWithAI(carName: string): Promise<GeneratedCarData> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const systemPrompt = `You are an expert automotive data specialist for the Indian car market. 
Generate accurate, detailed car data for Indian cars including variants, colors, specifications, and pricing.
Always use INR for pricing. Be specific and realistic about Indian market data.
For on-road pricing, include: ex-showroom, RTO, insurance, registration, handling charges, TCS, and FASTAG.

IMPORTANT: Return ONLY valid JSON with no markdown formatting, no code blocks, just pure JSON object.`;

  const userPrompt = `Generate complete, detailed data for the car: "${carName}"
Focus on Indian market data with current pricing (2024-2025).

Return a JSON object with these exact fields:
{
  "brand": "Brand Name",
  "name": "Model Name",
  "slug": "brand-model-name",
  "body_type": "SUV/Sedan/Hatchback/etc",
  "tagline": "Marketing tagline",
  "overview": "Description of the car",
  "fuel_types": ["Petrol", "Diesel"],
  "transmission_types": ["Manual", "Automatic"],
  "key_highlights": ["Feature 1", "Feature 2"],
  "variants": [
    {
      "name": "Variant Name",
      "price": "₹X.XX Lakh",
      "price_numeric": 1000000,
      "fuel_type": "Petrol",
      "transmission": "Manual",
      "ex_showroom": 900000,
      "rto": 50000,
      "insurance": 25000,
      "registration": 5000,
      "handling": 15000,
      "tcs": 5000,
      "fastag": 500,
      "features": ["Feature 1", "Feature 2"]
    }
  ],
  "colors": [
    {"name": "Color Name", "hex_code": "#FFFFFF"}
  ],
  "specifications": [
    {"category": "Engine", "label": "Displacement", "value": "1500 cc"}
  ],
  "features": [
    {"category": "Safety", "feature_name": "ABS", "is_standard": true}
  ]
}

Include at least 3 variants (base, mid, top), 5+ colors, 15+ specifications across Engine/Performance/Safety/Comfort categories, and 10+ features.
Return ONLY the JSON object, no additional text.`;

  console.log("Calling AI Gateway for car:", carName);
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
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
    throw new Error(`AI Gateway error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response from AI");
  }

  console.log("AI Response received, parsing...");

  // Clean and extract JSON from the response
  let jsonString = content.trim();
  
  // Remove markdown code blocks if present
  if (jsonString.startsWith("```json")) {
    jsonString = jsonString.slice(7);
  } else if (jsonString.startsWith("```")) {
    jsonString = jsonString.slice(3);
  }
  if (jsonString.endsWith("```")) {
    jsonString = jsonString.slice(0, -3);
  }
  jsonString = jsonString.trim();

  // Try to extract JSON object
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Could not extract JSON from:", content.substring(0, 500));
    throw new Error("Could not extract JSON from AI response");
  }

  try {
    const carData = JSON.parse(jsonMatch[0]) as GeneratedCarData;
    
    // Ensure slug is properly formatted
    if (!carData.slug || carData.slug.length < 3) {
      carData.slug = generateSlug(carData.brand, carData.name);
    }
    
    // Validate required fields
    if (!carData.brand || !carData.name) {
      throw new Error("Missing required fields: brand or name");
    }
    
    // Ensure arrays are valid
    carData.fuel_types = carData.fuel_types || ["Petrol"];
    carData.transmission_types = carData.transmission_types || ["Manual"];
    carData.key_highlights = carData.key_highlights || [];
    carData.variants = carData.variants || [];
    carData.colors = carData.colors || [];
    carData.specifications = carData.specifications || [];
    carData.features = carData.features || [];
    
    console.log("Successfully parsed car data for:", carData.name);
    return carData;
  } catch (parseError) {
    console.error("JSON parse error:", parseError, "Content:", jsonMatch[0].substring(0, 500));
    throw new Error(`Failed to parse AI response: ${parseError}`);
  }
}

async function saveCarDataToDatabase(carData: GeneratedCarData, supabase: ReturnType<typeof createClient>) {
  console.log("Saving car to database:", carData.name);
  
  // Check if car with this slug already exists
  const { data: existingCar } = await supabase
    .from("cars")
    .select("id")
    .eq("slug", carData.slug)
    .maybeSingle();
    
  if (existingCar) {
    throw new Error(`Car with slug "${carData.slug}" already exists`);
  }

  // Calculate minimum price from variants
  const minPrice = carData.variants.length > 0 
    ? Math.min(...carData.variants.map(v => v.price_numeric || 0))
    : null;

  // Create car entry
  const { data: car, error: carError } = await supabase
    .from("cars")
    .insert({
      brand: carData.brand,
      name: carData.name,
      slug: carData.slug,
      body_type: carData.body_type || null,
      tagline: carData.tagline || null,
      overview: carData.overview || null,
      fuel_types: carData.fuel_types,
      transmission_types: carData.transmission_types,
      key_highlights: carData.key_highlights,
      price_numeric: minPrice,
      availability: "Available",
      is_new: true,
      is_hot: false,
      is_limited: false,
      is_upcoming: false,
    })
    .select()
    .single();

  if (carError) {
    console.error("Car insert error:", carError);
    throw new Error(`Failed to save car: ${carError.message}`);
  }

  const carId = car.id;
  console.log("Car created with ID:", carId);

  const errors: string[] = [];

  // Save variants with proper error handling
  if (carData.variants.length > 0) {
    const variantsToInsert = carData.variants.map((variant, index) => ({
      car_id: carId,
      name: variant.name,
      price: variant.price || `₹${(variant.price_numeric / 100000).toFixed(2)} Lakh`,
      price_numeric: variant.price_numeric || 0,
      fuel_type: variant.fuel_type || null,
      transmission: variant.transmission || null,
      ex_showroom: variant.ex_showroom || 0,
      rto: variant.rto || 0,
      insurance: variant.insurance || 0,
      registration: variant.registration || 0,
      handling: variant.handling || 0,
      tcs: variant.tcs || 0,
      fastag: variant.fastag || 0,
      on_road_price: (variant.ex_showroom || 0) + (variant.rto || 0) + 
                     (variant.insurance || 0) + (variant.registration || 0) + 
                     (variant.handling || 0) + (variant.tcs || 0) + (variant.fastag || 0),
      features: variant.features || [],
      sort_order: index,
    }));

    const { error: variantError } = await supabase
      .from("car_variants")
      .insert(variantsToInsert);
      
    if (variantError) {
      console.error("Variant insert error:", variantError);
      errors.push(`Variants: ${variantError.message}`);
    } else {
      console.log(`Inserted ${variantsToInsert.length} variants`);
    }
  }

  // Save colors
  if (carData.colors.length > 0) {
    const colorsToInsert = carData.colors.map((color, index) => ({
      car_id: carId,
      name: color.name,
      hex_code: color.hex_code || "#000000",
      sort_order: index,
    }));

    const { error: colorError } = await supabase
      .from("car_colors")
      .insert(colorsToInsert);
      
    if (colorError) {
      console.error("Color insert error:", colorError);
      errors.push(`Colors: ${colorError.message}`);
    } else {
      console.log(`Inserted ${colorsToInsert.length} colors`);
    }
  }

  // Save specifications
  if (carData.specifications.length > 0) {
    const specsToInsert = carData.specifications.map((spec, index) => ({
      car_id: carId,
      category: spec.category || "General",
      label: spec.label,
      value: spec.value,
      sort_order: index,
    }));

    const { error: specError } = await supabase
      .from("car_specifications")
      .insert(specsToInsert);
      
    if (specError) {
      console.error("Specification insert error:", specError);
      errors.push(`Specifications: ${specError.message}`);
    } else {
      console.log(`Inserted ${specsToInsert.length} specifications`);
    }
  }

  // Save features
  if (carData.features.length > 0) {
    const featuresToInsert = carData.features.map((feature, index) => ({
      car_id: carId,
      category: feature.category || "General",
      feature_name: feature.feature_name,
      is_standard: feature.is_standard !== false,
      sort_order: index,
    }));

    const { error: featureError } = await supabase
      .from("car_features")
      .insert(featuresToInsert);
      
    if (featureError) {
      console.error("Feature insert error:", featureError);
      errors.push(`Features: ${featureError.message}`);
    } else {
      console.log(`Inserted ${featuresToInsert.length} features`);
    }
  }

  return { car, errors };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized - No token provided" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { carName, saveToDatabase } = body;

    if (!carName || typeof carName !== "string" || carName.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Valid car name is required (min 2 characters)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing request for: ${carName}, save: ${saveToDatabase}`);
    
    const carData = await generateCarDataWithAI(carName.trim());

    if (saveToDatabase) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Database configuration missing");
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);

      const token = authHeader.substring(7);
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !userData?.user?.id) {
        console.error("Auth error:", authError);
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { car: savedCar, errors } = await saveCarDataToDatabase(carData, supabase);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: carData,
          savedCar,
          warnings: errors.length > 0 ? errors : undefined,
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
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
