import { motion } from "framer-motion";
import { Star, CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const insurers = [
  {
    id: 1,
    name: "HDFC ERGO",
    rating: 4.5,
    reviews: "12.5K",
    claimRatio: "98%",
    premium: "₹4,999",
    cashlessGarages: "10,500+",
    highlight: "Best Overall",
    features: ["24x7 Roadside Assistance", "Zero Depreciation", "NCB Protection"],
  },
  {
    id: 2,
    name: "ICICI Lombard",
    rating: 4.4,
    reviews: "10.2K",
    claimRatio: "97%",
    premium: "₹5,199",
    cashlessGarages: "8,500+",
    highlight: "Fast Claims",
    features: ["Instant Policy", "Personal Accident Cover", "Engine Protection"],
  },
  {
    id: 3,
    name: "Bajaj Allianz",
    rating: 4.3,
    reviews: "8.7K",
    claimRatio: "96%",
    premium: "₹4,799",
    cashlessGarages: "7,000+",
    highlight: "Best Price",
    features: ["Consumables Cover", "Return to Invoice", "Key Replacement"],
  },
  {
    id: 4,
    name: "Tata AIG",
    rating: 4.2,
    reviews: "6.3K",
    claimRatio: "95%",
    premium: "₹5,399",
    cashlessGarages: "6,500+",
    highlight: "Wide Network",
    features: ["Tyre Protection", "EMI Protection", "Daily Allowance"],
  },
];

export function InsuranceComparison() {
  return (
    <section id="insurance-comparison" className="py-12 md:py-20 scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge className="mb-4" variant="secondary">Compare & Save</Badge>
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
            Top Insurance Providers
          </h2>
          <p className="text-muted-foreground">
            Compare quotes from India's leading car insurance companies
          </p>
        </div>

        <div className="grid gap-4">
          {insurers.map((insurer, index) => (
            <motion.div
              key={insurer.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-all hover:border-primary/50">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-[1fr,auto] gap-4">
                    {/* Main content */}
                    <div className="p-5 md:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-heading font-bold">{insurer.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {insurer.highlight}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{insurer.rating}</span>
                              <span className="text-muted-foreground">
                                ({insurer.reviews} reviews)
                              </span>
                            </div>
                            <span className="text-muted-foreground">|</span>
                            <span>
                              <span className="font-medium text-primary">{insurer.claimRatio}</span>{" "}
                              claim settlement
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Starting from</p>
                          <p className="text-2xl font-bold text-primary">{insurer.premium}</p>
                          <p className="text-xs text-muted-foreground">per year</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {insurer.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-1.5 text-sm bg-muted/50 px-3 py-1.5 rounded-full">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            {feature}
                          </div>
                        ))}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">{insurer.cashlessGarages}</span> cashless garages across India
                      </p>
                    </div>

                    {/* Action column */}
                    <div className="flex md:flex-col items-center justify-end gap-3 p-4 md:p-6 bg-muted/30 md:border-l">
                      <Button className="w-full md:w-auto min-w-[140px]">
                        Get Quote
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs gap-1">
                        View Details
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            View All 20+ Insurers
          </Button>
        </div>
      </div>
    </section>
  );
}
