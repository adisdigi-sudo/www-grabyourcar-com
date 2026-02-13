import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

// OEM domain configuration
const OEM_DOMAINS: Record<string, { domain: string; paths: { specs: string; colors: string; features: string; price: string } }> = {
  'maruti suzuki': { domain: 'www.marutisuzuki.com', paths: { specs: '/specifications', colors: '/colours', features: '/features', price: '/price' } },
  'hyundai': { domain: 'www.hyundai.com/in/en/find-a-car', paths: { specs: '/specifications', colors: '/exterior', features: '/features', price: '/price' } },
  'tata': { domain: 'cars.tatamotors.com', paths: { specs: '/specifications', colors: '/colours', features: '/features', price: '/price' } },
  'mahindra': { domain: 'www.mahindra.com', paths: { specs: '/specifications', colors: '/colours', features: '/features', price: '/price' } },
  'honda': { domain: 'www.hondacarindia.com', paths: { specs: '/specifications', colors: '/colours', features: '/features', price: '/price' } },
  'toyota': { domain: 'www.toyotabharat.com', paths: { specs: '/specifications', colors: '/colours', features: '/features', price: '/price' } },
  'kia': { domain: 'www.kia.com/in', paths: { specs: '/specifications', colors: '/exterior', features: '/features', price: '/price' } },
  'mg': { domain: 'www.mgmotor.co.in', paths: { specs: '/specifications', colors: '/colours', features: '/features', price: '/price' } },
  'skoda': { domain: 'www.skoda-auto.co.in', paths: { specs: '/specifications', colors: '/colours', features: '/features', price: '/price' } },
  'volkswagen': { domain: 'www.volkswagen.co.in', paths: { specs: '/specifications', colors: '/colours', features: '/features', price: '/price' } },
  'renault': { domain: 'www.renault.co.in', paths: { specs: '/specifications', colors: '/colours', features: '/features', price: '/price' } },
  'nissan': { domain: 'www.nissan.in', paths: { specs: '/specifications', colors: '/colours', features: '/features', price: '/price' } },
  'citroen': { domain: 'www.citroen.in', paths: { specs: '/specifications', colors: '/colours', features: '/features', price: '/price' } },
};

interface CarData {
  colors: { name: string; hexCode: string }[];
  specs: { category: string; label: string; value: string }[];
  features: { category: string; name: string }[];
  variants: { name: string; price: number; fuelType?: string; transmission?: string }[];
  priceRange: { min: number; max: number };
}

