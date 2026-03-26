import { motion } from "framer-motion";
import { UserCheck, FileCheck, Zap, Building2, ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, React.ElementType> = { UserCheck, FileCheck, Zap, Building2 };

const defaultFeatures = [
  { title: "Dedicated Claims Manager", description: "A personal manager assigned to guide you through the entire claim process", icon: "UserCheck" },
  { title: "Assisted Processing", description: "We handle all paperwork, follow-ups, and coordination with the insurer", icon: "FileCheck" },
  { title: "Faster Resolution", description: "Average claim settlement in 7 working days — 3x faster than industry average", icon: "Zap" },
  { title: "Cashless Network", description: "10,000+ network garages for zero out-of-pocket repairs", icon: "Building2" },
];

export function InsuranceClaimsAssistance() {
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
            Claims? <span className="text-foreground">We handle it</span> for you
          </h2>
          <p className="text-lg text-muted-foreground">
            Our dedicated team ensures your claim is processed quickly and hassle-free
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {defaultFeatures.map((feature, index) => {
            const IconComponent = iconMap[feature.icon] || UserCheck;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <div className="bg-card rounded-3xl border border-border/60 p-7 text-center h-full hover:border-primary/30 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.12)] transition-all duration-500">
                  <div className="w-16 h-16 rounded-2xl bg-primary/8 group-hover:bg-primary/15 flex items-center justify-center mx-auto mb-5 transition-colors duration-300">
                    <IconComponent className="h-8 w-8 text-foreground" />
                  </div>
                  <h3 className="font-heading font-bold text-lg mb-3">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Help CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-card rounded-3xl border border-primary/20 p-8 flex flex-col sm:flex-row items-center gap-5 justify-between">
            <div>
              <h3 className="font-heading font-bold text-lg mb-1">Need help with a claim?</h3>
              <p className="text-sm text-muted-foreground">Our claims experts are available Mon-Sat, 9 AM to 8 PM</p>
            </div>
            <a href="tel:+1155578093">
              <Button className="gap-2 shrink-0 rounded-xl h-12 px-6 font-bold" size="lg">
                <Phone className="h-5 w-5" />
                Get Claims Help
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
