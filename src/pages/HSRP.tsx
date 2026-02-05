import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServiceBanner } from "@/components/ServiceBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WhatsAppCTA, whatsappMessages } from "@/components/WhatsAppCTA";
import { 
  Car, 
  Search, 
  Shield, 
  CheckCircle2, 
  FileText, 
  Clock, 
  MapPin, 
  Phone, 
  AlertCircle,
  Calendar,
  Home,
  Loader2,
  Package,
  Sparkles,
  IndianRupee,
  Bike,
  Truck,
  CreditCard
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CrossSellWidget } from "@/components/CrossSellWidget";
import { HSRPServiceCarousel } from "@/components/hsrp/HSRPServiceCarousel";
import { HSRPBookingForm } from "@/components/hsrp/HSRPBookingForm";
import { useHSRPPricing, formatPrice } from "@/hooks/useHSRPPricing";

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
  const { data: pricing } = useHSRPPricing();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any>(null);
  
  // Selected service state for booking form
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [selectedVehicleClass, setSelectedVehicleClass] = useState("");
  const [activeServiceTab, setActiveServiceTab] = useState<'hsrp' | 'fastag'>('hsrp');

  const handleServiceSelect = (serviceId: string, price: number, vehicleClass: string) => {
    setSelectedServiceId(serviceId);
    setSelectedPrice(price);
    setSelectedVehicleClass(vehicleClass);
    document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" });
  };

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
        .maybeSingle();

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

  return (
    <>
      <Helmet>
        <title>HSRP & FASTag Online Booking | GrabYourCar</title>
        <meta
          name="description"
          content="Book HSRP and FASTag online. Government authorized high security registration plates and toll stickers with quick installation. Avoid fines - book now!"
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://grabyourcar.lovable.app/hsrp" />
        <meta property="og:title" content="HSRP & FASTag Online Booking | GrabYourCar" />
        <meta property="og:description" content="Book HSRP and FASTag online. Government authorized plates and toll stickers." />
        <meta property="og:image" content="https://grabyourcar.lovable.app/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <ServiceBanner
          highlightText="Mandatory"
          title="Get Your HSRP & FASTag Today!"
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
              <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 mb-4">Government Authorized</Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                HSRP & FASTag Services
              </h1>
              <p className="text-primary-foreground/80 text-base md:text-lg mb-6">
                High Security Registration Plates & FASTag for seamless toll payments. Quick booking, easy installation, pan-India service.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="gap-2" 
                  onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Shield className="h-5 w-5" />
                  Book HSRP
                </Button>
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="gap-2" 
                  onClick={() => {
                    setActiveServiceTab('fastag');
                    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <CreditCard className="h-5 w-5" />
                  Get FASTag
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="gap-2 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" 
                  onClick={() => document.getElementById("track")?.scrollIntoView({ behavior: "smooth" })}
                >
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
              <a href="#booking-section" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
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

        {/* HSRP & FASTag Services Section */}
        <section id="services" className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
                <Sparkles className="w-3 h-3 mr-1" />
                Choose Your Service
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                HSRP & FASTag Services
              </h2>
              <p className="text-muted-foreground">Select the service you need for your vehicle</p>
            </div>

            {/* Service Type Tabs */}
            <Tabs value={activeServiceTab} onValueChange={(v) => setActiveServiceTab(v as 'hsrp' | 'fastag')} className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
                <TabsTrigger value="hsrp" className="gap-2">
                  <Shield className="h-4 w-4" />
                  HSRP (Number Plate)
                </TabsTrigger>
                <TabsTrigger value="fastag" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  FASTag (Toll)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hsrp">
                <HSRPServiceCarousel 
                  onSelectService={handleServiceSelect}
                  selectedServiceId={selectedServiceId}
                  serviceType="hsrp"
                />
              </TabsContent>

              <TabsContent value="fastag">
                <HSRPServiceCarousel 
                  onSelectService={handleServiceSelect}
                  selectedServiceId={selectedServiceId}
                  serviceType="fastag"
                />
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Booking Form Section */}
        <section id="booking-section" className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Tabs defaultValue="book" className="w-full">
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
                  {selectedServiceId ? (
                    <HSRPBookingForm
                      selectedServiceId={selectedServiceId}
                      selectedPrice={selectedPrice}
                      selectedVehicleClass={selectedVehicleClass}
                    />
                  ) : (
                    <Card className="border-dashed border-2">
                      <CardContent className="py-12 text-center">
                        <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Select a Service First</h3>
                        <p className="text-muted-foreground mb-4">
                          Please choose an HSRP service from the carousel above to continue with booking
                        </p>
                        <Button onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}>
                          Browse Services
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="track">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        Track Your HSRP Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="trackingNumber">Order ID / Registration Number</Label>
                          <div className="flex gap-2">
                            <Input
                              id="trackingNumber"
                              placeholder="e.g., HSRP123ABC or DL01AB1234"
                              value={trackingNumber}
                              onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                              className="flex-1"
                            />
                            <Button onClick={handleTrackOrder} disabled={isTracking}>
                              {isTracking ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Track"
                              )}
                            </Button>
                          </div>
                        </div>

                        {trackingResult && (
                          <div className="mt-4">
                            {trackingResult.found ? (
                              <Card className="border-primary/30 bg-primary/5">
                                <CardContent className="p-4 space-y-3">
                                  <div className="flex items-center gap-2 text-primary">
                                    <CheckCircle2 className="h-5 w-5" />
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
                              <Card className="border-destructive/30 bg-destructive/5">
                                <CardContent className="p-4 flex items-center gap-3">
                                  <AlertCircle className="h-5 w-5 text-destructive" />
                                  <div>
                                    <p className="font-semibold text-destructive">No Booking Found</p>
                                    <p className="text-sm text-muted-foreground">Please check your order ID or registration number and try again.</p>
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
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
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
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span>4-Wheeler (Car/SUV)</span>
                      </div>
                      <span className="font-bold text-primary">{formatPrice(pricing?.fourWheeler || 1100)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Bike className="h-4 w-4 text-muted-foreground" />
                        <span>2-Wheeler (Bike/Scooter)</span>
                      </div>
                      <span className="font-bold text-primary">{formatPrice(pricing?.twoWheeler || 450)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span>Tractor & Trailer</span>
                      </div>
                      <span className="font-bold text-primary">{formatPrice(pricing?.tractor || 600)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>Colour Sticker Only</span>
                      </div>
                      <span className="font-bold text-primary">{formatPrice(pricing?.colourSticker || 100)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span>Home Installation (Additional)</span>
                      </div>
                      <span className="font-bold text-primary">+{formatPrice(pricing?.homeInstallationFee || 200)}</span>
                    </div>
                  </div>
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
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="text-left font-semibold hover:no-underline">
                      {faq.question}
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

        {/* Cross-Sell Services */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <CrossSellWidget 
              context="hsrp" 
              title="Related Services You May Need" 
              maxItems={3} 
            />
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
