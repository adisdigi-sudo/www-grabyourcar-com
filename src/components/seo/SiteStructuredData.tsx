import { Helmet } from "react-helmet-async";
import { normalizeBrandingSettings, useBrandingSettingsQuery } from "@/hooks/useBrandingSettings";

const BASE_URL = "https://grabyourcar.com";

/**
 * Sitewide JSON-LD structured data rendered once at the app root.
 * Includes Organization, WebSite (with SearchAction), and LocalBusiness schemas.
 */
export const SiteStructuredData = () => {
  const { data } = useBrandingSettingsQuery();
  const branding = normalizeBrandingSettings(data);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: branding.brand_name,
    url: BASE_URL,
    logo: branding.logo_url?.startsWith("http") ? branding.logo_url : `${BASE_URL}${branding.logo_url || "/logo.png"}`,
    description:
      "India's leading car buying platform offering new car sales, car insurance, car loans, HSRP, accessories, and self-drive rentals.",
    sameAs: [
      "https://www.instagram.com/grabyourcar",
      "https://www.facebook.com/grabyourcar",
      "https://twitter.com/Grabyourcar",
      "https://www.youtube.com/@grabyourcar",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+91-9220592205",
        contactType: "sales",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi"],
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Delhi NCR",
      addressCountry: "IN",
    },
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: branding.brand_name,
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/cars?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: branding.brand_name,
    url: BASE_URL,
    telephone: "+91-9220592205",
    priceRange: "₹₹₹",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Delhi NCR",
      addressRegion: "Delhi",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "28.6139",
      longitude: "77.2090",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      opens: "09:00",
      closes: "19:00",
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(webSiteSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(localBusinessSchema)}
      </script>
    </Helmet>
  );
};

export default SiteStructuredData;
