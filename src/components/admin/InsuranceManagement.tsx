import { useState } from "react";
import {
  Shield, LayoutDashboard, FileSpreadsheet,
  UserPlus, Menu, RefreshCw,
  GitBranch, FileUp, PhoneCall
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { InsurancePipelineBoard } from "./insurance/InsurancePipelineBoard";
import { InsuranceCRMDashboard } from "./insurance/InsuranceCRMDashboard";
import { InsuranceImportExport } from "./insurance/InsuranceImportExport";
import { InsuranceAddLeadForm } from "./insurance/InsuranceAddLeadForm";
import { InsuranceRenewalsEngine } from "./insurance/InsuranceRenewalsEngine";
import { InsuranceSmartExtractor } from "./insurance/InsuranceSmartExtractor";
import { InsuranceSmartCalling } from "./insurance/InsuranceSmartCalling";

type NavItem = { id: string; label: string; icon: any; badge?: string };
type NavGroup = { group: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Pipeline",
    items: [
      { id: "pipeline", label: "Lead Pipeline", icon: GitBranch, badge: "🔥" },
      { id: "smart-calling", label: "Smart Calling", icon: PhoneCall, badge: "⚡" },
      { id: "policy-book", label: "Policy Book", icon: LayoutDashboard },
      { id: "renewals", label: "Renewal Engine", icon: RefreshCw },
    ],
  },
  {
    group: "Quick Actions",
    items: [
      { id: "add-lead", label: "Add Lead", icon: UserPlus },
      { id: "extract", label: "Extract Policy", icon: FileUp },
      { id: "import-export", label: "Import / Export", icon: FileSpreadsheet },
    ],
  },
];

const COMPONENTS: Record<string, React.FC<any>> = {
  "pipeline": InsurancePipelineBoard,
  "smart-calling": InsuranceSmartCalling,
  "policy-book": InsuranceCRMDashboard,
  "renewals": InsuranceRenewalsEngine,
  "add-lead": InsuranceAddLeadForm,
  "extract": InsuranceSmartExtractor,
  "import-export": InsuranceImportExport,
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
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.badge && <span className="text-xs ml-auto">{item.badge}</span>}
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
  const [active, setActive] = useState("pipeline");
  const [mobileOpen, setMobileOpen] = useState(false);

  const ActiveComponent = COMPONENTS[active] || InsurancePipelineBoard;
  const activeLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === active)?.label || "Pipeline";

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
            <Shield className="h-4 w-4 text-emerald-600" />
            Insurance OS
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Motor Insurance CRM</p>
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
                <SheetTitle className="text-sm font-bold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Insurance OS
                </SheetTitle>
                <SheetDescription className="sr-only">Insurance workspace navigation</SheetDescription>
              </div>
              <SidebarNav active={active} onSelect={handleSelect} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold">{activeLabel}</span>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <ActiveComponent onNavigate={handleSelect} />
        </main>
      </div>
    </div>
  );
}
