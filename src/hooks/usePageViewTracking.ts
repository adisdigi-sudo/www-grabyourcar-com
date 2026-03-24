import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/adTracking";

/** Fires gtag + fbq page_view on every SPA route change */
export const usePageViewTracking = (enabled: boolean = true) => {
  const location = useLocation();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    try {
      trackPageView(location.pathname + location.search);
    } catch (error) {
      console.warn("[AdTracking] Page view effect failed", error);
    }
  }, [enabled, location.pathname, location.search]);
};
