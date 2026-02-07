import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Complete model URLs for each brand
const BRAND_MODELS: Record<string, { name: string; url: string; bodyType: string }[]> = {
  'Tata': [
    { name: 'Nexon', url: 'https://cars.tatamotors.com/suv/nexon', bodyType: 'Compact SUV' },
    { name: 'Nexon EV', url: 'https://cars.tatamotors.com/ev/nexon-ev', bodyType: 'Compact SUV' },
    { name: 'Punch', url: 'https://cars.tatamotors.com/suv/punch', bodyType: 'Compact SUV' },
    { name: 'Punch EV', url: 'https://cars.tatamotors.com/ev/punch-ev', bodyType: 'Compact SUV' },
    { name: 'Harrier', url: 'https://cars.tatamotors.com/suv/harrier', bodyType: 'Mid-Size SUV' },
    { name: 'Safari', url: 'https://cars.tatamotors.com/suv/safari', bodyType: 'Full-Size SUV' },
    { name: 'Curvv', url: 'https://cars.tatamotors.com/suv/curvv', bodyType: 'Compact SUV' },
    { name: 'Curvv EV', url: 'https://cars.tatamotors.com/ev/curvv-ev', bodyType: 'Compact SUV' },
    { name: 'Tiago', url: 'https://cars.tatamotors.com/hatchback/tiago', bodyType: 'Hatchback' },
    { name: 'Tiago EV', url: 'https://cars.tatamotors.com/ev/tiago-ev', bodyType: 'Hatchback' },
    { name: 'Tigor', url: 'https://cars.tatamotors.com/sedan/tigor', bodyType: 'Sedan' },
    { name: 'Tigor EV', url: 'https://cars.tatamotors.com/ev/tigor-ev', bodyType: 'Sedan' },
    { name: 'Altroz', url: 'https://cars.tatamotors.com/hatchback/altroz', bodyType: 'Hatchback' },
  ],
  'Mahindra': [
    { name: 'Thar', url: 'https://auto.mahindra.com/suv/thar', bodyType: 'Compact SUV' },
    { name: 'Thar Roxx', url: 'https://auto.mahindra.com/suv/thar-roxx', bodyType: 'Mid-Size SUV' },
    { name: 'XUV700', url: 'https://auto.mahindra.com/suv/xuv700', bodyType: 'Full-Size SUV' },
    { name: 'XUV400', url: 'https://auto.mahindra.com/electric/xuv400', bodyType: 'Compact SUV' },
    { name: 'XUV 3XO', url: 'https://auto.mahindra.com/suv/xuv-3xo', bodyType: 'Compact SUV' },
    { name: 'Scorpio N', url: 'https://auto.mahindra.com/suv/scorpio-n', bodyType: 'Full-Size SUV' },
    { name: 'Scorpio Classic', url: 'https://auto.mahindra.com/suv/scorpio-classic', bodyType: 'Full-Size SUV' },
    { name: 'Bolero', url: 'https://auto.mahindra.com/suv/bolero', bodyType: 'MUV' },
    { name: 'Bolero Neo', url: 'https://auto.mahindra.com/suv/bolero-neo', bodyType: 'MUV' },
    { name: 'Marazzo', url: 'https://auto.mahindra.com/mpv/marazzo', bodyType: 'MPV' },
    { name: 'BE 6', url: 'https://auto.mahindra.com/electric/be-6', bodyType: 'Mid-Size SUV' },
    { name: 'XEV 9e', url: 'https://auto.mahindra.com/electric/xev-9e', bodyType: 'Full-Size SUV' },
  ],
  'Kia': [
    { name: 'Seltos', url: 'https://www.kia.com/in/our-vehicles/seltos/showroom.html', bodyType: 'Compact SUV' },
    { name: 'Sonet', url: 'https://www.kia.com/in/our-vehicles/sonet/showroom.html', bodyType: 'Compact SUV' },
    { name: 'Carens', url: 'https://www.kia.com/in/our-vehicles/carens/showroom.html', bodyType: 'MPV' },
    { name: 'EV6', url: 'https://www.kia.com/in/our-vehicles/ev6/showroom.html', bodyType: 'Mid-Size SUV' },
    { name: 'EV9', url: 'https://www.kia.com/in/our-vehicles/ev9/showroom.html', bodyType: 'Full-Size SUV' },
    { name: 'Syros', url: 'https://www.kia.com/in/our-vehicles/syros/showroom.html', bodyType: 'Compact SUV' },
    { name: 'Carnival', url: 'https://www.kia.com/in/our-vehicles/carnival/showroom.html', bodyType: 'MPV' },
  ],
};

