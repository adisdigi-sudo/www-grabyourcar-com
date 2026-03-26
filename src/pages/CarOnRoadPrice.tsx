import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Check,
  MapPin,
  Palette,
  TrendingDown,
  Sparkles,
  Calculator,
  Phone,
  Info,
  Building2,
  User
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { useRoadTaxRules, calculateOnRoadPrice, useAvailableStates } from "@/hooks/useRoadTaxEngine";
import { calculateStatePriceBreakup, stateRates } from "@/data/statePricing";
import { useCarColors } from "@/hooks/useCarColors";
import { useCarBySlug } from "@/hooks/useCars";
import { WhatsAppSalesCTA } from "@/components/WhatsAppCTA";
import { EMICustomizerModal } from "@/components/EMICustomizerModal";
import { Skeleton } from "@/components/ui/skeleton";

const CarOnRoadPrice = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: car, isLoading, error } = useCarBySlug(slug);
  const { data: dbColors } = useCarColors(slug);
  const { data: taxRules, isLoading: taxLoading } = useRoadTaxRules();
  const dbStates = useAvailableStates();
  
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedState, setSelectedState] = useState("DL");
  const [selectedOwnership, setSelectedOwnership] = useState("individual");
  const [showFullBreakup, setShowFullBreakup] = useState(false);
  const [showEMIModal, setShowEMIModal] = useState(false);

  const displayColors = useMemo(() => {
    if (dbColors && dbColors.length > 0) return dbColors;
    return car?.colors || [];
  }, [dbColors, car?.colors]);

  // Use DB states if available, fallback to hardcoded
  const availableStates = useMemo(() => {
    if (dbStates && dbStates.length > 0) return dbStates;
    return stateRates.map(s => ({ code: s.code, name: s.name }));
  }, [dbStates]);

  // Use DB engine if rules available, fallback to hardcoded
  const currentVariant = car?.variants?.[selectedVariant];
  const exShowroomPrice = currentVariant?.priceNumeric || (parseFloat(car?.price?.match(/[\d.]+/)?.[0] || "0") * 100000);
  const fuelType = currentVariant?.fuelType || car?.fuelTypes?.[0] || "petrol";

  const breakup = useMemo(() => {
    if (taxRules && taxRules.length > 0) {
      return calculateOnRoadPrice(taxRules, exShowroomPrice, selectedState, fuelType, selectedOwnership);
    }
    const fallback = calculateStatePriceBreakup(exShowroomPrice, selectedState, fuelType);
    return {
      ...fallback,
      additionalCess: 0,
      luxurySurcharge: 0,
      ownershipType: selectedOwnership,
      fuelType,
      matchedRule: null,
    };
  }, [taxRules, exShowroomPrice, selectedState, fuelType, selectedOwnership]);

  const finalOnRoadPrice = breakup.onRoadPrice;

  // EMI Calculations
  const loanAmount = finalOnRoadPrice * 0.8;
  const interestRate = 8.5;
  const tenureMonths = 60;
  const monthlyRate = interestRate / 12 / 100;
  const emi = Math.round(
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1)
  );
  const downPayment = finalOnRoadPrice * 0.2;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
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
          <Link to="/cars"><Button>Browse Cars</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{car.brand} {car.name} On-Road Price | Grabyourcar</title>
        <meta name="description" content={`Get ${car.brand} ${car.name} on-road price with complete breakup including taxes, registration & insurance. Check prices in your city.`} />
      </Helmet>
      <Header />
      
      <main className="pt-20">
        {/* Breadcrumb */}
        <div className="bg-secondary/50 py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <ChevronRight className="h-4 w-4" />
              <Link to="/cars" className="hover:text-primary transition-colors">Cars</Link>
              <ChevronRight className="h-4 w-4" />
              <Link to={`/car/${car.slug}`} className="hover:text-primary transition-colors">{car.name}</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">On-Road Price</span>
            </div>
          </div>
        </div>

        {/* Header Section */}
        <section className="py-6 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="default" className="mb-3">
                <TrendingDown className="h-3 w-3 mr-1" />
                Price Transparency
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {car.brand} {car.name} On-Road Price
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Get complete price breakup with taxes, registration & accessories
              </p>
            </div>
          </div>
        </section>

        {/* Main Pricing Card */}
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
                {/* Header with Price */}
                <div className="bg-gradient-to-r from-primary via-success to-primary/80 p-5 md:p-6">
                  <div className="flex items-center justify-between text-primary-foreground">
                    <div>
                      <p className="text-sm opacity-80">On-Road Price</p>
                      <motion.div 
                        key={finalOnRoadPrice}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-baseline gap-2"
                      >
                        <span className="text-3xl md:text-4xl font-bold">
                          {formatPrice(finalOnRoadPrice)}
                        </span>
                        <span className="text-sm opacity-70">
                          in {availableStates.find(s => s.code === selectedState)?.name}
                        </span>
                      </motion.div>
                      {taxLoading && <span className="text-xs opacity-60">Loading latest rates...</span>}
                    </div>
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Exclusive Offer
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-5 md:p-6 space-y-5">
                  {/* Selectors - 3 column grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Select Variant
                      </label>
                      <Select 
                        value={selectedVariant.toString()} 
                        onValueChange={(v) => setSelectedVariant(parseInt(v))}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {car.variants.map((variant, index) => (
                            <SelectItem key={index} value={index.toString()} className="py-3">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{variant.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {variant.fuelType || car.fuelTypes[0]} • {variant.transmission || car.transmission[0]}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        State
                      </label>
                      <Select value={selectedState} onValueChange={setSelectedState}>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStates.map((state) => (
                            <SelectItem key={state.code} value={state.code}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        {selectedOwnership === "corporate" ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        Ownership
                      </label>
                      <Select value={selectedOwnership} onValueChange={setSelectedOwnership}>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="corporate">Corporate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Color Selection */}
                  {displayColors.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Palette className="h-3 w-3" />
                        Select Color
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {displayColors.map((color, index) => (
                          <TooltipProvider key={index}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setSelectedColor(index)}
                                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                                    selectedColor === index 
                                      ? "border-primary scale-110 ring-2 ring-primary/30" 
                                      : "border-border hover:scale-105"
                                  }`}
                                  style={{ backgroundColor: color.hex }}
                                >
                                  {selectedColor === index && (
                                    <Check className="h-4 w-4 m-auto text-white drop-shadow-md" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent><p>{color.name}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                      {displayColors[selectedColor] && (
                        <p className="text-xs text-muted-foreground mt-2">{displayColors[selectedColor].name}</p>
                      )}
                    </div>
                  )}

                  {/* Price Breakdown */}
                  <Collapsible open={showFullBreakup} onOpenChange={setShowFullBreakup}>
                    <div className="bg-gradient-to-br from-secondary/80 to-secondary/40 rounded-xl p-5 border border-border/50">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Ex-Showroom Price</span>
                          <span className="font-semibold">{formatPrice(breakup.exShowroom)}</span>
                        </div>
                        
                        <CollapsibleTrigger className="w-full">
                          <div className="flex justify-between items-center text-sm py-2 hover:bg-muted/50 rounded px-2 -mx-2 transition-colors cursor-pointer">
                            <span className="text-muted-foreground flex items-center gap-1">
                              Taxes & Charges
                              {showFullBreakup ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </span>
                            <span className="font-semibold text-foreground">
                              {formatPrice(breakup.onRoadPrice - breakup.exShowroom)}
                            </span>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <AnimatePresence>
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-2 pl-3 border-l-2 border-primary/30 ml-1 mt-3"
                            >
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Road Tax ({breakup.roadTaxPercent}%)</span>
                                <span>{formatPrice(breakup.roadTax)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Insurance (1 Year)</span>
                                <span>{formatPrice(breakup.insurance)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  TCS (1%)
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                                      <TooltipContent><p>Tax Collected at Source — 1% of ex-showroom</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </span>
                                <span>{formatPrice(breakup.tcs)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">FASTag</span>
                                <span>{formatPrice(breakup.fastag)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Registration</span>
                                <span>{formatPrice(breakup.registration)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">HSRP</span>
                                <span>{formatPrice(breakup.hsrp)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Temp. Registration</span>
                                <span>{formatPrice(breakup.tempRegistration)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Handling Charges</span>
                                <span>{formatPrice(breakup.handling)}</span>
                              </div>
                              {breakup.greenTax > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Green Tax</span>
                                  <span>{formatPrice(breakup.greenTax)}</span>
                                </div>
                              )}
                              {breakup.additionalCess > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Additional Cess</span>
                                  <span>{formatPrice(breakup.additionalCess)}</span>
                                </div>
                              )}
                              {breakup.luxurySurcharge > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Luxury Surcharge</span>
                                  <span>{formatPrice(breakup.luxurySurcharge)}</span>
                                </div>
                              )}
                            </motion.div>
                          </AnimatePresence>
                        </CollapsibleContent>

                        {/* Final Total */}
                        <div className="flex justify-between items-center border-t border-border pt-4 mt-4">
                          <span className="font-bold text-lg">On-Road Price</span>
                          <motion.span 
                            key={finalOnRoadPrice}
                            initial={{ scale: 1.1 }}
                            animate={{ scale: 1 }}
                            className="font-bold text-foreground text-2xl"
                          >
                            {formatPrice(finalOnRoadPrice)}
                          </motion.span>
                        </div>
                      </div>
                    </div>
                  </Collapsible>

                  {/* Fuel & Ownership Info Badge */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      Fuel: {fuelType.charAt(0).toUpperCase() + fuelType.slice(1)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedOwnership === "corporate" ? "Corporate" : "Individual"} Registration
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {availableStates.find(s => s.code === selectedState)?.name}
                    </Badge>
                    {taxRules && taxRules.length > 0 && (
                      <Badge variant="secondary" className="text-xs bg-success/10 text-foreground border-success/20">
                        ✓ Live Tax Data
                      </Badge>
                    )}
                  </div>

                  {/* EMI Calculator Section */}
                  <div className="bg-gradient-to-br from-primary/5 via-success/5 to-accent/5 rounded-xl p-5 border border-primary/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calculator className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">EMI Calculator</p>
                        <p className="text-xs text-muted-foreground">{currentVariant?.name}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-background/80 rounded-lg p-4 border">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Selected Variant</span>
                          <span className="font-semibold">{currentVariant?.name}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-muted-foreground">On-Road Price</span>
                          <span className="font-bold text-foreground text-lg">{formatPrice(finalOnRoadPrice)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background/80 rounded-lg p-4 text-center border">
                          <p className="text-xs text-muted-foreground">Down Payment</p>
                          <p className="font-bold text-lg text-foreground">{formatPrice(downPayment)}</p>
                        </div>
                        <div className="bg-background/80 rounded-lg p-4 text-center border">
                          <p className="text-xs text-muted-foreground">Loan Amount</p>
                          <p className="font-bold text-lg">{formatPrice(loanAmount)}</p>
                        </div>
                      </div>
                      
                      <div className="bg-primary/10 rounded-xl p-5 text-center border border-primary/20">
                        <p className="text-sm text-muted-foreground mb-1">Monthly EMI (Estimated)</p>
                        <p className="text-3xl font-bold text-foreground">
                          ₹{emi.toLocaleString('en-IN')}
                          <span className="text-sm font-normal text-muted-foreground">/month</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">@ {interestRate}% p.a. • {tenureMonths / 12} years</p>
                      </div>

                      <Button 
                        variant="default" 
                        className="w-full text-xs sm:text-sm"
                        onClick={() => setShowEMIModal(true)}
                      >
                        <Calculator className="h-4 w-4 mr-1.5 shrink-0" />
                        <span>Customize EMI & Download Quote</span>
                      </Button>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <WhatsAppSalesCTA 
                      carName={`${car.brand} ${car.name}`} 
                      type="price" 
                      size="lg"
                      className="w-full"
                    />
                    <a href="tel:+1155578093" className="w-full">
                      <Button variant="call" size="lg" className="w-full">
                        <Phone className="h-5 w-5 mr-2" />
                        Talk to Expert
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Back Link */}
              <div className="text-center mt-6">
                <Link to={`/car/${car.slug}`}>
                  <Button variant="outline">
                    ← Back to {car.name} Details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* EMI Customizer Modal */}
      <EMICustomizerModal
        open={showEMIModal}
        onOpenChange={setShowEMIModal}
        carName={`${car.brand} ${car.name}`}
        variantName={currentVariant?.name || ""}
        onRoadPrice={{
          exShowroom: breakup.exShowroom,
          rto: breakup.roadTax,
          insurance: breakup.insurance,
          tcs: breakup.tcs,
          fastag: breakup.fastag,
          registration: breakup.registration,
          handling: breakup.handling,
          onRoadPrice: breakup.onRoadPrice
        }}
        selectedColor={displayColors[selectedColor]?.name}
        selectedCity={availableStates.find(s => s.code === selectedState)?.name}
      />
    </div>
  );
};

export default CarOnRoadPrice;
