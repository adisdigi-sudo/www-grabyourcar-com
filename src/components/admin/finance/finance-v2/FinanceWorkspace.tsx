import { useState, lazy, Suspense, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Briefcase, BarChart3, Crown, Calculator } from "lucide-react";

const AccountantView = lazy(() => import("./accountant/AccountantView"));
const CFOView = lazy(() => import("./cfo/CFOView"));
const FounderView = lazy(() => import("./founder/FounderView"));

type Role = "accountant" | "cfo" | "founder";

const ROLES: { id: Role; label: string; icon: React.ElementType; tagline: string; accent: string }[] = [
  {
    id: "accountant",
    label: "Accountant",
    icon: Calculator,
    tagline: "Daily entries, vendors, reconciliation",
    accent: "from-emerald-600 to-emerald-700",
  },
  {
    id: "cfo",
    label: "CFO",
    icon: BarChart3,
    tagline: "Budget · Approvals · P&L Design · Targets",
    accent: "from-blue-700 to-indigo-700",
  },
  {
    id: "founder",
    label: "Founder",
    icon: Crown,
    tagline: "Executive view · Final approvals · Reports",
    accent: "from-amber-600 to-orange-700",
  },
];

export const FinanceWorkspace = () => {
  const [role, setRole] = useState<Role>("cfo");

  const active = useMemo(() => ROLES.find((r) => r.id === role)!, [role]);

  return (
    <div className="space-y-6">
      {/* Corporate Header */}
      <div className="rounded-2xl border bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold tracking-tight text-slate-900">
                Finance Office
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-xl">
                Corporate finance command center — accounting, planning, approvals, and executive oversight in one workspace.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Currently viewing</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">{active.label} View</p>
          </div>
        </div>
      </div>

      {/* Role Switcher — corporate cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ROLES.map((r) => {
          const Icon = r.icon;
          const isActive = r.id === role;
          return (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={cn(
                "group relative text-left rounded-xl border p-4 transition-all overflow-hidden",
                isActive
                  ? "border-slate-900 shadow-lg bg-white"
                  : "border-slate-200 bg-white/60 hover:border-slate-400 hover:shadow"
              )}
            >
              {isActive && (
                <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", r.accent)} />
              )}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-to-br text-white shadow-sm",
                    r.accent
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900">{r.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{r.tagline}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active View */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
          </div>
        }
      >
        {role === "accountant" && <AccountantView />}
        {role === "cfo" && <CFOView />}
        {role === "founder" && <FounderView />}
      </Suspense>
    </div>
  );
};

export default FinanceWorkspace;
