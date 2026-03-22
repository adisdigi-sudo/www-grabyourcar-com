import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Building2, Briefcase, Crown } from "lucide-react";

const tiers = [
  {
    name: "Standard",
    range: "1 – 4 Vehicles",
    icon: Briefcase,
    discount: "0%",
    color: "border-border",
    features: [
      "Standard corporate pricing",
      "Dedicated sales executive",
      "Priority delivery",
      "Basic after-sales support",
    ],
  },
  {
    name: "Business",
    range: "5 – 19 Vehicles",
    icon: Building2,
    discount: "Up to 10%",
    color: "border-primary/40 ring-1 ring-primary/20",
    popular: true,
    features: [
      "10% volume discount",
      "Dedicated account manager",
      "Fast-track RTO & registration",
      "Comprehensive insurance bundling",
      "Flexible payment terms",
      "Quarterly fleet health reports",
    ],
  },
  {
    name: "Enterprise",
    range: "20+ Vehicles",
    icon: Crown,
    discount: "Up to 15%",
    color: "border-amber-500/40 bg-amber-500/5",
    features: [
      "15% volume discount + custom negotiation",
      "Senior account director",
      "Lease/Buy/Subscribe flexibility",
      "Fleet management dashboard",
      "Insurance bundling with group discount",
      "Vehicle swap & replacement guarantee",
      "Custom branding options",
      "24/7 priority roadside assistance",
    ],
  },
];

export const CorporatePricingTiers = () => (
  <section className="py-16 md:py-20">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Corporate Pricing</Badge>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Volume-Based Pricing Tiers
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          The more vehicles you procure, the better the deal. All tiers include dedicated support and priority processing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <Card key={tier.name} className={`relative overflow-hidden ${tier.color}`}>
              {tier.popular && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground text-xs">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground">{tier.range}</p>
                  </div>
                </div>

                <div className="text-center py-3 rounded-lg bg-muted/50">
                  <span className="text-2xl font-bold text-primary">{tier.discount}</span>
                  <p className="text-xs text-muted-foreground">Volume Discount</p>
                </div>

                <ul className="space-y-2.5">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  </section>
);
