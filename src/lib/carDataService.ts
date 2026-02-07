import { supabase } from "@/integrations/supabase/client";
import { allCars as staticCars, Car } from "@/data/cars";

interface FetchCarsOptions {
  slug?: string;
  brand?: string;
  bodyType?: string;
  isUpcoming?: boolean;
}

interface DatabaseCar {
  id: string;
  slug: string;
  name: string;
  brand: string;
  bodyType: string;
  tagline: string;
  image: string;
  gallery: string[];
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
    priceBreakup?: {
      exShowroom: number;
      rto: number;
      insurance: number;
      tcs: number;
      fastag: number;
      registration: number;
      handling: number;
      onRoadPrice: number;
    };
  }[];
  offers: {
    id: string;
    title: string;
    description: string;
    discount: string;
    validTill: string;
    type: string;
  }[];
  pros: string[];
  cons: string[];
  competitors: string[];
}

// Convert database car to static car format for compatibility
const convertToStaticFormat = (dbCar: DatabaseCar): Car => ({
  id: typeof dbCar.id === 'string' ? parseInt(dbCar.id.substring(0, 8), 16) : dbCar.id as unknown as number,
  slug: dbCar.slug,
  name: dbCar.name,
  brand: dbCar.brand,
  bodyType: dbCar.bodyType,
  tagline: dbCar.tagline || '',
  image: dbCar.image,
  gallery: dbCar.gallery || [],
  price: dbCar.price,
  priceNumeric: dbCar.priceNumeric,
  originalPrice: dbCar.originalPrice || '',
  discount: dbCar.discount || '',
  fuelTypes: dbCar.fuelTypes || [],
  transmission: dbCar.transmission || [],
  availability: dbCar.availability || 'Available',
  isHot: dbCar.isHot || false,
  isLimited: dbCar.isLimited || false,
  isNew: dbCar.isNew || false,
  isUpcoming: dbCar.isUpcoming || false,
  launchDate: dbCar.launchDate,
  overview: dbCar.overview || '',
  keyHighlights: dbCar.keyHighlights || [],
  specifications: dbCar.specifications || {
    engine: [],
    dimensions: [],
    performance: [],
    features: [],
    safety: []
  },
  colors: dbCar.colors || [],
  variants: dbCar.variants?.map(v => ({
    ...v,
    priceBreakup: v.priceBreakup ? {
      exShowroom: v.priceBreakup.exShowroom,
      rto: v.priceBreakup.rto,
      insurance: v.priceBreakup.insurance,
      tcs: v.priceBreakup.tcs,
      fastag: v.priceBreakup.fastag,
      registration: v.priceBreakup.registration,
      handling: v.priceBreakup.handling,
      onRoadPrice: v.priceBreakup.onRoadPrice
    } : undefined
  })) || [],
  offers: dbCar.offers?.map(o => ({
    id: typeof o.id === 'string' ? parseInt(o.id.substring(0, 8), 16) : o.id as unknown as number,
    title: o.title,
    description: o.description,
    discount: o.discount,
    validTill: o.validTill,
    type: o.type as "cashback" | "accessory" | "exchange" | "finance"
  })) || [],
  pros: dbCar.pros || [],
  cons: dbCar.cons || [],
  competitors: dbCar.competitors || []
});

