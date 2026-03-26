import { useState, useMemo } from "react";
import { FuelTypeTabs, extractFuelTypes } from "@/components/FuelTypeTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, ChevronDown, ChevronUp, Fuel, Cog, IndianRupee, MessageCircle, MapPin } from "lucide-react";
import { CarVariant } from "@/data/cars/types";
import { calculateStatePriceBreakup, stateRates } from "@/data/statePricing";
import { cn } from "@/lib/utils";

// Major cities for quick comparison
const MAJOR_CITIES = [
  { code: "DL", name: "Delhi" },
  { code: "MH", name: "Mumbai" },
  { code: "KA", name: "Bangalore" },
  { code: "TN", name: "Chennai" },
  { code: "TS", name: "Hyderabad" },
];

interface VariantComparisonTableProps {
  carName: string;
  carBrand: string;
  variants: CarVariant[];
  onVariantSelect?: (index: number) => void;
  selectedVariantIndex?: number;
}

export const VariantComparisonTable = ({
  carName,
  carBrand,
  variants,
  onVariantSelect,
  selectedVariantIndex = 0,
}: VariantComparisonTableProps) => {
  const [showFullTable, setShowFullTable] = useState(false);
  const [selectedState, setSelectedState] = useState("DL");
  const [showStatePricing, setShowStatePricing] = useState(false);
  const [selectedFuel, setSelectedFuel] = useState("All");

  // Fuel type filtering
  const fuelTypes = useMemo(() => extractFuelTypes(variants), [variants]);
  const displayVariants = useMemo(() => {
    if (selectedFuel === "All" || fuelTypes.length <= 1) return variants;
    return variants.filter(v => (v.fuelType || "") === selectedFuel);
  }, [variants, selectedFuel, fuelTypes]);

  // Extract all unique features across displayed variants
  const allFeatures = [...new Set(displayVariants.flatMap((v) => v.features))];

  // Group features for display (show top 8 initially)
  const displayedFeatures = showFullTable ? allFeatures : allFeatures.slice(0, 8);

  // Parse price from variant
  const getNumericPrice = (variant: CarVariant): number => {
    if (variant.priceNumeric) return variant.priceNumeric;
    const match = variant.price.match(/[\d.]+/);
    return match ? parseFloat(match[0]) * 100000 : 0;
  };

  // Calculate price difference from base variant
  const basePrice = getNumericPrice(displayVariants[0] || variants[0]);

  const formatPriceDiff = (price: number): string => {
    const diff = price - basePrice;
    if (diff === 0) return "Base";
    const inLakh = diff / 100000;
    return diff > 0 ? `+₹${inLakh.toFixed(2)}L` : `-₹${Math.abs(inLakh).toFixed(2)}L`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-foreground" />
              Variant Comparison
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Compare {displayVariants.length} variants of {carBrand} {carName}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {displayVariants.length} Variants
          </Badge>
        </div>
        {/* Fuel Type Filter */}
        {fuelTypes.length > 1 && (
          <div className="mt-3">
            <FuelTypeTabs fuelTypes={fuelTypes} selected={selectedFuel} onChange={setSelectedFuel} showAll={true} />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            {/* Header Row - Variant Names */}
            <div className="grid border-b border-border bg-muted/50" style={{ gridTemplateColumns: `200px repeat(${displayVariants.length}, minmax(160px, 1fr))` }}>
              <div className="p-4 font-semibold text-sm text-muted-foreground sticky left-0 bg-muted/50 z-10">
                Feature
              </div>
              {displayVariants.map((variant, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-4 text-center cursor-pointer transition-colors hover:bg-primary/5",
                    selectedVariantIndex === index && "bg-primary/10 border-b-2 border-primary"
                  )}
                  onClick={() => onVariantSelect?.(index)}
                >
                  <p className="font-semibold text-sm mb-1 truncate">{variant.name}</p>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    {variant.fuelType && (
                      <span className="flex items-center gap-1">
                        <Fuel className="h-3 w-3" />
                        {variant.fuelType}
                      </span>
                    )}
                    {variant.transmission && (
                      <span className="flex items-center gap-1">
                        <Cog className="h-3 w-3" />
                        {variant.transmission}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Row */}
            <div className="grid border-b border-border bg-gradient-to-r from-primary/5 to-success/5" style={{ gridTemplateColumns: `200px repeat(${displayVariants.length}, minmax(160px, 1fr))` }}>
              <div className="p-4 font-semibold text-sm text-foreground sticky left-0 bg-gradient-to-r from-primary/5 to-transparent z-10">
                Ex-Showroom Price
              </div>
              {displayVariants.map((variant, index) => {
                const price = getNumericPrice(variant);
                return (
                  <div key={index} className="p-4 text-center">
                    <p className="font-bold text-lg text-foreground">{variant.price}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      formatPriceDiff(price) === "Base" ? "text-muted-foreground" : "text-foreground font-medium"
                    )}>
                      {formatPriceDiff(price)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* On-Road Price Row with State Selector */}
            <div className="grid border-b border-border bg-success/5" style={{ gridTemplateColumns: `200px repeat(${displayVariants.length}, minmax(160px, 1fr))` }}>
              <div className="p-4 sticky left-0 bg-success/5 z-10">
                <div className="flex flex-col gap-2">
                  <span className="font-semibold text-sm text-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-foreground" />
                    On-Road Price
                  </span>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stateRates.map((state) => (
                        <SelectItem key={state.code} value={state.code} className="text-xs">
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {displayVariants.map((variant, index) => {
                const price = getNumericPrice(variant);
                const breakup = calculateStatePriceBreakup(price, selectedState);
                const selectedStateName = stateRates.find(s => s.code === selectedState)?.name || "Delhi";
                return (
                  <div key={index} className="p-4 text-center">
                    <p className="font-bold text-lg text-foreground">
                      ₹{(breakup.onRoadPrice / 100000).toFixed(2)} L
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedStateName}</p>
                  </div>
                );
              })}
            </div>

            {/* Toggle for City-wise Comparison */}
            <div className="grid border-b border-border bg-muted/30" style={{ gridTemplateColumns: `200px repeat(${displayVariants.length}, minmax(160px, 1fr))` }}>
              <div className="p-2 sticky left-0 bg-muted/30 z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStatePricing(!showStatePricing)}
                  className="text-xs gap-1 h-7"
                >
                  {showStatePricing ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showStatePricing ? "Hide" : "Compare"} City Prices
                </Button>
              </div>
              {displayVariants.map((_, index) => (
                <div key={index} className="p-2" />
              ))}
            </div>

            {/* City-wise Price Comparison (Collapsible) */}
            {showStatePricing && MAJOR_CITIES.map((city) => (
              <div 
                key={city.code}
                className={cn(
                  "grid border-b border-border/50",
                  selectedState === city.code ? "bg-primary/5" : "bg-card"
                )}
                style={{ gridTemplateColumns: `200px repeat(${displayVariants.length}, minmax(160px, 1fr))` }}
              >
                <div 
                  className={cn(
                    "p-3 text-sm sticky left-0 z-10 flex items-center gap-2 cursor-pointer hover:text-primary transition-colors",
                    selectedState === city.code ? "bg-primary/5 text-foreground font-medium" : "bg-card"
                  )}
                  onClick={() => setSelectedState(city.code)}
                >
                  <MapPin className="h-3 w-3" />
                  {city.name}
                  {selectedState === city.code && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">Selected</Badge>
                  )}
                </div>
                {displayVariants.map((variant, variantIndex) => {
                  const price = getNumericPrice(variant);
                  const breakup = calculateStatePriceBreakup(price, city.code);
                  return (
                    <div key={variantIndex} className="p-3 text-center">
                      <p className={cn(
                        "font-semibold text-sm",
                        selectedState === city.code ? "text-primary" : "text-foreground"
                      )}>
                        ₹{(breakup.onRoadPrice / 100000).toFixed(2)} L
                      </p>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Features Rows */}
            {displayedFeatures.map((feature, featureIndex) => (
              <div
                key={feature}
                className={cn(
                  "grid border-b border-border/50",
                  featureIndex % 2 === 0 ? "bg-card" : "bg-muted/20"
                )}
                style={{ gridTemplateColumns: `200px repeat(${displayVariants.length}, minmax(160px, 1fr))` }}
              >
                <div className="p-3 text-sm text-foreground sticky left-0 z-10" style={{ backgroundColor: featureIndex % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--muted) / 0.2)' }}>
                  {feature}
                </div>
                {displayVariants.map((variant, variantIndex) => {
                  const hasFeature = variant.features.includes(feature);
                  return (
                    <div key={variantIndex} className="p-3 flex items-center justify-center">
                      {hasFeature ? (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success/10">
                          <Check className="h-4 w-4 text-foreground" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Show More/Less Button */}
        {allFeatures.length > 8 && (
          <div className="p-4 border-t border-border flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullTable(!showFullTable)}
              className="gap-2"
            >
              {showFullTable ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show Less Features
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show All {allFeatures.length} Features
                </>
              )}
            </Button>
          </div>
        )}

        {/* CTA Row */}
        <div className="p-4 bg-muted/30 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm text-muted-foreground">Need help choosing?</p>
              <p className="font-semibold">Talk to our car expert</p>
            </div>
            <a
              href={`https://wa.me/1155578093?text=Hi%20Grabyourcar!%20I%27m%20comparing%20variants%20of%20${encodeURIComponent(carBrand + " " + carName)}.%20Please%20help%20me%20choose%20the%20best%20one.`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="whatsapp" className="gap-2 font-semibold hover:scale-105 transition-transform">
                <MessageCircle className="h-4 w-4" />
                Get Expert Advice
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
