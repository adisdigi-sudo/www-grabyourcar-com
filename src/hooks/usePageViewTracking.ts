import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Fires gtag + fbq page_view on every SPA route change */
export const usePageViewTracking = (enabled: boolean = true) => {
  const location = useLocation();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    import("@/lib/adTracking")
      .then(({ trackPageView }) => {
        if (!cancelled) {
          trackPageView(location.pathname + location.search);
        }
      })
      .catch((error) => {
        console.warn("[AdTracking] Page view effect failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, location.pathname, location.search]);
};
