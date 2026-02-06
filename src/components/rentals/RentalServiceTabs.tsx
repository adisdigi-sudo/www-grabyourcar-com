import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Car, User, MapPin } from "lucide-react";
import { RentalService } from "@/hooks/useRentalServices";

interface RentalServiceTabsProps {
  services: RentalService[];
  activeService: string;
  onServiceChange: (slug: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  car: <Car className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  'map-pin': <MapPin className="h-4 w-4" />,
};

export const RentalServiceTabs = ({ services, activeService, onServiceChange }: RentalServiceTabsProps) => {
  return (
    <Tabs value={activeService} onValueChange={onServiceChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50">
        {services.map((service) => (
          <TabsTrigger
            key={service.slug}
            value={service.slug}
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 px-2 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {iconMap[service.icon || 'car'] || <Car className="h-4 w-4" />}
            <span className="text-xs sm:text-sm font-medium">{service.name}</span>
            <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] px-1.5">
              ₹{service.base_price?.toLocaleString()}/{service.price_unit?.replace('per ', '')}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
