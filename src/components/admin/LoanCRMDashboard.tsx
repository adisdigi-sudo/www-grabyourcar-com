import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Banknote, TrendingUp, Users, Clock, CheckCircle2, XCircle, 
  ArrowRight, IndianRupee, Building2, FileText, BarChart3 
} from "lucide-react";
import { LoanPipelineBoard } from "./loans/LoanPipelineBoard";
import { LoanLeadsList } from "./loans/LoanLeadsList";
import { LoanBankPartners } from "./loans/LoanBankPartners";
import { LoanAnalytics } from "./loans/LoanAnalytics";

const STAGES = ['new', 'contacted', 'documents_collected', 'bank_submitted', 'sanctioned', 'disbursed', 'rejected'] as const;

const stageLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  documents_collected: 'Docs Collected',
  bank_submitted: 'Bank Submitted',
  sanctioned: 'Sanctioned',
  disbursed: 'Disbursed',
  rejected: 'Rejected',
};

export const LoanCRMDashboard = () => {
  const [activeTab, setActiveTab] = useState("pipeline");

  // Fetch pipeline stats
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

  // Fetch loan leads
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

  // Stats
  const totalApps = applications.length;
  const newApps = applications.filter(a => a.stage === 'new').length;
  const sanctioned = applications.filter(a => a.stage === 'sanctioned').length;
  const disbursed = applications.filter(a => a.stage === 'disbursed').length;
  const rejected = applications.filter(a => a.stage === 'rejected').length;
  const totalDisbursed = applications
    .filter(a => a.stage === 'disbursed')
    .reduce((sum, a) => sum + (Number(a.disbursement_amount) || 0), 0);
  const totalSanctioned = applications
    .filter(a => a.stage === 'sanctioned' || a.stage === 'disbursed')
    .reduce((sum, a) => sum + (Number(a.sanction_amount) || 0), 0);
  const hotLeads = leads.filter(l => l.lead_priority === 'Hot').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Banknote className="h-8 w-8 text-emerald-500" />
          Car Loans / Finance CRM
        </h1>
        <p className="text-muted-foreground mt-1">Loan pipeline, bank tracking, and disbursement management</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total Leads</p>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{leads.length}</p>
            <p className="text-xs text-muted-foreground">{hotLeads} hot</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Pipeline</p>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{totalApps}</p>
            <p className="text-xs text-muted-foreground">{newApps} new</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Sanctioned</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{sanctioned}</p>
            <p className="text-xs text-muted-foreground">₹{(totalSanctioned / 100000).toFixed(1)}L</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Disbursed</p>
              <IndianRupee className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{disbursed}</p>
            <p className="text-xs text-muted-foreground">₹{(totalDisbursed / 100000).toFixed(1)}L</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Rejected</p>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{rejected}</p>
            <p className="text-xs text-muted-foreground">{totalApps > 0 ? ((rejected / totalApps) * 100).toFixed(0) : 0}% rate</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Conversion</p>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-1">
              {leads.length > 0 ? ((disbursed / Math.max(leads.length, 1)) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Lead → Disbursement</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pipeline" className="gap-2">
            <ArrowRight className="h-4 w-4" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <Users className="h-4 w-4" /> Loan Leads
          </TabsTrigger>
          <TabsTrigger value="banks" className="gap-2">
            <Building2 className="h-4 w-4" /> Bank Partners
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <LoanPipelineBoard applications={applications} stages={STAGES} stageLabels={stageLabels} />
        </TabsContent>
        <TabsContent value="leads">
          <LoanLeadsList />
        </TabsContent>
        <TabsContent value="banks">
          <LoanBankPartners />
        </TabsContent>
        <TabsContent value="analytics">
          <LoanAnalytics applications={applications} leads={leads} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
