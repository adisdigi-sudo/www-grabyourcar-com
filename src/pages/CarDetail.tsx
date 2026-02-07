import { useState, useMemo } from "react";
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
import { ColorGalleryViewer } from "@/components/ColorGalleryViewer";
import { CarPricingConfigurator } from "@/components/CarPricingConfigurator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
import { useCarColors, useCarGalleryImages } from "@/hooks/useCarColors";
import { useCarBySlug } from "@/hooks/useCars";
import EMICalculator from "@/components/EMICalculator";
import { AICarRecommendations } from "@/components/AICarRecommendations";
import { CrossSellWidget } from "@/components/CrossSellWidget";
import { calculateStatePriceBreakup } from "@/data/statePricing";
import { toast } from "sonner";
import { WhatsAppQuickActions, WhatsAppConversionCard } from "@/components/WhatsAppLeadEngine";
import { Skeleton } from "@/components/ui/skeleton";

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
  
  // Fetch car from database
  const { data: car, isLoading, error } = useCarBySlug(slug);
  
  // Fetch colors from database
  const { data: dbColors } = useCarColors(slug);
  
  // Fetch gallery images from database
  const { data: dbGalleryImages } = useCarGalleryImages(slug);
  
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(0);

  // Use database colors if available, otherwise fall back to static data
  const displayColors = useMemo(() => {
    if (dbColors && dbColors.length > 0) {
      return dbColors;
    }
    return car?.colors || [];
  }, [dbColors, car?.colors]);

  // Use database gallery images if available, otherwise fall back to static data
  const displayGallery = useMemo(() => {
    if (dbGalleryImages && dbGalleryImages.length > 0) {
      return dbGalleryImages;
    }
    return car?.gallery || [];
  }, [dbGalleryImages, car?.gallery]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!car || error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Car Not Found</h1>
          <p className="text-muted-foreground mb-8">The car you're looking for doesn't exist.</p>
          <Link to="/cars">
            <Button>Browse All Cars</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

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
        <meta name="description" content={`${car.brand} ${car.name} price starts at ${car.price}. Check out specifications, features, colors, mileage and more.${car.variants?.length ? ` ${car.variants.length} variants available.` : ''}`} />
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


        {/* Car Details Section */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Color Gallery Viewer */}
              <div className="space-y-4">
                {/* Hot/Limited Badges */}
                {(car.isHot || car.isLimited) && (
                  <div className="flex gap-2 mb-2">
                    {car.isHot && <Badge variant="hot">🔥 Hot Deal</Badge>}
                    {car.isLimited && <Badge variant="limited">⚡ {car.availability}</Badge>}
                  </div>
                )}
                
                <ColorGalleryViewer
                  colors={displayColors}
                  carName={car.name}
                  carImage={displayGallery[0] || car.image}
                  gallery={displayGallery}
                  selectedColor={selectedColor}
                  onColorChange={setSelectedColor}
                />

                {/* Book Your Car Form - Left Side */}
                <div className="mt-6">
                  <BookingForm carName={car.name} carBrand={car.brand} />
                </div>

                {/* Why Buy From Us - Utilizing blank space */}
                <Card className="mt-6 border-border/50 bg-gradient-to-br from-card to-secondary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="h-5 w-5 text-accent" />
                      Why Buy From Grabyourcar?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60 border border-border/30">
                        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <TrendingDown className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">Best Price</p>
                          <p className="text-[10px] text-muted-foreground">Guaranteed lowest price</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60 border border-border/30">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">Fast Delivery</p>
                          <p className="text-[10px] text-muted-foreground">Priority delivery slots</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60 border border-border/30">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <Gift className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">Free Accessories</p>
                          <p className="text-[10px] text-muted-foreground">Worth ₹25,000+</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60 border border-border/30">
                        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <Shield className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">100% Genuine</p>
                          <p className="text-[10px] text-muted-foreground">Authorized dealer</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Contact */}
                    <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-success/10 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium">Need Help?</span>
                        </div>
                        <a href="tel:+919577200023" className="text-xs font-bold text-primary hover:underline">
                          +91 95772 00023
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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

                {/* Quick Price Display - Links to top section */}
                <div className="bg-gradient-to-r from-primary/10 via-success/10 to-primary/10 rounded-xl p-4 border border-primary/20">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Starting Price</p>
                      <p className="text-2xl md:text-3xl font-bold text-primary">{car.price}</p>
                      <p className="text-xs text-muted-foreground">Ex-showroom price</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={`/car/${car.slug}/on-road-price`}>
                        <Button variant="cta" size="sm">
                          <IndianRupee className="h-4 w-4 mr-1" />
                          On Road Price
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

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
                {/* WhatsApp Lead Engine - Quick Actions */}
                <WhatsAppQuickActions
                  carName={`${car.brand} ${car.name}`}
                  variant={car.variants[selectedVariant]?.name}
                  triggers={['checkWaitingPeriod', 'bookTestDrive', 'getOffers', 'compareVariants']}
                  layout="horizontal"
                  size="sm"
                />

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

                {/* Full Pricing Configurator */}
                <CarPricingConfigurator
                  car={car}
                  colors={displayColors}
                />
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
                  
                  // Prepare on-road price breakup for PDF
                  const onRoadPriceData = {
                    exShowroom: breakup.exShowroom,
                    rto: breakup.rto,
                    insurance: breakup.insurance,
                    tcs: breakup.tcs,
                    fastag: breakup.fastag,
                    registration: breakup.registration,
                    handling: breakup.handling,
                    onRoadPrice: breakup.onRoadPrice,
                  };
                  
                  return (
                    <div className="space-y-6">
                       {/* Selected Variant Info with Get On-Road Price */}
                       <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-success/5 to-primary/5">
                         <CardContent className="p-6">
                           <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                             <div>
                               <p className="text-sm text-muted-foreground font-medium">Calculate EMI for</p>
                               <h3 className="font-bold text-xl mt-1">{car.brand} {car.name}</h3>
                               <p className="text-sm font-semibold text-primary mt-0.5">{selectedVar.name}</p>
                               <p className="text-xs text-muted-foreground mt-2">
                                 {selectedVar.fuelType || car.fuelTypes[0]} • {selectedVar.transmission || car.transmission[0]}
                               </p>
                             </div>
                             <div className="flex flex-col items-end gap-3">
                               <div>
                                 <p className="text-sm text-muted-foreground mb-1">Starting On-Road Price</p>
                                 <p className="text-3xl font-bold text-primary">
                                   ₹{(breakup.onRoadPrice / 100000).toFixed(2)} Lakh
                                 </p>
                               </div>
                               <a href="#price-section" className="w-full lg:w-auto">
                                 <Button size="lg" className="bg-success hover:bg-success/90 text-white font-semibold gap-2 w-full lg:w-auto">
                                   <IndianRupee className="h-5 w-5" />
                                   Get On-Road Price
                                 </Button>
                               </a>
                             </div>
                           </div>
                         </CardContent>
                       </Card>
                      
                      {/* EMI Calculator with all data for PDF */}
                      <EMICalculator 
                        carName={`${car.brand} ${car.name}`}
                        variantName={selectedVar.name}
                        onRoadPrice={onRoadPriceData}
                        selectedColor={car.colors[selectedColor]?.name}
                        selectedCity="Delhi NCR"
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

        {/* Cross-Sell Services */}
        <section className="py-8 md:py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <CrossSellWidget 
              context="carDetail" 
              title="Complete Your Purchase" 
              maxItems={4} 
            />
          </div>
        </section>

        {/* WhatsApp Conversion Section */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <WhatsAppConversionCard
                carName={`${car.brand} ${car.name}`}
                variant={car.variants[selectedVariant]?.name}
                exShowroomPrice={car.variants[selectedVariant]?.priceNumeric}
              />
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
