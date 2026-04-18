import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BrandingSettings {
  logo_url: string;
  logo_dark_url: string;
  animated_logo_url: string;
  use_animated_logo: boolean;
  favicon_url: string;
  og_image_url: string;
  primary_color: string;
  secondary_color: string;
  brand_name: string;
  tagline: string;
  logo_height_header: number;
  logo_height_footer: number;
  logo_height_mobile: number;
  logo_width_header: number;
  logo_width_footer: number;
  logo_width_mobile: number;
  logo_position_horizontal: "left" | "center" | "right";
  logo_position_vertical: "top" | "center" | "bottom";
  banner_height_desktop: number;
  banner_height_mobile: number;
}

export const BRANDING_QUERY_KEY = ["brandingSettings"] as const;

export const normalizeBrandingSettings = (
  value?: Partial<BrandingSettings> | null,
): BrandingSettings => ({
  logo_url: String(value?.logo_url || ""),
  logo_dark_url: String(value?.logo_dark_url || ""),
  animated_logo_url: String(value?.animated_logo_url || ""),
  use_animated_logo: Boolean(value?.use_animated_logo),
  favicon_url: String(value?.favicon_url || "/favicon.png"),
  og_image_url: String(value?.og_image_url || "/og-image.png"),
  primary_color: String(value?.primary_color || "#2563eb"),
  secondary_color: String(value?.secondary_color || "#7c3aed"),
  brand_name: String(value?.brand_name || "Grabyourcar"),
  tagline: String(value?.tagline || "Your Trusted Car Partner"),
  logo_height_header: Number(value?.logo_height_header) || 64,
  logo_height_footer: Number(value?.logo_height_footer) || 56,
  logo_height_mobile: Number(value?.logo_height_mobile) || 40,
  logo_width_header: Number(value?.logo_width_header) || 0,
  logo_width_footer: Number(value?.logo_width_footer) || 0,
  logo_width_mobile: Number(value?.logo_width_mobile) || 0,
  logo_position_horizontal: (value?.logo_position_horizontal as "left" | "center" | "right") || "left",
  logo_position_vertical: (value?.logo_position_vertical as "top" | "center" | "bottom") || "center",
  banner_height_desktop: Number(value?.banner_height_desktop) || 400,
  banner_height_mobile: Number(value?.banner_height_mobile) || 280,
});

const fetchBrandingSettings = async (): Promise<Partial<BrandingSettings> | null> => {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("setting_value")
    .eq("setting_key", "branding_settings")
    .maybeSingle();

  if (error) throw error;
  return (data?.setting_value as unknown as Partial<BrandingSettings>) || null;
};

export const useBrandingSettingsQuery = () =>
  useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: fetchBrandingSettings,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });