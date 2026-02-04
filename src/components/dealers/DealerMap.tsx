import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink } from "lucide-react";
import type { Dealer } from "@/data/dealerLocatorData";

interface DealerMapProps {
  dealers: Dealer[];
  selectedDealer: Dealer | null;
  userLocation: { lat: number; lng: number } | null;
  onDealerSelect: (dealer: Dealer) => void;
}

export const DealerMap = ({ dealers, selectedDealer, userLocation, onDealerSelect }: DealerMapProps) => {
  // Placeholder for Google Maps integration
  // When API key is available, this will render an actual map
  
  const openInGoogleMaps = (dealer: Dealer) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${dealer.name}, ${dealer.address}, ${dealer.city}`
    )}`;
    window.open(url, "_blank");
  };

  return (
    <Card className="h-[400px] lg:h-[600px] overflow-hidden relative">
      {/* Placeholder Map UI */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px"
          }}
        />
        
        {/* Map pins for dealers */}
        <div className="absolute inset-0 p-4">
          <div className="relative w-full h-full">
            {/* Simulated map markers */}
            {dealers.slice(0, 8).map((dealer, index) => {
              const positions = [
                { top: "15%", left: "20%" },
                { top: "25%", left: "60%" },
                { top: "40%", left: "35%" },
                { top: "50%", left: "75%" },
                { top: "65%", left: "25%" },
                { top: "70%", left: "55%" },
                { top: "30%", left: "45%" },
                { top: "55%", left: "15%" },
              ];
              const pos = positions[index % positions.length];
              const isSelected = selectedDealer?.id === dealer.id;

              return (
                <button
                  key={dealer.id}
                  onClick={() => onDealerSelect(dealer)}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                    isSelected ? "z-20 scale-125" : "z-10 hover:scale-110"
                  }`}
                  style={{ top: pos.top, left: pos.left }}
                >
                  <div className={`relative ${isSelected ? "animate-bounce" : ""}`}>
                    <MapPin 
                      className={`h-8 w-8 drop-shadow-lg ${
                        isSelected 
                          ? "text-primary fill-primary/20" 
                          : "text-red-500 fill-red-500/20"
                      }`} 
                    />
                    {isSelected && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-background border shadow-lg rounded-lg px-3 py-2 whitespace-nowrap text-xs font-medium">
                        {dealer.name}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {/* User location marker */}
            {userLocation && (
              <div 
                className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2"
                style={{ top: "50%", left: "50%" }}
              >
                <div className="relative">
                  <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                  <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Google Maps integration notice */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg">
            <p className="text-sm text-muted-foreground mb-2">
              🗺️ Interactive map coming soon! Google Maps integration pending.
            </p>
            {selectedDealer && (
              <Button 
                size="sm" 
                onClick={() => openInGoogleMaps(selectedDealer)}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open "{selectedDealer.name}" in Google Maps
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
