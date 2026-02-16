import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, FileText, HelpCircle, Package, Globe, Users, BarChart3,
  LayoutDashboard, UserCheck, ShieldCheck, RefreshCw, ListChecks,
  DollarSign, TrendingUp, FolderOpen, Briefcase, Sparkles, FileSpreadsheet, Zap,
  MessageSquare, GitBranch, Settings, Car, Search, UserPlus, FilePlus
} from "lucide-react";
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

export function InsuranceManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Insurance Command Center
        </h1>
        <p className="text-muted-foreground mt-1">
          Complete CRM, policy management, renewals, commissions, documents & analytics
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/50">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="addlead" className="gap-1.5 text-xs">
            <UserPlus className="h-3.5 w-3.5" /> Add Lead
          </TabsTrigger>
          <TabsTrigger value="addpolicy" className="gap-1.5 text-xs">
            <FilePlus className="h-3.5 w-3.5" /> Add Policy
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5 text-xs">
            <UserCheck className="h-3.5 w-3.5" /> Clients
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" /> Policies
          </TabsTrigger>
          <TabsTrigger value="renewals" className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Renewals
          </TabsTrigger>
          <TabsTrigger value="extractor" className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> AI Extractor
          </TabsTrigger>
          <TabsTrigger value="crosssell" className="gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Cross-Sell
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 text-xs">
            <ListChecks className="h-3.5 w-3.5" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="commissions" className="gap-1.5 text-xs">
            <DollarSign className="h-3.5 w-3.5" /> Commissions
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 text-xs">
            <FolderOpen className="h-3.5 w-3.5" /> Documents
          </TabsTrigger>
          <TabsTrigger value="importexport" className="gap-1.5 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Import/Export
          </TabsTrigger>
          <TabsTrigger value="advisors" className="gap-1.5 text-xs">
            <Briefcase className="h-3.5 w-3.5" /> Advisors
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Plans
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" /> Content
          </TabsTrigger>
          <TabsTrigger value="faqs" className="gap-1.5 text-xs">
            <HelpCircle className="h-3.5 w-3.5" /> FAQs
          </TabsTrigger>
          <TabsTrigger value="addons" className="gap-1.5 text-xs">
            <Package className="h-3.5 w-3.5" /> Add-ons
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" /> Automation
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Reports
          </TabsTrigger>
          <TabsTrigger value="vehdocs" className="gap-1.5 text-xs">
            <Car className="h-3.5 w-3.5" /> Vehicle Docs
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5 text-xs">
            <GitBranch className="h-3.5 w-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="manageagents" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Manage Agents
          </TabsTrigger>
          <TabsTrigger value="clientsearch" className="gap-1.5 text-xs">
            <Search className="h-3.5 w-3.5" /> Client Search
          </TabsTrigger>
          <TabsTrigger value="scraper" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Scraper
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Legacy Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><InsuranceCRMDashboard /></TabsContent>
        <TabsContent value="addlead"><InsuranceAddLeadForm /></TabsContent>
        <TabsContent value="addpolicy"><InsuranceAddPolicyForm /></TabsContent>
        <TabsContent value="clients"><InsuranceClientsManager /></TabsContent>
        <TabsContent value="policies"><InsurancePoliciesManager /></TabsContent>
        <TabsContent value="renewals"><InsuranceRenewalsEngine /></TabsContent>
        <TabsContent value="extractor"><InsuranceSmartExtractor /></TabsContent>
        <TabsContent value="crosssell"><InsuranceCrossSellEngine /></TabsContent>
        <TabsContent value="tasks"><InsuranceTasksManager /></TabsContent>
        <TabsContent value="commissions"><InsuranceCommissionsTracker /></TabsContent>
        <TabsContent value="documents"><InsuranceDocumentVault /></TabsContent>
        <TabsContent value="importexport"><InsuranceImportExport /></TabsContent>
        <TabsContent value="advisors"><InsuranceAdvisorsManager /></TabsContent>
        <TabsContent value="analytics"><InsuranceAnalyticsDashboard /></TabsContent>
        <TabsContent value="plans"><InsurancePlansAdmin /></TabsContent>
        <TabsContent value="content"><InsuranceContentAdmin /></TabsContent>
        <TabsContent value="faqs"><InsuranceFAQsAdmin /></TabsContent>
        <TabsContent value="addons"><InsuranceAddonsAdmin /></TabsContent>
        <TabsContent value="automation"><InsuranceAutomationPanel /></TabsContent>
        <TabsContent value="templates"><InsuranceTemplatesManager /></TabsContent>
        <TabsContent value="reports"><InsuranceReportsModule /></TabsContent>
        <TabsContent value="vehdocs"><InsuranceVehicleDocValidity /></TabsContent>
        <TabsContent value="pipeline"><InsuranceStatusPipeline /></TabsContent>
        <TabsContent value="manageagents"><InsuranceManageAgents /></TabsContent>
        <TabsContent value="clientsearch"><InsuranceClientSearch /></TabsContent>
        <TabsContent value="scraper"><InsuranceScraperAdmin /></TabsContent>
        <TabsContent value="leads"><InsuranceLeadsAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}
