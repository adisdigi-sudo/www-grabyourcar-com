import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Activity,
  Megaphone,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
} from "lucide-react";
import { useCrmAccess } from "@/hooks/useCrmAccess";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { to: "/crm", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/crm/customers", icon: Users, label: "Customers" },
  { to: "/crm/pipeline", icon: GitBranch, label: "Pipelines" },
  { to: "/crm/activities", icon: Activity, label: "Activities" },
  { to: "/crm/marketing", icon: Megaphone, label: "Marketing" },
  { to: "/crm/reports", icon: BarChart3, label: "Reports" },
];

const adminItems = [
  { to: "/crm/team", icon: UserCog, label: "Team Management" },
  { to: "/crm/settings", icon: Settings, label: "Settings" },
];

export function CrmSidebar() {
  const { canManageTeam, crmUser } = useCrmAccess();
  const { signOut } = useAuth();

  return (
    <aside className="w-64 h-screen flex flex-col border-r bg-background">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">GrabYourCar CRM</h2>
        {crmUser && <p className="text-sm text-muted-foreground">{crmUser.name}</p>}
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}

        {canManageTeam && (
          <>
            <div className="border-t my-2" />
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="p-2 border-t">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm w-full hover:bg-destructive/10 text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
