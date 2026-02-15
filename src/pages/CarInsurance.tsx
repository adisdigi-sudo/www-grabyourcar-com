import { motion } from "framer-motion";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Sparkles, Shield, Star, CheckCircle2, Award, TrendingUp } from "lucide-react";
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
import insuranceHeroBg from "@/assets/insurance-hero-bg.jpg";

const CarInsurance = () => {
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
        {/* ===== HERO — Rich cinematic background ===== */}
        <section className="relative overflow-hidden min-h-[85vh] flex items-center">
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src={insuranceHeroBg}
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Overlays for depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))]/95 via-[hsl(var(--primary))]/80 to-[hsl(var(--primary))]/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--primary))]/90 via-transparent to-[hsl(var(--primary))]/40" />
          </div>

          {/* Animated particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.1, 0.3, 0.1],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.7 }}
                className="absolute w-2 h-2 bg-primary-foreground/20 rounded-full"
                style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
              />
            ))}
          </div>

          {/* Decorative golden line accents */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-chart-4/50 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent" />

          <div className="container mx-auto px-4 relative z-10 py-20 md:py-28">
            <div className="max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
              >
                {/* Floating badge */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-xl rounded-full px-5 py-2 mb-6 border border-chart-4/30 shadow-[0_0_30px_hsl(var(--chart-4)/0.15)]"
                >
                  <span className="w-2 h-2 bg-chart-2 rounded-full animate-pulse" />
                  <span className="text-sm text-primary-foreground/90 font-medium">
                    2,847 policies sold today
                  </span>
                  <Award className="h-4 w-4 text-chart-4" />
                </motion.div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-bold text-primary-foreground mb-5 leading-[1.05] tracking-tight">
                  Car Insurance
                  <motion.span
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="block text-chart-4 text-3xl md:text-4xl lg:text-5xl font-medium mt-2"
                  >
                    Made Effortless.
                  </motion.span>
                </h1>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-primary-foreground/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-primary-foreground/15"
                  >
                    <p className="text-lg md:text-xl text-primary-foreground font-bold">
                      Starting at ₹2,094<span className="text-sm font-normal text-primary-foreground/60">*/year</span>
                    </p>
                  </motion.div>

                  <div className="flex items-center gap-3 text-primary-foreground/70 text-sm">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-chart-2" />
                      <span>Save up to 85%</span>
                    </div>
                    <div className="w-1 h-1 bg-primary-foreground/30 rounded-full" />
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-chart-4" />
                      <span>20+ Insurers</span>
                    </div>
                    <div className="w-1 h-1 bg-primary-foreground/30 rounded-full" />
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-chart-1" />
                      <span>Instant Policy</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <InsuranceHeroForm />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-6 text-xs text-primary-foreground/35"
              >
                *T&Cs Apply. Prices vary by vehicle, city, and insurer. IRDAI Licensed.
              </motion.p>
            </div>

            {/* Floating trust indicators on the right */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="hidden xl:flex flex-col gap-4 absolute right-8 top-1/2 -translate-y-1/2"
            >
              {[
                { icon: Shield, label: "IRDAI Licensed", value: "100% Secure" },
                { icon: TrendingUp, label: "Claim Settlement", value: "98.3%" },
                { icon: Star, label: "Customer Rating", value: "4.8/5" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.2 }}
                  className="bg-primary-foreground/8 backdrop-blur-xl rounded-2xl px-5 py-4 border border-primary-foreground/10 min-w-[180px] hover:bg-primary-foreground/12 transition-colors"
                >
                  <item.icon className="h-5 w-5 text-chart-4 mb-2" />
                  <p className="text-xl font-bold text-primary-foreground">{item.value}</p>
                  <p className="text-xs text-primary-foreground/50">{item.label}</p>
                </motion.div>
              ))}
            </motion.div>
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
