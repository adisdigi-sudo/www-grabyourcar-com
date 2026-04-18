import { useEffect } from "react";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { FloatingCallButton } from "@/components/FloatingCallButton";
import { FloatingCompareBar } from "@/components/FloatingCompareBar";
import { FloatingGetQuote } from "@/components/FloatingGetQuote";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { WhatsAppFloatingButton } from "@/components/WhatsAppCTA";
import { SiteStructuredData } from "@/components/seo/SiteStructuredData";
import { normalizeBrandingSettings, useBrandingSettingsQuery } from "@/hooks/useBrandingSettings";

const BrandingHeadSync = () => {
  const { data } = useBrandingSettingsQuery();
  const branding = normalizeBrandingSettings(data);

  useEffect(() => {
    document.title = branding.brand_name || "Grabyourcar";

    const rels = ["icon", "shortcut icon", "apple-touch-icon"];

    rels.forEach((rel) => {
      let link = document.head.querySelector(`link[rel='${rel}']`) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = branding.favicon_url;
    });
  }, [branding.brand_name, branding.favicon_url]);

  return null;
};

export const PublicRouteStructuredData = () => (
  <SectionErrorBoundary sectionName="site-structured-data" fallback={null}>
    <SiteStructuredData />
  </SectionErrorBoundary>
);

export const PublicRouteChrome = () => (
  <>
    <BrandingHeadSync />
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