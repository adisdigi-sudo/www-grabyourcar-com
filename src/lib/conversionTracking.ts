/**
 * Marketing Conversion Tracking
 *
 * Records CTA interactions to:
 *   1. marketing_conversion_events table (for in-app dashboard)
 *   2. window.gtag (Google Analytics 4 / Google Ads)
 *
 * Use trackConversion() for all marketing CTAs (Call, WhatsApp, Form Submit).
 */
import { supabase } from "@/integrations/supabase/client";

export type ConversionEventType =
  | "view"
  | "form_view"
  | "call_click"
  | "whatsapp_click"
  | "form_submit"
  | "cta_click";

export interface ConversionEvent {
  event_type: ConversionEventType;
  page_path?: string;
  cta_label?: string;
  vertical?: string;
  source?: string;
  campaign?: string;
  metadata?: Record<string, unknown>;
}

const SESSION_KEY = "gyc_session_id";

const getSessionId = (): string => {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
};

const fireGA4 = (event: ConversionEvent) => {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;
  try {
    gtag("event", event.event_type, {
      event_category: "marketing_cta",
      event_label: event.cta_label || event.page_path,
      page_path: event.page_path,
      vertical: event.vertical,
      source: event.source,
      campaign: event.campaign,
    });
  } catch (e) {
    console.warn("[conversionTracking] gtag failed", e);
  }
};

export const trackConversion = async (event: ConversionEvent): Promise<void> => {
  const path =
    event.page_path ||
    (typeof window !== "undefined" ? window.location.pathname + window.location.search : "");

  // 1. Fire GA4 immediately (fire-and-forget)
  fireGA4({ ...event, page_path: path });

  // 2. Persist to DB (fire-and-forget; never block UI on tracking)
  try {
    await supabase.from("marketing_conversion_events").insert([{
      event_type: event.event_type,
      page_path: path,
      cta_label: event.cta_label || null,
      vertical: event.vertical || null,
      source: event.source || null,
      campaign: event.campaign || null,
      session_id: getSessionId(),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      referrer: typeof document !== "undefined" ? document.referrer : null,
      metadata: (event.metadata as Record<string, unknown>) || {},
    }]);
  } catch (e) {
    // Tracking should never break the app
    console.warn("[conversionTracking] db insert failed", e);
  }
};

/** Convenience helpers */
export const trackCallClick = (label: string, vertical?: string) =>
  trackConversion({ event_type: "call_click", cta_label: label, vertical });

export const trackWhatsAppClick = (label: string, vertical?: string) =>
  trackConversion({ event_type: "whatsapp_click", cta_label: label, vertical });

export const trackFormSubmit = (label: string, vertical?: string, metadata?: Record<string, unknown>) =>
  trackConversion({ event_type: "form_submit", cta_label: label, vertical, metadata });

export const trackPageView = (vertical?: string) =>
  trackConversion({ event_type: "view", vertical });
