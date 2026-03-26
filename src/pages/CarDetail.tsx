import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { useEventTracking } from "@/hooks/useEventTracking";
import { useParams, Link } from "react-router-dom";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  GitCompareArrows,
  FileText,
  Sparkles
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
import { BrochureLeadGate } from "@/components/BrochureLeadGate";

const CompareButton = ({ carId }: { carId: string | number }) => {
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

const MobileCompareButton = ({ carId }: { carId: string | number }) => {
  const { addToCompare, removeFromCompare, isInCompare, canAddMore } = useCompare();
  const inCompare = isInCompare(carId);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => inCompare ? removeFromCompare(carId) : canAddMore && addToCompare(carId)}
      disabled={!inCompare && !canAddMore}
      className={`flex flex-col items-center gap-1 h-auto py-3 text-[10px] font-semibold ${inCompare ? 'border-primary bg-primary/10' : 'border-primary/30'}`}
    >
      <GitCompareArrows className="h-5 w-5 text-foreground" />
      {inCompare ? 'Added' : 'Compare'}
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
  const [pricingDrawerOpen, setPricingDrawerOpen] = useState(false);
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);
  const { trackCarView, trackBrochureDownload, trackVariantClick, trackColorChange } = useEventTracking();
  const compareCtx = useCompare();

  // Track car view
  useEffect(() => {
    if (car && slug) {
      trackCarView(slug, car.name, car.brand);
    }
  }, [car?.slug]);

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
      <GlobalSEO
        pageKey="car_detail"
        title={`${car.brand} ${car.name} Without Waiting Period | Ready Delivery in India | GrabYourCar`}
        description={`Buy ${car.brand} ${car.name} at best on-road price starting ${car.price}. Zero waiting period, ready stock delivery across India. ${car.variants?.length ? `${car.variants.length} variants` : ''} available in ${car.fuelTypes?.join(', ')}. ${car.transmission?.join(' & ')} transmission. Free doorstep delivery. Call +91 98559 24442 for best deals.`}
        path={`/cars/${car.slug}`}
        keywords={`${car.name} price, ${car.brand} ${car.name} on-road price, ${car.name} without waiting period, ${car.name} ready delivery, ${car.name} ${car.fuelTypes?.[0] || ''}, ${car.name} ${car.transmission?.[0] || ''}, buy ${car.name} India, ${car.name} best deal`}
        image={`https://ynoiwioypxpurwdbjvyt.supabase.co/functions/v1/og-image?slug=${car.slug}`}
        type="product"
      />
      <Header />
      
      <main className="pt-20">

        {/* Breadcrumb */}
        <div className="bg-secondary/50 py-3">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/#cars" className="hover:text-primary transition-colors">Cars</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{car.name}</span>
            </div>
          </div>
        </div>

        {/* Car Details Section */}
        <section className="py-6 lg:py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
              {/* Left Column: Gallery + Desktop Booking + Desktop Why Buy */}
              <div className="space-y-4">
                {/* Car Name & Brand - Top */}
                <div>
                  <p className="text-muted-foreground font-medium text-sm">{car.brand}</p>
                  <h1 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">{car.name}</h1>
                  {car.tagline && <p className="text-muted-foreground text-sm mt-1">{car.tagline}</p>}
                </div>

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


                {/* WhatsApp Quick Actions below color patches */}
                <WhatsAppQuickActions
                  carName={`${car.brand} ${car.name}`}
                  variant={car.variants?.[selectedVariant]?.name}
                  triggers={['checkWaitingPeriod', 'bookTestDrive', 'getOffers', 'compareVariants']}
                  layout="horizontal"
                  size="sm"
                />

                {/* Mobile: 4 Action Buttons Grid right below car image */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setPricingDrawerOpen(true)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    <IndianRupee className="h-5 w-5" />
                    <span className="text-[10px] font-bold leading-tight">Best Price</span>
                  </button>
                  <button
                    onClick={() => {
                      const { addToCompare, removeFromCompare, isInCompare, canAddMore } = compareCtx;
                      const inCompare = isInCompare(car.id);
                      if (inCompare) removeFromCompare(car.id);
                      else if (canAddMore) addToCompare(car.id);
                    }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    <GitCompareArrows className="h-5 w-5" />
                    <span className="text-[10px] font-bold leading-tight">{compareCtx.isInCompare(car.id) ? 'Added' : 'Compare'}</span>
                  </button>
                  <a href="tel:+1155578093" className="w-full">
                    <button className="w-full flex flex-col items-center gap-1.5 py-3 rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all active:scale-95">
                      <Phone className="h-5 w-5" />
                      <span className="text-[10px] font-bold leading-tight">Talk Expert</span>
                    </button>
                  </a>
                  <button
                    onClick={() => setBookingDrawerOpen(true)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    <Calendar className="h-5 w-5" />
                    <span className="text-[10px] font-bold leading-tight">Book Car</span>
                  </button>
                </div>

                {/* Why Buy - Auto-scrolling marquee */}
                <div className="overflow-hidden rounded-xl border border-border/50 bg-gradient-to-r from-card to-secondary/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-foreground" />
                    <span className="text-xs font-semibold">Why Buy From Grabyourcar?</span>
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex gap-3 animate-marquee">
                      {[
                        { icon: <TrendingDown className="h-3.5 w-3.5 text-foreground" />, label: "Best Price", sub: "Guaranteed lowest" },
                        { icon: <Clock className="h-3.5 w-3.5 text-foreground" />, label: "Fast Delivery", sub: "Priority slots" },
                        { icon: <Gift className="h-3.5 w-3.5 text-foreground" />, label: "Free Accessories", sub: "₹25,000+ worth" },
                        { icon: <Shield className="h-3.5 w-3.5 text-foreground" />, label: "100% Genuine", sub: "Authorized dealer" },
                        { icon: <TrendingDown className="h-3.5 w-3.5 text-foreground" />, label: "Best Price", sub: "Guaranteed lowest" },
                        { icon: <Clock className="h-3.5 w-3.5 text-foreground" />, label: "Fast Delivery", sub: "Priority slots" },
                        { icon: <Gift className="h-3.5 w-3.5 text-foreground" />, label: "Free Accessories", sub: "₹25,000+ worth" },
                        { icon: <Shield className="h-3.5 w-3.5 text-foreground" />, label: "100% Genuine", sub: "Authorized dealer" },
                      ].map((item, i) => (
                        <div key={i} className="flex-shrink-0 flex items-center gap-1.5 bg-background/60 border border-border/30 rounded-lg px-3 py-2">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">{item.icon}</div>
                          <div>
                            <p className="text-[10px] font-semibold text-foreground whitespace-nowrap">{item.label}</p>
                            <p className="text-[8px] text-muted-foreground whitespace-nowrap">{item.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Need Help bar */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-success/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-foreground" />
                      <span className="text-xs font-semibold">Need Help?</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href="tel:+1155578093" className="text-xs font-bold text-foreground hover:underline">
                        +1 155578093
                      </a>
                      <WhatsAppSalesCTA carName={`${car.brand} ${car.name}`} type="price" size="sm" />
                    </div>
                  </div>
                </div>

                {/* Mobile/Tablet: Structured Price & Variants Card */}
                <div>
                  <div className="rounded-2xl overflow-hidden border border-border/60 shadow-sm bg-card">
                    {/* Price Row */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Ex-Showroom</p>
                          <p className="text-xl font-bold text-foreground">{car.price}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">On-Road Price*</p>
                          <p className="text-xl font-bold text-foreground">
                            ₹{((car.variants?.[selectedVariant]?.priceNumeric || car.priceNumeric) / 100000).toFixed(2)} L
                          </p>
                        </div>
                      </div>

                      {/* Variant Pills */}
                      {car.variants && car.variants.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Select Variant</p>
                            <p className="text-[9px] text-muted-foreground">
                              {car.variants?.[selectedVariant]?.fuelType || car.fuelTypes?.[0]} • {car.variants?.[selectedVariant]?.transmission || car.transmission?.[0]}
                            </p>
                          </div>
                          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide">
                            {car.variants.map((v, i) => (
                              <button
                                key={i}
                                onClick={() => { setSelectedVariant(i); trackVariantClick(car.slug, v.name); }}
                                className={`flex-shrink-0 text-[10px] px-3 py-1.5 rounded-full font-semibold transition-all border ${
                                  selectedVariant === i
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                                }`}
                              >
                                {v.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Row */}
                    <div className="border-t border-border/40 grid grid-cols-2 gap-px bg-border/40">
                      <button
                        onClick={() => setPricingDrawerOpen(true)}
                        className="flex items-center justify-center gap-2 py-3.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
                      >
                        <IndianRupee className="h-3.5 w-3.5" />
                        Get Best Price
                      </button>
                      <Link to={`/car/${car.slug}/on-road-price`} className="flex items-center justify-center gap-2 py-3.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]">
                        <FileText className="h-3.5 w-3.5" />
                        Full Breakup
                      </Link>
                    </div>
                  </div>
                </div>

                {/* About Car + Key Features — FAQ accordion */}
                {car.specifications?.features && Array.isArray(car.specifications.features) && car.specifications.features.length > 0 && (
                  <div>
                    <Accordion type="single" collapsible className="w-full space-y-2">
                      {/* About Car */}
                      {car.overview && (
                        <AccordionItem value="about-car" className="rounded-2xl border border-border/50 overflow-hidden bg-card">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <span className="text-xs lg:text-sm font-bold uppercase tracking-wide">About {car.name}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-3 text-xs lg:text-sm text-muted-foreground leading-relaxed">
                            {car.overview}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Key Features */}
                      <AccordionItem value="key-features" className="rounded-2xl border border-border/50 overflow-hidden bg-card">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Check className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-xs lg:text-sm font-bold uppercase tracking-wide">Key Features</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto mr-2 border-border text-foreground">
                              {car.specifications.features.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="divide-y divide-border/30">
                            {car.specifications.features.slice(0, 8).map((feature, index) => (
                              <div key={index} className="flex items-center gap-3 px-4 py-2.5">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Check className="h-3 w-3 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-medium text-xs lg:text-sm block">{feature.label}</span>
                                  <span className="text-[10px] lg:text-xs text-muted-foreground">{feature.value}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}


                <div className="mt-6">
                  <BookingForm carName={car.name} carBrand={car.brand} />
                </div>

              </div>

              {/* Car Info - Right Column */}
              <div className="space-y-6">

                {/* Quick Specs - 4 columns on mobile, 4 on desktop */}
                <div className="grid grid-cols-4 gap-2 md:gap-4">
                  <div className="bg-card border border-border rounded-xl p-3 md:p-4 text-center">
                    <Fuel className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1.5 md:mb-2 text-primary" />
                    <p className="text-[10px] md:text-sm text-muted-foreground">Fuel</p>
                    <p className="font-semibold text-[10px] md:text-sm">{car.fuelTypes?.join(" / ") || "—"}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3 md:p-4 text-center">
                    <Cog className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1.5 md:mb-2 text-primary" />
                    <p className="text-[10px] md:text-sm text-muted-foreground">Gearbox</p>
                    <p className="font-semibold text-[10px] md:text-sm">{car.transmission?.join(" / ") || "—"}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3 md:p-4 text-center">
                    <Clock className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1.5 md:mb-2 text-primary" />
                    <p className="text-[10px] md:text-sm text-muted-foreground">Delivery</p>
                    <p className="font-semibold text-[10px] md:text-sm text-foreground">{car.availability}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3 md:p-4 text-center">
                    <Shield className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1.5 md:mb-2 text-primary" />
                    <p className="text-[10px] md:text-sm text-muted-foreground">Safety</p>
                    <p className="font-semibold text-[10px] md:text-sm">{(Array.isArray(car.specifications?.performance) ? car.specifications.performance.find(s => s.label?.toLowerCase().includes('safety'))?.value : null) || '5 Star'}</p>
                  </div>
                </div>



                {/* Trust Badges - compact highlighted strip */}
                <div className="flex items-center gap-3 bg-success/10 border border-success/20 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-foreground" />
                    <span className="text-[11px] font-semibold text-foreground">Verified Dealer</span>
                  </div>
                  <div className="w-px h-4 bg-success/30" />
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-foreground fill-success" />
                    <span className="text-[11px] font-semibold text-foreground">4.8/5</span>
                  </div>
                  <div className="w-px h-4 bg-success/30" />
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-foreground" />
                    <span className="text-[11px] font-semibold text-foreground">15+ Showrooms</span>
                  </div>
                </div>

                {/* Full Pricing Configurator - Hidden on mobile, shown on md+ */}
                <div>
                  <CarPricingConfigurator
                    car={car}
                    colors={displayColors}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Specifications & Details */}
        <SectionErrorBoundary sectionName="specifications">
        <section className="py-8 bg-secondary/30">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="specifications" className="space-y-4">
              <TabsList className="flex flex-wrap h-auto gap-1.5 bg-background p-1.5 rounded-xl">
                <TabsTrigger value="specifications" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-success data-[state=active]:text-success-foreground">Specs</TabsTrigger>
                <TabsTrigger value="variants" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-success data-[state=active]:text-success-foreground">Variants</TabsTrigger>
                <TabsTrigger value="emi" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-success data-[state=active]:text-success-foreground">EMI</TabsTrigger>
                <TabsTrigger value="dealers" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-success data-[state=active]:text-success-foreground">Dealers</TabsTrigger>
                <TabsTrigger value="offers" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-success data-[state=active]:text-success-foreground">Offers</TabsTrigger>
              </TabsList>

              <TabsContent value="specifications" className="space-y-2">
                <Accordion type="multiple" defaultValue={["engine"]} className="w-full space-y-2">
                  {/* Engine & Transmission */}
                  {Array.isArray(car.specifications?.engine) && car.specifications.engine.length > 0 && (
                  <AccordionItem value="engine" className="rounded-2xl border border-border/50 overflow-hidden bg-card">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Cog className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-bold">Engine & Transmission</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto mr-2 border-border">
                          {car.specifications.engine.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="divide-y divide-border/30">
                        {car.specifications.engine.map((spec, index) => (
                          <div key={index} className="flex justify-between px-4 py-2.5">
                            <span className="text-xs text-muted-foreground">{spec.label}</span>
                            <span className="text-xs font-medium text-right">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  )}

                  {/* Dimensions & Capacity */}
                  {Array.isArray(car.specifications?.dimensions) && car.specifications.dimensions.length > 0 && (
                  <AccordionItem value="dimensions" className="rounded-2xl border border-border/50 overflow-hidden bg-card">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Repeat className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-bold">Dimensions & Capacity</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto mr-2 border-border">
                          {car.specifications.dimensions.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="divide-y divide-border/30">
                        {car.specifications.dimensions.map((spec, index) => (
                          <div key={index} className="flex justify-between px-4 py-2.5">
                            <span className="text-xs text-muted-foreground">{spec.label}</span>
                            <span className="text-xs font-medium text-right">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  )}

                  {/* Performance */}
                  {Array.isArray(car.specifications?.performance) && car.specifications.performance.length > 0 && (
                  <AccordionItem value="performance" className="rounded-2xl border border-border/50 overflow-hidden bg-card">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Fuel className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-bold">Performance</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto mr-2 border-border">
                          {car.specifications.performance.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="divide-y divide-border/30">
                        {car.specifications.performance.map((spec, index) => (
                          <div key={index} className="flex justify-between px-4 py-2.5">
                            <span className="text-xs text-muted-foreground">{spec.label}</span>
                            <span className="text-xs font-medium text-right">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  )}

                  {/* Features & Safety */}
                  {Array.isArray(car.specifications?.features) && car.specifications.features.length > 0 && (
                  <AccordionItem value="features" className="rounded-2xl border border-border/50 overflow-hidden bg-card">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Shield className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-bold">Features & Safety</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto mr-2 border-border">
                          {car.specifications.features.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="divide-y divide-border/30">
                        {car.specifications.features.map((spec, index) => (
                          <div key={index} className="flex justify-between px-4 py-2.5">
                            <span className="text-xs text-muted-foreground">{spec.label}</span>
                            <span className="text-xs font-medium text-right">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  )}
                </Accordion>
              </TabsContent>

              <TabsContent value="variants" className="space-y-8">
                {/* Variant Comparison Table - Full Width */}
                <VariantComparisonTable
                  carName={car.name}
                  carBrand={car.brand}
                  variants={car.variants || []}
                  onVariantSelect={setSelectedVariant}
                  selectedVariantIndex={selectedVariant}
                />
                
                {/* Selected Variant Details - Only show if variants exist */}
                {car.variants && car.variants.length > 0 && car.variants[selectedVariant] ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Price Breakup */}
                    <div className="space-y-4">
                      {(() => {
                        const selectedVar = car.variants[selectedVariant];
                        const priceMatch = selectedVar?.price?.match(/[\d.]+/);
                        const priceInLakh = priceMatch ? parseFloat(priceMatch[0]) : 0;
                        const exShowroomPrice = selectedVar?.priceNumeric || priceInLakh * 100000 || car.priceNumeric || 0;
                        
                        return (
                          <PriceBreakup
                            variantName={selectedVar?.name || 'Base'}
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
                          <Check className="h-5 w-5 text-foreground" />
                          Features - {car.name} {car.variants[selectedVariant]?.name || ''}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(car.variants[selectedVariant]?.features || []).map((feature, fIndex) => (
                            <div key={fIndex} className="flex items-center gap-2 py-1.5 px-2 bg-muted/30 rounded-lg">
                              <Check className="h-4 w-4 text-foreground flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Variant details coming soon for this model.</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="emi" className="space-y-6">
                {(() => {
                  const selectedVar = car.variants?.[selectedVariant];
                  const priceMatch = selectedVar?.price?.match(/[\d.]+/);
                  const priceInLakh = priceMatch ? parseFloat(priceMatch[0]) : 0;
                  const exShowroomPrice = selectedVar?.priceNumeric || priceInLakh * 100000 || car.priceNumeric || 500000;
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
                               <p className="text-sm font-semibold text-foreground mt-0.5">{selectedVar?.name || 'Base Variant'}</p>
                               <p className="text-xs text-muted-foreground mt-2">
                                 {selectedVar?.fuelType || car.fuelTypes?.[0] || 'Petrol'} • {selectedVar?.transmission || car.transmission?.[0] || 'Manual'}
                               </p>
                             </div>
                             <div className="flex flex-col items-end gap-3">
                               <div>
                                 <p className="text-sm text-muted-foreground mb-1">Starting On-Road Price</p>
                                 <p className="text-3xl font-bold text-foreground">
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
                        variantName={selectedVar?.name || 'Base Variant'}
                        onRoadPrice={onRoadPriceData}
                        selectedColor={car.colors?.[selectedColor]?.name || displayColors?.[selectedColor]?.name}
                        selectedCity="Delhi NCR"
                        onGetQuote={(loanDetails) => {
                          toast.success("Loan quote request submitted!", {
                            description: `${loanDetails} for ${car.name} ${selectedVar?.name || ''}`
                          });
                        }}
                      />
                      
                      {/* Quick Tenure Options */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-foreground" />
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
                                  <p className="text-xl font-bold text-foreground">₹{emi.toLocaleString("en-IN")}</p>
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
                  {(car.offers || []).map((offer) => (
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
                                offer.type === "cashback" ? "bg-success/10 text-foreground" :
                                offer.type === "exchange" ? "bg-primary/10 text-foreground" :
                                offer.type === "accessory" ? "bg-accent/10 text-foreground" :
                                "bg-blue-500/10 text-blue-500"
                              }`}>
                                {getOfferIcon(offer.type)}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold mb-1">{offer.title}</h4>
                                <p className="text-sm text-muted-foreground mb-2">{offer.description}</p>
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-lg text-foreground">{offer.discount}</span>
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

        {/* AI Recommendations Section */}
        <section className="py-6 md:py-10 bg-secondary/30">
          <div className="container mx-auto px-4 space-y-6">
            {/* AI Recommendations */}
            <AICarRecommendations
              carName={car.name}
              brand={car.brand}
              price={car.price}
              fuelTypes={car.fuelTypes}
              transmission={car.transmission}
            />

            {/* Cross-Sell */}
            <CrossSellWidget 
              context="carDetail" 
              title="Complete Your Purchase" 
              maxItems={4}
              layout="compact-grid"
            />
          </div>
        </section>

        {/* WhatsApp Conversion Section */}
        <section className="py-8 lg:py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <WhatsAppConversionCard
                carName={`${car.brand} ${car.name}`}
                variant={car.variants?.[selectedVariant]?.name}
                exShowroomPrice={car.variants?.[selectedVariant]?.priceNumeric || car.priceNumeric}
              />
            </div>
          </div>
        </section>

      </main>
      {/* Spacer for mobile sticky bottom bar */}
      <div className="h-20 lg:hidden" />

      <Footer />
      <FloatingCTA />

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card border-t border-border shadow-[0_-4px_20px_-4px_hsl(var(--foreground)/0.1)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] text-muted-foreground font-medium">On-Road Price</p>
            <p className="text-lg font-bold text-foreground">
              ₹{((car.variants?.[selectedVariant]?.priceNumeric || car.priceNumeric) / 100000).toFixed(2)} L
            </p>
          </div>
          <Button
            variant="cta"
            size="lg"
            className="font-bold px-6 rounded-xl"
            onClick={() => setPricingDrawerOpen(true)}
          >
            <IndianRupee className="h-4 w-4 mr-1" />
            Get Best Price
          </Button>
        </div>
      </div>

      {/* Mobile Pricing Drawer */}
      <Drawer open={pricingDrawerOpen} onOpenChange={setPricingDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>Configure & Get Best Price</DrawerTitle>
            <DrawerDescription>Select variant, city & accessories</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <CarPricingConfigurator
              car={car}
              colors={displayColors}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Mobile Booking Drawer */}
      <Drawer open={bookingDrawerOpen} onOpenChange={setBookingDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>Book Your {car.name}</DrawerTitle>
            <DrawerDescription>Fill in your details to book this car</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <BookingForm carName={car.name} carBrand={car.brand} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default CarDetail;
