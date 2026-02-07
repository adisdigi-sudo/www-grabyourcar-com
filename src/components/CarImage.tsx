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
 * Smart car image component that handles:
 * - Broken external CDN links (hotlink protection)
 * - Missing images
 * - Loading states
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

  // Check if URL is likely to work
  const isLikelyWorking = useCallback((url: string | undefined | null) => {
    if (!url) return false;
    if (url.startsWith('/')) return true; // Local assets
    if (url.includes('supabase.co')) return true; // Supabase storage
    // Allow common car image CDNs - they mostly work
    if (url.includes('aeplcdn.com')) return true; // CarDekho/CarWale CDN
    if (url.includes('imgd.aeplcdn.com')) return true;
    if (url.includes('stimg.cardekho.com')) return true;
    if (url.includes('imgcdn.zigwheels.com')) return true;
    // Allow any HTTPS URL - let it try to load
    if (url.startsWith('https://')) return true;
    return false;
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // If no source or known broken, show placeholder immediately
  const showPlaceholder = !src || hasError || (!isLikelyWorking(src) && hasError);

  if (showPlaceholder || !src) {
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
