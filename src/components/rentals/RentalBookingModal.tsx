import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Clock, MapPin, Phone, MessageCircle, CheckCircle2, Fuel, Settings2, CreditCard, Loader2 } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpay } from "@/hooks/useRazorpay";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface RentalCar {
  id: number;
  name: string;
  image: string;
  fuelType: string;
  transmission: string;
  rent: number;
  brand: string;
  vehicleType: string;
  seats: number;
  year: number;
  color: string;
  available: boolean;
  location: string;
}

interface RentalBookingModalProps {
  car: RentalCar | null;
  isOpen: boolean;
  onClose: () => void;
}

const timeSlots = [
  "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM",
];

const pickupLocations = [
  "Delhi - Connaught Place",
  "Delhi - Rajiv Chowk",
  "Noida - Sector 18",
  "Noida - Sector 62",
  "Greater Noida - Pari Chowk",
  "Gurugram - Cyber Hub",
  "Gurugram - MG Road",
  "Ghaziabad - Vaishali",
];

export const RentalBookingModal = ({ car, isOpen, onClose }: RentalBookingModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiatePayment, isLoading: isPaymentLoading } = useRazorpay();
  
  const [pickupDate, setPickupDate] = useState<Date>();
  const [dropoffDate, setDropoffDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [sameDropoff, setSameDropoff] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  if (!car) return null;

  const rentalDays = pickupDate && dropoffDate ? Math.max(1, differenceInDays(dropoffDate, pickupDate)) : 1;
  const baseRent = car.rent * rentalDays;
  const gst = Math.round(baseRent * 0.18);
  const securityDeposit = 2000;
  const totalAmount = baseRent + gst;

  const validateForm = () => {
    if (!pickupDate || !dropoffDate || !pickupTime || !dropoffTime || !pickupLocation) {
      toast.error("Please fill all required booking details");
      return false;
    }

    if (!customerName || !customerPhone) {
      toast.error("Please provide your contact details");
      return false;
    }

    if (customerPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return false;
    }

    return true;
  };

  const handlePayNow = async () => {
    if (!validateForm()) return;

    if (!user) {
      toast.error("Please login to make a booking");
      navigate("/auth");
      return;
    }

    setIsCreatingBooking(true);

    try {
      // Create booking in database first
      const bookingData = {
        user_id: user.id,
        vehicle_name: car.name,
        vehicle_type: car.vehicleType,
        vehicle_image: car.image,
        pickup_date: format(pickupDate!, "yyyy-MM-dd"),
        pickup_time: pickupTime,
        dropoff_date: format(dropoffDate!, "yyyy-MM-dd"),
        dropoff_time: dropoffTime,
        pickup_location: pickupLocation,
        dropoff_location: sameDropoff ? pickupLocation : dropoffLocation,
        daily_rate: car.rent,
        total_days: rentalDays,
        subtotal: baseRent,
        security_deposit: securityDeposit,
        total_amount: totalAmount,
        status: "pending",
        payment_status: "pending",
      };

      const { data: booking, error } = await supabase
        .from("rental_bookings")
        .insert(bookingData)
        .select()
        .single();

      if (error) throw error;

      // Initiate Razorpay payment
      initiatePayment({
        amount: totalAmount,
        receipt: `RENTAL-${booking.id.substring(0, 8)}`,
        bookingType: "rental",
        bookingId: booking.id,
        customerName,
        customerEmail: customerEmail || `${customerPhone}@grabyourcar.in`,
        customerPhone,
        description: `Self-Drive Rental: ${car.name} for ${rentalDays} days`,
        notes: {
          vehicleName: car.name,
          rentalDays: rentalDays.toString(),
          pickupLocation,
        },
        onSuccess: (paymentData) => {
          toast.success("Booking confirmed! Check My Bookings for details.");
          onClose();
          navigate("/my-bookings");
        },
        onError: (error) => {
          console.error("Payment failed:", error);
          // Booking is created but payment failed - user can retry from My Bookings
        },
      });
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to create booking");
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handleBookViaWhatsApp = () => {
    if (!validateForm()) return;

    // Generate booking message for WhatsApp
    const message = `Hi! I want to book a self-drive car:\n\n` +
      `🚗 Car: ${car.name}\n` +
      `📅 Pickup: ${format(pickupDate!, "dd MMM yyyy")} at ${pickupTime}\n` +
      `📅 Dropoff: ${format(dropoffDate!, "dd MMM yyyy")} at ${dropoffTime}\n` +
      `📍 Pickup Location: ${pickupLocation}\n` +
      `📍 Dropoff Location: ${sameDropoff ? pickupLocation : dropoffLocation}\n` +
      `💰 Total: ₹${totalAmount.toLocaleString()}\n\n` +
      `Name: ${customerName}\n` +
      `Phone: ${customerPhone}`;

    const whatsappUrl = `https://wa.me/919855924442?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    
    toast.success("Redirecting to WhatsApp for booking confirmation!");
    onClose();
  };

  const isProcessing = isCreatingBooking || isPaymentLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Book Your Ride</DialogTitle>
        </DialogHeader>

        {/* Car Summary */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <img
                src={car.image}
                alt={car.name}
                className="w-24 h-16 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{car.name}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Fuel className="h-3 w-3" />
                    {car.fuelType}
                  </span>
                  <span className="flex items-center gap-1">
                    <Settings2 className="h-3 w-3" />
                    {car.transmission}
                  </span>
                  <Badge variant="secondary">{car.seats} Seater</Badge>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-primary">₹{car.rent}</span>
                <span className="text-sm text-muted-foreground">/day</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <div className="space-y-6 mt-4">
          {/* Pickup & Dropoff Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pickup Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !pickupDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {pickupDate ? format(pickupDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={pickupDate}
                    onSelect={(date) => {
                      setPickupDate(date);
                      if (date && (!dropoffDate || dropoffDate <= date)) {
                        setDropoffDate(addDays(date, 1));
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Pickup Time *</Label>
              <Select value={pickupTime} onValueChange={setPickupTime}>
                <SelectTrigger>
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Drop-off Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dropoffDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dropoffDate ? format(dropoffDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dropoffDate}
                    onSelect={setDropoffDate}
                    disabled={(date) => date < (pickupDate || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Drop-off Time *</Label>
              <Select value={dropoffTime} onValueChange={setDropoffTime}>
                <SelectTrigger>
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pickup Location *</Label>
              <Select value={pickupLocation} onValueChange={setPickupLocation}>
                <SelectTrigger>
                  <MapPin className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Select pickup location" />
                </SelectTrigger>
                <SelectContent>
                  {pickupLocations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sameDropoff"
                checked={sameDropoff}
                onChange={(e) => setSameDropoff(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="sameDropoff" className="text-sm cursor-pointer">
                Drop-off at same location
              </Label>
            </div>

            {!sameDropoff && (
              <div className="space-y-2">
                <Label>Drop-off Location *</Label>
                <Select value={dropoffLocation} onValueChange={setDropoffLocation}>
                  <SelectTrigger>
                    <MapPin className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select drop-off location" />
                  </SelectTrigger>
                  <SelectContent>
                    {pickupLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* Customer Details */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contact Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="Your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number *</Label>
                <Input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                  maxLength={10}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Price Breakdown */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Price Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Base Rent (₹{car.rent} × {rentalDays} days)</span>
                  <span>₹{baseRent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%)</span>
                  <span>₹{gst.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Security Deposit (Refundable)</span>
                  <span>₹{securityDeposit.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount</span>
                  <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handlePayNow} 
              variant="cta" 
              size="lg" 
              className="flex-1 gap-2"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Pay ₹{totalAmount.toLocaleString()}
                </>
              )}
            </Button>
            <Button 
              onClick={handleBookViaWhatsApp} 
              variant="outline" 
              size="lg" 
              className="flex-1 gap-2"
              disabled={isProcessing}
            >
              <MessageCircle className="h-5 w-5" />
              Book via WhatsApp
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <img 
              src="https://razorpay.com/favicon.png" 
              alt="Razorpay" 
              className="h-4 w-4"
            />
            <span>Secured by Razorpay</span>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            * Security deposit of ₹{securityDeposit.toLocaleString()} is refundable upon return of vehicle in good condition
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
