import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FloatingCTA } from "@/components/FloatingCTA";
import { PriceBreakup } from "@/components/PriceBreakup";
import { DealerLocator } from "@/components/DealerLocator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  ChevronRight, 
  Fuel, 
  Cog, 
  Clock, 
  Check,
  Gift,
  Repeat,
  Wallet,
  CreditCard,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  User,
  Star,
  Shield,
  TrendingDown,
  IndianRupee,
  Calculator,
  Building2,
  GitCompareArrows
} from "lucide-react";
import { useCompare } from "@/hooks/useCompare";
import EMICalculator from "@/components/EMICalculator";
import { AICarRecommendations } from "@/components/AICarRecommendations";
import { getCarBySlug } from "@/data/carsData";
import { calculateStatePriceBreakup } from "@/data/statePricing";
import { toast } from "sonner";

const CompareButton = ({ carId }: { carId: number }) => {
  const { addToCompare, removeFromCompare, isInCompare, canAddMore } = useCompare();
  const inCompare = isInCompare(carId);

  const handleClick = () => {
    if (inCompare) {
      removeFromCompare(carId);
    } else if (canAddMore) {
      addToCompare(carId);
    }
  };

  return (
    <Button
      variant={inCompare ? "default" : "outline"}
      size="lg"
      onClick={handleClick}
      disabled={!inCompare && !canAddMore}
    >
      <GitCompareArrows className="h-5 w-5 mr-2" />
      {inCompare ? "Remove" : "Compare"}
    </Button>
  );
};

const CarDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const car = getCarBySlug(slug || "");
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [bookingForm, setBookingForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    preferredDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!car) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Car Not Found</h1>
          <p className="text-muted-foreground mb-8">The car you're looking for doesn't exist.</p>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingForm.name || !bookingForm.phone) {
      toast.error("Please fill in required fields");
      return;
    }

    if (!/^\d{10}$/.test(bookingForm.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast.success("Booking request submitted! Our team will contact you shortly.");
    setBookingForm({ name: "", phone: "", email: "", city: "", preferredDate: "" });
    setIsSubmitting(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % car.gallery.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + car.gallery.length) % car.gallery.length);
  };

  const getOfferIcon = (type: string) => {
    switch (type) {
      case "cashback": return <Wallet className="h-5 w-5" />;
      case "exchange": return <Repeat className="h-5 w-5" />;
      case "accessory": return <Gift className="h-5 w-5" />;
      case "finance": return <CreditCard className="h-5 w-5" />;
      default: return <Gift className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Breadcrumb */}
        <div className="bg-secondary/50 py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <ChevronRight className="h-4 w-4" />
              <Link to="/#cars" className="hover:text-primary transition-colors">Cars</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">{car.name}</span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Image Gallery */}
              <div className="space-y-4">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-secondary">
                  <img
                    src={car.gallery[currentImageIndex]}
                    alt={`${car.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Navigation Arrows */}
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 rounded-full flex items-center justify-center shadow-lg hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 rounded-full flex items-center justify-center shadow-lg hover:bg-background transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {car.isHot && <Badge variant="hot">🔥 Hot Deal</Badge>}
                    {car.isLimited && <Badge variant="limited">⚡ {car.availability}</Badge>}
                  </div>
                </div>

                {/* Thumbnails */}
                <div className="flex gap-3">
                  {car.gallery.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        currentImageIndex === index ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Car Info */}
              <div className="space-y-6">
                <div>
                  <p className="text-primary font-medium mb-1">{car.brand}</p>
                  <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">
                    {car.name}
                  </h1>
                  <p className="text-muted-foreground text-lg">{car.tagline}</p>
                </div>

                {/* Price */}
                <div className="bg-secondary/50 rounded-xl p-5">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-3xl font-bold text-primary">{car.price}</span>
                    <span className="text-lg text-muted-foreground line-through">{car.originalPrice}</span>
                  </div>
                  <Badge variant="deal" className="text-sm">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {car.discount}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">*Ex-showroom price, Delhi</p>
                </div>

                {/* Quick Specs */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <Fuel className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Fuel Type</p>
                    <p className="font-semibold text-sm">{car.fuelTypes.join(" / ")}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <Cog className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Transmission</p>
                    <p className="font-semibold text-sm">{car.transmission.join(" / ")}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-success" />
                    <p className="text-sm text-muted-foreground">Availability</p>
                    <p className="font-semibold text-sm text-success">{car.availability}</p>
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <h3 className="font-semibold mb-3">Available Colors</h3>
                  <div className="flex gap-3">
                    {car.colors.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedColor(index)}
                        className={`group relative w-10 h-10 rounded-full border-2 transition-all ${
                          selectedColor === index ? "border-primary scale-110" : "border-border"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {selectedColor === index && (
                          <Check className="absolute inset-0 m-auto h-5 w-5 text-primary-foreground drop-shadow-md" />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{car.colors[selectedColor].name}</p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button variant="cta" size="lg" className="flex-1">
                    Get Best Price
                  </Button>
                  <CompareButton carId={car.id} />
                  <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer">
                    <Button variant="whatsapp" size="lg">
                      <MessageCircle className="h-5 w-5 mr-2" />
                      WhatsApp
                    </Button>
                  </a>
                  <a href="tel:+919876543210">
                    <Button variant="outline" size="lg">
                      <Phone className="h-5 w-5 mr-2" />
                      Call
                    </Button>
                  </a>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-success" />
                    <span>Verified Dealer</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-accent" />
                    <span>4.8/5 Rating</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>15+ Showrooms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Specifications & Details */}
        <section className="py-12 bg-secondary/30">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="overview" className="space-y-8">
              <TabsList className="flex flex-wrap h-auto gap-2 bg-background p-2 rounded-xl">
                <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
                <TabsTrigger value="specifications" className="rounded-lg">Specifications</TabsTrigger>
                <TabsTrigger value="variants" className="rounded-lg">Variants & Price</TabsTrigger>
                <TabsTrigger value="emi" className="rounded-lg">
                  <Calculator className="h-4 w-4 mr-1.5" />
                  EMI Calculator
                </TabsTrigger>
                <TabsTrigger value="dealers" className="rounded-lg">
                  <Building2 className="h-4 w-4 mr-1.5" />
                  Find Dealers
                </TabsTrigger>
                <TabsTrigger value="offers" className="rounded-lg">Dealer Offers</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>About {car.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{car.overview}</p>
                  </CardContent>
                </Card>

                {/* Key Features */}
                <Card>
                  <CardHeader>
                    <CardTitle>Key Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {car.specifications.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                          <Check className="h-5 w-5 text-success flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{feature.label}</p>
                            <p className="text-sm text-muted-foreground">{feature.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="specifications" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Engine */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Engine & Transmission</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {car.specifications.engine.map((spec, index) => (
                        <div key={index} className="flex justify-between py-2 border-b border-border last:border-0">
                          <span className="text-muted-foreground">{spec.label}</span>
                          <span className="font-medium text-right">{spec.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Dimensions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Dimensions & Capacity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {car.specifications.dimensions.map((spec, index) => (
                        <div key={index} className="flex justify-between py-2 border-b border-border last:border-0">
                          <span className="text-muted-foreground">{spec.label}</span>
                          <span className="font-medium text-right">{spec.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {car.specifications.performance.map((spec, index) => (
                        <div key={index} className="flex justify-between py-2 border-b border-border last:border-0">
                          <span className="text-muted-foreground">{spec.label}</span>
                          <span className="font-medium text-right">{spec.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Features */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Features & Safety</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {car.specifications.features.map((spec, index) => (
                        <div key={index} className="flex justify-between py-2 border-b border-border last:border-0">
                          <span className="text-muted-foreground">{spec.label}</span>
                          <span className="font-medium text-right">{spec.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="variants" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Variants List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IndianRupee className="h-5 w-5 text-primary" />
                        Select Variant
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Choose a variant to see on-road price</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {car.variants.map((variant, index) => {
                          // Parse price from string like "₹6.49 Lakh" to number
                          const priceMatch = variant.price.match(/[\d.]+/);
                          const priceInLakh = priceMatch ? parseFloat(priceMatch[0]) : 0;
                          const exShowroomPrice = variant.priceNumeric || priceInLakh * 100000;
                          const breakup = calculateStatePriceBreakup(exShowroomPrice);
                          
                          return (
                            <div
                              key={index}
                              onClick={() => setSelectedVariant(index)}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                selectedVariant === index 
                                  ? "border-primary bg-primary/5 shadow-lg" 
                                  : "border-border hover:border-primary/50 hover:bg-muted/30"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start gap-3">
                                  <div className={`w-5 h-5 mt-1 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    selectedVariant === index ? "border-primary bg-primary" : "border-muted-foreground"
                                  }`}>
                                    {selectedVariant === index && <Check className="h-3 w-3 text-primary-foreground" />}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-base">{car.name} {variant.name}</h4>
                                    {variant.fuelType && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {variant.fuelType} {variant.transmission && `• ${variant.transmission}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-lg font-bold text-primary">{variant.price}</span>
                                  <p className="text-xs text-muted-foreground">Ex-showroom</p>
                                </div>
                              </div>
                              
                              {/* On-road price preview */}
                              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 ml-8 mb-2">
                                <span className="text-sm text-muted-foreground">On-Road Price (Delhi)</span>
                                <span className="text-sm font-semibold text-success">
                                  ₹{(breakup.onRoadPrice / 100000).toFixed(2)} Lakh
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap gap-1.5 pl-8">
                                {variant.features.slice(0, 3).map((feature, fIndex) => (
                                  <Badge key={fIndex} variant="secondary" className="text-xs">
                                    {feature}
                                  </Badge>
                                ))}
                                {variant.features.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{variant.features.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Price Breakup */}
                  <div className="space-y-4">
                    {(() => {
                      const selectedVar = car.variants[selectedVariant];
                      const priceMatch = selectedVar.price.match(/[\d.]+/);
                      const priceInLakh = priceMatch ? parseFloat(priceMatch[0]) : 0;
                      const exShowroomPrice = selectedVar.priceNumeric || priceInLakh * 100000;
                      
                      return (
                        <PriceBreakup
                          variantName={selectedVar.name}
                          carName={car.name}
                          exShowroomPrice={exShowroomPrice}
                        />
                      );
                    })()}
                    
                    {/* Features for selected variant */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          Features - {car.name} {car.variants[selectedVariant].name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-2">
                          {car.variants[selectedVariant].features.map((feature, fIndex) => (
                            <div key={fIndex} className="flex items-center gap-2 py-1">
                              <Check className="h-4 w-4 text-success flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="emi" className="space-y-6">
                {(() => {
                  const selectedVar = car.variants[selectedVariant];
                  const priceMatch = selectedVar.price.match(/[\d.]+/);
                  const priceInLakh = priceMatch ? parseFloat(priceMatch[0]) : 0;
                  const exShowroomPrice = selectedVar.priceNumeric || priceInLakh * 100000;
                  const breakup = calculateStatePriceBreakup(exShowroomPrice);
                  
                  return (
                    <div className="space-y-6">
                      {/* Selected Variant Info */}
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Calculating EMI for</p>
                              <h3 className="font-semibold text-lg">{car.name} {selectedVar.name}</h3>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">On-Road Price</p>
                              <p className="text-xl font-bold text-primary">
                                ₹{(breakup.onRoadPrice / 100000).toFixed(2)} Lakh
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* EMI Calculator - pre-filled with 80% loan amount */}
                      <EMICalculator 
                        onGetQuote={(loanDetails) => {
                          toast.success("Loan quote request submitted!", {
                            description: `${loanDetails} for ${car.name} ${selectedVar.name}`
                          });
                        }}
                      />
                      
                      {/* Quick Tenure Options */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-primary" />
                            Quick EMI Reference
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              { months: 36, rate: 8.5 },
                              { months: 48, rate: 8.75 },
                              { months: 60, rate: 9.0 },
                              { months: 72, rate: 9.25 },
                            ].map(({ months, rate }) => {
                              const loanAmount = breakup.onRoadPrice * 0.8;
                              const monthlyRate = rate / 12 / 100;
                              const emi = Math.round(
                                (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
                                (Math.pow(1 + monthlyRate, months) - 1)
                              );
                              
                              return (
                                <div 
                                  key={months}
                                  className="bg-secondary/50 rounded-xl p-4 text-center hover:bg-secondary transition-colors"
                                >
                                  <p className="text-sm text-muted-foreground mb-1">{months / 12} Years</p>
                                  <p className="text-xl font-bold text-primary">₹{emi.toLocaleString("en-IN")}</p>
                                  <p className="text-xs text-muted-foreground mt-1">@ {rate}% p.a.</p>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground text-center mt-4">
                            *EMI calculated on 80% loan amount. Actual EMI may vary based on bank and credit score.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="dealers" className="space-y-6">
                <DealerLocator carName={car.name} />
              </TabsContent>

              <TabsContent value="offers" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {car.offers.map((offer) => (
                    <Card key={offer.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex">
                          <div className={`w-2 flex-shrink-0 ${
                            offer.type === "cashback" ? "bg-success" :
                            offer.type === "exchange" ? "bg-primary" :
                            offer.type === "accessory" ? "bg-accent" :
                            "bg-blue-500"
                          }`} />
                          <div className="p-5 flex-1">
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                offer.type === "cashback" ? "bg-success/10 text-success" :
                                offer.type === "exchange" ? "bg-primary/10 text-primary" :
                                offer.type === "accessory" ? "bg-accent/10 text-accent" :
                                "bg-blue-500/10 text-blue-500"
                              }`}>
                                {getOfferIcon(offer.type)}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold mb-1">{offer.title}</h4>
                                <p className="text-sm text-muted-foreground mb-2">{offer.description}</p>
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-lg text-primary">{offer.discount}</span>
                                  <span className="text-xs text-muted-foreground">Valid till {offer.validTill}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-gradient-hero text-primary-foreground">
                  <CardContent className="p-6 text-center">
                    <h3 className="text-2xl font-bold mb-2">Total Savings up to ₹1,00,000+</h3>
                    <p className="text-primary-foreground/80 mb-4">Combine multiple offers for maximum benefits</p>
                    <Button variant="secondary" size="lg">
                      Claim All Offers
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Booking Form */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <Badge className="mb-4">Book Now</Badge>
                <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                  Book Your {car.name}
                </h2>
                <p className="text-muted-foreground">
                  Fill the form below and our team will get in touch with you
                </p>
              </div>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <form onSubmit={handleBookingSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="name"
                            placeholder="Enter your name"
                            className="pl-10"
                            value={bookingForm.name}
                            onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            placeholder="Enter 10-digit number"
                            className="pl-10"
                            value={bookingForm.phone}
                            onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                          <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10"
                            value={bookingForm.email}
                            onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="city"
                            placeholder="Enter your city"
                            className="pl-10"
                            value={bookingForm.city}
                            onChange={(e) => setBookingForm({ ...bookingForm, city: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="preferredDate">Preferred Visit Date</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="preferredDate"
                            type="date"
                            className="pl-10"
                            value={bookingForm.preferredDate}
                            onChange={(e) => setBookingForm({ ...bookingForm, preferredDate: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Selected Car Info */}
                    <div className="bg-secondary/50 rounded-xl p-4 flex items-center gap-4">
                      <img src={car.image} alt={car.name} className="w-24 h-16 object-cover rounded-lg" />
                      <div className="flex-1">
                        <p className="font-semibold">{car.name} - {car.variants[selectedVariant].name}</p>
                        <p className="text-sm text-muted-foreground">{car.colors[selectedColor].name}</p>
                      </div>
                      <p className="font-bold text-primary">{car.variants[selectedVariant].price}</p>
                    </div>

                    <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Book Test Drive"}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      By submitting, you agree to our terms and privacy policy
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* AI Recommendations Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <AICarRecommendations
                  carName={car.name}
                  brand={car.brand}
                  price={car.price}
                  fuelTypes={car.fuelTypes}
                  transmission={car.transmission}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingCTA />
    </div>
  );
};

export default CarDetail;
