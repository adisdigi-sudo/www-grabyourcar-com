import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fuel, Settings2, Users, Calendar, Heart, MapPin } from "lucide-react";

interface RentalCar {
  id: number;
  name: string;
  image: string;
  fuelType: string;
  transmission: string;
  rent: number;
  brand: string;
  vehicleType: string;
  seats: number;
  year: number;
  color: string;
  available: boolean;
  location: string;
}

interface RentalCarCardProps {
  car: RentalCar;
  onBook: (car: RentalCar) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (carId: number) => void;
}

export const RentalCarCard = ({ car, onBook, isFavorite, onToggleFavorite }: RentalCarCardProps) => {
  return (
    <Card className="overflow-hidden border-border hover:shadow-lg transition-all group">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 pb-2 flex items-start justify-between">
          <div>
            <h3 className="font-bold text-foreground text-lg">{car.name}</h3>
            <p className="text-xs text-primary font-medium">{car.vehicleType} • {car.brand}</p>
          </div>
          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(car.id)}
                className="p-1.5 hover:bg-muted rounded-full transition-colors"
              >
                <Heart
                  className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                />
              </button>
            )}
            <Badge variant={car.available ? "default" : "secondary"} className="text-xs">
              {car.available ? "Available" : "Booked"}
            </Badge>
          </div>
        </div>

        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={car.image}
            alt={car.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {!car.available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="destructive" className="text-base px-4 py-1">Currently Booked</Badge>
            </div>
          )}
        </div>

        {/* Specs */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-t border-border/50 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Fuel className="h-4 w-4" />
            <span>{car.fuelType}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Settings2 className="h-4 w-4" />
            <span>{car.transmission}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{car.seats} Seats</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{car.year}</span>
          </div>
        </div>

        {/* Location */}
        <div className="px-4 py-2 flex items-center gap-1.5 text-sm text-muted-foreground border-t border-border/50">
          <MapPin className="h-4 w-4" />
          <span>{car.location}</span>
        </div>

        {/* Price & CTA */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-border/50">
          <div>
            <span className="text-sm text-muted-foreground">From </span>
            <span className="text-xl font-bold text-foreground">₹{car.rent.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">/day</span>
          </div>
          <Button
            variant="cta"
            size="sm"
            onClick={() => onBook(car)}
            disabled={!car.available}
            className="gap-1.5"
          >
            {car.available ? "Book Now" : "Unavailable"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
