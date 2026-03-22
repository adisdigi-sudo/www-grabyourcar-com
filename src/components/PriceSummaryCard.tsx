import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  TrendingDown, 
  Phone,
  MapPin,
  Check,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Palette,
  Package,
  Sparkles,
  Info,
  Calculator,
  IndianRupee,
  Share2,
  Settings2
} from "lucide-react";
import { WhatsAppSalesCTA } from "@/components/WhatsAppCTA";
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
import { useState, useMemo } from "react";
import { FuelTypeTabs, extractFuelTypes } from "@/components/FuelTypeTabs";
import { calculateStatePriceBreakup, stateRates } from "@/data/statePricing";
import { motion, AnimatePresence } from "framer-motion";
import { useEMIPDFSettings } from "@/hooks/useEMIPDFSettings";
import { EMICustomizerModal } from "@/components/EMICustomizerModal";
import { BrochureLeadGate } from "@/components/BrochureLeadGate";

// Standard accessories that can be added
const standardAccessories = [
  { id: "floorMats", name: "3D Floor Mats", price: 2999, description: "Premium all-weather protection" },
  { id: "seatCovers", name: "Leather Seat Covers", price: 8999, description: "Genuine leather, custom fit" },
  { id: "bodyKit", name: "Body Side Moulding", price: 4999, description: "Scratch protection kit" },
  { id: "dashCam", name: "Front Dash Camera", price: 5999, description: "Full HD with night vision" },
  { id: "coating", name: "Ceramic Coating", price: 15999, description: "3-year paint protection" },
];

interface CarColor {
  name: string;
  hex: string;
}

interface PriceSummaryCardProps {
  carName: string;
  carBrand: string;
  exShowroomPrice: number;
  variants: {
    name: string;
    price: string;
    priceNumeric?: number;
    fuelType?: string;
    transmission?: string;
  }[];
  colors?: CarColor[];
  selectedVariant: number;
  selectedColor?: number;
  onVariantChange: (index: number) => void;
  onColorChange?: (index: number) => void;
  brochureUrl?: string;
}

