import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Car } from "lucide-react";
import { isAuthenticImage } from "@/lib/imageUtils";

interface CarImageProps {
  src: string | undefined | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  priority?: boolean;
}

/**
 * Smart car image component - shows authentic images from OEM/Supabase
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

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Show placeholder if: no source, has error, or not authentic image
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
