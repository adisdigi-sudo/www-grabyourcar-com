import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Redirects admin.grabyourcar.com to /admin automatically
 * This component should be placed at the top level of the app
 */
export const AdminSubdomainRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hostname = window.location.hostname;
    const isAdminSubdomain = hostname.startsWith("admin.");
    
    // If on admin subdomain and at root path, redirect to /admin
    if (isAdminSubdomain && location.pathname === "/") {
      navigate("/admin", { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};
