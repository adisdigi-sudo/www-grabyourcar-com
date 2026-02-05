 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { 
   IndianRupee, 
   TrendingDown, 
   MessageCircle, 
   Phone,
   ChevronDown,
   MapPin,
   Check
 } from "lucide-react";
 import { WhatsAppSalesCTA } from "@/components/WhatsAppCTA";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { useState } from "react";
 import { calculateStatePriceBreakup, stateRates } from "@/data/statePricing";
 
 interface PriceSummaryCardProps {
   carName: string;
   carBrand: string;
   exShowroomPrice: number;
   variants: {
     name: string;
     price: string;
     priceNumeric?: number;
   }[];
   selectedVariant: number;
   onVariantChange: (index: number) => void;
 }
 
 export const PriceSummaryCard = ({
   carName,
   carBrand,
   exShowroomPrice,
   variants,
   selectedVariant,
   onVariantChange,
 }: PriceSummaryCardProps) => {
   const [selectedState, setSelectedState] = useState("DL");
   const breakup = calculateStatePriceBreakup(exShowroomPrice, selectedState);
 
   const formatPrice = (price: number) => {
     if (price >= 10000000) {
       return `₹${(price / 10000000).toFixed(2)} Cr`;
     }
     return `₹${(price / 100000).toFixed(2)} L`;
   };
 
   return (
     <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
       <div className="bg-gradient-to-r from-primary to-primary/80 p-4 md:p-5">
         <div className="flex items-center justify-between text-primary-foreground">
           <div>
             <p className="text-sm opacity-80">On-Road Price</p>
             <div className="flex items-baseline gap-2">
               <span className="text-2xl md:text-3xl font-bold">
                 {formatPrice(breakup.onRoadPrice)}
               </span>
               <span className="text-sm opacity-70">onwards</span>
             </div>
           </div>
           <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
             <TrendingDown className="h-3 w-3 mr-1" />
             Best Price
           </Badge>
         </div>
       </div>
       
       <CardContent className="p-4 md:p-5 space-y-4">
         {/* Variant & State Selection */}
         <div className="grid grid-cols-2 gap-3">
           <div>
             <label className="text-xs text-muted-foreground mb-1.5 block">Select Variant</label>
             <Select 
               value={selectedVariant.toString()} 
               onValueChange={(v) => onVariantChange(parseInt(v))}
             >
               <SelectTrigger className="h-9 text-sm">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {variants.map((variant, index) => (
                   <SelectItem key={index} value={index.toString()}>
                     {variant.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
           
           <div>
             <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
               <MapPin className="h-3 w-3" />
               Select City
             </label>
             <Select value={selectedState} onValueChange={setSelectedState}>
               <SelectTrigger className="h-9 text-sm">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {stateRates.map((state) => (
                   <SelectItem key={state.code} value={state.code}>
                     {state.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
         </div>
 
         {/* Price Breakdown Summary */}
         <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
           <div className="flex justify-between text-sm">
             <span className="text-muted-foreground">Ex-Showroom Price</span>
             <span className="font-medium">{formatPrice(breakup.exShowroom)}</span>
           </div>
           <div className="flex justify-between text-sm">
             <span className="text-muted-foreground">RTO & Registration</span>
             <span className="font-medium">{formatPrice(breakup.rto + breakup.registration)}</span>
           </div>
           <div className="flex justify-between text-sm">
             <span className="text-muted-foreground">Insurance (1 Year)</span>
             <span className="font-medium">{formatPrice(breakup.insurance)}</span>
           </div>
           <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
             <span className="font-semibold">On-Road Price</span>
             <span className="font-bold text-primary">{formatPrice(breakup.onRoadPrice)}</span>
           </div>
         </div>
 
         {/* Contact for Best Deal */}
         <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
           <p className="text-sm text-center font-medium mb-3">
             Contact us for the <span className="text-primary">Best Deal</span> on this car
           </p>
           <div className="grid grid-cols-2 gap-2">
             <WhatsAppSalesCTA 
               carName={`${carBrand} ${carName}`}
               type="price"
               size="sm"
               className="w-full justify-center"
             />
             <a href="tel:+919577200023" className="block">
               <Button variant="call" size="sm" className="w-full">
                 <Phone className="h-4 w-4 mr-1.5" />
                 Call Expert
               </Button>
             </a>
           </div>
         </div>
 
         {/* Trust indicators */}
         <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
           <span className="flex items-center gap-1">
             <Check className="h-3 w-3 text-success" />
             No Hidden Charges
           </span>
           <span className="flex items-center gap-1">
             <Check className="h-3 w-3 text-success" />
             Verified Dealers
           </span>
         </div>
       </CardContent>
     </Card>
   );
 };