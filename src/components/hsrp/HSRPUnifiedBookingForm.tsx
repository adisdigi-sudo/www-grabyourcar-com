import { useState, useEffect, useRef } from "react";
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
import { useHSRPPricing, formatPrice } from "@/hooks/useHSRPPricing";
import { PincodeChecker } from "./PincodeChecker";
import { cn } from "@/lib/utils";
import { useRCLookup, RCData } from "@/hooks/useRCLookup";

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
  { value: "ev", label: "Electric Vehicle", icon: Zap, description: "EV Car, E-Scooter", priceKey: "evVehicle" },
  { value: "tractor", label: "Tractor / Trailer", icon: Truck, description: "Agricultural", priceKey: "tractor" },
];

const serviceTypes = [
  { value: "hsrp", label: "HSRP Number Plate", icon: Shield, description: "High Security Registration Plate" },
];

const timeSlots = [
  "9:00 AM - 11:00 AM",
  "11:00 AM - 1:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
];

/** Detect vehicle category from RC data */
function detectVehicleCategory(rcData: RCData): string {
  const fuel = (rcData.fuel_type || "").toUpperCase();
  const vClass = (rcData.vehicle_class || "").toUpperCase();
  const category = (rcData.vehicle_category || "").toUpperCase();
  const model = (rcData.maker_model || "").toUpperCase();

  // EV detection
  if (
    fuel.includes("ELECTRIC") || fuel.includes("EV") || fuel.includes("BATTERY") ||
    model.includes("ELECTRIC") || model.includes("EV") ||
    category.includes("ELECTRIC")
  ) {
    return "ev";
  }

  // Two wheeler detection
  if (
    vClass.includes("2W") || vClass.includes("TWO WHEELER") ||
    vClass.includes("M-CYCLE") || vClass.includes("MOTOR CYCLE") ||
    vClass.includes("SCOOTER") || vClass.includes("MOPED") ||
    category.includes("2W") || category.includes("MCWG") ||
    category.includes("MOTORCYCLE") || category.includes("SCOOTER")
  ) {
    return "2w";
  }

  // Tractor detection
  if (
    vClass.includes("TRACTOR") || vClass.includes("TRAILER") ||
    vClass.includes("AGRICULTURAL") ||
    category.includes("TRACTOR") || category.includes("TRAILER") ||
    model.includes("TRACTOR")
  ) {
    return "tractor";
  }

  // Default: four wheeler (LMV, car, etc.)
  return "4w";
}

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

