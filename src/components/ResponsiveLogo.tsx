import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import logoLightDefault from "@/assets/logo-grabyourcar-new.png";
import logoDarkDefault from "@/assets/logo-grabyourcar-dark.png";

interface ResponsiveLogoProps {
  variant?: "header" | "footer" | "mobile" | "sidebar" | "auth" | "compact";
  className?: string;
  onClick?: () => void;
}

interface BrandingSettings {
  logo_url?: string;
  logo_dark_url?: string;
  animated_logo_url?: string;
  use_animated_logo?: boolean;
  brand_name?: string;
  tagline?: string;
  logo_height_header?: number;
  logo_height_footer?: number;
  logo_height_mobile?: number;
  logo_width_header?: number;
  logo_width_footer?: number;
  logo_width_mobile?: number;
  logo_position_horizontal?: "left" | "center" | "right";
  logo_position_vertical?: "top" | "center" | "bottom";
}

export const ResponsiveLogo = ({ 
  variant = "header", 
  className,
  onClick 
}: ResponsiveLogoProps) => {
  const { theme, resolvedTheme } = useTheme();
  const effectiveTheme = resolvedTheme || theme;

  // Fetch branding settings from backend
  const { data: brandingSettings } = useQuery({
    queryKey: ['brandingSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'branding_settings')
        .single();
      
      if (error && error.code !== 'PGRST116') return null;
      return data?.setting_value as BrandingSettings | null;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Determine logo URLs - animated logo takes priority if enabled
  const useAnimated = brandingSettings?.use_animated_logo && brandingSettings?.animated_logo_url;
  const logoLight = useAnimated 
    ? brandingSettings.animated_logo_url 
    : (brandingSettings?.logo_url || logoLightDefault);
  const logoDark = useAnimated 
    ? brandingSettings.animated_logo_url 
    : (brandingSettings?.logo_dark_url || logoDarkDefault);
  
  // Use dark logo for footer (always on dark bg) or when in dark mode
  const logoImage = variant === "footer" || effectiveTheme === "dark" 
    ? logoDark 
    : logoLight;

  const brandName = brandingSettings?.brand_name || "Grabyourcar";

  // Get dynamic dimensions from backend settings
  const getDimensions = () => {
    const defaultDimensions = {
      header: { height: 64, width: undefined, maxWidth: 300 },
      footer: { height: 56, width: undefined, maxWidth: 220 },
      mobile: { height: 40, width: undefined, maxWidth: 120 },
      sidebar: { height: 48, width: undefined, maxWidth: 160 },
      auth: { height: 80, width: undefined, maxWidth: 320 },
      compact: { height: 32, width: undefined, maxWidth: 100 },
    };

    if (!brandingSettings) return defaultDimensions[variant];

    switch (variant) {
      case "header":
        return {
          height: brandingSettings.logo_height_header || 64,
          width: brandingSettings.logo_width_header || undefined,
          maxWidth: 300,
        };
      case "footer":
        return {
          height: brandingSettings.logo_height_footer || 56,
          width: brandingSettings.logo_width_footer || undefined,
          maxWidth: 220,
        };
      case "mobile":
        return {
          height: brandingSettings.logo_height_mobile || 40,
          width: brandingSettings.logo_width_mobile || undefined,
          maxWidth: 120,
        };
      default:
        return defaultDimensions[variant];
    }
  };

  const dimensions = getDimensions();

  return (
    <img 
      src={logoImage} 
      alt={`${brandName} - India's Smarter Way to Buy New Cars`}
      onClick={onClick}
      style={{
        height: dimensions.height,
        width: dimensions.width || 'auto',
        maxWidth: dimensions.maxWidth,
      }}
      className={cn(
        // Base styles
        "object-contain transition-all duration-300",
        // Hover effect
        "hover:scale-[1.02]",
        // Shadow for visibility
        variant === "header" && "drop-shadow-md",
        // Cursor if clickable
        onClick && "cursor-pointer",
        className
      )}
    />
  );
};

// Export a hook for getting logo URLs and settings
export const useLogoUrls = () => {
  const { data: brandingSettings } = useQuery({
    queryKey: ['brandingSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'branding_settings')
        .single();
      
      if (error && error.code !== 'PGRST116') return null;
      return data?.setting_value as Record<string, string | number | boolean> | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const useAnimated = brandingSettings?.use_animated_logo && brandingSettings?.animated_logo_url;

  return {
    logoLight: useAnimated ? String(brandingSettings?.animated_logo_url) : (brandingSettings?.logo_url || logoLightDefault),
    logoDark: useAnimated ? String(brandingSettings?.animated_logo_url) : (brandingSettings?.logo_dark_url || logoDarkDefault),
    animatedLogoUrl: brandingSettings?.animated_logo_url || "",
    useAnimatedLogo: Boolean(brandingSettings?.use_animated_logo),
    brandName: String(brandingSettings?.brand_name || "Grabyourcar"),
    tagline: String(brandingSettings?.tagline || "Your Trusted Car Partner"),
    logoPositionHorizontal: (brandingSettings?.logo_position_horizontal as "left" | "center" | "right") || "left",
    logoPositionVertical: (brandingSettings?.logo_position_vertical as "top" | "center" | "bottom") || "center",
  };
};