// Price data for each model (as of 2025)
const MODEL_PRICES: Record<string, { min: number; max: number }> = {
  // Tata
  'Tata Nexon': { min: 799000, max: 1550000 },
  'Tata Nexon EV': { min: 1449000, max: 2000000 },
  'Tata Punch': { min: 608000, max: 1050000 },
  'Tata Punch EV': { min: 1099000, max: 1499000 },
  'Tata Harrier': { min: 1549000, max: 2665000 },
  'Tata Safari': { min: 1649000, max: 2800000 },
  'Tata Curvv': { min: 999000, max: 1899000 },
  'Tata Curvv EV': { min: 1749000, max: 2199000 },
  'Tata Tiago': { min: 549000, max: 875000 },
  'Tata Tiago EV': { min: 799000, max: 1199000 },
  'Tata Tigor': { min: 629000, max: 899000 },
  'Tata Tigor EV': { min: 1199000, max: 1549000 },
  'Tata Altroz': { min: 699000, max: 1125000 },
  // Mahindra
  'Mahindra Thar': { min: 1099000, max: 1825000 },
  'Mahindra Thar Roxx': { min: 1279000, max: 2279000 },
  'Mahindra XUV700': { min: 1399000, max: 2645000 },
  'Mahindra XUV400': { min: 1599000, max: 1929000 },
  'Mahindra XUV 3XO': { min: 799000, max: 1659000 },
  'Mahindra Scorpio N': { min: 1399000, max: 2465000 },
  'Mahindra Scorpio Classic': { min: 1399000, max: 1749000 },
  'Mahindra Bolero': { min: 999000, max: 1099000 },
  'Mahindra Bolero Neo': { min: 999000, max: 1249000 },
  'Mahindra Marazzo': { min: 1449000, max: 1849000 },
  'Mahindra BE 6': { min: 1899000, max: 2690000 },
  'Mahindra XEV 9e': { min: 2199000, max: 3090000 },
  // Kia
  'Kia Seltos': { min: 1099000, max: 2095000 },
  'Kia Sonet': { min: 799000, max: 1600000 },
  'Kia Carens': { min: 1099000, max: 1999000 },
  'Kia EV6': { min: 6095000, max: 6595000 },
  'Kia EV9': { min: 14790000, max: 18490000 },
  'Kia Syros': { min: 899000, max: 1499000 },
  'Kia Carnival': { min: 3099000, max: 3499000 },
};

interface ExtractRequest {
  brand: 'Tata' | 'Mahindra' | 'Kia';
  action: 'extract_all' | 'extract_model';
  modelName?: string;
}

async function scrapeCarPage(apiKey: string, url: string): Promise<any> {
  console.log(`Scraping: ${url}`);

  try {
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
  } catch (error) {
    console.error(`Scrape exception for ${url}:`, error);
    return null;
  }
}

