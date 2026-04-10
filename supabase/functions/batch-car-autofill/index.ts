import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatPrice(p: number): string {
  if (p >= 10000000) return `₹${(p / 10000000).toFixed(2)} Cr`;
  return `₹${(p / 100000).toFixed(2)} Lakh`;
}

function calcBreakup(ex: number) {
  const rto = Math.round(ex * 0.08);
  const insurance = Math.round(ex * 0.035);
  const tcs = ex > 1000000 ? Math.round(ex * 0.01) : 0;
  const fastag = 500, registration = 1000, handling = 15000;
  return { ex_showroom: ex, rto, insurance, tcs, fastag, registration, handling, on_road_price: ex + rto + insurance + tcs + fastag + registration + handling };
}

async function callAI(brand: string, model: string, apiKey: string): Promise<any> {
  const systemPrompt = `You are an Indian automotive data expert. Return ONLY valid JSON with no markdown.
{
  "body_type": "string",
  "tagline": "string",
  "overview": "string (2-3 sentences)",
  "fuel_types": ["Petrol"],
  "transmission_types": ["Manual"],
  "is_hot": false, "is_new": true, "is_upcoming": false,
  "variants": [{"name":"variant","fuel_type":"Petrol","transmission":"Manual","ex_showroom":750000,"features":"f1, f2"}],
  "colors": [{"name":"White","hex_code":"#FFFFFF"}],
  "specifications": [{"category":"engine","label":"Displacement","value":"1197 cc"}],
  "features": [
    {"category":"Safety","name":"6 Airbags","is_standard":true},
    {"category":"Comfort","name":"Auto AC","is_standard":true},
    {"category":"Technology","name":"9-inch Touchscreen","is_standard":true},
    {"category":"Exterior","name":"LED Headlamps","is_standard":true},
    {"category":"Interior","name":"Leather Seats","is_standard":false}
  ],
  "pros": "pro1\\npro2", "cons": "con1\\ncon2", "key_highlights": "h1\\nh2"
}
Include ALL Indian market variants with accurate 2024-2025 ex-showroom Delhi prices.
Include at least 15-20 features across Safety, Comfort, Technology, Exterior, Interior categories.
Include at least 5-8 colors with accurate hex codes.
Include specs for engine, dimensions, performance, features, safety categories.`;

  const models = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview", "openai/gpt-5-mini"];
  for (const m of models) {
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: m,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate complete car data for ${brand} ${model} for Indian market.` }
          ],
          temperature: 0.3,
        }),
      });
      if (r.status === 429) { await new Promise(r => setTimeout(r, 3000)); continue; }
      if (!r.ok) continue;
      const data = await r.json();
      let content = data.choices?.[0]?.message?.content || "";
      content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      return JSON.parse(content);
    } catch { continue; }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

  const { mode = "fill_gaps", car_ids, skip = 0, limit = 5 } = await req.json();

  // Mode: fill_gaps - find cars missing specs, colors, or features and fill them
  // Mode: fill_features_from_specs - extract features from existing specs (no AI needed)
  
  if (mode === "fill_features_from_specs") {
    // For cars that have specs but no features, extract features from spec data
    const { data: carsWithSpecs } = await supabase
      .from("cars")
      .select("id, name, brand")
      .not("id", "in", `(SELECT DISTINCT car_id FROM car_features)`);
    
    // Get all car IDs that already have features
    const { data: featureCarIds } = await supabase.from("car_features").select("car_id");
    const hasFeatures = new Set((featureCarIds || []).map((f: any) => f.car_id));
    
    const { data: allCars } = await supabase.from("cars").select("id, name, brand");
    const carsNeedingFeatures = (allCars || []).filter((c: any) => !hasFeatures.has(c.id));
    const batch = carsNeedingFeatures.slice(skip, skip + limit);
    
    const results: any[] = [];
    for (const car of batch) {
      // Get existing specs for this car
      const { data: specs } = await supabase
        .from("car_specifications")
        .select("category, label, value")
        .eq("car_id", car.id);
      
      const features: any[] = [];
      let sortOrder = 0;
      
      if (specs && specs.length > 0) {
        for (const spec of specs) {
          let category = "Comfort";
          if (spec.category === "safety") category = "Safety";
          else if (spec.category === "features") category = "Technology";
          else if (spec.category === "engine") category = "Engine";
          else if (spec.category === "dimensions") continue; // skip dimensions as features
          else if (spec.category === "performance") category = "Performance";
          
          features.push({
            car_id: car.id,
            category,
            feature_name: `${spec.label}: ${spec.value}`,
            is_standard: true,
            sort_order: sortOrder++,
          });
        }
      }
      
      if (features.length > 0) {
        const { error } = await supabase.from("car_features").insert(features);
        results.push({ car: car.name, features: features.length, status: error ? "error" : "ok" });
      } else {
        results.push({ car: car.name, features: 0, status: "no_specs" });
      }
    }
    
    return new Response(JSON.stringify({
      done: batch.length < limit,
      processed: results.length,
      remaining: carsNeedingFeatures.length - skip - batch.length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Default mode: fill_gaps - use AI to fill missing specs/colors/features
  const { data: allCars } = await supabase.from("cars").select("id, name, brand, slug");
  const { data: specCarIds } = await supabase.from("car_specifications").select("car_id");
  const { data: colorCarIds } = await supabase.from("car_colors").select("car_id");
  const { data: featureCarIds } = await supabase.from("car_features").select("car_id");
  const { data: variantCarIds } = await supabase.from("car_variants").select("car_id");
  
  const hasSpecs = new Set((specCarIds || []).map((s: any) => s.car_id));
  const hasColors = new Set((colorCarIds || []).map((c: any) => c.car_id));
  const hasFeatures = new Set((featureCarIds || []).map((f: any) => f.car_id));
  const hasVariants = new Set((variantCarIds || []).map((v: any) => v.car_id));

  let carsToProcess: any[];
  if (car_ids?.length) {
    carsToProcess = (allCars || []).filter((c: any) => car_ids.includes(c.id));
  } else {
    // Cars missing ANY of: specs, colors, features, or variants
    carsToProcess = (allCars || []).filter((c: any) => 
      !hasSpecs.has(c.id) || !hasColors.has(c.id) || !hasFeatures.has(c.id) || !hasVariants.has(c.id)
    );
  }

  const batch = carsToProcess.slice(skip, skip + limit);
  
  if (batch.length === 0) {
    return new Response(JSON.stringify({ done: true, message: "All cars are complete!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  for (const car of batch) {
    const needSpecs = !hasSpecs.has(car.id);
    const needColors = !hasColors.has(car.id);
    const needFeatures = !hasFeatures.has(car.id);
    const needVariants = !hasVariants.has(car.id);
    
    console.log(`Processing: ${car.brand} ${car.name} | needs: specs=${needSpecs} colors=${needColors} features=${needFeatures} variants=${needVariants}`);
    
    const modelName = car.name.replace(car.brand, "").replace("BMW ", "").replace("Isuzu ", "").replace("Lexus ", "").replace("Land Rover ", "").trim() || car.name;
    
    const ai = await callAI(car.brand, modelName, LOVABLE_API_KEY);
    if (!ai) {
      results.push({ car: `${car.brand} ${car.name}`, status: "ai_failed" });
      continue;
    }

    let vCount = 0, cCount = 0, sCount = 0, fCount = 0;

    // Insert variants if missing
    if (needVariants) {
      const variants = ai.variants || [];
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const ex = v.ex_showroom || 0;
        if (!ex) continue;
        const bp = calcBreakup(ex);
        let features = v.features || "";
        if (typeof features === "string") features = features.split(",").map((f: string) => f.trim()).filter(Boolean);
        const { error } = await supabase.from("car_variants").insert({
          car_id: car.id, name: v.name || `Variant ${i + 1}`,
          price: formatPrice(ex), price_numeric: ex,
          fuel_type: v.fuel_type || "Petrol", transmission: v.transmission || "Manual",
          features, sort_order: i + 1, ...bp,
        });
        if (!error) vCount++;
      }
    }

    // Insert colors if missing
    if (needColors && ai.colors?.length) {
      for (let i = 0; i < ai.colors.length; i++) {
        const c = ai.colors[i];
        const { error } = await supabase.from("car_colors").insert({
          car_id: car.id, name: c.name || "Unknown", hex_code: c.hex_code || "#000000", sort_order: i + 1,
        });
        if (!error) cCount++;
      }
    }

    // Insert specs if missing
    if (needSpecs && ai.specifications?.length) {
      for (let i = 0; i < ai.specifications.length; i++) {
        const s = ai.specifications[i];
        const { error } = await supabase.from("car_specifications").insert({
          car_id: car.id, category: s.category || "engine", label: s.label || "", value: s.value || "", sort_order: i + 1,
        });
        if (!error) sCount++;
      }
    }

    // Insert features if missing
    if (needFeatures) {
      const featureList = ai.features || [];
      if (featureList.length > 0) {
        for (let i = 0; i < featureList.length; i++) {
          const f = featureList[i];
          const { error } = await supabase.from("car_features").insert({
            car_id: car.id,
            category: f.category || "Comfort",
            feature_name: f.name || f.feature_name || "",
            is_standard: f.is_standard !== false,
            sort_order: i + 1,
          });
          if (!error) fCount++;
        }
      } else {
        // Fallback: extract features from specs we just inserted or AI specs
        const specsToUse = ai.specifications || [];
        for (let i = 0; i < specsToUse.length; i++) {
          const s = specsToUse[i];
          if (s.category === "dimensions") continue;
          let cat = "Comfort";
          if (s.category === "safety") cat = "Safety";
          else if (s.category === "features") cat = "Technology";
          else if (s.category === "engine") cat = "Engine";
          else if (s.category === "performance") cat = "Performance";
          
          const { error } = await supabase.from("car_features").insert({
            car_id: car.id, category: cat,
            feature_name: `${s.label}: ${s.value}`,
            is_standard: true, sort_order: i + 1,
          });
          if (!error) fCount++;
        }
      }
    }

    // Update car metadata
    const updateData: any = {};
    if (ai.overview) updateData.overview = ai.overview;
    if (ai.body_type) updateData.body_type = ai.body_type;
    if (ai.fuel_types) updateData.fuel_types = ai.fuel_types;
    if (ai.transmission_types) updateData.transmission_types = ai.transmission_types;
    if (ai.tagline) updateData.tagline = ai.tagline;
    if (ai.pros) updateData.pros = typeof ai.pros === "string" ? ai.pros.split("\n") : ai.pros;
    if (ai.cons) updateData.cons = typeof ai.cons === "string" ? ai.cons.split("\n") : ai.cons;
    if (ai.key_highlights) updateData.key_highlights = typeof ai.key_highlights === "string" ? ai.key_highlights.split("\n") : ai.key_highlights;

    if (needVariants && ai.variants?.length) {
      const prices = ai.variants.map((v: any) => v.ex_showroom).filter(Boolean);
      if (prices.length) {
        const min = Math.min(...prices), max = Math.max(...prices);
        updateData.price_range = min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`;
        updateData.price_numeric = min;
      }
    }

    if (Object.keys(updateData).length) {
      await supabase.from("cars").update(updateData).eq("id", car.id);
    }

    results.push({ car: `${car.brand} ${car.name}`, variants: vCount, colors: cCount, specs: sCount, features: fCount, status: "ok" });
    await new Promise(r => setTimeout(r, 1500));
  }

  return new Response(JSON.stringify({
    done: false,
    processed: results.length,
    remaining: carsToProcess.length - skip - batch.length,
    results,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
