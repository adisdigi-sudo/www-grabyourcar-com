// Bulk-fill specs/variants/colors using Lovable AI (Gemini 2.5 Flash)
// Cheap + fast. Skips fields that already exist. No Firecrawl.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

const SCHEMA = {
  type: 'object',
  properties: {
    specs: {
      type: 'object',
      description: 'Key technical specs as a flat object. Keys must be one of: mileage, engine_cc, max_power, max_torque, seating_capacity, fuel_tank, boot_space, ground_clearance, length, width, height, wheelbase, kerb_weight, top_speed, acceleration, drivetrain, airbags, ncap_rating',
      additionalProperties: { type: 'string' },
    },
    variants: {
      type: 'array',
      description: 'List of trim variants for this car model in India',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Variant trim name e.g. LXi, VXi, ZXi+' },
          fuel_type: { type: 'string', description: 'Petrol, Diesel, CNG, Electric, Hybrid' },
          transmission: { type: 'string', description: 'Manual, AMT, CVT, DCT, Automatic' },
          ex_showroom_price: { type: 'number', description: 'Ex-showroom price in INR (numeric, no commas)' },
        },
        required: ['name'],
      },
    },
    colors: {
      type: 'array',
      description: 'Available exterior colors',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Color name as marketed e.g. Pearl Arctic White' },
          hex: { type: 'string', description: '6-digit hex code with # prefix' },
        },
        required: ['name'],
      },
    },
  },
  required: ['specs', 'variants', 'colors'],
};

async function askGemini(brand: string, model: string, missing: { specs: boolean; variants: boolean; colors: boolean }, apiKey: string) {
  const need: string[] = [];
  if (missing.specs) need.push('specs (technical specifications)');
  if (missing.variants) need.push('variants (trim levels with prices, fuel type, transmission)');
  if (missing.colors) need.push('colors (exterior colors with hex codes)');

  const prompt = `You are an Indian automotive database expert. Provide accurate factual data for the car: "${brand} ${model}" sold in India (2024-2025 model year).

Need: ${need.join(', ')}.

Rules:
- Use real, official data only. If you don't know a value, omit that key entirely.
- Prices in INR (numeric, no commas, ex-showroom Delhi).
- Specs values as concise strings with units (e.g. mileage "20.5 kmpl", max_power "120 bhp @ 6000 rpm").
- Hex colors must include the # prefix.
- Return ONLY the structured JSON.`;

  const resp = await fetch(AI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a precise automotive database. Output only valid JSON matching the provided schema.' },
        { role: 'user', content: prompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'submit_car_data',
            description: 'Submit the structured car data',
            parameters: SCHEMA,
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'submit_car_data' } },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI ${resp.status}: ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error('No tool_call in AI response');
  return JSON.parse(toolCall.function.arguments);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY missing');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const batchSize: number = Math.min(body.batchSize ?? 8, 15);
    const targetBrand: string | null = body.brand ?? null;

    // Find cars missing at least one of: specs / variants / colors
    let q = supabase
      .from('cars')
      .select('id, brand, name')
      .order('brand');
    if (targetBrand) q = q.eq('brand', targetBrand);

    const { data: allCars, error: carsErr } = await q;
    if (carsErr) throw carsErr;
    if (!allCars?.length) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'No cars' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Compute which cars need work
    const carIds = allCars.map(c => c.id);
    const [specsRes, variantsRes, colorsRes] = await Promise.all([
      supabase.from('car_specifications').select('car_id').in('car_id', carIds),
      supabase.from('car_variants').select('car_id').in('car_id', carIds),
      supabase.from('car_colors').select('car_id').in('car_id', carIds),
    ]);
    const hasSpecs = new Set((specsRes.data || []).map(r => r.car_id));
    const hasVariants = new Set((variantsRes.data || []).map(r => r.car_id));
    const hasColors = new Set((colorsRes.data || []).map(r => r.car_id));

    const todo = allCars
      .map(c => ({
        ...c,
        missing: {
          specs: !hasSpecs.has(c.id),
          variants: !hasVariants.has(c.id),
          colors: !hasColors.has(c.id),
        },
      }))
      .filter(c => c.missing.specs || c.missing.variants || c.missing.colors)
      .slice(0, batchSize);

    if (!todo.length) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'All filled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results = await Promise.allSettled(todo.map(async (car) => {
      try {
        const ai = await askGemini(car.brand, car.name, car.missing, apiKey);
        let specsCount = 0, variantsCount = 0, colorsCount = 0;

        // Insert specs
        if (car.missing.specs && ai.specs && typeof ai.specs === 'object') {
          const rows = Object.entries(ai.specs)
            .filter(([_, v]) => v != null && String(v).trim() !== '')
            .map(([key, value], i) => ({
              car_id: car.id,
              category: 'general',
              label: key,
              value: String(value),
              sort_order: i,
            }));
          if (rows.length) {
            await supabase.from('car_specifications').insert(rows);
            specsCount = rows.length;
          }
        }

        // Insert variants
        if (car.missing.variants && Array.isArray(ai.variants) && ai.variants.length) {
          const rows = ai.variants
            .filter((v: any) => v?.name)
            .map((v: any, i: number) => ({
              car_id: car.id,
              name: String(v.name).slice(0, 100),
              fuel_type: v.fuel_type ? String(v.fuel_type).slice(0, 30) : null,
              transmission: v.transmission ? String(v.transmission).slice(0, 30) : null,
              price_numeric: typeof v.ex_showroom_price === 'number' ? Math.round(v.ex_showroom_price) : null,
              ex_showroom: typeof v.ex_showroom_price === 'number' ? Math.round(v.ex_showroom_price) : null,
              sort_order: i,
            }));
          if (rows.length) {
            await supabase.from('car_variants').insert(rows);
            variantsCount = rows.length;
          }
        }

        // Insert colors
        if (car.missing.colors && Array.isArray(ai.colors) && ai.colors.length) {
          const rows = ai.colors
            .filter((c: any) => c?.name)
            .map((c: any, i: number) => ({
              car_id: car.id,
              name: String(c.name).slice(0, 80),
              hex_code: c.hex && /^#[0-9A-Fa-f]{6}$/.test(c.hex) ? c.hex : null,
              sort_order: i,
              image_source: 'gemini',
            }));
          if (rows.length) {
            await supabase.from('car_colors').insert(rows);
            colorsCount = rows.length;
          }
        }

        return { id: car.id, brand: car.brand, name: car.name, ok: true, specsCount, variantsCount, colorsCount };
      } catch (e) {
        return { id: car.id, brand: car.brand, name: car.name, ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }));

    const summary = results.map(r => r.status === 'fulfilled' ? r.value : { ok: false, error: 'rejected' });
    const successes = summary.filter((s: any) => s.ok).length;

    return new Response(JSON.stringify({
      success: true,
      processed: todo.length,
      successes,
      failures: todo.length - successes,
      remaining_total: allCars.length,
      details: summary,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('gemini-car-bulk-fill error', e);
    return new Response(JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
