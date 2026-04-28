import { useMemo } from "react";

/**
 * Hook to detect if the current hostname is the admin subdomain
 */
export const useAdminSubdomain = () => {
  const isAdminSubdomain = useMemo(() => {
    if (typeof window === "undefined") return false;
    const hostname = window.location.hostname.toLowerCase();
    return (
      hostname.startsWith("admin.") ||
      hostname.startsWith("www.admin.") ||
      hostname === "admin.grabyourcar.com" ||
      hostname === "www.admin.grabyourcar.com"
    );
  }, []);

  return { isAdminSubdomain };
};

/**
 * Utility function to check admin subdomain (for use outside React components)
 */
export const isAdminSubdomain = (): boolean => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname.startsWith("admin.") ||
    hostname.startsWith("www.admin.") ||
    hostname === "admin.grabyourcar.com" ||
    hostname === "www.admin.grabyourcar.com"
  );
};
