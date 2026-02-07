import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Car } from "lucide-react";

interface CarImageProps {
  src: string | undefined | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  priority?: boolean;
}

/**
 * Smart car image component - ONLY shows Supabase-hosted authentic images
 * All other sources show "Image Coming Soon" placeholder
 */
export const CarImage = ({
  src,
  alt,
  className,
  fallbackClassName,
  priority = false,
}: CarImageProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Allow Supabase-hosted images AND official OEM domain images
  const isAuthenticImage = useCallback((url: string | undefined | null): boolean => {
    if (!url) return false;
    if (url === '/placeholder.svg') return false;
    // Allow Supabase storage URLs
    if (url.includes('supabase.co')) return true;
    // Allow local asset imports (for banners, logos, etc.)
    if (url.startsWith('/src/assets') || url.startsWith('data:') || url.startsWith('/assets')) return true;
    // Allow official OEM website images (including CDN/adobe asset URLs)
    const officialOEMDomains = [
      'marutisuzuki.com',
      'nexaexperience.com',
      'hyundai.com',
      'hyundai.co.in',
      'tatamotors.com',
      'mahindra.com',
      'mahindrarise.com',
      'kia.com',
      'kia.in',
      'toyota.com',
      'toyotabharat.com',
      'honda.com',
      'hondacarindia.com',
      'mg.co.in',
      'mgmotor.co.in',
      'skoda-auto.co.in',
      'skoda-auto.com',
      'volkswagen.co.in',
      'volkswagen.com',
      'renault.co.in',
      'renault.com',
      'jeep-india.com',
      'citroen.in'
    ];
    return officialOEMDomains.some(domain => url.includes(domain));
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Show placeholder if: no source, has error, or not authentic Supabase image
  const showPlaceholder = !src || hasError || !isAuthenticImage(src);

  if (showPlaceholder) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-muted to-muted/50",
          fallbackClassName || className
        )}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
          <Car className="h-12 w-12 sm:h-16 sm:w-16" />
          <span className="text-xs font-medium opacity-60">Image Coming Soon</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-muted animate-pulse",
            className
          )}
        >
          <Car className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(className, isLoading && "opacity-0")}
        onError={handleError}
        onLoad={handleLoad}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    </>
  );
};

export default CarImage;
