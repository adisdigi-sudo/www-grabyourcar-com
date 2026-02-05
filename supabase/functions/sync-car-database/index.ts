import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CarFromDB {
  id: string;
  slug: string;
  name: string;
  brand: string;
  body_type: string;
  tagline: string;
  price_range: string;
  price_numeric: number;
  original_price: string;
  discount: string;
  overview: string;
  availability: string;
  is_hot: boolean;
  is_limited: boolean;
  is_new: boolean;
  is_upcoming: boolean;
  launch_date: string | null;
  fuel_types: string[];
  transmission_types: string[];
  key_highlights: string[];
  pros: string[];
  cons: string[];
  competitors: string[];
  created_at: string;
  updated_at: string;
}

interface SpecFromDB {
  id: string;
  car_id: string;
  category: string;
  label: string;
  value: string;
  sort_order: number;
}

interface VariantFromDB {
  id: string;
  car_id: string;
  name: string;
  price: string;
  price_numeric: number | null;
  fuel_type: string | null;
  transmission: string | null;
  features: string[];
  ex_showroom: number | null;
  rto: number | null;
  insurance: number | null;
  tcs: number | null;
  fastag: number;
  registration: number;
  handling: number;
  on_road_price: number | null;
  sort_order: number;
}

interface ColorFromDB {
  id: string;
  car_id: string;
  name: string;
  hex_code: string;
  sort_order: number;
}

interface ImageFromDB {
  id: string;
  car_id: string;
  url: string;
  is_primary: boolean;
  alt_text: string | null;
  sort_order: number;
}

interface OfferFromDB {
  id: string;
  car_id: string;
  title: string;
  description: string | null;
  discount: string;
  valid_till: string | null;
  offer_type: string;
  is_active: boolean;
  sort_order: number;
}

interface FeatureFromDB {
  id: string;
  car_id: string;
  category: string;
  feature_name: string;
  is_standard: boolean;
  variant_specific: string[] | null;
  sort_order: number;
}

interface BrochureFromDB {
  id: string;
  car_id: string;
  title: string;
  url: string;
  variant_name: string | null;
  file_size: string | null;
  language: string;
  sort_order: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const brand = url.searchParams.get('brand');
    const bodyType = url.searchParams.get('bodyType');
    const isUpcoming = url.searchParams.get('isUpcoming');

    // Build query
    let query = supabase.from('cars').select('*');

    if (slug) {
      query = query.eq('slug', slug);
    }
    if (brand && brand !== 'All') {
      query = query.eq('brand', brand);
    }
    if (bodyType && bodyType !== 'All') {
      query = query.eq('body_type', bodyType);
    }
    if (isUpcoming === 'true') {
      query = query.eq('is_upcoming', true);
    }

    const { data: cars, error: carsError } = await query.order('name');

