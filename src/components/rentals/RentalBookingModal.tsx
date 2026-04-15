import { useEffect, useRef, useState } from "react";
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
import { triggerWhatsApp } from "@/lib/whatsappTrigger";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpay } from "@/hooks/useRazorpay";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { buildRentalLeadMetadata, captureRentalJourneyStep, clearRentalJourneySession, syncRentalJourneySnapshot } from "@/lib/rentalJourney";

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
  const { user, signInWithPhone } = useAuth();
  const navigate = useNavigate();
  const { initiatePayment, isLoading: isPaymentLoading } = useRazorpay();
  const [draftBookingId, setDraftBookingId] = useState<string | null>(null);
  const bookingCompletedRef = useRef(false);
  const carData = car ?? {
    id: 0,
    name: "",
    image: "",
    fuelType: "",
    transmission: "",
    rent: 0,
    brand: "",
    vehicleType: "",
    seats: 0,
    year: 0,
    color: "",
    available: false,
    location: "",
  };
  
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

  const rentalDays = pickupDate && dropoffDate ? Math.max(1, differenceInDays(dropoffDate, pickupDate)) : 1;
  const baseRent = carData.rent * rentalDays;
  const gst = Math.round(baseRent * 0.18);
  const securityDeposit = 2000;
  const totalAmount = baseRent + gst;

  useEffect(() => {
    if (!isOpen || !car) return;

    syncRentalJourneySnapshot({
      selectedVehicle: {
        id: car.id,
        name: car.name,
        brand: car.brand,
        vehicleType: car.vehicleType,
        location: car.location,
        rent: car.rent,
      },
    });
    captureRentalJourneyStep("booking_modal_opened", {
      vehicleId: car.id,
      vehicleName: car.name,
      serviceType: "self-drive",
    });
  }, [car, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    syncRentalJourneySnapshot({
      selectedVehicle: car ? {
        id: car.id,
        name: car.name,
        brand: car.brand,
        vehicleType: car.vehicleType,
        location: car.location,
        rent: car.rent,
      } : null,
      bookingId: draftBookingId,
    });
  }, [car, draftBookingId, isOpen]);

  const maybeCaptureAbandonment = async () => {
    if (!car || bookingCompletedRef.current) return;

    const hasMeaningfulProgress = Boolean(
      customerName || customerPhone || pickupDate || dropoffDate || pickupLocation || pickupTime,
    );

    if (!hasMeaningfulProgress) return;

    captureRentalJourneyStep("booking_abandoned", {
      vehicleId: car.id,
      vehicleName: car.name,
      hasContact: Boolean(customerPhone),
    });

    const cleanPhone = customerPhone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone) || !customerName || !pickupDate || !dropoffDate || !pickupTime || !dropoffTime || !pickupLocation) {
      return;
    }

    let currentUser = user;

    if (!currentUser) {
      const { error } = await signInWithPhone(cleanPhone);
      if (error) return;
      const { data } = await supabase.auth.getUser();
      currentUser = data.user;
      if (!currentUser) return;
    }

    const meta = buildRentalLeadMetadata();
    const abandonedPayload = {
      user_id: currentUser.id,
      vehicle_name: carData.name,
      vehicle_type: carData.vehicleType,
      vehicle_image: carData.image,
      pickup_date: format(pickupDate, "yyyy-MM-dd"),
      pickup_time: pickupTime,
      dropoff_date: format(dropoffDate, "yyyy-MM-dd"),
      dropoff_time: dropoffTime,
      pickup_location: pickupLocation,
      dropoff_location: sameDropoff ? pickupLocation : dropoffLocation || pickupLocation,
      daily_rate: carData.rent,
      total_days: rentalDays,
      subtotal: baseRent,
      security_deposit: securityDeposit,
      total_amount: totalAmount,
      status: "pending",
      payment_status: "pending",
      customer_name: customerName,
      phone: cleanPhone,
      email: customerEmail || null,
      pipeline_stage: "website_lead",
      is_abandoned: true,
      abandoned_at: new Date().toISOString(),
      abandoned_step: "checkout_started",
      source: "website_self_drive",
      website_journey: meta.websiteJourney,
      utm_source: meta.utmSource,
      utm_medium: meta.utmMedium,
      utm_campaign: meta.utmCampaign,
      page_referrer: meta.pageReferrer,
      session_duration_seconds: meta.sessionDurationSeconds,
      documents_status: { dl: "pending", aadhaar: "pending", address_proof: "pending", selfie: "pending" },
      kyc_verified: false,
      last_activity_at: new Date().toISOString(),
      notes: "Website checkout abandoned before payment",
    };

    if (draftBookingId) {
      await supabase.from("rental_bookings").update(abandonedPayload as any).eq("id", draftBookingId);
      return;
    }

    const { data } = await supabase.from("rental_bookings").insert(abandonedPayload as any).select("id").single();
    if (data?.id) {
      setDraftBookingId(data.id);
      syncRentalJourneySnapshot({ bookingId: data.id });
    }
  };

  const handleDialogChange = async (nextOpen: boolean) => {
    if (!nextOpen) {
      await maybeCaptureAbandonment();
    }
    onClose();
  };

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

    captureRentalJourneyStep("checkout_details_completed", {
      customerName,
      phone: customerPhone,
      pickupLocation,
      sameDropoff,
    });

    return true;
  };

  const handlePayNow = async () => {
    if (!validateForm()) return;

    // Silent auto-login using customer phone (no redirect needed)
    captureRentalJourneyStep("payment_attempted", {
      vehicleName: car.name,
      totalAmount,
      rentalDays,
    });

    let currentUser = user;
    if (!currentUser) {
      try {
        const cleanPhone = customerPhone.replace(/\D/g, "").slice(-10);
        const { error } = await signInWithPhone(cleanPhone);
        if (error) {
          toast.error(error.message || "Could not create booking session. Please try again.");
          return;
        }

        const { data } = await supabase.auth.getUser();
        currentUser = data.user;

        if (!currentUser) {
          toast.error("Session not ready. Please try again.");
          return;
        }
      } catch {
        toast.error("Something went wrong. Please try again.");
        return;
      }
    }

    setIsCreatingBooking(true);

    try {
      const meta = buildRentalLeadMetadata();

      // Create booking in database first
      const bookingData = {
        user_id: currentUser.id,
        vehicle_name: carData.name,
        vehicle_type: carData.vehicleType,
        vehicle_image: carData.image,
        pickup_date: format(pickupDate!, "yyyy-MM-dd"),
        pickup_time: pickupTime,
        dropoff_date: format(dropoffDate!, "yyyy-MM-dd"),
        dropoff_time: dropoffTime,
        pickup_location: pickupLocation,
        dropoff_location: sameDropoff ? pickupLocation : dropoffLocation,
        daily_rate: carData.rent,
        total_days: rentalDays,
        subtotal: baseRent,
        security_deposit: securityDeposit,
        total_amount: totalAmount,
        status: "pending",
        payment_status: "pending",
        customer_name: customerName,
        phone: customerPhone,
        email: customerEmail || null,
        pipeline_stage: "booking_payment",
        source: "website_self_drive",
        website_journey: meta.websiteJourney,
        utm_source: meta.utmSource,
        utm_medium: meta.utmMedium,
        utm_campaign: meta.utmCampaign,
        page_referrer: meta.pageReferrer,
        session_duration_seconds: meta.sessionDurationSeconds,
        documents_status: { dl: "pending", aadhaar: "pending", address_proof: "pending", selfie: "pending" },
        kyc_verified: false,
        is_abandoned: false,
        abandoned_step: null,
        last_activity_at: new Date().toISOString(),
      };

      const bookingQuery = draftBookingId
        ? supabase.from("rental_bookings").update(bookingData as any).eq("id", draftBookingId).select().single()
        : supabase.from("rental_bookings").insert(bookingData as any).select().single();

      const { data: booking, error } = await bookingQuery;

      if (error) throw error;

      setDraftBookingId(booking.id);
      syncRentalJourneySnapshot({ bookingId: booking.id });
      captureRentalJourneyStep("booking_created", { bookingId: booking.id, totalAmount });

      // Initiate Razorpay payment
      initiatePayment({
        amount: totalAmount,
        receipt: `RENTAL-${booking.id.substring(0, 8)}`,
        bookingType: "rental",
        bookingId: booking.id,
        customerName,
        customerEmail: customerEmail || `${customerPhone}@grabyourcar.in`,
        customerPhone,
        description: `Self-Drive Rental: ${carData.name} for ${rentalDays} days`,
        notes: {
          vehicleName: carData.name,
          rentalDays: rentalDays.toString(),
          pickupLocation,
        },
        onSuccess: async (paymentData) => {
          bookingCompletedRef.current = true;
          captureRentalJourneyStep("payment_completed", {
            bookingId: booking.id,
            paymentId: paymentData.razorpay_payment_id,
          });

          triggerWhatsApp({
            event: "booking_confirmed",
            phone: customerPhone,
            name: customerName,
            data: { car_model: carData.name, rental_days: String(rentalDays) },
          });

          // Auto-create rental agreement for the booking
          try {
            const DEFAULT_TERMS = `<h2>Self-Drive Car Rental Agreement</h2>
<p>This Rental Agreement is between <strong>GrabYourCar</strong> and the Customer.</p>
<h3>Terms & Conditions</h3>
<ol>
<li>Vehicle used exclusively by the authorized renter with verified KYC.</li>
<li>Return vehicle on agreed date with same fuel level.</li>
<li>Traffic violations during rental are the renter's responsibility.</li>
<li>Security deposit refunded within 3-5 business days after inspection.</li>
<li>Extra KM charges: ₹12/km beyond agreed limit.</li>
<li>Late return: ₹500/hour penalty beyond 2 hours grace.</li>
<li>No illegal activities, racing, or sub-renting.</li>
<li>Insurance excess up to ₹15,000 payable by renter in accident.</li>
<li>Vehicle condition documented via photos before and after trip.</li>
<li>GrabYourCar reserves right to remotely disable vehicle if misused.</li>
</ol>`;

            const { data: agrData } = await supabase
              .from("rental_agreements")
              .insert([{
                booking_id: booking.id,
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_email: customerEmail || null,
                vehicle_name: carData.name,
                vehicle_number: null,
                pickup_date: format(pickupDate!, "yyyy-MM-dd"),
                dropoff_date: format(dropoffDate!, "yyyy-MM-dd"),
                pickup_location: pickupLocation,
                dropoff_location: sameDropoff ? pickupLocation : dropoffLocation,
                rental_amount: totalAmount,
                security_deposit: securityDeposit,
                terms_html: DEFAULT_TERMS,
                status: "sent",
                shared_at: new Date().toISOString(),
              }] as any)
              .select()
              .single();

            if (agrData) {
              // Log history
              await supabase.from("rental_agreement_history").insert([{
                agreement_id: agrData.id,
                action: "created",
                action_by: "system",
                details: { source: "auto_after_payment", booking_id: booking.id },
              }] as any);
              await supabase.from("rental_agreement_history").insert([{
                agreement_id: agrData.id,
                action: "sent_to_client",
                action_by: "system",
                details: { auto_sent: true },
              }] as any);

              // Send agreement link via WhatsApp
              const agreementUrl = `${window.location.origin}/agreement/${agrData.share_token}`;
              triggerWhatsApp({
                event: "agreement_sent",
                phone: customerPhone,
                name: customerName,
                data: {
                  car_model: carData.name,
                  agreement_url: agreementUrl,
                  agreement_number: agrData.agreement_number || "",
                },
              });

              // Update booking with agreement reference
              await supabase.from("rental_bookings").update({
                agreement_url: agreementUrl,
                pipeline_stage: "booking_payment",
                status: "confirmed",
                payment_status: "paid",
                payment_id: paymentData.razorpay_payment_id,
                payment_history: [{
                  at: new Date().toISOString(),
                  payment_id: paymentData.razorpay_payment_id,
                  amount: totalAmount,
                  status: "paid",
                }],
                is_abandoned: false,
                abandoned_at: null,
                abandoned_step: null,
                last_activity_at: new Date().toISOString(),
              }).eq("id", booking.id);
            }
          } catch (agrErr) {
            console.error("Auto-agreement creation failed:", agrErr);
            // Non-blocking - booking is still confirmed
          }

          toast.success("Booking confirmed! Agreement sent to your WhatsApp.");
          clearRentalJourneySession();
          onClose();
          navigate("/my-bookings");
        },
        onError: (error) => {
          console.error("Payment failed:", error);
          captureRentalJourneyStep("payment_failed", {
            bookingId: booking.id,
            message: error || "Payment failed",
          });
          supabase.from("rental_bookings").update({
            is_abandoned: true,
            abandoned_at: new Date().toISOString(),
            abandoned_step: "payment_failed",
            source: "website_self_drive",
            pipeline_stage: "website_lead",
            last_activity_at: new Date().toISOString(),
          }).eq("id", booking.id).then(() => undefined);
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
      `🚗 Car: ${carData.name}\n` +
      `📅 Pickup: ${format(pickupDate!, "dd MMM yyyy")} at ${pickupTime}\n` +
      `📅 Dropoff: ${format(dropoffDate!, "dd MMM yyyy")} at ${dropoffTime}\n` +
      `📍 Pickup Location: ${pickupLocation}\n` +
      `📍 Dropoff Location: ${sameDropoff ? pickupLocation : dropoffLocation}\n` +
      `💰 Total: ₹${totalAmount.toLocaleString()}\n\n` +
      `Name: ${customerName}\n` +
      `Phone: ${customerPhone}`;

    const whatsappUrl = `https://wa.me/1155578093?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    
    toast.success("Redirecting to WhatsApp for booking confirmation!");
    onClose();
  };

  const isProcessing = isCreatingBooking || isPaymentLoading;

  if (!car) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
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
                <span className="text-lg font-bold text-foreground">₹{car.rent}</span>
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
                <CheckCircle2 className="h-5 w-5 text-foreground" />
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
                  <span className="text-foreground">₹{totalAmount.toLocaleString()}</span>
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
