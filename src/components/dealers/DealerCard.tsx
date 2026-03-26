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
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { getWhatsAppUrl, whatsappMessages } from "@/components/WhatsAppCTA";
import type { Dealer } from "@/data/dealerLocatorData";
 import { cn } from "@/lib/utils";

interface DealerCardProps {
  dealer: Dealer;
  distance?: number;
  onGetDirections: (dealer: Dealer) => void;
  compact?: boolean;
}

export const DealerCard = ({ dealer, distance, onGetDirections, compact = false }: DealerCardProps) => {
  const handleWhatsApp = () => {
    const message = whatsappMessages.dealerSpecific(dealer.name, dealer.city);
    window.open(getWhatsAppUrl(message), "_blank");
  };

  const handleCall = () => {
    window.open(`tel:${dealer.phone}`, "_self");
  };

  return (
    <Card className={cn(
      "group hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/40 overflow-hidden relative",
      "hover:-translate-y-1"
    )}>
      {/* Featured Glow Effect */}
      {dealer.isFeatured && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
        </div>
      )}

      <CardContent className="p-0">
        {/* Header with Brand & Rating */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-border/50 relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs font-medium bg-background/80">
                  {dealer.brand}
                </Badge>
                {dealer.isFeatured && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs border-0 gap-1">
                    <Sparkles className="h-3 w-3" />
                    Featured
                  </Badge>
                )}
              </div>
              <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {dealer.name}
              </h3>
            </div>
            <div className="flex items-center gap-1 bg-card border border-border/50 px-2.5 py-1.5 rounded-full shadow-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-sm">{dealer.rating}</span>
              <span className="text-muted-foreground text-xs">({dealer.reviews})</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Address & Distance */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground line-clamp-2">{dealer.address}</p>
              <p className="text-sm text-muted-foreground">
                {dealer.city}, {dealer.state} - {dealer.pincode}
              </p>
              {distance !== undefined && (
                <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">
                    {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)} km`} away
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Working Hours */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">{dealer.workingHours}</span>
          </div>

          {/* Services */}
          <div className="flex flex-wrap gap-2">
            {dealer.services.slice(0, 4).map((service) => (
              <div key={service} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                {service}
              </div>
            ))}
            {dealer.services.length > 4 && (
              <span className="text-xs text-foreground font-medium px-2 py-1">+{dealer.services.length - 4} more</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              onClick={handleWhatsApp}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              Get Best Deal
            </Button>
            <Button
              variant="outline"
              onClick={() => onGetDirections(dealer)}
              className="gap-2 font-medium"
            >
              <Navigation className="h-4 w-4" />
              Directions
            </Button>
          </div>

          {/* Contact Row */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
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
