import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CarColor {
  id: string;
  name: string;
  hex: string;
  image?: string;
}

interface DatabaseCarColor {
  id: string;
  name: string;
  hex_code: string;
  image_url: string | null;
  sort_order: number | null;
}

interface CarImage {
  url: string;
  alt_text: string | null;
}

// Helper to find matching color image from car_images.
// Tries multiple strategies: exact alt match, normalized URL match, individual word match.
const findColorImageFromGallery = (colorName: string, images: CarImage[]): string | undefined => {
  if (!colorName || images.length === 0) return undefined;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const normColor = normalize(colorName);
  // individual significant words (skip generic ones)
  const stop = new Set(["color", "colour", "metallic", "pearl", "mica", "solid", "premium"]);
  const words = colorName
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stop.has(w));

  // 1) exact alt match
  let match = images.find((img) => img.alt_text && normalize(img.alt_text).includes(normColor));
  if (match) return match.url;

  // 2) URL contains normalized color
  match = images.find((img) => normalize(img.url).includes(normColor));
  if (match) return match.url;

  // 3) any significant word matches alt or URL
  for (const w of words) {
    match = images.find(
      (img) =>
        (img.alt_text && img.alt_text.toLowerCase().includes(w)) ||
        img.url.toLowerCase().includes(w),
    );
    if (match) return match.url;
  }

  return undefined;
};

// Fetch colors from database for a specific car
export const useCarColors = (carSlug: string | undefined) => {
  return useQuery({
    queryKey: ['carColors', carSlug],
    queryFn: async (): Promise<CarColor[]> => {
      if (!carSlug) return [];

      // First, get the car ID from slug
      const { data: car, error: carError } = await supabase
        .from('cars')
        .select('id')
        .eq('slug', carSlug)
        .single();

      if (carError || !car) {
        console.log('Car not found in database, using static colors');
        return [];
      }

      // Fetch colors and images in parallel
      const [colorsResult, imagesResult] = await Promise.all([
        supabase
          .from('car_colors')
          .select('*')
          .eq('car_id', car.id)
          .order('sort_order'),
        supabase
          .from('car_images')
          .select('url, alt_text')
          .eq('car_id', car.id)
          .order('sort_order')
      ]);

      if (colorsResult.error) {
        console.error('Error fetching colors:', colorsResult.error);
        return [];
      }

      const colors = colorsResult.data as DatabaseCarColor[];
      const images = (imagesResult.data || []) as CarImage[];

      // Transform to the format expected by ColorGalleryViewer
      // Try to match color images from car_images if not directly set
      return colors.map(color => {
        let imageUrl = color.image_url;
        
        // If no direct image, try to find from gallery
        if (!imageUrl) {
          imageUrl = findColorImageFromGallery(color.name, images) || null;
        }
        
        return {
          id: color.id,
          name: color.name,
          hex: color.hex_code,
          image: imageUrl || undefined,
        };
      });
    },
    enabled: !!carSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Fetch car gallery images from database
export const useCarGalleryImages = (carSlug: string | undefined) => {
  return useQuery({
    queryKey: ['carGalleryImages', carSlug],
    queryFn: async (): Promise<string[]> => {
      if (!carSlug) return [];

      // Get car ID from slug
      const { data: car, error: carError } = await supabase
        .from('cars')
        .select('id')
        .eq('slug', carSlug)
        .single();

      if (carError || !car) {
        return [];
      }

      // Fetch all images for this car
      const { data: images, error: imagesError } = await supabase
        .from('car_images')
        .select('url, is_primary, sort_order')
        .eq('car_id', car.id)
        .order('is_primary', { ascending: false })
        .order('sort_order');

      if (imagesError || !images) {
        return [];
      }

      return images.map(img => img.url);
    },
    enabled: !!carSlug,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch all colors for all cars (admin use)
export const useAllCarColors = () => {
  return useQuery({
    queryKey: ['allCarColors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('car_colors')
        .select(`
          *,
          cars (
            id,
            name,
            brand,
            slug
          )
        `)
        .order('sort_order');

      if (error) {
        console.error('Error fetching all colors:', error);
        return [];
      }

      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
};
