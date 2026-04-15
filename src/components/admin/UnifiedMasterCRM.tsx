import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, Car, Shield, Banknote, ShoppingBag, Sparkles, LayoutDashboard,
  Phone, FileText, RefreshCw, Loader2, UserCheck, ShieldCheck, ListChecks,
  DollarSign, TrendingUp, FolderOpen, Briefcase, FileSpreadsheet, Zap,
  MessageSquare, GitBranch, Settings, Search, Globe, Package, HelpCircle,
  ArrowRight, CheckCircle2, Clock, BarChart3, Calendar, Wrench, Send
} from "lucide-react";

// Insurance sub-components
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
import { InsurancePipelineBoard } from "./insurance/InsurancePipelineBoard";
import { InsuranceReportsModule } from "./insurance/InsuranceReportsModule";
import { InsuranceVehicleDocValidity } from "./insurance/InsuranceVehicleDocValidity";
import { InsuranceManageAgents } from "./insurance/InsuranceManageAgents";
import { InsuranceClientSearch } from "./insurance/InsuranceClientSearch";
import { InsurancePlansAdmin } from "./insurance/InsurancePlansAdmin";
import { InsuranceContentAdmin } from "./insurance/InsuranceContentAdmin";
import { InsuranceFAQsAdmin } from "./insurance/InsuranceFAQsAdmin";
import { InsuranceAddonsAdmin } from "./insurance/InsuranceAddonsAdmin";
import { InsuranceScraperAdmin } from "./insurance/InsuranceScraperAdmin";
import { InsuranceLeadsAdmin } from "./insurance/InsuranceLeadsAdmin";
import { InsuranceProspectPool } from "./insurance/InsuranceProspectPool";
import { InsuranceDataHealth } from "./insurance/InsuranceDataHealth";
import { InsuranceAddLeadForm } from "./insurance/InsuranceAddLeadForm";
import { InsuranceAddPolicyForm } from "./insurance/InsuranceAddPolicyForm";
import { SalesVerticalWorkspace } from "./verticals/SalesVerticalWorkspace";
import { LoansVerticalWorkspace } from "./verticals/LoansVerticalWorkspace";
import { AccessoriesVerticalWorkspace } from "./verticals/AccessoriesVerticalWorkspace";
import { HSRPVerticalWorkspace } from "./verticals/HSRPVerticalWorkspace";
import { RentalVerticalWorkspace } from "./verticals/RentalVerticalWorkspace";
import { FleetVerticalWorkspace } from "./verticals/FleetVerticalWorkspace";
import { OmniMessagingWorkspace } from "./shared/OmniMessagingWorkspace";
type Vertical = "overview" | "insurance" | "car-sales" | "loans" | "accessories" | "hsrp" | "rentals" | "fleet";

const VERTICALS = [
  { id: "overview" as Vertical, label: "Overview", icon: LayoutDashboard, color: "text-primary" },
  { id: "insurance" as Vertical, label: "Car Insurance", icon: Shield, color: "text-green-600", ready: true },
  { id: "car-sales" as Vertical, label: "Car Sales", icon: Car, color: "text-blue-600", ready: true },
  { id: "loans" as Vertical, label: "Car Loans", icon: Banknote, color: "text-purple-600", ready: true },
  { id: "accessories" as Vertical, label: "Accessories", icon: ShoppingBag, color: "text-orange-600", ready: true },
  { id: "hsrp" as Vertical, label: "HSRP", icon: FileText, color: "text-teal-600", ready: true },
  { id: "rentals" as Vertical, label: "Self-Drive Rental", icon: Car, color: "text-cyan-600", ready: true },
  { id: "fleet" as Vertical, label: "Fleet Business", icon: Users, color: "text-indigo-600", ready: true },
];

