import { motion } from "framer-motion";
import { Star, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const insurers = [
  { id: 1, name: "HDFC ERGO", rating: 4.5, reviews: "12.5K", claimRatio: "98%", premium: "₹4,999", cashlessGarages: "10,500+", highlight: "Best Overall", features: ["24x7 Roadside Assistance", "Zero Depreciation", "NCB Protection"] },
  { id: 2, name: "ICICI Lombard", rating: 4.4, reviews: "10.2K", claimRatio: "97%", premium: "₹5,199", cashlessGarages: "8,500+", highlight: "Fast Claims", features: ["Instant Policy", "Personal Accident Cover", "Engine Protection"] },
  { id: 3, name: "Bajaj Allianz", rating: 4.3, reviews: "8.7K", claimRatio: "96%", premium: "₹4,799", cashlessGarages: "7,000+", highlight: "Best Price", features: ["Consumables Cover", "Return to Invoice", "Key Replacement"] },
  { id: 4, name: "Tata AIG", rating: 4.2, reviews: "6.3K", claimRatio: "95%", premium: "₹5,399", cashlessGarages: "6,500+", highlight: "Wide Network", features: ["Tyre Protection", "EMI Protection", "Daily Allowance"] },
];

export function InsuranceComparison() {
  return (
    <section id="insurance-comparison" className="py-20 md:py-28 bg-muted/20 scroll-mt-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.04),transparent)]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            Top insurance <span className="text-primary">providers</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Compare quotes from India's leading car insurance companies
          </p>
        </motion.div>

        <div className="grid gap-5 max-w-4xl mx-auto">
          {insurers.map((insurer, index) => (
            <motion.div
              key={insurer.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-card rounded-3xl border border-border/60 hover:border-primary/40 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.12)] transition-all duration-500 overflow-hidden">
                <div className="p-7 md:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-heading font-bold">{insurer.name}</h3>
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">{insurer.highlight}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-chart-4 text-chart-4" />
                          <span className="font-semibold">{insurer.rating}</span>
                          <span className="text-muted-foreground">({insurer.reviews})</span>
                        </div>
                        <span className="text-border">|</span>
                        <span className="text-muted-foreground">
                          <span className="font-semibold text-primary">{insurer.claimRatio}</span> claims
                        </span>
                        <span className="text-border">|</span>
                        <span className="text-muted-foreground">
                          <span className="font-medium">{insurer.cashlessGarages}</span> garages
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-0.5">Starting from</p>
                      <p className="text-3xl font-heading font-bold text-primary">{insurer.premium}</p>
                      <p className="text-xs text-muted-foreground">per year</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-5">
                    {insurer.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-1.5 text-sm bg-muted/50 px-3 py-1.5 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Acko-style bottom action */}
                  <div className="flex items-center justify-between pt-5 border-t border-border/40">
                    <span className="text-sm font-semibold text-foreground">Get Quote</span>
                    <div className="w-10 h-10 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Button variant="outline" size="lg" className="rounded-2xl h-12 px-8 font-bold gap-2">
            View All 20+ Insurers
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
