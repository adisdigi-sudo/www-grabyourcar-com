import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types for vehicle attributes from database
interface VehicleBrand {
  id: string;
  name: string;
  logo_url: string | null;
  country: string | null;
  is_active: boolean;
  sort_order: number;
}

interface VehicleBodyType {
  id: string;
  name: string;
  icon_url: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

interface VehicleFuelType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

interface VehicleTransmission {
  id: string;
  name: string;
  full_name: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

interface VehiclePriceRange {
  id: string;
  label: string;
  min_price: number;
  max_price: number;
  is_active: boolean;
  sort_order: number;
}

// Fetch all vehicle attributes in parallel
export const useVehicleAttributes = () => {
  return useQuery({
    queryKey: ['vehicle-attributes'],
    queryFn: async () => {
      const [
        brandsRes,
        bodyTypesRes,
        fuelTypesRes,
        transmissionsRes,
        priceRangesRes
      ] = await Promise.all([
        supabase.from('vehicle_brands').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('vehicle_body_types').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('vehicle_fuel_types').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('vehicle_transmissions').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('vehicle_price_ranges').select('*').eq('is_active', true).order('sort_order'),
      ]);

      return {
        brands: (brandsRes.data || []) as VehicleBrand[],
        bodyTypes: (bodyTypesRes.data || []) as VehicleBodyType[],
        fuelTypes: (fuelTypesRes.data || []) as VehicleFuelType[],
        transmissions: (transmissionsRes.data || []) as VehicleTransmission[],
        priceRanges: (priceRangesRes.data || []) as VehiclePriceRange[],
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });
};

// Individual hooks for specific attribute types
export const useVehicleBrands = () => {
  return useQuery({
    queryKey: ['vehicle-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_brands')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as VehicleBrand[];
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useVehicleBodyTypes = () => {
  return useQuery({
    queryKey: ['vehicle-body-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_body_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as VehicleBodyType[];
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useVehicleFuelTypes = () => {
  return useQuery({
    queryKey: ['vehicle-fuel-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_fuel_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as VehicleFuelType[];
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useVehicleTransmissions = () => {
  return useQuery({
    queryKey: ['vehicle-transmissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_transmissions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as VehicleTransmission[];
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useVehiclePriceRanges = () => {
  return useQuery({
    queryKey: ['vehicle-price-ranges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_price_ranges')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as VehiclePriceRange[];
    },
    staleTime: 10 * 60 * 1000,
  });
};

// Helper to format attributes for filter dropdowns (with "All" option)
export const formatBrandsForFilter = (brands: VehicleBrand[]): string[] => {
  return ["All", ...brands.map(b => b.name)];
};

export const formatBodyTypesForFilter = (bodyTypes: VehicleBodyType[]): string[] => {
  return ["All", ...bodyTypes.map(b => b.name)];
};

export const formatFuelTypesForFilter = (fuelTypes: VehicleFuelType[]): string[] => {
  return ["All", ...fuelTypes.map(f => f.name)];
};

export const formatTransmissionsForFilter = (transmissions: VehicleTransmission[]): string[] => {
  return ["All", ...transmissions.map(t => t.name)];
};

export const formatPriceRangesForFilter = (priceRanges: VehiclePriceRange[]): { label: string; min: number; max: number }[] => {
  return [
    { label: "All", min: 0, max: Infinity },
    ...priceRanges.map(p => ({
      label: p.label,
      min: p.min_price,
      max: p.max_price === 999999999 ? Infinity : p.max_price
    }))
  ];
};
