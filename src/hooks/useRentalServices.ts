import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RentalService {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  base_price: number | null;
  price_unit: string | null;
  is_active: boolean;
  sort_order: number;
  features: string[];
  terms: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentalVehicle {
  id: string;
  name: string;
  brand: string;
  vehicle_type: string;
  fuel_type: string | null;
  transmission: string | null;
  seats: number;
  year: number | null;
  color: string | null;
  registration_number: string | null;
  rent_self_drive: number | null;
  rent_with_driver: number | null;
  rent_outstation_per_km: number | null;
  location: string | null;
  image_url: string | null;
  is_available: boolean;
  is_active: boolean;
  features: string[];
  created_at: string;
  updated_at: string;
}

export interface DriverBooking {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  vehicle_id: string | null;
  vehicle_name: string | null;
  service_type: string;
  pickup_date: string;
  pickup_time: string;
  pickup_address: string;
  dropoff_date: string | null;
  dropoff_time: string | null;
  dropoff_address: string | null;
  trip_type: string;
  distance_km: number | null;
  duration_days: number;
  base_amount: number;
  driver_charges: number;
  extra_km_charges: number;
  night_charges: number;
  toll_charges: number;
  taxes: number;
  discount_amount: number;
  discount_reason: string | null;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_assigned_at: string | null;
  special_instructions: string | null;
  source: string;
  api_partner_id: string | null;
  api_reference_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface APIPartner {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  api_key_hash: string | null;
  api_secret_hash: string | null;
  webhook_url: string | null;
  callback_url: string | null;
  allowed_services: string[];
  commission_percentage: number;
  branding_enabled: boolean;
  custom_branding: Record<string, unknown>;
  rate_limit_per_minute: number;
  is_active: boolean;
  ip_whitelist: string[] | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useRentalServices = () => {
  return useQuery({
    queryKey: ['rental-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as RentalService[];
    }
  });
};

export const useRentalVehicles = (serviceType?: string) => {
  return useQuery({
    queryKey: ['rental-vehicles', serviceType],
    queryFn: async () => {
      let query = supabase
        .from('rental_vehicles')
        .select('*')
        .eq('is_active', true)
        .eq('is_available', true)
        .order('brand');
      
      const { data, error } = await query;
      if (error) throw error;
      return data as RentalVehicle[];
    }
  });
};

export const useAdminRentalVehicles = () => {
  return useQuery({
    queryKey: ['admin-rental-vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RentalVehicle[];
    }
  });
};

export const useDriverBookings = (filters?: { status?: string }) => {
  return useQuery({
    queryKey: ['driver-bookings', filters],
    queryFn: async () => {
      let query = supabase
        .from('driver_bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DriverBooking[];
    }
  });
};

export const useAPIPartners = () => {
  return useQuery({
    queryKey: ['api-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_partners')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as APIPartner[];
    }
  });
};

export const useCreateDriverBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (booking: {
      user_id?: string | null;
      customer_name: string;
      customer_phone: string;
      customer_email?: string | null;
      vehicle_id?: string | null;
      vehicle_name?: string | null;
      service_type: string;
      pickup_date: string;
      pickup_time: string;
      pickup_address: string;
      dropoff_date?: string | null;
      dropoff_time?: string | null;
      dropoff_address?: string | null;
      trip_type?: string;
      distance_km?: number | null;
      duration_days?: number;
      base_amount: number;
      driver_charges?: number;
      extra_km_charges?: number;
      night_charges?: number;
      toll_charges?: number;
      taxes?: number;
      discount_amount?: number;
      discount_reason?: string | null;
      total_amount: number;
      status?: string;
      payment_status?: string;
      payment_id?: string | null;
      driver_name?: string | null;
      driver_phone?: string | null;
      special_instructions?: string | null;
      source?: string;
      api_partner_id?: string | null;
      api_reference_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('driver_bookings')
        .insert([booking as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-bookings'] });
    }
  });
};

export const useUpdateDriverBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DriverBooking> }) => {
      const { error } = await supabase
        .from('driver_bookings')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-bookings'] });
    }
  });
};
