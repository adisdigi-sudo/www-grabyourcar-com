import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { FloatingCallButton } from "@/components/FloatingCallButton";
import { FloatingCompareBar } from "@/components/FloatingCompareBar";
import { FloatingGetQuote } from "@/components/FloatingGetQuote";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { WhatsAppFloatingButton } from "@/components/WhatsAppCTA";
import { SiteStructuredData } from "@/components/seo/SiteStructuredData";

export const PublicRouteStructuredData = () => (
  <SectionErrorBoundary sectionName="site-structured-data" fallback={null}>
    <SiteStructuredData />
  </SectionErrorBoundary>
);

export const PublicRouteChrome = () => (
  <>
    <SectionErrorBoundary sectionName="floating-compare-bar" fallback={null}>
      <FloatingCompareBar />
    </SectionErrorBoundary>
    <SectionErrorBoundary sectionName="floating-whatsapp-button" fallback={null}>
      <WhatsAppFloatingButton />
    </SectionErrorBoundary>
    <SectionErrorBoundary sectionName="floating-call-button" fallback={null}>
      <FloatingCallButton />
    </SectionErrorBoundary>
    <SectionErrorBoundary sectionName="floating-get-quote" fallback={null}>
      <FloatingGetQuote />
    </SectionErrorBoundary>
    <SectionErrorBoundary sectionName="cookie-consent-banner" fallback={null}>
      <CookieConsentBanner />
    </SectionErrorBoundary>
  </>
);