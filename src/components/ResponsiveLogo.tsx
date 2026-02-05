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
  brand_name?: string;
  tagline?: string;
  logo_height_header?: number;
  logo_height_footer?: number;
  logo_height_mobile?: number;
  logo_width_header?: number;
  logo_width_footer?: number;
  logo_width_mobile?: number;
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

  // Determine logo URLs - backend settings take priority
  const logoLight = brandingSettings?.logo_url || logoLightDefault;
  const logoDark = brandingSettings?.logo_dark_url || logoDarkDefault;
  
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

// Export a hook for getting logo URLs
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
      return data?.setting_value as Record<string, string> | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    logoLight: brandingSettings?.logo_url || logoLightDefault,
    logoDark: brandingSettings?.logo_dark_url || logoDarkDefault,
    brandName: brandingSettings?.brand_name || "Grabyourcar",
    tagline: brandingSettings?.tagline || "Your Trusted Car Partner",
  };
};
