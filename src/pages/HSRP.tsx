import { GlobalSEO } from "@/components/seo/GlobalSEO";
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
import { HSRPUnifiedBookingForm } from "@/components/hsrp/HSRPUnifiedBookingForm";
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

  const handleServiceSelect = () => {
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
      <GlobalSEO
        pageKey="hsrp"
        title="HSRP & FASTag Online Booking | GrabYourCar"
        description="Book HSRP and FASTag online. Government authorized high security registration plates and toll stickers with quick installation. Avoid fines - book now!"
        path="/hsrp"
      />

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
                  onClick={() => document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Shield className="h-5 w-5" />
                  Book HSRP
                </Button>
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="gap-2" 
                  onClick={() => document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" })}
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
              <button
                type="button"
                onClick={() => document.getElementById("track")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <Search className="h-4 w-4" />
                Track Order
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={() => document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Book Now
              </button>
              <span className="text-border">|</span>
              <button type="button" onClick={() => document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" })} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <Home className="h-4 w-4" />
                Home Installation
              </button>
              <span className="text-border">|</span>
              <a href="tel:+1155578093" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <Phone className="h-4 w-4" />
                Contact Us
              </a>
            </div>
          </div>
        </section>

        {/* Main Booking Section - Always Visible */}
        <section id="booking-section" className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Booking Form */}
              <div className="lg:col-span-2">
                <div className="text-center mb-8 lg:text-left">
                  <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Quick & Easy Booking
                  </Badge>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    Book Your HSRP & FASTag
                  </h2>
                  <p className="text-muted-foreground">
                    Complete the form below - price calculates automatically based on your vehicle
                  </p>
                </div>
                
                <HSRPUnifiedBookingForm />
              </div>

              {/* Sidebar - Track Order & Info */}
              <div className="space-y-6">
                {/* Track Order Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Search className="h-5 w-5 text-primary" />
                      Track Your Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="trackingNumber">Order ID / Reg. Number</Label>
                        <div className="flex gap-2">
                          <Input
                            id="trackingNumber"
                            placeholder="e.g., HSRP12345 or DL01AB1234"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                          />
                          <Button onClick={handleTrackOrder} disabled={isTracking}>
                            {isTracking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Track"}
                          </Button>
                        </div>
                      </div>

                      {trackingResult?.found && (
                        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 text-green-600 mb-2">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-semibold">Order Found</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><strong>Status:</strong> {trackingResult.booking.order_status}</p>
                            <p><strong>Vehicle:</strong> {trackingResult.booking.registration_number}</p>
                            <p><strong>Service:</strong> {trackingResult.booking.service_type}</p>
                          </div>
                        </div>
                      )}

                      {trackingResult && !trackingResult.found && (
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            <span>No order found with this ID</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Benefits Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Why Choose Us?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {benefits.slice(0, 4).map((benefit, idx) => {
                      const Icon = benefit.icon;
                      return (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{benefit.title}</p>
                            <p className="text-xs text-muted-foreground">{benefit.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Help Card */}
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <Phone className="w-10 h-10 mx-auto text-primary mb-3" />
                    <p className="font-semibold">Need Help?</p>
                    <p className="text-sm text-muted-foreground mb-4">Our team is available 24/7</p>
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <a href="tel:+1155578093">
                        <Phone className="w-4 h-4" />
                        Call Now
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
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
              <a href="tel:+1155578093">
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
