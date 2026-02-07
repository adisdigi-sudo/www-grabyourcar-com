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

  // STRICT: Only allow verified authentic images (Supabase-hosted or local assets)
  // No external CDNs - they have hotlink protection and break frequently
  const isAuthenticImage = useCallback((url: string | undefined | null) => {
    if (!url) return false;
    if (url === '/placeholder.svg') return false; // Not an image
    if (url.startsWith('/')) return true; // Local assets (src/assets)
    if (url.includes('supabase.co')) return true; // Supabase storage (verified)
    // BLOCK all external CDNs - use placeholder until image is scraped & hosted
    return false;
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // If no source OR not authentic OR error, show branded placeholder immediately
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