function parseVariantsFromMarkdown(markdown: string, brand: string, modelName: string): any[] {
  const variants: any[] = [];
  const priceInfo = MODEL_PRICES[`${brand} ${modelName}`];
  
  // Common variant patterns
  const variantPatterns = [
    // Pattern: Variant Name | Price format
    /\|\s*([A-Za-z0-9\s\+\-\.]+)\s*\|\s*₹?\s*([\d,\.]+)\s*(?:Lakh|L|Lakhs?)?\s*\|/gi,
    // Pattern: Variant Name - ₹ Price
    /(?:^|\n)([A-Z][a-zA-Z0-9\s\+\-\.]+(?:MT|AT|AMT|CVT|DCT|Plus|Pro|Premium|Base)?)\s*[-–:]\s*₹?\s*([\d,\.]+)\s*(?:Lakh|L)?/gmi,
    // Pattern with Rs. 
    /([A-Z][a-zA-Z0-9\s\+\-\.]+)\s+Rs\.?\s*([\d,\.]+)\s*(?:Lakh)?/gi,
  ];

  for (const pattern of variantPatterns) {
    const matches = [...markdown.matchAll(pattern)];
    for (const match of matches) {
      let variantName = match[1].trim();
      let priceStr = match[2].replace(/,/g, '');
      let priceNumeric = parseFloat(priceStr);
      
      // If price looks like lakhs (< 100), convert
      if (priceNumeric < 100) {
        priceNumeric *= 100000;
      }
      
      // Validate price is reasonable for a car
      if (priceNumeric < 300000 || priceNumeric > 100000000) continue;
      
      // Skip if variant name is too short or looks like noise
      if (variantName.length < 2 || /^[0-9]+$/.test(variantName)) continue;
      
      // Determine fuel type and transmission from variant name
      let fuelType = 'Petrol';
      if (/diesel|d\b|dsl/i.test(variantName)) fuelType = 'Diesel';
      else if (/ev|electric|e\b/i.test(variantName)) fuelType = 'Electric';
      else if (/cng/i.test(variantName)) fuelType = 'CNG';
      else if (/hybrid/i.test(variantName)) fuelType = 'Hybrid';
      
      let transmission = 'Manual';
      if (/at\b|automatic|amt|cvt|dct|torque\s*converter/i.test(variantName)) {
        transmission = 'Automatic';
      }
      
      // Check for duplicates
      if (!variants.find(v => v.name.toLowerCase() === variantName.toLowerCase())) {
        variants.push({
          name: variantName,
          price: `₹ ${(priceNumeric / 100000).toFixed(2)} Lakh`,
          price_numeric: priceNumeric,
          fuel_type: fuelType,
          transmission,
          features: [],
        });
      }
    }
  }

  // If no variants found, create from price range
  if (variants.length === 0 && priceInfo) {
    variants.push({
      name: `${modelName} Base`,
      price: `₹ ${(priceInfo.min / 100000).toFixed(2)} Lakh`,
      price_numeric: priceInfo.min,
      fuel_type: 'Petrol',
      transmission: 'Manual',
      features: [],
    });
    variants.push({
      name: `${modelName} Top`,
      price: `₹ ${(priceInfo.max / 100000).toFixed(2)} Lakh`,
      price_numeric: priceInfo.max,
      fuel_type: 'Petrol',
      transmission: 'Automatic',
      features: [],
    });
  }

  return variants.slice(0, 15); // Limit to 15 variants
}

function parseColorsFromMarkdown(markdown: string): any[] {
  const colors: any[] = [];
  const colorMap: Record<string, string> = {
    'pristine white': '#FFFFFF',
    'pearl white': '#F8F6F0',
    'arctic white': '#E8E8E8',
    'glacier white': '#F0F0F0',
    'daytona grey': '#505050',
    'ash grey': '#696969',
    'starlight blue': '#1E3A5F',
    'atlas black': '#0A0A0A',
    'midnight black': '#1A1A1A',
    'napoli black': '#151515',
    'flame red': '#DC143C',
    'tropical mist': '#7CB9E8',
    'mint blue': '#98D8C8',
    'sizzling red': '#FF2E00',
    'coral red': '#FF6F61',
    'grassland beige': '#D4C4A8',
    'fearless purple': '#663399',
    'imperial blue': '#002366',
    'dazzle silver': '#C0C0C0',
    'gravity grey': '#808080',
    'aurora borealis': '#00CED1',
    'everest white': '#FEFEFE',
    'magma grey': '#505050',
    'royal gold': '#DAA520',
    'tango red': '#E94B3C',
    'aurora pearl': '#F5DEB3',
    'glacier blue': '#68A8DB',
    'deep forest': '#228B22',
    'mineral blue': '#4E8CB9',
    'sunlit yellow': '#FFD700',
    'pure grey': '#BEBEBE',
    'intensity red': '#CC0000',
    'galaxy blue': '#000080',
    'silky silver': '#D0D0D0',
    'titanium brown': '#8B4513',
    'pewter grey': '#8E8E8E',
  };

  // Find color mentions in text
  const colorPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:colour|color|finish)/gi;
  const matches = [...markdown.matchAll(colorPattern)];
  
  for (const match of matches) {
    const colorName = match[1].trim();
    const key = colorName.toLowerCase();
    if (colorMap[key] && !colors.find(c => c.name.toLowerCase() === key)) {
      colors.push({ name: colorName, hex_code: colorMap[key] });
    }
  }

  // Also check for standalone color names
  const standaloneColors = ['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Brown', 'Beige', 'Gold'];
  for (const color of standaloneColors) {
    const regex = new RegExp(`\\b${color}\\b`, 'gi');
    if (regex.test(markdown) && !colors.find(c => c.name.toLowerCase() === color.toLowerCase())) {
      const defaultHex: Record<string, string> = {
        white: '#FFFFFF', black: '#000000', silver: '#C0C0C0', grey: '#808080',
        red: '#FF0000', blue: '#0000FF', green: '#228B22', yellow: '#FFD700',
        orange: '#FFA500', brown: '#8B4513', beige: '#F5F5DC', gold: '#DAA520'
      };
      colors.push({ name: color, hex_code: defaultHex[color.toLowerCase()] || '#808080' });
    }
  }

  return colors.slice(0, 10);
}

