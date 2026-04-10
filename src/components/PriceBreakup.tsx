import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { stateRates, calculateStatePriceBreakup, StatePriceBreakup } from "@/data/statePricing";
import { IndianRupee, FileText, Shield, Car, CreditCard, Tag, Truck, MapPin, Leaf } from "lucide-react";
import { useState, useMemo } from "react";

interface PriceBreakupProps {
  variantName: string;
  carName: string;
  exShowroomPrice: number;
  onStateChange?: (stateCode: string, breakup: StatePriceBreakup) => void;
}

const formatPrice = (price: number): string => {
  if (price >= 10000000) {
    return `₹${(price / 10000000).toFixed(2)} Cr`;
  } else if (price >= 100000) {
    return `₹${(price / 100000).toFixed(2)} Lakh`;
  }
  return `₹${price.toLocaleString('en-IN')}`;
};

const formatPriceExact = (price: number): string => {
  return `₹${price.toLocaleString('en-IN')}`;
};

export const PriceBreakup = ({ variantName, carName, exShowroomPrice, onStateChange }: PriceBreakupProps) => {
  const [selectedState, setSelectedState] = useState("DL");
  
  const breakup = useMemo(() => {
    const calculated = calculateStatePriceBreakup(exShowroomPrice, selectedState);
    return calculated;
  }, [exShowroomPrice, selectedState]);

  const handleStateChange = (stateCode: string) => {
    setSelectedState(stateCode);
    const newBreakup = calculateStatePriceBreakup(exShowroomPrice, stateCode);
    onStateChange?.(stateCode, newBreakup);
  };

  const selectedStateName = stateRates.find(s => s.code === selectedState)?.name || "Delhi";

  const priceItems = [
    { label: "Ex-Showroom Price", value: breakup.exShowroom, icon: Car, description: "Base price of the vehicle" },
    { label: `Road Tax (${breakup.roadTaxPercent}%)`, value: breakup.rto, icon: FileText, description: `State road tax — ${selectedStateName}` },
    { label: "Insurance (1 Year)", value: breakup.insurance, icon: Shield, description: "Comprehensive insurance (~3%)" },
    { label: "TCS (1%)", value: breakup.tcs, icon: CreditCard, description: "Tax Collected at Source — 1% of ex-showroom" },
    { label: "FASTag", value: breakup.fastag, icon: Tag, description: "Mandatory FASTag" },
    { label: "Registration Fee", value: breakup.registration, icon: FileText, description: "Number plate & registration" },
    { label: "HSRP", value: breakup.hsrp, icon: FileText, description: "High Security Registration Plate" },
    { label: "Temp Registration", value: breakup.tempRegistration, icon: FileText, description: "Temporary registration" },
    ...(breakup.greenTax > 0 ? [{ label: "Green Tax", value: breakup.greenTax, icon: Leaf, description: "Environment cess" }] : []),
    { label: "Handling & Logistics", value: breakup.handling, icon: Truck, description: "Dealer handling charges" },
  ];

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold">
              {carName} {variantName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">On-Road Price Breakup</p>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-foreground" />
            <Select value={selectedState} onValueChange={handleStateChange}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Select State" />
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
      </CardHeader>
      <CardContent className="space-y-3">
        {priceItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-2 group hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
            <span className="font-medium">{formatPriceExact(item.value)}</span>
          </div>
        ))}
        
        <Separator className="my-4" />
        
        <div className="flex items-center justify-between py-3 bg-primary/10 -mx-2 px-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-lg">On-Road Price</p>
              <p className="text-xs text-muted-foreground">Estimated price in {selectedStateName}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-bold text-2xl text-foreground">{formatPrice(breakup.onRoadPrice)}</span>
            <p className="text-xs text-muted-foreground">{formatPriceExact(breakup.onRoadPrice)}</p>
          </div>
        </div>

        {/* State comparison hint */}
        <div className="bg-muted/50 rounded-lg p-3 mt-4">
          <p className="text-xs text-muted-foreground text-center">
            💡 Road tax varies by state. Try selecting different states to compare on-road prices.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          * Prices are indicative and may vary based on accessories and current offers
        </p>
      </CardContent>
    </Card>
  );
};

export default PriceBreakup;
