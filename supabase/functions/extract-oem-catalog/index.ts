import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OEM Website configurations
const OEM_CONFIG: Record<string, {
  baseUrl: string;
  modelsUrl: string;
  carPatterns: RegExp[];
  pricePattern: RegExp;
}> = {
  'Tata': {
    baseUrl: 'https://cars.tatamotors.com',
    modelsUrl: 'https://cars.tatamotors.com',
    carPatterns: [/\/cars\/[a-z0-9-]+\/?$/i, /\/suv\/[a-z0-9-]+\/?$/i, /\/ev\/[a-z0-9-]+\/?$/i],
    pricePattern: /₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh|Cr)?/gi,
  },
  'Mahindra': {
    baseUrl: 'https://auto.mahindra.com',
    modelsUrl: 'https://auto.mahindra.com',
    carPatterns: [/\/suv\/[a-z0-9-]+\/?$/i, /\/electric\/[a-z0-9-]+\/?$/i],
    pricePattern: /₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh|Cr)?/gi,
  },
  'Kia': {
    baseUrl: 'https://www.kia.com/in',
    modelsUrl: 'https://www.kia.com/in/our-vehicles.html',
    carPatterns: [/\/our-vehicles\/[a-z0-9-]+\/?/i],
    pricePattern: /₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh|Cr)?/gi,
  },
  'Toyota': {
    baseUrl: 'https://www.toyotabharat.com',
    modelsUrl: 'https://www.toyotabharat.com/car-range',
    carPatterns: [/\/car-range\/[a-z0-9-]+\/?$/i, /\/showroom\/[a-z0-9-]+\/?$/i],
    pricePattern: /₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh|Cr)?/gi,
  },
  'VinFast': {
    baseUrl: 'https://vinfastauto.in',
    modelsUrl: 'https://vinfastauto.in/en',
    carPatterns: [/\/en\/vehicles\/[a-z0-9-]+\/?$/i, /\/en\/vf[0-9]+\/?$/i],
    pricePattern: /₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh|Cr)?/gi,
  },
  'Hyundai': {
    baseUrl: 'https://www.hyundai.com/in/en',
    modelsUrl: 'https://www.hyundai.com/in/en/find-a-car/all-vehicles',
    carPatterns: [/\/find-a-car\/[a-z0-9-]+\/?$/i, /\/[a-z0-9-]+\/highlights\/?$/i],
    pricePattern: /₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh|Cr)?/gi,
  },
  'MG': {
    baseUrl: 'https://www.mgmotor.co.in',
    modelsUrl: 'https://www.mgmotor.co.in',
    carPatterns: [/\/vehicles\/[a-z0-9-]+\/?$/i, /\/mg-[a-z0-9-]+\/?$/i],
    pricePattern: /₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh|Cr)?/gi,
  },
  'Honda': {
    baseUrl: 'https://www.hondacarindia.com',
    modelsUrl: 'https://www.hondacarindia.com/cars',
    carPatterns: [/\/cars\/[a-z0-9-]+\/?$/i, /\/[a-z0-9-]+\/overview\/?$/i],
    pricePattern: /₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh|Cr)?/gi,
  },
  'Skoda': {
    baseUrl: 'https://www.skoda-auto.co.in',
    modelsUrl: 'https://www.skoda-auto.co.in/models',
    carPatterns: [/\/models\/[a-z0-9-]+\/?$/i, /\/[a-z0-9-]+\/overview\/?$/i],
    pricePattern: /₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh|Cr)?/gi,
  },
  'Volkswagen': {
    baseUrl: 'https://www.volkswagen.co.in',
    modelsUrl: 'https://www.volkswagen.co.in/en/models.html',
    carPatterns: [/\/models\/[a-z0-9-]+\/?/i, /\/en\/[a-z0-9-]+\.html$/i],
    pricePattern: /₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh|Cr)?/gi,
  },
  'Tesla': {
    baseUrl: 'https://www.tesla.com',
    modelsUrl: 'https://www.tesla.com/en_in',
    carPatterns: [/\/model[sxy3]\/?$/i, /\/cybertruck\/?$/i, /\/semi\/?$/i],
    pricePattern: /₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh|Cr)?/gi,
  }
};