    if (carsError) {
      console.error('Cars query error:', carsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch cars' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!cars || cars.length === 0) {
      return new Response(
        JSON.stringify({ success: true, cars: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const carIds = cars.map((c: CarFromDB) => c.id);

    // Fetch all related data in parallel
    const [specsResult, variantsResult, colorsResult, imagesResult, offersResult, featuresResult, brochuresResult] = await Promise.all([
      supabase.from('car_specifications').select('*').in('car_id', carIds).order('sort_order'),
      supabase.from('car_variants').select('*').in('car_id', carIds).order('sort_order'),
      supabase.from('car_colors').select('*').in('car_id', carIds).order('sort_order'),
      supabase.from('car_images').select('*').in('car_id', carIds).order('sort_order'),
      supabase.from('car_offers').select('*').in('car_id', carIds).eq('is_active', true).order('sort_order'),
      supabase.from('car_features').select('*').in('car_id', carIds).order('sort_order'),
      supabase.from('car_brochures').select('*').in('car_id', carIds).order('sort_order')
    ]);

    const specs = specsResult.data || [];
    const variants = variantsResult.data || [];
    const colors = colorsResult.data || [];
    const images = imagesResult.data || [];
    const offers = offersResult.data || [];
    const features = featuresResult.data || [];
    const brochures = brochuresResult.data || [];

    // Group data by car_id
    const groupByCarId = <T extends { car_id: string }>(items: T[]): Record<string, T[]> => {
      return items.reduce((acc, item) => {
        if (!acc[item.car_id]) acc[item.car_id] = [];
        acc[item.car_id].push(item);
        return acc;
      }, {} as Record<string, T[]>);
    };

    const specsByCarId = groupByCarId(specs as SpecFromDB[]);
    const variantsByCarId = groupByCarId(variants as VariantFromDB[]);
    const colorsByCarId = groupByCarId(colors as ColorFromDB[]);
    const imagesByCarId = groupByCarId(images as ImageFromDB[]);
    const offersByCarId = groupByCarId(offers as OfferFromDB[]);
    const featuresByCarId = groupByCarId(features as FeatureFromDB[]);
    const brochuresByCarId = groupByCarId(brochures as BrochureFromDB[]);

    // Transform to frontend format
    const transformedCars = cars.map((car: CarFromDB) => {
      const carSpecs = specsByCarId[car.id] || [];
      const carVariants = variantsByCarId[car.id] || [];
      const carColors = colorsByCarId[car.id] || [];
      const carImages = imagesByCarId[car.id] || [];
      const carOffers = offersByCarId[car.id] || [];
      const carFeatures = featuresByCarId[car.id] || [];
      const carBrochures = brochuresByCarId[car.id] || [];

      // Group features by category
      const featuresGrouped: Record<string, string[]> = {};
      carFeatures.forEach((feature: FeatureFromDB) => {
        if (!featuresGrouped[feature.category]) {
          featuresGrouped[feature.category] = [];
        }
        featuresGrouped[feature.category].push(feature.feature_name);
      });

      // Group specifications by category
      const specifications: Record<string, { label: string; value: string }[]> = {
        engine: [],
        dimensions: [],
        performance: [],
        features: [],
        safety: []
      };

      carSpecs.forEach((spec: SpecFromDB) => {
        if (specifications[spec.category]) {
          specifications[spec.category].push({
            label: spec.label,
            value: spec.value
          });
        }
      });

      // Get primary image or first image
      const primaryImage = carImages.find((img: ImageFromDB) => img.is_primary) || carImages[0];

      return {
        id: car.id,
        slug: car.slug,
        name: car.name,
        brand: car.brand,
        bodyType: car.body_type,
        tagline: car.tagline,
        image: primaryImage?.url || '/placeholder.svg',
        gallery: carImages.map((img: ImageFromDB) => img.url),
        price: car.price_range,
        priceNumeric: car.price_numeric,
        originalPrice: car.original_price,
        discount: car.discount,
        fuelTypes: car.fuel_types || [],
        transmission: car.transmission_types || [],
        availability: car.availability,
        isHot: car.is_hot,
        isLimited: car.is_limited,
        isNew: car.is_new,
        isUpcoming: car.is_upcoming,
        launchDate: car.launch_date,
        overview: car.overview,
        keyHighlights: car.key_highlights || [],
        specifications,
        colors: carColors.map((color: ColorFromDB) => ({
          name: color.name,
          hex: color.hex_code
        })),
        variants: carVariants.map((variant: VariantFromDB) => ({
          name: variant.name,
          price: variant.price,
          priceNumeric: variant.price_numeric,
          features: variant.features || [],
          fuelType: variant.fuel_type,
          transmission: variant.transmission,
          priceBreakup: variant.ex_showroom ? {
            exShowroom: variant.ex_showroom,
            rto: variant.rto,
            insurance: variant.insurance,
            tcs: variant.tcs,
            fastag: variant.fastag,
            registration: variant.registration,
            handling: variant.handling,
            onRoadPrice: variant.on_road_price
          } : undefined
        })),
        offers: carOffers.map((offer: OfferFromDB) => ({
          id: offer.id,
          title: offer.title,
          description: offer.description,
          discount: offer.discount,
          validTill: offer.valid_till,
          type: offer.offer_type
        })),
        pros: car.pros || [],
        cons: car.cons || [],
        competitors: car.competitors || [],
        featuresGrouped,
        brochures: carBrochures.map((brochure: BrochureFromDB) => ({
          id: brochure.id,
          title: brochure.title,
          url: brochure.url,
          variantName: brochure.variant_name,
          fileSize: brochure.file_size,
          language: brochure.language
        }))
      };
    });

    console.log(`Returning ${transformedCars.length} cars`);

    return new Response(
      JSON.stringify({
        success: true,
        cars: slug ? transformedCars[0] : transformedCars
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
