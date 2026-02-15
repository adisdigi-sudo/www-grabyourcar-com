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
        {/* ===== HERO — Acko-inspired clean bold design ===== */}
        <section className="relative overflow-hidden bg-[#3A1078]">
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#3A1078] via-[#4E31AA] to-[#3A1078]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(120,80,220,0.4),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(58,16,120,0.6),transparent_50%)]" />
          
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

          <div className="container mx-auto px-4 relative z-10 py-12 md:py-20 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left content */}
              <div className="max-w-xl">
                {/* Authorised Partner Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 mb-6 border border-white/20"
                >
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white tracking-wide uppercase">Authorised Channel Partner</span>
                  </div>
                  <div className="w-px h-4 bg-white/30" />
                  <span className="text-xs font-bold text-emerald-300">PolicyBazaar</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white mb-3 leading-[1.1] tracking-tight">
                    Car Insurance
                  </h1>
                  <p className="text-xl md:text-2xl text-white/90 font-medium mb-2">
                    Car insurance price starting at just <span className="text-emerald-300 font-bold">₹2,094</span>*
                  </p>
                  <p className="text-base md:text-lg text-white/70 mb-8 flex items-center gap-2">
                    Buy or Renew Car Insurance Online in 2 Minutes
                    <Sparkles className="h-5 w-5 text-yellow-400" />
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
                  className="mt-4 flex items-center gap-4 text-xs text-white/40"
                >
                  <span>IRDAI Licensed</span>
                  <span>•</span>
                  <span>*T&Cs Apply</span>
                </motion.div>

                {/* Trust stats row */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="flex flex-wrap gap-6 mt-8"
                >
                  {[
                    { value: "20+", label: "Insurance Partners", icon: Shield },
                    { value: "98.3%", label: "Claim Settlement", icon: TrendingUp },
                    { value: "4.8★", label: "Customer Rating", icon: Star },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                        <stat.icon className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white leading-tight">{stat.value}</p>
                        <p className="text-[11px] text-white/50">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right side — visual element */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.7 }}
                className="hidden lg:block relative"
              >
                <div className="relative">
                  {/* Car image with glow */}
                  <div className="relative z-10">
                    <img
                      src={insuranceHeroBg}
                      alt="Car insurance coverage"
                      className="w-full max-w-lg mx-auto rounded-3xl shadow-2xl shadow-purple-900/50"
                    />
                  </div>
                  {/* Glow effect behind */}
                  <div className="absolute inset-0 blur-3xl bg-purple-500/20 rounded-full scale-90" />

                  {/* Floating cards */}
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute -left-6 top-12 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20 z-20"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">Save up to 85%</p>
                        <p className="text-[10px] text-gray-500">On your premium</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
                    className="absolute -right-4 bottom-16 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20 z-20"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">7,500+ Garages</p>
                        <p className="text-[10px] text-gray-500">Cashless Network</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                    className="absolute right-8 top-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20 z-20"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <Award className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">2,847 Sold Today</p>
                        <p className="text-[10px] text-gray-500">Policies issued</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
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