const initialFormData: FormData = {
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
};

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
  const [sessionId] = useState(() => `hsrp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const abandonedCartIdRef = useRef<string>(crypto.randomUUID());
  const hasSavedCartRef = useRef(false);
  const autoAdvancedStep1Ref = useRef(false);
  const autoAdvancedStep2Ref = useRef(false);
  const rcLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLookedUp = useRef<string>("");

  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Calculate price
  const calculatePrice = () => {
    if (!pricing || !formData.vehicleCategory) return { hsrp: 0, total: 0 };
    const category = vehicleCategories.find(c => c.value === formData.vehicleCategory);
    const hsrpPrice = category ? (pricing as any)[category.priceKey] || 0 : 0;
    const colourSticker = pricing.colourSticker || 100;
    let hsrp = hsrpPrice + colourSticker;
    let total = hsrp;
    if (homeInstallation) total += homeInstallationFee || pricing.homeInstallationFee || 200;
    return { hsrp, total };
  };
  const prices = calculatePrice();

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === "registrationNumber") {
      autoAdvancedStep1Ref.current = false;
    }
    if (["ownerName", "mobile", "email"].includes(field)) {
      autoAdvancedStep2Ref.current = false;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePincodeServiceability = (serviceable: boolean, fee: number) => {
    setPincodeServiceable(serviceable);
    setHomeInstallationFee(fee);
    if (!serviceable) setHomeInstallation(false);
  };

  // ─── AUTO RC LOOKUP on Step 1: when registration number looks valid ───
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
            
            // Auto-detect vehicle category
            const detected = detectVehicleCategory(result);
            

            setFormData(prev => ({
              ...prev,
              vehicleCategory: detected,
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
      }, 600);
    }
    return () => { if (rcLookupTimer.current) clearTimeout(rcLookupTimer.current); };
  }, [formData.registrationNumber]);

  // ─── CONTROLLED AUTO-ADVANCE: Step 1 → when category + service is ready ───
  useEffect(() => {
    const canAdvance =
      step === 1 &&
      formData.serviceType &&
      formData.vehicleCategory &&
      (Boolean(rcLookup.data) || Boolean(rcLookup.error));

    if (!canAdvance || autoAdvancedStep1Ref.current) return;

    autoAdvancedStep1Ref.current = true;
    const t = setTimeout(() => {
      setStep(2);
      saveAbandonedCart(2);
    }, 350);
    return () => clearTimeout(t);
  }, [formData.serviceType, formData.vehicleCategory, rcLookup.data, rcLookup.error, step]);

  // ─── CONTROLLED AUTO-ADVANCE: Step 2 → when owner, mobile, email filled ───
  useEffect(() => {
    if (step !== 2 || autoAdvancedStep2Ref.current) return;
    const cleanMobile = formData.mobile.replace(/\D/g, "").slice(-10);
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    if (formData.ownerName.length >= 2 && /^[6-9]\d{9}$/.test(cleanMobile) && emailValid) {
      autoAdvancedStep2Ref.current = true;
      const t = setTimeout(() => {
        setStep(3);
        saveAbandonedCart(3);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [step, formData.ownerName, formData.mobile, formData.email]);

  // Save abandoned cart (silently, errors don't block flow)
  const saveAbandonedCart = async (currentStep: number) => {
    try {
      const cartData = {
        id: abandonedCartIdRef.current,
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

      if (hasSavedCartRef.current) {
        const { error: updateError } = await supabase
          .from("hsrp_abandoned_carts")
          .update(cartData)
          .eq("id", abandonedCartIdRef.current);

        if (updateError) {
          const { error: insertError } = await supabase.from("hsrp_abandoned_carts").insert(cartData);
          if (!insertError) hasSavedCartRef.current = true;
        }
      } else {
        const { error: insertError } = await supabase.from("hsrp_abandoned_carts").insert(cartData);
        if (!insertError) hasSavedCartRef.current = true;
      }
    } catch {
      // Silent – don't block user flow
    }
  };

  const generateTrackingId = () => {
    const prefix = 'HSRP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    // CRITICAL: Prevent any default form/anchor behavior that could navigate away
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

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
        console.log("[HSRP] Starting silent auth for", normalizedMobile);
        const { error } = await signInWithPhone(normalizedMobile);
        if (error) {
          console.error("[HSRP] Silent auth error:", error.message);
          toast.error("Login failed: " + error.message);
          setIsSubmitting(false);
          return;
        }

        // Give auth state time to propagate through React context
        await new Promise(r => setTimeout(r, 800));

        // Get fresh session
        const { data: sessionData } = await supabase.auth.getSession();
        currentUser = sessionData.session?.user ?? null;

        if (!currentUser) {
          const { data: userData } = await supabase.auth.getUser();
          currentUser = userData.user ?? null;
        }

        if (!currentUser) {
          console.error("[HSRP] No user after successful auth");
          toast.error("Session not ready. Please click Pay again.");
          setIsSubmitting(false);
          return;
        }

        console.log("[HSRP] Auth successful, user:", currentUser.id);
      } catch (err: any) {
        console.error("[HSRP] Auth exception:", err);
        toast.error("Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const trackingId = generateTrackingId();
      console.log("[HSRP] Creating booking with tracking:", trackingId);

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

      if (error) {
        console.error("[HSRP] Booking insert error:", error);
        throw error;
      }

      console.log("[HSRP] Booking created:", booking.id, "— initiating payment for ₹", prices.total);

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
          if (hasSavedCartRef.current) {
            supabase.from("hsrp_abandoned_carts").update({
              recovery_status: "converted",
              converted_booking_id: booking.id,
              converted_at: new Date().toISOString(),
            }).eq("id", abandonedCartIdRef.current).then(() => {});
          }
          setStep(4);
        },
        onError: (err) => {
          console.error("[HSRP] Payment error:", err);
          toast.error("Payment failed: " + err);
        },
      });
    } catch (error: any) {
      console.error("[HSRP] Booking error:", error);
      toast.error("Failed to process booking: " + (error.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Steps: 1=Vehicle+Service, 2=Owner, 3=Delivery, 4=Success
  const stepTitles = [
    { title: "Vehicle & Service", icon: Car },
    { title: "Your Details", icon: User },
    { title: "Delivery & Pay", icon: MapPin },
    { title: "Confirmed", icon: CheckCircle2 },
  ];

  const detectedCategoryInfo = formData.vehicleCategory
    ? vehicleCategories.find(c => c.value === formData.vehicleCategory)
    : null;
  const cleanedRegistration = formData.registrationNumber.replace(/\s+/g, "").toUpperCase();
  const hasValidRegistration = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(cleanedRegistration);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="space-y-4 md:space-y-6"
    >
      {/* Progress Steps */}
      <div className="mb-6 overflow-x-auto pb-1">
        <div className="mx-auto flex min-w-max items-center justify-between gap-2 px-1 md:max-w-2xl md:gap-0">
          {stepTitles.map((s, idx) => {
            const StepIcon = s.icon;
            const isActive = step === idx + 1;
            const isCompleted = step > idx + 1;
            return (
              <div key={idx} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-all md:h-10 md:w-10",
                    isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isCompleted && "bg-primary text-primary-foreground",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" /> : <StepIcon className="h-4 w-4 md:h-5 md:w-5" />}
                  </div>
                  <span className={cn(
                    "mt-1 text-[11px] sm:text-xs",
                    isActive && "font-medium text-primary",
                    !isActive && "text-muted-foreground"
                  )}>{s.title}</span>
                </div>
                {idx < stepTitles.length - 1 && (
                  <div className={cn("mx-2 h-1 w-8 rounded-full sm:w-10 md:w-16", step > idx + 1 ? "bg-primary" : "bg-muted")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Price Display */}
      {formData.vehicleCategory && formData.serviceType && step < 4 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20 md:h-12 md:w-12">
                  <IndianRupee className="h-5 w-5 text-primary md:h-6 md:w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Total</p>
                  <p className="text-xl font-bold text-primary md:text-2xl">{formatPrice(prices.total)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm sm:justify-end sm:text-right">
                <div>
                  <p className="text-muted-foreground">HSRP</p>
                  <p className="font-semibold">{formatPrice(prices.hsrp)}</p>
                </div>
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
          {/* ═══ Step 1: Enter Vehicle Number → auto-fetch → show detected category + pick service ═══ */}
          {step === 1 && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Registration Number Input */}
                <div className="text-center mb-4">
                  <Car className="w-12 h-12 mx-auto text-primary mb-2" />
                  <h3 className="text-xl font-semibold">Enter Your Vehicle Number</h3>
                  <p className="text-muted-foreground text-sm">We'll auto-detect your vehicle type & fetch details</p>
                </div>

                <div>
                  <Label>Registration Number *</Label>
                  <div className="relative">
                    <Input
                      placeholder="e.g., DL 01 AB 1234"
                      value={formData.registrationNumber}
                      onChange={(e) => handleInputChange("registrationNumber", e.target.value.toUpperCase())}
                      className="text-lg font-mono uppercase pr-10 h-14 text-center tracking-widest"
                      autoFocus
                    />
                    {rcLookup.loading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary" />
                    )}
                  </div>
                  {rcLookup.data?.source === "surepass" && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1 justify-center">
                      <CheckCircle2 className="h-3 w-3" /> Verified from RC database
                    </p>
                  )}
                  {rcLookup.error && (
                    <p className="text-xs text-destructive mt-1 text-center">{rcLookup.error}</p>
                  )}
                </div>

                {/* Show detected vehicle info */}
                {rcLookup.data && detectedCategoryInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                        {(() => { const Icon = detectedCategoryInfo.icon; return <Icon className="w-5 h-5 text-green-600" />; })()}
                      </div>
                      <div>
                        <p className="font-semibold text-green-800 dark:text-green-300">
                          {rcLookup.data.maker_model || "Vehicle Detected"}
                        </p>
                        <p className="text-xs text-green-600">
                          {detectedCategoryInfo.label} • {rcLookup.data.fuel_type} • {rcLookup.data.registration_date?.substring(0, 4) || ""}
                        </p>
                      </div>
                      <Badge className="ml-auto bg-green-500 text-white">{detectedCategoryInfo.label}</Badge>
                    </div>

                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Vehicle category detected automatically from RC details.
                    </p>
                  </motion.div>
                )}

                {/* Service Type Selection - show after RC fetch or manual fallback category selection */}
                {(rcLookup.data || (rcLookup.error && formData.vehicleCategory)) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Separator className="my-2" />
                    <Label className="text-base font-semibold mb-3 block">What do you need?</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                            {'discount' in service && (service as any).discount && (
                              <Badge className="absolute -top-2 -right-2 bg-green-500">Save {(service as any).discount}%</Badge>
                            )}
                            <ServiceIcon className={cn("w-7 h-7 mb-1", isSelected && "text-primary")} />
                            <p className="font-semibold text-sm">{service.label}</p>
                            <p className="text-xs text-muted-foreground">{service.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Auto-advancing indicator */}
                {formData.serviceType && formData.vehicleCategory && (rcLookup.data || rcLookup.error) && (
                  <p className="text-sm text-green-600 flex items-center gap-1 justify-center">
                    <Loader2 className="w-3 h-3 animate-spin" /> Moving to next step...
                  </p>
                )}

                {/* Manual category selection only if RC lookup fails on a valid vehicle number */}
                {!rcLookup.data && !rcLookup.loading && rcLookup.error && hasValidRegistration && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-base font-semibold mb-3 block">Couldn’t auto-detect vehicle type. Select manually:</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {vehicleCategories.map((cat) => {
                          const CatIcon = cat.icon;
                          const isSelected = formData.vehicleCategory === cat.value;
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => handleInputChange("vehicleCategory", cat.value)}
                              className={cn(
                                "p-4 rounded-xl border-2 text-center transition-all",
                                isSelected
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <CatIcon className={cn("w-10 h-10 mx-auto mb-2", isSelected && "text-primary")} />
                              <p className="font-semibold text-sm">{cat.label}</p>
                              <p className="text-xs text-muted-foreground">{cat.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* ═══ Step 2: Owner Details ═══ */}
          {step === 2 && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="text-center mb-6">
                  <User className="w-12 h-12 mx-auto text-primary mb-2" />
                  <h3 className="text-xl font-semibold">Your Details</h3>
                  <p className="text-muted-foreground">Verify & complete — auto-advances when done</p>
                </div>

                {/* Show vehicle summary */}
                {rcLookup.data && (
                  <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3 text-sm">
                    <Car className="w-5 h-5 text-primary" />
                    <span className="font-mono font-semibold">{formData.registrationNumber}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{formData.vehicleMake} {formData.vehicleModel}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Owner Name (As on RC) *</Label>
                    <Input
                      placeholder="Enter full name"
                      value={formData.ownerName}
                      onChange={(e) => handleInputChange("ownerName", e.target.value)}
                      autoFocus
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

          {/* ═══ Step 3: Delivery Address + Submit ═══ */}
          {step === 3 && (
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
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e)}
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

          {/* ═══ Step 4: Success ═══ */}
          {step === 4 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">Booking Confirmed!</h2>
                <p className="text-muted-foreground mb-6">
                  Your HSRP booking has been placed successfully.
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

      {/* Back button for step 2 (step 3 has its own) */}
      {step === 2 && (
        <div className="flex justify-start">
          <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        </div>
      )}
    </form>
  );
}
