import { submitLeadReliably } from "@/lib/leadIntakeClient";

interface WebsiteLeadCaptureInput {
  name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  carInterest?: string | null;
  carBrand?: string | null;
  vertical?: string;
  serviceCategory?: string | null;
  source: string;
  type?: string;
  priority?: "low" | "medium" | "high" | "warm" | "hot" | "normal";
  message?: string | null;
  leadSourceType?: string;
}

/**
 * Extract UTM params from the current page URL for ad attribution.
 */
function extractUtmParams(): Record<string, string | null> {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_term: params.get("utm_term"),
      utm_content: params.get("utm_content"),
      gclid: params.get("gclid"),
      fbclid: params.get("fbclid"),
    };
  } catch {
    return {
      utm_source: null, utm_medium: null, utm_campaign: null,
      utm_term: null, utm_content: null, gclid: null, fbclid: null,
    };
  }
}

export async function captureWebsiteLead(input: WebsiteLeadCaptureInput) {
  const serviceCategory = input.serviceCategory?.trim() || null;
  const inferredVertical = serviceCategory?.toLowerCase().includes("insurance")
    ? "car insurance"
    : input.vertical || "car";

  // Auto-extract UTM params from URL
  const utm = extractUtmParams();
  const adPlatform = utm.gclid ? "google" : utm.fbclid ? "meta" : null;

  const payload = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    city: input.city?.trim() || null,
    carInterest: input.carInterest?.trim() || null,
    carBrand: input.carBrand?.trim() || null,
    vertical: inferredVertical,
    source: input.source,
    type: input.type || "website_lead",
    priority: input.priority || "medium",
    message_text: input.message?.trim() || null,
    lead_source_type: input.leadSourceType || "Website",
    serviceCategory,
    // UTM & ad attribution
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_term: utm.utm_term,
    utm_content: utm.utm_content,
    gclid: utm.gclid,
    fbclid: utm.fbclid,
    ad_platform: adPlatform,
    body: {
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      city: input.city?.trim() || null,
      carInterest: input.carInterest?.trim() || null,
      carBrand: input.carBrand?.trim() || null,
      vertical: inferredVertical,
      source: input.source,
      type: input.type || "website_lead",
      message: input.message?.trim() || null,
      details: input.message?.trim() || null,
      lead_source_type: input.leadSourceType || "Website",
      serviceCategory,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
    },
  };

  return submitLeadReliably(payload, { enableSubmitLeadFallback: true });
}
