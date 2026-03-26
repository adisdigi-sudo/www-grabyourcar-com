import { motion } from "framer-motion";
import { Shield, Car, Zap, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const coverageTypes = [
  {
    icon: Shield,
    title: "Third Party Liability",
    subtitle: "Mandatory by Law",
    price: "₹2,094",
    period: "/year",
    highlight: "Starting at just ₹2,094*",
    description: "Covers damages to third-party vehicle, property, and injuries as required by law.",
    features: ["Third Party Property Damage", "Third Party Bodily Injury", "Legal Liability Coverage", "Court Case Defense"],
    popular: false,
  },
  {
    icon: Car,
    title: "Comprehensive Cover",
    subtitle: "Most Popular Choice",
    price: "₹4,999",
    period: "/year",
    highlight: "Save up to ₹36,000",
    description: "Complete protection for your car including own damage and third-party liability.",
    features: ["Own Damage Protection", "Third Party Liability", "Fire & Theft Cover", "Personal Accident Cover", "Natural Calamity Protection"],
    popular: true,
  },
  {
    icon: Zap,
    title: "Zero Depreciation",
    subtitle: "Bumper-to-Bumper",
    price: "₹1,500",
    period: "/year add-on",
    highlight: "100% claim value",
    description: "Get full claim amount without depreciation deduction on parts replacement.",
    features: ["No Depreciation Deduction", "Full Parts Value", "Ideal for New Cars", "Maximum Claim Amount"],
    popular: false,
  },
];

export function InsuranceCoverageCards() {
  return (
    <section className="py-20 md:py-28 bg-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.04),transparent)]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            Choose the right <span className="text-foreground">coverage</span> for your car
          </h2>
          <p className="text-lg text-muted-foreground">
            From basic mandatory coverage to comprehensive protection with add-ons
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {coverageTypes.map((coverage, index) => (
            <motion.div
              key={coverage.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className="group"
            >
              <div className={`relative bg-card rounded-3xl border-2 h-full flex flex-col transition-all duration-500 overflow-hidden ${
                coverage.popular
                  ? "border-primary shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.2)] scale-[1.02]"
                  : "border-border/60 hover:border-primary/40 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.1)]"
              }`}>
                {/* Popular badge */}
                {coverage.popular && (
                  <div className="bg-primary text-primary-foreground text-center py-2 text-xs font-bold tracking-wider uppercase">
                    Most Popular
                  </div>
                )}

                <div className="p-8 flex flex-col flex-1">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                    coverage.popular ? "bg-primary/15" : "bg-primary/8"
                  }`}>
                    <coverage.icon className="h-8 w-8 text-foreground" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-heading font-bold text-foreground mb-1">{coverage.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{coverage.subtitle}</p>

                  {/* Highlight */}
                  <div className="flex items-center gap-2 mb-6">
                    <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                    <span className="text-sm font-semibold text-foreground">{coverage.highlight}</span>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-heading font-bold text-foreground">{coverage.price}</span>
                    <span className="text-muted-foreground text-sm ml-1">{coverage.period}</span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{coverage.description}</p>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {coverage.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-foreground mt-0.5 shrink-0" />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA — Acko-style arrow button */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/40">
                    <span className="text-sm font-semibold text-foreground">Get Quote</span>
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      coverage.popular
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground text-muted-foreground"
                    }`}>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
