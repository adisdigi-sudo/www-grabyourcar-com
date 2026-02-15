import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Clock, IndianRupee, Percent, CheckCircle, Zap, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";

export const CarLoanHero = () => {
  const scrollToEligibility = () => {
    document.getElementById("eligibility-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden pt-20 pb-20 md:pt-28 md:pb-28">
      {/* Deep gradient background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, hsl(142 70% 20%) 0%, hsl(210 40% 8%) 50%, hsl(210 50% 5%) 100%)",
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 z-[1] opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(hsl(142 70% 45% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(142 70% 45% / 0.4) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full z-[1]"
        style={{
          background: "radial-gradient(circle, hsl(142 70% 45% / 0.15) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="bg-primary/20 text-primary border-primary/30 mb-6 text-sm px-4 py-1.5">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Instant Digital Approval
            </Badge>
          </motion.div>

          <motion.h1
            className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl text-white mb-5 tracking-tight leading-[1.1]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Car Loan Starting{" "}
            <span className="text-primary">8.45% p.a.</span>
            <br />
            <span className="text-white/80 text-3xl md:text-4xl lg:text-5xl">
              Approved in 30 Minutes
            </span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Compare offers from 15+ banks & NBFCs. Check eligibility instantly.
            Get pre-approved without affecting your credit score.
          </motion.p>

          {/* Stats row */}
          <motion.div
            className="flex flex-wrap justify-center gap-8 md:gap-12 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {[
              { icon: Percent, label: "Interest Rate", value: "8.45%" },
              { icon: Clock, label: "Approval", value: "30 min" },
              { icon: IndianRupee, label: "Max Amount", value: "₹1 Crore" },
              { icon: Shield, label: "Partners", value: "15+ Banks" },
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/20 transition-colors">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xl md:text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/50 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              onClick={scrollToEligibility}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-7 rounded-xl font-bold shadow-[0_0_30px_hsl(142_70%_45%/0.4)] hover:shadow-[0_0_40px_hsl(142_70%_45%/0.5)] transition-all"
            >
              Check Your Eligibility
              <ArrowDown className="w-5 h-5 ml-2 animate-bounce" />
            </Button>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            className="mt-12 flex flex-wrap justify-center gap-6 text-white/40 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-primary/60" /> RBI Registered Partners</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-primary/60" /> 256-bit SSL Encrypted</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-primary/60" /> No Impact on Credit Score</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
