import { motion } from "framer-motion";
import { Shield, Wrench, Car, Cog, CircleDot, Package, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Shield,
    title: "Extended Warranty",
    description: "Protect beyond manufacturer warranty",
    tag: "Popular",
  },
  {
    icon: Car,
    title: "Roadside Assistance",
    description: "24/7 breakdown & towing support",
    tag: null,
  },
  {
    icon: Cog,
    title: "Engine Protection",
    description: "Cover engine & gearbox damage",
    tag: "Recommended",
  },
  {
    icon: CircleDot,
    title: "Tyre Cover",
    description: "Tyre damage & replacement cover",
    tag: null,
  },
  {
    icon: Package,
    title: "Accessories Protection",
    description: "Safeguard aftermarket additions",
    tag: null,
  },
  {
    icon: Wrench,
    title: "Maintenance Package",
    description: "Scheduled service & parts coverage",
    tag: "Coming Soon",
  },
];

export function InsuranceServiceExpansion() {
  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge className="mb-4" variant="secondary">
            <Package className="h-3 w-3 mr-1" />
            Add-On Protection
          </Badge>
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
            Complete Protection Suite
          </h2>
          <p className="text-muted-foreground">
            Go beyond basic insurance — comprehensive protection for every scenario
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all group cursor-pointer">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-semibold">{service.title}</h3>
                      {service.tag && (
                        <Badge variant={service.tag === "Coming Soon" ? "outline" : "secondary"} className="text-[10px] px-2 py-0">
                          {service.tag}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
