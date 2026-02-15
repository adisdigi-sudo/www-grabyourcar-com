import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Users, Building2, Star, Clock, TrendingUp, Shield } from "lucide-react";

const stats = [
  { icon: Users, value: 50, suffix: "L+", label: "Happy Customers", description: "Insured through our platform" },
  { icon: Building2, value: 20, suffix: "+", label: "Insurance Partners", description: "IRDAI licensed insurers" },
  { icon: TrendingUp, value: 98, suffix: "%", label: "Claim Settlement", description: "Industry-leading ratio" },
  { icon: Clock, value: 2, suffix: " min", label: "Instant Quotes", description: "Compare plans in minutes" },
];

function AnimatedCounter({ value, suffix, isVisible }: { value: number; suffix: string; isVisible: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isVisible, value]);

  return (
    <span className="text-4xl md:text-5xl font-heading font-bold text-foreground leading-none">
      {count}{suffix}
    </span>
  );
}

export function InsuranceStats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 md:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-primary/3" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-chart-4/5 rounded-full blur-[80px] translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground mb-4">
            Numbers that <span className="text-primary">speak trust</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Join lakhs of happy customers who chose smart insurance
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.12 }}
            >
              <div className="bg-card rounded-3xl border border-border/60 p-8 text-center hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.12)] hover:border-primary/30 transition-all duration-500 h-full group">
                <div className="w-16 h-16 rounded-2xl bg-primary/8 group-hover:bg-primary/15 flex items-center justify-center mx-auto mb-5 transition-colors duration-300">
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} isVisible={isInView} />
                <p className="text-base font-semibold text-foreground mt-3">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
