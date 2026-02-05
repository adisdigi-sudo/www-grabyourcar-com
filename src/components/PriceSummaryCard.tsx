import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
 import { 
   IndianRupee, 
   TrendingDown, 
   MessageCircle, 
   Phone,
   ChevronDown,
   MapPin,
  Check,
  User,
  Calendar,
  Mail,
  Car,
  Sparkles
 } from "lucide-react";
 import { WhatsAppSalesCTA } from "@/components/WhatsAppCTA";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
import { useState, FormEvent } from "react";
 import { calculateStatePriceBreakup, stateRates } from "@/data/statePricing";
import { toast } from "sonner";
 
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
 
interface BookingFormData {
  name: string;
  phone: string;
  email: string;
  preferredDate: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    name: "",
    phone: "",
    email: "",
    preferredDate: "",
  });
   const breakup = calculateStatePriceBreakup(exShowroomPrice, selectedState);
 
   const formatPrice = (price: number) => {
     if (price >= 10000000) {
       return `₹${(price / 10000000).toFixed(2)} Cr`;
     }
     return `₹${(price / 100000).toFixed(2)} L`;
   };
 
  const handleBookingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!bookingForm.name.trim() || !bookingForm.phone.trim()) {
      toast.error("Please fill in Name and Phone number");
      return;
    }

    if (!/^\d{10}$/.test(bookingForm.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast.success("🎉 Booking request submitted! Our team will contact you within 30 minutes.");
    setBookingForm({ name: "", phone: "", email: "", preferredDate: "" });
    setIsSubmitting(false);
  };

   return (
    <div className="space-y-4">
      {/* Price Card */}
      <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary via-success to-primary/80 p-4 md:p-5">
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
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm animate-pulse">
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
          <div className="bg-gradient-to-br from-secondary/80 to-secondary/40 rounded-xl p-4 space-y-2.5 border border-border/50">
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
            <div className="flex justify-between text-sm border-t border-border pt-2.5 mt-2.5">
              <span className="font-semibold">On-Road Price</span>
              <span className="font-bold text-primary text-base">{formatPrice(breakup.onRoadPrice)}</span>
            </div>
           </div>

          {/* Contact for Best Deal */}
          <div className="bg-gradient-to-r from-primary/10 via-success/10 to-primary/10 rounded-xl p-4 border border-primary/20">
            <p className="text-sm text-center font-medium mb-3">
              Contact us for the <span className="text-primary font-bold">Best Deal</span> on this car
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
 
      {/* Book Your Car Form - Rich Design */}
      <Card className="border-2 border-success/30 shadow-xl overflow-hidden bg-gradient-to-br from-card via-card to-success/5">
        <CardHeader className="pb-3 bg-gradient-to-r from-success/10 to-primary/10 border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <Car className="h-4 w-4 text-success" />
            </div>
            <span>Book Your {carBrand} {carName}</span>
            <Badge variant="trust" className="ml-auto text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Quick Booking
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={bookingForm.name}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
                  className="h-10 bg-background/50 border-border/60 focus:border-success"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="10-digit mobile number"
                  value={bookingForm.phone}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className="h-10 bg-background/50 border-border/60 focus:border-success"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  Email (Optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={bookingForm.email}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                  className="h-10 bg-background/50 border-border/60 focus:border-success"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs font-medium flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  Preferred Visit Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={bookingForm.preferredDate}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                  className="h-10 bg-background/50 border-border/60 focus:border-success"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
 
            <Button 
              type="submit" 
              variant="cta" 
              size="lg" 
              className="w-full font-semibold text-base shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Submitting...
                </>
              ) : (
                <>
                  <Car className="h-5 w-5 mr-2" />
                  Book This Car Now
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              🔒 Your information is safe with us. Our team will contact you within 30 minutes.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
   );
 };