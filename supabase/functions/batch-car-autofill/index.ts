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

  // Get sets of car IDs that already have data
  const { data: specCarIds } = await supabase.from("car_specifications").select("car_id");
  const { data: colorCarIds } = await supabase.from("car_colors").select("car_id");
  const { data: featureCarIds } = await supabase.from("car_features").select("car_id");
  const { data: variantCarIds } = await supabase.from("car_variants").select("car_id");

  const hasSpecs = new Set((specCarIds || []).map((s: any) => s.car_id));
  const hasColors = new Set((colorCarIds || []).map((c: any) => c.car_id));
  const hasFeatures = new Set((featureCarIds || []).map((f: any) => f.car_id));
  const hasVariants = new Set((variantCarIds || []).map((v: any) => v.car_id));

  const { data: allCars } = await supabase.from("cars").select("id, name, brand, slug").order("brand");

  let carsToProcess: any[];
  if (car_ids?.length) {
    carsToProcess = (allCars || []).filter((c: any) => car_ids.includes(c.id));
  } else {
    // Cars missing ANY of: specs, colors, or features
    carsToProcess = (allCars || []).filter((c: any) =>
      !hasSpecs.has(c.id) || !hasColors.has(c.id) || !hasFeatures.has(c.id)
    );
  }

  const batch = carsToProcess.slice(skip, skip + limit);

  if (batch.length === 0) {
    return new Response(JSON.stringify({ done: true, message: "All cars are complete!", total_missing: carsToProcess.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  for (const car of batch) {
    const needSpecs = !hasSpecs.has(car.id);
    const needColors = !hasColors.has(car.id);
    const needFeatures = !hasFeatures.has(car.id);

    console.log(`Processing: ${car.brand} ${car.name} | needs: specs=${needSpecs} colors=${needColors} features=${needFeatures}`);

    // Clean model name
    const modelName = car.name
      .replace(new RegExp(`^${car.brand}\\s*`, 'i'), '')
      .replace(/^BMW\s*/i, '').replace(/^Isuzu\s*/i, '').replace(/^Lexus\s*/i, '').replace(/^Land Rover\s*/i, '')
      .trim() || car.name;

    const ai = await callAI(car.brand, modelName, LOVABLE_API_KEY);
    if (!ai) {
      results.push({ car: `${car.brand} ${car.name}`, status: "ai_failed" });
      continue;
    }

    let cCount = 0, sCount = 0, fCount = 0;

    // Delete existing before re-inserting to prevent duplicates
    if (needSpecs) {
      await supabase.from("car_specifications").delete().eq("car_id", car.id);
    }
    if (needColors) {
      await supabase.from("car_colors").delete().eq("car_id", car.id);
    }
    if (needFeatures) {
      await supabase.from("car_features").delete().eq("car_id", car.id);
    }

    // Insert specs
    if (needSpecs && ai.specifications?.length) {
      const specRows = ai.specifications.map((s: any, i: number) => ({
        car_id: car.id, category: s.category || "engine", label: s.label || "", value: s.value || "", sort_order: i + 1,
      }));
      const { error } = await supabase.from("car_specifications").insert(specRows);
      if (!error) sCount = specRows.length;
    }

    // Insert colors
    if (needColors && ai.colors?.length) {
      const colorRows = ai.colors.map((c: any, i: number) => ({
        car_id: car.id, name: c.name || "Unknown", hex_code: c.hex_code || "#000000", sort_order: i + 1,
      }));
      const { error } = await supabase.from("car_colors").insert(colorRows);
      if (!error) cCount = colorRows.length;
    }

    // Insert features
    if (needFeatures) {
      const featureList = ai.features || [];
      if (featureList.length > 0) {
        const featureRows = featureList.map((f: any, i: number) => ({
          car_id: car.id,
          category: f.category || "Comfort",
          feature_name: f.name || f.feature_name || "",
          is_standard: f.is_standard !== false,
          sort_order: i + 1,
        }));
        const { error } = await supabase.from("car_features").insert(featureRows);
        if (!error) fCount = featureRows.length;
      } else if (ai.specifications?.length) {
        // Fallback: extract from specs
        const featureRows = ai.specifications
          .filter((s: any) => s.category !== "dimensions")
          .map((s: any, i: number) => ({
            car_id: car.id,
            category: s.category === "safety" ? "Safety" : s.category === "features" ? "Technology" : s.category === "engine" ? "Engine" : "Comfort",
            feature_name: `${s.label}: ${s.value}`,
            is_standard: true,
            sort_order: i + 1,
          }));
        if (featureRows.length) {
          const { error } = await supabase.from("car_features").insert(featureRows);
          if (!error) fCount = featureRows.length;
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

    if (Object.keys(updateData).length) {
      await supabase.from("cars").update(updateData).eq("id", car.id);
    }

    results.push({ car: `${car.brand} ${car.name}`, colors: cCount, specs: sCount, features: fCount, status: "ok" });
    await new Promise(r => setTimeout(r, 1000));
  }

  return new Response(JSON.stringify({
    done: batch.length < limit,
    processed: results.length,
    remaining: carsToProcess.length - skip - batch.length,
    results,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