// Scrape data from official OEM website
async function scrapeCarDataOEM(brand: string, model: string): Promise<CarData | null> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) return null;

  const brandKey = brand.toLowerCase();
  const oemConfig = OEM_DOMAINS[brandKey] || OEM_DOMAINS[brand.toLowerCase().split(' ')[0]];
  
  const modelSlug = model.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(brand.toLowerCase(), '')
    .replace('--', '-')
    .replace(/^-|-$/g, '')
    .trim() || model.toLowerCase().replace(/\s+/g, '-');

  // If no OEM config, try generic URL pattern
  const baseDomain = oemConfig?.domain || `www.${brand.toLowerCase().replace(/\s+/g, '')}.com`;
  const baseUrl = `https://${baseDomain}/${modelSlug}`;

  const result: CarData = {
    colors: [],
    specs: [],
    features: [],
    variants: [],
    priceRange: { min: 0, max: 0 }
  };

  // Helper to scrape a page
  async function scrapePage(url: string): Promise<{ markdown: string; html: string }> {
    try {
      console.log(`Scraping OEM: ${url}`);
      const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, formats: ['markdown', 'html'], onlyMainContent: true, waitFor: 2000 }),
      });
      if (!response.ok) return { markdown: '', html: '' };
      const data = await response.json();
      return { markdown: data.data?.markdown || '', html: data.data?.html || '' };
    } catch { return { markdown: '', html: '' }; }
  }

  // Scrape specs
  try {
    const { markdown } = await scrapePage(`${baseUrl}${oemConfig?.paths.specs || '/specifications'}`);
    
    const specCategories = ['Engine', 'Performance', 'Dimensions', 'Capacity', 'Transmission', 'Suspension', 'Safety', 'Brakes', 'Steering'];
    for (const category of specCategories) {
      const categoryPattern = new RegExp(`(?:^|\\n)\\*\\*${category}[^*]*\\*\\*([\\s\\S]*?)(?=\\n\\*\\*|$)`, 'i');
      const categoryMatch = markdown.match(categoryPattern);
      if (categoryMatch) {
        const specLines = categoryMatch[1].split('\n').filter((l: string) => l.includes('|') || l.includes(':'));
        for (const line of specLines) {
          const parts = line.split(/[|:]/).map((p: string) => p.trim()).filter((p: string) => p && p !== '-' && !p.match(/^-+$/));
          if (parts.length >= 2) {
            result.specs.push({ category, label: parts[0].replace(/\*/g, ''), value: parts[1].replace(/\*/g, '') });
          }
        }
      }
    }
    
    const keySpecs = [
      { label: 'Engine', pattern: /Engine[:\s]*(\d+[\d\s]*cc)/i },
      { label: 'Power', pattern: /(?:Max\s*)?Power[:\s]*([\d\.]+\s*(?:bhp|PS|hp))/i },
      { label: 'Torque', pattern: /(?:Max\s*)?Torque[:\s]*([\d\.]+\s*Nm)/i },
      { label: 'Mileage', pattern: /Mileage[:\s]*([\d\.]+\s*km\/l)/i },
      { label: 'Fuel Tank', pattern: /Fuel\s*Tank[:\s]*([\d\.]+\s*(?:L|litres?))/i },
      { label: 'Ground Clearance', pattern: /Ground\s*Clearance[:\s]*([\d\.]+\s*mm)/i },
      { label: 'Boot Space', pattern: /Boot\s*Space[:\s]*([\d\.]+\s*(?:L|litres?))/i },
      { label: 'Seating Capacity', pattern: /Seating[:\s]*(\d+\s*(?:Seater|persons?))/i },
    ];
    for (const spec of keySpecs) {
      const match = markdown.match(spec.pattern);
      if (match && !result.specs.some(s => s.label === spec.label)) {
        result.specs.push({ category: 'Key Specs', label: spec.label, value: match[1] });
      }
    }
  } catch (e) { console.error('Spec scraping error:', e); }

  await new Promise(r => setTimeout(r, 1500));

  // Scrape colors
  try {
    const { markdown, html } = await scrapePage(`${baseUrl}${oemConfig?.paths.colors || '/colours'}`);
    const colorMap: Record<string, string> = {
      'white': '#FFFFFF', 'pearl white': '#F8F6F0', 'arctic white': '#F4F5F0',
      'black': '#1A1A1A', 'midnight black': '#0D0D0D', 'phantom black': '#1C1C1C',
      'silver': '#C0C0C0', 'grey': '#808080', 'gray': '#808080',
      'red': '#CC0000', 'blue': '#0066CC', 'brown': '#8B4513',
      'green': '#228B22', 'orange': '#FF8C00', 'yellow': '#FFD700',
      'beige': '#F5F5DC', 'gold': '#FFD700', 'purple': '#800080',
      'turquoise': '#40E0D0', 'teal': '#008080',
    };
    
    const text = markdown + ' ' + html;
    const foundColors = new Set<string>();
    
    for (const [colorName, hexCode] of Object.entries(colorMap)) {
      const regex = new RegExp(`\\b${colorName}\\b`, 'gi');
      if (regex.test(text)) {
        const fullNameMatch = text.match(new RegExp(`([A-Za-z]+\\s+)?${colorName}(?:\\s+[A-Za-z]+)?`, 'gi'));
        if (fullNameMatch) {
          for (const match of fullNameMatch) {
            const cleanName = match.trim().split(/\s+/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            if (cleanName.length > 3 && cleanName.length < 30 && !foundColors.has(cleanName.toLowerCase())) {
              foundColors.add(cleanName.toLowerCase());
              result.colors.push({ name: cleanName, hexCode });
            }
          }
        }
      }
    }
    
    if (result.colors.length === 0) {
      result.colors = [
        { name: 'Pearl White', hexCode: '#F8F6F0' },
        { name: 'Midnight Black', hexCode: '#1A1A1A' },
        { name: 'Silky Silver', hexCode: '#C0C0C0' },
        { name: 'Fiery Red', hexCode: '#CC0000' },
      ];
    }
  } catch (e) { console.error('Color scraping error:', e); }

  await new Promise(r => setTimeout(r, 1500));

  // Scrape features
  try {
    const { markdown } = await scrapePage(`${baseUrl}${oemConfig?.paths.features || '/features'}`);
    const featureCategories: Record<string, string[]> = {
      'Safety': ['airbags', 'abs', 'ebd', 'esc', 'esp', 'traction', 'hill', 'isofix', 'parking sensors', 'camera', 'tpms'],
      'Comfort': ['climate', 'ac', 'power windows', 'power steering', 'cruise', 'keyless', 'push button', 'ventilated'],
      'Entertainment': ['touchscreen', 'android auto', 'apple carplay', 'bluetooth', 'usb', 'speakers', 'wireless charging'],
      'Exterior': ['alloy', 'led', 'drl', 'fog', 'sunroof', 'roof rails', 'chrome'],
      'Interior': ['leather', 'ambient', 'digital', 'instrument cluster', 'steering mounted', 'rear ac'],
    };
    
    const lowerMarkdown = markdown.toLowerCase();
    for (const [category, keywords] of Object.entries(featureCategories)) {
      for (const keyword of keywords) {
        if (lowerMarkdown.includes(keyword)) {
          const featureMatch = markdown.match(new RegExp(`([^\\n]*${keyword}[^\\n]*)`, 'gi'));
          if (featureMatch) {
            const featureName = featureMatch[0].replace(/[*#\-|]/g, '').trim().split(/[,.]/).find((p: string) => p.toLowerCase().includes(keyword))?.trim();
            if (featureName && featureName.length > 3 && featureName.length < 50) {
              const cleanName = featureName.charAt(0).toUpperCase() + featureName.slice(1);
              if (!result.features.some(f => f.name.toLowerCase() === cleanName.toLowerCase())) {
                result.features.push({ category, name: cleanName });
              }
            }
          }
        }
      }
    }
  } catch (e) { console.error('Feature scraping error:', e); }

  await new Promise(r => setTimeout(r, 1500));

  // Scrape pricing
  try {
    const { markdown, html } = await scrapePage(`${baseUrl}${oemConfig?.paths.price || '/price'}`);
    const content = markdown + ' ' + html;
    const pricePattern = /₹\s*([\d,\.]+)\s*(Lakh|Cr)/gi;
    const prices: number[] = [];
    let match;
    
    while ((match = pricePattern.exec(content)) !== null) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      const unit = match[2].toLowerCase();
      const price = unit === 'cr' ? value * 10000000 : value * 100000;
      if (price >= 300000 && price <= 500000000) prices.push(price);
    }
    
    if (prices.length > 0) {
      result.priceRange.min = Math.min(...prices);
      result.priceRange.max = Math.max(...prices);
    }

    const variantPattern = /([A-Za-z0-9\s\-\.]+(?:Petrol|Diesel|CNG|Electric|Hybrid|MT|AT|AMT|CVT|DCT)?)[^\d₹]*₹\s*([\d,\.]+)\s*(Lakh|Cr)/gi;
    while ((match = variantPattern.exec(content)) !== null) {
      const variantName = match[1].trim();
      const value = parseFloat(match[2].replace(/,/g, ''));
      const unit = match[3].toLowerCase();
      const price = unit === 'cr' ? value * 10000000 : value * 100000;
      
      if (variantName.length > 2 && variantName.length < 50 && price >= 300000) {
        const fuelType = variantName.match(/Petrol|Diesel|CNG|Electric|Hybrid/i)?.[0];
        const transmission = variantName.match(/MT|AT|AMT|CVT|DCT|Manual|Automatic/i)?.[0];
        if (!result.variants.some(v => v.name === variantName)) {
          result.variants.push({
            name: variantName, price,
            fuelType: fuelType ? fuelType.charAt(0).toUpperCase() + fuelType.slice(1).toLowerCase() : undefined,
            transmission: transmission === 'MT' ? 'Manual' : transmission === 'AT' ? 'Automatic' : transmission
          });
        }
      }
    }
  } catch (e) { console.error('Pricing scraping error:', e); }

  console.log(`OEM Scraped: ${result.colors.length} colors, ${result.specs.length} specs, ${result.features.length} features, ${result.variants.length} variants`);
  return result;
}

// Update database with scraped data
async function updateCarData(
  supabase: ReturnType<typeof createClient>,
  carId: string,
  brand: string,
  model: string,
  data: CarData
): Promise<{ colorsAdded: number; specsAdded: number; featuresAdded: number; variantsUpdated: number }> {
  const results = { colorsAdded: 0, specsAdded: 0, featuresAdded: 0, variantsUpdated: 0 };

  try {
    const { data: existingColors } = await supabase.from('car_colors').select('name').eq('car_id', carId);
    const existingColorNames = new Set((existingColors || []).map((c: { name: string }) => c.name.toLowerCase()));
    for (const color of data.colors) {
      if (!existingColorNames.has(color.name.toLowerCase())) {
        const { error } = await supabase.from('car_colors').insert({ car_id: carId, name: color.name, hex_code: color.hexCode, image_sync_status: 'pending' });
        if (!error) results.colorsAdded++;
      }
    }

    const { data: existingSpecs } = await supabase.from('car_specifications').select('label').eq('car_id', carId);
    const existingSpecLabels = new Set((existingSpecs || []).map((s: { label: string }) => s.label.toLowerCase()));
    let sortOrder = (existingSpecs?.length || 0) + 1;
    for (const spec of data.specs) {
      if (!existingSpecLabels.has(spec.label.toLowerCase())) {
        const { error } = await supabase.from('car_specifications').insert({ car_id: carId, category: spec.category, label: spec.label, value: spec.value, sort_order: sortOrder++ });
        if (!error) results.specsAdded++;
      }
    }

    const { data: existingFeatures } = await supabase.from('car_features').select('feature_name').eq('car_id', carId);
    const existingFeatureNames = new Set((existingFeatures || []).map((f: { feature_name: string }) => f.feature_name.toLowerCase()));
    let featureSortOrder = (existingFeatures?.length || 0) + 1;
    for (const feature of data.features) {
      if (!existingFeatureNames.has(feature.name.toLowerCase())) {
        const { error } = await supabase.from('car_features').insert({ car_id: carId, category: feature.category, feature_name: feature.name, is_standard: true, sort_order: featureSortOrder++ });
        if (!error) results.featuresAdded++;
      }
    }

    const { data: existingVariants } = await supabase.from('car_variants').select('id, name, ex_showroom').eq('car_id', carId);
    for (const variant of existingVariants || []) {
      if (!variant.ex_showroom || variant.ex_showroom === 0) {
        const match = data.variants.find(v =>
          variant.name.toLowerCase().includes(v.name.toLowerCase().split(' ')[0]) ||
          v.name.toLowerCase().includes(variant.name.toLowerCase().split(' ')[0])
        );
        if (match) {
          await supabase.from('car_variants').update({
            ex_showroom: match.price, price_numeric: match.price, price: formatPrice(match.price),
            fuel_type: match.fuelType || undefined, transmission: match.transmission || undefined
          }).eq('id', variant.id);
          results.variantsUpdated++;
        }
      }
    }

    if (data.priceRange.min > 0) {
      const priceRange = data.priceRange.min === data.priceRange.max
        ? formatPrice(data.priceRange.min)
        : `${formatPrice(data.priceRange.min)} - ${formatPrice(data.priceRange.max)}`;
      await supabase.from('cars').update({
        price_range: priceRange, price_numeric: data.priceRange.min, last_verified_at: new Date().toISOString()
      }).eq('id', carId);
    }

    console.log(`Updated ${brand} ${model}: +${results.colorsAdded} colors, +${results.specsAdded} specs, +${results.featuresAdded} features, ${results.variantsUpdated} variants`);
  } catch (error) { console.error('Database update error:', error); }
  return results;
}

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  return `₹${(price / 100000).toFixed(2)} Lakh`;
}

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

