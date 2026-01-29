import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CarBrochure {
  id: string;
  car_id: string;
  title: string;
  url: string;
  variant_name: string | null;
  file_size: string | null;
  language: string | null;
  sort_order: number | null;
}

export interface CarWithBrochure {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price_range: string | null;
  brochure_url: string | null;
  car_brochures: CarBrochure[];
  car_images: { url: string; is_primary: boolean }[];
}

export const useBrochures = (options?: { brand?: string; search?: string }) => {
  return useQuery({
    queryKey: ["brochures", options],
    queryFn: async () => {
      let query = supabase
        .from("cars")
        .select(`
          id,
          slug,
          name,
          brand,
          price_range,
          brochure_url,
          car_brochures (
            id,
            title,
            url,
            variant_name,
            file_size,
            language,
            sort_order
          ),
          car_images (
            url,
            is_primary
          )
        `)
        .eq("is_discontinued", false)
        .order("brand", { ascending: true })
        .order("name", { ascending: true });

      if (options?.brand) {
        query = query.eq("brand", options.brand);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching brochures:", error);
        throw error;
      }

      // Filter cars that have brochures (either in car_brochures table or brochure_url)
      const carsWithBrochures = (data || []).filter(
        (car) =>
          (car.car_brochures && car.car_brochures.length > 0) || car.brochure_url
      );

      // Apply search filter if provided
      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        return carsWithBrochures.filter(
          (car) =>
            car.name.toLowerCase().includes(searchLower) ||
            car.brand.toLowerCase().includes(searchLower)
        );
      }

      return carsWithBrochures as CarWithBrochure[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAllCarsForBrochures = () => {
  return useQuery({
    queryKey: ["all-cars-brochures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cars")
        .select(`
          id,
          slug,
          name,
          brand,
          price_range,
          brochure_url,
          car_brochures (
            id,
            title,
            url,
            variant_name,
            file_size,
            language,
            sort_order
          ),
          car_images (
            url,
            is_primary
          )
        `)
        .eq("is_discontinued", false)
        .order("brand", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching cars for brochures:", error);
        throw error;
      }

      return (data || []) as CarWithBrochure[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useBrochureBrands = () => {
  const { data: cars } = useAllCarsForBrochures();

  if (!cars) return [];

  // Get unique brands that have cars with brochures
  const brandsWithBrochures = cars
    .filter(
      (car) =>
        (car.car_brochures && car.car_brochures.length > 0) || car.brochure_url
    )
    .map((car) => car.brand);

  return [...new Set(brandsWithBrochures)].sort();
};
