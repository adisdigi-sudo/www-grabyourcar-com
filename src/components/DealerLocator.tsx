import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  Clock,
  Star,
  Shield,
  Navigation,
  Building2,
} from "lucide-react";
import { dealerNetwork, getAllStates, getCitiesByState, getDealersByCity, Dealer } from "@/data/dealerData";

interface DealerLocatorProps {
  carName?: string;
}

export const DealerLocator = ({ carName }: DealerLocatorProps) => {
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");

  const states = useMemo(() => getAllStates(), []);
  const cities = useMemo(() => 
    selectedState ? getCitiesByState(selectedState) : [], 
    [selectedState]
  );
  const dealers = useMemo(() => 
    selectedState && selectedCity ? getDealersByCity(selectedState, selectedCity) : [],
    [selectedState, selectedCity]
  );

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedCity("");
  };

  const totalDealers = useMemo(() => 
    dealerNetwork.reduce((acc, state) => 
      acc + state.cities.reduce((cityAcc, city) => cityAcc + city.dealers.length, 0), 0
    ), []
  );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Find Your Nearest Showroom
              </h3>
              <p className="text-muted-foreground mt-1">
                {carName ? `Book a test drive for ${carName}` : "Visit our authorized showrooms pan-India"}
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{totalDealers}+</p>
                <p className="text-sm text-muted-foreground">Showrooms</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{states.length}</p>
                <p className="text-sm text-muted-foreground">States</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Select Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">State</label>
              <Select value={selectedState} onValueChange={handleStateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">City</label>
              <Select 
                value={selectedCity} 
                onValueChange={setSelectedCity}
                disabled={!selectedState}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedState ? "Select City" : "Select state first"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dealers List */}
      {dealers.length > 0 ? (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">
            {dealers.length} Showroom{dealers.length > 1 ? 's' : ''} in {selectedCity}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dealers.map((dealer) => (
              <DealerCard key={dealer.id} dealer={dealer} />
            ))}
          </div>
        </div>
      ) : selectedState && selectedCity ? (
        <Card className="bg-secondary/50">
          <CardContent className="py-8 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No dealers found in this location.</p>
            <p className="text-sm text-muted-foreground mt-1">Try selecting a different city.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-secondary/50">
          <CardContent className="py-8 text-center">
            <Navigation className="h-12 w-12 mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Select a state and city to find showrooms near you.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const DealerCard = ({ dealer }: { dealer: Dealer }) => {
  const handleCall = () => {
    window.location.href = `tel:${dealer.phone.replace(/\s/g, '')}`;
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Hi, I'm interested in booking a test drive at ${dealer.name}.`);
    window.open(`https://wa.me/${dealer.whatsapp.replace(/[+\s]/g, '')}?text=${message}`, '_blank');
  };

  const handleDirections = () => {
    const query = encodeURIComponent(`${dealer.name}, ${dealer.address}, ${dealer.city}, ${dealer.pincode}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-foreground">{dealer.name}</h4>
              <p className="text-sm text-muted-foreground flex items-start gap-1 mt-1">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {dealer.address}, {dealer.city} - {dealer.pincode}
              </p>
            </div>
            {dealer.isAuthorized && (
              <Badge variant="outline" className="flex-shrink-0 bg-success/10 text-success border-success/30">
                <Shield className="h-3 w-3 mr-1" />
                Authorized
              </Badge>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-accent/10 px-2 py-1 rounded">
              <Star className="h-4 w-4 text-accent fill-accent" />
              <span className="font-semibold text-sm">{dealer.rating}</span>
            </div>
            <span className="text-sm text-muted-foreground">({dealer.reviews} reviews)</span>
          </div>

          {/* Working Hours */}
          <div className="bg-secondary/50 rounded-lg p-3 space-y-1.5">
            <p className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Working Hours
            </p>
            <div className="grid grid-cols-1 gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mon - Fri:</span>
                <span>{dealer.workingHours.weekdays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saturday:</span>
                <span>{dealer.workingHours.saturday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sunday:</span>
                <span>{dealer.workingHours.sunday}</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="flex flex-wrap gap-1.5">
            {dealer.services.map((service, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {service}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleCall} className="flex-1">
              <Phone className="h-4 w-4 mr-1.5" />
              Call
            </Button>
            <Button variant="whatsapp" size="sm" onClick={handleWhatsApp} className="flex-1">
              <MessageCircle className="h-4 w-4 mr-1.5" />
              WhatsApp
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDirections} className="flex-1">
              <Navigation className="h-4 w-4 mr-1.5" />
              Directions
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DealerLocator;
