import { motion } from "framer-motion";
import { Car, FileSearch, Shield, CreditCard } from "lucide-react";

const steps = [
  {
    icon: Car,
    title: "Enter Vehicle Details",
    description: "Share your car's registration number and basic details",
    step: 1,
  },
  {
    icon: FileSearch,
    title: "Compare Plans",
    description: "View quotes from 20+ insurers side by side",
    step: 2,
  },
  {
    icon: Shield,
    title: "Customize Coverage",
    description: "Add or remove add-ons based on your needs",
    step: 3,
  },
  {
    icon: CreditCard,
    title: "Pay & Get Instant Policy",
    description: "Secure payment and instant policy on your email",
    step: 4,
  },
];

export function InsuranceProcess() {
  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
            Get Insured in 4 Simple Steps
          </h2>
          <p className="text-muted-foreground">
            Our streamlined process makes buying car insurance quick and hassle-free
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 md:gap-4 relative">
          {/* Connection line for desktop */}
          <div className="hidden md:block absolute top-14 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
          
          {steps.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative text-center"
            >
              <div className="relative z-10 mx-auto w-20 h-20 rounded-2xl bg-card border-2 border-primary/20 flex items-center justify-center mb-4 shadow-lg group hover:border-primary transition-colors">
                <item.icon className="h-8 w-8 text-primary" />
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md">
                  {item.step}
                </div>
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
