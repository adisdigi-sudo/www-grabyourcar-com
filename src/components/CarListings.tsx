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
    <section id="cars" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Hot Deals This Week
            </h2>
            <p className="text-muted-foreground">
              Exclusive discounts on India's most popular cars
            </p>
          </div>
          <Button variant="outline" size="lg">
            View All Cars
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredCars.map((car, index) => (
            <Card
              key={car.id}
              variant="deal"
              className="overflow-hidden animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image Container */}
              <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                <img
                  src={car.image}
                  alt={car.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  {car.isHot && (
                    <Badge variant="hot">🔥 Hot Deal</Badge>
                  )}
                  {car.isLimited && (
                    <Badge variant="limited">⚡ {car.availability}</Badge>
                  )}
                </div>
                
                {/* Favorite & Compare & Discount */}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`bg-background/80 hover:bg-background ${isFavorite(car.id) ? "text-red-500" : "text-muted-foreground"}`}
                    onClick={() => toggleFavorite(car.id, car.slug)}
                  >
                    <Heart className={`h-5 w-5 ${isFavorite(car.id) ? "fill-current" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "bg-background/80 hover:bg-background",
                      isInCompare(car.id) ? "text-primary" : "text-muted-foreground",
                      !canAddMore && !isInCompare(car.id) && "opacity-50"
                    )}
                    onClick={() => handleCompareToggle(car.id)}
                    disabled={!canAddMore && !isInCompare(car.id)}
                    title={isInCompare(car.id) ? "Remove from compare" : canAddMore ? "Add to compare" : "Max 3 cars"}
                  >
                    {isInCompare(car.id) ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <GitCompare className="h-5 w-5" />
                    )}
                  </Button>
                  <Badge variant="deal" className="text-sm py-1 px-3">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {car.discount}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-5">
                <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                  {car.name}
                </h3>
                
                {/* Price */}
                <div className="mb-4">
                  <span className="text-2xl font-bold text-primary">{car.price}</span>
                  <span className="text-sm text-muted-foreground line-through ml-2">
                    {car.originalPrice}
                  </span>
                </div>

                {/* Specs */}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Fuel className="h-4 w-4 text-primary" />
                    <span>{car.fuelTypes.join(" / ")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Cog className="h-4 w-4 text-primary" />
                    <span>{car.transmission[0]}</span>
                  </div>
                  {!car.isLimited && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-success" />
                      <span className="text-success font-medium">{car.availability}</span>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-0 flex flex-col gap-3">
                {/* Primary Actions Row */}
                <div className="flex gap-2 w-full">
                  <Link to={`/car/${car.slug}`} className="flex-1">
                    <Button variant="cta" className="w-full gap-2">
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </Link>
                  <Link to={`/brochures?car=${car.slug}`}>
                    <Button variant="outline" size="icon" title="Download Brochure">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                
                {/* Secondary Actions Row - Sales-Driven WhatsApp */}
                <div className="flex gap-2 w-full">
                  <WhatsAppCardButton carName={car.name} />
                  <a href="tel:+919577200023" className="flex-1">
                    <Button variant="call" className="w-full gap-2 font-semibold hover:scale-[1.02] transition-transform">
                      <Phone className="h-4 w-4" />
                      Call Expert
                    </Button>
                  </a>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
