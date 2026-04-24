import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { bootVisitorTracker, trackPageView } from "@/lib/visitorTracker";

/**
 * Mounts the visitor tracker once and reports page views on every SPA
 * route change. Skips admin/CRM routes.
 */
export const useVisitorTracking = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = location.pathname;
    // Skip admin/CRM/auth routes — those are internal tools, not customer traffic.
    if (
      path.startsWith("/admin") ||
      path.startsWith("/crm") ||
      path.startsWith("/workspace") ||
      path.startsWith("/auth") ||
      path.startsWith("/insurance-doc")
    ) {
      return;
    }
    bootVisitorTracker();
    void trackPageView(path + location.search);
  }, [location.pathname, location.search]);
};
