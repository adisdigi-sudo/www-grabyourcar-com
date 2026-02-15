import { motion } from "framer-motion";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Sparkles, Shield, Star, CheckCircle2, Award, TrendingUp, Zap, Wallet, Gift, Car, ArrowRight } from "lucide-react";
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
    span: "col-span-1",
  },
  {
    title: "Insuring a brand new car?",
    highlight: "Save up to ₹36,000",
    highlightSuffix: " by insuring your brand new car with us",
    span: "col-span-1",
  },
  {
    title: "Bike Insurance",
    highlight: "",
    highlightSuffix: "Insure your bike or scooter in just 1 minute",
    span: "col-span-1",
  },
];

const heroOffers = [
  { icon: Car, text: "Free Self-Drive Car (1 Day/Year)" },
  { icon: Sparkles, text: "3 Car Wash Coupons" },
  { icon: Gift, text: "Free Perfumes + 6 Months Shipping" },
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

      <main className="min-h-screen bg-background">
        {/* ===== HERO — Acko-Style Clean White Layout ===== */}
        <section className="relative bg-background pt-6 pb-16 md:pt-10 md:pb-24">
          <div className="container mx-auto px-4">
            {/* Top tagline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground leading-tight">
                Your trusted <span className="text-primary">insurer</span> by your side
              </h1>
            </motion.div>

            {/* Scrolling partner badges */}
            <div className="relative mb-10 overflow-hidden">
              <div className="flex animate-scroll-left items-center gap-10 py-2 whitespace-nowrap">
                {[...heroOffers, ...heroOffers, ...heroOffers, ...heroOffers].map((offer, i) => (
                  <div key={i} className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <offer.icon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">{offer.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Acko-Style Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1 — Large: Main Insurance CTA with Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="lg:col-span-1 lg:row-span-2"
              >
                <div className="bg-card rounded-3xl border border-border/60 p-7 h-full flex flex-col hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.1)] transition-all duration-500 group">
                  <div className="inline-flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1 mb-4 w-fit">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Authorised Partner</span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-heading font-bold text-foreground mb-2">
                    Protect your car with our comprehensive insurance
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Not mixed with any hidden charges or jargons
                  </p>

                  <div className="flex items-center gap-2 bg-primary/8 rounded-xl px-3 py-2 w-fit mb-6">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">Coverage from ₹2,094 to ₹1,50,000</span>
                  </div>

                  <div className="mt-auto">
                    <InsuranceHeroForm />
                  </div>

                  {/* Acko-style arrow */}
                  <div className="mt-5 w-10 h-10 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                  </div>
                </div>
              </motion.div>

              {/* Card 2 — Car Insurance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="group cursor-pointer"
              >
                <div className="bg-card rounded-3xl border border-border/60 p-7 h-full flex flex-col hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.1)] transition-all duration-500">
                  <h3 className="text-xl font-heading font-bold text-foreground mb-2">Car insurance</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    <span className="text-primary font-semibold">Renew your car insurance</span> with zero commission
                  </p>

                  <div className="flex items-center gap-2 bg-primary/8 rounded-xl px-3 py-2 w-fit mb-4">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Starting at just ₹2094*</span>
                  </div>

                  <div className="mt-auto flex items-end justify-between">
                    <div className="w-10 h-10 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <div className="w-28 h-20 flex items-end justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                      <Car className="h-16 w-16 text-primary/30" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card 3 — Brand New Car */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="group cursor-pointer"
              >
                <div className="bg-card rounded-3xl border border-border/60 p-7 h-full flex flex-col hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.1)] transition-all duration-500">
                  <h3 className="text-xl font-heading font-bold text-foreground mb-2">Insuring a brand new car?</h3>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-primary font-semibold">Save up to ₹36,000</span> by insuring your brand new car with us
                  </p>

                  <div className="mt-auto flex items-end justify-between pt-4">
                    <div className="w-10 h-10 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <div className="w-28 h-20 flex items-end justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                      <Gift className="h-16 w-16 text-primary/30" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card 4 — Bike Insurance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="group cursor-pointer"
              >
                <div className="bg-card rounded-3xl border border-border/60 p-7 h-full flex flex-col hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.1)] transition-all duration-500">
                  <h3 className="text-xl font-heading font-bold text-foreground mb-2">Free Self-Drive Car</h3>
                  <p className="text-sm text-muted-foreground">
                    Get <span className="text-primary font-semibold">1 day free self-drive</span> car rental every year with your policy
                  </p>

                  <div className="mt-auto flex items-end justify-between pt-4">
                    <div className="w-10 h-10 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <div className="w-28 h-20 flex items-end justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                      <Sparkles className="h-16 w-16 text-primary/30" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card 5 — 3 Car Wash Coupons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="group cursor-pointer"
              >
                <div className="bg-card rounded-3xl border border-border/60 p-7 h-full flex flex-col hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.1)] transition-all duration-500">
                  <h3 className="text-xl font-heading font-bold text-foreground mb-2">3 Free Car Washes</h3>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-primary font-semibold">3 premium car wash coupons</span> valid at 500+ partner centres
                  </p>

                  <div className="mt-auto flex items-end justify-between pt-4">
                    <div className="w-10 h-10 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card 6 — Free Perfumes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="lg:col-span-2 group cursor-pointer"
              >
                <div className="bg-card rounded-3xl border border-border/60 p-7 h-full flex flex-col hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.1)] transition-all duration-500">
                  <h3 className="text-xl font-heading font-bold text-foreground mb-2">Free Perfumes + Shipping</h3>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-primary font-semibold">Premium car perfumes</span> with 6 months of free shipping on all accessory orders
                  </p>

                  <div className="flex items-center gap-2 bg-primary/8 rounded-xl px-3 py-2 w-fit mt-3">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">6 months free shipping included</span>
                  </div>

                  <div className="mt-auto flex items-end justify-between pt-4">
                    <div className="w-10 h-10 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Regulatory footer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                UID: GYC001 | ARN: L0110 | T&C apply
              </p>
            </div>
          </div>
        </section>

        {/* Partner Company Cards */}
        <InsurancePartnerLogos />

        {/* Exclusive Offer Banners with Lead Gen */}
        <InsuranceOfferBanners />

        {/* Stats Section */}
        <InsuranceStats />

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

        {/* Coverage Types */}
        <InsuranceCoverageCards />

        {/* Grab CTA after coverage */}
        <div className="container mx-auto px-4 py-4">
          <InsuranceGrabCTA variant="banner" source="after_coverage" />
        </div>

        {/* Provider Comparison */}
        <InsuranceComparison />

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
