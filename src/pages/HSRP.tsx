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
    answer: "HSRP costs vary by vehicle type: Two-wheelers: ₹850, Four-wheelers: ₹1,500, EV: ₹1,500, Tractor: ₹600. Additional charges may apply for home installation."
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
        title="HSRP Online Booking | GrabYourCar"
        description="Book HSRP online. Government authorized high security registration plates with quick installation. Avoid fines - book now!"
        path="/hsrp"
      />

      <div className="min-h-screen bg-background">
        <Header />

        <ServiceBanner
          highlightText="Mandatory"
          title="Get Your HSRP Today!"
          subtitle="Avoid ₹10,000 fine | Government authorized | Quick installation in 48 hours"
          variant="dark"
          showCountdown
          countdownHours={96}
        />

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 py-10 text-primary-foreground md:py-16">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute left-[-10%] top-8 h-28 w-28 rounded-full border-4 border-primary-foreground md:left-10 md:top-10 md:h-32 md:w-32" />
            <div className="absolute bottom-[-10%] right-[-5%] h-40 w-40 rounded-full border-4 border-primary-foreground md:bottom-10 md:right-10 md:h-48 md:w-48" />
          </div>
          <div className="container relative mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <Badge className="mb-4 bg-amber-500/20 text-amber-600 dark:text-amber-400">Government Authorized</Badge>
              <h1 className="mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
                HSRP Services
              </h1>
              <p className="mb-6 text-base text-primary-foreground/80 md:text-lg">
                High Security Registration Plates for your vehicle. Quick booking, easy installation, pan-India service.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full gap-2 sm:w-auto"
                  onClick={() => document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Shield className="h-5 w-5" />
                  Book HSRP
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
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
        <section className="border-b border-border bg-muted/50 py-4">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-center md:gap-3 md:text-sm">
              <button
                type="button"
                onClick={() => document.getElementById("track")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-primary md:border-0 md:bg-transparent md:px-0 md:py-0"
              >
                <Search className="h-4 w-4" />
                Track Order
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-primary md:border-0 md:bg-transparent md:px-0 md:py-0"
              >
                <Calendar className="h-4 w-4" />
                Book Now
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-primary md:border-0 md:bg-transparent md:px-0 md:py-0"
              >
                <Home className="h-4 w-4" />
                Home Install
              </button>
              <a href="tel:+1155578093" className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-primary md:border-0 md:bg-transparent md:px-0 md:py-0">
                <Phone className="h-4 w-4" />
                Contact Us
              </a>
            </div>
          </div>
        </section>

        {/* Main Booking Section - Always Visible */}
        <section id="booking-section" className="bg-muted/30 py-10 md:py-16">
          <div className="container mx-auto px-4">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] xl:gap-8">
              {/* Main Booking Form */}
              <div className="min-w-0">
                <div className="mb-6 text-center lg:mb-8 lg:text-left">
                  <Badge className="mb-3 border-primary/20 bg-primary/10 text-primary">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Quick & Easy Booking
                  </Badge>
                  <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
                    Book Your HSRP & FASTag
                  </h2>
                  <p className="mx-auto max-w-2xl text-muted-foreground lg:mx-0">
                    Complete the form below - price calculates automatically based on your vehicle.
                  </p>
                </div>

                <HSRPUnifiedBookingForm />
              </div>

              {/* Sidebar - Track Order & Info */}
              <div id="track" className="space-y-4 md:space-y-6">
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
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            id="trackingNumber"
                            placeholder="e.g., HSRP12345 or DL01AB1234"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            className="min-w-0"
                          />
                          <Button type="button" onClick={handleTrackOrder} disabled={isTracking} className="w-full sm:w-auto">
                            {isTracking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Track"}
                          </Button>
                        </div>
                      </div>

                      {trackingResult?.found && (
                        <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                          <div className="mb-2 flex items-center gap-2 text-primary">
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
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                          <div className="flex items-center gap-2 text-destructive">
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
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{benefit.title}</p>
                            <p className="text-xs text-muted-foreground">{benefit.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Help Card */}
                <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardContent className="pt-6 text-center">
                    <Phone className="mx-auto mb-3 h-10 w-10 text-primary" />
                    <p className="font-semibold">Need Help?</p>
                    <p className="mb-4 text-sm text-muted-foreground">Our team is available 24/7</p>
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <a href="tel:+1155578093">
                        <Phone className="h-4 w-4" />
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
                      <span className="font-bold text-primary">{formatPrice(pricing?.fourWheeler || 1500)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Bike className="h-4 w-4 text-muted-foreground" />
                        <span>2-Wheeler (Bike/Scooter)</span>
                      </div>
                      <span className="font-bold text-primary">{formatPrice(pricing?.twoWheeler || 850)}</span>
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
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span>FASTag</span>
                      </div>
                      <span className="font-bold text-primary">{formatPrice(pricing?.fastag || 500)}</span>
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