function parseSpecsFromMarkdown(markdown: string): any[] {
  const specs: any[] = [];
  
  const specPatterns = [
    { pattern: /(\d+(?:\.\d+)?)\s*(?:cc|CC)/i, category: 'engine', label: 'Engine Displacement', suffix: 'cc' },
    { pattern: /(\d+(?:\.\d+)?)\s*(?:bhp|BHP|hp|HP|PS)/i, category: 'engine', label: 'Max Power', suffix: 'bhp' },
    { pattern: /(\d+(?:\.\d+)?)\s*(?:Nm|nm)/i, category: 'engine', label: 'Max Torque', suffix: 'Nm' },
    { pattern: /(\d+(?:\.\d+)?)\s*(?:kmpl|km\/l|KMPL)/i, category: 'performance', label: 'Mileage', suffix: 'km/l' },
    { pattern: /(\d+(?:\.\d+)?)\s*(?:kWh)/i, category: 'engine', label: 'Battery Capacity', suffix: 'kWh' },
    { pattern: /(\d+)\s*(?:km|KM)\s*(?:range)?/i, category: 'performance', label: 'Range', suffix: 'km' },
    { pattern: /0-100\s*(?:kmph|km\/h)?\s*(?:in)?\s*(\d+(?:\.\d+)?)\s*(?:sec|s)?/i, category: 'performance', label: '0-100 km/h', suffix: 's' },
    { pattern: /(\d+)\s*mm\s*(?:length|L\b)/i, category: 'dimensions', label: 'Length', suffix: 'mm' },
    { pattern: /(\d+)\s*mm\s*(?:width|W\b)/i, category: 'dimensions', label: 'Width', suffix: 'mm' },
    { pattern: /(\d+)\s*mm\s*(?:height|H\b)/i, category: 'dimensions', label: 'Height', suffix: 'mm' },
    { pattern: /(\d+)\s*mm\s*wheelbase/i, category: 'dimensions', label: 'Wheelbase', suffix: 'mm' },
    { pattern: /boot\s*(?:space|capacity)?\s*[:\s]*(\d+)\s*(?:L|litres|liters)/i, category: 'dimensions', label: 'Boot Space', suffix: 'L' },
    { pattern: /(\d+)\s*(?:L|litres|liters)\s*(?:fuel|tank)/i, category: 'dimensions', label: 'Fuel Tank', suffix: 'L' },
    { pattern: /(\d+)\s*airbags?/i, category: 'safety', label: 'Airbags', suffix: '' },
    { pattern: /(\d+(?:\.\d+)?)\s*(?:inch|")\s*(?:touchscreen|display|infotainment)/i, category: 'features', label: 'Touchscreen', suffix: ' inch' },
  ];

  for (const { pattern, category, label, suffix } of specPatterns) {
    const match = markdown.match(pattern);
    if (match && !specs.find(s => s.label === label)) {
      specs.push({
        category,
        label,
        value: `${match[1]}${suffix}`,
      });
    }
  }

  return specs;
}

function extractKeyHighlights(markdown: string): string[] {
  const highlights: string[] = [];
  
  // Common feature keywords
  const featurePatterns = [
    /panoramic\s*sunroof/i,
    /wireless\s*charging/i,
    /ventilated\s*seats?/i,
    /heated\s*seats?/i,
    /360[\s-]*degree\s*camera/i,
    /blind\s*spot\s*monitoring/i,
    /lane\s*(?:keep|departure)\s*assist/i,
    /adaptive\s*cruise\s*control/i,
    /auto(?:matic)?\s*emergency\s*braking/i,
    /ADAS|adas/,
    /connected\s*car/i,
    /OTA\s*updates?/i,
    /fast\s*charging/i,
    /regenerative\s*braking/i,
    /hill\s*(?:start|hold|descent)/i,
    /terrain\s*response/i,
    /4x4|4WD|AWD/i,
    /front\s*parking\s*sensors?/i,
    /rear\s*parking\s*sensors?/i,
    /keyless\s*entry/i,
    /push\s*button\s*start/i,
    /leather\s*(?:seats?|upholstery)/i,
    /ambient\s*lighting/i,
    /air\s*purifier/i,
    /boss\s*mode/i,
    /captain\s*seats?/i,
    /electric\s*tailgate/i,
    /hands[\s-]*free\s*tailgate/i,
    /head[\s-]*up\s*display/i,
    /multi[\s-]*zone\s*(?:climate|ac)/i,
  ];

  for (const pattern of featurePatterns) {
    const match = markdown.match(pattern);
    if (match) {
      let feature = match[0].trim();
      // Clean up feature name
      feature = feature.charAt(0).toUpperCase() + feature.slice(1).toLowerCase();
      if (!highlights.includes(feature)) {
        highlights.push(feature);
      }
    }
  }

  return highlights.slice(0, 8);
}

async function processCarModel(
  supabase: any,
  apiKey: string, 
  brand: string, 
  model: { name: string; url: string; bodyType: string }
): Promise<{ success: boolean; carId?: string; error?: string }> {
  const fullName = `${brand} ${model.name}`;
  const priceInfo = MODEL_PRICES[fullName];
  
  // Scrape the page
  const scrapedData = await scrapeCarPage(apiKey, model.url);
  const markdown = scrapedData?.markdown || '';
  
  // Parse data
  const variants = parseVariantsFromMarkdown(markdown, brand, model.name);
  const colors = parseColorsFromMarkdown(markdown);
  const specs = parseSpecsFromMarkdown(markdown);
  const highlights = extractKeyHighlights(markdown);
  
  // Determine fuel types
  const fuelTypes: string[] = [];
  if (/petrol/i.test(markdown) || !/ev|electric/i.test(model.name)) fuelTypes.push('Petrol');
  if (/diesel/i.test(markdown)) fuelTypes.push('Diesel');
  if (/ev|electric/i.test(model.name) || /electric|ev|battery/i.test(markdown)) fuelTypes.push('Electric');
  if (/cng/i.test(markdown)) fuelTypes.push('CNG');
  if (/hybrid/i.test(markdown)) fuelTypes.push('Hybrid');
  if (fuelTypes.length === 0) fuelTypes.push('Petrol');
  
  // Determine transmissions
  const transmissions: string[] = [];
  if (/manual|mt\b/i.test(markdown)) transmissions.push('Manual');
  if (/automatic|at\b/i.test(markdown)) transmissions.push('Automatic');
  if (/amt/i.test(markdown)) transmissions.push('AMT');
  if (/cvt/i.test(markdown)) transmissions.push('CVT');
  if (/dct|dual.?clutch/i.test(markdown)) transmissions.push('DCT');
  if (/imt/i.test(markdown)) transmissions.push('iMT');
  if (transmissions.length === 0) transmissions.push('Manual', 'Automatic');
  
  // Generate slug
  const slug = `${brand.toLowerCase().replace(/\s+/g, '-')}-${model.name.toLowerCase().replace(/\s+/g, '-')}`;
  
  // Price info
  const priceNumeric = priceInfo?.min || 0;
  const priceRange = priceInfo 
    ? `₹ ${(priceInfo.min / 100000).toFixed(2)} - ${(priceInfo.max / 100000).toFixed(2)} Lakh`
    : 'Price on Request';
  
  // Generate overview
  const overview = `The ${fullName} is a ${model.bodyType.toLowerCase()} that offers ${fuelTypes.join(', ')} options with ${transmissions.join(' and ')} transmission${transmissions.length > 1 ? 's' : ''}. ${priceRange !== 'Price on Request' ? `Starting at ${priceRange.split(' - ')[0]}, ` : ''}it features ${highlights.slice(0, 3).join(', ') || 'modern design and advanced technology'}.`;
  
  try {
    // Check if car exists
    const { data: existingCar } = await supabase
      .from('cars')
      .select('id')
      .eq('slug', slug)
      .single();
    
    let carId: string;
    
    if (existingCar) {
      // Update
      const { error: updateError } = await supabase
        .from('cars')
        .update({
          name: model.name,
          body_type: model.bodyType,
          price_range: priceRange,
          price_numeric: priceNumeric,
          fuel_types: fuelTypes,
          transmission_types: transmissions,
          overview,
          key_highlights: highlights,
          official_url: model.url,
          is_new: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCar.id);
      
      if (updateError) throw updateError;
      carId = existingCar.id;
    } else {
      // Insert
      const { data: newCar, error: insertError } = await supabase
        .from('cars')
        .insert({
          name: model.name,
          brand,
          slug,
          body_type: model.bodyType,
          price_range: priceRange,
          price_numeric: priceNumeric,
          fuel_types: fuelTypes,
          transmission_types: transmissions,
          overview,
          key_highlights: highlights,
          official_url: model.url,
          is_new: true,
          availability: 'In Stock',
        })
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      carId = newCar.id;
    }
    
    // Insert variants
    if (variants.length > 0) {
      await supabase.from('car_variants').delete().eq('car_id', carId);
      
      const variantsToInsert = variants.map((v, idx) => ({
        car_id: carId,
        name: v.name,
        price: v.price,
        price_numeric: v.price_numeric,
        fuel_type: v.fuel_type,
        transmission: v.transmission,
        features: v.features,
        sort_order: idx,
      }));
      
      await supabase.from('car_variants').insert(variantsToInsert);
    }
    
    // Insert colors
    if (colors.length > 0) {
      await supabase.from('car_colors').delete().eq('car_id', carId);
      
      const colorsToInsert = colors.map((c, idx) => ({
        car_id: carId,
        name: c.name,
        hex_code: c.hex_code,
        sort_order: idx,
      }));
      
      await supabase.from('car_colors').insert(colorsToInsert);
    }
    
    // Insert specifications
    if (specs.length > 0) {
      await supabase.from('car_specifications').delete().eq('car_id', carId);
      
      const specsToInsert = specs.map((s, idx) => ({
        car_id: carId,
        category: s.category,
        label: s.label,
        value: s.value,
        sort_order: idx,
      }));
      
      await supabase.from('car_specifications').insert(specsToInsert);
    }
    
    console.log(`✓ Processed: ${fullName}`);
    return { success: true, carId };
    
  } catch (error) {
    console.error(`✗ Failed: ${fullName}`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, action, modelName }: ExtractRequest = await req.json();

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

    const models = BRAND_MODELS[brand];
    if (!models) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown brand: ${brand}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'extract_model' && modelName) {
      const model = models.find(m => m.name.toLowerCase() === modelName.toLowerCase());
      if (!model) {
        return new Response(
          JSON.stringify({ success: false, error: `Model not found: ${modelName}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const result = await processCarModel(supabase, apiKey, brand, model);
      return new Response(
        JSON.stringify({ success: true, brand, model: model.name, result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'extract_all') {
      const results: any[] = [];
      const errors: any[] = [];
      
      for (const model of models) {
        const result = await processCarModel(supabase, apiKey, brand, model);
        
        if (result.success) {
          results.push({ name: model.name, carId: result.carId });
        } else {
          errors.push({ name: model.name, error: result.error });
        }
        
        // Small delay between requests
        await new Promise(r => setTimeout(r, 500));
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          brand,
          totalModels: models.length,
          processed: results.length,
          results,
          errors,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Use extract_all or extract_model' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in batch-extract-brands:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
