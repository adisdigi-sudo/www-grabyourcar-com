import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Banknote, TrendingUp, Users, Clock, CheckCircle2, XCircle, 
  ArrowRight, IndianRupee, Building2, BarChart3, Upload, PhoneCall, Zap
} from "lucide-react";
import { LoanPipelineBoard } from "./loans/LoanPipelineBoard";
import { LoanLeadsList } from "./loans/LoanLeadsList";
import { LoanBankPartners } from "./loans/LoanBankPartners";
import { LoanAnalytics } from "./loans/LoanAnalytics";
import { LoanBulkImport } from "./loans/LoanBulkImport";
import { CallingDashboard } from "./calling/CallingDashboard";
import { LoanAutomationPanel } from "./loans/LoanAutomationPanel";
import { LOAN_STAGES, STAGE_LABELS } from "./loans/LoanStageConfig";

export const LoanCRMDashboard = () => {
  const [activeTab, setActiveTab] = useState("pipeline");

  const { data: applications = [] } = useQuery({
    queryKey: ['loan-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['car-loan-leads-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('car_loan_leads')
        .select('id, status, lead_priority, loan_amount_requested, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  // Stats from 12-stage pipeline
  const totalApps = applications.length;
  const newApps = applications.filter(a => a.stage === 'new_lead').length;
  const inPipeline = applications.filter(a => !['converted', 'lost'].includes(a.stage)).length;
  const converted = applications.filter(a => a.stage === 'converted').length;
  const lost = applications.filter(a => a.stage === 'lost').length;
  const totalDisbursed = applications
    .filter(a => ['disbursement', 'converted'].includes(a.stage))
    .reduce((sum, a) => sum + (Number(a.disbursement_amount) || Number(a.loan_amount) || 0), 0);
  const hotLeads = applications.filter(a => a.priority === 'hot').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Banknote className="h-8 w-8 text-emerald-500" />
            Car Loans / Finance CRM
          </h1>
          <p className="text-muted-foreground mt-1">12-stage pipeline with forced workflows & document guardrails</p>
        </div>
        <LoanBulkImport />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Total</p>
              <Users className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-0.5">{totalApps}</p>
            <p className="text-[10px] text-muted-foreground">{hotLeads} hot</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">New</p>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-bold mt-0.5">{newApps}</p>
            <p className="text-[10px] text-muted-foreground">awaiting contact</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">In Pipeline</p>
              <ArrowRight className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <p className="text-xl font-bold mt-0.5">{inPipeline}</p>
            <p className="text-[10px] text-muted-foreground">active deals</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Converted</p>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            </div>
            <p className="text-xl font-bold mt-0.5 text-green-600">{converted}</p>
            <p className="text-[10px] text-muted-foreground">with docs</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Lost</p>
              <XCircle className="h-3.5 w-3.5 text-red-500" />
            </div>
            <p className="text-xl font-bold mt-0.5 text-red-500">{lost}</p>
            <p className="text-[10px] text-muted-foreground">{totalApps > 0 ? ((lost / totalApps) * 100).toFixed(0) : 0}% rate</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Disbursed</p>
              <IndianRupee className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-xl font-bold mt-0.5">₹{(totalDisbursed / 100000).toFixed(1)}L</p>
            <p className="text-[10px] text-muted-foreground">total value</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Conversion</p>
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xl font-bold mt-0.5">
              {totalApps > 0 ? ((converted / totalApps) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-[10px] text-muted-foreground">lead → client</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pipeline" className="gap-2">
            <ArrowRight className="h-4 w-4" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <Users className="h-4 w-4" /> Applications
          </TabsTrigger>
          <TabsTrigger value="calling" className="gap-2">
            <PhoneCall className="h-4 w-4" /> Calling
          </TabsTrigger>
          <TabsTrigger value="banks" className="gap-2">
            <Building2 className="h-4 w-4" /> Banks
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Zap className="h-4 w-4" /> Automation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <LoanPipelineBoard applications={applications} />
        </TabsContent>
        <TabsContent value="leads">
          <LoanLeadsList />
        </TabsContent>
        <TabsContent value="calling">
          <CallingDashboard />
        </TabsContent>
        <TabsContent value="banks">
          <LoanBankPartners />
        </TabsContent>
        <TabsContent value="analytics">
          <LoanAnalytics applications={applications} leads={leads} />
        </TabsContent>
        <TabsContent value="automation">
          <LoanAutomationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
