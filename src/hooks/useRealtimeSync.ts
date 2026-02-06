import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Tables that should trigger real-time updates
const REALTIME_TABLES = [
  'cars',
  'car_images',
  'car_colors',
  'car_variants',
  'car_specifications',
  'car_city_pricing',
  'homepage_content',
  'rental_services',
  'rental_vehicles',
  'driver_bookings',
  'leads',
  'admin_settings',
  'ai_blog_posts',
  'ai_news_cache',
  'hsrp_bookings',
] as const;

// Map tables to query keys that need invalidation
const TABLE_QUERY_KEY_MAP: Record<string, string[]> = {
  cars: ['cars', 'allCars', 'admin-cars', 'car'],
  car_images: ['cars', 'car', 'car-images', 'admin-cars'],
  car_colors: ['car-colors', 'car'],
  car_variants: ['car-variants', 'car'],
  car_specifications: ['car-specifications', 'car'],
  car_city_pricing: ['city-pricing', 'car'],
  homepage_content: ['homepageContent', 'homepage-content'],
  rental_services: ['rental-services'],
  rental_vehicles: ['rental-vehicles', 'admin-rental-vehicles'],
  driver_bookings: ['driver-bookings', 'admin-driver-bookings'],
  leads: ['admin-leads', 'adminDashboardStats'],
  admin_settings: ['admin-settings'],
  ai_blog_posts: ['ai-blog-posts'],
  ai_news_cache: ['ai-news-cache'],
  hsrp_bookings: ['hsrp-bookings'],
};

/**
 * Hook to enable real-time synchronization across the entire app.
 * Call this once at the app root level.
 */
export function useGlobalRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Realtime] Setting up global sync...');
    
    const channels = REALTIME_TABLES.map(table => {
      return supabase
        .channel(`realtime-${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            console.log(`[Realtime] Change detected in ${table}:`, payload.eventType);
            
            // Invalidate relevant queries
            const queryKeys = TABLE_QUERY_KEY_MAP[table] || [];
            queryKeys.forEach(key => {
              queryClient.invalidateQueries({ queryKey: [key] });
            });
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] ${table} subscription status:`, status);
        });
    });

    return () => {
      console.log('[Realtime] Cleaning up subscriptions...');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [queryClient]);
}

/**
 * Hook to sync a specific table in real-time.
 * Use this for components that need targeted real-time updates.
 */
export function useRealtimeTable(
  tableName: string, 
  queryKeys: string[],
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    console.log(`[Realtime] Subscribing to ${tableName}...`);
    
    const channel = supabase
      .channel(`realtime-${tableName}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          console.log(`[Realtime] ${tableName} updated:`, payload.eventType);
          
          queryKeys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, queryKeys.join(','), enabled, queryClient]);
}

/**
 * Hook to force refresh all data from the database.
 * Useful after bulk operations or when user manually requests refresh.
 */
export function useForceRefresh() {
  const queryClient = useQueryClient();

  const refreshAll = () => {
    console.log('[Refresh] Invalidating all queries...');
    queryClient.invalidateQueries();
  };

  const refreshTables = (tables: string[]) => {
    tables.forEach(table => {
      const queryKeys = TABLE_QUERY_KEY_MAP[table] || [table];
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    });
  };

  return { refreshAll, refreshTables };
}
