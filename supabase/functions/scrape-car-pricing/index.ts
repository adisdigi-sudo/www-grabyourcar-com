import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

// OEM pricing page patterns
const OEM_PRICING_URLS: Record<string, (model: string) => string[]> = {
  'maruti suzuki': (m) => [`https://www.marutisuzuki.com/${m}/price`, `https://www.marutisuzuki.com/${m}/on-road-price`],
  'hyundai': (m) => [`https://www.hyundai.com/in/en/find-a-car/${m}/price`, `https://www.hyundai.com/in/en/${m}/price`],
  'tata': (m) => [`https://cars.tatamotors.com/${m}/price`, `https://cars.tatamotors.com/${m}/on-road-price`],
  'mahindra': (m) => [`https://www.mahindra.com/${m}/price`, `https://www.mahindra.com/suv/${m}/price`],
  'honda': (m) => [`https://www.hondacarindia.com/${m}/price`, `https://www.hondacarindia.com/honda-${m}/price`],
  'toyota': (m) => [`https://www.toyotabharat.com/${m}/price`, `https://www.toyotabharat.com/toyota-${m}/price`],
  'kia': (m) => [`https://www.kia.com/in/${m}/price`, `https://www.kia.com/in/kia-${m}/price`],
  'mg': (m) => [`https://www.mgmotor.co.in/${m}/price`, `https://www.mgmotor.co.in/mg-${m}/price`],
  'skoda': (m) => [`https://www.skoda-auto.co.in/${m}/price`, `https://www.skoda-auto.co.in/models/${m}`],
  'volkswagen': (m) => [`https://www.volkswagen.co.in/${m}/price`, `https://www.volkswagen.co.in/en/models/${m}.html`],
  'renault': (m) => [`https://www.renault.co.in/${m}/price`, `https://www.renault.co.in/cars/${m}.html`],
  'nissan': (m) => [`https://www.nissan.in/${m}/price`, `https://www.nissan.in/vehicles/${m}.html`],
  'citroen': (m) => [`https://www.citroen.in/${m}/price`, `https://www.citroen.in/models/${m}`],
};

interface PricingData {
  variantName: string;
  exShowroom: number;
  onRoadPrice?: number;
  fuelType?: string;
  transmission?: string;
}

// Scrape pricing from official OEM website
async function scrapePricingOEM(brand: string, model: string): Promise<PricingData[]> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) return [];

  const brandKey = brand.toLowerCase();
  const modelSlug = model.toLowerCase().replace(/\s+/g, '-');
  
  const urlGenerator = OEM_PRICING_URLS[brandKey] || OEM_PRICING_URLS[brand.toLowerCase().split(' ')[0]];
  const urls = urlGenerator ? urlGenerator(modelSlug) : [`https://www.${brand.toLowerCase().replace(/\s+/g, '')}.com/${modelSlug}/price`];

  for (const url of urls) {
    try {
      console.log(`Scraping OEM pricing: ${url}`);
      const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, formats: ['markdown', 'html'], onlyMainContent: true, waitFor: 3000 }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const markdown = data.data?.markdown || '';
      const html = data.data?.html || '';
      const content = markdown + ' ' + html;
      const pricingData: PricingData[] = [];

      // Extract variant rows from HTML tables
      const variantRowPattern = /<tr[^>]*>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>[^<]*₹\s*([\d,\.]+)\s*(Lakh|Cr)[^<]*<\/td>.*?<\/tr>/gis;
      let match;
      while ((match = variantRowPattern.exec(html)) !== null) {
        const variantName = match[1].trim();
        const priceValue = parseFloat(match[2].replace(/,/g, ''));
        const unit = match[3].toLowerCase();
        if (variantName && priceValue > 0) {
          pricingData.push({ variantName, exShowroom: Math.round((unit === 'cr' ? priceValue * 100 : priceValue) * 100000) });
        }
      }

      // Try markdown format
      const markdownPricePattern = /\*\*([^*]+)\*\*[^\d]*₹\s*([\d,\.]+)\s*(Lakh|Cr)/gi;
      while ((match = markdownPricePattern.exec(markdown)) !== null) {
        const variantName = match[1].trim();
        const priceValue = parseFloat(match[2].replace(/,/g, ''));
        const unit = match[3].toLowerCase();
        if (variantName && priceValue > 0 && !pricingData.some(p => p.variantName === variantName)) {
          pricingData.push({ variantName, exShowroom: Math.round((unit === 'cr' ? priceValue * 100 : priceValue) * 100000) });
        }
      }

      // Fallback: simple price extraction
      if (pricingData.length === 0) {
        const simplePricePattern = /₹\s*([\d,\.]+)\s*(Lakh|Cr)/gi;
        const prices: number[] = [];
        while ((match = simplePricePattern.exec(content)) !== null) {
          const priceValue = parseFloat(match[1].replace(/,/g, ''));
          const unit = match[2].toLowerCase();
          const price = unit === 'cr' ? priceValue * 10000000 : priceValue * 100000;
          if (price >= 300000 && price <= 100000000) prices.push(price);
        }
        if (prices.length > 0) {
          pricingData.push({ variantName: 'Base', exShowroom: Math.min(...prices) });
          if (Math.max(...prices) !== Math.min(...prices)) {
            pricingData.push({ variantName: 'Top', exShowroom: Math.max(...prices) });
          }
        }
      }

      if (pricingData.length > 0) {
        console.log(`Found ${pricingData.length} pricing entries from OEM for ${brand} ${model}`);
        return pricingData;
      }
    } catch (error) {
      console.error('OEM pricing scrape error:', error);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`No pricing found from OEM for ${brand} ${model}`);
  return [];
}

