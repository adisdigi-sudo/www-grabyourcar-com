import { useState } from "react";
import { motion } from "framer-motion";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Sparkles, Shield, Star, CheckCircle2, Award, TrendingUp, Zap, Wallet, Gift, Car, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  InsuranceTrustStrip,
} from "@/components/insurance";
import { InsuranceContentSection } from "@/components/insurance/InsuranceContentSection";
import { InsuranceOfferBanners } from "@/components/insurance/InsuranceOfferBanners";
import { InsuranceGrabCTA } from "@/components/insurance/InsuranceGrabCTA";
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

const heroProducts = [
  {
    title: "Car Insurance",
    highlight: "Renew your car insurance",
    highlightSuffix: " with zero commission",
    badge: "Starting at just ₹2,094*",
    policyType: "car_renewal",
    vehicleLabel: "car",
    icon: Car,
  },
  {
    title: "Brand New Car Insurance",
    highlight: "Save up to ₹36,000",
    highlightSuffix: " by insuring your brand new car with us",
    badge: "New car? Best rates here",
    policyType: "new_car",
    vehicleLabel: "car",
    icon: Gift,
  },
  {
    title: "Bike Insurance",
    highlight: "",
    highlightSuffix: "Insure your bike or scooter in just 1 minute",
    badge: "Starting at ₹714*",
    policyType: "bike",
    vehicleLabel: "bike",
    icon: Sparkles,
  },
];

const CarInsurance = () => {
  const [activeProduct, setActiveProduct] = useState<typeof heroProducts[0] | null>(null);
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

      <main className="min-h-screen bg-background">
        {/* ===== HERO — Premium Clean Layout ===== */}
        <section className="relative bg-background pt-8 pb-16 md:pt-14 md:pb-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(var(--primary)/0.04),transparent)]" />

          <div className="container mx-auto px-4 relative z-10">
            {/* Hero Heading */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8 md:mb-10"
            >
              <div className="inline-flex items-center gap-1.5 bg-primary/10 rounded-full px-4 py-1.5 mb-5">
                <Shield className="h-3.5 w-3.5 text-foreground" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">IRDAI Authorised • Trusted by 50,000+ Customers</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground leading-tight mb-3">
                Your trusted <span className="text-foreground">insurer</span> by your side
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Compare plans from 20+ top insurers. Save up to 85% on your premium.
              </p>
            </motion.div>

            {/* Check Price Form — Centered */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex justify-center mb-10"
            >
              <InsuranceHeroForm />
            </motion.div>

            {/* Product Cards — responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-4xl mx-auto">
              {heroProducts.map((product, index) => (
                <motion.div
                  key={product.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 + index * 0.1 }}
                  className="group cursor-pointer"
                  onClick={() => setActiveProduct(product)}
                >
                  <div className="bg-card rounded-2xl border border-border/60 p-5 md:p-6 h-full flex flex-col hover:border-primary/40 hover:shadow-[0_16px_50px_-15px_hsl(var(--primary)/0.12)] transition-all duration-500 min-h-[180px]">
                    <div className="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center mb-4">
                      <product.icon className="h-6 w-6 text-foreground" />
                    </div>
                    <h3 className="text-lg font-heading font-bold text-foreground mb-2">{product.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {product.highlight && <span className="text-foreground font-semibold">{product.highlight}</span>}
                      {product.highlightSuffix}
                    </p>
                    {product.badge && (
                      <div className="flex items-center gap-2 bg-primary/8 rounded-xl px-3 py-1.5 w-fit mb-3">
                        <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                        <span className="text-xs font-bold text-foreground">{product.badge}</span>
                      </div>
                    )}
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">Check Prices →</span>
                      <div className="w-9 h-9 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Product Card Multi-Step Dialog */}
            <Dialog open={!!activeProduct} onOpenChange={(open) => !open && setActiveProduct(null)}>
              <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 md:p-6 w-[95vw] sm:w-full rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-heading">
                    {activeProduct && <activeProduct.icon className="h-5 w-5 text-foreground" />}
                    {activeProduct?.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  <InsuranceHeroForm
                    key={activeProduct?.policyType}
                    policyType={activeProduct?.policyType || "comprehensive"}
                    vehicleLabel={activeProduct?.vehicleLabel || "vehicle"}
                    compact
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Regulatory footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-muted-foreground">
                GrabYourCar • Adis Makethemoney Services Pvt Ltd • IRDAI Authorised
              </p>
            </div>
          </div>
        </section>

        {/* ═══ TRUST STRIP — After Hero ═══ */}
        <InsuranceTrustStrip variant="full" />

        {/* Partner Company Cards */}
        <InsurancePartnerLogos />

        {/* Exclusive Offer Banners with Lead Gen */}
        <InsuranceOfferBanners />

        {/* Stats Section */}
        <InsuranceStats />

        {/* ═══ TRUST WATERMARK — After Stats ═══ */}
        <InsuranceTrustStrip variant="watermark" />

        {/* Grab CTA after stats */}
        <div className="container mx-auto px-4">
          <InsuranceGrabCTA variant="banner" source="after_stats" />
        </div>

        {/* Smart Behavioral Nudges */}
        <InsuranceSmartNudge />

        {/* Content: What is Car Insurance + Key Features */}
        <InsuranceContentSection />

        {/* Inline CTA */}
        <InsuranceGrabCTA variant="inline" source="after_content" />

        {/* Process Steps */}
        <InsuranceProcess />

        {/* ═══ TRUST STRIP — After Process ═══ */}
        <InsuranceTrustStrip variant="compact" />

        {/* Coverage Types */}
        <InsuranceCoverageCards />

        {/* Grab CTA after coverage */}
        <div className="container mx-auto px-4 py-4">
          <InsuranceGrabCTA variant="banner" source="after_coverage" />
        </div>

        {/* Provider Comparison */}
        <InsuranceComparison />

        {/* ═══ TRUST WATERMARK — After Comparison ═══ */}
        <InsuranceTrustStrip variant="watermark" />

        {/* Inline CTA */}
        <InsuranceGrabCTA variant="inline" source="after_comparison" />

        {/* Claims Assistance */}
        <InsuranceClaimsAssistance />

        {/* Add-On Protection Suite */}
        <InsuranceServiceExpansion />

        {/* Grab CTA after addons */}
        <div className="container mx-auto px-4 py-4">
          <InsuranceGrabCTA variant="banner" source="after_addons" />
        </div>

        {/* Trust Architecture */}
        <InsuranceTrustArchitecture />

        {/* ═══ TRUST STRIP — Before FAQ ═══ */}
        <InsuranceTrustStrip variant="full" />

        {/* FAQ Section */}
        <InsuranceFAQ />

        {/* Inline CTA after FAQ */}
        <InsuranceGrabCTA variant="inline" source="after_faq" />

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
