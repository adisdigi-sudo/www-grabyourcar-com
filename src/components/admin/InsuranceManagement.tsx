import { useState } from "react";
import {
  Shield, FileText, HelpCircle, Package, Globe, Users, BarChart3,
  LayoutDashboard, UserCheck, ShieldCheck, RefreshCw, ListChecks,
  DollarSign, TrendingUp, FolderOpen, Briefcase, Sparkles, FileSpreadsheet, Zap,
  MessageSquare, GitBranch, Settings, Car, Search, UserPlus, FilePlus,
  ChevronRight, Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { InsurancePlansAdmin } from "./insurance/InsurancePlansAdmin";
import { InsuranceContentAdmin } from "./insurance/InsuranceContentAdmin";
import { InsuranceFAQsAdmin } from "./insurance/InsuranceFAQsAdmin";
import { InsuranceAddonsAdmin } from "./insurance/InsuranceAddonsAdmin";
import { InsuranceScraperAdmin } from "./insurance/InsuranceScraperAdmin";
import { InsuranceLeadsAdmin } from "./insurance/InsuranceLeadsAdmin";
import { InsuranceCRMDashboard } from "./insurance/InsuranceCRMDashboard";
import { InsuranceClientsManager } from "./insurance/InsuranceClientsManager";
import { InsurancePoliciesManager } from "./insurance/InsurancePoliciesManager";
import { InsuranceRenewalsEngine } from "./insurance/InsuranceRenewalsEngine";
import { InsuranceTasksManager } from "./insurance/InsuranceTasksManager";
import { InsuranceCommissionsTracker } from "./insurance/InsuranceCommissionsTracker";
import { InsuranceAnalyticsDashboard } from "./insurance/InsuranceAnalyticsDashboard";
import { InsuranceDocumentVault } from "./insurance/InsuranceDocumentVault";
import { InsuranceAdvisorsManager } from "./insurance/InsuranceAdvisorsManager";
import { InsuranceSmartExtractor } from "./insurance/InsuranceSmartExtractor";
import { InsuranceImportExport } from "./insurance/InsuranceImportExport";
import { InsuranceCrossSellEngine } from "./insurance/InsuranceCrossSellEngine";
import { InsuranceAutomationPanel } from "./insurance/InsuranceAutomationPanel";
import { InsuranceTemplatesManager } from "./insurance/InsuranceTemplatesManager";
import { InsuranceStatusPipeline } from "./insurance/InsuranceStatusPipeline";
import { InsuranceReportsModule } from "./insurance/InsuranceReportsModule";
import { InsuranceVehicleDocValidity } from "./insurance/InsuranceVehicleDocValidity";
import { InsuranceManageAgents } from "./insurance/InsuranceManageAgents";
import { InsuranceClientSearch } from "./insurance/InsuranceClientSearch";
import { InsuranceAddLeadForm } from "./insurance/InsuranceAddLeadForm";
import { InsuranceAddPolicyForm } from "./insurance/InsuranceAddPolicyForm";

type NavItem = { id: string; label: string; icon: any };
type NavGroup = { group: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "analytics", label: "Analytics", icon: TrendingUp },
      { id: "reports", label: "Reports", icon: FileSpreadsheet },
    ],
  },
  {
    group: "Quick Actions",
    items: [
      { id: "addlead", label: "Add Lead", icon: UserPlus },
      { id: "addpolicy", label: "Add Policy", icon: FilePlus },
      { id: "extractor", label: "AI Extractor", icon: Sparkles },
      { id: "clientsearch", label: "Client Search", icon: Search },
    ],
  },
  {
    group: "CRM",
    items: [
      { id: "clients", label: "Clients", icon: UserCheck },
      { id: "policies", label: "Policies", icon: ShieldCheck },
      { id: "pipeline", label: "Pipeline", icon: GitBranch },
      { id: "tasks", label: "Tasks", icon: ListChecks },
    ],
  },
  {
    group: "Revenue Engine",
    items: [
      { id: "renewals", label: "Renewals", icon: RefreshCw },
      { id: "crosssell", label: "Cross-Sell", icon: Zap },
      { id: "commissions", label: "Commissions", icon: DollarSign },
    ],
  },
  {
    group: "Data & Docs",
    items: [
      { id: "importexport", label: "Import / Export", icon: FileSpreadsheet },
      { id: "documents", label: "Documents", icon: FolderOpen },
      { id: "vehdocs", label: "Vehicle Docs", icon: Car },
    ],
  },
  {
    group: "Team",
    items: [
      { id: "advisors", label: "Advisors", icon: Briefcase },
      { id: "manageagents", label: "Agents", icon: Users },
    ],
  },
  {
    group: "Settings & Content",
    items: [
      { id: "automation", label: "Automation", icon: Settings },
      { id: "templates", label: "Templates", icon: MessageSquare },
      { id: "plans", label: "Plans", icon: FileText },
      { id: "content", label: "Content", icon: Globe },
      { id: "faqs", label: "FAQs", icon: HelpCircle },
      { id: "addons", label: "Add-ons", icon: Package },
      { id: "scraper", label: "Scraper", icon: BarChart3 },
      { id: "leads", label: "Legacy Leads", icon: Users },
    ],
  },
];

const COMPONENTS: Record<string, React.FC> = {
  dashboard: InsuranceCRMDashboard,
  addlead: InsuranceAddLeadForm,
  addpolicy: InsuranceAddPolicyForm,
  clients: InsuranceClientsManager,
  policies: InsurancePoliciesManager,
  renewals: InsuranceRenewalsEngine,
  extractor: InsuranceSmartExtractor,
  crosssell: InsuranceCrossSellEngine,
  tasks: InsuranceTasksManager,
  commissions: InsuranceCommissionsTracker,
  documents: InsuranceDocumentVault,
  importexport: InsuranceImportExport,
  advisors: InsuranceAdvisorsManager,
  analytics: InsuranceAnalyticsDashboard,
  plans: InsurancePlansAdmin,
  content: InsuranceContentAdmin,
  faqs: InsuranceFAQsAdmin,
  addons: InsuranceAddonsAdmin,
  automation: InsuranceAutomationPanel,
  templates: InsuranceTemplatesManager,
  reports: InsuranceReportsModule,
  vehdocs: InsuranceVehicleDocValidity,
  pipeline: InsuranceStatusPipeline,
  manageagents: InsuranceManageAgents,
  clientsearch: InsuranceClientSearch,
  scraper: InsuranceScraperAdmin,
  leads: InsuranceLeadsAdmin,
};

function SidebarNav({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <ScrollArea className="h-full">
      <div className="py-3 px-2 space-y-4">
        {NAV_GROUPS.map((g) => (
          <div key={g.group}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-1.5">
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
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
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
      <aside className="hidden lg:flex w-56 xl:w-60 border-r bg-card/50 flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b">
          <h1 className="text-sm font-bold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Insurance OS
          </h1>
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
            <SheetContent side="left" className="w-60 p-0">
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
