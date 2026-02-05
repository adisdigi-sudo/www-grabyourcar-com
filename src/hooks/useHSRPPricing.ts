import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HSRPPricing {
  fourWheeler: number;
  twoWheeler: number;
  tractor: number;
  colourSticker: number;
  homeInstallationFee: number;
  evVehicle: number;
}

export interface HSRPServiceConfig {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  iconType: "car" | "truck" | "bike" | "ev" | "tractor";
  badgeText?: string;
  vehicleClass: string;
  priceKey: keyof HSRPPricing;
  isPopular?: boolean;
  features?: string[];
  gradient?: string;
}

export const defaultPricing: HSRPPricing = {
  fourWheeler: 1100,
  twoWheeler: 450,
  tractor: 600,
  colourSticker: 100,
  homeInstallationFee: 200,
  evVehicle: 1100,
};

export const defaultServices: HSRPServiceConfig[] = [
  {
    id: "new-hsrp",
    title: "4-Wheeler HSRP",
    description: "High Security Registration Plate with Colour Sticker",
    shortDescription: "For cars, SUVs & commercial vehicles",
    iconType: "car",
    badgeText: "Most Popular",
    vehicleClass: "4W",
    priceKey: "fourWheeler",
    isPopular: true,
    features: ["Government approved", "Tamper-proof", "Laser branded ID", "48hr installation"],
    gradient: "from-primary via-primary/90 to-primary-dark",
  },
  {
    id: "two-wheeler",
    title: "2-Wheeler HSRP",
    description: "HSRP For Two Wheeler",
    shortDescription: "For motorcycles & scooters",
    iconType: "bike",
    badgeText: "Best Value",
    vehicleClass: "2W",
    priceKey: "twoWheeler",
    isPopular: true,
    features: ["Quick processing", "Doorstep option", "Same specs as 4W"],
    gradient: "from-amber-500 via-amber-400 to-orange-400",
  },
  {
    id: "ev-hsrp",
    title: "EV HSRP",
    description: "HSRP For Electric Vehicle",
    shortDescription: "Green plates for electric vehicles",
    iconType: "ev",
    badgeText: "Go Green",
    vehicleClass: "EV",
    priceKey: "evVehicle",
    features: ["Distinctive green plates", "EV-specific design", "Fast processing"],
    gradient: "from-emerald-500 via-green-500 to-teal-500",
  },
  {
    id: "colour-sticker",
    title: "Colour Sticker Only",
    description: "Get colour-coded fuel type sticker",
    shortDescription: "Fuel type identification sticker",
    iconType: "car",
    badgeText: "₹100 Only",
    vehicleClass: "Any",
    priceKey: "colourSticker",
    features: ["Quick application", "Fuel type coded", "All vehicles"],
    gradient: "from-purple-500 via-violet-500 to-indigo-500",
  },
  {
    id: "tractor",
    title: "Tractor & Trailer",
    description: "HSRP For Tractor & Trailer",
    shortDescription: "For agricultural vehicles",
    iconType: "tractor",
    vehicleClass: "Tractor",
    priceKey: "tractor",
    features: ["Agricultural vehicles", "Govt approved", "Pan-India service"],
    gradient: "from-orange-500 via-amber-600 to-yellow-500",
  },
  {
    id: "replacement",
    title: "Replacement HSRP",
    description: "Replace damaged or lost HSRP",
    shortDescription: "For damaged/lost plates",
    iconType: "car",
    vehicleClass: "4W",
    priceKey: "fourWheeler",
    features: ["Same-day processing", "Original specs", "Damage replacement"],
    gradient: "from-blue-500 via-cyan-500 to-sky-500",
  },
];

export const useHSRPPricing = () => {
  return useQuery({
    queryKey: ["hsrp-pricing-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "hsrp_pricing")
        .maybeSingle();

      if (error || !data) return defaultPricing;
      
      const val = data.setting_value as Record<string, number>;
      return {
        fourWheeler: val?.fourWheeler ?? defaultPricing.fourWheeler,
        twoWheeler: val?.twoWheeler ?? defaultPricing.twoWheeler,
        tractor: val?.tractor ?? defaultPricing.tractor,
        colourSticker: val?.colourSticker ?? defaultPricing.colourSticker,
        homeInstallationFee: val?.homeInstallationFee ?? defaultPricing.homeInstallationFee,
        evVehicle: val?.evVehicle ?? defaultPricing.evVehicle,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useHSRPServices = () => {
  return useQuery({
    queryKey: ["hsrp-services-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "hsrp_services")
        .maybeSingle();

      if (error || !data) return defaultServices;
      
      const services = data.setting_value as unknown as HSRPServiceConfig[];
      return Array.isArray(services) && services.length > 0 ? services : defaultServices;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export interface HSRPBannerData {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  vehicle_class: string;
  icon_type: string;
  gradient_from: string;
  gradient_to: string;
  badge_text: string | null;
  badge_color: string;
  features: string[] | null;
  price_key: string;
  cta_text: string;
  sort_order: number;
  is_active: boolean;
  animation_type: string;
  service_type: string;
}

export const useHSRPBanners = (serviceType?: 'hsrp' | 'fastag' | 'all') => {
  return useQuery({
    queryKey: ["hsrp-banners-public", serviceType],
    queryFn: async () => {
      let query = supabase
        .from("hsrp_service_banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (serviceType && serviceType !== 'all') {
        query = query.eq("service_type", serviceType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching banners:", error);
        return [];
      }
      
      return (data || []) as HSRPBannerData[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
};
