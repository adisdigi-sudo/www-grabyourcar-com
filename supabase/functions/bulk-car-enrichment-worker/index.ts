import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIRECRAWL_URL = 'https://api.firecrawl.dev/v1/scrape';

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    brochure_pdf_url: { type: 'string', description: 'Direct PDF URL of the brochure' },
    available_colors: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, hex: { type: 'string' } },
      },
    },
    variants: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          fuel: { type: 'string' },
          transmission: { type: 'string' },
        },
      },
    },
    specs: {
      type: 'object',
      properties: {
        mileage: { type: 'string' },
        power: { type: 'string' },
        torque: { type: 'string' },
        seating: { type: 'string' },
        engine_cc: { type: 'string' },
      },
    },
  },
};

async function scrapeCar(url: string, apiKey: string) {
  const resp = await fetch(FIRECRAWL_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      formats: [
        'markdown',
        { type: 'json', schema: EXTRACTION_SCHEMA },
      ],
      onlyMainContent: true,
      waitFor: 2000,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `Firecrawl ${resp.status}`);
  return data.data || data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const batchSize: number = Math.min(body.batchSize || 5, 10);

    // Pick queued jobs
    const { data: jobs, error: pickErr } = await supabase
      .from('car_scrape_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (pickErr) throw pickErr;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'Queue empty' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mark them running
    const jobIds = jobs.map(j => j.id);
    await supabase.from('car_scrape_jobs')
      .update({ status: 'running', started_at: new Date().toISOString(), last_attempt_at: new Date().toISOString() })
      .in('id', jobIds);

    const results = await Promise.allSettled(jobs.map(async (job) => {
      try {
        const scraped = await scrapeCar(job.source_url, apiKey);
        const json = scraped.json || scraped.extract || {};
        const brochureUrl = json.brochure_pdf_url || null;
        const colors = json.available_colors || [];
        const variants = json.variants || [];
        const specs = json.specs || {};

        // Update car row — preserve existing brochure if no new one found
        const carUpdate: Record<string, unknown> = {
          last_verified_at: new Date().toISOString(),
        };
        if (brochureUrl) carUpdate.brochure_url = brochureUrl;

        if (job.car_id && Object.keys(carUpdate).length > 0) {
          await supabase.from('cars').update(carUpdate).eq('id', job.car_id);
        }

        // Mark job done
        await supabase.from('car_scrape_jobs').update({
          status: 'done',
          completed_at: new Date().toISOString(),
          brochure_found: !!brochureUrl,
          colors_found: colors.length,
          variants_found: variants.length,
          specs_found: Object.keys(specs).length,
          firecrawl_credits_used: 1,
          raw_data: { json, scraped_at: new Date().toISOString() },
        }).eq('id', job.id);

        return { id: job.id, ok: true, brochure: !!brochureUrl };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabase.from('car_scrape_jobs').update({
          status: 'failed',
          error_message: msg,
          completed_at: new Date().toISOString(),
          attempt_count: (job.attempt_count || 0) + 1,
        }).eq('id', job.id);
        return { id: job.id, ok: false, error: msg };
      }
    }));

    const successes = results.filter(r => r.status === 'fulfilled' && (r as any).value.ok).length;
    const failures = results.length - successes;

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      successes,
      failures,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('worker error', e);
    return new Response(JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
