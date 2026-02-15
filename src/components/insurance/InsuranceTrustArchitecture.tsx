import { motion } from "framer-motion";
import { Shield, Building2, Headphones, Lock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, React.ElementType> = {
  Shield, Building2, Headphones, Lock,
};

const trustBadges = [
  {
    title: "Authorised Insurance Partner Network",
    description: "Licensed aggregator working with IRDAI-approved insurers",
    icon: "Shield",
  },
  {
    title: "Trusted by Leading Corporates",
    description: "Fleet insurance partner for 100+ businesses across India",
    icon: "Building2",
  },
  {
    title: "Dedicated Support Team",
    description: "Expert advisors available Mon-Sat, 9 AM to 8 PM",
    icon: "Headphones",
  },
  {
    title: "Secure & Compliant",
    description: "Bank-grade encryption and full regulatory compliance",
    icon: "Lock",
  },
];

const compliancePoints = [
  "All policies issued by IRDAI-licensed insurers",
  "Grabyourcar facilitates comparison — we do not underwrite policies",
  "Your data is encrypted and never shared without consent",
  "Transparent pricing with zero hidden charges",
];

export function InsuranceTrustArchitecture() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge className="mb-4" variant="secondary">
            <Shield className="h-3 w-3 mr-1" />
            Trust & Compliance
          </Badge>
          <h2 className="text-2xl md:text-4xl font-heading font-bold mb-4">
            Why India Trusts Grabyourcar for Insurance
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {trustBadges.map((badge, index) => {
            const IconComponent = iconMap[badge.icon] || Shield;
            return (
              <motion.div
                key={badge.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="h-full text-center hover:shadow-lg transition-all hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold text-base mb-2">{badge.title}</h3>
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Compliance Disclosure */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="max-w-3xl mx-auto border-border/50 bg-card">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start gap-3 mb-4">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <h3 className="font-heading font-bold text-base">Regulatory Disclosure</h3>
              </div>
              <ul className="space-y-3">
                {compliancePoints.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
