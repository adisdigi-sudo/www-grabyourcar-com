import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Fires gtag + fbq page_view on every SPA route change.
 *  Defensively swallows the "useLocation outside Router" invariant so that
 *  a transient mount (HMR, error-boundary remount) cannot blank the screen.
 */
export const usePageViewTracking = (enabled: boolean = true) => {
  let location: { pathname: string; search: string } | null = null;
  try {
    location = useLocation();
  } catch (err) {
    // Router context not yet available — skip silently.
    location = null;
  }

  useEffect(() => {
    if (!enabled || !location) {
      return;
    }

    let cancelled = false;

    import("@/lib/adTracking")
      .then(({ trackPageView }) => {
        if (!cancelled) {
          trackPageView(location!.pathname + location!.search);
        }
      })
      .catch((error) => {
        console.warn("[AdTracking] Page view effect failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, location?.pathname, location?.search]);
};
