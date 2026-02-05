import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServiceBanner } from "@/components/ServiceBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { WhatsAppCTA, whatsappMessages } from "@/components/WhatsAppCTA";
import { 
  Car, 
  Truck, 
  Bike, 
  Zap, 
  ArrowRight, 
  Search, 
  Shield, 
  CheckCircle2, 
  FileText, 
  Clock, 
  MapPin, 
  Phone, 
  MessageCircle,
  AlertCircle,
  IndianRupee,
  Calendar,
  Home,
  Loader2,
  Package
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpay } from "@/hooks/useRazorpay";
import { PincodeChecker } from "@/components/hsrp/PincodeChecker";
import { useNavigate } from "react-router-dom";

const hsrpServices = [
  {
    id: "new-hsrp",
    title: "High Security Registration Plate with Colour Sticker",
    description: "For new vehicle registrations",
    icon: Car,
    color: "bg-amber-400",
    price: 1100,
    priceDisplay: "₹1,100",
    vehicleClass: "4W",
  },
  {
    id: "replacement",
    title: "Replacement / Retain / Transfer",
    description: "Replace damaged or lost HSRP",
    icon: Car,
    color: "bg-primary",
    price: 1100,
    priceDisplay: "₹1,100",
    vehicleClass: "4W",
  },
  {
    id: "colour-sticker",
    title: "Only Colour Sticker",
    description: "Get colour-coded fuel type sticker",
    icon: Truck,
    color: "bg-primary",
    price: 100,
    priceDisplay: "₹100",
    vehicleClass: "Any",
  },
  {
    id: "ev-hsrp",
    title: "HSRP For Electric Vehicle",
    description: "Green plates for EVs",
    icon: Zap,
    color: "bg-primary",
    price: 1100,
    priceDisplay: "₹1,100",
    vehicleClass: "EV",
  },
  {
    id: "tractor",
    title: "HSRP For Tractor & Trailer",
    description: "For agricultural vehicles",
    icon: Truck,
    color: "bg-primary",
    price: 600,
    priceDisplay: "₹600",
    vehicleClass: "Tractor",
  },
  {
    id: "two-wheeler",
    title: "HSRP For Two Wheeler",
    description: "For motorcycles and scooters",
    icon: Bike,
    color: "bg-amber-400",
    price: 450,
    priceDisplay: "₹450",
    vehicleClass: "2W",
  },
];

const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal"
];

const benefits = [
  { icon: Shield, title: "Government Authorized", description: "Official HSRP plates as per MoRTH guidelines" },
  { icon: CheckCircle2, title: "Tamper Proof", description: "Laser branded with unique identification" },
  { icon: MapPin, title: "Pan India Service", description: "Available across all states in India" },
  { icon: Clock, title: "Quick Installation", description: "Get fitted within 48 hours of booking" },
  { icon: Home, title: "Home Installation", description: "Doorstep fitting available in select areas" },
  { icon: FileText, title: "Digital Receipt", description: "Instant booking confirmation & receipt" },
];

const requiredDocuments = [
  "Vehicle Registration Certificate (RC)",
  "Valid ID Proof (Aadhaar/PAN/Driving License)",
  "Existing Number Plate (for replacement)",
  "Vehicle Insurance Copy",
  "PUC Certificate (if available)",
];

const faqs = [
  {
    question: "What is HSRP?",
    answer: "HSRP stands for High Security Registration Plate. It is a tamper-proof number plate with a unique laser-branded identification number, chromium-based hologram, and a snap lock system. It's mandatory for all vehicles in India as per the Central Motor Vehicles Rules."
  },
  {
    question: "Is HSRP mandatory?",
    answer: "Yes, HSRP is mandatory for all vehicles registered in India. The Supreme Court of India has mandated the use of HSRP for all categories of vehicles. Non-compliance can result in fines up to ₹10,000."
  },
  {
    question: "What is the cost of HSRP?",
    answer: "HSRP costs vary by vehicle type: Two-wheelers: ₹450, Four-wheelers: ₹1,100, Commercial vehicles: ₹1,100. Additional charges may apply for home installation."
  },
  {
    question: "How long does installation take?",
    answer: "Once you book your HSRP, you'll receive an appointment within 48-72 hours. The actual installation takes about 15-20 minutes at the designated dealer or fitting center."
  },
  {
    question: "Can I get HSRP installed at home?",
    answer: "Yes, home installation is available in select pin codes. You can check availability by entering your pin code during the booking process. Additional charges apply for doorstep service."
  },
  {
    question: "What documents are required?",
    answer: "You need your Vehicle RC (Registration Certificate), valid ID proof (Aadhaar/PAN/Driving License), and the existing number plate if applying for replacement."
  },
];

