import { lazy, Suspense } from "react";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

const CategoryGrid = lazy(() => import("@/components/CategoryGrid").then((module) => ({ default: module.CategoryGrid })));
const BrowseByBudget = lazy(() => import("@/components/BrowseByBudget").then((module) => ({ default: module.BrowseByBudget })));
const CarListings = lazy(() => import("@/components/CarListings").then((module) => ({ default: module.CarListings })));
const LeadForm = lazy(() => import("@/components/LeadForm").then((module) => ({ default: module.LeadForm })));
const Testimonials = lazy(() => import("@/components/Testimonials").then((module) => ({ default: module.Testimonials })));
const TrustBadges = lazy(() => import("@/components/TrustBadges").then((module) => ({ default: module.TrustBadges })));
const Footer = lazy(() => import("@/components/Footer").then((module) => ({ default: module.Footer })));
const FloatingCTA = lazy(() => import("@/components/FloatingCTA").then((module) => ({ default: module.FloatingCTA })));
const CustomerStories = lazy(() => import("@/components/CustomerStories").then((module) => ({ default: module.CustomerStories })));
const DealerLocatorWidget = lazy(() => import("@/components/DealerLocatorWidget").then((module) => ({ default: module.DealerLocatorWidget })));
const CrossSellWidget = lazy(() => import("@/components/CrossSellWidget").then((module) => ({ default: module.CrossSellWidget })));
const HomepageSEOContent = lazy(() => import("@/components/HomepageSEOContent").then((module) => ({ default: module.HomepageSEOContent })));
const EntryLeadCaptureModal = lazy(() => import("@/components/EntryLeadCaptureModal").then((module) => ({ default: module.EntryLeadCaptureModal })));
const ExitIntentPopup = lazy(() => import("@/components/ExitIntentPopup").then((module) => ({ default: module.ExitIntentPopup })));
const DynamicHeroBanners = lazy(() => import("@/components/DynamicHomepageContent").then((module) => ({ default: module.DynamicHeroBanners })));
const DynamicPromoBanners = lazy(() => import("@/components/DynamicHomepageContent").then((module) => ({ default: module.DynamicPromoBanners })));
const DynamicFeaturedCars = lazy(() => import("@/components/DynamicHomepageContent").then((module) => ({ default: module.DynamicFeaturedCars })));
const DynamicTestimonials = lazy(() => import("@/components/DynamicHomepageContent").then((module) => ({ default: module.DynamicTestimonials })));
const DynamicCTABanners = lazy(() => import("@/components/DynamicHomepageContent").then((module) => ({ default: module.DynamicCTABanners })));
const EMICalculator = lazy(() => import("@/components/EMICalculator"));

const SectionSkeleton = ({ label }: { label: string }) => (
  <section className="py-8">
    <div className="container mx-auto px-4">
      <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-border/60 bg-card/40 text-sm text-muted-foreground">
        {label}
      </div>
    </div>
  </section>
);

interface HomeDeferredSectionsProps {
  loanPrefill: string;
  onGetLoanQuote: (loanDetails: string) => void;
}

export const HomeDeferredSections = ({ loanPrefill, onGetLoanQuote }: HomeDeferredSectionsProps) => {
  return (
    <>
      <Suspense fallback={<SectionSkeleton label="Loading homepage sections..." />}>
        <SectionErrorBoundary sectionName="category-grid" fallback={null}>
          <CategoryGrid />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="browse-by-budget" fallback={null}>
          <BrowseByBudget />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="dynamic-hero-banners" fallback={null}>
          <DynamicHeroBanners />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="dynamic-promo-banners" fallback={null}>
          <DynamicPromoBanners />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="dynamic-featured-cars" fallback={null}>
          <DynamicFeaturedCars />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="car-listings">
          <CarListings />
        </SectionErrorBoundary>

        <div className="container mx-auto px-4">
          <SectionErrorBoundary sectionName="cross-sell-widget" fallback={null}>
            <CrossSellWidget context="home" title="Complete Your Car Buying Journey" maxItems={4} />
          </SectionErrorBoundary>
        </div>

        <SectionErrorBoundary sectionName="dealer-locator-widget" fallback={null}>
          <DealerLocatorWidget />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="emi-calculator" fallback={<SectionSkeleton label="Loading EMI calculator..." />}>
          <EMICalculator onGetQuote={onGetLoanQuote} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="dynamic-cta-banners" fallback={null}>
          <DynamicCTABanners />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="lead-form">
          <LeadForm prefillCarInterest={loanPrefill} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="testimonials">
          <Testimonials />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="dynamic-testimonials" fallback={null}>
          <DynamicTestimonials />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="customer-stories">
          <CustomerStories />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="trust-badges">
          <TrustBadges />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="homepage-seo-content" fallback={null}>
          <HomepageSEOContent />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="footer" fallback={<SectionSkeleton label="Loading footer..." />}>
          <Footer />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="floating-cta" fallback={null}>
          <FloatingCTA />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="entry-lead-capture-modal" fallback={null}>
          <EntryLeadCaptureModal />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="exit-intent-popup" fallback={null}>
          <ExitIntentPopup />
        </SectionErrorBoundary>
      </Suspense>
    </>
  );
};

export default HomeDeferredSections;