import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCrmAccess } from "@/hooks/useCrmAccess";
import { CrmSidebar } from "@/components/crm/CrmSidebar";
import { Loader2 } from "lucide-react";

export default function CrmLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isLoading: crmLoading, hasCrmAccess } = useCrmAccess();

  console.log("[CrmLayout] authLoading:", authLoading, "crmLoading:", crmLoading, "user:", user?.id, "hasCrmAccess:", hasCrmAccess);

  if (authLoading || crmLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Auth: {authLoading ? "loading" : "done"} | CRM: {crmLoading ? "loading" : "done"}
        </span>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin-auth" replace />;
  if (!hasCrmAccess) return <Navigate to="/workspace" replace />;

  return (
    <div className="flex h-screen overflow-hidden">
      <CrmSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
