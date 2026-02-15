import { motion } from "framer-motion";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Sparkles, Shield, Star, CheckCircle2, Award, TrendingUp, Zap, Wallet } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CrossSellWidget } from "@/components/CrossSellWidget";
import {
  InsuranceHeroForm,
  InsurancePartnerLogos,
  InsuranceStats,
  InsuranceProcess,
  InsuranceCoverageCards,
  InsuranceSmartNudge,
  InsuranceComparison,
  InsuranceClaimsAssistance,
  InsuranceTrustArchitecture,
  InsuranceServiceExpansion,
  InsuranceFAQ,
  InsuranceCTA,
} from "@/components/insurance";
import { InsuranceContentSection } from "@/components/insurance/InsuranceContentSection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, React.ComponentType<any>> = {
  Shield, TrendingUp, Zap, Wallet, Star, Award, Sparkles, CheckCircle2,
};

const defaultExpertise = [
  { icon: "Shield", title: "20+ Trusted Insurers", description: "Compare plans from HDFC ERGO, ICICI Lombard, Bajaj Allianz & more top-rated providers", stat: "20+", stat_label: "Partners" },
  { icon: "TrendingUp", title: "98.3% Claim Settlement", description: "Industry-leading claim approval rate with dedicated assistance throughout the process", stat: "98.3%", stat_label: "Settlement" },
  { icon: "Zap", title: "Instant Digital Policy", description: "Get your policy issued in under 2 minutes with zero paperwork and instant confirmation", stat: "2 Min", stat_label: "Issuance" },
  { icon: "Wallet", title: "Save Up To 85%", description: "Lowest premiums guaranteed with exclusive online discounts and no-claim bonuses", stat: "85%", stat_label: "Savings" },
];

const CarInsurance = () => {
  const { data: expertiseData } = useQuery({
    queryKey: ["insurance-hero-expertise"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_content")
        .select("section_data")
        .eq("section_key", "hero_expertise")
        .eq("is_active", true)
        .single();
      return (data?.section_data as any)?.columns || null;
    },
  });

  const expertise = expertiseData || defaultExpertise;

  return (
    <>
      <GlobalSEO
        pageKey="car_insurance"
        title="Car Insurance | Compare & Save Up to 80% on Premium | GrabYourCar"
        description="Compare car insurance quotes from 20+ top insurers including HDFC ERGO, ICICI Lombard, Bajaj Allianz. Get instant policy with 98% claim settlement. Save up to 80% on premium."
        path="/car-insurance"
      />

      <Header />

      <main className="min-h-screen">
        {/* ===== HERO — Theme-matched design ===== */}
        <section className="relative overflow-hidden bg-primary">
          {/* Gradient overlays using theme */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary-glow)/0.3),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.8),transparent_50%)]" />

          {/* Subtle dot pattern */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, hsl(var(--primary-foreground)) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

          <div className="container mx-auto px-4 relative z-10 py-10 md:py-16 lg:py-20">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">
              {/* Left content */}
              <div className="max-w-xl">
                {/* Authorised Partner Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2.5 bg-primary-foreground/10 backdrop-blur-md rounded-full px-4 py-2 mb-6 border border-primary-foreground/20"
                >
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-primary-foreground" />
                    <span className="text-xs font-bold text-primary-foreground tracking-wide uppercase">Authorised Channel Partner</span>
                  </div>
                  <div className="w-px h-4 bg-primary-foreground/30" />
                  <span className="text-xs font-bold text-chart-4">PolicyBazaar</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-primary-foreground mb-3 leading-[1.1] tracking-tight">
                    Car Insurance
                  </h1>
                  <p className="text-xl md:text-2xl text-primary-foreground/90 font-medium mb-2">
                    Car insurance price starting at just <span className="text-chart-4 font-bold">₹2,094</span>*
                  </p>
                  <p className="text-base md:text-lg text-primary-foreground/70 mb-8 flex items-center gap-2">
                    Buy or Renew Car Insurance Online in 2 Minutes
                    <Sparkles className="h-5 w-5 text-chart-4" />
                  </p>
                </motion.div>

                {/* Hero Form */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <InsuranceHeroForm />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-4 flex items-center gap-4 text-xs text-primary-foreground/40"
                >
                  <span>IRDAI Licensed</span>
                  <span>•</span>
                  <span>*T&Cs Apply</span>
                </motion.div>
              </div>

              {/* Right side — 4 Expertise Columns */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="grid grid-cols-2 gap-4"
              >
                {expertise.map((item: any, index: number) => {
                  const IconComp = iconMap[item.icon] || Shield;
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.12, duration: 0.5 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="group relative bg-primary-foreground/8 backdrop-blur-xl rounded-2xl p-5 border border-primary-foreground/10 hover:bg-primary-foreground/14 hover:border-primary-foreground/25 transition-all duration-300 overflow-hidden"
                    >
                      {/* Glow accent */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-primary-foreground/5 rounded-full blur-2xl group-hover:bg-chart-4/10 transition-colors" />

                      {/* Icon */}
                      <div className="w-11 h-11 rounded-xl bg-primary-foreground/10 group-hover:bg-chart-4/20 flex items-center justify-center mb-4 transition-colors relative z-10">
                        <IconComp className="h-5 w-5 text-chart-4" />
                      </div>

                      {/* Stat */}
                      <div className="mb-2 relative z-10">
                        <span className="text-2xl md:text-3xl font-heading font-bold text-primary-foreground leading-none">{item.stat}</span>
                        <span className="text-[10px] text-primary-foreground/40 ml-1.5 uppercase tracking-wider">{item.stat_label}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-primary-foreground mb-1.5 leading-tight relative z-10">{item.title}</h3>

                      {/* Description */}
                      <p className="text-[11px] leading-relaxed text-primary-foreground/50 relative z-10">{item.description}</p>

                      {/* Bottom accent line */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-chart-4/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>

          {/* Bottom wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 60L48 52C96 44 192 28 288 22C384 16 480 20 576 26C672 32 768 40 864 42C960 44 1056 40 1152 34C1248 28 1344 20 1392 16L1440 12V60H0Z" fill="hsl(var(--background))" />
            </svg>
          </div>
        </section>

        {/* Partner Company Cards — Premium showcase */}
        <InsurancePartnerLogos />

        {/* Stats Section */}
        <InsuranceStats />

        {/* Smart Behavioral Nudges */}
        <InsuranceSmartNudge />

        {/* Content: What is Car Insurance + Key Features */}
        <InsuranceContentSection />

        {/* Process Steps */}
        <InsuranceProcess />

        {/* Coverage Types */}
        <InsuranceCoverageCards />

        {/* Provider Comparison */}
        <InsuranceComparison />

        {/* Claims Assistance */}
        <InsuranceClaimsAssistance />

        {/* Add-On Protection Suite */}
        <InsuranceServiceExpansion />

        {/* Trust Architecture */}
        <InsuranceTrustArchitecture />

        {/* FAQ Section */}
        <InsuranceFAQ />

        {/* Cross-Sell */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <CrossSellWidget
              context="insurance"
              title="You May Also Need"
              maxItems={3}
            />
          </div>
        </section>

        {/* CTA Section */}
        <InsuranceCTA />
      </main>

      <Footer />
    </>
  );
};

export default CarInsurance;
