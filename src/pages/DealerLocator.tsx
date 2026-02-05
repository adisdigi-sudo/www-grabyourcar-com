import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
 import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DealerCard } from "@/components/dealers/DealerCard";
import { DealerFilters } from "@/components/dealers/DealerFilters";
import { DealerMap } from "@/components/dealers/DealerMap";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
  import { MapPin, List, Map, Building2, Star, Shield, Sparkles, Phone, MessageCircle, Navigation, Loader2 } from "lucide-react";
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
   const [selectedCity, setSelectedCity] = useState("all");
   const [selectedState, setSelectedState] = useState("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
   const [nearMeActive, setNearMeActive] = useState(false);
   const [nearMeRadius, setNearMeRadius] = useState(50); // km

  const detectLocation = () => {
    setIsDetecting(true);
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          
           // Reverse geocode to get city name
           try {
             const response = await fetch(
               `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
             );
             const data = await response.json();
             const city = data.address?.city || data.address?.town || data.address?.suburb || data.address?.state_district;
             setDetectedLocation(city || `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`);
           } catch {
             setDetectedLocation(`${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`);
           }
           
           toast.success("Location detected! Tap 'Near Me' to find closest dealers.");
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

   const handleNearMe = async () => {
     if (!userLocation) {
       // First detect location
       setIsDetecting(true);
       
       if ("geolocation" in navigator) {
         navigator.geolocation.getCurrentPosition(
           async (position) => {
             const { latitude, longitude } = position.coords;
             setUserLocation({ lat: latitude, lng: longitude });
             
             try {
               const response = await fetch(
                 `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
               );
               const data = await response.json();
               const city = data.address?.city || data.address?.town || data.address?.suburb || data.address?.state_district;
               setDetectedLocation(city || `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`);
             } catch {
               setDetectedLocation(`${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`);
             }
             
             setNearMeActive(true);
             setSelectedBrand("All Brands");
             setSelectedCity("all");
             setSelectedState("all");
             setSearchQuery("");
             toast.success(`Showing dealers within ${nearMeRadius}km of your location!`);
             setIsDetecting(false);
           },
           (error) => {
             console.error("Geolocation error:", error);
             toast.error("Could not detect location. Please enable location services.");
             setIsDetecting(false);
           },
           { enableHighAccuracy: true, timeout: 10000 }
         );
       } else {
         toast.error("Geolocation not supported by your browser.");
         setIsDetecting(false);
       }
     } else {
       // Toggle near me mode
       if (nearMeActive) {
         setNearMeActive(false);
         toast.info("Showing all dealers");
       } else {
         setNearMeActive(true);
         setSelectedBrand("All Brands");
         setSelectedCity("all");
         setSelectedState("all");
         setSearchQuery("");
         toast.success(`Showing dealers within ${nearMeRadius}km of your location!`);
       }
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
     if (selectedState && selectedState !== "all") {
      dealers = dealers.filter((d) => d.state === selectedState);
    }

    // Apply city filter
     if (selectedCity && selectedCity !== "all") {
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
       
       // Filter by radius if Near Me is active
       if (nearMeActive) {
         dealers = dealers.filter((d) => (d.distance || 0) <= nearMeRadius);
       }
       
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
   }, [searchQuery, selectedBrand, selectedCity, selectedState, userLocation, nearMeActive, nearMeRadius]);

   // Get count of nearby dealers for badge
   const nearbyDealersCount = useMemo(() => {
     if (!userLocation) return 0;
     return dealerLocatorData.filter((dealer) => {
       const distance = calculateDistance(
         userLocation.lat,
         userLocation.lng,
         dealer.latitude,
         dealer.longitude
       );
       return distance <= nearMeRadius;
     }).length;
   }, [userLocation, nearMeRadius]);

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
        {/* Premium Hero Section */}
        <section className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background py-16 md:py-24 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-success/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-primary/5 via-transparent to-primary/5 blur-2xl" />
          </div>

          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl mx-auto text-center relative z-10"
            >
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm">
                <MapPin className="h-4 w-4 mr-2" />
                Dealer Network
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Find <span className="text-primary relative">
                  Authorized Dealers
                  <Sparkles className="absolute -top-2 -right-6 h-5 w-5 text-amber-500 animate-pulse" />
                </span>
                <br />
                Near You
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Discover verified dealerships with exclusive offers, transparent pricing, and exceptional service.
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-6 md:gap-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl px-5 py-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold">{dealerLocatorData.length}+</p>
                    <p className="text-sm text-muted-foreground">Verified Dealers</p>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl px-5 py-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Star className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold">4.5+</p>
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-3 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl px-5 py-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold">100%</p>
                    <p className="text-sm text-muted-foreground">Authorized</p>
                  </div>
                </motion.div>
              </div>

              {/* Quick Contact */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap justify-center gap-4 mt-10"
              >
                 {/* Near Me Button - Primary CTA */}
                 <Button
                   onClick={handleNearMe}
                   disabled={isDetecting}
                   size="lg"
                   className={`gap-2 shadow-lg hover:shadow-xl transition-all ${
                     nearMeActive 
                       ? "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 ring-2 ring-blue-400/50" 
                       : "bg-gradient-to-r from-primary to-primary/80"
                   }`}
                 >
                   {isDetecting ? (
                     <Loader2 className="h-5 w-5 animate-spin" />
                   ) : (
                     <Navigation className={`h-5 w-5 ${nearMeActive ? "animate-pulse" : ""}`} />
                   )}
                   {isDetecting ? "Detecting..." : nearMeActive ? "Near Me Active" : "Find Dealers Near Me"}
                   {nearbyDealersCount > 0 && !isDetecting && (
                     <Badge variant="secondary" className="ml-1 bg-white/20 text-white border-0">
                       {nearbyDealersCount}
                     </Badge>
                   )}
                 </Button>
                 
                <a href="https://wa.me/919577200023?text=Hi!%20I%27m%20looking%20for%20the%20best%20car%20deal%20from%20a%20nearby%20dealer.">
                  <Button variant="whatsapp" size="lg" className="gap-2 shadow-lg hover:shadow-xl">
                    <MessageCircle className="h-5 w-5" />
                    Get Best Deal via WhatsApp
                  </Button>
                </a>
                <a href="tel:+919577200023">
                  <Button variant="call" size="lg" className="gap-2 shadow-lg hover:shadow-xl">
                    <Phone className="h-5 w-5" />
                    Talk to Expert
                  </Button>
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

         {/* Near Me Radius Selector (when active) */}
         {nearMeActive && userLocation && (
           <motion.section
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: "auto" }}
             exit={{ opacity: 0, height: 0 }}
             className="bg-gradient-to-r from-blue-600/10 to-cyan-500/10 border-y border-blue-500/20"
           >
             <div className="container mx-auto px-4 py-4">
               <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                     <Navigation className="h-5 w-5 text-blue-500" />
                   </div>
                   <div>
                     <p className="font-semibold text-sm">Near Me Mode Active</p>
                     <p className="text-xs text-muted-foreground">
                       {detectedLocation ? `📍 ${detectedLocation}` : "Showing dealers near you"}
                     </p>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-3">
                   <span className="text-sm text-muted-foreground">Radius:</span>
                   <div className="flex gap-2">
                     {[25, 50, 100, 200].map((radius) => (
                       <Button
                         key={radius}
                         size="sm"
                         variant={nearMeRadius === radius ? "default" : "outline"}
                         onClick={() => setNearMeRadius(radius)}
                         className={nearMeRadius === radius ? "bg-blue-600 hover:bg-blue-700" : ""}
                       >
                         {radius}km
                       </Button>
                     ))}
                   </div>
                 </div>
                 
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => setNearMeActive(false)}
                   className="text-muted-foreground hover:text-foreground"
                 >
                   Clear
                 </Button>
               </div>
             </div>
           </motion.section>
         )}

        {/* Filters Section */}
        <section className="py-6 border-b sticky top-14 md:top-20 bg-background/95 backdrop-blur-sm z-40 shadow-sm">
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
        <section className="py-10 md:py-16">
          <div className="container mx-auto px-4">
            {/* Results Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
            >
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">
                  {filteredDealers.length} Dealer{filteredDealers.length !== 1 ? "s" : ""} Found
                   {nearMeActive && filteredDealers.length > 0 && (
                     <span className="text-lg font-normal text-muted-foreground ml-2">
                       within {nearMeRadius}km
                     </span>
                   )}
                </h2>
                <p className="text-sm text-muted-foreground">
                   {nearMeActive && userLocation
                     ? `Showing closest dealers to ${detectedLocation || "your location"}`
                     : userLocation 
                       ? "Sorted by distance from your location" 
                       : "Sorted by rating and featured status"}
                </p>
              </div>

                 {/* Near Me Quick Toggle (Mobile) */}
                 <Button
                   variant={nearMeActive ? "default" : "outline"}
                   size="sm"
                   onClick={handleNearMe}
                   disabled={isDetecting}
                   className={`gap-1.5 sm:hidden ${nearMeActive ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                 >
                   {isDetecting ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                   ) : (
                     <Navigation className="h-4 w-4" />
                   )}
                   Near Me
                 </Button>

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
            </motion.div>

            {/* Content */}
            {viewMode === "list" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Near Me Results Empty State */}
                 {nearMeActive && filteredDealers.length === 0 && userLocation && (
                   <motion.div
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="col-span-full text-center py-16"
                   >
                     <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                       <Navigation className="h-10 w-10 text-blue-500" />
                     </div>
                     <h3 className="text-lg font-semibold mb-2">No dealers within {nearMeRadius}km</h3>
                     <p className="text-muted-foreground mb-4">Try expanding your search radius</p>
                     <div className="flex justify-center gap-2">
                       {[100, 200, 500].map((radius) => (
                         <Button
                           key={radius}
                           variant="outline"
                           size="sm"
                           onClick={() => setNearMeRadius(radius)}
                         >
                           Try {radius}km
                         </Button>
                       ))}
                     </div>
                   </motion.div>
                 )}
                {filteredDealers.map((dealer, index) => (
                  <motion.div
                    key={dealer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <DealerCard
                      dealer={dealer}
                      distance={(dealer as any).distance}
                      onGetDirections={handleGetDirections}
                    />
                  </motion.div>
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
                    <motion.div
                      key={dealer.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <DealerCard
                        dealer={dealer}
                        distance={(dealer as any).distance}
                        onGetDirections={handleGetDirections}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {filteredDealers.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                  <MapPin className="h-12 w-12 text-muted-foreground/40" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No dealers found</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Try adjusting your search or filters
                </p>
                <Button
                  size="lg"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedBrand("All Brands");
                     setSelectedCity("all");
                     setSelectedState("all");
                     setNearMeActive(false);
                  }}
                >
                  Clear All Filters
                </Button>
              </motion.div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default DealerLocatorPage;