export function UnifiedMasterCRM() {
  const [vertical, setVertical] = useState<Vertical>("overview");

  const { data: stats } = useQuery({
    queryKey: ["crm-overview-stats"],
    queryFn: async () => {
      const [leads, clients, loans, insurance] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("client_profiles").select("*", { count: "exact", head: true }),
        supabase.from("car_loan_leads").select("*", { count: "exact", head: true }),
        supabase.from("insurance_clients").select("*", { count: "exact", head: true }),
      ]);
      return {
        leads: leads.count || 0,
        clients: clients.count || 0,
        loans: loans.count || 0,
        insurance: insurance.count || 0,
      };
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
            <Users className="h-6 w-6 text-primary" />
          </div>
          Master CRM — Business Verticals
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a vertical to access its dedicated workspace with team-specific features
        </p>
      </div>

      {/* Vertical Selector */}
      <div className="flex flex-wrap gap-2">
        {VERTICALS.map(v => (
          <Button
            key={v.id}
            variant={vertical === v.id ? "default" : "outline"}
            onClick={() => setVertical(v.id)}
            className="gap-2"
            size="sm"
          >
            <v.icon className="h-4 w-4" />
            {v.label}
            {v.ready === false && (
              <Badge variant="secondary" className="text-[9px] px-1">Soon</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Vertical Content */}
      {vertical === "overview" && <OverviewDashboard stats={stats} onSelectVertical={setVertical} />}
      {vertical === "insurance" && <InsuranceVerticalWorkspace />}
      {vertical === "car-sales" && <SalesVerticalWorkspace />}
      {vertical === "loans" && <LoansVerticalWorkspace />}
      {vertical === "accessories" && <AccessoriesVerticalWorkspace />}
      {vertical === "hsrp" && <HSRPVerticalWorkspace />}
      {vertical === "rentals" && <RentalVerticalWorkspace />}
      {vertical === "fleet" && <FleetVerticalWorkspace />}
    </div>
  );
}

// ── Overview Dashboard ──────────────────────────────────────────────
function OverviewDashboard({ stats, onSelectVertical }: { stats: any; onSelectVertical: (v: Vertical) => void }) {
  const verticalCards = [
    {
      id: "insurance" as Vertical,
      title: "🛡️ Car Insurance CRM",
      desc: "Motor insurance lifecycle — clients, policies, renewals, commissions, automation",
      stats: `${stats?.insurance || 0} clients`,
      features: ["Client Management", "Policy Tracking", "Renewal Engine", "WhatsApp Automation", "Import/Export", "Commission Tracking", "AI Extractor", "Reports"],
      color: "border-green-200 dark:border-green-900",
      ready: true,
    },
    {
      id: "car-sales" as Vertical,
      title: "🚗 Car Sales CRM",
      desc: "Lead management, test drives, bookings, delivery tracking",
      stats: `${stats?.leads || 0} leads`,
      features: ["Lead Pipeline", "Test Drive Scheduler", "Booking Tracker", "Delivery Status"],
      color: "border-blue-200 dark:border-blue-900",
      ready: true,
    },
    {
      id: "loans" as Vertical,
      title: "💰 Loan CRM",
      desc: "Loan applications, eligibility checks, disbursement tracking",
      stats: `${stats?.loans || 0} applications`,
      features: ["Loan Applications", "Eligibility Engine", "Bank Partners", "EMI Calculator"],
      color: "border-purple-200 dark:border-purple-900",
      ready: true,
    },
    {
      id: "accessories" as Vertical,
      title: "🛍️ Accessories & E-Commerce",
      desc: "Orders, inventory, cross-sell bundles, shipping",
      stats: `${stats?.clients || 0} customers`,
      features: ["Order Management", "Inventory", "Cross-Sell", "Shipping Partners"],
      color: "border-orange-200 dark:border-orange-900",
      ready: true,
    },
    {
      id: "hsrp" as Vertical,
      title: "🔢 HSRP",
      desc: "HSRP plate registrations and tracking",
      stats: "—",
      features: ["HSRP Orders", "Status Tracking", "Bulk Processing"],
      color: "border-teal-200 dark:border-teal-900",
      ready: true,
    },
    {
      id: "rentals" as Vertical,
      title: "🚗 Self-Drive Rental",
      desc: "Fleet availability, bookings, returns, maintenance",
      stats: "—",
      features: ["Fleet Management", "Booking Engine", "Returns", "Maintenance Log"],
      color: "border-cyan-200 dark:border-cyan-900",
      ready: true,
    },
    {
      id: "fleet" as Vertical,
      title: "🏢 Fleet Business",
      desc: "Corporate fleet, bulk deals, contract management",
      stats: "—",
      features: ["Corporate Clients", "Bulk Pricing", "Contract Mgmt", "Fleet Insurance"],
      color: "border-indigo-200 dark:border-indigo-900",
      ready: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Car Leads", value: stats?.leads || 0, icon: Car, color: "text-blue-600" },
          { label: "Insurance Clients", value: stats?.insurance || 0, icon: Shield, color: "text-green-600" },
          { label: "Loan Applications", value: stats?.loans || 0, icon: Banknote, color: "text-purple-600" },
          { label: "Total Customers", value: stats?.clients || 0, icon: Users, color: "text-primary" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vertical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {verticalCards.map(v => (
          <Card key={v.id} className={`${v.color} hover:shadow-md transition-shadow cursor-pointer`} onClick={() => v.ready && onSelectVertical(v.id)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{v.title}</CardTitle>
                {v.ready ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-0">Active</Badge>
                ) : (
                  <Badge variant="secondary">Coming Soon</Badge>
                )}
              </div>
              <CardDescription>{v.desc}</CardDescription>
              <p className="text-sm font-semibold text-primary mt-1">{v.stats}</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {v.features.map(f => (
                  <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                ))}
              </div>
              {v.ready && (
                <Button size="sm" className="w-full gap-1.5 bg-success text-success-foreground hover:bg-success/90">
                  Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Insurance Vertical Workspace ────────────────────────────────────
function InsuranceVerticalWorkspace() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "prospects", label: "Prospect Pool", icon: BarChart3 },
    { id: "clients", label: "Clients", icon: UserCheck },
    { id: "policies", label: "Policies", icon: ShieldCheck },
    { id: "renewals", label: "Renewals", icon: RefreshCw },
    { id: "pipeline", label: "Pipeline", icon: GitBranch },
    { id: "tasks", label: "Tasks", icon: ListChecks },
    { id: "commissions", label: "Commissions", icon: DollarSign },
    { id: "documents", label: "Documents", icon: FolderOpen },
    { id: "importexport", label: "Import/Export", icon: FileSpreadsheet },
    { id: "advisors", label: "Advisors", icon: Briefcase },
    { id: "automation", label: "Automation", icon: Zap },
    { id: "templates", label: "Templates", icon: MessageSquare },
    
    { id: "extractor", label: "AI Extractor", icon: Sparkles },
    { id: "crosssell", label: "Cross-Sell", icon: Package },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "reports", label: "Reports", icon: FileSpreadsheet },
    { id: "vehdocs", label: "Vehicle Docs", icon: Car },
    { id: "agents", label: "Manage Agents", icon: Users },
    { id: "clientsearch", label: "Search", icon: Search },
    { id: "addlead", label: "Add Lead", icon: Phone },
    { id: "addpolicy", label: "Add Policy", icon: FileText },
    { id: "datahealth", label: "Data Health", icon: BarChart3 },
    { id: "plans", label: "Plans", icon: FileText },
    { id: "content", label: "Content", icon: Globe },
    { id: "faqs", label: "FAQs", icon: HelpCircle },
    { id: "addons", label: "Add-ons", icon: Package },
    { id: "scraper", label: "Scraper", icon: BarChart3 },
    { id: "leads", label: "Legacy Leads", icon: Users },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <InsuranceCRMDashboard />;
      case "prospects": return <InsuranceProspectPool />;
      case "clients": return <InsuranceClientsManager />;
      case "policies": return <InsurancePoliciesManager />;
      case "renewals": return <InsuranceRenewalsEngine />;
      case "pipeline": return <InsurancePipelineBoard />;
      case "tasks": return <InsuranceTasksManager />;
      case "commissions": return <InsuranceCommissionsTracker />;
      case "documents": return <InsuranceDocumentVault />;
      case "importexport": return <InsuranceImportExport />;
      case "advisors": return <InsuranceAdvisorsManager />;
      case "automation": return <InsuranceAutomationPanel />;
      case "templates": return <InsuranceTemplatesManager />;
      
      case "extractor": return <InsuranceSmartExtractor />;
      case "crosssell": return <InsuranceCrossSellEngine />;
      case "analytics": return <InsuranceAnalyticsDashboard />;
      case "reports": return <InsuranceReportsModule />;
      case "vehdocs": return <InsuranceVehicleDocValidity />;
      case "agents": return <InsuranceManageAgents />;
      case "clientsearch": return <InsuranceClientSearch />;
      case "addlead": return <InsuranceAddLeadForm />;
      case "addpolicy": return <InsuranceAddPolicyForm />;
      case "datahealth": return <InsuranceDataHealth />;
      case "plans": return <InsurancePlansAdmin />;
      case "content": return <InsuranceContentAdmin />;
      case "faqs": return <InsuranceFAQsAdmin />;
      case "addons": return <InsuranceAddonsAdmin />;
      case "scraper": return <InsuranceScraperAdmin />;
      case "leads": return <InsuranceLeadsAdmin />;
      default: return <InsuranceCRMDashboard />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Vertical Header */}
      <Card className="border-green-200 dark:border-green-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-100 dark:bg-green-950">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Car Insurance Vertical</h2>
                <p className="text-xs text-muted-foreground">Motor Insurance OS — Prospect Pool, Policy Book, Renewals, CRM & 25+ modules</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="overflow-x-auto">
        <div className="flex flex-wrap gap-1 p-1 bg-muted/50 rounded-lg min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={`gap-1.5 text-xs h-8 shrink-0 ${activeTab === tab.id ? "bg-success text-success-foreground hover:bg-success/90" : ""}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>{renderContent()}</div>
    </div>
  );
}

// ── Coming Soon Placeholder ─────────────────────────────────────────
function ComingSoonVertical({ name, icon: Icon, color }: { name: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-12 pb-12 text-center">
        <Icon className={`h-12 w-12 mx-auto mb-4 ${color} opacity-50`} />
        <h2 className="text-xl font-bold mb-2">{name} Vertical</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          This vertical workspace is being built. It will include dedicated CRM, 
          team management, analytics, and automation features for the {name.toLowerCase()} business.
        </p>
        <Badge variant="secondary" className="mt-4">Coming Soon</Badge>
      </CardContent>
    </Card>
  );
}
