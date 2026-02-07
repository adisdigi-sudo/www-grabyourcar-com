import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

interface CarData {
  colors: { name: string; hexCode: string }[];
  specs: { category: string; label: string; value: string }[];
  features: { category: string; name: string }[];
  variants: { name: string; price: number; fuelType?: string; transmission?: string }[];
  priceRange: { min: number; max: number };
}

// Scrape complete car data from CardekHo
async function scrapeCarDataCardekho(brand: string, model: string): Promise<CarData | null> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) return null;

  const brandSlug = brand.toLowerCase()
    .replace(/\s+/g, '-')
    .replace('maruti suzuki', 'maruti')
    .replace('mercedes-benz', 'mercedes');
  
  const modelSlug = model.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(brand.toLowerCase(), '')
    .replace('--', '-')
    .replace(/^-|-$/g, '')
    .trim() || model.toLowerCase().replace(/\s+/g, '-');

  const result: CarData = {
    colors: [],
    specs: [],
    features: [],
    variants: [],
    priceRange: { min: 0, max: 0 }
  };

  // Scrape specifications page
  try {
    const specUrl = `https://www.cardekho.com/${brandSlug}/${modelSlug}/specifications`;
    console.log(`Scraping specs: ${specUrl}`);
    
    const specResponse = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: specUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    if (specResponse.ok) {
      const specData = await specResponse.json();
      const markdown = specData.data?.markdown || specData.markdown || '';
      
      // Parse specifications from markdown
      const specCategories = ['Engine', 'Performance', 'Dimensions', 'Capacity', 'Transmission', 'Suspension', 'Safety', 'Brakes', 'Steering'];
      
      for (const category of specCategories) {
        const categoryPattern = new RegExp(`(?:^|\\n)\\*\\*${category}[^*]*\\*\\*([\\s\\S]*?)(?=\\n\\*\\*|$)`, 'i');
        const categoryMatch = markdown.match(categoryPattern);
        
        if (categoryMatch) {
          const specLines = categoryMatch[1].split('\n').filter(l => l.includes('|') || l.includes(':'));
          for (const line of specLines) {
            const parts = line.split(/[|:]/).map(p => p.trim()).filter(p => p && p !== '-' && !p.match(/^-+$/));
            if (parts.length >= 2) {
              result.specs.push({
                category,
                label: parts[0].replace(/\*/g, ''),
                value: parts[1].replace(/\*/g, '')
              });
            }
          }
        }
      }
      
      // Extract key specs from general patterns
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
          result.specs.push({
            category: 'Key Specs',
            label: spec.label,
            value: match[1]
          });
        }
      }
    }
  } catch (e) {
    console.error('Spec scraping error:', e);
  }

  await new Promise(r => setTimeout(r, 1500));

  // Scrape colors page
  try {
    const colorUrl = `https://www.cardekho.com/${brandSlug}/${modelSlug}/colours`;
    console.log(`Scraping colors: ${colorUrl}`);
    
    const colorResponse = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: colorUrl,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    if (colorResponse.ok) {
      const colorData = await colorResponse.json();
      const markdown = colorData.data?.markdown || colorData.markdown || '';
      const html = colorData.data?.html || colorData.html || '';
      
      // Common car colors with hex codes
      const colorMap: Record<string, string> = {
        'white': '#FFFFFF', 'pearl white': '#F8F6F0', 'arctic white': '#F4F5F0',
        'black': '#1A1A1A', 'midnight black': '#0D0D0D', 'phantom black': '#1C1C1C',
        'silver': '#C0C0C0', 'silky silver': '#BEBEBE', 'sleek silver': '#B8B8B8',
        'grey': '#808080', 'gray': '#808080', 'titan grey': '#5A5A5A', 'graphite grey': '#4A4A4A',
        'red': '#CC0000', 'fiery red': '#B22222', 'passion red': '#C41E3A', 'ruby red': '#9B111E',
        'blue': '#0066CC', 'marina blue': '#1E90FF', 'starry blue': '#4169E1', 'denim blue': '#1560BD',
        'brown': '#8B4513', 'coffee brown': '#6F4E37', 'earth brown': '#7B3F00',
        'green': '#228B22', 'jungle green': '#29AB87', 'lush green': '#00A86B',
        'orange': '#FF8C00', 'dual tone': '#D2691E', 'sunset orange': '#FA5B3D',
        'beige': '#F5F5DC', 'champagne': '#F7E7CE', 'ivory': '#FFFFF0',
        'yellow': '#FFD700', 'gold': '#FFD700', 'brass gold': '#B5A642',
        'purple': '#800080', 'burgundy': '#800020', 'wine': '#722F37',
        'turquoise': '#40E0D0', 'teal': '#008080', 'aqua': '#00FFFF',
      };
      
      // Extract color names from content
      const colorPatterns = [
        /(?:available\s+in|comes\s+in|color(?:s)?)[:\s]*([^.]+)/gi,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:colour|color)/gi,
      ];
      
      const foundColors = new Set<string>();
      const text = markdown + ' ' + html;
      
      // Look for color names in the text
      for (const [colorName, hexCode] of Object.entries(colorMap)) {
        const regex = new RegExp(`\\b${colorName}\\b`, 'gi');
        if (regex.test(text)) {
          // Find the full color name with any prefix
          const fullNameMatch = text.match(new RegExp(`([A-Za-z]+\\s+)?${colorName}(?:\\s+[A-Za-z]+)?`, 'gi'));
          if (fullNameMatch) {
            for (const match of fullNameMatch) {
              const cleanName = match.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
              if (cleanName.length > 3 && cleanName.length < 30 && !foundColors.has(cleanName.toLowerCase())) {
                foundColors.add(cleanName.toLowerCase());
                result.colors.push({ name: cleanName, hexCode });
              }
            }
          }
        }
      }
      
      // If no colors found, add default colors based on segment
      if (result.colors.length === 0) {
        result.colors = [
          { name: 'Pearl White', hexCode: '#F8F6F0' },
          { name: 'Midnight Black', hexCode: '#1A1A1A' },
          { name: 'Silky Silver', hexCode: '#C0C0C0' },
          { name: 'Fiery Red', hexCode: '#CC0000' },
        ];
      }
    }
  } catch (e) {
    console.error('Color scraping error:', e);
  }

  await new Promise(r => setTimeout(r, 1500));

  // Scrape features page
  try {
    const featureUrl = `https://www.cardekho.com/${brandSlug}/${modelSlug}/features`;
    console.log(`Scraping features: ${featureUrl}`);
    
    const featureResponse = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: featureUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    if (featureResponse.ok) {
      const featureData = await featureResponse.json();
      const markdown = featureData.data?.markdown || featureData.markdown || '';
      
      const featureCategories = {
        'Safety': ['airbags', 'abs', 'ebd', 'esc', 'esp', 'traction', 'hill', 'isofix', 'parking sensors', 'camera', 'tpms', 'seat belt'],
        'Comfort': ['climate', 'ac', 'power windows', 'power steering', 'cruise', 'keyless', 'push button', 'ventilated', 'heated', 'armrest'],
        'Entertainment': ['touchscreen', 'android auto', 'apple carplay', 'bluetooth', 'usb', 'speakers', 'subwoofer', 'wireless charging'],
        'Exterior': ['alloy', 'led', 'drl', 'fog', 'sunroof', 'roof rails', 'chrome', 'orvm'],
        'Interior': ['leather', 'ambient', 'digital', 'instrument cluster', 'steering mounted', 'rear ac'],
      };
      
      const lowerMarkdown = markdown.toLowerCase();
      
      for (const [category, keywords] of Object.entries(featureCategories)) {
        for (const keyword of keywords) {
          if (lowerMarkdown.includes(keyword)) {
            // Extract the full feature name
            const featureMatch = markdown.match(new RegExp(`([^\\n]*${keyword}[^\\n]*)`, 'gi'));
            if (featureMatch) {
              const featureName = featureMatch[0]
                .replace(/[*#\-|]/g, '')
                .trim()
                .split(/[,.]/)
                .find(p => p.toLowerCase().includes(keyword))
                ?.trim();
              
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
    }
  } catch (e) {
    console.error('Feature scraping error:', e);
  }

  await new Promise(r => setTimeout(r, 1500));

  // Scrape pricing/variants page
  try {
    const priceUrl = `https://www.cardekho.com/${brandSlug}/${modelSlug}/price`;
    console.log(`Scraping pricing: ${priceUrl}`);
    
    const priceResponse = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: priceUrl,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    if (priceResponse.ok) {
      const priceData = await priceResponse.json();
      const markdown = priceData.data?.markdown || priceData.markdown || '';
      const html = priceData.data?.html || priceData.html || '';
      const content = markdown + ' ' + html;
      
      // Extract prices
      const pricePattern = /₹\s*([\d,\.]+)\s*(Lakh|Cr)/gi;
      const prices: number[] = [];
      let match;
      
      while ((match = pricePattern.exec(content)) !== null) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        const unit = match[2].toLowerCase();
        const price = unit === 'cr' ? value * 10000000 : value * 100000;
        if (price >= 300000 && price <= 500000000) {
          prices.push(price);
        }
      }
      
      if (prices.length > 0) {
        result.priceRange.min = Math.min(...prices);
        result.priceRange.max = Math.max(...prices);
      }
      
      // Try to extract variant names with prices
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
              name: variantName,
              price,
              fuelType: fuelType?.charAt(0).toUpperCase() + fuelType?.slice(1).toLowerCase(),
              transmission: transmission === 'MT' ? 'Manual' : transmission === 'AT' ? 'Automatic' : transmission
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Pricing scraping error:', e);
  }

  console.log(`Scraped: ${result.colors.length} colors, ${result.specs.length} specs, ${result.features.length} features, ${result.variants.length} variants`);
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
    // Check existing colors
    const { data: existingColors } = await supabase
      .from('car_colors')
      .select('name')
      .eq('car_id', carId);
    
    const existingColorNames = new Set((existingColors || []).map(c => c.name.toLowerCase()));
    
    // Add new colors
    for (const color of data.colors) {
      if (!existingColorNames.has(color.name.toLowerCase())) {
        const { error } = await supabase.from('car_colors').insert({
          car_id: carId,
          name: color.name,
          hex_code: color.hexCode,
          image_sync_status: 'pending'
        });
        if (!error) results.colorsAdded++;
      }
    }

    // Check existing specs
    const { data: existingSpecs } = await supabase
      .from('car_specifications')
      .select('label')
      .eq('car_id', carId);
    
    const existingSpecLabels = new Set((existingSpecs || []).map(s => s.label.toLowerCase()));
    
    // Add new specs
    let sortOrder = (existingSpecs?.length || 0) + 1;
    for (const spec of data.specs) {
      if (!existingSpecLabels.has(spec.label.toLowerCase())) {
        const { error } = await supabase.from('car_specifications').insert({
          car_id: carId,
          category: spec.category,
          label: spec.label,
          value: spec.value,
          sort_order: sortOrder++
        });
        if (!error) results.specsAdded++;
      }
    }

    // Check existing features
    const { data: existingFeatures } = await supabase
      .from('car_features')
      .select('feature_name')
      .eq('car_id', carId);
    
    const existingFeatureNames = new Set((existingFeatures || []).map(f => f.feature_name.toLowerCase()));
    
    // Add new features
    let featureSortOrder = (existingFeatures?.length || 0) + 1;
    for (const feature of data.features) {
      if (!existingFeatureNames.has(feature.name.toLowerCase())) {
        const { error } = await supabase.from('car_features').insert({
          car_id: carId,
          category: feature.category,
          feature_name: feature.name,
          is_standard: true,
          sort_order: featureSortOrder++
        });
        if (!error) results.featuresAdded++;
      }
    }

    // Update variant pricing
    const { data: existingVariants } = await supabase
      .from('car_variants')
      .select('id, name, ex_showroom')
      .eq('car_id', carId);
    
    for (const variant of existingVariants || []) {
      if (!variant.ex_showroom || variant.ex_showroom === 0) {
        // Try to match with scraped variants
        const match = data.variants.find(v => 
          variant.name.toLowerCase().includes(v.name.toLowerCase().split(' ')[0]) ||
          v.name.toLowerCase().includes(variant.name.toLowerCase().split(' ')[0])
        );
        
        if (match) {
          await supabase
            .from('car_variants')
            .update({
              ex_showroom: match.price,
              price_numeric: match.price,
              price: formatPrice(match.price),
              fuel_type: match.fuelType || variant.fuel_type,
              transmission: match.transmission || variant.transmission
            })
            .eq('id', variant.id);
          results.variantsUpdated++;
        }
      }
    }

    // Update car price range
    if (data.priceRange.min > 0) {
      const priceRange = data.priceRange.min === data.priceRange.max 
        ? formatPrice(data.priceRange.min)
        : `${formatPrice(data.priceRange.min)} - ${formatPrice(data.priceRange.max)}`;
      
      await supabase
        .from('cars')
        .update({
          price_range: priceRange,
          price_numeric: data.priceRange.min,
          last_verified_at: new Date().toISOString()
        })
        .eq('id', carId);
    }

    console.log(`Updated ${brand} ${model}: +${results.colorsAdded} colors, +${results.specsAdded} specs, +${results.featuresAdded} features, ${results.variantsUpdated} variants`);
  } catch (error) {
    console.error('Database update error:', error);
  }

  return results;
}

function formatPrice(price: number): string {
  if (price >= 10000000) {
    return `₹${(price / 10000000).toFixed(2)} Cr`;
  }
  return `₹${(price / 100000).toFixed(2)} Lakh`;
}

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

// Background batch processing
async function processBatchInBackground(
  supabase: ReturnType<typeof createClient>,
  limit: number,
  priorityBrands?: string[]
): Promise<void> {
  console.log(`\n=== COMPREHENSIVE DATA ENRICHMENT ===\n`);

  try {
    // Get cars that need enrichment (missing colors, specs, or features)
    let query = supabase
      .from('cars')
      .select('id, name, brand')
      .eq('is_discontinued', false);
    
    if (priorityBrands && priorityBrands.length > 0) {
      query = query.in('brand', priorityBrands);
    }
    
    const { data: allCars } = await query;
    
    // Filter to cars missing data
    const carsNeedingData: { id: string; name: string; brand: string }[] = [];
    
    for (const car of allCars || []) {
      const [colors, specs, features] = await Promise.all([
        supabase.from('car_colors').select('id').eq('car_id', car.id).limit(1),
        supabase.from('car_specifications').select('id').eq('car_id', car.id).limit(1),
        supabase.from('car_features').select('id').eq('car_id', car.id).limit(1)
      ]);
      
      if (!colors.data?.length || !specs.data?.length || !features.data?.length) {
        carsNeedingData.push(car);
      }
      
      if (carsNeedingData.length >= limit) break;
    }

    console.log(`Processing ${carsNeedingData.length} cars for enrichment...\n`);

    let totalColors = 0, totalSpecs = 0, totalFeatures = 0, totalVariants = 0;

    for (const car of carsNeedingData) {
      console.log(`\n>>> ${car.brand} ${car.name}`);
      
      const data = await scrapeCarDataCardekho(car.brand, car.name);
      
      if (data) {
        const results = await updateCarData(supabase, car.id, car.brand, car.name, data);
        totalColors += results.colorsAdded;
        totalSpecs += results.specsAdded;
        totalFeatures += results.featuresAdded;
        totalVariants += results.variantsUpdated;
      }
      
      // Rate limiting between cars
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n=== ENRICHMENT COMPLETE ===`);
    console.log(`Added: ${totalColors} colors, ${totalSpecs} specs, ${totalFeatures} features`);
    console.log(`Updated: ${totalVariants} variant prices\n`);
  } catch (error) {
    console.error('Background enrichment error:', error);
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
      'Honda', 'Toyota', 'Kia', 'MG', 'Renault', 'Nissan',
      'Skoda', 'Volkswagen', 'Citroen'
    ];

    // Async batch mode
    if (body.batchMode && body.async) {
      const limit = body.limit || 30;
      const brands = body.brands || massMarketBrands;
      EdgeRuntime.waitUntil(processBatchInBackground(supabase, limit, brands));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Background enrichment started for ${limit} cars (colors, specs, features, pricing)`, 
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

      const data = await scrapeCarDataCardekho(car.brand, car.name);
      if (data) {
        const results = await updateCarData(supabase, car.id, car.brand, car.name, data);
        return new Response(
          JSON.stringify({ success: true, ...results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Could not scrape data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync batch mode
    if (body.batchMode) {
      const limit = body.limit || 5;
      const brands = body.brands || massMarketBrands;
      
      // Get cars missing data
      const { data: cars } = await supabase
        .from('cars')
        .select('id, name, brand')
        .in('brand', brands)
        .eq('is_discontinued', false)
        .limit(limit * 3);

      const results = [];
      let processed = 0;
      
      for (const car of cars || []) {
        if (processed >= limit) break;
        
        // Check if needs enrichment
        const [colors, specs] = await Promise.all([
          supabase.from('car_colors').select('id').eq('car_id', car.id).limit(1),
          supabase.from('car_specifications').select('id').eq('car_id', car.id).limit(1)
        ]);
        
        if (!colors.data?.length || !specs.data?.length) {
          const data = await scrapeCarDataCardekho(car.brand, car.name);
          if (data) {
            const updateResults = await updateCarData(supabase, car.id, car.brand, car.name, data);
            results.push({ car: `${car.brand} ${car.name}`, ...updateResults });
          }
          processed++;
          await new Promise(r => setTimeout(r, 2000));
        }
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
