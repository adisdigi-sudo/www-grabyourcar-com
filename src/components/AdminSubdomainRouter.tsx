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
  
  const isAdmin = isAdminSubdomain();

  // Only apply special routing on admin subdomain
  if (!isAdmin) {
    return <>{children}</>;
  }

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Define allowed paths on admin subdomain
  const allowedPaths = ["/admin", "/admin-auth", "/admin-reset-password", "/workspace", "/crm"];
  const isAllowedPath = allowedPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(path + "/")
  );

  // If on an allowed path, render normally
  if (isAllowedPath) {
    return <>{children}</>;
  }

  // If not on allowed path, redirect based on auth status
  if (user) {
    return <Navigate to="/crm" replace />;
  } else {
    return <Navigate to="/admin-auth" replace />;
  }
};
