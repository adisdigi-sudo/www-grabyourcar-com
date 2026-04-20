import { useEffect } from "react";

/** Fires gtag + fbq page_view on every SPA route change. */
export const usePageViewTracking = ({
  enabled = true,
  pathname,
  search = "",
}: {
  enabled?: boolean;
  pathname: string;
  search?: string;
}) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    import("@/lib/adTracking")
      .then(({ trackPageView }) => {
        if (!cancelled) {
          trackPageView(pathname + search);
        }
      })
      .catch((error) => {
        console.warn("[AdTracking] Page view effect failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, pathname, search]);
};