const HSRP = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiatePayment, isLoading: isPaymentLoading } = useRazorpay();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [homeInstallation, setHomeInstallation] = useState(false);
  const [homeInstallationFee, setHomeInstallationFee] = useState(0);
  const [pincodeServiceable, setPincodeServiceable] = useState(false);
  
  const [formData, setFormData] = useState({
    registrationNumber: "",
    chassisNumber: "",
    engineNumber: "",
    state: "",
    ownerName: "",
    mobile: "",
    email: "",
    address: "",
    pincode: "",
  });

  const selectedServiceData = hsrpServices.find(s => s.id === selectedService);
  const servicePrice = selectedServiceData?.price || 0;
  const totalAmount = servicePrice + (homeInstallation ? homeInstallationFee : 0);

  const handleTrackOrder = async () => {
    if (!trackingNumber.trim()) {
      toast.error("Please enter your order/booking number");
      return;
    }

    setIsTracking(true);
    setTrackingResult(null);

    try {
      const { data, error } = await supabase
        .from("hsrp_bookings")
        .select("*")
        .or(`tracking_id.eq.${trackingNumber},registration_number.ilike.${trackingNumber}`)
        .single();

      if (error || !data) {
        toast.error("No booking found with this order number");
        setTrackingResult({ found: false });
      } else {
        setTrackingResult({ found: true, booking: data });
        toast.success("Booking found!");
      }
    } catch {
      toast.error("Failed to track order. Please try again.");
    } finally {
      setIsTracking(false);
    }
  };

  const handleBookNow = (serviceId: string) => {
    setSelectedService(serviceId);
    document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handlePincodeServiceability = (serviceable: boolean, fee: number) => {
    setPincodeServiceable(serviceable);
    setHomeInstallationFee(fee);
    if (!serviceable) {
      setHomeInstallation(false);
    }
  };

  const generateTrackingId = () => {
    const prefix = "HSRP";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedService) {
      toast.error("Please select a service type");
      return;
    }

    if (!formData.registrationNumber || !formData.state || !formData.ownerName || !formData.mobile || !formData.email) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.mobile.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
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
        vehicle_class: selectedServiceData?.vehicleClass || "4W",
        state: formData.state,
        owner_name: formData.ownerName,
        mobile: formData.mobile,
        email: formData.email,
        address: formData.address || null,
        pincode: formData.pincode,
        service_type: selectedService,
        service_price: servicePrice,
        home_installation: homeInstallation,
        home_installation_fee: homeInstallation ? homeInstallationFee : 0,
        payment_amount: totalAmount,
        tracking_id: trackingId,
        order_status: "pending",
        payment_status: "pending",
      };

      const { data: booking, error } = await supabase
        .from("hsrp_bookings")
        .insert(bookingData)
        .select()
        .single();

      if (error) throw error;

      // Initiate Razorpay payment
      initiatePayment({
        amount: totalAmount,
        receipt: `HSRP-${booking.id.substring(0, 8)}`,
        bookingType: "hsrp",
        bookingId: booking.id,
        customerName: formData.ownerName,
        customerEmail: formData.email,
        customerPhone: formData.mobile,
        description: `HSRP: ${selectedServiceData?.title} - ${formData.registrationNumber.toUpperCase()}`,
        notes: {
          trackingId,
          registrationNumber: formData.registrationNumber.toUpperCase(),
          vehicleClass: selectedServiceData?.vehicleClass || "4W",
        },
        onSuccess: (paymentData) => {
          toast.success(
            <div className="space-y-2">
              <p className="font-semibold">Payment Successful!</p>
              <p className="text-sm">Tracking ID: <span className="font-mono font-bold">{trackingId}</span></p>
            </div>,
            { duration: 8000 }
          );
          
          // Reset form
          setFormData({
            registrationNumber: "",
            chassisNumber: "",
            engineNumber: "",
            state: "",
            ownerName: "",
            mobile: "",
            email: "",
            address: "",
            pincode: "",
          });
          setSelectedService(null);
          setHomeInstallation(false);
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

  const handleBookViaWhatsApp = () => {
    if (!selectedService) {
      toast.error("Please select a service type");
      return;
    }

    if (!formData.registrationNumber || !formData.state || !formData.ownerName || !formData.mobile) {
      toast.error("Please fill all required fields");
      return;
    }

    const message = `🚗 *HSRP Booking Inquiry*\n\n` +
      `🚘 Vehicle: ${formData.registrationNumber.toUpperCase()}\n` +
      `📦 Service: ${selectedServiceData?.title}\n` +
      `💰 Amount: ₹${totalAmount}\n` +
      `📍 State: ${formData.state}\n` +
      `👤 Name: ${formData.ownerName}\n` +
      `📱 Mobile: ${formData.mobile}\n` +
      `${homeInstallation ? `🏠 Home Installation: Yes (₹${homeInstallationFee} extra)\n` : ""}` +
      `📍 Pincode: ${formData.pincode}`;

    const whatsappUrl = `https://wa.me/919577200023?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <>
      <Helmet>
        <title>HSRP Online Booking | High Security Number Plate | GrabYourCar</title>
        <meta
          name="description"
          content="Book HSRP online for your vehicle. Government authorized high security registration plates with quick installation. Avoid fines - book now!"
        />
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://grabyourcar.lovable.app/hsrp" />
        <meta property="og:title" content="HSRP Online Booking | High Security Number Plate | GrabYourCar" />
        <meta property="og:description" content="Book HSRP online for your vehicle. Government authorized high security plates." />
        <meta property="og:image" content="https://grabyourcar.lovable.app/og-image.png" />
        <meta property="og:site_name" content="GrabYourCar" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://grabyourcar.lovable.app/hsrp" />
        <meta name="twitter:title" content="HSRP Online Booking | High Security Number Plate" />
        <meta name="twitter:description" content="Book HSRP online. Avoid fines - book now!" />
        <meta name="twitter:image" content="https://grabyourcar.lovable.app/og-image.png" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

      <ServiceBanner
        highlightText="Mandatory"
        title="Get Your HSRP Before the Deadline!"
        subtitle="Avoid ₹10,000 fine | Government authorized | Quick installation in 48 hours"
        variant="dark"
        showCountdown
        countdownHours={96}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-primary-foreground rounded-full" />
          <div className="absolute bottom-10 right-10 w-48 h-48 border-4 border-primary-foreground rounded-full" />
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="bg-amber-400 text-amber-900 mb-4">Government Authorized</Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Book Your HSRP Online
            </h1>
            <p className="text-primary-foreground/80 text-base md:text-lg mb-6">
              High Security Registration Plates as per MoRTH guidelines. Quick booking, easy installation, and pan-India service.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="secondary" size="lg" className="gap-2" onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}>
                <Car className="h-5 w-5" />
                Book HSRP Now
              </Button>
              <Button variant="outline" size="lg" className="gap-2 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => document.getElementById("track")?.scrollIntoView({ behavior: "smooth" })}>
                <Search className="h-5 w-5" />
                Track Order
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-4 bg-muted/50 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <a href="#track" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Search className="h-4 w-4" />
              Track Order
            </a>
            <span className="text-border">|</span>
            <a href="#booking-form" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Calendar className="h-4 w-4" />
              Book Now
            </a>
            <span className="text-border">|</span>
            <a href="#" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Home className="h-4 w-4" />
              Home Installation
            </a>
            <span className="text-border">|</span>
            <a href="tel:+919577200023" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Phone className="h-4 w-4" />
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* HSRP Services Grid */}
      <section id="services" className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Choose Your HSRP Service
            </h2>
            <p className="text-muted-foreground">Select the type of HSRP you need for your vehicle</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {hsrpServices.map((service) => (
              <Card 
                key={service.id} 
                className={`cursor-pointer transition-all hover:shadow-lg border-2 ${selectedService === service.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'} ${service.color === 'bg-amber-400' ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                onClick={() => handleBookNow(service.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${service.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <service.icon className={`h-6 w-6 ${service.color === 'bg-amber-400' ? 'text-amber-900' : 'text-primary-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">{service.priceDisplay}</span>
                        <Button size="sm" variant="outline" className="gap-1">
                          Book <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Form & Track Order */}
      <section id="booking-form" className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="book" className="max-w-3xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="book" className="gap-2">
                <Car className="h-4 w-4" />
                Book HSRP
              </TabsTrigger>
              <TabsTrigger value="track" className="gap-2" id="track">
                <Search className="h-4 w-4" />
                Track Order
              </TabsTrigger>
            </TabsList>

            <TabsContent value="book">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Vehicle & Owner Details
                  </CardTitle>
                  {selectedService && (
                    <Badge variant="secondary" className="w-fit">
                      Selected: {selectedServiceData?.title}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitBooking} className="space-y-6">
                    {/* Vehicle Details */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground">Vehicle Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="registration">Vehicle Registration Number *</Label>
                          <Input
                            id="registration"
                            placeholder="e.g., DL01AB1234"
                            value={formData.registrationNumber}
                            onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                            className="uppercase"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State *</Label>
                          <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                            <SelectContent>
                              {states.map((state) => (
                                <SelectItem key={state} value={state}>{state}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="chassis">Chassis Number</Label>
                          <Input
                            id="chassis"
                            placeholder="Last 5 digits"
                            value={formData.chassisNumber}
                            onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value.toUpperCase() })}
                            className="uppercase"
                            maxLength={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="engine">Engine Number</Label>
                          <Input
                            id="engine"
                            placeholder="Last 5 digits"
                            value={formData.engineNumber}
                            onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value.toUpperCase() })}
                            className="uppercase"
                            maxLength={5}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Owner Details */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground">Owner Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="owner">Owner Name (As per RC) *</Label>
                          <Input
                            id="owner"
                            placeholder="Full name"
                            value={formData.ownerName}
                            onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mobile">Mobile Number *</Label>
                          <Input
                            id="mobile"
                            type="tel"
                            placeholder="10-digit mobile"
                            value={formData.mobile}
                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                            maxLength={10}
                            required
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Installation Preference */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground">Installation Preference</h4>
                      
                      <PincodeChecker
                        pincode={formData.pincode}
                        onPincodeChange={(pincode) => setFormData({ ...formData, pincode })}
                        onServiceabilityChange={handlePincodeServiceability}
                      />

                      {pincodeServiceable && (
                        <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                          <Checkbox
                            id="homeInstallation"
                            checked={homeInstallation}
                            onCheckedChange={(checked) => setHomeInstallation(checked === true)}
                          />
                          <div className="flex-1">
                            <Label htmlFor="homeInstallation" className="cursor-pointer font-medium">
                              Opt for Home Installation
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Our technician will visit your location to install HSRP
                            </p>
                          </div>
                          <Badge variant="outline" className="text-primary">
                            +₹{homeInstallationFee}
                          </Badge>
                        </div>
                      )}

                      {homeInstallation && (
                        <div className="space-y-2">
                          <Label htmlFor="address">Full Address for Installation *</Label>
                          <Input
                            id="address"
                            placeholder="Complete address with landmark"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            required={homeInstallation}
                          />
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Price Summary */}
                    {selectedService && (
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-4 space-y-3">
                          <h4 className="font-semibold flex items-center gap-2">
                            <IndianRupee className="h-5 w-5 text-primary" />
                            Price Summary
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>{selectedServiceData?.title}</span>
                              <span>₹{servicePrice.toLocaleString()}</span>
                            </div>
                            {homeInstallation && (
                              <div className="flex justify-between">
                                <span>Home Installation Fee</span>
                                <span>₹{homeInstallationFee}</span>
                              </div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                              <span>Total Amount</span>
                              <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        type="submit" 
                        variant="cta" 
                        size="lg" 
                        className="flex-1 gap-2"
                        disabled={isSubmitting || isPaymentLoading || !selectedService}
                      >
                        {isSubmitting || isPaymentLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-5 w-5" />
                            Pay ₹{totalAmount.toLocaleString()}
                          </>
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="whatsapp" 
                        size="lg" 
                        className="gap-2"
                        onClick={handleBookViaWhatsApp}
                        disabled={isSubmitting || isPaymentLoading}
                      >
                        <MessageCircle className="h-5 w-5" />
                        WhatsApp
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

                    {!user && (
                      <p className="text-sm text-center text-muted-foreground">
                        You'll need to <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>login</Button> to complete your booking
                      </p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="track">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Track Your Order
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tracking">Order ID / Registration Number</Label>
                      <Input
                        id="tracking"
                        placeholder="e.g., HSRP1234ABC or DL01AB1234"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                        className="uppercase"
                      />
                    </div>
                    <Button 
                      onClick={handleTrackOrder} 
                      className="w-full gap-2"
                      disabled={isTracking}
                    >
                      {isTracking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          Track Order Status
                        </>
                      )}
                    </Button>

                    {trackingResult && (
                      <div className="mt-6">
                        {trackingResult.found ? (
                          <Card className="border-primary/30 bg-primary/5">
                            <CardContent className="p-4 space-y-4">
                              <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-primary" />
                                <span className="font-semibold">Booking Found</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Tracking ID:</span>
                                  <p className="font-mono font-semibold">{trackingResult.booking.tracking_id}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Vehicle:</span>
                                  <p className="font-semibold">{trackingResult.booking.registration_number}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Order Status:</span>
                                  <Badge className="mt-1" variant={
                                    trackingResult.booking.order_status === "completed" ? "default" :
                                    trackingResult.booking.order_status === "confirmed" ? "secondary" : "outline"
                                  }>
                                    {trackingResult.booking.order_status.charAt(0).toUpperCase() + trackingResult.booking.order_status.slice(1)}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Payment:</span>
                                  <Badge className="mt-1" variant={
                                    trackingResult.booking.payment_status === "paid" ? "default" : "destructive"
                                  }>
                                    {trackingResult.booking.payment_status.charAt(0).toUpperCase() + trackingResult.booking.payment_status.slice(1)}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Amount:</span>
                                  <p className="font-semibold text-primary">₹{trackingResult.booking.payment_amount}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Booked On:</span>
                                  <p className="font-semibold">{new Date(trackingResult.booking.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              {trackingResult.booking.home_installation && (
                                <Badge variant="outline" className="gap-1">
                                  <Home className="h-3 w-3" />
                                  Home Installation
                                </Badge>
                              )}
                            </CardContent>
                          </Card>
                        ) : (
                          <Card className="border-red-500/30 bg-red-50 dark:bg-red-950/20">
                            <CardContent className="p-4 flex items-center gap-3">
                              <AlertCircle className="h-5 w-5 text-red-500" />
                              <div>
                                <p className="font-semibold text-red-700 dark:text-red-400">No Booking Found</p>
                                <p className="text-sm text-red-600 dark:text-red-500">Please check your order ID or registration number and try again.</p>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground text-center">
                      You can find your order number in the confirmation email or SMS
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Why Book HSRP With Us?
            </h2>
            <p className="text-muted-foreground">Government authorized, hassle-free booking process</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{benefit.title}</h3>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Required Documents & Pricing */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Required Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {requiredDocuments.map((doc, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{doc}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  HSRP Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <span>Four Wheeler (Car/SUV)</span>
                    </div>
                    <span className="font-bold text-primary">₹1,100</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Bike className="h-5 w-5 text-muted-foreground" />
                      <span>Two Wheeler</span>
                    </div>
                    <span className="font-bold text-primary">₹450</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <span>Commercial Vehicle</span>
                    </div>
                    <span className="font-bold text-primary">₹1,100</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <span>Tractor / Trailer</span>
                    </div>
                    <span className="font-bold text-primary">₹600</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-amber-400 rounded" />
                      <span>Colour Sticker Only</span>
                    </div>
                    <span className="font-bold text-primary">₹100</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4 flex items-start gap-1">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  Prices are inclusive of all taxes. Home installation charges extra.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">Everything you need to know about HSRP</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`} className="border border-border rounded-xl px-4 bg-card">
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="font-medium text-foreground">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Need Help with HSRP Booking?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Our team is here to assist you with the entire HSRP booking and installation process.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <WhatsAppCTA
              message={whatsappMessages.hsrp}
              label="Get HSRP Assistance"
              size="lg"
              variant="whatsapp"
            />
            <a href="tel:+919577200023">
              <Button variant="outline" size="lg" className="gap-2 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Phone className="h-5 w-5" />
                Call: +91 95772 00023
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </>
  );
};

export default HSRP;
