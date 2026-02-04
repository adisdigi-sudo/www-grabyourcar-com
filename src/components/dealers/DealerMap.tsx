import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Dealer } from "@/data/dealerLocatorData";
import { Button } from "@/components/ui/button";
import { Navigation, Phone, MessageCircle } from "lucide-react";

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icons
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

const dealerIcon = createCustomIcon("#ef4444");
const selectedDealerIcon = createCustomIcon("#3b82f6");
const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `<div style="
    background-color: #3b82f6;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3), 0 2px 5px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface DealerMapProps {
  dealers: Dealer[];
  selectedDealer: Dealer | null;
  userLocation: { lat: number; lng: number } | null;
  onDealerSelect: (dealer: Dealer) => void;
}

// Component to handle map view changes
const MapController = ({ 
  selectedDealer, 
  userLocation,
  dealers 
}: { 
  selectedDealer: Dealer | null;
  userLocation: { lat: number; lng: number } | null;
  dealers: Dealer[];
}) => {
  const map = useMap();

  useEffect(() => {
    if (selectedDealer) {
      map.flyTo([selectedDealer.latitude, selectedDealer.longitude], 15, {
        duration: 1,
      });
    } else if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 12, {
        duration: 1,
      });
    } else if (dealers.length > 0) {
      const bounds = L.latLngBounds(
        dealers.map((d) => [d.latitude, d.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [selectedDealer, userLocation, dealers, map]);

  return null;
};

export const DealerMap = ({ dealers, selectedDealer, userLocation, onDealerSelect }: DealerMapProps) => {
  // Default center: India
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const defaultZoom = 5;

  const getCenter = (): [number, number] => {
    if (userLocation) {
      return [userLocation.lat, userLocation.lng];
    }
    if (dealers.length > 0) {
      return [dealers[0].latitude, dealers[0].longitude];
    }
    return defaultCenter;
  };

  const getZoom = () => {
    if (userLocation || dealers.length > 0) {
      return 11;
    }
    return defaultZoom;
  };

  const handleGetDirections = (dealer: Dealer) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dealer.latitude},${dealer.longitude}`;
    window.open(url, "_blank");
  };

  const handleWhatsApp = (dealer: Dealer) => {
    const message = `Hi, I found ${dealer.name} on GrabYourCar. I'm interested in getting the best deal. Please share more details.`;
    window.open(`https://wa.me/${dealer.whatsapp}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCall = (dealer: Dealer) => {
    window.open(`tel:${dealer.phone}`, "_self");
  };

  return (
    <Card className="h-[400px] lg:h-[600px] overflow-hidden relative">
      <MapContainer
        center={getCenter()}
        zoom={getZoom()}
        className="h-full w-full z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController 
          selectedDealer={selectedDealer} 
          userLocation={userLocation}
          dealers={dealers}
        />

        {/* User location marker */}
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]} 
            icon={userLocationIcon}
          >
            <Popup>
              <div className="text-center">
                <p className="font-semibold">📍 Your Location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dealer markers */}
        {dealers.map((dealer) => (
          <Marker
            key={dealer.id}
            position={[dealer.latitude, dealer.longitude]}
            icon={selectedDealer?.id === dealer.id ? selectedDealerIcon : dealerIcon}
            eventHandlers={{
              click: () => onDealerSelect(dealer),
            }}
          >
            <Popup>
              <div className="min-w-[200px] p-1">
                <h3 className="font-bold text-sm mb-1">{dealer.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">{dealer.brand}</p>
                <p className="text-xs mb-3">{dealer.address}, {dealer.city}</p>
                
                <div className="flex flex-col gap-1.5">
                  <Button
                    size="sm"
                    className="w-full text-xs h-7"
                    variant="whatsapp"
                    onClick={() => handleWhatsApp(dealer)}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    WhatsApp
                  </Button>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-7"
                      onClick={() => handleCall(dealer)}
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-7"
                      onClick={() => handleGetDirections(dealer)}
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Directions
                    </Button>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Card>
  );
};
