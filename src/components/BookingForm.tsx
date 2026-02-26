 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { 
   Phone,
   User,
   Calendar,
   Mail,
   Car,
   Sparkles,
   CheckCircle,
   Shield,
   Bot
 } from "lucide-react";
 import { useState, FormEvent } from "react";
 import { toast } from "sonner";
 import { AnimatePresence, motion } from "framer-motion";
 import { WhatsAppOTPVerification } from "@/components/WhatsAppOTPVerification";
 import { supabase } from "@/integrations/supabase/client";
 import confetti from "canvas-confetti";
 
 interface BookingFormProps {
   carName: string;
   carBrand: string;
 }
 
 interface BookingFormData {
   name: string;
   phone: string;
   email: string;
   preferredDate: string;
 }
 
 export const BookingForm = ({ carName, carBrand }: BookingFormProps) => {
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [showOTPVerification, setShowOTPVerification] = useState(false);
   const [isVerified, setIsVerified] = useState(false);
   const [bookingForm, setBookingForm] = useState<BookingFormData>({
     name: "",
     phone: "",
     email: "",
     preferredDate: "",
   });
 
   const handleBookingSubmit = async (e: FormEvent) => {
     e.preventDefault();
     
     if (!bookingForm.name.trim() || !bookingForm.phone.trim()) {
       toast.error("Please fill in Name and Phone number");
       return;
     }
 
    if (!/^[6-9]\d{9}$/.test(bookingForm.phone)) {
       toast.error("Please enter a valid 10-digit phone number");
       return;
     }
 
    // If not verified, show OTP verification
    if (!isVerified) {
      setShowOTPVerification(true);
      return;
    }

    // Submit the lead
    await submitLead();
   };

   const handleOTPVerified = async () => {
     setIsVerified(true);
     setShowOTPVerification(false);
     // Auto-submit after verification
     await submitLead();
   };

   const submitLead = async () => {
     setIsSubmitting(true);
     try {
        const { error } = await supabase.from("leads").insert({
          name: bookingForm.name.trim(),
          customer_name: bookingForm.name.trim(),
          phone: bookingForm.phone.trim(),
          email: bookingForm.email.trim() || null,
          car_brand: carBrand,
          car_model: carName,
          source: "car_detail_booking_form",
          lead_type: "booking",
          status: "new",
          priority: "high",
          notes: bookingForm.preferredDate ? `Preferred visit date: ${bookingForm.preferredDate}` : null,
        });

       if (error) throw error;

       // Celebration!
       confetti({
         particleCount: 100,
         spread: 70,
         origin: { y: 0.6 },
         colors: ['#22c55e', '#16a34a', '#15803d', '#ffffff', '#fbbf24'],
       });

       toast.success("🎉 Booking request submitted! Our team will contact you within 30 minutes.");
       setBookingForm({ name: "", phone: "", email: "", preferredDate: "" });
       setIsVerified(false);
     } catch (error) {
       console.error("Error submitting booking:", error);
       toast.error("Something went wrong. Please try again.");
     } finally {
       setIsSubmitting(false);
     }
   };
 
   return (
    <Card className="border-2 border-success/30 shadow-xl overflow-hidden bg-gradient-to-br from-card via-card to-success/5 glow-border-pulse">
       <CardHeader className="pb-3 bg-gradient-to-r from-success/10 via-primary/5 to-success/10 border-b border-border/50">
         <CardTitle className="flex items-center gap-2 text-lg">
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-md">
             <Car className="h-5 w-5 text-white" />
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-success/20">
              <Bot className="h-2.5 w-2.5 text-success" />
            </div>
           </div>
           <div className="flex-1">
             <span className="block">Book Your Car</span>
             <span className="text-xs font-normal text-muted-foreground">{carBrand} {carName}</span>
           </div>
          <Badge variant="trust" className="text-xs">
             <Sparkles className="h-3 w-3 mr-1" />
            OTP Verified
           </Badge>
         </CardTitle>
       </CardHeader>
       <CardContent className="pt-5 pb-5">
        <AnimatePresence mode="wait">
          {showOTPVerification ? (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <WhatsAppOTPVerification
                phone={bookingForm.phone}
                onVerified={handleOTPVerified}
                onCancel={() => setShowOTPVerification(false)}
              />
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleBookingSubmit}
              className="space-y-4"
            >
           <div className="space-y-1.5">
             <Label htmlFor="booking-name" className="text-xs font-medium flex items-center gap-1.5">
               <User className="h-3.5 w-3.5 text-primary" />
               Full Name <span className="text-destructive">*</span>
             </Label>
             <Input
               id="booking-name"
               placeholder="Enter your full name"
               value={bookingForm.name}
               onChange={(e) => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
               className="h-11 bg-background/80 border-border/60 focus:border-success focus:ring-success/20"
               required
             />
           </div>
           
           <div className="space-y-1.5">
             <Label htmlFor="booking-phone" className="text-xs font-medium flex items-center gap-1.5">
               <Phone className="h-3.5 w-3.5 text-primary" />
              WhatsApp Number <span className="text-destructive">*</span>
              {isVerified && (
                <Badge variant="outline" className="text-[10px] ml-1 border-success/50 text-success py-0">
                  <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                  Verified
                </Badge>
              )}
             </Label>
             <Input
               id="booking-phone"
              placeholder="10-digit WhatsApp number"
               value={bookingForm.phone}
              onChange={(e) => {
                setBookingForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }));
                setIsVerified(false); // Reset verification if phone changes
              }}
               className="h-11 bg-background/80 border-border/60 focus:border-success focus:ring-success/20"
               required
             />
           </div>
           
           <div className="space-y-1.5">
             <Label htmlFor="booking-email" className="text-xs font-medium flex items-center gap-1.5">
               <Mail className="h-3.5 w-3.5 text-muted-foreground" />
               Email <span className="text-muted-foreground text-xs">(Optional)</span>
             </Label>
             <Input
               id="booking-email"
               type="email"
               placeholder="your@email.com"
               value={bookingForm.email}
               onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
               className="h-11 bg-background/80 border-border/60 focus:border-success focus:ring-success/20"
             />
           </div>
           
           <div className="space-y-1.5">
             <Label htmlFor="booking-date" className="text-xs font-medium flex items-center gap-1.5">
               <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
               Preferred Visit Date <span className="text-muted-foreground text-xs">(Optional)</span>
             </Label>
             <Input
               id="booking-date"
               type="date"
               value={bookingForm.preferredDate}
               onChange={(e) => setBookingForm(prev => ({ ...prev, preferredDate: e.target.value }))}
               className="h-11 bg-background/80 border-border/60 focus:border-success focus:ring-success/20"
               min={new Date().toISOString().split('T')[0]}
             />
           </div>
 
           <Button 
             type="submit" 
             variant="cta" 
             size="lg" 
             className="w-full font-semibold text-base shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] mt-2"
             disabled={isSubmitting}
           >
             {isSubmitting ? (
               <>
                 <span className="animate-spin mr-2">⏳</span>
                 Submitting...
               </>
             ) : (
               <>
                <Shield className="h-5 w-5 mr-2" />
                Verify & Book Now
               </>
             )}
           </Button>
           
           {/* Trust indicators */}
           <div className="flex flex-col gap-2 pt-3 border-t border-border/50">
             <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-success" />
              <span>WhatsApp OTP verified • <strong className="text-foreground">100% Secure</strong></span>
             </div>
             <div className="flex items-center gap-2 text-xs text-muted-foreground">
               <CheckCircle className="h-3.5 w-3.5 text-success" />
              <span>Our team will contact you within <strong className="text-foreground">30 minutes</strong></span>
             </div>
           </div>
            </motion.form>
          )}
        </AnimatePresence>
       </CardContent>
     </Card>
   );
 };