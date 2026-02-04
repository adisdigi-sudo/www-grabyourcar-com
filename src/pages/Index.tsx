import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { PromoBanner } from "@/components/PromoBanner";
import { HeroSection } from "@/components/HeroSection";
import { CategoryGrid } from "@/components/CategoryGrid";
import { CarListings } from "@/components/CarListings";
import { CarFinanceHero } from "@/components/CarFinanceHero";
import EMICalculator from "@/components/EMICalculator";
import { LeadForm } from "@/components/LeadForm";
import { Testimonials } from "@/components/Testimonials";
import { TrustBadges } from "@/components/TrustBadges";
import { Footer } from "@/components/Footer";
import { FloatingCTA } from "@/components/FloatingCTA";
import { CarAdvisorChat } from "@/components/CarAdvisorChat";


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
      
      {/* Promo Banner */}
      <PromoBanner />
      
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main>
        {/* Hero Section with Search */}
        <HeroSection />
        
        {/* Service Categories */}
        <CategoryGrid />
        
        {/* Featured Car Listings */}
        <CarListings />
        
        {/* Car Finance Hero - Midnight Tech */}
        <CarFinanceHero />
        
        {/* EMI Calculator */}
        <EMICalculator onGetQuote={handleGetLoanQuote} />
        
        {/* Lead Capture Form */}
        <LeadForm prefillCarInterest={loanPrefill} />
        
        {/* Customer Testimonials */}
        <Testimonials />
        
        {/* Trust Badges */}
        <TrustBadges />
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Floating WhatsApp & Call Buttons */}
      <FloatingCTA />
      
      {/* AI Car Advisor Chat */}
      <CarAdvisorChat />
      </div>
    </>
  );
};

export default Index;
