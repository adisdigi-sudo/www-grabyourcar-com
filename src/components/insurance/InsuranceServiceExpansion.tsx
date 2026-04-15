import { motion } from "framer-motion";
import { Shield, Wrench, Car, Cog, CircleDot, Package, ArrowRight } from "lucide-react";

const services = [
  { icon: Shield, title: "Extended Warranty", description: "Protect beyond manufacturer warranty", tag: "Popular", tagColor: "bg-primary/10 text-primary" },
  { icon: Car, title: "Roadside Assistance", description: "24/7 breakdown & towing support", tag: null, tagColor: "" },
  { icon: Cog, title: "Engine Protection", description: "Cover engine & gearbox damage", tag: "Recommended", tagColor: "bg-chart-2/10 text-chart-2" },
  { icon: CircleDot, title: "Tyre Cover", description: "Tyre damage & replacement cover", tag: null, tagColor: "" },
  { icon: Package, title: "Accessories Protection", description: "Safeguard aftermarket additions", tag: null, tagColor: "" },
  { icon: Wrench, title: "Maintenance Package", description: "Scheduled service & parts coverage", tag: "Coming Soon", tagColor: "bg-muted text-muted-foreground" },
];

export function InsuranceServiceExpansion() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,hsl(var(--primary)/0.04),transparent)]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            Complete <span className="text-primary">protection</span> suite
          </h2>
          <p className="text-lg text-muted-foreground">
            Go beyond basic insurance — comprehensive protection for every scenario
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="group cursor-pointer"
            >
              <div className="bg-card rounded-3xl border border-border/60 p-7 h-full hover:border-primary/30 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.1)] transition-all duration-500">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/8 group-hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors duration-300">
                    <service.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-heading font-bold text-base">{service.title}</h3>
                      {service.tag && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${service.tagColor}`}>{service.tag}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                  </div>
                </div>

                {/* Acko-style arrow */}
                <div className="flex justify-end mt-5">
                  <div className="w-9 h-9 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
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
