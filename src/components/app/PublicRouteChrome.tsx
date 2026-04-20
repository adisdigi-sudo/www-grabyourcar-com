import { useEffect } from "react";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { FloatingCompareBar } from "@/components/FloatingCompareBar";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { SiteStructuredData } from "@/components/seo/SiteStructuredData";
import { RiyaChatWidget } from "@/components/riya/RiyaChatWidget";
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

    const upsertMeta = (selector: string, create: () => HTMLMetaElement, content: string) => {
      let meta = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!meta) {
        meta = create();
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    upsertMeta("meta[name='application-name']", () => {
      const meta = document.createElement("meta");
      meta.name = "application-name";
      return meta;
    }, branding.brand_name);

    upsertMeta("meta[name='apple-mobile-web-app-title']", () => {
      const meta = document.createElement("meta");
      meta.name = "apple-mobile-web-app-title";
      return meta;
    }, branding.brand_name);

    upsertMeta("meta[property='og:site_name']", () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:site_name");
      return meta;
    }, branding.brand_name);

    upsertMeta("meta[property='og:image']", () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:image");
      return meta;
    }, branding.og_image_url);

    upsertMeta("meta[name='twitter:image']", () => {
      const meta = document.createElement("meta");
      meta.name = "twitter:image";
      return meta;
    }, branding.og_image_url);
  }, [branding.brand_name, branding.favicon_url, branding.og_image_url]);

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
    <SectionErrorBoundary sectionName="cookie-consent-banner" fallback={null}>
      <CookieConsentBanner />
    </SectionErrorBoundary>
    <SectionErrorBoundary sectionName="riya-chat-widget" fallback={null}>
      <RiyaChatWidget />
    </SectionErrorBoundary>
  </>
);