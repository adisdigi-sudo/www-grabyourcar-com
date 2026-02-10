import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  carId: string;
  carName: string;
  brand: string;
  issues: string[];
  severity: 'critical' | 'warning' | 'info';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing config');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action } = await req.json().catch(() => ({ action: 'full-audit' }));

    // 1. Cars with 0 variants
    const { data: noVariants } = await supabase
      .from('cars')
      .select('id, name, brand, slug')
      .or('is_discontinued.is.null,is_discontinued.eq.false');

    const { data: variantCounts } = await supabase
      .from('car_variants')
      .select('car_id');

    const variantCarIds = new Set((variantCounts || []).map((v: any) => v.car_id));
    const carsNoVariants = (noVariants || []).filter((c: any) => !variantCarIds.has(c.id));

    // 2. Variants with missing pricing
    const { data: badVariants } = await supabase
      .from('car_variants')
      .select('id, name, car_id, price_numeric, on_road_price')
      .or('on_road_price.is.null,on_road_price.eq.0,price_numeric.is.null,price_numeric.eq.0');

    // 3. Cars with 0 images
    const { data: imageCounts } = await supabase
      .from('car_images')
      .select('car_id');

    const imageCarIds = new Set((imageCounts || []).map((i: any) => i.car_id));
    const carsNoImages = (noVariants || []).filter((c: any) => !imageCarIds.has(c.id));

    // 4. Cars with 0 colors
    const { data: colorCounts } = await supabase
      .from('car_colors')
      .select('car_id');

    const colorCarIds = new Set((colorCounts || []).map((c: any) => c.car_id));
    const carsNoColors = (noVariants || []).filter((c: any) => !colorCarIds.has(c.id));

    // 5. Duplicate slugs
    const { data: allCars } = await supabase.from('cars').select('slug');
    const slugCounts: Record<string, number> = {};
    (allCars || []).forEach((c: any) => { slugCounts[c.slug] = (slugCounts[c.slug] || 0) + 1; });
    const duplicateSlugs = Object.entries(slugCounts).filter(([_, count]) => count > 1);

    // 6. Cars with no pricing
    const { data: noPricing } = await supabase
      .from('cars')
      .select('id, name, brand')
      .or('price_numeric.is.null,price_numeric.eq.0')
      .or('is_discontinued.is.null,is_discontinued.eq.false');

    const results: ValidationResult[] = [];

    carsNoVariants.forEach((c: any) => results.push({
      carId: c.id, carName: c.name, brand: c.brand,
      issues: ['No variants defined'], severity: 'critical'
    }));

    carsNoImages.forEach((c: any) => results.push({
      carId: c.id, carName: c.name, brand: c.brand,
      issues: ['No images in car_images table'], severity: 'critical'
    }));

    carsNoColors.forEach((c: any) => results.push({
      carId: c.id, carName: c.name, brand: c.brand,
      issues: ['No color options defined'], severity: 'warning'
    }));

    (noPricing || []).forEach((c: any) => results.push({
      carId: c.id, carName: c.name, brand: c.brand,
      issues: ['Missing base pricing (price_numeric)'], severity: 'critical'
    }));

    const summary = {
      totalActiveCars: (noVariants || []).length,
      carsWithVariants: variantCarIds.size,
      carsWithoutVariants: carsNoVariants.length,
      carsWithoutImages: carsNoImages.length,
      carsWithoutColors: carsNoColors.length,
      variantsMissingPricing: (badVariants || []).length,
      duplicateSlugs: duplicateSlugs.length,
      carsMissingBasePricing: (noPricing || []).length,
      totalIssues: results.length,
      criticalIssues: results.filter(r => r.severity === 'critical').length,
      warnings: results.filter(r => r.severity === 'warning').length,
      launchReady: results.filter(r => r.severity === 'critical').length === 0,
    };

    return new Response(JSON.stringify({ success: true, summary, results: results.slice(0, 50) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