// Fetch cars from database with fallback to static data
export const fetchCarsFromDatabase = async (options: FetchCarsOptions = {}): Promise<Car[]> => {
  try {
    // Build query to fetch cars directly from database
    let query = supabase.from('cars').select(`
      id, slug, name, brand, body_type, tagline, price_range, price_numeric,
      original_price, discount, fuel_types, transmission_types, availability,
      is_hot, is_limited, is_new, is_upcoming, launch_date, overview, key_highlights,
      pros, cons, competitors,
      car_images(url, alt_text, is_primary, sort_order),
      car_colors(id, name, hex_code, image_url, sort_order),
      car_variants(id, name, price, price_numeric, fuel_type, transmission, features, ex_showroom, rto, insurance, tcs, fastag, registration, handling, on_road_price, sort_order),
      car_specifications(category, label, value, sort_order),
      car_offers(id, title, description, discount, valid_till, offer_type, sort_order)
    `);

    // Apply filters
    if (options.slug) {
      query = query.eq('slug', options.slug);
    }
    if (options.brand && options.brand !== 'All') {
      query = query.eq('brand', options.brand);
    }
    if (options.bodyType && options.bodyType !== 'All') {
      query = query.eq('body_type', options.bodyType);
    }
    if (options.isUpcoming) {
      query = query.eq('is_upcoming', true);
    }

    const { data: dbCars, error } = await query.order('brand').order('name');

    if (error) {
      console.error('Database fetch error:', error);
      return filterStaticCars(options);
    }

    if (!dbCars || dbCars.length === 0) {
      console.log('No cars in database, using static data');
      return filterStaticCars(options);
    }

    // Transform database cars to static format
    const cars = dbCars.map((car: any) => {
      // Get primary image
      const primaryImage = car.car_images?.find((img: any) => img.is_primary)?.url 
        || car.car_images?.[0]?.url 
        || '/placeholder.svg';
      
      // Build gallery
      const gallery = car.car_images
        ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((img: any) => img.url) || [];

      // Build specifications object
      const specifications: Car['specifications'] = {
        engine: [],
        dimensions: [],
        performance: [],
        features: [],
        safety: []
      };
      
      car.car_specifications?.forEach((spec: any) => {
        const category = spec.category as keyof typeof specifications;
        if (specifications[category]) {
          specifications[category].push({ label: spec.label, value: spec.value });
        }
      });

      // Build colors
      const colors = car.car_colors
        ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((c: any) => ({
          name: c.name,
          hex: c.hex_code,
          image: c.image_url || undefined
        })) || [];

      // Build variants
      const variants = car.car_variants
        ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((v: any) => ({
          name: v.name,
          price: v.price,
          priceNumeric: v.price_numeric,
          features: v.features || [],
          fuelType: v.fuel_type,
          transmission: v.transmission,
          priceBreakup: v.ex_showroom ? {
            exShowroom: v.ex_showroom,
            rto: v.rto || 0,
            insurance: v.insurance || 0,
            tcs: v.tcs || 0,
            fastag: v.fastag || 0,
            registration: v.registration || 0,
            handling: v.handling || 0,
            onRoadPrice: v.on_road_price || v.ex_showroom
          } : undefined
        })) || [];

      // Build offers
      const offers = car.car_offers
        ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((o: any, idx: number) => ({
          id: idx + 1,
          title: o.title,
          description: o.description || '',
          discount: o.discount,
          validTill: o.valid_till || '',
          type: o.offer_type as "cashback" | "accessory" | "exchange" | "finance"
        })) || [];

      return {
        id: car.id,
        slug: car.slug,
        name: car.name,
        brand: car.brand,
        bodyType: car.body_type || '',
        tagline: car.tagline || '',
        image: primaryImage,
        gallery,
        price: car.price_range || '',
        priceNumeric: car.price_numeric || 0,
        originalPrice: car.original_price || '',
        discount: car.discount || '',
        fuelTypes: car.fuel_types || [],
        transmission: car.transmission_types || [],
        availability: car.availability || 'Available',
        isHot: car.is_hot || false,
        isLimited: car.is_limited || false,
        isNew: car.is_new || false,
        isUpcoming: car.is_upcoming || false,
        launchDate: car.launch_date,
        overview: car.overview || '',
        keyHighlights: car.key_highlights || [],
        specifications,
        colors,
        variants,
        offers,
        pros: car.pros || [],
        cons: car.cons || [],
        competitors: car.competitors || []
      } as Car;
    });

    return cars;
  } catch (error) {
    console.error('Error fetching from database:', error);
    return filterStaticCars(options);
  }
};

// Filter static cars based on options
const filterStaticCars = (options: FetchCarsOptions): Car[] => {
  let cars = [...staticCars];
  
  if (options.slug) {
    cars = cars.filter(c => c.slug === options.slug);
  }
  if (options.brand && options.brand !== 'All') {
    cars = cars.filter(c => c.brand === options.brand);
  }
  if (options.bodyType && options.bodyType !== 'All') {
    cars = cars.filter(c => c.bodyType === options.bodyType);
  }
  if (options.isUpcoming) {
    cars = cars.filter(c => c.isUpcoming);
  }
  
  return cars;
};

// Fetch single car by slug
export const fetchCarBySlug = async (slug: string): Promise<Car | null> => {
  const cars = await fetchCarsFromDatabase({ slug });
  return cars[0] || null;
};

// Get all cars (database first, then static fallback)
export const getAllCars = async (): Promise<Car[]> => {
  return fetchCarsFromDatabase();
};

// Migrate static data to database
export const migrateStaticDataToDatabase = async (): Promise<{
  success: boolean;
  results?: { success: number; failed: number; errors: string[] };
  error?: string;
}> => {
  try {
    // Prepare cars data for migration (convert image imports to URLs)
    const carsToMigrate = staticCars.map(car => ({
      ...car,
      // Convert imported images to placeholder URLs for now
      // In production, you'd upload these to storage
      image: typeof car.image === 'string' ? car.image : '/placeholder.svg',
      gallery: car.gallery.map(img => typeof img === 'string' ? img : '/placeholder.svg')
    }));

    const { data, error } = await supabase.functions.invoke('migrate-car-data', {
      body: { cars: carsToMigrate }
    });

    if (error) {
      console.error('Migration error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      results: data?.results,
      error: data?.error
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    };
  }
};

// Enhance car data with AI
export const enhanceCarWithAI = async (
  carId: string,
  enhanceType: 'overview' | 'highlights' | 'pros_cons' | 'tagline'
): Promise<{
  success: boolean;
  generatedContent?: Record<string, unknown>;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('enhance-car-data', {
      body: { carId, enhanceType }
    });

    if (error) {
      console.error('Enhancement error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      generatedContent: data?.generatedContent,
      error: data?.error
    };
  } catch (error) {
    console.error('Enhancement failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Enhancement failed'
    };
  }
};

// Check if database has cars
export const checkDatabaseHasCars = async (): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('cars')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Count error:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch {
    return false;
  }
};
