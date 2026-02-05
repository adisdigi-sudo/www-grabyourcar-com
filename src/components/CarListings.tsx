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
              className="overflow-hidden animate-fade-in car-card-glow"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Image Container - Compact on mobile */}
              <div className="relative aspect-[4/3] overflow-hidden bg-secondary glow-image">
                <img
                  src={car.image}
                  alt={car.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Badges - Smaller on mobile */}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                  {car.isHot && (
                    <Badge variant="hot" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                      🔥 Hot
                    </Badge>
                  )}
                  {car.isLimited && (
                    <Badge variant="limited" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                      ⚡ Soon
                    </Badge>
                  )}
                </div>
                
                {/* Favorite & Compare - Compact on mobile */}
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 sm:h-8 sm:w-8 bg-background/80 hover:bg-background",
                      isFavorite(car.id) ? "text-red-500" : "text-muted-foreground"
                    )}
                    onClick={() => toggleFavorite(car.id, car.slug)}
                  >
                    <Heart className={cn("h-4 w-4", isFavorite(car.id) && "fill-current")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 sm:h-8 sm:w-8 bg-background/80 hover:bg-background",
                      isInCompare(car.id) ? "text-primary" : "text-muted-foreground",
                      !canAddMore && !isInCompare(car.id) && "opacity-50"
                    )}
                    onClick={() => handleCompareToggle(car.id)}
                    disabled={!canAddMore && !isInCompare(car.id)}
                  >
                    {isInCompare(car.id) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <GitCompare className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Discount Badge - Bottom overlay */}
                <div className="absolute bottom-2 right-2">
                  <Badge variant="deal" className="text-[10px] sm:text-xs py-0.5 px-2">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {car.discount}
                  </Badge>
                </div>
              </div>

              {/* Content - Compact padding on mobile */}
              <CardContent className="p-3 sm:p-4 lg:p-5">
                <h3 className="font-heading text-sm sm:text-base lg:text-lg font-semibold text-foreground mb-1 line-clamp-1">
                  {car.name}
                </h3>
                
                {/* Price - Smaller on mobile */}
                <div className="mb-2 sm:mb-3">
                  <span className="text-base sm:text-lg lg:text-xl font-bold text-primary">{car.price.split(" - ")[0]}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground ml-1">onwards</span>
                </div>

                {/* Specs - Single line on mobile */}
                <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Fuel className="h-3 w-3 text-primary" />
                    <span>{car.fuelTypes[0]}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Cog className="h-3 w-3 text-primary" />
                    <span>{car.transmission[0]}</span>
                  </div>
                  {!car.isLimited && (
                    <div className="hidden sm:flex items-center gap-1">
                      <Clock className="h-3 w-3 text-success" />
                      <span className="text-success font-medium">Ready</span>
                    </div>
                  )}
                </div>
              </CardContent>

              {/* Footer - Stacked on mobile, compact */}
              <CardFooter className="p-3 sm:p-4 lg:p-5 pt-0 flex flex-col gap-2">
                {/* View Details - Primary CTA */}
                <Link to={`/car/${car.slug}`} className="w-full">
                  <Button variant="cta" size="sm" className="w-full gap-1.5 text-xs sm:text-sm h-8 sm:h-9">
                    <Eye className="h-3.5 w-3.5" />
                    View Details
                  </Button>
                </Link>
                
                {/* WhatsApp & Call - Side by side */}
                <div className="flex gap-2 w-full">
                  <WhatsAppCardButton carName={car.name} className="flex-1 text-xs h-8 sm:h-9" />
                  <a href="tel:+919577200023" className="flex-1">
                    <Button variant="call" size="sm" className="w-full gap-1 text-xs h-8 sm:h-9">
                      <Phone className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Call</span>
                    </Button>
                  </a>
                </div>
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
