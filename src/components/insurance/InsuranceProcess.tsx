import { motion } from "framer-motion";
import { Car, FileSearch, Shield, CreditCard, ArrowRight } from "lucide-react";

const steps = [
  { icon: Car, title: "Enter Vehicle Details", description: "Share your car's registration number and basic details", step: 1 },
  { icon: FileSearch, title: "Compare Plans", description: "View quotes from 20+ insurers side by side", step: 2 },
  { icon: Shield, title: "Customize Coverage", description: "Add or remove add-ons based on your needs", step: 3 },
  { icon: CreditCard, title: "Pay & Get Instant Policy", description: "Secure payment and instant policy on your email", step: 4 },
];

export function InsuranceProcess() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,hsl(var(--primary)/0.05),transparent)]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            Get insured in <span className="text-primary">4 simple steps</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Our streamlined process makes buying car insurance quick and hassle-free
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6 md:gap-4 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-16 left-[14%] right-[14%] h-[2px] bg-gradient-to-r from-primary/10 via-primary/40 to-primary/10" />

          {steps.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative text-center group"
            >
              <div className="relative z-10 mx-auto w-24 h-24 rounded-3xl bg-card border-2 border-border/60 group-hover:border-primary/50 flex items-center justify-center mb-6 shadow-lg group-hover:shadow-[0_15px_40px_-10px_hsl(var(--primary)/0.2)] transition-all duration-500">
                <item.icon className="h-10 w-10 text-primary" />
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg ring-4 ring-background">
                  {item.step}
                </div>
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground max-w-[220px] mx-auto leading-relaxed">{item.description}</p>

              {/* Arrow between steps (desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 -right-4 z-20">
                  <ArrowRight className="h-5 w-5 text-primary/40" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
