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
  "pros": "pro1\\npro2", "cons": "con1\\ncon2", "key_highlights": "h1\\nh2"
}
Include ALL Indian market variants with accurate 2024-2025 ex-showroom Delhi prices.`;

  const models = ["google/gemini-3-flash-preview", "google/gemini-2.5-flash", "openai/gpt-5-mini"];
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

  const { car_ids, skip = 0, limit = 5 } = await req.json();

  // Get cars without variants (or specific car_ids)
  let query = supabase.from("cars").select("id, name, brand, slug");
  if (car_ids?.length) {
    query = query.in("id", car_ids);
  } else {
    // Get cars with no variants
    const { data: allCars } = await supabase.from("cars").select("id, name, brand, slug");
    const { data: variantCarIds } = await supabase.from("car_variants").select("car_id");
    const hasVariants = new Set((variantCarIds || []).map((v: any) => v.car_id));
    const missing = (allCars || []).filter((c: any) => !hasVariants.has(c.id));
    const batch = missing.slice(skip, skip + limit);
    
    if (batch.length === 0) {
      return new Response(JSON.stringify({ done: true, message: "No more cars to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    for (const car of batch) {
      console.log(`Processing: ${car.brand} ${car.name}`);
      const modelName = car.name.replace(car.brand, "").replace("BMW ", "").replace("Isuzu ", "").replace("Lexus ", "").replace("Land Rover ", "").trim() || car.name;
      
      const ai = await callAI(car.brand, modelName, LOVABLE_API_KEY);
      if (!ai) {
        results.push({ car: car.name, status: "ai_failed" });
        continue;
      }

      // Insert variants
      let vCount = 0;
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

      // Insert colors (check if already exist)
      let cCount = 0;
      const { count: existingColors } = await supabase.from("car_colors").select("id", { count: "exact" }).eq("car_id", car.id);
      if (!existingColors || existingColors === 0) {
        for (let i = 0; i < (ai.colors || []).length; i++) {
          const c = ai.colors[i];
          const { error } = await supabase.from("car_colors").insert({
            car_id: car.id, name: c.name || "Unknown", hex_code: c.hex_code || "#000000", sort_order: i + 1,
          });
          if (!error) cCount++;
        }
      }

      // Insert specs (check if already exist)
      let sCount = 0;
      const { count: existingSpecs } = await supabase.from("car_specifications").select("id", { count: "exact" }).eq("car_id", car.id);
      if (!existingSpecs || existingSpecs === 0) {
        for (let i = 0; i < (ai.specifications || []).length; i++) {
          const s = ai.specifications[i];
          const { error } = await supabase.from("car_specifications").insert({
            car_id: car.id, category: s.category || "engine", label: s.label || "", value: s.value || "", sort_order: i + 1,
          });
          if (!error) sCount++;
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

      if (variants.length > 0) {
        const prices = variants.map((v: any) => v.ex_showroom).filter(Boolean);
        if (prices.length) {
          const min = Math.min(...prices), max = Math.max(...prices);
          updateData.price_range = min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`;
          updateData.price_numeric = min;
        }
      }

      if (Object.keys(updateData).length) {
        await supabase.from("cars").update(updateData).eq("id", car.id);
      }

      results.push({ car: `${car.brand} ${car.name}`, variants: vCount, colors: cCount, specs: sCount, status: "ok" });
      
      // Small delay between AI calls
      await new Promise(r => setTimeout(r, 1500));
    }

    return new Response(JSON.stringify({ 
      done: false, 
      processed: results.length, 
      remaining: missing.length - skip - batch.length,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Invalid request" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
