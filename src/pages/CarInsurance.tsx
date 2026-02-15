import { motion } from "framer-motion";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Sparkles } from "lucide-react";
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
        {/* ===== HERO — Deep gradient with Acko-style layout ===== */}
        <section className="relative overflow-hidden bg-primary pt-14 pb-24 md:pt-20 md:pb-32">
          {/* Animated decorative orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-primary-foreground rounded-full blur-3xl"
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.08, 0.03] }}
              transition={{ duration: 10, repeat: Infinity, delay: 2 }}
              className="absolute bottom-0 -left-20 w-[500px] h-[500px] bg-primary-foreground rounded-full blur-3xl"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/75" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-md rounded-full px-4 py-1.5 mb-6 border border-primary-foreground/20">
                  <span className="w-2 h-2 bg-chart-2 rounded-full animate-pulse" />
                  <span className="text-sm text-primary-foreground/90 font-medium">
                    2,847 policies sold today
                  </span>
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold text-primary-foreground mb-4 leading-[1.1] tracking-tight">
                  Car Insurance
                </h1>
                <p className="text-xl md:text-2xl text-primary-foreground/80 mb-2 font-medium">
                  Starting at just <span className="text-primary-foreground font-bold">₹2,094*</span>/year
                </p>
                <p className="text-base md:text-lg text-primary-foreground/60 mb-10 flex items-center gap-2">
                  Buy or Renew in 2 Minutes
                  <Sparkles className="h-5 w-5 text-chart-4" />
                </p>
              </motion.div>

              <InsuranceHeroForm />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-5 text-xs text-primary-foreground/40"
              >
                *T&Cs Apply. Prices vary by vehicle, city, and insurer.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Partner Logos — floating above */}
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
