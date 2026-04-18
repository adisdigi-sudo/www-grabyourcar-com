import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import logoLightDefault from "@/assets/logo-grabyourcar-new.png";
import logoDarkDefault from "@/assets/logo-grabyourcar-dark.png";
import { normalizeBrandingSettings, useBrandingSettingsQuery } from "@/hooks/useBrandingSettings";

interface ResponsiveLogoProps {
  variant?: "header" | "footer" | "mobile" | "sidebar" | "auth" | "compact";
  className?: string;
  onClick?: () => void;
}

export const ResponsiveLogo = ({ 
  variant = "header", 
  className,
  onClick 
}: ResponsiveLogoProps) => {
  const { theme, resolvedTheme } = useTheme();
  const effectiveTheme = resolvedTheme || theme;
  const { data } = useBrandingSettingsQuery();
  const brandingSettings = normalizeBrandingSettings(data);

  // Determine logo URLs - animated logo takes priority if enabled
  // IMPORTANT: Only use backend URLs if they're valid and not empty
  const useAnimated = brandingSettings?.use_animated_logo && brandingSettings?.animated_logo_url;
  
  const isValidUrl = (url: string | undefined | null): boolean => {
    if (!url || url.trim() === '') return false;
    // Check if it's a valid URL or a valid local path
    return url.startsWith('http') || url.startsWith('/') || url.startsWith('data:');
  };
  
  const logoLight = useAnimated && isValidUrl(brandingSettings?.animated_logo_url)
    ? brandingSettings!.animated_logo_url 
    : (isValidUrl(brandingSettings?.logo_url) ? brandingSettings!.logo_url : logoLightDefault);
  // Dark logo: prefer dedicated dark URL → animated → user's uploaded light logo → bundled default
  // (Never silently fall back to the BUNDLED dark image when the admin has set a custom main logo,
  //  otherwise the footer keeps showing the old logo.)
  const adminHasCustomLogo = isValidUrl(brandingSettings?.logo_url);
  const logoDark = useAnimated && isValidUrl(brandingSettings?.animated_logo_url)
    ? brandingSettings!.animated_logo_url
    : isValidUrl(brandingSettings?.logo_dark_url)
      ? brandingSettings!.logo_dark_url
      : adminHasCustomLogo
        ? brandingSettings!.logo_url           // use the new uploaded logo everywhere
        : logoDarkDefault;
  
  // Use dark logo for footer (always on dark bg) or when in dark mode
  const logoImage = variant === "footer" || effectiveTheme === "dark" 
    ? logoDark 
    : logoLight;

  const brandName = brandingSettings?.brand_name || "Grabyourcar";

  // Get dynamic dimensions from backend settings
  const getDimensions = () => {
    const defaultDimensions = {
      header: { height: 48, width: undefined, maxWidth: 220 },
      footer: { height: 44, width: undefined, maxWidth: 180 },
      mobile: { height: 40, width: undefined, maxWidth: 140 },
      sidebar: { height: 40, width: undefined, maxWidth: 150 },
      auth: { height: 72, width: undefined, maxWidth: 280 },
      compact: { height: 32, width: undefined, maxWidth: 100 },
    };

    if (!brandingSettings) return defaultDimensions[variant];

    switch (variant) {
      case "header":
        return {
          height: brandingSettings.logo_height_header || 64,
          width: brandingSettings.logo_width_header || undefined,
          maxWidth: 480,
        };
      case "footer":
        return {
          height: brandingSettings.logo_height_footer || 56,
          width: brandingSettings.logo_width_footer || undefined,
          maxWidth: 360,
        };
      case "mobile":
        return {
          height: brandingSettings.logo_height_mobile || 40,
          width: brandingSettings.logo_width_mobile || undefined,
          maxWidth: 200,
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
  const { data } = useBrandingSettingsQuery();
  const brandingSettings = normalizeBrandingSettings(data);

  const useAnimated = brandingSettings?.use_animated_logo && brandingSettings?.animated_logo_url;

  const adminHasCustomLogo = brandingSettings?.logo_url && String(brandingSettings.logo_url).trim() !== "";
  return {
    logoLight: useAnimated ? String(brandingSettings?.animated_logo_url) : (brandingSettings?.logo_url || logoLightDefault),
    logoDark: useAnimated
      ? String(brandingSettings?.animated_logo_url)
      : (brandingSettings?.logo_dark_url || (adminHasCustomLogo ? brandingSettings?.logo_url : logoDarkDefault)),
    animatedLogoUrl: brandingSettings?.animated_logo_url || "",
    useAnimatedLogo: Boolean(brandingSettings?.use_animated_logo),
    brandName: String(brandingSettings?.brand_name || "Grabyourcar"),
    tagline: String(brandingSettings?.tagline || "Your Trusted Car Partner"),
    logoPositionHorizontal: (brandingSettings?.logo_position_horizontal as "left" | "center" | "right") || "left",
    logoPositionVertical: (brandingSettings?.logo_position_vertical as "top" | "center" | "bottom") || "center",
  };
};
