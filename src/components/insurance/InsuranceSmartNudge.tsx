import { motion } from "framer-motion";
import { TrendingUp, Users, Shield, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const nudges = [
  {
    icon: TrendingUp,
    stat: "78%",
    text: "of buyers choose Zero Depreciation cover",
    color: "text-chart-2",
  },
  {
    icon: Users,
    stat: "3 in 4",
    text: "customers upgrade to Comprehensive plans",
    color: "text-chart-1",
  },
  {
    icon: Shield,
    stat: "₹1,399",
    text: "per month — protect your car with EMI-friendly plans",
    color: "text-primary",
  },
];

export function InsuranceSmartNudge() {
  return (
    <section className="py-10 bg-gradient-to-r from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            What Smart Buyers Choose
          </span>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {nudges.map((nudge, index) => (
            <motion.div
              key={nudge.text}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex items-center gap-4 bg-card rounded-xl p-5 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <nudge.icon className={`h-6 w-6 ${nudge.color}`} />
              </div>
              <div>
                <span className={`text-2xl font-bold ${nudge.color}`}>{nudge.stat}</span>
                <p className="text-sm text-muted-foreground mt-0.5">{nudge.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
