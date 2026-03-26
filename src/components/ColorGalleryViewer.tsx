import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Image as ImageIcon, Expand, X, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  
  const currentColor = colors[selectedColor];
  const fallbackGallery = gallery.length > 0 ? gallery : (carImage ? [carImage] : []);
  
  const colorImages = (() => {
    if (currentColor?.image) {
      const uniqueGallery = fallbackGallery.filter(img => img !== currentColor.image);
      return [currentColor.image, ...uniqueGallery];
    }
    return fallbackGallery.length > 0 ? fallbackGallery : [PLACEHOLDER_IMAGE];
  })();

  useEffect(() => {
    setCurrentImageIndex(0);
    setImageError({});
  }, [selectedColor]);

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % colorImages.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + colorImages.length) % colorImages.length);

  const handleImageError = (imageUrl: string) => {
    setImageError(prev => {
      const updated = { ...prev, [imageUrl]: true };
      const nextIndex = colorImages.findIndex((img, i) => i > currentImageIndex && !updated[img]);
      if (nextIndex !== -1) setCurrentImageIndex(nextIndex);
      return updated;
    });
  };

  const getImageSrc = (url: string) => {
    if (imageError[url] || !url) return PLACEHOLDER_IMAGE;
    return url;
  };

  const colorOverlay = currentColor?.hex || "#ffffff";

  return (
    <div className="space-y-3">
      {/* Main Image Display */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-secondary group">
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

        {/* Current Color Badge - top left */}
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
              {colorImages.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-white/20 backdrop-blur-sm text-white gap-2 px-4 py-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: colorOverlay }} />
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

      {/* Compact Color Circles + Thumbnail Strip */}
      <div className="flex items-center gap-3">
        {/* Color Swatches - compact circles */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1.5 shrink-0">
            {colors.map((color, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => onColorChange(index)}
                    className={cn(
                      "relative w-7 h-7 rounded-full transition-all",
                      selectedColor === index
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                        : "ring-1 ring-black/10 hover:ring-2 hover:ring-muted-foreground/40 hover:scale-105"
                    )}
                    style={{ backgroundColor: color.hex }}
                    whileTap={{ scale: 0.9 }}
                    aria-label={color.name}
                  >
                    {selectedColor === index && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Check className={cn(
                          "h-3.5 w-3.5 drop-shadow-sm",
                          isLightColor(color.hex) ? "text-foreground" : "text-white"
                        )} strokeWidth={3} />
                      </motion.div>
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-medium">
                  {color.name}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {/* Divider */}
        <div className="w-px h-6 bg-border shrink-0" />

        {/* Thumbnail Gallery */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {colorImages.slice(0, 5).map((img, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={cn(
                "relative flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all",
                currentImageIndex === index 
                  ? "border-primary ring-1 ring-primary/30" 
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              {getImageSrc(img) === PLACEHOLDER_IMAGE ? (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Car className="h-3 w-3 text-muted-foreground/40" />
                </div>
              ) : (
                <img src={getImageSrc(img)} alt="" className="w-full h-full object-cover" onError={() => handleImageError(img)} />
              )}
            </button>
          ))}
          {colorImages.length > 5 && (
            <button 
              onClick={() => setCurrentImageIndex(5)}
              className="flex-shrink-0 w-14 h-10 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-[10px] font-medium hover:border-primary hover:text-primary transition-colors"
            >
              +{colorImages.length - 5}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper: determine if a hex color is light (for contrast check on checkmark)
function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
