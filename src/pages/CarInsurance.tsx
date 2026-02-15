import { motion } from "framer-motion";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Shield, CheckCircle2, Car, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
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
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 pt-8 pb-16 md:pt-12 md:pb-24">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left content */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Save Up to 80%
                </Badge>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-foreground mb-6 leading-tight">
                  Get the Best{" "}
                  <span className="text-primary">Car Insurance</span> in Minutes
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                  Compare quotes from India's top insurers, enjoy instant policy
                  issuance, and get hassle-free claims with 10,000+ cashless garages.
                </p>

                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: CheckCircle2, text: "20+ Insurers" },
                    { icon: Shield, text: "98% Claim Settlement" },
                    { icon: Car, text: "10,000+ Garages" },
                  ].map((item, index) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                      className="flex items-center gap-2 text-sm md:text-base"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{item.text}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Trust indicators */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium"
                      >
                        {i}
                      </div>
                    ))}
                  </div>
                  <span>
                    <strong className="text-foreground">50 Lakh+</strong> customers
                    trust us
                  </span>
                </div>
              </motion.div>

              {/* Right form */}
              <div className="flex justify-center lg:justify-end">
                <InsuranceHeroForm />
              </div>
            </div>
          </div>
        </section>

        {/* Partner Logos */}
        <InsurancePartnerLogos />

        {/* Stats Section */}
        <InsuranceStats />

        {/* Smart Behavioral Nudges */}
        <InsuranceSmartNudge />

        {/* Process Steps */}
        <InsuranceProcess />

        {/* Coverage Types */}
        <InsuranceCoverageCards />

        {/* Provider Comparison */}
        <InsuranceComparison />

        {/* Claims Assistance — Differentiator */}
        <InsuranceClaimsAssistance />

        {/* Add-On Protection Suite */}
        <InsuranceServiceExpansion />

        {/* Trust Architecture */}
        <InsuranceTrustArchitecture />

        {/* FAQ Section */}
        <InsuranceFAQ />

        {/* Cross-Sell Services */}
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
