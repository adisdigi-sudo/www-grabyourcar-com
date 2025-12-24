import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PriceBreakup as PriceBreakupType, calculatePriceBreakup } from "@/data/cars/types";
import { IndianRupee, FileText, Shield, Car, CreditCard, Tag, Truck } from "lucide-react";

interface PriceBreakupProps {
  variantName: string;
  carName: string;
  priceBreakup?: PriceBreakupType;
  exShowroomPrice?: number;
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

export const PriceBreakup = ({ variantName, carName, priceBreakup, exShowroomPrice }: PriceBreakupProps) => {
  // Calculate breakup if not provided but exShowroomPrice is available
  const breakup = priceBreakup || (exShowroomPrice ? calculatePriceBreakup(exShowroomPrice) : null);
  
  if (!breakup) {
    return null;
  }

  const priceItems = [
    { label: "Ex-Showroom Price", value: breakup.exShowroom, icon: Car, description: "Base price of the vehicle" },
    { label: "RTO & Road Tax", value: breakup.rto, icon: FileText, description: "Registration charges" },
    { label: "Insurance (1 Year)", value: breakup.insurance, icon: Shield, description: "Comprehensive insurance" },
    ...(breakup.tcs > 0 ? [{ label: "TCS (1%)", value: breakup.tcs, icon: CreditCard, description: "Tax Collected at Source" }] : []),
    { label: "FASTag", value: breakup.fastag, icon: Tag, description: "Mandatory FASTag" },
    { label: "Registration", value: breakup.registration, icon: FileText, description: "Number plate charges" },
    { label: "Handling & Logistics", value: breakup.handling, icon: Truck, description: "Dealer handling charges" },
  ];

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {carName} {variantName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">On-Road Price Breakup (Delhi)</p>
          </div>
          <Badge variant="outline" className="text-primary border-primary">
            <IndianRupee className="h-3 w-3 mr-1" />
            Price Details
          </Badge>
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
              <p className="text-xs text-muted-foreground">Estimated price in Delhi</p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-bold text-2xl text-primary">{formatPrice(breakup.onRoadPrice)}</span>
            <p className="text-xs text-muted-foreground">{formatPriceExact(breakup.onRoadPrice)}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          * Prices are indicative and may vary based on location, accessories, and current offers
        </p>
      </CardContent>
    </Card>
  );
};

export default PriceBreakup;
