import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Redirects admin.grabyourcar.com to /admin-auth or /admin automatically
 * This component should be placed at the top level of the app
 */
export const AdminSubdomainRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    const hostname = window.location.hostname;
    const isAdminSubdomain = hostname.startsWith("admin.");
    
    // Only handle redirects on admin subdomain
    if (!isAdminSubdomain) return;
    
    // Wait for auth to load
    if (loading) return;
    
    // If at root path, redirect based on auth status
    if (location.pathname === "/") {
      if (user) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/admin-auth", { replace: true });
      }
    }
    
    // If trying to access regular auth page on admin subdomain, redirect to admin auth
    if (location.pathname === "/auth") {
      navigate("/admin-auth", { replace: true });
    }
  }, [location.pathname, navigate, user, loading]);

  return null;
};