interface ExtractRequest {
  brand: 'Tata' | 'Mahindra' | 'Kia';
  action: 'map' | 'scrape_all' | 'scrape_model';
  modelUrl?: string;
}

async function mapBrandSite(apiKey: string, brand: string): Promise<{ success: boolean; links?: string[]; error?: string }> {
  const config = OEM_CONFIG[brand];
  if (!config) {
    return { success: false, error: `Unknown brand: ${brand}` };
  }

  console.log(`Mapping ${brand} site: ${config.modelsUrl}`);

  const response = await fetch('https://api.firecrawl.dev/v1/map', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: config.modelsUrl,
      limit: 200,
      includeSubdomains: true,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`Firecrawl map error for ${brand}:`, data);
    return { success: false, error: data.error || `Map failed with status ${response.status}` };
  }

  // Filter links to only include car model pages
  const carLinks = (data.links || []).filter((link: string) => {
    return config.carPatterns.some(pattern => pattern.test(link));
  });

  console.log(`Found ${carLinks.length} car model pages for ${brand}`);
  return { success: true, links: carLinks };
}

async function scrapeCarPage(apiKey: string, url: string): Promise<any> {
  console.log(`Scraping car page: ${url}`);

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'links'],
      onlyMainContent: true,
      waitFor: 5000,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`Scrape error for ${url}:`, data);
    return null;
  }

  return data.data || data;
}

