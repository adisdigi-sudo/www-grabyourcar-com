import { motion } from "framer-motion";
import { Shield, Car, Zap, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const coverageTypes = [
  {
    icon: Shield,
    title: "Third Party Liability",
    subtitle: "Mandatory by Law",
    price: "₹2,094",
    period: "/year",
    description: "Covers damages to third-party vehicle, property, and injuries as required by law.",
    features: [
      "Third Party Property Damage",
      "Third Party Bodily Injury",
      "Legal Liability Coverage",
      "Court Case Defense",
    ],
    popular: false,
    color: "bg-blue-500",
  },
  {
    icon: Car,
    title: "Comprehensive Cover",
    subtitle: "Most Popular Choice",
    price: "₹4,999",
    period: "/year",
    description: "Complete protection for your car including own damage and third-party liability.",
    features: [
      "Own Damage Protection",
      "Third Party Liability",
      "Fire & Theft Cover",
      "Personal Accident Cover",
      "Natural Calamity Protection",
    ],
    popular: true,
    color: "bg-primary",
  },
  {
    icon: Zap,
    title: "Zero Depreciation",
    subtitle: "Add-on Cover",
    price: "₹1,500",
    period: "/year",
    description: "Get full claim amount without depreciation deduction on parts replacement.",
    features: [
      "No Depreciation Deduction",
      "Full Parts Value",
      "Ideal for New Cars",
      "Maximum Claim Amount",
    ],
    popular: false,
    color: "bg-amber-500",
  },
];

export function InsuranceCoverageCards() {
  return (
    <section className="py-12 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge className="mb-4" variant="secondary">Coverage Options</Badge>
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
            Choose the Right Coverage for Your Car
          </h2>
          <p className="text-muted-foreground">
            From basic mandatory coverage to comprehensive protection with add-ons
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {coverageTypes.map((coverage, index) => (
            <motion.div
              key={coverage.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className={`relative h-full transition-all duration-300 hover:shadow-xl ${
                coverage.popular ? "border-primary shadow-lg scale-[1.02]" : "hover:border-primary/50"
              }`}>
                {coverage.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary shadow-md px-4">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pt-8">
                  <div className={`w-16 h-16 rounded-2xl ${coverage.color} flex items-center justify-center mx-auto mb-4`}>
                    <coverage.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{coverage.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{coverage.subtitle}</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">{coverage.price}</span>
                    <span className="text-muted-foreground">{coverage.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground text-center">
                    {coverage.description}
                  </p>
                  
                  <ul className="space-y-3">
                    {coverage.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full" 
                    variant={coverage.popular ? "default" : "outline"}
                  >
                    Get Quote
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
