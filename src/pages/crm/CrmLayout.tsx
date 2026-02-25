import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCrmAccess } from "@/hooks/useCrmAccess";
import { CrmSidebar } from "@/components/crm/CrmSidebar";
import { Loader2 } from "lucide-react";

export default function CrmLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isLoading: crmLoading, crmUser } = useCrmAccess();

  if (authLoading || crmLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/admin-auth" replace />;
  if (!crmUser) return <Navigate to="/workspace" replace />;

  return (
    <div className="flex h-screen overflow-hidden">
      <CrmSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
