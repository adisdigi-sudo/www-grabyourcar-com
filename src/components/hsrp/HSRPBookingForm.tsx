import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Car, User, Phone, Mail, MapPin, FileText, Calendar, 
  Home, CreditCard, Shield, CheckCircle2, Loader2,
  AlertCircle, ChevronRight, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useHSRPPricing, formatPrice, useHSRPServices } from "@/hooks/useHSRPPricing";
import { PincodeChecker } from "./PincodeChecker";
import { cn } from "@/lib/utils";

const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal"
];

const vehicleTypes = [
  { value: "car", label: "Car / Sedan" },
  { value: "suv", label: "SUV / MUV" },
  { value: "hatchback", label: "Hatchback" },
  { value: "commercial", label: "Commercial Vehicle" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "scooter", label: "Scooter" },
  { value: "ev", label: "Electric Vehicle" },
  { value: "tractor", label: "Tractor / Trailer" },
];

const fuelTypes = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "cng", label: "CNG" },
  { value: "lpg", label: "LPG" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
];

interface HSRPBookingFormProps {
  selectedServiceId: string | null;
  selectedPrice: number;
  selectedVehicleClass: string;
}

export function HSRPBookingForm({ 
  selectedServiceId, 
  selectedPrice, 
  selectedVehicleClass 
}: HSRPBookingFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiatePayment, isLoading: isPaymentLoading } = useRazorpay();
  const { data: pricing } = useHSRPPricing();
  const { data: services } = useHSRPServices();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [homeInstallation, setHomeInstallation] = useState(false);
  const [homeInstallationFee, setHomeInstallationFee] = useState(0);
  const [pincodeServiceable, setPincodeServiceable] = useState(false);
  
  const [formData, setFormData] = useState({
    // Vehicle Details
    registrationNumber: "",
    chassisNumber: "",
    engineNumber: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleType: "",
    manufacturingYear: "",
    fuelType: "",
    vehicleColor: "",
    
    // Owner Details
    ownerName: "",
    fatherName: "",
    mobile: "",
    alternateMobile: "",
    email: "",
    
    // Address Details
    state: "",
    city: "",
    pincode: "",
    address: "",
    landmark: "",
    
    // Additional
    preferredDate: "",
    preferredTimeSlot: "",
    additionalNotes: "",
  });

  const selectedService = services?.find(s => s.id === selectedServiceId);
  const homeInstallationPrice = pricing?.homeInstallationFee || 200;
  const totalAmount = selectedPrice + (homeInstallation ? homeInstallationPrice : 0);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePincodeServiceability = (serviceable: boolean, fee: number) => {
    setPincodeServiceable(serviceable);
    setHomeInstallationFee(fee);
    if (!serviceable) {
      setHomeInstallation(false);
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        if (!formData.registrationNumber || !formData.vehicleType) {
          toast.error("Please fill vehicle registration number and type");
          return false;
        }
        break;
      case 2:
        if (!formData.ownerName || !formData.mobile || !formData.email) {
          toast.error("Please fill owner name, mobile, and email");
          return false;
        }
        if (formData.mobile.length !== 10) {
          toast.error("Please enter a valid 10-digit mobile number");
          return false;
        }
        break;
      case 3:
        if (!formData.state || !formData.pincode || !formData.address) {
          toast.error("Please fill state, pincode, and address");
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const generateTrackingId = () => {
    const prefix = "HSRP";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  const handleSubmit = async () => {
    if (!selectedServiceId) {
      toast.error("Please select a service type");
      return;
    }

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    if (!user) {
      toast.error("Please login to book HSRP");
      navigate("/auth");
      return;
    }

    setIsSubmitting(true);

    try {
      const trackingId = generateTrackingId();
      
      const bookingData = {
        user_id: user.id,
        registration_number: formData.registrationNumber.toUpperCase(),
        chassis_number: formData.chassisNumber || null,
        engine_number: formData.engineNumber || null,
        vehicle_class: selectedVehicleClass,
        state: formData.state,
        owner_name: formData.ownerName,
        mobile: formData.mobile,
        email: formData.email,
        address: `${formData.address}${formData.landmark ? `, ${formData.landmark}` : ''}, ${formData.city}`,
        pincode: formData.pincode,
        service_type: selectedServiceId,
        service_price: selectedPrice,
        home_installation: homeInstallation,
        home_installation_fee: homeInstallation ? homeInstallationPrice : 0,
        payment_amount: totalAmount,
        tracking_id: trackingId,
        order_status: "pending",
        payment_status: "pending",
        scheduled_date: formData.preferredDate || null,
      };

      const { data: booking, error } = await supabase
        .from("hsrp_bookings")
        .insert(bookingData)
        .select()
        .single();

      if (error) throw error;

      initiatePayment({
        amount: totalAmount,
        receipt: `HSRP-${booking.id.substring(0, 8)}`,
        bookingType: "hsrp",
        bookingId: booking.id,
        customerName: formData.ownerName,
        customerEmail: formData.email,
        customerPhone: formData.mobile,
        description: `HSRP: ${selectedService?.title} - ${formData.registrationNumber.toUpperCase()}`,
        notes: {
          trackingId,
          registrationNumber: formData.registrationNumber.toUpperCase(),
          vehicleClass: selectedVehicleClass,
          vehicleMake: formData.vehicleMake,
          vehicleModel: formData.vehicleModel,
        },
        onSuccess: () => {
          // Trigger WhatsApp booking confirmation
          triggerWhatsApp({
            event: "hsrp_booking_confirmed",
            phone: formData.mobile,
            name: formData.ownerName,
            data: {
              tracking_id: trackingId,
              registration_number: formData.registrationNumber.toUpperCase(),
              service_type: selectedService?.title || "HSRP",
              amount: totalAmount.toString(),
            },
          });
          toast.success(
            <div className="space-y-2">
              <p className="font-semibold">Payment Successful!</p>
              <p className="text-sm">Tracking ID: <span className="font-mono font-bold">{trackingId}</span></p>
            </div>,
            { duration: 8000 }
          );
          navigate("/my-bookings");
        },
        onError: (error) => {
          console.error("Payment failed:", error);
          toast.info(`Booking created with Tracking ID: ${trackingId}. Complete payment to confirm.`);
        },
      });

    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to create booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    { title: "Vehicle Details", icon: Car },
    { title: "Owner Details", icon: User },
    { title: "Address & Delivery", icon: MapPin },
    { title: "Review & Pay", icon: CreditCard },
  ];

  return (
    <div className="space-y-6" id="booking-form">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {stepTitles.map((s, index) => {
          const StepIcon = s.icon;
          const isActive = step === index + 1;
          const isCompleted = step > index + 1;
          
          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                    isActive && "bg-primary text-white shadow-lg scale-110",
                    isCompleted && "bg-primary/20 text-primary",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span className={cn(
                  "text-xs mt-2 font-medium text-center",
                  isActive && "text-primary",
                  !isActive && "text-muted-foreground"
                )}>
                  {s.title}
                </span>
              </div>
              {index < stepTitles.length - 1 && (
                <div className={cn(
                  "flex-1 h-1 mx-2 rounded",
                  isCompleted ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Vehicle Details
              </CardTitle>
              <CardDescription>
                Enter your vehicle information as per RC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number *</Label>
                  <Input
                    id="registrationNumber"
                    placeholder="e.g., DL01AB1234"
                    value={formData.registrationNumber}
                    onChange={(e) => handleInputChange("registrationNumber", e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleType">Vehicle Type *</Label>
                  <Select value={formData.vehicleType} onValueChange={(v) => handleInputChange("vehicleType", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleMake">Vehicle Make / Brand</Label>
                  <Input
                    id="vehicleMake"
                    placeholder="e.g., Maruti Suzuki, Hyundai"
                    value={formData.vehicleMake}
                    onChange={(e) => handleInputChange("vehicleMake", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleModel">Vehicle Model</Label>
                  <Input
                    id="vehicleModel"
                    placeholder="e.g., Swift, Creta"
                    value={formData.vehicleModel}
                    onChange={(e) => handleInputChange("vehicleModel", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manufacturingYear">Manufacturing Year</Label>
                  <Input
                    id="manufacturingYear"
                    placeholder="e.g., 2023"
                    value={formData.manufacturingYear}
                    onChange={(e) => handleInputChange("manufacturingYear", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuelType">Fuel Type</Label>
                  <Select value={formData.fuelType} onValueChange={(v) => handleInputChange("fuelType", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map((fuel) => (
                        <SelectItem key={fuel.value} value={fuel.value}>
                          {fuel.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleColor">Vehicle Color</Label>
                  <Input
                    id="vehicleColor"
                    placeholder="e.g., White, Silver"
                    value={formData.vehicleColor}
                    onChange={(e) => handleInputChange("vehicleColor", e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chassisNumber">Chassis Number</Label>
                  <Input
                    id="chassisNumber"
                    placeholder="Last 5 digits of chassis number"
                    value={formData.chassisNumber}
                    onChange={(e) => handleInputChange("chassisNumber", e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="engineNumber">Engine Number</Label>
                  <Input
                    id="engineNumber"
                    placeholder="Last 5 digits of engine number"
                    value={formData.engineNumber}
                    onChange={(e) => handleInputChange("engineNumber", e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Owner Details
              </CardTitle>
              <CardDescription>
                Enter vehicle owner information as per RC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Owner Name (as per RC) *</Label>
                  <Input
                    id="ownerName"
                    placeholder="Full name as per RC"
                    value={formData.ownerName}
                    onChange={(e) => handleInputChange("ownerName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fatherName">Father's / Husband's Name</Label>
                  <Input
                    id="fatherName"
                    placeholder="Father's or husband's name"
                    value={formData.fatherName}
                    onChange={(e) => handleInputChange("fatherName", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number *</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">
                      +91
                    </span>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      value={formData.mobile}
                      onChange={(e) => handleInputChange("mobile", e.target.value.replace(/\D/g, ""))}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alternateMobile">Alternate Mobile</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">
                      +91
                    </span>
                    <Input
                      id="alternateMobile"
                      type="tel"
                      placeholder="Alternate number (optional)"
                      maxLength={10}
                      value={formData.alternateMobile}
                      onChange={(e) => handleInputChange("alternateMobile", e.target.value.replace(/\D/g, ""))}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Address & Delivery
              </CardTitle>
              <CardDescription>
                Enter address for HSRP delivery or installation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select value={formData.state} onValueChange={(v) => handleInputChange("state", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Enter city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <PincodeChecker
                  pincode={formData.pincode}
                  onPincodeChange={(p) => handleInputChange("pincode", p)}
                  onServiceabilityChange={handlePincodeServiceability}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Full Address *</Label>
                <Textarea
                  id="address"
                  placeholder="House/Flat No., Building Name, Street, Area"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="landmark">Landmark</Label>
                <Input
                  id="landmark"
                  placeholder="Nearby landmark (optional)"
                  value={formData.landmark}
                  onChange={(e) => handleInputChange("landmark", e.target.value)}
                />
              </div>

              <Separator />

              {/* Home Installation Option */}
              {pincodeServiceable && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="homeInstallation"
                      checked={homeInstallation}
                      onCheckedChange={(checked) => setHomeInstallation(!!checked)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="homeInstallation" className="text-base font-semibold flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        Doorstep Installation
                        <Badge className="bg-primary/20 text-primary">+{formatPrice(homeInstallationPrice)}</Badge>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get HSRP installed at your doorstep by our certified technician
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferredDate">Preferred Installation Date</Label>
                  <Input
                    id="preferredDate"
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => handleInputChange("preferredDate", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredTimeSlot">Preferred Time Slot</Label>
                  <Select value={formData.preferredTimeSlot} onValueChange={(v) => handleInputChange("preferredTimeSlot", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12 PM - 4 PM)</SelectItem>
                      <SelectItem value="evening">Evening (4 PM - 7 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  placeholder="Any special instructions or requests"
                  value={formData.additionalNotes}
                  onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Review & Confirm
              </CardTitle>
              <CardDescription>
                Review your booking details before payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Service Selected */}
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="mb-2">{selectedService?.vehicleClass}</Badge>
                    <h4 className="font-semibold text-lg">{selectedService?.title}</h4>
                    <p className="text-sm text-muted-foreground">{selectedService?.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">{formatPrice(selectedPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Summary */}
              <div>
                <h5 className="font-semibold mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" /> Vehicle Details
                </h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Registration:</div>
                  <div className="font-medium">{formData.registrationNumber}</div>
                  {formData.vehicleMake && (
                    <>
                      <div className="text-muted-foreground">Make & Model:</div>
                      <div className="font-medium">{formData.vehicleMake} {formData.vehicleModel}</div>
                    </>
                  )}
                  {formData.fuelType && (
                    <>
                      <div className="text-muted-foreground">Fuel Type:</div>
                      <div className="font-medium capitalize">{formData.fuelType}</div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Owner Summary */}
              <div>
                <h5 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" /> Owner Details
                </h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Name:</div>
                  <div className="font-medium">{formData.ownerName}</div>
                  <div className="text-muted-foreground">Mobile:</div>
                  <div className="font-medium">+91 {formData.mobile}</div>
                  <div className="text-muted-foreground">Email:</div>
                  <div className="font-medium">{formData.email}</div>
                </div>
              </div>

              <Separator />

              {/* Delivery Summary */}
              <div>
                <h5 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Delivery Address
                </h5>
                <p className="text-sm">
                  {formData.address}, {formData.city}, {formData.state} - {formData.pincode}
                </p>
                {homeInstallation && (
                  <Badge className="mt-2 bg-primary/10 text-primary">
                    <Home className="w-3 h-3 mr-1" />
                    Doorstep Installation Selected
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Price Breakdown */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h5 className="font-semibold mb-3">Price Breakdown</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>HSRP Service ({selectedService?.title})</span>
                    <span>{formatPrice(selectedPrice)}</span>
                  </div>
                  {homeInstallation && (
                    <div className="flex justify-between">
                      <span>Doorstep Installation</span>
                      <span>{formatPrice(homeInstallationPrice)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Amount</span>
                    <span className="text-primary">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>100% Secure Payment</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Govt. Authorized</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        {step > 1 && (
          <Button variant="outline" onClick={prevStep} className="gap-2">
            Back
          </Button>
        )}
        <div className="flex-1" />
        {step < 4 ? (
          <Button onClick={nextStep} className="gap-2">
            Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isPaymentLoading || !selectedServiceId}
            className="gap-2 bg-primary hover:bg-primary/90"
            size="lg"
          >
            {isSubmitting || isPaymentLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Pay {formatPrice(totalAmount)}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
