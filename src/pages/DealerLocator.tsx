import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DealerCard } from "@/components/dealers/DealerCard";
import { DealerFilters } from "@/components/dealers/DealerFilters";
import { DealerMap } from "@/components/dealers/DealerMap";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MapPin, List, Map, Building2, Star, Shield } from "lucide-react";
import { toast } from "sonner";
import { dealerLocatorData, type Dealer } from "@/data/dealerLocatorData";

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const DealerLocatorPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("All Brands");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    setIsDetecting(true);
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          
          // Reverse geocode (mock for now - would use Google Geocoding API)
          // For demo, we'll just show coordinates
          setDetectedLocation(`Near ${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`);
          toast.success("Location detected! Showing nearby dealers.");
          setIsDetecting(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Could not detect location. Please search manually.");
          setIsDetecting(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error("Geolocation not supported by your browser.");
      setIsDetecting(false);
    }
  };

  // Filter and sort dealers
  const filteredDealers = useMemo(() => {
    let dealers: (Dealer & { distance?: number })[] = [...dealerLocatorData];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      dealers = dealers.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.city.toLowerCase().includes(query) ||
          d.pincode.includes(query) ||
          d.brand.toLowerCase().includes(query) ||
          d.address.toLowerCase().includes(query)
      );
    }

    // Apply brand filter
    if (selectedBrand && selectedBrand !== "All Brands") {
      dealers = dealers.filter((d) => d.brand === selectedBrand);
    }

    // Apply state filter
    if (selectedState) {
      dealers = dealers.filter((d) => d.state === selectedState);
    }

    // Apply city filter
    if (selectedCity) {
      dealers = dealers.filter((d) => d.city === selectedCity);
    }

    // Calculate distances and sort if user location is available
    if (userLocation) {
      dealers = dealers.map((dealer) => ({
        ...dealer,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          dealer.latitude,
          dealer.longitude
        ),
      }));
      dealers.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else {
      // Sort by featured first, then rating
      dealers.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return b.rating - a.rating;
      });
    }

    return dealers;
  }, [searchQuery, selectedBrand, selectedCity, selectedState, userLocation]);

  const handleGetDirections = (dealer: Dealer) => {
    const url = userLocation
      ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${dealer.latitude},${dealer.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${dealer.name}, ${dealer.address}, ${dealer.city}`
        )}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <Helmet>
        <title>Find Authorized Car Dealers Near You | GrabYourCar</title>
        <meta
          name="description"
          content="Locate authorized car dealerships near you. Find Maruti, Hyundai, Tata, Kia, Toyota dealers with directions, contact info, and exclusive offers."
        />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4" variant="secondary">
                <MapPin className="h-3 w-3 mr-1" />
                Dealer Network
              </Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Find <span className="text-primary">Authorized Dealers</span> Near You
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Discover verified dealerships with exclusive offers, transparent pricing, and exceptional service.
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span>{dealerLocatorData.length}+ Verified Dealers</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-5 w-5 text-amber-500" />
                  <span>4.5+ Average Rating</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>100% Authorized</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="py-6 border-b sticky top-16 bg-background/95 backdrop-blur-sm z-40">
          <div className="container mx-auto px-4">
            <DealerFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedBrand={selectedBrand}
              setSelectedBrand={setSelectedBrand}
              selectedCity={selectedCity}
              setSelectedCity={setSelectedCity}
              selectedState={selectedState}
              setSelectedState={setSelectedState}
              onDetectLocation={detectLocation}
              isDetecting={isDetecting}
              detectedLocation={detectedLocation}
            />
          </div>
        </section>

        {/* Results Section */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold">
                  {filteredDealers.length} Dealer{filteredDealers.length !== 1 ? "s" : ""} Found
                </h2>
                <p className="text-sm text-muted-foreground">
                  {userLocation ? "Sorted by distance from your location" : "Sorted by rating and featured status"}
                </p>
              </div>

              {/* View Toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "map")}>
                <TabsList>
                  <TabsTrigger value="list" className="gap-2">
                    <List className="h-4 w-4" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="map" className="gap-2">
                    <Map className="h-4 w-4" />
                    Map
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Content */}
            {viewMode === "list" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDealers.map((dealer) => (
                  <DealerCard
                    key={dealer.id}
                    dealer={dealer}
                    distance={(dealer as any).distance}
                    onGetDirections={handleGetDirections}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Map */}
                <div className="lg:col-span-2">
                  <DealerMap
                    dealers={filteredDealers}
                    selectedDealer={selectedDealer}
                    userLocation={userLocation}
                    onDealerSelect={setSelectedDealer}
                  />
                </div>

                {/* Side List */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {filteredDealers.slice(0, 6).map((dealer) => (
                    <DealerCard
                      key={dealer.id}
                      dealer={dealer}
                      distance={(dealer as any).distance}
                      onGetDirections={handleGetDirections}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {filteredDealers.length === 0 && (
              <div className="text-center py-16">
                <MapPin className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No dealers found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filters
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedBrand("All Brands");
                    setSelectedCity("");
                    setSelectedState("");
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default DealerLocatorPage;
