import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Truck, Bike, Zap, Tractor, ChevronLeft, ChevronRight, Sparkles, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useHSRPPricing, useHSRPServices, formatPrice, HSRPServiceConfig, HSRPPricing } from "@/hooks/useHSRPPricing";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const iconMap = {
  car: Car,
  truck: Truck,
  bike: Bike,
  ev: Zap,
  tractor: Tractor,
};

interface HSRPServiceCarouselProps {
  onSelectService: (serviceId: string, price: number, vehicleClass: string) => void;
  selectedServiceId?: string | null;
}

export function HSRPServiceCarousel({ onSelectService, selectedServiceId }: HSRPServiceCarouselProps) {
  const { data: pricing, isLoading: pricingLoading } = useHSRPPricing();
  const { data: services, isLoading: servicesLoading } = useHSRPServices();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState(0);

  const isLoading = pricingLoading || servicesLoading;
  const displayServices = services || [];
  const displayPricing = pricing || {} as HSRPPricing;

  // Auto-rotate carousel
  useEffect(() => {
    if (!isAutoPlaying || displayServices.length === 0) return;
    
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % displayServices.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, displayServices.length]);

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + displayServices.length) % displayServices.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % displayServices.length);
  };

  const handleSelectService = (service: HSRPServiceConfig) => {
    const price = displayPricing[service.priceKey] || 0;
    onSelectService(service.id, price, service.vehicleClass);
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

  const currentService = displayServices[currentIndex];
  const Icon = currentService ? iconMap[currentService.iconType] || Car : Car;
  const currentPrice = currentService ? displayPricing[currentService.priceKey] || 0 : 0;

  return (
    <div className="space-y-8">
      {/* Featured Service - Large Card */}
      <div className="relative">
        <AnimatePresence mode="wait" custom={direction}>
          {currentService && (
            <motion.div
              key={currentService.id}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <Card
                className={cn(
                  "overflow-hidden border-0 shadow-2xl cursor-pointer transition-all duration-300",
                  selectedServiceId === currentService.id
                    ? "ring-4 ring-primary ring-offset-2"
                    : "hover:shadow-3xl"
                )}
                onClick={() => handleSelectService(currentService)}
              >
                <div
                  className={cn(
                    "bg-gradient-to-br p-8 text-white relative overflow-hidden",
                    currentService.gradient || "from-primary to-primary-dark"
                  )}
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
                        {currentService.badgeText && (
                          <Badge className="bg-white/20 text-white border-white/30">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {currentService.badgeText}
                          </Badge>
                        )}
                        {selectedServiceId === currentService.id && (
                          <Badge className="bg-white text-primary">
                            <Check className="w-3 h-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="text-2xl md:text-3xl font-bold mb-2">
                        {currentService.title}
                      </h3>
                      <p className="text-white/80 text-lg mb-4">
                        {currentService.shortDescription || currentService.description}
                      </p>

                      {/* Features */}
                      {currentService.features && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {currentService.features.map((feature, idx) => (
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
                          handleSelectService(currentService);
                        }}
                      >
                        Book Now
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Arrows */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm shadow-lg z-20"
          onClick={handlePrev}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm shadow-lg z-20"
          onClick={handleNext}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Service Thumbnails */}
      <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
        {displayServices.map((service, index) => {
          const ServiceIcon = iconMap[service.iconType] || Car;
          const price = displayPricing[service.priceKey] || 0;
          const isActive = index === currentIndex;
          const isSelected = selectedServiceId === service.id;

          return (
            <motion.div
              key={service.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setIsAutoPlaying(false);
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className="flex-shrink-0"
            >
              <Card
                className={cn(
                  "w-40 cursor-pointer transition-all duration-300 overflow-hidden",
                  isActive && "ring-2 ring-primary shadow-lg",
                  isSelected && "ring-2 ring-primary bg-primary/5",
                  !isActive && !isSelected && "opacity-70 hover:opacity-100"
                )}
              >
                <CardContent className="p-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br",
                      service.gradient || "from-primary to-primary-dark"
                    )}
                  >
                    <ServiceIcon className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-sm truncate">{service.title}</h4>
                  <p className="text-primary font-bold text-lg">{formatPrice(price)}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2">
        {displayServices.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setIsAutoPlaying(false);
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentIndex
                ? "bg-primary w-6"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}
