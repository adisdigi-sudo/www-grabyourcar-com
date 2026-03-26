import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isAdminSubdomain } from "@/hooks/useAdminSubdomain";
import { Loader2 } from "lucide-react";

interface AdminSubdomainRouterProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that enforces admin-only routes on admin subdomain.
 * On admin.grabyourcar.com, only /admin, /admin-auth, and /admin-reset-password are accessible.
 * All other routes redirect to /admin-auth (if not logged in) or /admin (if logged in).
 */
export const AdminSubdomainRouter = ({ children }: AdminSubdomainRouterProps) => {
  const location = useLocation();
  const { user, loading } = useAuth();
  
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isAdmin = isAdminSubdomain();
  
  // Only apply special routing on admin subdomain
  if (!isAdmin) {
    return <>{children}</>;
  }

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  // Define allowed paths on admin subdomain
  const allowedPaths = ["/crm", "/crm-auth", "/crm-reset-password", "/workspace", "/admin", "/admin-auth", "/admin-reset-password"];
  const isAllowedPath = allowedPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(path + "/")
  );

  // If on an allowed path, render normally
  if (isAllowedPath) {
    return <>{children}</>;
  }

  // If not on an allowed path, redirect based on auth status
  if (user) {
    return <Navigate to="/crm" replace />;
  } else {
    return <Navigate to="/crm-auth" replace />;
  }
};
