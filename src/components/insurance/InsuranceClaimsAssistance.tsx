import { motion } from "framer-motion";
import { UserCheck, FileCheck, Zap, Building2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, React.ElementType> = {
  UserCheck, FileCheck, Zap, Building2,
};

const defaultFeatures = [
  {
    title: "Dedicated Claims Manager",
    description: "A personal manager assigned to guide you through the entire claim process",
    icon: "UserCheck",
  },
  {
    title: "Assisted Processing",
    description: "We handle all paperwork, follow-ups, and coordination with the insurer",
    icon: "FileCheck",
  },
  {
    title: "Faster Resolution",
    description: "Average claim settlement in 7 working days — 3x faster than industry average",
    icon: "Zap",
  },
  {
    title: "Cashless Network",
    description: "10,000+ network garages for zero out-of-pocket repairs",
    icon: "Building2",
  },
];

export function InsuranceClaimsAssistance() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-accent/3" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
            <UserCheck className="h-3 w-3 mr-1" />
            Claims Support
          </Badge>
          <h2 className="text-2xl md:text-4xl font-heading font-bold mb-4">
            Claims — We Handle It For You
          </h2>
          <p className="text-muted-foreground text-lg">
            Our dedicated team ensures your claim is processed quickly and hassle-free
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {defaultFeatures.map((feature, index) => {
            const IconComponent = iconMap[feature.icon] || UserCheck;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-card group hover:-translate-y-1">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mx-auto mb-5 transition-colors">
                      <IconComponent className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-heading font-bold text-lg mb-3">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <Card className="max-w-2xl mx-auto border-primary/20 bg-primary/5">
            <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="text-left">
                <h3 className="font-heading font-bold text-lg mb-1">Need Help With a Claim?</h3>
                <p className="text-sm text-muted-foreground">
                  Our claims experts are available Mon-Sat, 9 AM to 8 PM
                </p>
              </div>
              <Button className="gap-2 shrink-0" size="lg">
                Get Claims Help
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
