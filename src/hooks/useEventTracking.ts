import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Behavioral event tracking hook.
 * Tracks user actions and feeds them into the analytics_events table
 * for WhatsApp segmentation and personalized campaigns.
 */

type EventType =
  | "car_view"
  | "variant_click"
  | "emi_interaction"
  | "brochure_download"
  | "color_change"
  | "price_check"
  | "loan_interest"
  | "insurance_interest"
  | "test_drive_request"
  | "dealer_view"
  | "compare_add"
  | "accessory_view"
  | "accessory_purchase"
  | "form_start"
  | "form_abandon"
  | "whatsapp_click"
  | "call_click"
  | "share_click"
  | "booking_start"
  | "payment_init"
  | "page_view";

interface EventData {
  car_slug?: string;
  car_name?: string;
  car_brand?: string;
  variant_name?: string;
  price?: string;
  city?: string;
  emi_amount?: number;
  loan_amount?: number;
  tenure_months?: number;
  color_name?: string;
  brochure_url?: string;
  accessory_id?: number;
  accessory_name?: string;
  dealer_name?: string;
  form_type?: string;
  source?: string;
  [key: string]: unknown;
}

// Simple session ID (persists per tab)
const getSessionId = (() => {
  let sessionId: string | null = null;
  return () => {
    if (!sessionId) {
      sessionId = sessionStorage.getItem("gyc_session") || crypto.randomUUID();
      sessionStorage.setItem("gyc_session", sessionId);
    }
    return sessionId;
  };
})();

const getDeviceType = (): string => {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
};

export function useEventTracking() {
  const track = useCallback(async (eventType: EventType, data?: EventData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("analytics_events").insert({
        event_type: eventType,
        event_data: data as any,
        user_id: user?.id || null,
        session_id: getSessionId(),
        page_url: window.location.pathname,
        device_type: getDeviceType(),
        referrer: document.referrer || null,
      });
    } catch (err) {
      // Silent fail — tracking should never break UX
      console.debug("Event tracking:", err);
    }
  }, []);

  // Convenience methods for common events
  const trackCarView = useCallback((slug: string, name: string, brand: string) => {
    track("car_view", { car_slug: slug, car_name: name, car_brand: brand });
  }, [track]);

  const trackVariantClick = useCallback((slug: string, variantName: string, price?: string) => {
    track("variant_click", { car_slug: slug, variant_name: variantName, price });
  }, [track]);

  const trackEMIInteraction = useCallback((slug: string, emiAmount: number, loanAmount: number, tenure: number) => {
    track("emi_interaction", { car_slug: slug, emi_amount: emiAmount, loan_amount: loanAmount, tenure_months: tenure });
  }, [track]);

  const trackBrochureDownload = useCallback((slug: string, name: string) => {
    track("brochure_download", { car_slug: slug, car_name: name });
  }, [track]);

  const trackColorChange = useCallback((slug: string, colorName: string) => {
    track("color_change", { car_slug: slug, color_name: colorName });
  }, [track]);

  const trackLoanInterest = useCallback((slug?: string) => {
    track("loan_interest", { car_slug: slug });
  }, [track]);

  const trackInsuranceInterest = useCallback(() => {
    track("insurance_interest", {});
  }, [track]);

  const trackWhatsAppClick = useCallback((slug?: string, source?: string) => {
    track("whatsapp_click", { car_slug: slug, source });
  }, [track]);

  const trackCallClick = useCallback((slug?: string) => {
    track("call_click", { car_slug: slug });
  }, [track]);

  const trackFormStart = useCallback((formType: string, slug?: string) => {
    track("form_start", { form_type: formType, car_slug: slug });
  }, [track]);

  const trackFormAbandon = useCallback((formType: string, slug?: string) => {
    track("form_abandon", { form_type: formType, car_slug: slug });
  }, [track]);

  const trackDealerView = useCallback((dealerName: string) => {
    track("dealer_view", { dealer_name: dealerName });
  }, [track]);

  const trackAccessoryView = useCallback((id: number, name: string) => {
    track("accessory_view", { accessory_id: id, accessory_name: name });
  }, [track]);

  return {
    track,
    trackCarView,
    trackVariantClick,
    trackEMIInteraction,
    trackBrochureDownload,
    trackColorChange,
    trackLoanInterest,
    trackInsuranceInterest,
    trackWhatsAppClick,
    trackCallClick,
    trackFormStart,
    trackFormAbandon,
    trackDealerView,
    trackAccessoryView,
  };
}
