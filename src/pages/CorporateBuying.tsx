import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  CorporateHero,
  CorporateLogoGrid,
  CorporateWhyChoose,
  CorporateIndustries,
  CorporateCaseStudies,
  CorporateBrochureDownload,
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

      {/* Industries We Serve */}
      <CorporateIndustries />

      {/* Why Choose Us */}
      <CorporateWhyChoose />

      {/* Case Studies */}
      <CorporateCaseStudies />

      {/* Brochure Download */}
      <CorporateBrochureDownload />

      {/* Social Proof */}
      <CorporateSocialProof />

      {/* CTA with Form */}
      <CorporateCTA />

      <Footer />
    </div>
  );
};

export default CorporateBuying;
