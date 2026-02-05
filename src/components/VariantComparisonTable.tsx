import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Check, X, ChevronDown, ChevronUp, Fuel, Cog, IndianRupee, MessageCircle } from "lucide-react";
import { CarVariant } from "@/data/cars/types";
import { calculateStatePriceBreakup } from "@/data/statePricing";
import { cn } from "@/lib/utils";

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

  // Extract all unique features across all variants
  const allFeatures = [...new Set(variants.flatMap((v) => v.features))];

  // Group features for display (show top 8 initially)
  const displayedFeatures = showFullTable ? allFeatures : allFeatures.slice(0, 8);

  // Parse price from variant
  const getNumericPrice = (variant: CarVariant): number => {
    if (variant.priceNumeric) return variant.priceNumeric;
    const match = variant.price.match(/[\d.]+/);
    return match ? parseFloat(match[0]) * 100000 : 0;
  };

  // Calculate price difference from base variant
  const basePrice = getNumericPrice(variants[0]);

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
              <IndianRupee className="h-5 w-5 text-primary" />
              Variant Comparison
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Compare {variants.length} variants of {carBrand} {carName}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {variants.length} Variants
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            {/* Header Row - Variant Names */}
            <div className="grid border-b border-border bg-muted/50" style={{ gridTemplateColumns: `200px repeat(${variants.length}, minmax(160px, 1fr))` }}>
              <div className="p-4 font-semibold text-sm text-muted-foreground sticky left-0 bg-muted/50 z-10">
                Feature
              </div>
              {variants.map((variant, index) => (
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
            <div className="grid border-b border-border bg-gradient-to-r from-primary/5 to-success/5" style={{ gridTemplateColumns: `200px repeat(${variants.length}, minmax(160px, 1fr))` }}>
              <div className="p-4 font-semibold text-sm text-foreground sticky left-0 bg-gradient-to-r from-primary/5 to-transparent z-10">
                Ex-Showroom Price
              </div>
              {variants.map((variant, index) => {
                const price = getNumericPrice(variant);
                return (
                  <div key={index} className="p-4 text-center">
                    <p className="font-bold text-lg text-primary">{variant.price}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      formatPriceDiff(price) === "Base" ? "text-muted-foreground" : "text-success font-medium"
                    )}>
                      {formatPriceDiff(price)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* On-Road Price Row */}
            <div className="grid border-b border-border" style={{ gridTemplateColumns: `200px repeat(${variants.length}, minmax(160px, 1fr))` }}>
              <div className="p-4 font-semibold text-sm text-foreground sticky left-0 bg-card z-10">
                On-Road Price (Delhi)
              </div>
              {variants.map((variant, index) => {
                const price = getNumericPrice(variant);
                const breakup = calculateStatePriceBreakup(price);
                return (
                  <div key={index} className="p-4 text-center">
                    <p className="font-bold text-base text-success">
                      ₹{(breakup.onRoadPrice / 100000).toFixed(2)} L
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Features Rows */}
            {displayedFeatures.map((feature, featureIndex) => (
              <div
                key={feature}
                className={cn(
                  "grid border-b border-border/50",
                  featureIndex % 2 === 0 ? "bg-card" : "bg-muted/20"
                )}
                style={{ gridTemplateColumns: `200px repeat(${variants.length}, minmax(160px, 1fr))` }}
              >
                <div className="p-3 text-sm text-foreground sticky left-0 z-10" style={{ backgroundColor: featureIndex % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--muted) / 0.2)' }}>
                  {feature}
                </div>
                {variants.map((variant, variantIndex) => {
                  const hasFeature = variant.features.includes(feature);
                  return (
                    <div key={variantIndex} className="p-3 flex items-center justify-center">
                      {hasFeature ? (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success/10">
                          <Check className="h-4 w-4 text-success" />
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
              href={`https://wa.me/919577200023?text=Hi%20Grabyourcar!%20I%27m%20comparing%20variants%20of%20${encodeURIComponent(carBrand + " " + carName)}.%20Please%20help%20me%20choose%20the%20best%20one.`}
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
