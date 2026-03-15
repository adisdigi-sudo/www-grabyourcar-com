import { Helmet } from "react-helmet-async";
import { useSEOSettings } from "@/hooks/useSEOSettings";

const BASE_URL = "https://grabyourcar.com";

interface GlobalSEOProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
  keywords?: string;
  breadcrumbs?: { name: string; url: string }[];
  faqItems?: { question: string; answer: string }[];
  /** Page key matching admin SEO Builder (e.g. "home", "cars", "car_detail"). When set, backend SEO values override props. */
  pageKey?: string;
}

export const GlobalSEO = ({
  title: propTitle,
  description: propDescription,
  path = "/",
  image = "/og-image.png?v=5",
  type = "website",
  noindex = false,
  keywords: propKeywords,
  breadcrumbs,
  faqItems,
  pageKey,
}: GlobalSEOProps) => {
  // Fetch backend SEO overrides when pageKey is provided
  const { data: backendSEO } = useSEOSettings(pageKey || "__none__");

  // Backend values override component props
  const title = (pageKey && backendSEO?.title) || propTitle;
  const description = (pageKey && backendSEO?.description) || propDescription;
  const keywords = (pageKey && backendSEO?.keywords) || propKeywords;
  const ogTitle = (pageKey && backendSEO?.og_title) || title;
  const ogDescription = (pageKey && backendSEO?.og_description) || description;
  const ogImage = (pageKey && backendSEO?.og_image) || image;
  const robots = (pageKey && backendSEO?.robots) || (noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1");
  const canonicalUrl = (pageKey && backendSEO?.canonical_url) || `${BASE_URL}${path}`;

  const fullImage = ogImage.startsWith("http") ? ogImage : `${BASE_URL}${ogImage}`;

  const breadcrumbSchema = breadcrumbs
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.name,
          item: b.url.startsWith("http") ? b.url : `${BASE_URL}${b.url}`,
        })),
      }
    : null;

  const faqSchema =
    faqItems && faqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        }
      : null;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="GrabYourCar" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@Grabyourcar" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={fullImage} />

      {/* Structured Data */}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}
    </Helmet>
  );
};

export default GlobalSEO;
