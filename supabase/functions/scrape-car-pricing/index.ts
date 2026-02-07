import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

interface PricingData {
  variantName: string;
  exShowroom: number;
  onRoadPrice?: number;
  fuelType?: string;
  transmission?: string;
}

// Scrape pricing from CardekHo
async function scrapePricingCardekho(brand: string, model: string): Promise<PricingData[]> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) return [];

  const brandSlug = brand.toLowerCase()
    .replace(/\s+/g, '-')
    .replace('maruti suzuki', 'maruti');
  
  const modelSlug = model.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(brand.toLowerCase(), '')
    .replace('--', '-')
    .replace(/^-|-$/g, '')
    .trim();

  const url = `https://www.cardekho.com/${brandSlug}/${modelSlug}/price`;
  console.log(`Scraping pricing from: ${url}`);

  try {
    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      console.log(`Firecrawl failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || '';
    const html = data.data?.html || data.html || '';

    const pricingData: PricingData[] = [];

    // Parse variant pricing from markdown/html
    // Pattern: Variant Name | Petrol/Diesel | Manual/Automatic | ₹X.XX Lakh
    const pricePatterns = [
      /([A-Za-z0-9\s\-\.]+)\s*\|\s*(Petrol|Diesel|CNG|Electric|Hybrid)\s*\|\s*(Manual|Automatic|AMT|CVT|DCT|iMT)\s*\|\s*₹?\s*([\d,\.]+)\s*(Lakh|Cr)/gi,
      /₹\s*([\d,\.]+)\s*(Lakh|Cr)/gi,
    ];

    // Extract prices from HTML using regex for price table rows
    const variantRowPattern = /<tr[^>]*>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>[^<]*₹\s*([\d,\.]+)\s*(Lakh|Cr)[^<]*<\/td>.*?<\/tr>/gis;
    let match;
    
    while ((match = variantRowPattern.exec(html)) !== null) {
      const variantName = match[1].trim();
      const priceValue = parseFloat(match[2].replace(/,/g, ''));
      const unit = match[3].toLowerCase();
      
      if (variantName && priceValue > 0) {
        const exShowroom = unit === 'cr' ? priceValue * 100 : priceValue;
        pricingData.push({
          variantName,
          exShowroom: Math.round(exShowroom * 100000), // Convert to actual rupees
        });
      }
    }

    // Also try extracting from markdown format
    const markdownPricePattern = /\*\*([^*]+)\*\*[^\d]*₹\s*([\d,\.]+)\s*(Lakh|Cr)/gi;
    while ((match = markdownPricePattern.exec(markdown)) !== null) {
      const variantName = match[1].trim();
      const priceValue = parseFloat(match[2].replace(/,/g, ''));
      const unit = match[3].toLowerCase();
      
      if (variantName && priceValue > 0 && !pricingData.some(p => p.variantName === variantName)) {
        const exShowroom = unit === 'cr' ? priceValue * 100 : priceValue;
        pricingData.push({
          variantName,
          exShowroom: Math.round(exShowroom * 100000),
        });
      }
    }

    // Simple price extraction if structured parsing fails
    if (pricingData.length === 0) {
      const simplePricePattern = /₹\s*([\d,\.]+)\s*(Lakh|Cr)/gi;
      const prices: number[] = [];
      while ((match = simplePricePattern.exec(markdown + html)) !== null) {
        const priceValue = parseFloat(match[1].replace(/,/g, ''));
        const unit = match[2].toLowerCase();
        const price = unit === 'cr' ? priceValue * 10000000 : priceValue * 100000;
        if (price >= 300000 && price <= 100000000) { // Valid car price range
          prices.push(price);
        }
      }
      
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        pricingData.push({
          variantName: 'Base',
          exShowroom: minPrice,
        });
        if (maxPrice !== minPrice) {
          pricingData.push({
            variantName: 'Top',
            exShowroom: maxPrice,
          });
        }
      }
    }

    console.log(`Found ${pricingData.length} pricing entries for ${brand} ${model}`);
    return pricingData;
  } catch (error) {
    console.error('Scraping error:', error);
    return [];
  }
}

// Scrape pricing from CarWale
async function scrapePricingCarwale(brand: string, model: string): Promise<PricingData[]> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) return [];

  const brandSlug = brand.toLowerCase()
    .replace(/\s+/g, '-')
    .replace('maruti suzuki', 'maruti-suzuki');
  
  const modelSlug = model.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(brand.toLowerCase(), '')
    .replace('--', '-')
    .replace(/^-|-$/g, '')
    .trim();

  const url = `https://www.carwale.com/${brandSlug}-cars/${modelSlug}/prices`;
  console.log(`Scraping pricing from: ${url}`);

  try {
    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      console.log(`Firecrawl failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || '';
    const html = data.data?.html || data.html || '';

    const pricingData: PricingData[] = [];
    const pricePattern = /₹\s*([\d,\.]+)\s*(Lakh|Cr)/gi;
    let match;
    const prices: number[] = [];
    
    while ((match = pricePattern.exec(markdown + html)) !== null) {
      const priceValue = parseFloat(match[1].replace(/,/g, ''));
      const unit = match[2].toLowerCase();
      const price = unit === 'cr' ? priceValue * 10000000 : priceValue * 100000;
      if (price >= 300000 && price <= 100000000) {
        prices.push(price);
      }
    }

    if (prices.length > 0) {
      const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);
      pricingData.push({
        variantName: 'Base',
        exShowroom: uniquePrices[0],
      });
      if (uniquePrices.length > 1) {
        pricingData.push({
          variantName: 'Top',
          exShowroom: uniquePrices[uniquePrices.length - 1],
        });
      }
    }

    console.log(`Found ${pricingData.length} pricing entries from CarWale for ${brand} ${model}`);
    return pricingData;
  } catch (error) {
    console.error('CarWale scraping error:', error);
    return [];
  }
}

// OEM Website URLs mapping
const OEM_URLS: Record<string, string> = {
  'Tata': 'https://cars.tatamotors.com',
  'Mahindra': 'https://auto.mahindra.com',
  'Maruti Suzuki': 'https://www.marutisuzuki.com',
  'Hyundai': 'https://www.hyundai.com/in',
  'Honda': 'https://www.hondacarindia.com',
  'Toyota': 'https://www.toyotabharat.com',
  'Kia': 'https://www.kia.com/in',
  'MG': 'https://www.mgmotor.co.in',
  'Renault': 'https://www.renaultindia.com',
  'Nissan': 'https://www.nissan.in',
};

// Scrape pricing from Official OEM Website (for newer models)
async function scrapePricingOEM(brand: string, model: string): Promise<PricingData[]> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) return [];

  const brandKey = Object.keys(OEM_URLS).find(k => 
    brand.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(brand.toLowerCase())
  );
  
  if (!brandKey) {
    console.log(`No OEM URL for brand: ${brand}`);
    return [];
  }

  const baseUrl = OEM_URLS[brandKey];
  const modelSlug = model.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(brand.toLowerCase(), '')
    .replace('--', '-')
    .replace(/^-|-$/g, '')
    .trim();

  // Try common OEM URL patterns
  const urlPatterns = [
    `${baseUrl}/cars/${modelSlug}`,
    `${baseUrl}/${modelSlug}`,
    `${baseUrl}/en/cars/${modelSlug}`,
    `${baseUrl}/vehicles/${modelSlug}`,
  ];

  for (const url of urlPatterns) {
    console.log(`Scraping OEM pricing from: ${url}`);
    
    try {
      const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'html'],
          onlyMainContent: true,
          waitFor: 5000, // OEM sites often need more time
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const markdown = data.data?.markdown || data.markdown || '';
      const html = data.data?.html || data.html || '';
      const content = markdown + html;

      // Skip if page not found
      if (content.toLowerCase().includes('page not found') || 
          content.toLowerCase().includes('404') ||
          content.length < 500) {
        continue;
      }

      const pricingData: PricingData[] = [];
      
      // OEM sites often show "Starting from ₹X.XX Lakh*" or "Price: ₹X.XX Lakh"
      const oemPricePatterns = [
        /(?:starting\s*(?:from|at|price)?|price\s*(?:starts?)?|ex-?showroom|₹)\s*₹?\s*([\d,\.]+)\s*(Lakh|Lakhs?|Cr|Crore)/gi,
        /₹\s*([\d,\.]+)\s*(Lakh|Lakhs?|Cr|Crore)/gi,
      ];

      const prices: number[] = [];
      for (const pattern of oemPricePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const priceValue = parseFloat(match[1].replace(/,/g, ''));
          const unit = match[2].toLowerCase();
          const price = unit.startsWith('cr') ? priceValue * 10000000 : priceValue * 100000;
          if (price >= 300000 && price <= 100000000) {
            prices.push(price);
          }
        }
      }

      if (prices.length > 0) {
        const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);
        pricingData.push({
          variantName: 'Base',
          exShowroom: uniquePrices[0],
        });
        if (uniquePrices.length > 1) {
          pricingData.push({
            variantName: 'Top',
            exShowroom: uniquePrices[uniquePrices.length - 1],
          });
        }
        console.log(`✓ OEM SUCCESS: Found ${pricingData.length} pricing entries from ${url}`);
        return pricingData;
      }
    } catch (error) {
      console.error(`OEM scraping error for ${url}:`, error);
    }
  }

  console.log(`No OEM pricing found for ${brand} ${model}`);
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
    // Get existing variants
    const { data: variants } = await supabase
      .from('car_variants')
      .select('id, name, ex_showroom, price_numeric')
      .eq('car_id', carId);

    // Update variants with scraped prices
    for (const variant of variants || []) {
      // Try to match variant names
      const matchingPrice = pricingData.find(p => 
        variant.name.toLowerCase().includes(p.variantName.toLowerCase()) ||
        p.variantName.toLowerCase().includes(variant.name.toLowerCase().split(' ')[0])
      );

      if (matchingPrice && (!variant.ex_showroom || variant.ex_showroom === 0)) {
        await supabase
          .from('car_variants')
          .update({
            ex_showroom: matchingPrice.exShowroom,
            price_numeric: matchingPrice.exShowroom,
            price: formatPrice(matchingPrice.exShowroom),
          })
          .eq('id', variant.id);
        
        console.log(`Updated ${variant.name}: ₹${matchingPrice.exShowroom}`);
      }
    }

    // If no variants matched, update base price on car
    const minPrice = Math.min(...pricingData.map(p => p.exShowroom));
    const maxPrice = Math.max(...pricingData.map(p => p.exShowroom));
    
    const priceRange = minPrice === maxPrice 
      ? formatPrice(minPrice)
      : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;

    await supabase
      .from('cars')
      .update({
        price_range: priceRange,
        price_numeric: minPrice,
        last_verified_at: new Date().toISOString(),
      })
      .eq('id', carId);

    console.log(`Updated ${brand} ${model} price range: ${priceRange}`);
    return true;
  } catch (error) {
    console.error('Database update error:', error);
    return false;
  }
}

function formatPrice(price: number): string {
  if (price >= 10000000) {
    return `₹${(price / 10000000).toFixed(2)} Cr`;
  }
  return `₹${(price / 100000).toFixed(2)} Lakh`;
}

// Process a single car with 3-tier fallback: CardekHo → CarWale → OEM
async function processCarPricing(
  supabase: ReturnType<typeof createClient>,
  car: { id: string; name: string; brand: string }
): Promise<{ success: boolean; source?: string }> {
  console.log(`\n>>> Processing: ${car.brand} ${car.name}`);

  // Try CardekHo first
  let pricingData = await scrapePricingCardekho(car.brand, car.name);
  let source = 'cardekho';

  // Fallback to CarWale
  if (pricingData.length === 0) {
    pricingData = await scrapePricingCarwale(car.brand, car.name);
    source = 'carwale';
  }

  // Final fallback to Official OEM Website (for newer EVs and recent launches)
  if (pricingData.length === 0) {
    console.log(`Trying OEM fallback for ${car.brand} ${car.name}...`);
    pricingData = await scrapePricingOEM(car.brand, car.name);
    source = 'oem-official';
  }

  if (pricingData.length > 0) {
    const success = await updateCarPricing(supabase, car.id, car.brand, car.name, pricingData);
    return { success, source };
  }

  return { success: false };
}

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

// Background batch processing
async function processBatchInBackground(
  supabase: ReturnType<typeof createClient>,
  brands: string[],
  limit: number
): Promise<void> {
  console.log(`\n=== PRICING SYNC: ${brands.join(', ')} ===\n`);

  try {
    // Get cars from specified brands that need pricing
    const { data: cars } = await supabase
      .from('cars')
      .select('id, name, brand')
      .in('brand', brands)
      .eq('is_discontinued', false)
      .or('price_numeric.is.null,price_numeric.eq.0')
      .limit(limit);

    console.log(`Processing ${cars?.length || 0} cars for pricing...\n`);

    let success = 0, fail = 0;

    for (const car of cars || []) {
      const result = await processCarPricing(supabase, car);
      if (result.success) success++;
      else fail++;

      // Rate limiting
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log(`\n=== PRICING DONE: ${success} success, ${fail} failed ===\n`);
  } catch (error) {
    console.error('Background pricing error:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();

    const massMarketBrands = [
      'Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 
      'Honda', 'Toyota', 'Kia', 'MG', 'Renault', 'Nissan'
    ];

    // Async batch mode
    if (body.batchMode && body.async) {
      const limit = body.limit || 30;
      const brands = body.brands || massMarketBrands;
      EdgeRuntime.waitUntil(processBatchInBackground(supabase, brands, limit));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Background pricing sync started for ${brands.length} brands`, 
          async: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single car
    if (body.carId || body.carSlug) {
      const query = body.carId 
        ? supabase.from('cars').select('id, name, brand').eq('id', body.carId).single()
        : supabase.from('cars').select('id, name, brand').eq('slug', body.carSlug).single();
      
      const { data: car, error } = await query;
      if (error || !car) {
        return new Response(
          JSON.stringify({ success: false, error: 'Car not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await processCarPricing(supabase, car);
      return new Response(
        JSON.stringify({ success: result.success, source: result.source }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync batch mode
    if (body.batchMode) {
      const limit = body.limit || 10;
      const brands = body.brands || massMarketBrands;
      
      const { data: cars } = await supabase
        .from('cars')
        .select('id, name, brand')
        .in('brand', brands)
        .eq('is_discontinued', false)
        .or('price_numeric.is.null,price_numeric.eq.0')
        .limit(limit);

      const results = [];
      for (const car of cars || []) {
        const result = await processCarPricing(supabase, car);
        results.push({ carId: car.id, carName: car.name, ...result });
        await new Promise(r => setTimeout(r, 3000));
      }

      return new Response(
        JSON.stringify({ success: true, processed: results.length, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Provide carId, carSlug, or batchMode' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
