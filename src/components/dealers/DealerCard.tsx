import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Phone, 
  Clock, 
  Star, 
  Navigation, 
  MessageCircle,
  Mail,
  CheckCircle2
} from "lucide-react";
import { getWhatsAppUrl, whatsappMessages } from "@/components/WhatsAppCTA";
import type { Dealer } from "@/data/dealerLocatorData";

interface DealerCardProps {
  dealer: Dealer;
  distance?: number;
  onGetDirections: (dealer: Dealer) => void;
}

export const DealerCard = ({ dealer, distance, onGetDirections }: DealerCardProps) => {
  const handleWhatsApp = () => {
    const message = whatsappMessages.dealerSpecific(dealer.name, dealer.city);
    window.open(getWhatsAppUrl(message), "_blank");
  };

  const handleCall = () => {
    window.open(`tel:${dealer.phone}`, "_self");
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 overflow-hidden">
      <CardContent className="p-0">
        {/* Header with Brand & Rating */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs font-medium">
                  {dealer.brand}
                </Badge>
                {dealer.isFeatured && (
                  <Badge className="bg-amber-500 text-white text-xs">Featured</Badge>
                )}
              </div>
              <h3 className="font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {dealer.name}
              </h3>
            </div>
            <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-sm">{dealer.rating}</span>
              <span className="text-muted-foreground text-xs">({dealer.reviews})</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Address & Distance */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-foreground">{dealer.address}</p>
              <p className="text-sm text-muted-foreground">
                {dealer.city}, {dealer.state} - {dealer.pincode}
              </p>
              {distance !== undefined && (
                <p className="text-sm font-medium text-primary mt-1">
                  📍 {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)} km`} away
                </p>
              )}
            </div>
          </div>

          {/* Working Hours */}
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">{dealer.workingHours}</span>
          </div>

          {/* Services */}
          <div className="flex flex-wrap gap-1.5">
            {dealer.services.slice(0, 4).map((service) => (
              <div key={service} className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {service}
              </div>
            ))}
            {dealer.services.length > 4 && (
              <span className="text-xs text-primary">+{dealer.services.length - 4} more</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              onClick={handleWhatsApp}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Get Best Deal
            </Button>
            <Button
              variant="outline"
              onClick={() => onGetDirections(dealer)}
              className="gap-2"
            >
              <Navigation className="h-4 w-4" />
              Directions
            </Button>
          </div>

          {/* Contact Row */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCall}
              className="text-muted-foreground hover:text-primary gap-1.5 h-8"
            >
              <Phone className="h-4 w-4" />
              <span className="text-xs">{dealer.phone}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`mailto:${dealer.email}`, "_blank")}
              className="text-muted-foreground hover:text-primary gap-1.5 h-8"
            >
              <Mail className="h-4 w-4" />
              <span className="text-xs">Email</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
