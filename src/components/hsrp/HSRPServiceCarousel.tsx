import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Truck, Bike, Zap, Tractor, ChevronLeft, ChevronRight, Sparkles, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useHSRPPricing, useHSRPBanners, formatPrice, HSRPBannerData } from "@/hooks/useHSRPPricing";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  car: Car,
  truck: Truck,
  bike: Bike,
  ev: Zap,
  tractor: Tractor,
};

// Map price keys from database to pricing object keys
const priceKeyMap: Record<string, string> = {
  two_wheeler: "twoWheeler",
  four_wheeler: "fourWheeler",
  ev: "evVehicle",
  commercial: "fourWheeler",
  tractor: "tractor",
};

interface HSRPServiceCarouselProps {
  onSelectService: (serviceId: string, price: number, vehicleClass: string) => void;
  selectedServiceId?: string | null;
  serviceType?: 'hsrp' | 'fastag';
}

export function HSRPServiceCarousel({ onSelectService, selectedServiceId, serviceType = 'hsrp' }: HSRPServiceCarouselProps) {
  const { data: pricing, isLoading: pricingLoading } = useHSRPPricing();
  const { data: banners, isLoading: bannersLoading } = useHSRPBanners(serviceType);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState(0);

  const isLoading = pricingLoading || bannersLoading;
  const displayBanners = banners || [];

  // Auto-rotate carousel
  useEffect(() => {
    if (!isAutoPlaying || displayBanners.length === 0) return;
    
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, displayBanners.length]);

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + displayBanners.length) % displayBanners.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
  };

  const getPrice = (banner: HSRPBannerData): number => {
    if (!pricing) return 0;
    const mappedKey = priceKeyMap[banner.price_key] || banner.price_key;
    const pricingObj = pricing as unknown as Record<string, number>;
    return pricingObj[mappedKey] || 0;
  };

  const handleSelectBanner = (banner: HSRPBannerData) => {
    const price = getPrice(banner);
    onSelectService(banner.id, price, banner.vehicle_class);
  };

  // Animation variants based on animation_type
  const getAnimationVariants = (type: string) => {
    switch (type) {
      case "fade":
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
      case "scale":
        return {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.9 },
        };
      default: // slide
        return {
          initial: { opacity: 0, x: direction > 0 ? 100 : -100 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: direction > 0 ? -100 : 100 },
        };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-80 rounded-2xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (displayBanners.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No HSRP services available</p>
      </div>
    );
  }

  const currentBanner = displayBanners[currentIndex];
  const Icon = iconMap[currentBanner.icon_type] || Car;
  const currentPrice = getPrice(currentBanner);
  const animationVariants = getAnimationVariants(currentBanner.animation_type);

  return (
    <div className="space-y-8">
      {/* Featured Service - Large Card */}
      <div className="relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentBanner.id}
            custom={direction}
            initial={animationVariants.initial}
            animate={animationVariants.animate}
            exit={animationVariants.exit}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <Card
              className={cn(
                "overflow-hidden border-0 shadow-2xl cursor-pointer transition-all duration-300",
                selectedServiceId === currentBanner.id
                  ? "ring-4 ring-primary ring-offset-2"
                  : "hover:shadow-3xl"
              )}
              onClick={() => handleSelectBanner(currentBanner)}
            >
              <div
                className="p-8 text-white relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${currentBanner.gradient_from}, ${currentBanner.gradient_to})`,
                }}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  >
                    <Icon className="w-12 h-12 md:w-16 md:h-16" />
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                      {currentBanner.badge_text && (
                        <Badge className="bg-white/20 text-white border-white/30">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {currentBanner.badge_text}
                        </Badge>
                      )}
                      {selectedServiceId === currentBanner.id && (
                        <Badge className="bg-white text-primary">
                          <Check className="w-3 h-3 mr-1" />
                          Selected
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-bold mb-2">
                      {currentBanner.title}
                    </h3>
                    <p className="text-white/80 text-lg mb-4">
                      {currentBanner.subtitle || currentBanner.description}
                    </p>

                    {/* Features */}
                    {currentBanner.features && currentBanner.features.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {currentBanner.features.map((feature, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-white/10 px-3 py-1 rounded-full"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Price & CTA */}
                  <div className="text-center md:text-right">
                    <div className="text-4xl md:text-5xl font-bold mb-2">
                      {formatPrice(currentPrice)}
                    </div>
                    <p className="text-white/70 text-sm mb-4">All inclusive</p>
                    <Button
                      size="lg"
                      className="bg-white text-primary hover:bg-white/90 gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectBanner(currentBanner);
                      }}
                    >
                      {currentBanner.cta_text || "Book Now"}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {displayBanners.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-full shadow-lg"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-full shadow-lg"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Service Selector Pills */}
      {displayBanners.length > 1 && (
        <div className="flex flex-wrap justify-center gap-3">
          {displayBanners.map((banner, idx) => {
            const BannerIcon = iconMap[banner.icon_type] || Car;
            const isActive = idx === currentIndex;
            const price = getPrice(banner);
            
            return (
              <motion.button
                key={banner.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setIsAutoPlaying(false);
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300",
                  isActive
                    ? "border-primary bg-primary/10 shadow-lg"
                    : "border-border bg-card hover:border-primary/50 hover:bg-muted"
                )}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{
                    background: `linear-gradient(135deg, ${banner.gradient_from}, ${banner.gradient_to})`,
                  }}
                >
                  <BannerIcon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className={cn("font-medium text-sm", isActive && "text-primary")}>
                    {banner.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatPrice(price)}</p>
                </div>
                {selectedServiceId === banner.id && (
                  <Check className="w-4 h-4 text-primary ml-2" />
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Progress Dots */}
      {displayBanners.length > 1 && (
        <div className="flex justify-center gap-2">
          {displayBanners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsAutoPlaying(false);
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                idx === currentIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
