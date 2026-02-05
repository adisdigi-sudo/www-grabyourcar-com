import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FloatingCTA } from "@/components/FloatingCTA";
import { PriceBreakup } from "@/components/PriceBreakup";
import { DealerLocator } from "@/components/DealerLocator";
import { ShareButtons } from "@/components/ShareButtons";
import { CarStructuredData } from "@/components/seo/CarStructuredData";
import { VariantComparisonTable } from "@/components/VariantComparisonTable";
import { WhatsAppSalesCTA } from "@/components/WhatsAppCTA";
import { PriceSummaryCard } from "@/components/PriceSummaryCard";
import { BookingForm } from "@/components/BookingForm";
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
      {/* SEO Structured Data */}
      <CarStructuredData car={car} selectedVariant={selectedVariant} />
      <Helmet>
        <title>{car.name} Price, Specs, Features | Grabyourcar</title>
        <meta name="description" content={`${car.brand} ${car.name} price starts at ${car.price}. Check out specifications, features, colors, mileage and more. ${car.variants.length} variants available.`} />
        <meta property="og:title" content={`${car.brand} ${car.name} - Price, Specs & Features`} />
        <meta property="og:description" content={car.overview || car.tagline} />
        {/* Use AI-generated branded OG image with car photo */}
        <meta property="og:image" content={`https://ynoiwioypxpurwdbjvyt.supabase.co/functions/v1/og-image?slug=${car.slug}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`${car.brand} ${car.name} - Grabyourcar`} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`https://grabyourcar.lovable.app/cars/${car.slug}`} />
        <meta property="og:site_name" content="Grabyourcar" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${car.brand} ${car.name} - Price, Specs & Features`} />
        <meta name="twitter:description" content={car.overview || car.tagline} />
        <meta name="twitter:image" content={`https://ynoiwioypxpurwdbjvyt.supabase.co/functions/v1/og-image?slug=${car.slug}`} />
        <meta name="twitter:image:alt" content={`${car.brand} ${car.name}`} />
        <link rel="canonical" href={`https://grabyourcar.lovable.app/cars/${car.slug}`} />
      </Helmet>
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

              {/* Book Your Car Form - Left Side */}
              <div className="mt-6">
                <BookingForm carName={car.name} carBrand={car.brand} />
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
                 {/* Price Summary Card - Prominent Pricing */}
                 <PriceSummaryCard
                   carName={car.name}
                   carBrand={car.brand}
                   exShowroomPrice={car.variants[selectedVariant]?.priceNumeric || (parseFloat(car.price.match(/[\d.]+/)?.[0] || "0") * 100000)}
                   variants={car.variants.map(v => ({
                     ...v,
                     fuelType: v.fuelType || car.fuelTypes[0],
                     transmission: v.transmission || car.transmission[0]
                   }))}
                   colors={car.colors}
                   selectedVariant={selectedVariant}
                   selectedColor={selectedColor}
                   onVariantChange={setSelectedVariant}
                   onColorChange={setSelectedColor}
                   brochureUrl={car.brochureUrl}
                 />

                {/* Quick Specs - Moved after Price Card */}
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

                {/* CTA Buttons - Sales-Driven */}
                <div className="flex flex-wrap gap-3">
                  <Button variant="cta" size="lg" className="flex-1 font-semibold hover:scale-105 transition-transform">
                    Get Best Price
                  </Button>
                  <CompareButton carId={car.id} />
                  <ShareButtons title={`Check out ${car.name} on Grabyourcar`} />
                  <WhatsAppSalesCTA 
                    carName={`${car.brand} ${car.name}`} 
                    type="price" 
                    size="lg"
                  />
                  <a href="tel:+919577200023">
                    <Button variant="call" size="lg" className="font-semibold hover:scale-105 transition-transform">
                      <Phone className="h-5 w-5 mr-2" />
                      Talk to Expert
                    </Button>
                  </a>
                </div>

                {/* Additional WhatsApp CTAs */}
                <div className="flex flex-wrap gap-2">
                  <WhatsAppSalesCTA 
                    carName={`${car.brand} ${car.name}`} 
                    type="waiting" 
                    size="sm"
                    className="text-sm"
                  />
                  <WhatsAppSalesCTA 
                    carName={`${car.brand} ${car.name}`} 
                    type="testDrive" 
                    size="sm"
                    className="text-sm"
                  />
                  <WhatsAppSalesCTA 
                    carName={`${car.brand} ${car.name}`} 
                    type="offers" 
                    size="sm"
                    className="text-sm"
                  />
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

              <TabsContent value="variants" className="space-y-8">
                {/* Variant Comparison Table - Full Width */}
                <VariantComparisonTable
                  carName={car.name}
                  carBrand={car.brand}
                  variants={car.variants}
                  onVariantSelect={setSelectedVariant}
                  selectedVariantIndex={selectedVariant}
                />
                
                {/* Selected Variant Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  </div>
                  
                  {/* Features for selected variant */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Check className="h-5 w-5 text-success" />
                        Features - {car.name} {car.variants[selectedVariant].name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {car.variants[selectedVariant].features.map((feature, fIndex) => (
                          <div key={fIndex} className="flex items-center gap-2 py-1.5 px-2 bg-muted/30 rounded-lg">
                            <Check className="h-4 w-4 text-success flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
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

        {/* AI Car Recommendations Section */}
        <section className="py-8 md:py-12 bg-secondary/30">
          <div className="container mx-auto px-4">
            <AICarRecommendations
              carName={car.name}
              brand={car.brand}
              price={car.price}
              fuelTypes={car.fuelTypes}
              transmission={car.transmission}
            />
          </div>
        </section>

      </main>

      <Footer />
      <FloatingCTA />
    </div>
  );
};

export default CarDetail;
