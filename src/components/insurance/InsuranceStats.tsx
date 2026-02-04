import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Users, Building2, Star, Clock } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: 50,
    suffix: "L+",
    label: "Customers Insured",
  },
  {
    icon: Building2,
    value: 20,
    suffix: "+",
    label: "Insurance Partners",
  },
  {
    icon: Star,
    value: 98,
    suffix: "%",
    label: "Claim Settlement",
  },
  {
    icon: Clock,
    value: 2,
    suffix: " min",
    label: "Quick Quotes",
  },
];

function AnimatedCounter({ 
  value, 
  suffix, 
  isVisible 
}: { 
  value: number; 
  suffix: string; 
  isVisible: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  return (
    <span className="text-3xl md:text-4xl font-bold text-foreground">
      {count}
      {suffix}
    </span>
  );
}

export function InsuranceStats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-12 md:py-16 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <stat.icon className="h-7 w-7 text-primary" />
              </div>
              <AnimatedCounter
                value={stat.value}
                suffix={stat.suffix}
                isVisible={isInView}
              />
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
