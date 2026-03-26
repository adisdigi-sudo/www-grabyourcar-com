import { motion } from "framer-motion";
import { Shield, Building2, Headphones, Lock, CheckCircle2 } from "lucide-react";

const iconMap: Record<string, React.ElementType> = { Shield, Building2, Headphones, Lock };

const trustBadges = [
  { title: "Authorised Insurance Partner Network", description: "Licensed aggregator working with IRDAI-approved insurers", icon: "Shield" },
  { title: "Trusted by Leading Corporates", description: "Fleet insurance partner for 100+ businesses across India", icon: "Building2" },
  { title: "Dedicated Support Team", description: "Expert advisors available Mon-Sat, 9 AM to 8 PM", icon: "Headphones" },
  { title: "Secure & Compliant", description: "Bank-grade encryption and full regulatory compliance", icon: "Lock" },
];

const compliancePoints = [
  "All policies issued by IRDAI-licensed insurers",
  "Grabyourcar facilitates comparison — we do not underwrite policies",
  "Your data is encrypted and never shared without consent",
  "Transparent pricing with zero hidden charges",
];

export function InsuranceTrustArchitecture() {
  return (
    <section className="py-20 md:py-28 bg-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.04),transparent)]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            Why India <span className="text-foreground">trusts</span> GrabYourCar
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
          {trustBadges.map((badge, index) => {
            const IconComponent = iconMap[badge.icon] || Shield;
            return (
              <motion.div
                key={badge.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group"
              >
                <div className="bg-card rounded-3xl border border-border/60 p-7 text-center h-full hover:border-primary/30 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.1)] transition-all duration-500">
                  <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
                    <IconComponent className="h-8 w-8 text-foreground" />
                  </div>
                  <h3 className="font-heading font-semibold text-base mb-2">{badge.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{badge.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Compliance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-card rounded-3xl border border-border/60 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="font-heading font-bold text-lg">Regulatory Disclosure</h3>
            </div>
            <ul className="space-y-4">
              {compliancePoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
