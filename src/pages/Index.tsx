import { useState } from "react";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Header } from "@/components/Header";
import { PromoBanner } from "@/components/PromoBanner";
import { RivianHero } from "@/components/RivianHero";
import { CategoryGrid } from "@/components/CategoryGrid";

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
import { HomepageSEOContent } from "@/components/HomepageSEOContent";
import { EntryLeadCaptureModal } from "@/components/EntryLeadCaptureModal";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

import {
  DynamicHeroBanners,
  DynamicPromoBanners,
  DynamicFeaturedCars,
  DynamicTestimonials,
  DynamicCTABanners,
} from "@/components/DynamicHomepageContent";
// Clean Rivian layout — fresh build v2

const Index = () => {
  const [loanPrefill, setLoanPrefill] = useState<string>("");

  const handleGetLoanQuote = (loanDetails: string) => {
    setLoanPrefill(loanDetails);
    // Scroll to lead form
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <SectionErrorBoundary sectionName="global-seo" fallback={null}>
        <GlobalSEO
          pageKey="home"
          title="GrabYourCar — Buy New Cars at Best Price in India | Delhi, Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur, Lucknow"
          description="India's most trusted new car buying platform. Compare prices across 50+ brands including Maruti Suzuki, Hyundai, Tata Motors, Mahindra, Kia, Toyota. Get on-road price quotes, zero waiting period delivery, best car loan rates starting 8.5%, comprehensive car insurance deals. Serving Delhi NCR, Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur & Lucknow. 500+ happy customers. Free doorstep delivery. Call +91 98559 24442 for best deals."
          path="/"
          keywords="buy new car online India, new car best price Delhi, new car best price Mumbai, new car best price Bangalore, car deals near me, on-road price calculator, zero waiting period cars, car loan EMI calculator, car insurance online, Maruti Suzuki price, Hyundai Creta on-road price, Tata Nexon price, Mahindra XUV700 price, Kia Seltos price, best car deals 2025, new car offers today, car comparison tool India, corporate car buying"
          faqItems={[
            { question: "How to buy a new car at the best price in India?", answer: "GrabYourCar compares prices from 500+ authorized dealers across India to get you the lowest on-road price. We negotiate exclusive discounts, zero waiting period deals, and provide free doorstep delivery. Call +91 98559 24442 or WhatsApp us for instant quotes." },
            { question: "Which cities does GrabYourCar serve?", answer: "GrabYourCar serves all major cities in India including Delhi NCR (Delhi, Gurugram, Noida, Faridabad), Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur, and Lucknow with doorstep delivery." },
            { question: "What car brands are available on GrabYourCar?", answer: "GrabYourCar offers new cars from 50+ brands including Maruti Suzuki, Hyundai, Tata Motors, Mahindra, Kia, Toyota, Honda, MG, Skoda, Volkswagen, BMW, Mercedes-Benz, Audi, and more." },
            { question: "Does GrabYourCar provide car loans and insurance?", answer: "Yes! GrabYourCar provides car loans starting at 8.5% from top banks, along with comprehensive car insurance from 15+ leading insurers like HDFC ERGO, ICICI Lombard, Bajaj Allianz." },
            { question: "How does zero waiting period work at GrabYourCar?", answer: "GrabYourCar maintains relationships with 500+ authorized dealers and tracks real-time inventory to source popular models with significantly reduced or zero waiting periods." }
          ]}
        />
      </SectionErrorBoundary>
      
      <div className="min-h-screen bg-background">
      {/* Clean Rivian-style layout - no promo banner */}
      
      {/* Header */}
      <SectionErrorBoundary sectionName="header" fallback={null}>
        <Header />
      </SectionErrorBoundary>
      
      {/* Main Content */}
      <main>
        {/* Single Rivian-style full-screen hero carousel — backend managed */}
        <SectionErrorBoundary sectionName="hero">
          <RivianHero />
        </SectionErrorBoundary>
        
        {/* Our Services Category Grid */}
        <SectionErrorBoundary sectionName="category-grid">
          <CategoryGrid />
        </SectionErrorBoundary>
        
        {/* Dynamic Hero Banners from Admin */}
        <SectionErrorBoundary sectionName="dynamic-hero-banners" fallback={null}>
          <DynamicHeroBanners />
        </SectionErrorBoundary>
        
        {/* Dynamic Promo Banners from Admin */}
        <SectionErrorBoundary sectionName="dynamic-promo-banners" fallback={null}>
          <DynamicPromoBanners />
        </SectionErrorBoundary>
        
        {/* Dynamic Featured Cars from Admin */}
        <SectionErrorBoundary sectionName="dynamic-featured-cars" fallback={null}>
          <DynamicFeaturedCars />
        </SectionErrorBoundary>
        
        {/* Featured Car Listings */}
        <SectionErrorBoundary sectionName="car-listings">
          <CarListings />
        </SectionErrorBoundary>

        {/* Cross-Sell Services */}
        <div className="container mx-auto px-4">
          <SectionErrorBoundary sectionName="cross-sell-widget" fallback={null}>
            <CrossSellWidget context="home" title="Complete Your Car Buying Journey" maxItems={4} />
          </SectionErrorBoundary>
        </div>
        
        {/* Nearby Dealer Locator */}
        <SectionErrorBoundary sectionName="dealer-locator-widget" fallback={null}>
          <DealerLocatorWidget />
        </SectionErrorBoundary>
         
        {/* EMI Calculator */}
        <SectionErrorBoundary sectionName="emi-calculator">
          <EMICalculator onGetQuote={handleGetLoanQuote} />
        </SectionErrorBoundary>
        
        {/* Dynamic CTA Banners from Admin */}
        <SectionErrorBoundary sectionName="dynamic-cta-banners" fallback={null}>
          <DynamicCTABanners />
        </SectionErrorBoundary>
        
        {/* Lead Capture Form */}
        <SectionErrorBoundary sectionName="lead-form">
          <LeadForm prefillCarInterest={loanPrefill} />
        </SectionErrorBoundary>
        
        {/* Customer Testimonials */}
        <SectionErrorBoundary sectionName="testimonials">
          <Testimonials />
        </SectionErrorBoundary>
        
        {/* Dynamic Testimonials from Admin */}
        <SectionErrorBoundary sectionName="dynamic-testimonials" fallback={null}>
          <DynamicTestimonials />
        </SectionErrorBoundary>
        
         {/* Customer Stories with Delivery Photos */}
         <SectionErrorBoundary sectionName="customer-stories">
           <CustomerStories />
         </SectionErrorBoundary>
         
        {/* Trust Badges */}
        <SectionErrorBoundary sectionName="trust-badges">
          <TrustBadges />
        </SectionErrorBoundary>
        
        {/* Crawlable SEO Content — 1000+ words of keyword-rich text */}
        <SectionErrorBoundary sectionName="homepage-seo-content" fallback={null}>
          <HomepageSEOContent />
        </SectionErrorBoundary>
      </main>
      
      {/* Footer */}
      <SectionErrorBoundary sectionName="footer" fallback={null}>
        <Footer />
      </SectionErrorBoundary>
      
      {/* Floating WhatsApp & Call Buttons */}
      <SectionErrorBoundary sectionName="floating-cta" fallback={null}>
        <FloatingCTA />
      </SectionErrorBoundary>
      
      {/* Lead Capture Modals */}
      
      <SectionErrorBoundary sectionName="entry-lead-capture-modal" fallback={null}>
        <EntryLeadCaptureModal />
      </SectionErrorBoundary>
      <SectionErrorBoundary sectionName="exit-intent-popup" fallback={null}>
        <ExitIntentPopup />
      </SectionErrorBoundary>
      </div>
    </>
  );
};

export default Index;
