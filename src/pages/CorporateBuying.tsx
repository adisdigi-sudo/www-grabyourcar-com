import { Helmet } from "react-helmet-async";
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
} from "@/components/corporate";

const CorporateBuying = () => {
  return (
    <>
      <Helmet>
        <title>Corporate Car Buying | Fleet Solutions & Bulk Orders | GrabYourCar</title>
        <meta
          name="description"
          content="Corporate fleet solutions for businesses. Get special pricing on bulk car orders, dedicated account management, and hassle-free procurement for your organization."
        />
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://grabyourcar.com/corporate" />
        <meta property="og:title" content="Corporate Car Buying | Fleet Solutions & Bulk Orders | GrabYourCar" />
        <meta property="og:description" content="Corporate fleet solutions for businesses. Get special pricing on bulk car orders." />
        <meta property="og:image" content="https://grabyourcar.com/og-image.png" />
        <meta property="og:site_name" content="GrabYourCar" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://grabyourcar.com/corporate" />
        <meta name="twitter:title" content="Corporate Car Buying | Fleet Solutions & Bulk Orders" />
        <meta name="twitter:description" content="Get special pricing on bulk car orders for your organization." />
        <meta name="twitter:image" content="https://grabyourcar.com/og-image.png" />
      </Helmet>
      
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
