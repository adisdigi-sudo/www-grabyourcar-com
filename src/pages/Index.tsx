import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { PromoBanner } from "@/components/PromoBanner";
import { RivianHero } from "@/components/RivianHero";
// CategoryGrid removed for Rivian-style clean layout
import { CarListings } from "@/components/CarListings";
import EMICalculator from "@/components/EMICalculator";
import { LeadForm } from "@/components/LeadForm";
import { Testimonials } from "@/components/Testimonials";
import { TrustBadges } from "@/components/TrustBadges";
import { Footer } from "@/components/Footer";
import { FloatingCTA } from "@/components/FloatingCTA";
import { CustomerStories } from "@/components/CustomerStories";
import { DealerLocatorWidget } from "@/components/DealerLocatorWidget";
import { CrossSellWidget } from "@/components/CrossSellWidget";
import {
  DynamicHeroBanners,
  DynamicPromoBanners,
  DynamicFeaturedCars,
  DynamicTestimonials,
  DynamicCTABanners,
} from "@/components/DynamicHomepageContent";
// OffersStrip removed for Rivian-style clean layout

const Index = () => {
  const [loanPrefill, setLoanPrefill] = useState<string>("");

  const handleGetLoanQuote = (loanDetails: string) => {
    setLoanPrefill(loanDetails);
    // Scroll to lead form
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Helmet>
        <title>GrabYourCar | Buy New Cars in India | Best Prices & Offers</title>
        <meta
          name="description"
          content="India's trusted platform for buying new cars. Compare prices, get loans, and find the best deals on Maruti, Hyundai, Tata, Mahindra & more. Expert advice & doorstep delivery."
        />
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://grabyourcar.lovable.app/" />
        <meta property="og:title" content="GrabYourCar | Buy New Cars in India | Best Prices & Offers" />
        <meta property="og:description" content="India's trusted platform for buying new cars. Compare prices, get loans, and find the best deals on Maruti, Hyundai, Tata, Mahindra & more." />
        <meta property="og:image" content="https://grabyourcar.lovable.app/og-image.png" />
        <meta property="og:site_name" content="GrabYourCar" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://grabyourcar.lovable.app/" />
        <meta name="twitter:title" content="GrabYourCar | Buy New Cars in India | Best Prices & Offers" />
        <meta name="twitter:description" content="India's trusted platform for buying new cars. Compare prices, get loans, and find the best deals." />
        <meta name="twitter:image" content="https://grabyourcar.lovable.app/og-image.png" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
      {/* Clean Rivian-style layout - no promo banner */}
      
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main>
        {/* Single Rivian-style full-screen hero carousel — backend managed */}
        <RivianHero />
        
        {/* Dynamic Hero Banners from Admin */}
        <DynamicHeroBanners />
        
        {/* Dynamic Promo Banners from Admin */}
        <DynamicPromoBanners />
        
        {/* Dynamic Featured Cars from Admin */}
        <DynamicFeaturedCars />
        
        {/* Featured Car Listings */}
        <CarListings />

        {/* Cross-Sell Services */}
        <div className="container mx-auto px-4">
          <CrossSellWidget context="home" title="Complete Your Car Buying Journey" maxItems={4} />
        </div>
        
        {/* Nearby Dealer Locator */}
        <DealerLocatorWidget />
         
        {/* EMI Calculator */}
        <EMICalculator onGetQuote={handleGetLoanQuote} />
        
        {/* Dynamic CTA Banners from Admin */}
        <DynamicCTABanners />
        
        {/* Lead Capture Form */}
        <LeadForm prefillCarInterest={loanPrefill} />
        
        {/* Customer Testimonials */}
        <Testimonials />
        
        {/* Dynamic Testimonials from Admin */}
        <DynamicTestimonials />
        
         {/* Customer Stories with Delivery Photos */}
         <CustomerStories />
         
        {/* Trust Badges */}
        <TrustBadges />
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Floating WhatsApp & Call Buttons */}
      <FloatingCTA />
      </div>
    </>
  );
};

export default Index;
