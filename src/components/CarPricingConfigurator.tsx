import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronDown,
  ChevronUp,
  Check,
  MapPin,
  Palette,
  Sparkles,
  Calculator,
  IndianRupee,
  Gift,
  Package,
  Info,
  Settings2
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
import { calculateStatePriceBreakup, stateRates } from "@/data/statePricing";
import { EMICustomizerModal } from "@/components/EMICustomizerModal";
import { useEMIPDFSettings } from "@/hooks/useEMIPDFSettings";
import type { Car } from "@/data/carsData";

// Standard accessories
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
  image?: string;
}

interface CarPricingConfiguratorProps {
  car: Car;
  colors: CarColor[];
}

export const CarPricingConfigurator = ({ car, colors: dbColors }: CarPricingConfiguratorProps) => {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedState, setSelectedState] = useState("DL");
  const [showFullBreakup, setShowFullBreakup] = useState(false);
  const [showAccessories, setShowAccessories] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [showEMIModal, setShowEMIModal] = useState(false);

  // Fetch EMI PDF settings
  const { config: emiPdfConfig } = useEMIPDFSettings();

  const displayColors = useMemo(() => {
    if (dbColors && dbColors.length > 0) {
      return dbColors;
    }
    return car?.colors || [];
  }, [dbColors, car?.colors]);

  const currentVariant = car.variants[selectedVariant];
  const exShowroomPrice = currentVariant?.priceNumeric || (parseFloat(car.price.match(/[\d.]+/)?.[0] || "0") * 100000);
  const breakup = calculateStatePriceBreakup(exShowroomPrice, selectedState);
  
  // Calculate accessories total
  const accessoriesTotal = selectedAccessories.reduce((total, accId) => {
    const acc = standardAccessories.find(a => a.id === accId);
    return total + (acc?.price || 0);
  }, 0);
  
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

  // On-road price breakup for EMI modal
  const onRoadPriceBreakup = {
    exShowroom: breakup.exShowroom,
    rto: breakup.rto,
    insurance: breakup.insurance,
    tcs: breakup.tcs,
    fastag: breakup.fastag,
    registration: breakup.registration,
    handling: breakup.handling,
    otherCharges: accessoriesTotal,
    onRoadPrice: finalOnRoadPrice,
  };

  return (
    <>
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
                  in {stateRates.find(s => s.code === selectedState)?.name}
                </span>
              </motion.div>
            </div>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 mr-1" />
              Best Deal
            </Badge>
          </div>
        </div>

        <CardContent className="p-5 md:p-6 space-y-5">
          {/* Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Select City/State
              </label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="h-12">
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
                      <TooltipContent side="top" className="bg-card border text-foreground">
                        {color.name}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
              {displayColors[selectedColor] && (
                <p className="text-xs text-muted-foreground mt-1.5">{displayColors[selectedColor].name}</p>
              )}
            </div>
          )}

          {/* Price Breakdown - Collapsible */}
          <Collapsible open={showFullBreakup} onOpenChange={setShowFullBreakup}>
            <div className="bg-gradient-to-br from-secondary/80 to-secondary/40 rounded-xl p-4 border border-border/50">
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
                      className="space-y-1.5 pl-2 border-l-2 border-primary/20 ml-1 mt-2"
                    >
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">RTO Charges</span>
                        <span>{formatPrice(breakup.rto)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Insurance (1 Year)</span>
                        <span>{formatPrice(breakup.insurance)}</span>
                      </div>
                      {breakup.tcs > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            TCS (1%)
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-3 w-3" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Tax Collected at Source for vehicles above ₹10L</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </span>
                          <span>{formatPrice(breakup.tcs)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">FASTag</span>
                        <span>{formatPrice(breakup.fastag)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Registration</span>
                        <span>{formatPrice(breakup.registration)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Handling Charges</span>
                        <span>{formatPrice(breakup.handling)}</span>
                      </div>
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

            <div className="space-y-3">
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
                className="w-full gap-2"
                onClick={() => setShowEMIModal(true)}
              >
                <Settings2 className="h-4 w-4" />
                Customize EMI & Download Quote
              </Button>
            </div>
          </div>

          {/* Accessories Section */}
          <Collapsible open={showAccessories} onOpenChange={setShowAccessories}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-border">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Add Accessories (Optional)</span>
                  {selectedAccessories.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedAccessories.length} selected
                    </Badge>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showAccessories ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-4 bg-secondary/30 rounded-lg border border-border space-y-3">
                {standardAccessories.map((acc) => (
                  <div 
                    key={acc.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedAccessories.includes(acc.id) 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-background/50 border-border hover:border-primary/20'
                    }`}
                    onClick={() => toggleAccessory(acc.id)}
                  >
                    <Checkbox 
                      checked={selectedAccessories.includes(acc.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{acc.name}</p>
                          <p className="text-xs text-muted-foreground">{acc.description}</p>
                        </div>
                        <span className="font-semibold text-sm text-primary">
                          ₹{acc.price.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {selectedAccessories.length > 0 && (
                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <span className="font-medium text-sm">Accessories Total</span>
                    <span className="font-bold text-accent">{formatPrice(accessoriesTotal)}</span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* EMI Customizer Modal */}
      <EMICustomizerModal
        open={showEMIModal}
        onOpenChange={setShowEMIModal}
        carName={car.name}
        variantName={currentVariant?.name || ""}
        selectedColor={displayColors[selectedColor]?.name}
        selectedCity={stateRates.find(s => s.code === selectedState)?.name}
        onRoadPrice={onRoadPriceBreakup}
        pdfConfig={emiPdfConfig}
        brochureUrl={car.brochureUrl}
        availableColors={displayColors.map(c => ({ name: c.name, hex: c.hex }))}
        onColorChange={(colorName) => {
          const idx = displayColors.findIndex(c => c.name === colorName);
          if (idx >= 0) setSelectedColor(idx);
        }}
      />
    </>
  );
};
