import { useCrmAccess } from "@/hooks/useCrmAccess";

export default function CrmDashboard() {
  const { crmUser, accessibleVerticals, isSuperAdmin, isManager, isExecutive } = useCrmAccess();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {crmUser?.name || "User"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Role</p>
          <p className="text-lg font-semibold">
            {isSuperAdmin ? "Super Admin" : isManager ? "Manager" : isExecutive ? "Executive" : "User"}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Verticals</p>
          <p className="text-lg font-semibold">{accessibleVerticals.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Access</p>
          <p className="text-lg font-semibold">{accessibleVerticals.join(", ") || "None"}</p>
        </div>
      </div>

      {/* Dashboard widgets will be added in future steps */}
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Dashboard widgets coming soon
      </div>
    </div>
  );
}
