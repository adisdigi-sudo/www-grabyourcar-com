import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// New brands entering Indian market with their models
const NEW_BRANDS_DATA = {
  'Tesla': {
    country: 'USA',
    is_luxury: true,
    models: [
      { name: 'Model 3', segment: 'Sedan', expectedPrice: '₹40-50 Lakh', launchDate: 'Q2 2025' },
      { name: 'Model Y', segment: 'SUV', expectedPrice: '₹50-60 Lakh', launchDate: 'Q3 2025' },
      { name: 'Model S', segment: 'Luxury Sedan', expectedPrice: '₹1.2-1.5 Cr', launchDate: 'Q4 2025' },
      { name: 'Model X', segment: 'Luxury SUV', expectedPrice: '₹1.5-1.8 Cr', launchDate: 'Q4 2025' },
      { name: 'Cybertruck', segment: 'Pickup', expectedPrice: '₹80 Lakh - 1 Cr', launchDate: '2026' },
    ]
  },
  'VinFast': {
    country: 'Vietnam',
    is_luxury: false,
    models: [
      { name: 'VF e34', segment: 'Compact SUV', expectedPrice: '₹20-25 Lakh', launchDate: 'Q1 2025' },
      { name: 'VF 5', segment: 'Mini SUV', expectedPrice: '₹12-15 Lakh', launchDate: 'Q1 2025' },
      { name: 'VF 6', segment: 'Compact SUV', expectedPrice: '₹18-22 Lakh', launchDate: 'Q2 2025' },
      { name: 'VF 7', segment: 'Mid-Size SUV', expectedPrice: '₹30-35 Lakh', launchDate: 'Q2 2025' },
      { name: 'VF 8', segment: 'Mid-Size SUV', expectedPrice: '₹45-55 Lakh', launchDate: 'Q3 2025' },
      { name: 'VF 9', segment: 'Full-Size SUV', expectedPrice: '₹70-80 Lakh', launchDate: 'Q4 2025' },
    ]
  },
  'Rivian': {
    country: 'USA',
    is_luxury: true,
    models: [
      { name: 'R1T', segment: 'Electric Pickup', expectedPrice: '₹80 Lakh - 1 Cr', launchDate: '2026' },
      { name: 'R1S', segment: 'Electric SUV', expectedPrice: '₹85 Lakh - 1.1 Cr', launchDate: '2026' },
      { name: 'R2', segment: 'Compact SUV', expectedPrice: '₹50-60 Lakh', launchDate: '2026' },
    ]
  },
  'Lucid': {
    country: 'USA',
    is_luxury: true,
    models: [
      { name: 'Air Pure', segment: 'Luxury Sedan', expectedPrice: '₹1.2-1.4 Cr', launchDate: '2026' },
      { name: 'Air Touring', segment: 'Luxury Sedan', expectedPrice: '₹1.5-1.8 Cr', launchDate: '2026' },
      { name: 'Air Grand Touring', segment: 'Luxury Sedan', expectedPrice: '₹2-2.5 Cr', launchDate: '2026' },
      { name: 'Gravity', segment: 'Luxury SUV', expectedPrice: '₹1.8-2.2 Cr', launchDate: '2027' },
    ]
  },
  'Polestar': {
    country: 'Sweden',
    is_luxury: true,
    models: [
      { name: 'Polestar 2', segment: 'Electric Sedan', expectedPrice: '₹55-65 Lakh', launchDate: 'Q4 2025' },
      { name: 'Polestar 3', segment: 'Electric SUV', expectedPrice: '₹80-95 Lakh', launchDate: '2026' },
      { name: 'Polestar 4', segment: 'Electric Coupe SUV', expectedPrice: '₹70-85 Lakh', launchDate: '2026' },
    ]
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    const { brands = ['Tesla', 'VinFast'] } = await req.json().catch(() => ({}));
    
    const results: any[] = [];
    
    for (const brandName of brands) {
      const brandData = NEW_BRANDS_DATA[brandName as keyof typeof NEW_BRANDS_DATA];
      if (!brandData) {
        results.push({ brand: brandName, status: 'skipped', reason: 'Brand not configured' });
        continue;
      }
      
      console.log(`Processing brand: ${brandName}`);
      
      // 1. Create or update brand in car_brands table
      const brandSlug = brandName.toLowerCase().replace(/\s+/g, '-');
      const { data: existingBrand } = await supabase
        .from('car_brands')
        .select('id')
        .eq('slug', brandSlug)
        .single();
      
      let brandId: string;
      if (!existingBrand) {
        const { data: newBrand, error: brandError } = await supabase
          .from('car_brands')
          .insert({
            name: brandName,
            slug: brandSlug,
            country: brandData.country,
            is_luxury: brandData.is_luxury,
            is_active: true
          })
          .select('id')
          .single();
        
        if (brandError) {
          console.error(`Failed to create brand ${brandName}:`, brandError);
          results.push({ brand: brandName, status: 'error', error: brandError.message });
          continue;
        }
        brandId = newBrand.id;
        console.log(`Created new brand: ${brandName} (${brandId})`);
      } else {
        brandId = existingBrand.id;
        console.log(`Brand exists: ${brandName} (${brandId})`);
      }
      
      // 2. Add each model as upcoming car
      const modelResults: any[] = [];
      for (const model of brandData.models) {
        const carSlug = `${brandSlug}-${model.name.toLowerCase().replace(/\s+/g, '-')}`;
        
        // Check if car already exists
        const { data: existingCar } = await supabase
          .from('cars')
          .select('id')
          .eq('slug', carSlug)
          .single();
        
        if (existingCar) {
          modelResults.push({ model: model.name, status: 'exists' });
          continue;
        }
        
        // Parse expected price range
        const priceMatch = model.expectedPrice.match(/₹([\d.]+)(?:-([\d.]+))?\s*(Lakh|Cr)?/i);
        let priceMin = 0, priceMax = 0;
        if (priceMatch) {
          const unit = priceMatch[3]?.toLowerCase() === 'cr' ? 10000000 : 100000;
          priceMin = parseFloat(priceMatch[1]) * unit;
          priceMax = priceMatch[2] ? parseFloat(priceMatch[2]) * unit : priceMin * 1.2;
        }
        
        // Determine body type from segment
        let bodyType = 'SUV';
        if (model.segment.includes('Sedan')) bodyType = 'Sedan';
        else if (model.segment.includes('Pickup')) bodyType = 'Pickup';
        else if (model.segment.includes('Compact')) bodyType = 'Compact SUV';
        else if (model.segment.includes('Mid-Size')) bodyType = 'Mid-Size SUV';
        else if (model.segment.includes('Full-Size')) bodyType = 'Full-Size SUV';
        else if (model.segment.includes('Mini')) bodyType = 'Compact SUV';
        else if (model.segment.includes('Coupe')) bodyType = 'Coupe';
        
        // Convert launch date string to proper date
        let launchDate: string | null = null;
        const launchStr = model.launchDate;
        if (launchStr.includes('Q1')) launchDate = `${launchStr.match(/\d{4}/)?.[0] || '2025'}-03-31`;
        else if (launchStr.includes('Q2')) launchDate = `${launchStr.match(/\d{4}/)?.[0] || '2025'}-06-30`;
        else if (launchStr.includes('Q3')) launchDate = `${launchStr.match(/\d{4}/)?.[0] || '2025'}-09-30`;
        else if (launchStr.includes('Q4')) launchDate = `${launchStr.match(/\d{4}/)?.[0] || '2025'}-12-31`;
        else if (/^\d{4}$/.test(launchStr)) launchDate = `${launchStr}-06-30`;
        
        const { error: carError } = await supabase
          .from('cars')
          .insert({
            name: model.name,
            slug: carSlug,
            brand: brandName,
            body_type: bodyType,
            is_upcoming: true,
            is_new: true,
            launch_date: launchDate,
            expected_price_min: priceMin,
            expected_price_max: priceMax,
            price_range: model.expectedPrice,
            fuel_types: ['Electric'],
            transmission_types: ['Automatic'],
            tagline: `The all-new ${brandName} ${model.name} - Coming to India`,
            overview: `${brandName} ${model.name} is an upcoming ${model.segment.toLowerCase()} expected to launch in India in ${model.launchDate}. Expected price range: ${model.expectedPrice}.`,
            key_highlights: [
              'All-Electric Powertrain',
              'Advanced Driver Assistance',
              'Premium Connected Features',
              'Fast Charging Support',
              'Over-the-Air Updates'
            ],
            availability: 'Coming Soon'
          });
        
        if (carError) {
          console.error(`Failed to create ${model.name}:`, carError);
          modelResults.push({ model: model.name, status: 'error', error: carError.message });
        } else {
          console.log(`Created: ${brandName} ${model.name}`);
          modelResults.push({ model: model.name, status: 'created' });
        }
      }
      
      results.push({
        brand: brandName,
        status: 'processed',
        models: modelResults
      });
    }
    
    // If Firecrawl is available, try to scrape additional data
    if (firecrawlKey) {
      console.log('Firecrawl available - attempting OEM data enrichment...');
      // This would trigger additional scraping for specs/images
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Processed ${brands.length} new brands with upcoming models`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-new-brands:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
