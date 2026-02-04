import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  CorporateHero,
  CorporateLogoGrid,
  CorporateWhyChoose,
  CorporateIndustries,
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

      {/* Social Proof */}
      <CorporateSocialProof />

      {/* CTA with Form */}
      <CorporateCTA />

      <Footer />
    </div>
  );
};

export default CorporateBuying;
