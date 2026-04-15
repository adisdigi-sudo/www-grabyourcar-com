import { motion } from "framer-motion";
import { TrendingUp, Users, Shield, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

const nudges = [
  {
    icon: TrendingUp,
    stat: "78%",
    text: "of buyers choose Zero Depreciation cover",
    highlight: "Most chosen add-on",
    color: "text-chart-2",
    bg: "bg-chart-2/8",
  },
  {
    icon: Users,
    stat: "3 in 4",
    text: "customers upgrade to Comprehensive plans",
    highlight: "Smart upgrade",
    color: "text-chart-1",
    bg: "bg-chart-1/8",
  },
  {
    icon: Shield,
    stat: "₹1,399",
    text: "per month — protect your car with EMI-friendly plans",
    highlight: "EMI available",
    color: "text-primary",
    bg: "bg-primary/8",
  },
];

export function InsuranceSmartNudge() {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
            <Sparkles className="h-4 w-4 text-foreground" />
            What Smart Buyers Choose
          </div>
          <h2 className="text-2xl md:text-4xl font-heading font-bold text-foreground">
            Join the <span className="text-foreground">smart majority</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {nudges.map((nudge, index) => (
            <motion.div
              key={nudge.text}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-card rounded-3xl border border-border/60 p-7 hover:border-primary/30 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.1)] transition-all duration-500 h-full">
                <div className={`w-14 h-14 rounded-2xl ${nudge.bg} flex items-center justify-center mb-5`}>
                  <nudge.icon className={`h-7 w-7 ${nudge.color}`} />
                </div>

                <span className={`text-3xl font-heading font-bold ${nudge.color}`}>{nudge.stat}</span>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{nudge.text}</p>

                <div className="flex items-center gap-1.5 mt-4 text-xs text-foreground font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {nudge.highlight}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
