 import { useState, useEffect } from "react";
 import { Link } from "react-router-dom";
 import { motion } from "framer-motion";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Input } from "@/components/ui/input";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   MapPin,
   LocateFixed,
   Search,
   Star,
   Navigation,
   MessageCircle,
   Building2,
   ArrowRight,
   Shield,
   Clock,
 } from "lucide-react";
 import { toast } from "sonner";
 import { dealerLocatorData, brands, cities, type Dealer } from "@/data/dealerLocatorData";
 import { getWhatsAppUrl, whatsappMessages } from "@/components/WhatsAppCTA";
 
 // Haversine formula
 const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
   const R = 6371;
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
 
 export const DealerLocatorWidget = () => {
   const [selectedBrand, setSelectedBrand] = useState("All Brands");
   const [selectedCity, setSelectedCity] = useState("");
   const [searchQuery, setSearchQuery] = useState("");
   const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
   const [isDetecting, setIsDetecting] = useState(false);
   const [nearbyDealers, setNearbyDealers] = useState<(Dealer & { distance?: number })[]>([]);
 
   // Auto-detect location on mount
   useEffect(() => {
     detectLocation();
   }, []);
 
   // Update dealers when filters or location change
   useEffect(() => {
     let dealers: (Dealer & { distance?: number })[] = [...dealerLocatorData];
 
     if (selectedBrand && selectedBrand !== "All Brands") {
       dealers = dealers.filter((d) => d.brand === selectedBrand);
     }
 
     if (selectedCity) {
       dealers = dealers.filter((d) => d.city === selectedCity);
     }
 
     if (searchQuery) {
       const query = searchQuery.toLowerCase();
       dealers = dealers.filter(
         (d) =>
           d.name.toLowerCase().includes(query) ||
           d.city.toLowerCase().includes(query) ||
           d.pincode.includes(query)
       );
     }
 
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
       dealers.sort((a, b) => {
         if (a.isFeatured && !b.isFeatured) return -1;
         if (!a.isFeatured && b.isFeatured) return 1;
         return b.rating - a.rating;
       });
     }
 
     setNearbyDealers(dealers.slice(0, 3));
   }, [selectedBrand, selectedCity, searchQuery, userLocation]);
 
   const detectLocation = () => {
     setIsDetecting(true);
     if ("geolocation" in navigator) {
       navigator.geolocation.getCurrentPosition(
         (position) => {
           setUserLocation({
             lat: position.coords.latitude,
             lng: position.coords.longitude,
           });
           toast.success("Location detected!");
           setIsDetecting(false);
         },
         () => {
           toast.error("Could not detect location");
           setIsDetecting(false);
         },
         { enableHighAccuracy: true, timeout: 10000 }
       );
     } else {
       toast.error("Geolocation not supported");
       setIsDetecting(false);
     }
   };
 
   const handleWhatsApp = (dealer: Dealer) => {
     const message = whatsappMessages.dealerSpecific(dealer.name, dealer.city);
     window.open(getWhatsAppUrl(message), "_blank");
   };
 
   const handleDirections = (dealer: Dealer) => {
     const url = userLocation
       ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${dealer.latitude},${dealer.longitude}`
       : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
           `${dealer.name}, ${dealer.address}, ${dealer.city}`
         )}`;
     window.open(url, "_blank");
   };
 
   return (
     <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 via-background to-background relative overflow-hidden">
       {/* Background Elements */}
       <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
         <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
       </div>
 
       <div className="container mx-auto px-4 relative z-10">
         {/* Section Header */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className="text-center mb-12"
         >
           <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1.5">
             <MapPin className="h-3.5 w-3.5 mr-1.5" />
             Dealer Network
           </Badge>
           <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
             Find <span className="text-primary">Authorized Dealers</span> Near You
           </h2>
           <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
             Connect with verified dealerships for exclusive offers, transparent pricing, and exceptional service.
           </p>
 
           {/* Trust Stats */}
           <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-8">
             <div className="flex items-center gap-2">
               <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                 <Building2 className="h-5 w-5 text-primary" />
               </div>
               <div className="text-left">
                 <p className="text-xl font-bold">{dealerLocatorData.length}+</p>
                 <p className="text-xs text-muted-foreground">Verified Dealers</p>
               </div>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                 <Star className="h-5 w-5 text-amber-500" />
               </div>
               <div className="text-left">
                 <p className="text-xl font-bold">4.5+</p>
                 <p className="text-xs text-muted-foreground">Average Rating</p>
               </div>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                 <Shield className="h-5 w-5 text-green-500" />
               </div>
               <div className="text-left">
                 <p className="text-xl font-bold">100%</p>
                 <p className="text-xs text-muted-foreground">Authorized</p>
               </div>
             </div>
           </div>
         </motion.div>
 
         {/* Search Card */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ delay: 0.1 }}
           className="max-w-4xl mx-auto mb-10"
         >
           <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg">
             <div className="flex flex-col md:flex-row gap-4">
               {/* Location Detection */}
               <Button
                 onClick={detectLocation}
                 disabled={isDetecting}
                 variant="outline"
                 className="gap-2 border-primary/30 hover:bg-primary/5 flex-shrink-0"
               >
                 <LocateFixed className={`h-4 w-4 ${isDetecting ? "animate-pulse" : ""}`} />
                 {isDetecting ? "Detecting..." : "Use My Location"}
               </Button>
 
               {/* Search Input */}
               <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   placeholder="Search by city, pincode, or dealer..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="pl-10"
                 />
               </div>
 
               {/* Brand Filter */}
               <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                 <SelectTrigger className="w-full md:w-[180px]">
                   <SelectValue placeholder="Select Brand" />
                 </SelectTrigger>
                 <SelectContent>
                   {brands.map((brand) => (
                     <SelectItem key={brand} value={brand}>
                       {brand}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
 
               {/* City Filter */}
               <Select value={selectedCity} onValueChange={setSelectedCity}>
                 <SelectTrigger className="w-full md:w-[160px]">
                   <SelectValue placeholder="Select City" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="">All Cities</SelectItem>
                   {cities.map((city) => (
                     <SelectItem key={city} value={city}>
                       {city}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>
         </motion.div>
 
         {/* Dealer Cards */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
           {nearbyDealers.map((dealer, index) => (
             <motion.div
               key={dealer.id}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.1 + index * 0.1 }}
               className="group"
             >
               <div className="bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                 {/* Header */}
                 <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-border/50">
                   <div className="flex items-start justify-between gap-3">
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">
                         <Badge variant="secondary" className="text-xs">
                           {dealer.brand}
                         </Badge>
                         {dealer.isFeatured && (
                           <Badge className="bg-amber-500 text-white text-xs border-0">Featured</Badge>
                         )}
                       </div>
                       <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                         {dealer.name}
                       </h3>
                     </div>
                     <div className="flex items-center gap-1 bg-card px-2.5 py-1 rounded-full border">
                       <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                       <span className="font-semibold text-sm">{dealer.rating}</span>
                     </div>
                   </div>
                 </div>
 
                 {/* Content */}
                 <div className="p-4 space-y-4">
                   {/* Address & Distance */}
                   <div className="flex items-start gap-3">
                     <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                       <MapPin className="h-4 w-4 text-primary" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm line-clamp-2">{dealer.address}</p>
                       <p className="text-sm text-muted-foreground">
                         {dealer.city}, {dealer.state}
                       </p>
                       {dealer.distance !== undefined && (
                         <p className="text-sm font-medium text-primary mt-1">
                           📍 {dealer.distance < 1
                             ? `${(dealer.distance * 1000).toFixed(0)}m`
                             : `${dealer.distance.toFixed(1)} km`}{" "}
                           away
                         </p>
                       )}
                     </div>
                   </div>
 
                   {/* Working Hours */}
                   <div className="flex items-center gap-3">
                     <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                       <Clock className="h-4 w-4 text-muted-foreground" />
                     </div>
                     <span className="text-sm text-muted-foreground">{dealer.workingHours}</span>
                   </div>
 
                   {/* CTAs */}
                   <div className="grid grid-cols-2 gap-2 pt-2">
                     <Button
                       onClick={() => handleWhatsApp(dealer)}
                       className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
                     >
                       <MessageCircle className="h-4 w-4" />
                       Get Best Deal
                     </Button>
                     <Button
                       variant="outline"
                       onClick={() => handleDirections(dealer)}
                       className="gap-2"
                     >
                       <Navigation className="h-4 w-4" />
                       Directions
                     </Button>
                   </div>
                 </div>
               </div>
             </motion.div>
           ))}
         </div>
 
         {/* View All CTA */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ delay: 0.4 }}
           className="text-center"
         >
           <Link to="/dealers">
             <Button size="lg" className="gap-2 px-8">
               View All {dealerLocatorData.length}+ Dealers
               <ArrowRight className="h-4 w-4" />
             </Button>
           </Link>
         </motion.div>
       </div>
     </section>
   );
 };
 
 export default DealerLocatorWidget;