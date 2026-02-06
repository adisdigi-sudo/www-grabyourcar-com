import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Palette, Check, Image as ImageIcon, Expand, X, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CarColor {
  name: string;
  hex: string;
  image?: string;
}

interface ColorGalleryViewerProps {
  colors: CarColor[];
  carName: string;
  carImage: string;
  gallery: string[];
  selectedColor: number;
  onColorChange: (index: number) => void;
}

// Fallback placeholder for broken images
const PLACEHOLDER_IMAGE = "/placeholder.svg";

export const ColorGalleryViewer = ({
  colors,
  carName,
  carImage,
  gallery,
  selectedColor,
  onColorChange,
}: ColorGalleryViewerProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  
  // Get color-specific images or fall back to main gallery
  const currentColor = colors[selectedColor];
  
  // Ensure we always have at least carImage as fallback
  const fallbackGallery = gallery.length > 0 ? gallery : (carImage ? [carImage] : []);
  
  const colorImages = currentColor?.image 
    ? [currentColor.image, ...fallbackGallery.slice(0, 3)] 
    : fallbackGallery.length > 0 ? fallbackGallery : [PLACEHOLDER_IMAGE];

  // Reset image index when color changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setImageError({});
  }, [selectedColor]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % colorImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + colorImages.length) % colorImages.length);
  };

  // Handle image error - use placeholder
  const handleImageError = (imageUrl: string) => {
    setImageError(prev => ({ ...prev, [imageUrl]: true }));
  };

  const getImageSrc = (url: string) => {
    if (imageError[url] || !url) return PLACEHOLDER_IMAGE;
    return url;
  };

  // Generate a tinted overlay based on the selected color
  const colorOverlay = currentColor?.hex || "#ffffff";

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-secondary group">
        {/* Color Tint Overlay - subtle effect */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none opacity-10 transition-opacity duration-500"
          style={{ backgroundColor: colorOverlay }}
        />
        
        <AnimatePresence mode="wait">
          {getImageSrc(colorImages[currentImageIndex]) === PLACEHOLDER_IMAGE ? (
            <motion.div
              key={`placeholder-${selectedColor}-${currentImageIndex}`}
              className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Car className="h-24 w-24 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm font-medium">{carName}</p>
              <p className="text-muted-foreground/60 text-xs mt-1">{currentColor?.name || 'View Details'}</p>
            </motion.div>
          ) : (
            <motion.img
              key={`${selectedColor}-${currentImageIndex}`}
              src={getImageSrc(colorImages[currentImageIndex])}
              alt={`${carName} in ${currentColor?.name || 'default'} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              onError={() => handleImageError(colorImages[currentImageIndex])}
            />
          )}
        </AnimatePresence>

        {/* Navigation Arrows */}
        {colorImages.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 rounded-full flex items-center justify-center shadow-lg hover:bg-background transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 rounded-full flex items-center justify-center shadow-lg hover:bg-background transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Current Color Badge */}
        <div className="absolute top-4 left-4 z-20">
          <Badge 
            variant="secondary" 
            className="bg-background/90 backdrop-blur-sm gap-2 px-3 py-1.5"
          >
            <span 
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: colorOverlay }}
            />
            <span className="font-medium">{currentColor?.name || 'Select Color'}</span>
          </Badge>
        </div>

        {/* Fullscreen Button */}
        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogTrigger asChild>
            <button className="absolute top-4 right-4 z-20 w-10 h-10 bg-background/90 rounded-full flex items-center justify-center shadow-lg hover:bg-background transition-all opacity-0 group-hover:opacity-100">
              <Expand className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl w-[95vw] p-0 bg-black/95">
            <div className="relative aspect-video">
              {getImageSrc(colorImages[currentImageIndex]) === PLACEHOLDER_IMAGE ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <Car className="h-32 w-32 text-white/20 mb-4" />
                  <p className="text-white/60 text-lg">{carName}</p>
                </div>
              ) : (
                <img
                  src={getImageSrc(colorImages[currentImageIndex])}
                  alt={`${carName} in ${currentColor?.name || 'default'}`}
                  className="w-full h-full object-contain"
                  onError={() => handleImageError(colorImages[currentImageIndex])}
                />
              )}
              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              {/* Fullscreen Navigation */}
              {colorImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              
              {/* Color name in fullscreen */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-white/20 backdrop-blur-sm text-white gap-2 px-4 py-2">
                  <span 
                    className="w-4 h-4 rounded-full border-2 border-white"
                    style={{ backgroundColor: colorOverlay }}
                  />
                  {currentColor?.name} • {currentImageIndex + 1}/{colorImages.length}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Counter */}
        <div className="absolute bottom-4 right-4 z-20">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
            <ImageIcon className="h-3 w-3 mr-1.5" />
            {currentImageIndex + 1} / {colorImages.length}
          </Badge>
        </div>
      </div>

      {/* Thumbnail Gallery */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {colorImages.slice(0, 5).map((img, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={cn(
              "relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all",
              currentImageIndex === index 
                ? "border-primary ring-2 ring-primary/30" 
                : "border-transparent hover:border-muted-foreground/30"
            )}
          >
            {getImageSrc(img) === PLACEHOLDER_IMAGE ? (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Car className="h-4 w-4 text-muted-foreground/40" />
              </div>
            ) : (
              <img 
                src={getImageSrc(img)} 
                alt="" 
                className="w-full h-full object-cover" 
                onError={() => handleImageError(img)}
              />
            )}
            {currentImageIndex === index && (
              <div className="absolute inset-0 bg-primary/20" />
            )}
          </button>
        ))}
        {colorImages.length > 5 && (
          <button 
            onClick={() => setCurrentImageIndex(5)}
            className="flex-shrink-0 w-16 h-12 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-xs hover:border-primary hover:text-primary transition-colors"
          >
            +{colorImages.length - 5}
          </button>
        )}
      </div>

      {/* Color Selector */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Available Colors</h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            {colors.length} colors
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {colors.map((color, index) => (
            <motion.button
              key={index}
              onClick={() => onColorChange(index)}
              className={cn(
                "relative flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all",
                selectedColor === index 
                  ? "border-primary bg-primary/5" 
                  : "border-transparent bg-secondary hover:border-muted-foreground/30"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span 
                className="w-6 h-6 rounded-full border-2 border-white shadow-md ring-1 ring-black/10"
                style={{ backgroundColor: color.hex }}
              />
              <span className={cn(
                "text-sm",
                selectedColor === index ? "font-medium" : "text-muted-foreground"
              )}>
                {color.name}
              </span>
              {color.image && (
                <ImageIcon className="h-3 w-3 text-success" />
              )}
              {selectedColor === index && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </motion.button>
          ))}
        </div>
        
        {/* Info message when color image not available */}
        {currentColor && !currentColor.image && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3" />
            Showing gallery images. Color-specific photo coming soon.
          </p>
        )}
      </div>
    </div>
  );
};
