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
  Home
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const hsrpServices = [
  {
    id: "new-hsrp",
    title: "High Security Registration Plate with Colour Sticker",
    description: "For new vehicle registrations",
    icon: Car,
    color: "bg-amber-400",
    price: "₹1,100",
  },
  {
    id: "replacement",
    title: "Replacement / Retain / Transfer",
    description: "Replace damaged or lost HSRP",
    icon: Car,
    color: "bg-primary",
    price: "₹1,100",
  },
  {
    id: "colour-sticker",
    title: "Only Colour Sticker",
    description: "Get colour-coded fuel type sticker",
    icon: Truck,
    color: "bg-primary",
    price: "₹100",
  },
  {
    id: "ev-hsrp",
    title: "HSRP For Electric Vehicle",
    description: "Green plates for EVs",
    icon: Zap,
    color: "bg-primary",
    price: "₹1,100",
  },
  {
    id: "tractor",
    title: "HSRP For Tractor & Trailer",
    description: "For agricultural vehicles",
    icon: Truck,
    color: "bg-primary",
    price: "₹600",
  },
  {
    id: "two-wheeler",
    title: "HSRP For Two Wheeler",
    description: "For motorcycles and scooters",
    icon: Bike,
    color: "bg-amber-400",
    price: "₹450",
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
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [formData, setFormData] = useState({
    registrationNumber: "",
    state: "",
    ownerName: "",
    mobile: "",
    email: "",
    address: "",
    pincode: "",
  });

  const handleTrackOrder = () => {
    if (!trackingNumber.trim()) {
      toast.error("Please enter your order/booking number");
      return;
    }
    toast.info("Order tracking feature coming soon!");
  };

  const handleBookNow = (serviceId: string) => {
    setSelectedService(serviceId);
    // Scroll to booking form
    document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registrationNumber || !formData.state || !formData.ownerName || !formData.mobile) {
      toast.error("Please fill all required fields");
      return;
    }
    toast.success("Booking request submitted! Our team will contact you shortly.");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Service Banner */}
      <ServiceBanner
        highlightText="Mandatory"
        title="Get Your HSRP Before the Deadline!"
        subtitle="Avoid ₹10,000 fine | Government authorized | Quick installation in 48 hours"
        variant="dark"
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
              <Button variant="outline" size="lg" className="gap-2 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
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
            <a href="#" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Calendar className="h-4 w-4" />
              Reschedule
            </a>
            <span className="text-border">|</span>
            <a href="#" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Home className="h-4 w-4" />
              Home Installation
            </a>
            <span className="text-border">|</span>
            <a href="tel:+919855924442" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
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
                        <span className="text-lg font-bold text-primary">{service.price}</span>
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
              <TabsTrigger value="track" className="gap-2">
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
                      Selected: {hsrpServices.find(s => s.id === selectedService)?.title}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitBooking} className="space-y-6">
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="owner">Owner Name *</Label>
                        <Input
                          id="owner"
                          placeholder="As per RC"
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
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                          maxLength={10}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode">Pin Code</Label>
                        <Input
                          id="pincode"
                          placeholder="For home installation check"
                          value={formData.pincode}
                          onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                          maxLength={6}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        placeholder="Full address for installation"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button type="submit" variant="cta" size="lg" className="flex-1 gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Submit Booking Request
                      </Button>
                      <a href="https://wa.me/919855924442" target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="whatsapp" size="lg" className="w-full sm:w-auto gap-2">
                          <MessageCircle className="h-5 w-5" />
                          WhatsApp
                        </Button>
                      </a>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="track" id="track">
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
                      <Label htmlFor="tracking">Order / Booking Number</Label>
                      <Input
                        id="tracking"
                        placeholder="Enter your order number"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleTrackOrder} className="w-full gap-2">
                      <Search className="h-4 w-4" />
                      Track Order Status
                    </Button>
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
            {/* Documents */}
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

            {/* Pricing */}
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
            <a href="https://wa.me/919855924442" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="lg" className="gap-2">
                <MessageCircle className="h-5 w-5" />
                WhatsApp Us
              </Button>
            </a>
            <a href="tel:+919855924442">
              <Button variant="outline" size="lg" className="gap-2 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Phone className="h-5 w-5" />
                Call: +91 98559 24442
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HSRP;