export const PriceSummaryCard = ({
  carName,
  carBrand,
  exShowroomPrice,
  variants,
  colors = [],
  selectedVariant,
  selectedColor = 0,
  onVariantChange,
  onColorChange,
  brochureUrl,
}: PriceSummaryCardProps) => {
  const [selectedState, setSelectedState] = useState("DL");
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [showFullBreakup, setShowFullBreakup] = useState(false);
  const [showEMIModal, setShowEMIModal] = useState(false);
  const [selectedFuel, setSelectedFuel] = useState("All");

  // Fuel type filtering
  const fuelTypes = useMemo(() => extractFuelTypes(variants), [variants]);
  const filteredVariants = useMemo(() => {
    if (selectedFuel === "All" || fuelTypes.length <= 1) return variants;
    return variants.filter(v => (v.fuelType || "") === selectedFuel);
  }, [variants, selectedFuel, fuelTypes]);

  const handleFuelChange = (fuel: string) => {
    setSelectedFuel(fuel);
    onVariantChange(0);
  };
  
  // Fetch EMI PDF settings from backend
  const { config: emiPdfConfig } = useEMIPDFSettings();
  
  const breakup = calculateStatePriceBreakup(exShowroomPrice, selectedState);
  
  // Calculate accessories total
  const accessoriesTotal = selectedAccessories.reduce((total, accId) => {
    const acc = standardAccessories.find(a => a.id === accId);
    return total + (acc?.price || 0);
  }, 0);
  
  // Final on-road price with accessories
  const finalOnRoadPrice = breakup.onRoadPrice + accessoriesTotal;

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    if (price >= 100000) {
      return `₹${(price / 100000).toFixed(2)} L`;
    }
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const toggleAccessory = (accId: string) => {
    setSelectedAccessories(prev => 
      prev.includes(accId) 
        ? prev.filter(id => id !== accId)
        : [...prev, accId]
    );
  };

  const currentVariant = variants[selectedVariant];

  return (
    <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
      {/* Header with Price */}
      <div className="bg-gradient-to-r from-primary via-success to-primary/80 p-4 md:p-5">
        <div className="flex items-center justify-between text-primary-foreground">
          <div>
            <p className="text-sm opacity-80">On-Road Price</p>
            <motion.div 
              key={finalOnRoadPrice}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-baseline gap-2"
            >
              <span className="text-2xl md:text-3xl font-bold">
                {formatPrice(finalOnRoadPrice)}
              </span>
              <span className="text-xs opacity-70">
                {selectedState && `in ${stateRates.find(s => s.code === selectedState)?.name}`}
              </span>
            </motion.div>
          </div>
          <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
            <Sparkles className="h-3 w-3 mr-1" />
            Exclusive Offer
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4 md:p-5 space-y-4">
        {/* Variant Selection */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Select Variant
              </label>
              <Select 
                value={selectedVariant.toString()} 
                onValueChange={(v) => onVariantChange(parseInt(v))}
              >
                <SelectTrigger className="h-10 text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((variant, index) => (
                    <SelectItem key={index} value={index.toString()} className="py-2">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{variant.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {variant.fuelType} • {variant.transmission}
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
                Select City/State
              </label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="h-10 text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stateRates.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Color Selection */}
          {colors.length > 0 && onColorChange && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Palette className="h-3 w-3" />
                Select Color
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onColorChange(index)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
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
                      <TooltipContent>
                        <p>{color.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
              {colors[selectedColor] && (
                <p className="text-xs text-muted-foreground mt-1.5">{colors[selectedColor].name}</p>
              )}
            </div>
          )}
        </div>

        {/* Price Breakdown - Collapsible */}
        <Collapsible open={showFullBreakup} onOpenChange={setShowFullBreakup}>
          <div className="bg-gradient-to-br from-secondary/80 to-secondary/40 rounded-xl p-4 border border-border/50">
            {/* Summary View */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ex-Showroom Price</span>
                <span className="font-medium">{formatPrice(breakup.exShowroom)}</span>
              </div>
              
              <CollapsibleTrigger className="w-full">
                <div className="flex justify-between items-center text-sm py-1 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Taxes & Charges
                    {showFullBreakup ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </span>
                  <span className="font-medium text-primary">
                    {formatPrice(breakup.onRoadPrice - breakup.exShowroom - accessoriesTotal)}
                  </span>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 pl-2 border-l-2 border-primary/20 ml-1 mt-2"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Road Tax ({breakup.roadTaxPercent}%)</span>
                      <span>{formatPrice(breakup.rto)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Insurance (1 Year)</span>
                      <span>{formatPrice(breakup.insurance)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        TCS (1%)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Tax Collected at Source — 1% of ex-showroom</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                      <span>{formatPrice(breakup.tcs)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">FASTag</span>
                      <span>{formatPrice(breakup.fastag)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Registration</span>
                      <span>{formatPrice(breakup.registration)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Temp. Registration</span>
                      <span>{formatPrice(breakup.tempRegistration)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Handling Charges</span>
                      <span>{formatPrice(breakup.handling)}</span>
                    </div>
                    {breakup.greenTax > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Green Tax</span>
                        <span>{formatPrice(breakup.greenTax)}</span>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </CollapsibleContent>

              {/* Accessories Total */}
              {accessoriesTotal > 0 && (
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Accessories ({selectedAccessories.length})
                  </span>
                  <span className="font-medium text-accent">{formatPrice(accessoriesTotal)}</span>
                </div>
              )}

              {/* Final Total */}
              <div className="flex justify-between text-base border-t border-border pt-3 mt-3">
                <span className="font-semibold">On-Road Price</span>
                <motion.span 
                  key={finalOnRoadPrice}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="font-bold text-primary text-lg"
                >
                  {formatPrice(finalOnRoadPrice)}
                </motion.span>
              </div>
            </div>
          </div>
        </Collapsible>

        {/* EMI Calculator Section */}
        <div className="bg-gradient-to-br from-primary/5 via-success/5 to-accent/5 rounded-xl p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">EMI Calculator</p>
              <p className="text-xs text-muted-foreground">{currentVariant?.name}</p>
            </div>
          </div>
          
          {(() => {
            // Calculate EMI based on 80% loan and 8.5% interest for 5 years
            const loanAmount = finalOnRoadPrice * 0.8;
            const interestRate = 8.5;
            const tenureMonths = 60;
            const monthlyRate = interestRate / 12 / 100;
            const emi = Math.round(
              (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
              (Math.pow(1 + monthlyRate, tenureMonths) - 1)
            );
            const downPayment = finalOnRoadPrice * 0.2;
            
            return (
              <div className="space-y-3">
                {/* Selected Variant Summary */}
                <div className="bg-background/80 rounded-lg p-3 border">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Selected Variant</span>
                    <span className="font-semibold text-sm">{currentVariant?.name}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">On-Road Price</span>
                    <span className="font-bold text-primary">{formatPrice(finalOnRoadPrice)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background/80 rounded-lg p-2.5 text-center border">
                    <p className="text-xs text-muted-foreground">Down Payment</p>
                    <p className="font-bold text-sm text-primary">{formatPrice(downPayment)}</p>
                  </div>
                  <div className="bg-background/80 rounded-lg p-2.5 text-center border">
                    <p className="text-xs text-muted-foreground">Loan Amount</p>
                    <p className="font-bold text-sm">{formatPrice(loanAmount)}</p>
                  </div>
                </div>
                
                <div className="bg-primary/10 rounded-xl p-4 text-center border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Monthly EMI (Estimated)</p>
                  <p className="text-2xl font-bold text-primary">
                    ₹{emi.toLocaleString('en-IN')}
                    <span className="text-xs font-normal text-muted-foreground">/month</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">@ {interestRate}% p.a. • {tenureMonths / 12} years</p>
                </div>

                {/* Customize & Download */}
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setShowEMIModal(true)}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Customize EMI & Download Quote
                </Button>
              </div>
            );
          })()}
        </div>

        {/* EMI Customizer Modal */}
        <EMICustomizerModal
          open={showEMIModal}
          onOpenChange={setShowEMIModal}
          carName={`${carBrand} ${carName}`}
          variantName={currentVariant?.name || ''}
          selectedColor={colors[selectedColor]?.name}
          selectedCity={stateRates.find(s => s.code === selectedState)?.name}
          onRoadPrice={{
            exShowroom: breakup.exShowroom,
            rto: breakup.rto,
            insurance: breakup.insurance,
            tcs: breakup.tcs,
            fastag: breakup.fastag,
            registration: breakup.registration,
            handling: breakup.handling,
            onRoadPrice: finalOnRoadPrice,
          }}
          pdfConfig={emiPdfConfig}
        />

        {/* Optional Accessories */}
        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <span className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Add Accessories (Optional)
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 mt-3">
              {standardAccessories.map((acc) => (
                <label
                  key={acc.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedAccessories.includes(acc.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedAccessories.includes(acc.id)}
                    onCheckedChange={() => toggleAccessory(acc.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">{acc.description}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    +{formatPrice(acc.price)}
                  </span>
                </label>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Contact for Best Deal - Premium CTA */}
        <div className="bg-gradient-to-r from-primary/10 via-success/10 to-primary/10 rounded-xl p-4 border border-primary/20">
          <div className="text-center mb-3">
            <p className="text-sm font-medium">
              <span className="text-primary font-bold">Contact us</span> for the{" "}
              <span className="text-success font-bold">Best Deal</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exclusive offers available only via direct inquiry
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <WhatsAppSalesCTA 
              carName={`${carBrand} ${carName} ${currentVariant?.name || ''}`}
              type="price"
              size="sm"
              className="w-full justify-center"
            />
            <a href="tel:+1155578093" className="block">
              <Button variant="call" size="sm" className="w-full">
                <Phone className="h-4 w-4 mr-1.5" />
                Call Expert
              </Button>
            </a>
          </div>
        </div>

        {/* Brochure Download - gated with lead capture */}
        {brochureUrl && brochureUrl.includes('supabase.co') && (
          <BrochureLeadGate brochureUrl={brochureUrl} carName={`${carBrand} ${carName}`}>
            <div className="flex items-center justify-center gap-2 p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors group cursor-pointer">
              <FileText className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Download Brochure</span>
              <Download className="h-4 w-4 text-muted-foreground" />
            </div>
          </BrochureLeadGate>
        )}

        {/* Trust Indicators */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-success" />
            No Hidden Charges
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-success" />
            100% Verified Dealers
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-success" />
            Pan-India Delivery
          </span>
        </div>
      </CardContent>
    </Card>
  );
};