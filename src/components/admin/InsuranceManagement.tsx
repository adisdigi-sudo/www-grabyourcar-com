import { useState } from "react";
import {
  Shield, LayoutDashboard, Users, FileSpreadsheet,
  UserPlus, FilePlus, Search, Menu, RefreshCw,
  GitBranch, MessageSquare, ClipboardList, FileUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { InsuranceCRMDashboard } from "./insurance/InsuranceCRMDashboard";
import { InsuranceClientsManager } from "./insurance/InsuranceClientsManager";
import { InsuranceImportExport } from "./insurance/InsuranceImportExport";
import { InsuranceAddLeadForm } from "./insurance/InsuranceAddLeadForm";
import { InsuranceAddPolicyForm } from "./insurance/InsuranceAddPolicyForm";
import { InsuranceClientSearch } from "./insurance/InsuranceClientSearch";
import { InsuranceRenewalsEngine } from "./insurance/InsuranceRenewalsEngine";
import { InsuranceStatusPipeline } from "./insurance/InsuranceStatusPipeline";
import { InsuranceTemplatesManager } from "./insurance/InsuranceTemplatesManager";
import { InsuranceSmartExtractor } from "./insurance/InsuranceSmartExtractor";

type NavItem = { id: string; label: string; icon: any };
type NavGroup = { group: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Main",
    items: [
      { id: "dashboard", label: "Policy Dashboard", icon: LayoutDashboard },
      { id: "clients", label: "Clients", icon: Users },
      { id: "pipeline", label: "Sales Pipeline", icon: GitBranch },
      { id: "renewals", label: "Renewal Engine", icon: RefreshCw },
    ],
  },
  {
    group: "Quick Actions",
    items: [
      { id: "addlead", label: "Add Lead", icon: UserPlus },
      { id: "addpolicy", label: "Add Policy", icon: FilePlus },
      { id: "extract", label: "Extract Policy", icon: FileUp },
      { id: "clientsearch", label: "Search", icon: Search },
    ],
  },
  {
    group: "Tools",
    items: [
      { id: "templates", label: "Message Templates", icon: MessageSquare },
      { id: "importexport", label: "Import / Export", icon: FileSpreadsheet },
    ],
  },
];

const COMPONENTS: Record<string, React.FC> = {
  dashboard: InsuranceCRMDashboard,
  clients: InsuranceClientsManager,
  pipeline: InsuranceStatusPipeline,
  renewals: InsuranceRenewalsEngine,
  addlead: InsuranceAddLeadForm,
  addpolicy: InsuranceAddPolicyForm,
  extract: InsuranceSmartExtractor,
  clientsearch: InsuranceClientSearch,
  templates: InsuranceTemplatesManager,
  importexport: InsuranceImportExport,
};

function SidebarNav({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <ScrollArea className="h-full">
      <div className="py-4 px-3 space-y-5">
        {NAV_GROUPS.map((g) => (
          <div key={g.group}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-2">
              {g.group}
            </p>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function InsuranceManagement() {
  const [active, setActive] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const ActiveComponent = COMPONENTS[active] || InsuranceCRMDashboard;
  const activeLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === active)?.label || "Dashboard";

  const handleSelect = (id: string) => {
    setActive(id);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -mx-4 -mt-2 sm:-mx-6">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 border-r bg-card/50 flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b">
          <h1 className="text-sm font-bold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Insurance OS
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Operations Engine</p>
        </div>
        <SidebarNav active={active} onSelect={handleSelect} />
      </aside>

      {/* Mobile Header + Sheet */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b bg-card/50">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0">
              <div className="px-4 py-3 border-b">
                <h1 className="text-sm font-bold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Insurance OS
                </h1>
              </div>
              <SidebarNav active={active} onSelect={handleSelect} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold">{activeLabel}</span>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
