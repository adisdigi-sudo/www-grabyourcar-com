// CarDekho deep scraper — Firecrawl + Lovable AI structured extraction
// Scrapes a single car model page, extracts variants/colors/specs/brochure
// and upserts everything into the cars/car_variants/car_colors/car_brochures/car_specifications tables.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIRECRAWL_URL = 'https://api.firecrawl.dev/v2/scrape';
const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface ScrapeReq {
  jobId?: string;          // existing car_scrape_jobs row to update
  brand: string;           // e.g. "Maruti Suzuki"
  modelName: string;       // e.g. "Swift"
  cardekhoUrl: string;     // e.g. https://www.cardekho.com/cars/Maruti_Suzuki/Swift
  carId?: string;          // existing cars.id to update (else will be matched by slug)
}

const EXTRACT_TOOL = {
  type: 'function',
  function: {
    name: 'extract_car_data',
    description: 'Extract structured data for one car model from CarDekho page content',
    parameters: {
      type: 'object',
      properties: {
        body_type: { type: 'string', description: 'Hatchback | Sedan | SUV | MPV | Coupe | Convertible' },
        tagline: { type: 'string' },
        overview: { type: 'string', description: '2-3 sentence overview of the car' },
        ex_showroom_delhi: { type: 'number', description: 'Lowest ex-showroom price in Delhi in INR (full number, not lakhs)' },
        price_range: { type: 'string', description: 'e.g. "₹ 6.49 - 9.65 Lakh"' },
        brochure_url: { type: 'string', description: 'Direct PDF URL of the official brochure if found, else empty' },
        fuel_types: { type: 'array', items: { type: 'string' } },
        transmission_types: { type: 'array', items: { type: 'string' } },
        key_highlights: { type: 'array', items: { type: 'string' }, description: 'Top 6-10 marketing highlights' },
        pros: { type: 'array', items: { type: 'string' } },
        cons: { type: 'array', items: { type: 'string' } },
        variants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price_numeric: { type: 'number', description: 'Ex-showroom price in INR (full number)' },
              fuel_type: { type: 'string' },
              transmission: { type: 'string' },
              features: { type: 'array', items: { type: 'string' } },
            },
            required: ['name', 'price_numeric', 'fuel_type', 'transmission'],
            additionalProperties: false,
          },
        },
        colors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              hex_code: { type: 'string', description: 'Best-guess HEX code like #FF0000' },
            },
            required: ['name', 'hex_code'],
            additionalProperties: false,
          },
        },
        specifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Engine | Performance | Dimensions | Safety | Comfort | Fuel | Wheels' },
              label: { type: 'string' },
              value: { type: 'string' },
            },
            required: ['category', 'label', 'value'],
            additionalProperties: false,
          },
        },
        image_urls: { type: 'array', items: { type: 'string' }, description: 'Up to 8 hero/exterior/interior image URLs' },
      },
      required: ['body_type', 'ex_showroom_delhi', 'fuel_types', 'transmission_types', 'variants', 'colors', 'specifications'],
      additionalProperties: false,
    },
  },
};

