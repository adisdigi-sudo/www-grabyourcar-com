import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  fetchCarsFromDatabase, 
  fetchCarBySlug, 
  getAllCars,
  enhanceCarWithAI,
  checkDatabaseHasCars
} from "@/lib/carDataService";
import { Car } from "@/data/cars/types";

// Hook to fetch all cars with real-time updates
export const useCars = (options?: {
  brand?: string;
  bodyType?: string;
  isUpcoming?: boolean;
  useDatabase?: boolean;
  enabled?: boolean;
}) => {
  const queryClient = useQueryClient();
  const useDatabase = options?.useDatabase ?? true; // Default to database now
  const enabled = options?.enabled ?? true;

  const query = useQuery({
    queryKey: ['cars', options],
    queryFn: async () => {
      // Database-only mode - no static fallback
      return fetchCarsFromDatabase({
        brand: options?.brand,
        bodyType: options?.bodyType,
        isUpcoming: options?.isUpcoming
      });
    },
    enabled,
    staleTime: 1000 * 30, // 30 seconds - shorter for real-time feel
    refetchOnWindowFocus: true,
  });

  // Real-time subscription for cars and related tables
  useEffect(() => {
    if (!useDatabase || !enabled) return;

    const tables = ['cars', 'car_images', 'car_colors', 'car_variants', 'car_specifications', 'car_features', 'car_brochures', 'car_offers'];
    const channelName = `cars-list-realtime-${Date.now()}`;
    const channel = tables.reduce((realtimeChannel, table) => {
      return realtimeChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          console.log(`[Cars] Real-time update from ${table}`);
          queryClient.invalidateQueries({ queryKey: ['cars'] });
          queryClient.invalidateQueries({ queryKey: ['allCars'] });
        }
      );
    }, supabase.channel(channelName));

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, useDatabase, queryClient]);

  return query;
};

// Hook to fetch a single car by slug with real-time updates
export const useCarBySlug = (slug: string | undefined, useDatabase = true) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['car', slug],
    queryFn: async () => {
      if (!slug) return null;
      // Database-only mode
      return fetchCarBySlug(slug);
    },
    enabled: !!slug,
    staleTime: 1000 * 10, // 10 seconds for faster updates
    refetchOnWindowFocus: true,
  });

  // Real-time subscription for car and all related tables
  useEffect(() => {
    if (!slug || !useDatabase) return;

    const tables = ['cars', 'car_images', 'car_colors', 'car_variants', 'car_specifications', 'car_features', 'car_brochures', 'car_offers'];
    const channelName = `car-${slug}-realtime-${Date.now()}`;
    const channel = tables.reduce((realtimeChannel, table) => {
      return realtimeChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          console.log(`[Car ${slug}] Real-time update from ${table}`);
          queryClient.invalidateQueries({ queryKey: ['car', slug] });
        }
      );
    }, supabase.channel(channelName));

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug, useDatabase, queryClient]);

  return query;
};

// Hook to get all cars (for admin) with real-time updates
export const useAllCars = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['allCars'],
    queryFn: async () => {
      // Database-only mode
      return getAllCars();
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('allCars-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cars' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['allCars'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// Hook to check if database has cars
export const useDatabaseStatus = () => {
  return useQuery({
    queryKey: ['databaseStatus'],
    queryFn: checkDatabaseHasCars,
    staleTime: 60 * 1000, // 1 minute
  });
};

// NOTE: Migration hook removed - database is now the single source of truth
// All data comes from official OEM sources

// Hook to enhance car with AI
export const useEnhanceCarAI = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ carId, enhanceType }: { 
      carId: string; 
      enhanceType: 'overview' | 'highlights' | 'pros_cons' | 'tagline' 
    }) => enhanceCarWithAI(carId, enhanceType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['allCars'] });
    }
  });
};

// Helper to get car count by brand
export const useCarCountByBrand = () => {
  const { data: cars } = useCars();
  
  if (!cars) return {};
  
  return cars.reduce((acc, car) => {
    acc[car.brand] = (acc[car.brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

// Helper to get unique brands
export const useUniqueBrands = () => {
  const { data: cars } = useCars();
  
  if (!cars) return [];
  
  return [...new Set(cars.map(c => c.brand))].sort();
};

// Helper to get unique body types
export const useUniqueBodyTypes = () => {
  const { data: cars } = useCars();
  
  if (!cars) return [];
  
  return [...new Set(cars.map(c => c.bodyType))].sort();
};
