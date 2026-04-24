import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const onlyMissing: boolean = body.onlyMissing !== false; // default true
    const brandFilter: string | null = body.brand || null;

    // Build query — pick cars missing brochure OR specs
    let query = supabase
      .from('cars')
      .select('id, brand, name, slug, brochure_url')
      .order('brand');

    if (brandFilter) query = query.eq('brand', brandFilter);
    if (onlyMissing) query = query.is('brochure_url', null);

    const { data: cars, error } = await query;
    if (error) throw error;

    if (!cars || cars.length === 0) {
      return new Response(JSON.stringify({ success: true, enqueued: 0, message: 'No cars to enqueue' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const batchId = crypto.randomUUID();

    // Clear any old queued jobs for these cars first (avoid dupes)
    await supabase.from('car_scrape_jobs').delete().in('status', ['queued', 'failed']);

    const rows = cars.map(c => ({
      brand: c.brand,
      model_name: c.name,
      car_id: c.id,
      source_url: `https://www.cardekho.com/${(c.brand || '').toLowerCase().replace(/\s+/g, '-')}/${c.slug}`,
      status: 'queued',
      job_batch_id: batchId,
      attempt_count: 0,
    }));

    // Insert in chunks of 100
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error: insErr } = await supabase.from('car_scrape_jobs').insert(chunk);
      if (insErr) {
        console.error('Insert chunk error:', insErr);
      } else {
        inserted += chunk.length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      enqueued: inserted,
      batchId,
      brands: [...new Set(cars.map(c => c.brand))].length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('enqueue error', e);
    return new Response(JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