function slugify(brand: string, model: string): string {
  return `${brand} ${model}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey);

  let jobId: string | undefined;

  try {
    if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured');
    if (!lovableKey) throw new Error('LOVABLE_API_KEY not configured');

    const body = (await req.json()) as ScrapeReq;
    if (!body.brand || !body.modelName || !body.cardekhoUrl) {
      return new Response(JSON.stringify({ success: false, error: 'brand, modelName, cardekhoUrl required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    jobId = body.jobId;

    // Create or update job row
    if (!jobId) {
      const { data: jr, error: je } = await supabase.from('car_scrape_jobs').insert({
        brand: body.brand, model_name: body.modelName, car_id: body.carId ?? null,
        source_url: body.cardekhoUrl, status: 'running', started_at: new Date().toISOString(),
      }).select('id').single();
      if (je) throw je;
      jobId = jr.id;
    } else {
      await supabase.from('car_scrape_jobs').update({
        status: 'running', started_at: new Date().toISOString(), error_message: null,
      }).eq('id', jobId);
    }

    console.log(`[${jobId}] Scraping ${body.brand} ${body.modelName} from ${body.cardekhoUrl}`);

    // 1) Firecrawl scrape — markdown + links
    const fcResp = await fetch(FIRECRAWL_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: body.cardekhoUrl,
        formats: ['markdown', 'links'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!fcResp.ok) {
      const errText = await fcResp.text();
      throw new Error(`Firecrawl ${fcResp.status}: ${errText.slice(0, 300)}`);
    }
    const fcJson = await fcResp.json();
    // v2 returns either {data: {...}} or {markdown, links} — normalize
    const root = fcJson.data ?? fcJson;
    const markdown: string = root.markdown ?? '';
    const links: string[] = (root.links ?? []) as string[];

    if (!markdown || markdown.length < 500) {
      throw new Error(`Firecrawl returned thin content (${markdown.length} chars)`);
    }
    console.log(`[${jobId}] Firecrawl OK: ${markdown.length} chars, ${links.length} links`);

    // Find brochure pdf in links
    const brochureFromLinks = links.find((l) => /\.pdf(\?|$)/i.test(l) && /brochure/i.test(l))
      ?? links.find((l) => /\.pdf(\?|$)/i.test(l));

    // 2) Lovable AI extraction
    const aiResp = await fetch(AI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You extract structured car data from CarDekho page content. Return ONLY valid data via the tool call. For ex_showroom_delhi return the full INR number, e.g. 649000 for ₹6.49 Lakh. Always include hex codes for colors (best guess based on color name). Include 4-12 variants if available.',
          },
          {
            role: 'user',
            content: `Brand: ${body.brand}\nModel: ${body.modelName}\nSource URL: ${body.cardekhoUrl}\n\nPage content (first 25000 chars):\n${markdown.slice(0, 25000)}\n\nAlso brochure candidate URL from links: ${brochureFromLinks ?? 'NONE'}`,
          },
        ],
        tools: [EXTRACT_TOOL],
        tool_choice: { type: 'function', function: { name: 'extract_car_data' } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) throw new Error('AI rate-limited (429). Retry in a minute.');
      if (aiResp.status === 402) throw new Error('AI credits exhausted (402). Add credits.');
      throw new Error(`AI gateway ${aiResp.status}: ${(await aiResp.text()).slice(0, 200)}`);
    }
    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('AI did not return a tool call');

    const extracted = JSON.parse(toolCall.function.arguments);
    console.log(`[${jobId}] Extracted: ${extracted.variants?.length ?? 0} variants, ${extracted.colors?.length ?? 0} colors, ${extracted.specifications?.length ?? 0} specs`);

    // 3) Upsert car
    const slug = slugify(body.brand, body.modelName);
    let carId = body.carId;
    if (!carId) {
      const { data: existing } = await supabase.from('cars').select('id').eq('slug', slug).maybeSingle();
      carId = existing?.id;
    }

    const carPayload: Record<string, unknown> = {
      slug,
      name: body.modelName,
      brand: body.brand,
      body_type: extracted.body_type,
      tagline: extracted.tagline ?? null,
      overview: extracted.overview ?? null,
      price_range: extracted.price_range ?? null,
      price_numeric: extracted.ex_showroom_delhi ?? null,
      fuel_types: extracted.fuel_types ?? [],
      transmission_types: extracted.transmission_types ?? [],
      key_highlights: extracted.key_highlights ?? [],
      pros: extracted.pros ?? [],
      cons: extracted.cons ?? [],
      official_url: body.cardekhoUrl,
      brochure_url: extracted.brochure_url || brochureFromLinks || null,
      data_freshness_score: 95,
      last_verified_at: new Date().toISOString(),
    };

    if (carId) {
      await supabase.from('cars').update(carPayload).eq('id', carId);
    } else {
      const { data: newCar, error: ce } = await supabase.from('cars').insert(carPayload).select('id').single();
      if (ce) throw ce;
      carId = newCar.id;
    }

    // 4) Variants — replace
    await supabase.from('car_variants').delete().eq('car_id', carId);
    if (extracted.variants?.length) {
      const variantRows = extracted.variants.map((v: Record<string, unknown>, i: number) => ({
        car_id: carId,
        name: v.name,
        price: `₹ ${((v.price_numeric as number) / 100000).toFixed(2)} Lakh`,
        price_numeric: v.price_numeric,
        ex_showroom: v.price_numeric,
        fuel_type: v.fuel_type,
        transmission: v.transmission,
        features: v.features ?? [],
        sort_order: i,
      }));
      await supabase.from('car_variants').insert(variantRows);
    }

    // 5) Colors — replace
    await supabase.from('car_colors').delete().eq('car_id', carId);
    if (extracted.colors?.length) {
      const colorRows = extracted.colors.map((c: Record<string, unknown>, i: number) => ({
        car_id: carId,
        name: c.name,
        hex_code: c.hex_code,
        sort_order: i,
      }));
      await supabase.from('car_colors').insert(colorRows);
    }

    // 6) Specifications — replace
    await supabase.from('car_specifications').delete().eq('car_id', carId);
    if (extracted.specifications?.length) {
      const specRows = extracted.specifications.map((s: Record<string, unknown>, i: number) => ({
        car_id: carId, category: s.category, label: s.label, value: s.value, sort_order: i,
      }));
      await supabase.from('car_specifications').insert(specRows);
    }

    // 7) Brochure — only insert if we have a URL and none exists
    const brochureUrl = extracted.brochure_url || brochureFromLinks;
    let brochureFound = false;
    if (brochureUrl) {
      const { data: existingBro } = await supabase
        .from('car_brochures').select('id').eq('car_id', carId).eq('url', brochureUrl).maybeSingle();
      if (!existingBro) {
        await supabase.from('car_brochures').insert({
          car_id: carId,
          title: `${body.brand} ${body.modelName} Brochure`,
          url: brochureUrl,
          language: 'English',
          sort_order: 0,
        });
      }
      brochureFound = true;
    }

    // 8) Update job row
    await supabase.from('car_scrape_jobs').update({
      status: 'done',
      car_id: carId,
      variants_found: extracted.variants?.length ?? 0,
      colors_found: extracted.colors?.length ?? 0,
      specs_found: extracted.specifications?.length ?? 0,
      brochure_found: brochureFound,
      ex_showroom_delhi: extracted.ex_showroom_delhi ?? null,
      firecrawl_credits_used: 1,
      raw_data: extracted,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    return new Response(JSON.stringify({
      success: true,
      jobId,
      carId,
      summary: {
        variants: extracted.variants?.length ?? 0,
        colors: extracted.colors?.length ?? 0,
        specs: extracted.specifications?.length ?? 0,
        brochure: brochureFound,
        ex_showroom_delhi: extracted.ex_showroom_delhi,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[${jobId}] Scrape failed:`, msg);
    if (jobId) {
      await supabase.from('car_scrape_jobs').update({
        status: 'failed', error_message: msg, completed_at: new Date().toISOString(),
      }).eq('id', jobId);
    }
    return new Response(JSON.stringify({ success: false, error: msg, jobId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
