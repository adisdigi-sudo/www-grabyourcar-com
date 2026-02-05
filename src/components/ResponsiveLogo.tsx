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

// Size presets for different placements
const sizePresets = {
  header: {
    mobile: "h-10 sm:h-12",
    tablet: "md:h-14",
    desktop: "lg:h-16 xl:h-[4.5rem]",
    maxWidth: "max-w-[160px] sm:max-w-[200px] md:max-w-[260px] lg:max-w-[300px]",
  },
  footer: {
    mobile: "h-8 sm:h-10",
    tablet: "md:h-12",
    desktop: "lg:h-14",
    maxWidth: "max-w-[140px] sm:max-w-[180px] md:max-w-[220px]",
  },
  mobile: {
    mobile: "h-8",
    tablet: "h-10",
    desktop: "h-10",
    maxWidth: "max-w-[120px]",
  },
  sidebar: {
    mobile: "h-8",
    tablet: "h-10",
    desktop: "h-12",
    maxWidth: "max-w-[160px]",
  },
  auth: {
    mobile: "h-12 sm:h-14",
    tablet: "md:h-16",
    desktop: "lg:h-20",
    maxWidth: "max-w-[200px] sm:max-w-[260px] md:max-w-[320px]",
  },
  compact: {
    mobile: "h-6",
    tablet: "h-8",
    desktop: "h-8",
    maxWidth: "max-w-[100px]",
  },
};

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
      return data?.setting_value as Record<string, string> | null;
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

  const sizes = sizePresets[variant];
  const brandName = brandingSettings?.brand_name || "Grabyourcar";

  return (
    <img 
      src={logoImage} 
      alt={`${brandName} - India's Smarter Way to Buy New Cars`}
      onClick={onClick}
      className={cn(
        // Base styles
        "w-auto object-contain transition-all duration-300",
        // Responsive heights
        sizes.mobile,
        sizes.tablet,
        sizes.desktop,
        // Max width constraints
        sizes.maxWidth,
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
