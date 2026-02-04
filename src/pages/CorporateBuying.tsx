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
} from "@/components/corporate";

const CorporateBuying = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <CorporateHero />

      {/* Logo Trust Section */}
      <CorporateLogoGrid />

      {/* Animated Stats */}
      <CorporateStats />

      {/* Industries We Serve */}
      <CorporateIndustries />

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
  );
};

export default CorporateBuying;
