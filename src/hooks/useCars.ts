import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchCarsFromDatabase, 
  fetchCarBySlug, 
  getAllCars,
  migrateStaticDataToDatabase,
  enhanceCarWithAI,
  checkDatabaseHasCars
} from "@/lib/carDataService";
import { allCars as staticCars, Car } from "@/data/cars";

// Hook to fetch all cars
export const useCars = (options?: {
  brand?: string;
  bodyType?: string;
  isUpcoming?: boolean;
  useDatabase?: boolean;
}) => {
  const useDatabase = options?.useDatabase ?? false;

  return useQuery({
    queryKey: ['cars', options],
    queryFn: async () => {
      if (useDatabase) {
        return fetchCarsFromDatabase({
          brand: options?.brand,
          bodyType: options?.bodyType,
          isUpcoming: options?.isUpcoming
        });
      }
      
      // Use static data by default for now
      let cars = [...staticCars];
      
      if (options?.brand && options.brand !== 'All') {
        cars = cars.filter(c => c.brand === options.brand);
      }
      if (options?.bodyType && options.bodyType !== 'All') {
        cars = cars.filter(c => c.bodyType === options.bodyType);
      }
      if (options?.isUpcoming) {
        cars = cars.filter(c => c.isUpcoming);
      }
      
      return cars;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to fetch a single car by slug
export const useCarBySlug = (slug: string | undefined, useDatabase = false) => {
  return useQuery({
    queryKey: ['car', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      if (useDatabase) {
        return fetchCarBySlug(slug);
      }
      
      // Use static data
      return staticCars.find(c => c.slug === slug) || null;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook to get all cars (for admin)
export const useAllCars = (useDatabase = false) => {
  return useQuery({
    queryKey: ['allCars', useDatabase],
    queryFn: async () => {
      if (useDatabase) {
        return getAllCars();
      }
      return staticCars;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Hook to check if database has cars
export const useDatabaseStatus = () => {
  return useQuery({
    queryKey: ['databaseStatus'],
    queryFn: checkDatabaseHasCars,
    staleTime: 60 * 1000, // 1 minute
  });
};

// Hook to migrate data to database
export const useMigrateData = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: migrateStaticDataToDatabase,
    onSuccess: () => {
      // Invalidate all car queries
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['allCars'] });
      queryClient.invalidateQueries({ queryKey: ['databaseStatus'] });
    }
  });
};

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
