import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  CorporateHero,
  CorporateLogoGrid,
  CorporateStats,
  CorporateWhyChoose,
  CorporateIndustries,
  CorporateCaseStudies,
  CorporateComparison,
  CorporateTestimonials,
  CorporateBrochureDownload,
  CorporateFAQ,
  CorporateSocialProof,
  CorporateCTA,
  CorporateProcessTimeline,
  CorporateScrollProgress,
  FleetRequirementBuilder,
  LeaseVsBuyCalculator,
  CorporatePricingTiers,
} from "@/components/corporate";

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
      <CorporateScrollProgress />

      {/* Hero Section */}
      <CorporateHero />

      {/* Logo Trust Section */}
      <CorporateLogoGrid />

      {/* Animated Stats */}
      <CorporateStats />

      {/* Industries We Serve */}
      <CorporateIndustries />

      {/* Process Timeline */}
      <CorporateProcessTimeline />

      {/* Pricing Tiers */}
      <CorporatePricingTiers />

      {/* Fleet Requirement Builder */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <FleetRequirementBuilder />
        </div>
      </section>

      {/* Lease vs Buy Calculator */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <LeaseVsBuyCalculator />
        </div>
      </section>

      {/* Why Choose Us */}
      <CorporateWhyChoose />

      {/* Comparison Table */}
      <CorporateComparison />

      {/* Case Studies */}
      <CorporateCaseStudies />

      {/* Client Testimonials */}
      <CorporateTestimonials />

      {/* Brochure Download */}
      <CorporateBrochureDownload />

      {/* FAQ Section */}
      <CorporateFAQ />

      {/* Social Proof */}
      <CorporateSocialProof />

      {/* CTA with Form */}
      <CorporateCTA />

      <Footer />
      </div>
    </>
  );
};

export default CorporateBuying;
