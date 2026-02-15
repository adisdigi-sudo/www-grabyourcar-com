import { motion } from "framer-motion";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Shield, Car, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const PB_PARTNERS_URL = "https://www.pbpartners.com/v1/partner-dashboard";

const productCards = [
  {
    title: "Car Insurance",
    subtitle: "Renew your car insurance",
    highlight: "with zero commission",
    stat: "Starting at just ₹2,094*",
    icon: Car,
    primary: true,
  },
  {
    title: "New Car Insurance",
    subtitle: "Save up to ₹40,000*",
    highlight: "by insuring your brand new car",
    stat: null,
    icon: Sparkles,
    primary: false,
  },
  {
    title: "Third Party Only",
    subtitle: "Mandatory by law",
    highlight: "Starting at ₹2,094/year",
    stat: null,
    icon: Shield,
    primary: false,
  },
];

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
        {/* ===== HERO — Acko-inspired clean layout ===== */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 pt-12 pb-20 md:pt-16 md:pb-28">
          {/* Decorative shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-heading font-bold text-primary-foreground mb-3 leading-tight">
                  Car Insurance
                </h1>
                <p className="text-lg md:text-2xl text-primary-foreground/80 mb-2">
                  Car insurance price starting at just <strong className="text-primary-foreground">₹2,094*</strong>
                </p>
                <p className="text-base md:text-lg text-primary-foreground/70 mb-8 flex items-center gap-2">
                  Buy or Renew Car Insurance Online in 2 Minutes
                  <Sparkles className="h-5 w-5 text-chart-4" />
                </p>
              </motion.div>

              <InsuranceHeroForm />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-4 text-xs text-primary-foreground/50"
              >
                *T&Cs Apply. Prices vary by vehicle, city, and insurer.
              </motion.p>
            </div>
          </div>
        </section>

        {/* ===== Product Cards Grid — Acko-inspired ===== */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-5">
              {productCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card
                    className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer group border-border/50 hover:border-primary/30"
                    onClick={() => window.open(PB_PARTNERS_URL, "_blank", "noopener,noreferrer")}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-heading font-bold text-xl mb-1">{card.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            <span className="text-primary font-medium">{card.subtitle}</span>{" "}
                            {card.highlight}
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <card.icon className="h-5 w-5 text-primary" />
                        </div>
                      </div>

                      {card.stat && (
                        <div className="flex items-center gap-2 mb-4">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{card.stat}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
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
