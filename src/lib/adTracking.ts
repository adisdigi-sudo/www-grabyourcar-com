/**
 * Centralized Ad Tracking — Google Ads (gtag.js) + Meta Pixel (fbq)
 * IDs are loaded dynamically from admin_settings (ad_tracking_config).
 */

import { fetchAdTrackingConfig, type AdTrackingConfig } from "@/hooks/useAdTrackingConfig";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

const isBrowser = () => typeof window !== "undefined";

const safeStorageGet = (key: string): string | null => {
  if (!isBrowser()) return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const DEBUG = () => safeStorageGet("debug_ads") === "true";
const log = (...args: any[]) => {
  if (DEBUG()) console.log("[AdTracking]", ...args);
};

let _cfg: AdTrackingConfig | null = null;

/** Ensure config is loaded (cached after first call) */
const ensureConfig = async (): Promise<AdTrackingConfig | null> => {
  if (!_cfg) _cfg = await fetchAdTrackingConfig();
  return _cfg;
};

/* ─── Google Ads conversion ─── */
const gtagConversion = (conversionLabel: string, extras?: Record<string, any>) => {
  if (!conversionLabel || !isBrowser()) return;
  if (window.gtag) {
    window.gtag("event", "conversion", { send_to: conversionLabel, ...extras });
    log("gtag conversion →", conversionLabel, extras);
  }
};

/* ─── Meta Pixel event ─── */
const fbqTrack = (event: string, params?: Record<string, any>) => {
  if (!isBrowser()) return;
  if (window.fbq) {
    window.fbq("track", event, params);
    log("fbq track →", event, params);
  }
};

/* ─── Page view (SPA route change) ─── */
export const trackPageView = (url: string) => {
  if (!isBrowser()) return;

  try {
    if (window.gtag) {
      window.gtag("event", "page_view", { page_path: url });
    }
    if (window.fbq) {
      window.fbq("track", "PageView");
    }
    log("pageView →", url);
  } catch (error) {
    console.warn("[AdTracking] Failed to track page view", error);
  }
};

/* ─── Lead form conversion ─── */
export const trackLeadConversion = async (source: string, extras?: Record<string, any>) => {
  const cfg = await ensureConfig();
  if (cfg) {
    gtagConversion(cfg.google_lead_label, { event_category: "lead", event_label: source, ...extras });
  }
  fbqTrack("Lead", { content_name: source, ...extras });
  log("leadConversion →", source);
};

/* ─── WhatsApp click conversion ─── */
export const trackWhatsAppConversion = async (context?: string) => {
  const cfg = await ensureConfig();
  if (cfg) {
    gtagConversion(cfg.google_whatsapp_label, { event_category: "engagement", event_label: context || "whatsapp_click" });
  }
  fbqTrack("Contact", { content_name: context || "whatsapp_click" });
  log("whatsappConversion →", context);
};

/* ─── Call click conversion ─── */
export const trackCallConversion = async () => {
  const cfg = await ensureConfig();
  if (cfg) {
    gtagConversion(cfg.google_call_label, { event_category: "engagement", event_label: "call_click" });
  }
  fbqTrack("Contact", { content_name: "call_click" });
  log("callConversion");
};

/* ─── UTM parameter capture ─── */
export const captureUTMParams = (): Record<string, string | null> => {
  if (!isBrowser()) {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    };
  }

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

/** Initialize dynamic gtag config (call once on app load) */
export const initDynamicTracking = async () => {
  if (!isBrowser()) return;

  const cfg = await ensureConfig();
  try {
    if (cfg?.google_ads_id && window.gtag) {
      window.gtag("config", cfg.google_ads_id, { send_page_view: false });
      log("Dynamic gtag config →", cfg.google_ads_id);
    }
  } catch (error) {
    console.warn("[AdTracking] Failed to initialize tracking", error);
  }
};
