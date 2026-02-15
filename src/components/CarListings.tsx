import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fuel, Cog, Clock, TrendingDown, Phone, Heart, GitCompare, Check, Eye, Loader2 } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { useCompare } from "@/hooks/useCompare";
import { cn } from "@/lib/utils";
import { isValidImage } from "@/lib/imageUtils";
import { WhatsAppCardButton } from "@/components/WhatsAppCTA";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CarImage } from "@/components/CarImage";

interface CarWithImage {
  id: string;
  name: string;
  brand: string;
  slug: string;
  price_range: string | null;
  fuel_types: string[] | null;
  transmission_types: string[] | null;
  is_new: boolean | null;
  is_upcoming: boolean | null;
  is_bestseller: boolean | null;
  tagline: string | null;
  discount: string | null;
  image_url: string | null;
}

// Fetch featured cars from database with their primary images
const useFeaturedCars = () => {
  return useQuery({
    queryKey: ['featured-cars-homepage'],
    queryFn: async () => {
      // Get cars with their primary images - only those with Supabase-hosted images
      const { data: cars, error } = await supabase
        .from('cars')
        .select(`
          id,
          name,
          brand,
          slug,
          price_range,
          fuel_types,
          transmission_types,
          is_new,
          is_upcoming,
          is_bestseller,
          tagline,
          discount
        `)
        .eq('is_discontinued', false)
        .order('updated_at', { ascending: false })
        .limit(24); // Fetch more to filter for valid images
      
      if (error) throw error;
      if (!cars?.length) return [];
      
      // Get ALL images for these cars to pick the best ones
      const { data: allImages } = await supabase
        .from('car_images')
        .select('car_id, url, is_primary, sort_order')
        .in('car_id', cars.map(c => c.id))
        .order('sort_order', { ascending: true });
      
      // Create a map of car_id to best authentic image_url
      const imageMap = new Map<string, string | null>();
      
      for (const car of cars) {
        const carImages = (allImages || []).filter(img => img.car_id === car.id);
        
        // Prioritize internally hosted images (Supabase/local) over external OEM URLs
        // External OEM URLs may fail due to hotlink protection
        const internalImages = carImages.filter(img => 
          isValidImage(img.url) && (img.url?.includes('supabase.co') || img.url?.startsWith('/cars/'))
        );
        const oemImages = carImages.filter(img => 
          isValidImage(img.url) && !img.url?.includes('supabase.co') && !img.url?.startsWith('/cars/')
        );
        
        // Use internal images first (always reliable), OEM as fallback
        const authenticImages = internalImages.length > 0 ? internalImages : oemImages;
        
        // Sort by is_primary, then sort_order
        const sortedImages = authenticImages.sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.sort_order || 0) - (b.sort_order || 0);
        });
        
        imageMap.set(car.id, sortedImages[0]?.url || null);
      }
      
      // Merge car data with images
      return cars.map(car => ({
        ...car,
        image_url: imageMap.get(car.id) || null
      })) as CarWithImage[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
};

export const CarListings = () => {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInCompare, addToCompare, removeFromCompare, canAddMore } = useCompare();
  const { data: featuredCars, isLoading, error } = useFeaturedCars();

  const handleCompareToggle = (carId: string | number) => {
    if (isInCompare(carId)) {
      removeFromCompare(carId);
    } else {
      addToCompare(carId);
    }
  };

  if (isLoading) {
    return (
      <section id="cars" className="py-10 md:py-16 lg:py-24">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading cars...</span>
          </div>
        </div>
      </section>
    );
  }

  if (error || !featuredCars?.length) {
    return null; // Don't show section if no cars
  }

  return (
    <section id="cars" className="py-10 md:py-16 lg:py-24">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-4">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 md:mb-4">
              Hot Deals This Week
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Exclusive discounts on India's most popular cars
            </p>
          </div>
          <Link to="/cars">
            <Button variant="outline" size="lg" className="hidden md:flex">
              View All Cars
            </Button>
          </Link>
        </div>

        {/* 2 columns on mobile/tablet, 3 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-6">
          {featuredCars.map((car, index) => {
            // Generate a numeric ID for favorites/compare from UUID
            const numericId = Math.abs(car.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
            
            return (
              <Card
                key={car.id}
                variant="deal"
                className="overflow-hidden animate-fade-in car-card-glow flex flex-col"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Image Container */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <CarImage
                    src={isValidImage(car.image_url) ? car.image_url : undefined}
                    alt={car.name}
                    className="w-full h-full object-cover"
                    fallbackClassName="w-full h-full"
                  />
                  
                  {/* Top Left: Badge */}
                  <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
                    {car.is_new && (
                      <Badge className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 bg-primary text-primary-foreground rounded-full font-semibold">
                        🚀 Express Delivery
                      </Badge>
                    )}
                    {car.is_upcoming && !car.is_new && (
                      <Badge className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 bg-orange-500 text-white rounded-full">
                        ⚡ Soon
                      </Badge>
                    )}
                    {car.is_bestseller && !car.is_new && !car.is_upcoming && (
                      <Badge className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 bg-success text-success-foreground rounded-full">
                        🔥 Bestseller
                      </Badge>
                    )}
                  </div>
                  
                  {/* Right Side: Favorite & Compare */}
                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex flex-col gap-1 sm:gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 bg-white/90 hover:bg-white shadow-sm rounded-full"
                      onClick={() => toggleFavorite(numericId, car.slug)}
                    >
                      <Heart className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isFavorite(numericId) && "fill-red-500 text-red-500")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 sm:h-8 sm:w-8 bg-white/90 hover:bg-white shadow-sm rounded-full",
                        isInCompare(numericId) && "text-primary"
                      )}
                      onClick={() => handleCompareToggle(numericId)}
                      disabled={!canAddMore && !isInCompare(numericId)}
                    >
                      {isInCompare(numericId) ? (
                        <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ) : (
                        <GitCompare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Price Badge - Bottom Right */}
                  <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2">
                    <div className="bg-primary text-white rounded-full px-2 sm:px-3 py-1 font-bold text-[10px] sm:text-xs shadow-lg flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="truncate max-w-[70px] sm:max-w-none">
                        {car.price_range?.split(" - ")[0] || "Price on Request"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <CardContent className="p-2.5 sm:p-3 flex-grow">
                  {/* Car Name */}
                  <h3 className="font-heading text-[11px] sm:text-sm font-bold text-foreground mb-1 line-clamp-1">
                    {car.name}
                  </h3>
                  
                  {/* Specs Row - Compact */}
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] sm:text-[10px] text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-0.5">
                      <Fuel className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                      {car.fuel_types?.[0] || "Petrol"}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Cog className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                      {car.transmission_types?.[0] || "Manual"}
                    </span>
                  </div>

                  {/* Availability */}
                  {!car.is_upcoming && (
                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-primary">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span>Ready Stock</span>
                    </div>
                  )}
                </CardContent>

                {/* Action Buttons */}
                <CardFooter className="p-2.5 sm:p-3 pt-0 flex flex-col gap-1.5 sm:gap-2 mt-auto">
                  {/* View Details */}
                  <Link to={`/car/${car.slug}`} className="w-full">
                    <Button variant="cta" size="sm" className="w-full gap-1 text-[10px] sm:text-xs h-7 sm:h-8 font-semibold px-2">
                      <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                      <span>View Details</span>
                    </Button>
                  </Link>
                  
                  {/* WhatsApp & Call Row */}
                  <div className="flex gap-1.5 sm:gap-2 w-full">
                    <WhatsAppCardButton carName={car.name} className="h-7 sm:h-8" />
                    <a href="tel:+919855924442" className="flex-1 min-w-0">
                      <Button variant="call" size="sm" className="w-full gap-1 text-[10px] sm:text-xs h-7 sm:h-8 font-semibold px-2">
                        <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                        <span className="truncate">Call</span>
                      </Button>
                    </a>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Mobile View All Button */}
        <div className="mt-5 sm:mt-6 md:hidden">
          <Link to="/cars">
            <Button variant="outline" className="w-full text-sm">
              View All Cars
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};