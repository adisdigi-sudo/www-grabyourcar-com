/**
 * Centralized Ad Tracking — Google Ads (gtag.js) + Meta Pixel (fbq)
 *
 * Replace placeholder IDs in index.html:
 *   - Google Ads:  AW-XXXXXXXXXX / AW-XXXXXXXXXX/YYYYYYYYYYYY
 *   - Meta Pixel:  XXXXXXXXXXXXXXXXX
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

const DEBUG = () => localStorage.getItem("debug_ads") === "true";

const log = (...args: any[]) => {
  if (DEBUG()) console.log("[AdTracking]", ...args);
};

/* ─── Google Ads conversion ─── */
const gtagConversion = (conversionLabel: string, extras?: Record<string, any>) => {
  if (window.gtag) {
    window.gtag("event", "conversion", {
      send_to: conversionLabel,
      ...extras,
    });
    log("gtag conversion →", conversionLabel, extras);
  }
};

/* ─── Meta Pixel event ─── */
const fbqTrack = (event: string, params?: Record<string, any>) => {
  if (window.fbq) {
    window.fbq("track", event, params);
    log("fbq track →", event, params);
  }
};

/* ─── Page view (SPA route change) ─── */
export const trackPageView = (url: string) => {
  if (window.gtag) {
    window.gtag("event", "page_view", { page_path: url });
  }
  if (window.fbq) {
    window.fbq("track", "PageView");
  }
  log("pageView →", url);
};

/* ─── Lead form conversion (fire ONLY after successful DB insert) ─── */
export const trackLeadConversion = (source: string, extras?: Record<string, any>) => {
  // Replace AW-XXXXXXXXXX/YYYYYYYYYYYY with your real conversion label
  gtagConversion("AW-XXXXXXXXXX/YYYYYYYYYYYY", { event_category: "lead", event_label: source, ...extras });
  fbqTrack("Lead", { content_name: source, ...extras });
  log("leadConversion →", source);
};

/* ─── WhatsApp click conversion ─── */
export const trackWhatsAppConversion = (context?: string) => {
  gtagConversion("AW-XXXXXXXXXX/WHATSAPP_LABEL", { event_category: "engagement", event_label: context || "whatsapp_click" });
  fbqTrack("Contact", { content_name: context || "whatsapp_click" });
  log("whatsappConversion →", context);
};

/* ─── Call click conversion ─── */
export const trackCallConversion = () => {
  gtagConversion("AW-XXXXXXXXXX/CALL_LABEL", { event_category: "engagement", event_label: "call_click" });
  fbqTrack("Contact", { content_name: "call_click" });
  log("callConversion");
};

/* ─── UTM parameter capture ─── */
export const captureUTMParams = (): Record<string, string | null> => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
  };
};

/** Returns only non-null UTM values, safe to spread into a Supabase insert */
export const getUTMFields = () => {
  const utm = captureUTMParams();
  const fields: Record<string, string> = {};
  if (utm.utm_source) fields.utm_source = utm.utm_source;
  if (utm.utm_medium) fields.utm_medium = utm.utm_medium;
  if (utm.utm_campaign) fields.utm_campaign = utm.utm_campaign;
  return fields;
};
