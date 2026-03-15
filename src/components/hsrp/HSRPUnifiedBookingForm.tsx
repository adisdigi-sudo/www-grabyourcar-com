import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Car, User, Phone, Mail, MapPin, Calendar, 
  Home, CreditCard, Shield, CheckCircle2, Loader2,
  ChevronLeft, Sparkles, Bike, Truck, Zap,
  FileCheck, Clock, IndianRupee, Tag, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { triggerWhatsApp } from "@/lib/whatsappTrigger";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useHSRPPricing, formatPrice, useHSRPBanners } from "@/hooks/useHSRPPricing";
import { PincodeChecker } from "./PincodeChecker";
import { cn } from "@/lib/utils";
import { useRCLookup } from "@/hooks/useRCLookup";

const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal"
];

const vehicleCategories = [
  { value: "2w", label: "Two Wheeler", icon: Bike, description: "Bike, Scooter", priceKey: "twoWheeler" },
  { value: "4w", label: "Four Wheeler", icon: Car, description: "Car, SUV, Sedan", priceKey: "fourWheeler" },
];

const serviceTypes = [
  { value: "hsrp", label: "HSRP Number Plate", icon: Shield, description: "High Security Registration Plate" },
  { value: "fastag", label: "FASTag", icon: CreditCard, description: "Toll Collection Sticker" },
  { value: "both", label: "HSRP + FASTag", icon: Package, description: "Complete Package", discount: 10 },
];

const timeSlots = [
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
];

interface FormData {
  serviceType: string;
  vehicleCategory: string;
  registrationNumber: string;
  chassisLast6: string;
  engineLast6: string;
  vehicleMake: string;
  vehicleModel: string;
  manufacturingYear: string;
  ownerName: string;
  mobile: string;
  email: string;
  state: string;
  city: string;
  pincode: string;
  address: string;
  preferredDate: string;
  preferredTimeSlot: string;
}

