import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  CorporateHero,
  CorporateValueProposition,
  CorporateProcessTimeline,
  CorporateFleetTools,
  CorporateTrustSection,
  CorporateComparison,
  CorporateFAQ,
  CorporateCTA,
  CorporateFloatingCTA,
} from "@/components/corporate";
import { CorporateBrochureDownload } from "@/components/corporate/CorporateBrochureDownload";

const CorporateBuying = () => {
  return (
    <>
      <GlobalSEO
        pageKey="corporate"
        title="Corporate Car Buying | Fleet Solutions & Bulk Orders | GrabYourCar"
        description="Corporate fleet solutions for businesses. Get special pricing on bulk car orders, dedicated account management, and hassle-free procurement for your organization."
        path="/corporate"
      />

      <div className="min-h-screen bg-background">
        <Header />

        {/* 1. Hero — Bold headline, dual CTAs, trust stats, inline logo strip */}
        <CorporateHero />

        {/* 2. Value Proposition — Problem→Solution narrative */}
        <CorporateValueProposition />

        {/* 3. How It Works — 4-step process timeline */}
        <CorporateProcessTimeline />

        {/* 4. Fleet Tools — Tabbed: Planner | Lease vs Buy | Pricing */}
        <CorporateFleetTools />

        {/* 5. Trust Section — Merged case studies + testimonials + metrics */}
        <CorporateTrustSection />

        {/* 5b. Comparison Table */}
        <CorporateComparison />

        {/* 6. FAQ + Brochure Download */}
        <CorporateFAQ />
        <CorporateBrochureDownload />

        {/* 7. CTA + Form */}
        <div id="corporate-cta">
          <CorporateCTA />
        </div>

        {/* 8. Sticky Floating CTA Bar */}
        <CorporateFloatingCTA />

        <Footer />
      </div>
    </>
  );
};

export default CorporateBuying;
