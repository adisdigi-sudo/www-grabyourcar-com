import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CarData {
  slug: string;
  name: string;
  brand: string;
  bodyType: string;
  tagline: string;
  price: string;
  priceNumeric: number;
  originalPrice: string;
  discount: string;
  fuelTypes: string[];
  transmission: string[];
  availability: string;
  isHot: boolean;
  isLimited: boolean;
  isNew: boolean;
  isUpcoming: boolean;
  launchDate?: string;
  overview: string;
  keyHighlights: string[];
  specifications: {
    engine: { label: string; value: string }[];
    dimensions: { label: string; value: string }[];
    performance: { label: string; value: string }[];
    features: { label: string; value: string }[];
    safety: { label: string; value: string }[];
  };
  colors: { name: string; hex: string }[];
  variants: {
    name: string;
    price: string;
    priceNumeric?: number;
    features: string[];
    fuelType?: string;
    transmission?: string;
  }[];
  offers: {
    id: number;
    title: string;
    description: string;
    discount: string;
    validTill: string;
    type: string;
  }[];
  pros: string[];
  cons: string[];
  competitors: string[];
  image: string;
  gallery: string[];
  brochureUrl?: string;
}

// Helper function to parse launch date - handles formats like "Q1 2025", "February 2025", or ISO dates
function parseLaunchDate(launchDate: string | undefined): string | null {
  if (!launchDate) return null;
  
  // If it's already a valid ISO date, return it
  const isoDate = new Date(launchDate);
  if (!isNaN(isoDate.getTime()) && launchDate.includes('-')) {
    return launchDate;
  }
  
  // Handle quarter format like "Q1 2025", "Q2 2025", etc.
  const quarterMatch = launchDate.match(/Q(\d)\s*(\d{4})/i);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = parseInt(quarterMatch[2]);
    // Map quarter to first month of that quarter
    const month = (quarter - 1) * 3 + 1;
    return `${year}-${month.toString().padStart(2, '0')}-01`;
  }
  
  // Handle month year format like "February 2025", "Feb 2025"
  const monthYearMatch = launchDate.match(/([A-Za-z]+)\s*(\d{4})/);
  if (monthYearMatch) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                       'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = monthNames.findIndex(m => m.startsWith(monthYearMatch[1].toLowerCase()));
    if (monthIndex !== -1) {
      const year = parseInt(monthYearMatch[2]);
      return `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-01`;
    }
  }
  
  // Can't parse, return null instead of invalid date
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { cars } = await req.json() as { cars: CarData[] };

    if (!cars || !Array.isArray(cars)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cars array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Migrating ${cars.length} cars to database...`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process a single car - extracted for parallel processing
    const processCar = async (car: CarData): Promise<{ success: boolean; name: string; error?: string }> => {
      try {
        // Check if car already exists
        const { data: existingCar } = await supabase
          .from('cars')
          .select('id')
          .eq('slug', car.slug)
          .maybeSingle();

        let carId: string;

        if (existingCar) {
          // Update existing car
          const { error: updateError } = await supabase
            .from('cars')
            .update({
              name: car.name,
              brand: car.brand,
              body_type: car.bodyType,
              tagline: car.tagline,
              price_range: car.price,
              price_numeric: car.priceNumeric,
              original_price: car.originalPrice,
              discount: car.discount,
              overview: car.overview,
              availability: car.availability,
              is_hot: car.isHot,
              is_limited: car.isLimited,
              is_new: car.isNew,
              is_upcoming: car.isUpcoming,
              launch_date: parseLaunchDate(car.launchDate),
              fuel_types: car.fuelTypes,
              transmission_types: car.transmission,
              key_highlights: car.keyHighlights,
              pros: car.pros,
              cons: car.cons,
              competitors: car.competitors,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCar.id);

          if (updateError) throw updateError;
          carId = existingCar.id;

          // Delete existing related data to replace with new
          await Promise.all([
            supabase.from('car_specifications').delete().eq('car_id', carId),
            supabase.from('car_variants').delete().eq('car_id', carId),
            supabase.from('car_colors').delete().eq('car_id', carId),
            supabase.from('car_images').delete().eq('car_id', carId),
            supabase.from('car_offers').delete().eq('car_id', carId),
            supabase.from('car_features').delete().eq('car_id', carId),
            supabase.from('car_brochures').delete().eq('car_id', carId)
          ]);
        } else {
          // Insert new car
          const { data: newCar, error: insertError } = await supabase
            .from('cars')
            .insert({
              slug: car.slug,
              name: car.name,
              brand: car.brand,
              body_type: car.bodyType,
              tagline: car.tagline,
              price_range: car.price,
              price_numeric: car.priceNumeric,
              original_price: car.originalPrice,
              discount: car.discount,
              overview: car.overview,
              availability: car.availability,
              is_hot: car.isHot,
              is_limited: car.isLimited,
              is_new: car.isNew,
              is_upcoming: car.isUpcoming,
              launch_date: parseLaunchDate(car.launchDate),
              fuel_types: car.fuelTypes,
              transmission_types: car.transmission,
              key_highlights: car.keyHighlights,
              pros: car.pros,
              cons: car.cons,
              competitors: car.competitors
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          carId = newCar.id;
        }

        // Insert all related data in parallel
        const insertPromises: PromiseLike<unknown>[] = [];

        // Insert specifications
        const specCategories = ['engine', 'dimensions', 'performance', 'features', 'safety'] as const;
        const featuresToInsert: { car_id: string; category: string; feature_name: string; is_standard: boolean; sort_order: number }[] = [];
        
        for (const category of specCategories) {
          const specs = car.specifications[category];
          if (specs && specs.length > 0) {
            const specData = specs.map((spec, index) => ({
              car_id: carId,
              category,
              label: spec.label,
              value: spec.value,
              sort_order: index
            }));
            insertPromises.push(supabase.from('car_specifications').insert(specData).then(() => {}));
            
            // Extract features from 'features' and 'safety' spec categories
            if (category === 'features' || category === 'safety') {
              specs.forEach((spec, index) => {
                featuresToInsert.push({
                  car_id: carId,
                  category: category === 'safety' ? 'Safety' : 'Comfort',
                  feature_name: `${spec.label}: ${spec.value}`,
                  is_standard: true,
                  sort_order: featuresToInsert.length + index
                });
              });
            }
          }
        }
        
        // Insert extracted features
        if (featuresToInsert.length > 0) {
          insertPromises.push(supabase.from('car_features').insert(featuresToInsert).then(() => {}));
        }

        // Insert variants
        if (car.variants && car.variants.length > 0) {
          const variantData = car.variants.map((variant, index) => ({
            car_id: carId,
            name: variant.name,
            price: variant.price,
            price_numeric: variant.priceNumeric || null,
            fuel_type: variant.fuelType || null,
            transmission: variant.transmission || null,
            features: variant.features,
            sort_order: index
          }));
          insertPromises.push(supabase.from('car_variants').insert(variantData).then(() => {}));
        }

        // Insert colors
        if (car.colors && car.colors.length > 0) {
          const colorData = car.colors.map((color, index) => ({
            car_id: carId,
            name: color.name,
            hex_code: color.hex,
            sort_order: index
          }));
          insertPromises.push(supabase.from('car_colors').insert(colorData).then(() => {}));
        }

        // Insert images
        const images = [car.image, ...car.gallery.filter(img => img !== car.image)];
        if (images.length > 0) {
          const imageData = images.map((url, index) => ({
            car_id: carId,
            url,
            is_primary: index === 0,
            alt_text: `${car.name} - Image ${index + 1}`,
            sort_order: index
          }));
          insertPromises.push(supabase.from('car_images').insert(imageData).then(() => {}));
        }

        // Insert offers
        if (car.offers && car.offers.length > 0) {
          const offerData = car.offers.map((offer, index) => ({
            car_id: carId,
            title: offer.title,
            description: offer.description,
            discount: offer.discount,
            valid_till: offer.validTill,
            offer_type: offer.type,
            sort_order: index
          }));
          insertPromises.push(supabase.from('car_offers').insert(offerData).then(() => {}));
        }

        // Insert brochure URL as brochure record
        if (car.brochureUrl) {
          const brochureData = {
            car_id: carId,
            title: `${car.name} Brochure`,
            url: car.brochureUrl,
            language: 'English',
            sort_order: 0
          };
          insertPromises.push(supabase.from('car_brochures').insert(brochureData).then(() => {}));
        }

        await Promise.all(insertPromises);
        
        return { success: true, name: car.name };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, name: car.name, error: errorMessage };
      }
    };

    // Process cars in parallel batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < cars.length; i += BATCH_SIZE) {
      const batch = cars.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(processCar));
      
      for (const result of batchResults) {
        if (result.success) {
          results.success++;
          console.log(`Successfully migrated: ${result.name}`);
        } else {
          results.failed++;
          results.errors.push(`${result.name}: ${result.error}`);
          console.error(`Failed to migrate ${result.name}:`, result.error);
        }
      }
      
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(cars.length / BATCH_SIZE)} complete`);
    }

    console.log(`Migration complete: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