function parseCarData(markdown: string, brand: string, url: string): any {
  const lines = markdown.split('\n').filter(l => l.trim());
  
  // Extract car name from URL or heading
  const urlParts = url.split('/');
  let modelSlug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
  modelSlug = modelSlug.replace('.html', '').replace(/[?#].*/, '');
  
  // Find heading (usually first h1 or h2)
  let carName = modelSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const headingMatch = markdown.match(/^#\s+(.+)$/m) || markdown.match(/^##\s+(.+)$/m);
  if (headingMatch) {
    carName = headingMatch[1].trim();
  }

  // Extract prices
  const priceMatches = [...markdown.matchAll(/₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh|Cr|Lakhs?)?/gi)];
  let priceNumeric = 0;
  let priceRange = '';
  
  if (priceMatches.length > 0) {
    const prices = priceMatches.map(m => {
      let val = parseFloat(m[1].replace(/,/g, ''));
      const unit = (m[2] || '').toLowerCase();
      if (unit.includes('cr')) val *= 100;
      return val * 100000; // Convert lakhs to rupees
    }).filter(p => p > 100000 && p < 100000000); // Filter reasonable car prices
    
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      priceNumeric = minPrice;
      
      if (minPrice === maxPrice) {
        priceRange = `₹ ${(minPrice / 100000).toFixed(2)} Lakh`;
      } else {
        priceRange = `₹ ${(minPrice / 100000).toFixed(2)} - ${(maxPrice / 100000).toFixed(2)} Lakh`;
      }
    }
  }

  // Extract fuel types
  const fuelTypes: string[] = [];
  if (/petrol/i.test(markdown)) fuelTypes.push('Petrol');
  if (/diesel/i.test(markdown)) fuelTypes.push('Diesel');
  if (/electric|ev|battery/i.test(markdown)) fuelTypes.push('Electric');
  if (/cng/i.test(markdown)) fuelTypes.push('CNG');
  if (/hybrid/i.test(markdown)) fuelTypes.push('Hybrid');

  // Extract transmission types
  const transmissionTypes: string[] = [];
  if (/manual|mt\b/i.test(markdown)) transmissionTypes.push('Manual');
  if (/automatic|at\b|amt\b/i.test(markdown)) transmissionTypes.push('Automatic');
  if (/cvt/i.test(markdown)) transmissionTypes.push('CVT');
  if (/dct|dual.?clutch/i.test(markdown)) transmissionTypes.push('DCT');

  // Extract body type
  let bodyType = 'SUV';
  if (/hatchback/i.test(markdown)) bodyType = 'Hatchback';
  else if (/sedan/i.test(markdown)) bodyType = 'Sedan';
  else if (/mpv|muv/i.test(markdown)) bodyType = 'MPV';
  else if (/compact.?suv|sub.?compact/i.test(markdown)) bodyType = 'Compact SUV';
  else if (/mid.?size.?suv/i.test(markdown)) bodyType = 'Mid-Size SUV';
  else if (/full.?size.?suv/i.test(markdown)) bodyType = 'Full-Size SUV';

  // Extract key highlights
  const highlights: string[] = [];
  const highlightPatterns = [
    /(\d+(?:\.\d+)?\s*(?:km|kmpl|kWh|bhp|hp|nm|torque))/gi,
    /(sunroof|panoramic|touchscreen|display|camera|airbag|abs|esp|adas|cruise.?control)/gi,
  ];
  
  for (const pattern of highlightPatterns) {
    const matches = markdown.match(pattern);
    if (matches) {
      highlights.push(...matches.slice(0, 3).map(m => m.trim()));
    }
  }

  // Extract variants from sections
  const variants: any[] = [];
  const variantPattern = /(?:^|\n)(?:#+\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Plus|Pro|Premium|Base|Top|Mid|Entry))?)\s*[-–]\s*₹\s*([\d,]+(?:\.\d+)?)\s*(Lakh)?/gmi;
  const variantMatches = [...markdown.matchAll(variantPattern)];
  
  for (const match of variantMatches.slice(0, 10)) {
    const name = match[1].trim();
    let price = parseFloat(match[2].replace(/,/g, ''));
    if (match[3]) price *= 100000;
    
    if (price > 100000 && !variants.find(v => v.name === name)) {
      variants.push({
        name,
        price: `₹ ${(price / 100000).toFixed(2)} Lakh`,
        price_numeric: price,
        features: [],
      });
    }
  }

  // Extract colors
  const colors: any[] = [];
  const colorPatterns = [
    /(white|black|silver|grey|gray|red|blue|orange|brown|green|yellow|gold|bronze|beige|pearl|metallic)/gi
  ];
  
  for (const pattern of colorPatterns) {
    const matches = markdown.match(pattern);
    if (matches) {
      const uniqueColors = [...new Set(matches.map(c => c.toLowerCase()))];
      for (const color of uniqueColors.slice(0, 8)) {
        const colorName = color.charAt(0).toUpperCase() + color.slice(1);
        const hexMap: Record<string, string> = {
          white: '#FFFFFF', black: '#000000', silver: '#C0C0C0', grey: '#808080', gray: '#808080',
          red: '#FF0000', blue: '#0000FF', orange: '#FFA500', brown: '#8B4513', green: '#008000',
          yellow: '#FFFF00', gold: '#FFD700', bronze: '#CD7F32', beige: '#F5F5DC', pearl: '#FDEEF4',
          metallic: '#AAA9AD'
        };
        colors.push({
          name: colorName,
          hex_code: hexMap[color] || '#808080',
        });
      }
    }
  }

  // Generate overview
  const overview = `The ${brand} ${carName} is a ${bodyType.toLowerCase()} that offers ${fuelTypes.join(', ') || 'multiple fuel'} options. ${priceRange ? `Starting at ${priceRange.split(' - ')[0]}, ` : ''}it features ${highlights.slice(0, 3).join(', ') || 'modern design and technology'}.`;

  return {
    name: carName,
    brand,
    slug: `${brand.toLowerCase().replace(/\s+/g, '-')}-${modelSlug}`,
    body_type: bodyType,
    price_range: priceRange || 'Price on Request',
    price_numeric: priceNumeric,
    fuel_types: fuelTypes.length > 0 ? fuelTypes : ['Petrol'],
    transmission_types: transmissionTypes.length > 0 ? transmissionTypes : ['Manual'],
    overview,
    key_highlights: [...new Set(highlights)].slice(0, 6),
    official_url: url,
    is_new: true,
    variants,
    colors,
  };
}

async function saveCarToDatabase(supabase: any, carData: any): Promise<{ success: boolean; carId?: string; error?: string }> {
  try {
    // Check if car already exists
    const { data: existingCar } = await supabase
      .from('cars')
      .select('id')
      .eq('slug', carData.slug)
      .single();

    let carId: string;

    if (existingCar) {
      // Update existing car
      const { error: updateError } = await supabase
        .from('cars')
        .update({
          name: carData.name,
          body_type: carData.body_type,
          price_range: carData.price_range,
          price_numeric: carData.price_numeric,
          fuel_types: carData.fuel_types,
          transmission_types: carData.transmission_types,
          overview: carData.overview,
          key_highlights: carData.key_highlights,
          official_url: carData.official_url,
          is_new: carData.is_new,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCar.id);

      if (updateError) throw updateError;
      carId = existingCar.id;
      console.log(`Updated existing car: ${carData.name}`);
    } else {
      // Insert new car
      const { data: newCar, error: insertError } = await supabase
        .from('cars')
        .insert({
          name: carData.name,
          brand: carData.brand,
          slug: carData.slug,
          body_type: carData.body_type,
          price_range: carData.price_range,
          price_numeric: carData.price_numeric,
          fuel_types: carData.fuel_types,
          transmission_types: carData.transmission_types,
          overview: carData.overview,
          key_highlights: carData.key_highlights,
          official_url: carData.official_url,
          is_new: carData.is_new,
          availability: 'In Stock',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      carId = newCar.id;
      console.log(`Inserted new car: ${carData.name}`);
    }

    // Insert variants
    if (carData.variants && carData.variants.length > 0) {
      // Delete existing variants first
      await supabase.from('car_variants').delete().eq('car_id', carId);
      
      const variantsToInsert = carData.variants.map((v: any, idx: number) => ({
        car_id: carId,
        name: v.name,
        price: v.price,
        price_numeric: v.price_numeric,
        fuel_type: carData.fuel_types[0],
        transmission: carData.transmission_types[0],
        features: v.features || [],
        sort_order: idx,
      }));

      const { error: variantError } = await supabase
        .from('car_variants')
        .insert(variantsToInsert);

      if (variantError) {
        console.error('Variant insert error:', variantError);
      }
    }

    // Insert colors
    if (carData.colors && carData.colors.length > 0) {
      // Delete existing colors first
      await supabase.from('car_colors').delete().eq('car_id', carId);
      
      const colorsToInsert = carData.colors.map((c: any, idx: number) => ({
        car_id: carId,
        name: c.name,
        hex_code: c.hex_code,
        sort_order: idx,
      }));

      const { error: colorError } = await supabase
        .from('car_colors')
        .insert(colorsToInsert);

      if (colorError) {
        console.error('Color insert error:', colorError);
      }
    }

    return { success: true, carId };
  } catch (error) {
    console.error('Database save error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, action, modelUrl }: ExtractRequest = await req.json();

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'map') {
      const result = await mapBrandSite(apiKey, brand);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'scrape_model' && modelUrl) {
      const scrapedData = await scrapeCarPage(apiKey, modelUrl);
      if (!scrapedData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to scrape model page' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const carData = parseCarData(scrapedData.markdown || '', brand, modelUrl);
      const saveResult = await saveCarToDatabase(supabase, carData);

      return new Response(
        JSON.stringify({ success: true, car: carData, saved: saveResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'scrape_all') {
      // First map the site to get all car URLs
      const mapResult = await mapBrandSite(apiKey, brand);
      if (!mapResult.success || !mapResult.links) {
        return new Response(
          JSON.stringify({ success: false, error: mapResult.error || 'No car pages found' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results: any[] = [];
      const errors: any[] = [];

      // Scrape each car page (limit to prevent timeout)
      const linksToScrape = mapResult.links.slice(0, 15);
      
      for (const link of linksToScrape) {
        try {
          console.log(`Processing: ${link}`);
          const scrapedData = await scrapeCarPage(apiKey, link);
          
          if (scrapedData && scrapedData.markdown) {
            const carData = parseCarData(scrapedData.markdown, brand, link);
            const saveResult = await saveCarToDatabase(supabase, carData);
            
            results.push({
              url: link,
              name: carData.name,
              saved: saveResult.success,
              carId: saveResult.carId,
            });
          } else {
            errors.push({ url: link, error: 'No content scraped' });
          }
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing ${link}:`, error);
          errors.push({ url: link, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          brand,
          totalFound: mapResult.links.length,
          processed: results.length,
          results,
          errors,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-oem-catalog:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
