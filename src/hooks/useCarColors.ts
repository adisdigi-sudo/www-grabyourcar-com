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

      // Fetch colors for this car
      const { data: colors, error: colorsError } = await supabase
        .from('car_colors')
        .select('*')
        .eq('car_id', car.id)
        .order('sort_order');

      if (colorsError) {
        console.error('Error fetching colors:', colorsError);
        return [];
      }

      // Transform to the format expected by ColorGalleryViewer
      return (colors as DatabaseCarColor[]).map(color => ({
        id: color.id,
        name: color.name,
        hex: color.hex_code,
        image: color.image_url || undefined,
      }));
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
