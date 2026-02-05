import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fuel, Cog, Clock, TrendingDown, Phone, Heart, GitCompare, Check, FileText, Eye } from "lucide-react";
import { allCars } from "@/data/cars";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { useCompare } from "@/hooks/useCompare";
import { cn } from "@/lib/utils";
import { WhatsAppCardButton } from "@/components/WhatsAppCTA";

// Get featured cars for homepage - show first 12 cars with deals
const featuredCars = allCars.slice(0, 12).map(car => ({
  ...car,
  image: car.image || "/placeholder.svg",
  tagline: car.tagline || `The All New ${car.name}`,
  originalPrice: car.price.split(" - ")[0].replace("₹", "₹") + " (Base)",
  discount: car.offers?.[0]?.discount || "Special Offer",
  isHot: car.isNew || false,
  isLimited: car.isUpcoming || false,
  availability: car.isUpcoming ? "Coming Soon" : "Ready Stock",
}));

export const CarListings = () => {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInCompare, addToCompare, removeFromCompare, canAddMore } = useCompare();

  const handleCompareToggle = (carId: number) => {
    if (isInCompare(carId)) {
      removeFromCompare(carId);
    } else {
      addToCompare(carId);
    }
  };

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
          <Button variant="outline" size="lg" className="hidden md:flex">
            View All Cars
          </Button>
        </div>

        {/* 2 columns on mobile/tablet, 3 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {featuredCars.map((car, index) => (
            <Card
              key={car.id}
              variant="deal"
              className="overflow-hidden animate-fade-in car-card-glow flex flex-col"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Image Container - With Price Badge Overlay */}
              <div className="relative aspect-[4/3] overflow-hidden bg-secondary glow-image">
                <img
                  src={car.image}
                  alt={car.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Top Left: Hot Deal Badge */}
                {car.isHot && (
                  <div className="absolute top-2 left-2">
                    <Badge className="text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 bg-primary text-primary-foreground rounded-full font-semibold">
                      🔥 Hot Deal
                    </Badge>
                  </div>
                )}

                {/* Coming Soon Badge - Top Left */}
                {car.isLimited && !car.isHot && (
                  <div className="absolute top-2 left-2">
                    <Badge className="text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 bg-orange-500 text-white rounded-full">
                      ⚡ Coming Soon
                    </Badge>
                  </div>
                )}
                
                {/* Right Side: Favorite, Compare, Price Badge */}
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  {/* Favorite */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 bg-white/90 hover:bg-white shadow-sm"
                    onClick={() => toggleFavorite(car.id, car.slug)}
                  >
                    <Heart className={cn("h-4 w-4 sm:h-5 sm:w-5", isFavorite(car.id) && "fill-red-500 text-red-500")} />
                  </Button>

                  {/* Compare */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 sm:h-9 sm:w-9 bg-white/90 hover:bg-white shadow-sm",
                      isInCompare(car.id) && "text-primary"
                    )}
                    onClick={() => handleCompareToggle(car.id)}
                    disabled={!canAddMore && !isInCompare(car.id)}
                  >
                    {isInCompare(car.id) ? (
                      <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <GitCompare className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </Button>
                </div>

                {/* Price Badge - Bottom Right - Prominent */}
                <div className="absolute bottom-3 right-3">
                  <div className="bg-primary text-white rounded-full px-4 sm:px-5 py-1.5 sm:py-2 font-bold text-sm sm:text-base shadow-lg flex items-center gap-1.5">
                    <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                    {car.price.split(" - ")[0]}
                  </div>
                </div>
              </div>

              {/* Content Section - Flex grow to push buttons to bottom */}
              <CardContent className="p-3 sm:p-4 flex-grow">
                {/* Car Name */}
                <h3 className="font-heading text-sm sm:text-base font-bold text-foreground mb-2 line-clamp-2">
                  {car.name}
                </h3>
                
                {/* Price Range */}
                <div className="mb-2.5 sm:mb-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm sm:text-base font-bold text-primary">₹{car.price.split(" - ")[0].replace("₹", "")}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">onwards</span>
                  </div>
                  <p className="text-[9px] sm:text-xs text-muted-foreground">(Base)</p>
                </div>

                {/* Specs - Better organized */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                    <Fuel className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>{car.fuelTypes.join(" / ")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                    <Cog className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>{car.transmission[0]}</span>
                  </div>
                  {!car.isLimited && (
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs font-medium text-primary">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{car.availability}</span>
                    </div>
                  )}
                </div>
              </CardContent>

              {/* Action Buttons - Fixed at bottom */}
              <CardFooter className="p-3 sm:p-4 pt-0 flex flex-col gap-2.5 mt-auto">
                {/* Primary Action - View Details */}
                <Link to={`/car/${car.slug}`} className="w-full">
                  <Button variant="cta" size="sm" className="w-full gap-1.5 text-xs sm:text-sm h-9 sm:h-10 font-semibold">
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                </Link>
                
                {/* Secondary Actions Row */}
                <div className="flex gap-2 w-full">
                  {/* Unlock Best Price */}
                  <WhatsAppCardButton carName={car.name} className="flex-1 text-xs sm:text-sm h-9 sm:h-10 font-semibold" />
                  
                  {/* Call Expert */}
                  <a href="tel:+919577200023" className="flex-1">
                    <Button variant="call" size="sm" className="w-full gap-1.5 text-xs sm:text-sm h-9 sm:h-10 font-semibold">
                      <Phone className="h-4 w-4" />
                      <span>Call</span>
                    </Button>
                  </a>
                </div>

                {/* Brochure Download - Optional tertiary action */}
                <Link to={`/brochures?car=${car.slug}`} className="w-full">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Download Brochure
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Mobile View All Button */}
        <div className="mt-6 md:hidden">
          <Link to="/cars">
            <Button variant="outline" className="w-full">
              View All Cars
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