// Update car and variant pricing in database
async function updateCarPricing(
  supabase: ReturnType<typeof createClient>,
  carId: string,
  brand: string,
  model: string,
  pricingData: PricingData[]
): Promise<boolean> {
  if (pricingData.length === 0) return false;
  try {
    const { data: variants } = await supabase.from('car_variants').select('id, name, ex_showroom, price_numeric').eq('car_id', carId);
    for (const variant of variants || []) {
      const matchingPrice = pricingData.find(p =>
        variant.name.toLowerCase().includes(p.variantName.toLowerCase()) ||
        p.variantName.toLowerCase().includes(variant.name.toLowerCase().split(' ')[0])
      );
      if (matchingPrice && (!variant.ex_showroom || variant.ex_showroom === 0)) {
        await supabase.from('car_variants').update({
          ex_showroom: matchingPrice.exShowroom, price_numeric: matchingPrice.exShowroom, price: formatPrice(matchingPrice.exShowroom),
        }).eq('id', variant.id);
      }
    }

    const minPrice = Math.min(...pricingData.map(p => p.exShowroom));
    const maxPrice = Math.max(...pricingData.map(p => p.exShowroom));
    const priceRange = minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
    await supabase.from('cars').update({ price_range: priceRange, price_numeric: minPrice, last_verified_at: new Date().toISOString() }).eq('id', carId);
    console.log(`Updated ${brand} ${model} price: ${priceRange}`);
    return true;
  } catch (error) {
    console.error('Database update error:', error);
    return false;
  }
}

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  return `₹${(price / 100000).toFixed(2)} Lakh`;
}

async function processCarPricing(
  supabase: ReturnType<typeof createClient>,
  car: { id: string; name: string; brand: string }
): Promise<{ success: boolean; source?: string }> {
  console.log(`\n>>> Processing: ${car.brand} ${car.name}`);
  const pricingData = await scrapePricingOEM(car.brand, car.name);
  if (pricingData.length > 0) {
    const success = await updateCarPricing(supabase, car.id, car.brand, car.name, pricingData);
    return { success, source: 'oem_official' };
  }
  return { success: false };
}

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

async function processBatchInBackground(
  supabase: ReturnType<typeof createClient>,
  brands: string[],
  limit: number
): Promise<void> {
  console.log(`\n=== OEM PRICING SYNC: ${brands.join(', ')} ===\n`);
  try {
    const { data: cars } = await supabase.from('cars').select('id, name, brand')
      .in('brand', brands).eq('is_discontinued', false).or('price_numeric.is.null,price_numeric.eq.0').limit(limit);

    let success = 0, fail = 0;
    for (const car of cars || []) {
      const result = await processCarPricing(supabase, car);
      if (result.success) success++; else fail++;
      await new Promise(r => setTimeout(r, 3000));
    }
    console.log(`\n=== PRICING DONE: ${success} success, ${fail} failed ===\n`);
  } catch (error) { console.error('Background pricing error:', error); }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!Deno.env.get('FIRECRAWL_API_KEY')) {
      return new Response(JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const massMarketBrands = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Honda', 'Toyota', 'Kia', 'MG', 'Renault', 'Nissan'];

    if (body.batchMode && body.async) {
      const limit = body.limit || 30;
      EdgeRuntime.waitUntil(processBatchInBackground(supabase, body.brands || massMarketBrands, limit));
      return new Response(JSON.stringify({ success: true, message: `OEM pricing sync started`, async: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.carId || body.carSlug) {
      const query = body.carId
        ? supabase.from('cars').select('id, name, brand').eq('id', body.carId).single()
        : supabase.from('cars').select('id, name, brand').eq('slug', body.carSlug).single();
      const { data: car, error } = await query;
      if (error || !car) return new Response(JSON.stringify({ success: false, error: 'Car not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const result = await processCarPricing(supabase, car);
      return new Response(JSON.stringify({ success: result.success, source: result.source }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.batchMode) {
      const limit = body.limit || 10;
      const { data: cars } = await supabase.from('cars').select('id, name, brand')
        .in('brand', body.brands || massMarketBrands).eq('is_discontinued', false)
        .or('price_numeric.is.null,price_numeric.eq.0').limit(limit);

      const results = [];
      for (const car of cars || []) {
        const result = await processCarPricing(supabase, car);
        results.push({ carId: car.id, carName: car.name, ...result });
        await new Promise(r => setTimeout(r, 3000));
      }
      return new Response(JSON.stringify({ success: true, processed: results.length, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: 'Provide carId, carSlug, or batchMode' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
