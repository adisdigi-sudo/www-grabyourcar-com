import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isAdminSubdomain } from "@/hooks/useAdminSubdomain";
import { withPreviewParams } from "@/lib/previewRouting";
import { Loader2 } from "lucide-react";

interface AdminSubdomainRouterProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that enforces admin-only routes on admin subdomain.
 * On admin.grabyourcar.com, only admin-safe routes are accessible.
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
      <main
        className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-background via-muted/30 to-background"
        role="main"
        aria-busy="true"
        data-startup-ready="admin-subdomain-auth-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading CRM access...</p>
      </main>
    );
  }

  // Define allowed paths on admin subdomain
  const allowedPaths = ["/crm", "/crm-auth", "/crm-reset-password", "/document-viewer", "/workspace", "/admin", "/admin-auth", "/admin-reset-password"];
  const isAllowedPath = allowedPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(path + "/")
  );

  // If on an allowed path, render normally
  if (isAllowedPath) {
    return <>{children}</>;
  }

  // If not on an allowed path, redirect based on auth status
  if (user) {
    return <Navigate to={withPreviewParams("/crm")} replace />;
  } else {
    return <Navigate to={withPreviewParams("/crm-auth")} replace />;
  }
};