export function HSRPUnifiedBookingForm() {
  const { user, signInWithPhone } = useAuth();
  const navigate = useNavigate();
  const { initiatePayment, isLoading: isPaymentLoading } = useRazorpay();
  const { data: pricing } = useHSRPPricing();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [homeInstallation, setHomeInstallation] = useState(false);
  const [pincodeServiceable, setPincodeServiceable] = useState(false);
  const [homeInstallationFee, setHomeInstallationFee] = useState(0);
  const rcLookup = useRCLookup({ showToast: false });
  const [abandonedCartId, setAbandonedCartId] = useState<string | null>(null);
  const [sessionId] = useState(() => `hsrp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const rcLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLookedUp = useRef<string>("");
  
  const [formData, setFormData] = useState<FormData>({
    serviceType: "",
    vehicleCategory: "",
    registrationNumber: "",
    chassisLast6: "",
    engineLast6: "",
    vehicleMake: "",
    vehicleModel: "",
    manufacturingYear: "",
    ownerName: "",
    mobile: "",
    email: "",
    state: "",
    city: "",
    pincode: "",
    address: "",
    preferredDate: "",
    preferredTimeSlot: "",
  });

  // Calculate price
  const calculatePrice = () => {
    if (!pricing || !formData.vehicleCategory) return { hsrp: 0, fastag: 0, total: 0 };
    const category = vehicleCategories.find(c => c.value === formData.vehicleCategory);
    const hsrpPrice = category ? (pricing as any)[category.priceKey] || 0 : 0;
    const fastagPrice = formData.vehicleCategory === '2w' ? 100 : 500;
    const colourSticker = pricing.colourSticker || 100;
    let total = 0;
    let hsrp = hsrpPrice + colourSticker;
    let fastag = fastagPrice;
    if (formData.serviceType === 'hsrp') total = hsrp;
    else if (formData.serviceType === 'fastag') total = fastag;
    else if (formData.serviceType === 'both') total = Math.round((hsrp + fastag) * 0.9);
    if (homeInstallation) total += homeInstallationFee || pricing.homeInstallationFee || 200;
    return { hsrp, fastag, total };
  };
  const prices = calculatePrice();

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePincodeServiceability = (serviceable: boolean, fee: number) => {
    setPincodeServiceable(serviceable);
    setHomeInstallationFee(fee);
    if (!serviceable) setHomeInstallation(false);
  };

  // ─── AUTO-ADVANCE: Step 1 → when both serviceType AND vehicleCategory selected ───
  useEffect(() => {
    if (step === 1 && formData.serviceType && formData.vehicleCategory) {
      const t = setTimeout(() => {
        setStep(2);
        saveAbandonedCart(2);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [formData.serviceType, formData.vehicleCategory, step]);

  // ─── AUTO RC LOOKUP: when registration number looks valid, silently fetch ───
  useEffect(() => {
    const cleaned = formData.registrationNumber.replace(/\s+/g, "").toUpperCase();
    if (rcLookupTimer.current) clearTimeout(rcLookupTimer.current);

    if (/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(cleaned) && cleaned !== lastLookedUp.current) {
      rcLookupTimer.current = setTimeout(() => {
        lastLookedUp.current = cleaned;
        rcLookup.lookup(cleaned).then((result) => {
          if (result) {
            const maker = result.maker || result.maker_model?.split(" ")[0] || "";
            const model = result.maker
              ? (result.maker_model?.replace(result.maker, "").trim() || "")
              : (result.maker_model?.split(" ").slice(1).join(" ") || "");
            setFormData(prev => ({
              ...prev,
              chassisLast6: (result.chassis_number && result.chassis_number !== "N/A") ? result.chassis_number.slice(-6) : prev.chassisLast6,
              engineLast6: (result.engine_number && result.engine_number !== "N/A") ? result.engine_number.slice(-6) : prev.engineLast6,
              vehicleMake: maker || prev.vehicleMake,
              vehicleModel: model || prev.vehicleModel,
              ownerName: (result.owner_name && result.owner_name !== "N/A") ? result.owner_name : prev.ownerName,
              mobile: result.mobile_number || prev.mobile,
              address: result.present_address || prev.address,
              manufacturingYear: result.registration_date ? result.registration_date.substring(0, 4) : prev.manufacturingYear,
            }));
            toast.success("Vehicle details auto-filled!");
          }
        });
      }, 600); // debounce 600ms after typing stops
    }
    return () => { if (rcLookupTimer.current) clearTimeout(rcLookupTimer.current); };
  }, [formData.registrationNumber]);

  // ─── AUTO-ADVANCE: Step 2 → when RC is fetched and key fields are filled ───
  useEffect(() => {
    if (step === 2 && rcLookup.data && formData.registrationNumber && formData.vehicleMake) {
      const t = setTimeout(() => {
        setStep(3);
        saveAbandonedCart(3);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [step, rcLookup.data, formData.registrationNumber, formData.vehicleMake]);

  // ─── AUTO-ADVANCE: Step 3 → when owner, mobile, email filled ───
  useEffect(() => {
    if (step !== 3) return;
    const cleanMobile = formData.mobile.replace(/\D/g, "").slice(-10);
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    if (formData.ownerName.length >= 2 && /^[6-9]\d{9}$/.test(cleanMobile) && emailValid) {
      const t = setTimeout(() => {
        setStep(4);
        saveAbandonedCart(4);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [step, formData.ownerName, formData.mobile, formData.email]);

  // Save abandoned cart
  const saveAbandonedCart = async (currentStep: number) => {
    try {
      const cartData = {
        session_id: sessionId,
        phone: formData.mobile.replace(/\D/g, "").slice(-10) || null,
        owner_name: formData.ownerName || null,
        email: formData.email || null,
        registration_number: formData.registrationNumber || null,
        vehicle_category: formData.vehicleCategory || null,
        service_type: formData.serviceType || null,
        state: formData.state || null,
        city: formData.city || null,
        pincode: formData.pincode || null,
        last_step: currentStep,
        form_data: formData as any,
        estimated_total: prices.total,
        updated_at: new Date().toISOString(),
      };
      if (abandonedCartId) {
        await supabase.from("hsrp_abandoned_carts").update(cartData).eq("id", abandonedCartId);
      } else {
        const { data } = await supabase.from("hsrp_abandoned_carts").insert(cartData).select("id").single();
        if (data) setAbandonedCartId(data.id);
      }
    } catch (e) {
      console.error("Abandoned cart save error:", e);
    }
  };

  const generateTrackingId = () => {
    const prefix = formData.serviceType === 'fastag' ? 'FT' : 'HSRP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  const handleSubmit = async () => {
    // Validate step 4
    if (!formData.state || !formData.pincode || !formData.address) {
      toast.error("Please fill delivery address");
      return;
    }

    const normalizedMobile = formData.mobile.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);

    // Silent auto-login
    let currentUser = user;
    if (!currentUser) {
      try {
        const { error } = await signInWithPhone(normalizedMobile);
        if (error) {
          console.error("Silent auth failed:", error.message);
          // Don't block – try to get session anyway
        }
        // Wait briefly for session to propagate
        await new Promise(r => setTimeout(r, 500));
        const { data: sessionData } = await supabase.auth.getSession();
        currentUser = sessionData.session?.user ?? null;

        if (!currentUser) {
          // Last resort: try getUser
          const { data: userData } = await supabase.auth.getUser();
          currentUser = userData.user ?? null;
        }

        if (!currentUser) {
          toast.error("Could not create session. Please try again.");
          setIsSubmitting(false);
          return;
        }
      } catch {
        toast.error("Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const trackingId = generateTrackingId();
      const bookingData = {
        user_id: currentUser.id,
        registration_number: formData.registrationNumber.toUpperCase(),
        chassis_number: formData.chassisLast6 || null,
        engine_number: formData.engineLast6 || null,
        vehicle_class: formData.vehicleCategory.toUpperCase(),
        state: formData.state,
        owner_name: formData.ownerName,
        mobile: normalizedMobile,
        email: formData.email,
        address: formData.address,
        pincode: formData.pincode,
        service_type: formData.serviceType,
        service_price: prices.total,
        home_installation: homeInstallation,
        home_installation_fee: homeInstallation ? homeInstallationFee : 0,
        payment_amount: prices.total,
        tracking_id: trackingId,
        scheduled_date: formData.preferredDate || null,
      };

      const { data: booking, error } = await supabase
        .from("hsrp_bookings")
        .insert(bookingData)
        .select()
        .single();
      if (error) throw error;

      initiatePayment({
        amount: prices.total,
        receipt: booking.id,
        bookingType: "hsrp",
        bookingId: booking.id,
        customerName: formData.ownerName,
        customerEmail: formData.email,
        customerPhone: normalizedMobile,
        description: `${formData.serviceType.toUpperCase()} for ${formData.registrationNumber}`,
        notes: { tracking_id: trackingId, service: formData.serviceType },
        onSuccess: async (paymentData) => {
          await supabase.from("hsrp_bookings").update({
            payment_status: "paid",
            payment_id: paymentData.razorpay_payment_id,
            order_status: "confirmed",
          }).eq("id", booking.id);
          triggerWhatsApp({
            event: "hsrp_order_placed",
            phone: normalizedMobile,
            name: formData.ownerName,
            data: { tracking_id: trackingId, service: formData.serviceType, vehicle: formData.registrationNumber },
          });
          toast.success("Booking confirmed! Tracking ID: " + trackingId);
          if (abandonedCartId) {
            supabase.from("hsrp_abandoned_carts").update({
              recovery_status: "converted",
              converted_booking_id: booking.id,
              converted_at: new Date().toISOString(),
            }).eq("id", abandonedCartId).then(() => {});
          }
          setStep(5);
        },
        onError: (err) => { toast.error("Payment failed: " + err); },
      });
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Failed to process booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    { title: "Choose Service", icon: Package },
    { title: "Vehicle Info", icon: Car },
    { title: "Your Details", icon: User },
    { title: "Delivery", icon: MapPin },
    { title: "Confirm", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between max-w-2xl mx-auto mb-8">
        {stepTitles.map((s, idx) => {
          const StepIcon = s.icon;
          const isActive = step === idx + 1;
          const isCompleted = step > idx + 1;
          return (
            <div key={idx} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isCompleted && "bg-green-500 text-white",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <span className={cn(
                  "text-xs mt-1 hidden sm:block",
                  isActive && "text-primary font-medium",
                  !isActive && "text-muted-foreground"
                )}>{s.title}</span>
              </div>
              {idx < stepTitles.length - 1 && (
                <div className={cn("w-8 sm:w-16 h-1 mx-1", step > idx + 1 ? "bg-green-500" : "bg-muted")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Live Price Display */}
      {formData.vehicleCategory && step < 5 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Total</p>
                  <p className="text-2xl font-bold text-primary">{formatPrice(prices.total)}</p>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                {formData.serviceType !== 'fastag' && (
                  <div className="text-center">
                    <p className="text-muted-foreground">HSRP</p>
                    <p className="font-semibold">{formatPrice(prices.hsrp)}</p>
                  </div>
                )}
                {formData.serviceType !== 'hsrp' && (
                  <div className="text-center">
                    <p className="text-muted-foreground">FASTag</p>
                    <p className="font-semibold">{formatPrice(prices.fastag)}</p>
                  </div>
                )}
                {formData.serviceType === 'both' && (
                  <Badge className="bg-green-500 text-white">10% OFF</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 1: Service + Vehicle Type */}
          {step === 1 && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-4 block">What do you need?</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {serviceTypes.map((service) => {
                      const ServiceIcon = service.icon;
                      const isSelected = formData.serviceType === service.value;
                      return (
                        <button
                          key={service.value}
                          type="button"
                          onClick={() => handleInputChange("serviceType", service.value)}
                          className={cn(
                            "relative p-4 rounded-xl border-2 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {service.discount && (
                            <Badge className="absolute -top-2 -right-2 bg-green-500">Save {service.discount}%</Badge>
                          )}
                          <ServiceIcon className={cn("w-8 h-8 mb-2", isSelected && "text-primary")} />
                          <p className="font-semibold">{service.label}</p>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-semibold mb-4 block">Select your vehicle type</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {vehicleCategories.map((cat) => {
                      const CatIcon = cat.icon;
                      const isSelected = formData.vehicleCategory === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => handleInputChange("vehicleCategory", cat.value)}
                          className={cn(
                            "p-6 rounded-xl border-2 text-center transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <CatIcon className={cn("w-12 h-12 mx-auto mb-2", isSelected && "text-primary")} />
                          <p className="font-semibold">{cat.label}</p>
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        </button>
                      );
                    })}
                  </div>
                  {formData.serviceType && formData.vehicleCategory && (
                    <p className="text-sm text-green-600 flex items-center gap-1 mt-3 justify-center">
                      <Loader2 className="w-3 h-3 animate-spin" /> Moving to next step...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Vehicle Details – auto RC fetch */}
          {step === 2 && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="text-center mb-6">
                  <Car className="w-12 h-12 mx-auto text-primary mb-2" />
                  <h3 className="text-xl font-semibold">Vehicle Details</h3>
                  <p className="text-muted-foreground">Enter registration number — details auto-fill</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Registration Number *</Label>
                    <div className="relative">
                      <Input
                        placeholder="e.g., DL 01 AB 1234"
                        value={formData.registrationNumber}
                        onChange={(e) => handleInputChange("registrationNumber", e.target.value.toUpperCase())}
                        className="text-lg font-mono uppercase pr-10"
                        autoFocus
                      />
                      {rcLookup.loading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary" />
                      )}
                    </div>
                    {rcLookup.data?.source === "surepass" && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Verified from RC database
                      </p>
                    )}
                    {rcLookup.error && (
                      <p className="text-xs text-destructive mt-1">{rcLookup.error}</p>
                    )}
                    {rcLookup.data && (
                      <p className="text-sm text-green-600 flex items-center gap-1 mt-2">
                        <Sparkles className="w-3 h-3" /> Auto-advancing...
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Chassis Number (Last 6 digits)</Label>
                    <Input
                      placeholder="e.g., 123456"
                      maxLength={6}
                      value={formData.chassisLast6}
                      onChange={(e) => handleInputChange("chassisLast6", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Engine Number (Last 6 digits)</Label>
                    <Input
                      placeholder="e.g., 789012"
                      maxLength={6}
                      value={formData.engineLast6}
                      onChange={(e) => handleInputChange("engineLast6", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Vehicle Make/Brand</Label>
                    <Input
                      placeholder="e.g., Maruti, Hyundai"
                      value={formData.vehicleMake}
                      onChange={(e) => handleInputChange("vehicleMake", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Vehicle Model</Label>
                    <Input
                      placeholder="e.g., Swift, Creta"
                      value={formData.vehicleModel}
                      onChange={(e) => handleInputChange("vehicleModel", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Manufacturing Year</Label>
                    <Select
                      value={formData.manufacturingYear}
                      onValueChange={(v) => handleInputChange("manufacturingYear", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 25 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Manual next if RC lookup fails */}
                {!rcLookup.data && !rcLookup.loading && formData.registrationNumber.length >= 6 && (
                  <div className="flex justify-end">
                    <Button type="button" onClick={() => { setStep(3); saveAbandonedCart(3); }} className="gap-2">
                      Continue Manually <ChevronLeft className="w-4 h-4 rotate-180" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Owner Details */}
          {step === 3 && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="text-center mb-6">
                  <User className="w-12 h-12 mx-auto text-primary mb-2" />
                  <h3 className="text-xl font-semibold">Your Details</h3>
                  <p className="text-muted-foreground">As per vehicle registration — auto-advances when complete</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Owner Name (As on RC) *</Label>
                    <Input
                      placeholder="Enter full name"
                      value={formData.ownerName}
                      onChange={(e) => handleInputChange("ownerName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Mobile Number *</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 bg-muted border border-r-0 rounded-l-md text-sm">+91</span>
                      <Input
                        type="tel"
                        placeholder="10-digit number"
                        maxLength={10}
                        value={formData.mobile}
                        onChange={(e) => handleInputChange("mobile", e.target.value.replace(/\D/g, ''))}
                        className="rounded-l-none"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Email Address *</Label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                </div>
                {(() => {
                  const cleanMobile = formData.mobile.replace(/\D/g, "").slice(-10);
                  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
                  const ready = formData.ownerName.length >= 2 && /^[6-9]\d{9}$/.test(cleanMobile) && emailValid;
                  return ready ? (
                    <p className="text-sm text-green-600 flex items-center gap-1 justify-center">
                      <Loader2 className="w-3 h-3 animate-spin" /> Moving to delivery...
                    </p>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Delivery Address + Submit */}
          {step === 4 && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="text-center mb-6">
                  <MapPin className="w-12 h-12 mx-auto text-primary mb-2" />
                  <h3 className="text-xl font-semibold">Delivery Address</h3>
                  <p className="text-muted-foreground">Where should we deliver?</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>State *</Label>
                    <Select value={formData.state} onValueChange={(v) => handleInputChange("state", v)}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {states.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input placeholder="Enter city" value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} />
                  </div>
                  <div>
                    <Label>Pincode *</Label>
                    <PincodeChecker
                      pincode={formData.pincode}
                      onPincodeChange={(v) => handleInputChange("pincode", v)}
                      onServiceabilityChange={handlePincodeServiceability}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Full Address *</Label>
                    <Input
                      placeholder="House/Flat No., Building, Street, Locality"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                    />
                  </div>
                </div>

                {pincodeServiceable && (
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-3">
                      <Checkbox id="homeInstall" checked={homeInstallation} onCheckedChange={(checked) => setHomeInstallation(checked === true)} />
                      <div className="flex-1">
                        <label htmlFor="homeInstall" className="font-medium cursor-pointer flex items-center gap-2">
                          <Home className="w-4 h-4 text-green-600" /> Home Installation Available!
                        </label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Get HSRP fitted at your doorstep for just {formatPrice(homeInstallationFee || 200)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Preferred Date</Label>
                    <Input
                      type="date"
                      value={formData.preferredDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleInputChange("preferredDate", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Preferred Time Slot</Label>
                    <Select value={formData.preferredTimeSlot} onValueChange={(v) => handleInputChange("preferredTimeSlot", v)}>
                      <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(3)} className="gap-2">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || isPaymentLoading}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    Pay {formatPrice(prices.total)} & Book
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">Booking Confirmed!</h2>
                <p className="text-muted-foreground mb-6">
                  Your {formData.serviceType === 'both' ? 'HSRP & FASTag' : formData.serviceType.toUpperCase()} booking has been placed successfully.
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => navigate("/my-orders")}>View Orders</Button>
                  <Button type="button" onClick={() => window.location.reload()}>Book Another</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Back button for steps 2-3 (step 4 has its own) */}
      {(step === 2 || step === 3) && (
        <div className="flex justify-start">
          <Button type="button" variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        </div>
      )}
    </div>
  );
}
