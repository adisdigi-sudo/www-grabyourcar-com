// Smart-merge endpoint: ingests a CarDekho-normalized cars array and upserts
// into public.cars + public.car_images WITHOUT touching brochures/specs/colors/variants.
// This preserves existing 174 brochures + 127 specs while refreshing prices,
// fuel/transmission options, and adding new models.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CarIn {
  slug: string;
  name: string;
  brand: string;
  body_type: string;
  price_range: string | null;
  price_numeric: number | null;
  fuel_types: string[];
  transmission_types: string[];
  engine_displacement?: string | null;
  images: string[];
  cardekho_url: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const cars: CarIn[] = body.cars ?? [];
    if (!Array.isArray(cars) || cars.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'cars array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stats = {
      total: cars.length,
      inserted: 0,
      updated: 0,
      images_inserted: 0,
      specs_added: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process in parallel batches of 10
    const BATCH = 10;
    for (let i = 0; i < cars.length; i += BATCH) {
      const slice = cars.slice(i, i + BATCH);
      await Promise.all(
        slice.map(async (c) => {
          try {
            // Check existing
            const { data: existing } = await supabase
              .from('cars')
              .select('id, brochure_url')
              .eq('slug', c.slug)
              .maybeSingle();

            const overview = `${c.brand} ${c.name} - On-road price ${c.price_range || 'TBA'}. Source: CarDekho.`;
            const carRow = {
              slug: c.slug,
              name: c.name,
              brand: c.brand,
              body_type: c.body_type,
              price_range: c.price_range || 'Price on Request',
              price_numeric: c.price_numeric ?? null,
              fuel_types: c.fuel_types,
              transmission_types: c.transmission_types,
              official_url: c.cardekho_url,
              availability: 'available',
              overview,
              last_verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            let carId: string;
            if (existing) {
              const { error } = await supabase.from('cars').update(carRow).eq('id', existing.id);
              if (error) throw error;
              carId = existing.id;
              stats.updated++;
            } else {
              const { data: ins, error } = await supabase
                .from('cars')
                .insert({
                  ...carRow,
                  is_new: false,
                  is_hot: false,
                  is_limited: false,
                  is_upcoming: false,
                  key_highlights: [],
                  pros: [],
                  cons: [],
                  competitors: [],
                })
                .select('id')
                .single();
              if (error) throw error;
              carId = ins.id;
              stats.inserted++;
            }

            // Images: only update if we have new images
            if (c.images && c.images.length > 0) {
              await supabase.from('car_images').delete().eq('car_id', carId);
              const rows = c.images.map((url, idx) => ({
                car_id: carId,
                url,
                is_primary: idx === 0,
                alt_text: `${c.name} image ${idx + 1}`,
                sort_order: idx,
              }));
              const { error: imgErr } = await supabase.from('car_images').insert(rows);
              if (!imgErr) stats.images_inserted += rows.length;
            }

            // Engine spec: add if we have it AND no existing engine spec
            if (c.engine_displacement) {
              const { data: existSpec } = await supabase
                .from('car_specifications')
                .select('id')
                .eq('car_id', carId)
                .eq('category', 'engine')
                .eq('label', 'Engine Displacement')
                .maybeSingle();
              if (!existSpec) {
                await supabase.from('car_specifications').insert({
                  car_id: carId,
                  category: 'engine',
                  label: 'Engine Displacement',
                  value: c.engine_displacement,
                  sort_order: 0,
                });
                stats.specs_added++;
              }
            }
          } catch (e) {
            stats.failed++;
            stats.errors.push(`${c.slug}: ${e instanceof Error ? e.message : String(e)}`);
          }
        })
      );
    }

    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