async function processBatchInBackground(
  supabase: ReturnType<typeof createClient>,
  limit: number,
  priorityBrands?: string[]
): Promise<void> {
  console.log(`\n=== OEM DATA ENRICHMENT ===\n`);
  try {
    let query = supabase.from('cars').select('id, name, brand').eq('is_discontinued', false);
    if (priorityBrands?.length) query = query.in('brand', priorityBrands);
    const { data: allCars } = await query;
    
    const carsNeedingData: { id: string; name: string; brand: string }[] = [];
    for (const car of allCars || []) {
      const [colors, specs, features] = await Promise.all([
        supabase.from('car_colors').select('id').eq('car_id', car.id).limit(1),
        supabase.from('car_specifications').select('id').eq('car_id', car.id).limit(1),
        supabase.from('car_features').select('id').eq('car_id', car.id).limit(1)
      ]);
      if (!colors.data?.length || !specs.data?.length || !features.data?.length) carsNeedingData.push(car);
      if (carsNeedingData.length >= limit) break;
    }

    let totalColors = 0, totalSpecs = 0, totalFeatures = 0, totalVariants = 0;
    for (const car of carsNeedingData) {
      const data = await scrapeCarDataOEM(car.brand, car.name);
      if (data) {
        const results = await updateCarData(supabase, car.id, car.brand, car.name, data);
        totalColors += results.colorsAdded; totalSpecs += results.specsAdded;
        totalFeatures += results.featuresAdded; totalVariants += results.variantsUpdated;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    console.log(`\n=== DONE: +${totalColors} colors, +${totalSpecs} specs, +${totalFeatures} features, ${totalVariants} variants ===\n`);
  } catch (error) { console.error('Background enrichment error:', error); }
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
    const massMarketBrands = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Honda', 'Toyota', 'Kia', 'MG', 'Renault', 'Nissan', 'Skoda', 'Volkswagen', 'Citroen'];

    if (body.batchMode && body.async) {
      const limit = body.limit || 30;
      EdgeRuntime.waitUntil(processBatchInBackground(supabase, limit, body.brands || massMarketBrands));
      return new Response(JSON.stringify({ success: true, message: `OEM enrichment started for ${limit} cars`, async: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.carId || body.carSlug) {
      const query = body.carId
        ? supabase.from('cars').select('id, name, brand').eq('id', body.carId).single()
        : supabase.from('cars').select('id, name, brand').eq('slug', body.carSlug).single();
      const { data: car, error } = await query;
      if (error || !car) return new Response(JSON.stringify({ success: false, error: 'Car not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const data = await scrapeCarDataOEM(car.brand, car.name);
      if (data) {
        const results = await updateCarData(supabase, car.id, car.brand, car.name, data);
        return new Response(JSON.stringify({ success: true, ...results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: false, error: 'Could not scrape OEM data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.batchMode) {
      const limit = body.limit || 5;
      const { data: cars } = await supabase.from('cars').select('id, name, brand')
        .in('brand', body.brands || massMarketBrands).eq('is_discontinued', false).limit(limit * 3);

      const results = [];
      let processed = 0;
      for (const car of cars || []) {
        if (processed >= limit) break;
        const [colors, specs] = await Promise.all([
          supabase.from('car_colors').select('id').eq('car_id', car.id).limit(1),
          supabase.from('car_specifications').select('id').eq('car_id', car.id).limit(1)
        ]);
        if (!colors.data?.length || !specs.data?.length) {
          const data = await scrapeCarDataOEM(car.brand, car.name);
          if (data) {
            const updateResults = await updateCarData(supabase, car.id, car.brand, car.name, data);
            results.push({ car: `${car.brand} ${car.name}`, ...updateResults });
          }
          processed++;
          await new Promise(r => setTimeout(r, 2000));
        }
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
