import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown,
  Check,
  MapPin,
  Palette,
  Sparkles,
  Calculator,
  IndianRupee,
  Gift
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
import { motion } from "framer-motion";
import { calculateStatePriceBreakup, stateRates } from "@/data/statePricing";
import type { Car } from "@/data/carsData";

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

  const displayColors = useMemo(() => {
    if (dbColors && dbColors.length > 0) {
      return dbColors;
    }
    return car?.colors || [];
  }, [dbColors, car?.colors]);

  const currentVariant = car.variants[selectedVariant];
  const exShowroomPrice = currentVariant?.priceNumeric || (parseFloat(car.price.match(/[\d.]+/)?.[0] || "0") * 100000);
  const breakup = calculateStatePriceBreakup(exShowroomPrice, selectedState);
  const finalOnRoadPrice = breakup.onRoadPrice;

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    if (price >= 100000) {
      return `₹${(price / 100000).toFixed(2)} L`;
    }
    return `₹${price.toLocaleString('en-IN')}`;
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

  return (
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
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-card border text-foreground">
                      {color.name}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <Collapsible open={showFullBreakup} onOpenChange={setShowFullBreakup}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-sm font-medium">Ex-Showroom Price</span>
              <span className="text-sm font-bold text-primary">{formatPrice(exShowroomPrice)}</span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            <div className="p-3 bg-secondary/30 rounded-lg space-y-2">
              {[
                { label: "RTO & Taxes", value: breakup.rto },
                { label: "Insurance", value: breakup.insurance },
                { label: "Registration", value: breakup.registration },
                { label: "Fastag", value: breakup.fastag },
                { label: "Handling", value: breakup.handling },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{formatPrice(item.value)}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* On-Road Price */}
        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground">On-Road Price</span>
            <motion.span 
              key={finalOnRoadPrice}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-xl font-bold text-success"
            >
              {formatPrice(finalOnRoadPrice)}
            </motion.span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">*Estimated. Actual may vary by dealer</p>
        </div>

        {/* EMI Section */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="font-medium text-sm">EMI Calculator</p>
              <p className="text-xs text-muted-foreground">{currentVariant.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Down Payment</p>
              <p className="font-semibold text-foreground">{formatPrice(downPayment)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Loan Amount</p>
              <p className="font-semibold text-foreground">{formatPrice(loanAmount)}</p>
            </div>
          </div>

          <div className="bg-success/10 rounded-lg p-3 border border-success/20">
            <p className="text-xs text-muted-foreground mb-1">Monthly EMI (Estimated)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-success">₹{emi.toLocaleString('en-IN')}</span>
              <span className="text-xs text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">@ 8.5% p.a. • 5 years</p>
          </div>

          <Button 
            variant="cta" 
            size="lg" 
            className="w-full gap-2"
          >
            <IndianRupee className="h-4 w-4" />
            Customize EMI & Download Quote
          </Button>
        </div>

        {/* Accessories */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Add Accessories (Optional)</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 bg-secondary/30 rounded-lg border border-border mt-2">
            <p className="text-sm text-muted-foreground text-center py-4">
              Browse accessories to enhance your car
            </p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
