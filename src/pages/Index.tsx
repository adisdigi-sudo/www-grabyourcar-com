import { Header } from "@/components/Header";
import { PromoBanner } from "@/components/PromoBanner";
import { HeroSection } from "@/components/HeroSection";
import { CategoryGrid } from "@/components/CategoryGrid";
import { CarListings } from "@/components/CarListings";
import { LeadForm } from "@/components/LeadForm";
import { Testimonials } from "@/components/Testimonials";
import { TrustBadges } from "@/components/TrustBadges";
import { Footer } from "@/components/Footer";
import { FloatingCTA } from "@/components/FloatingCTA";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* SEO Meta Tags handled in index.html */}
      
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
        
        {/* Lead Capture Form */}
        <LeadForm />
        
        {/* Customer Testimonials */}
        <Testimonials />
        
        {/* Trust Badges */}
        <TrustBadges />
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Floating WhatsApp & Call Buttons */}
      <FloatingCTA />
    </div>
  );
};

export default Index;
