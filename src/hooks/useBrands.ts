import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CarBrand {
  id: string;
  name: string;
  slug: string;
  country: string;
  logo_url: string | null;
  is_active: boolean;
  is_luxury: boolean;
  sort_order: number;
}

// Fetch all active brands from database
export const useBrands = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['car-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('car_brands')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching brands:', error);
        throw error;
      }

      return data as CarBrand[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Real-time subscription for car_brands table
  useEffect(() => {
    const channel = supabase
      .channel('car-brands-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'car_brands' },
        () => {
          console.log('[Brands] Real-time update received');
          queryClient.invalidateQueries({ queryKey: ['car-brands'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// Get brand names for filter dropdowns
export const useBrandNames = () => {
  const { data: brands } = useBrands();
  return brands?.map(b => b.name) || [];
};

// Get luxury brands only
export const useLuxuryBrands = () => {
  const { data: brands } = useBrands();
  return brands?.filter(b => b.is_luxury) || [];
};

// Get non-luxury brands
export const useMainstreamBrands = () => {
  const { data: brands } = useBrands();
  return brands?.filter(b => !b.is_luxury) || [];
};
