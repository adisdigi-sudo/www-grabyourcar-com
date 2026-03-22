import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fuel, Settings2, Users, Calendar, MapPin, User, Navigation } from "lucide-react";
import { RentalVehicle } from "@/hooks/useRentalServices";

interface RentalVehicleCardProps {
  vehicle: RentalVehicle;
  serviceType: 'self-drive' | 'with-driver' | 'outstation';
  onBook: (vehicle: RentalVehicle) => void;
}

export const RentalVehicleCard = ({ vehicle, serviceType, onBook }: RentalVehicleCardProps) => {
  const getPrice = () => {
    switch (serviceType) {
      case 'self-drive':
        return { amount: vehicle.rent_self_drive || 0, unit: '/day' };
      case 'with-driver':
        return { amount: vehicle.rent_with_driver || 0, unit: '/day' };
      case 'outstation':
        return { amount: vehicle.rent_outstation_per_km || 0, unit: '/km' };
      default:
        return { amount: 0, unit: '' };
    }
  };

  const price = getPrice();
  const ServiceIcon = serviceType === 'self-drive' ? Settings2 : serviceType === 'with-driver' ? User : Navigation;

  return (
    <Card className="overflow-hidden border-border hover:shadow-lg transition-all group">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 pb-2 flex items-start justify-between">
          <div>
            <h3 className="font-bold text-foreground text-lg">{vehicle.name}</h3>
            <p className="text-xs text-primary font-medium">{vehicle.vehicle_type} • {vehicle.brand}</p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <ServiceIcon className="h-3 w-3" />
            {serviceType === 'self-drive' ? 'Self Drive' : serviceType === 'with-driver' ? 'With Driver' : 'Outstation'}
          </Badge>
        </div>

        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-muted">
          {vehicle.image_url ? (
            <img
              src={vehicle.image_url}
              alt={vehicle.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Settings2 className="h-16 w-16 opacity-20" />
            </div>
          )}
          {!vehicle.is_available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="destructive" className="text-base px-4 py-1">Currently Booked</Badge>
            </div>
          )}
        </div>

        {/* Specs */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-t border-border/50 text-sm">
          {vehicle.fuel_type && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Fuel className="h-4 w-4" />
              <span>{vehicle.fuel_type}</span>
            </div>
          )}
          {vehicle.transmission && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Settings2 className="h-4 w-4" />
              <span>{vehicle.transmission}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{vehicle.seats} Seats</span>
          </div>
          {vehicle.year && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{vehicle.year}</span>
            </div>
          )}
        </div>

        {/* Pricing Details */}
        <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-border/50">
          {serviceType === 'self-drive' && (
            <>
              <Badge variant="outline" className="text-[10px] border-primary/20 text-muted-foreground">300 KM/day</Badge>
              <Badge variant="outline" className="text-[10px] border-primary/20 text-muted-foreground">Fuel not included</Badge>
              <Badge variant="outline" className="text-[10px] border-primary/20 text-muted-foreground">₹5K-10K deposit</Badge>
            </>
          )}
          {serviceType === 'with-driver' && (
            <>
              <Badge variant="outline" className="text-[10px] border-primary/20 text-muted-foreground">Driver included</Badge>
              <Badge variant="outline" className="text-[10px] border-primary/20 text-muted-foreground">Fuel extra</Badge>
            </>
          )}
          {serviceType === 'outstation' && (
            <>
              <Badge variant="outline" className="text-[10px] border-primary/20 text-muted-foreground">Driver + Fuel</Badge>
              <Badge variant="outline" className="text-[10px] border-primary/20 text-muted-foreground">Min 250 KM/day</Badge>
            </>
          )}
        </div>

        {/* Location */}
        {vehicle.location && (
          <div className="px-4 py-2 flex items-center gap-1.5 text-sm text-muted-foreground border-t border-border/50">
            <MapPin className="h-4 w-4" />
            <span>{vehicle.location}</span>
          </div>
        )}

        {/* Price & CTA */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-border/50">
          <div>
            <span className="text-sm text-muted-foreground">From </span>
            <span className="text-xl font-bold text-foreground">₹{price.amount.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">{price.unit}</span>
          </div>
          <Button
            variant="cta"
            size="sm"
            onClick={() => onBook(vehicle)}
            disabled={!vehicle.is_available}
            className="gap-1.5"
          >
            {vehicle.is_available ? 'Book Now' : 'Unavailable'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
