import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import EMICalculator from "@/components/EMICalculator";
import { LoanQuoteHistory } from "./LoanQuoteHistory";
import { Upload } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoanPerformanceDashboard } from "./LoanPerformanceDashboard";
import { startOfDay, startOfWeek, startOfMonth, subDays, isAfter, isWithinInterval } from "date-fns";
import type { DateRange } from "react-day-picker";
import { DateFilterBar, type DateFilterValue } from "../shared/DateFilterBar";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/useRealtimeSync";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Banknote, Plus, Phone, Car, GripVertical, IndianRupee,
  PhoneCall, MessageCircle, CheckCircle2, XCircle, Building2,
  FileText, AlertTriangle, Clock, TrendingUp, Users, FileSpreadsheet,
  BookOpen, HeartHandshake, Wrench, BarChart3, Filter, X
} from "lucide-react";
import { LeadImportDialog } from "../shared/LeadImportDialog";
import { StageNotificationBanner, buildLoanNotifications } from "../shared/StageNotificationBanner";
import {
  LOAN_STAGES, STAGE_LABELS, STAGE_COLORS, LEAD_SOURCES, PRIORITY_OPTIONS,
  CALL_STATUSES, LOST_REASONS, normalizeStage, LOAN_TYPES, EMPLOYMENT_TYPES,
  type LoanStage
} from "./LoanStageConfig";
import { LoanDisbursementBook } from "./LoanDisbursementBook";
import { LoanAfterSales } from "./LoanAfterSales";
import { cn } from "@/lib/utils";

// ─── Source color map ───
const SOURCE_COLORS: Record<string, string> = {
  meta: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'google ads': 'bg-red-500/10 text-red-600 border-red-500/20',
  referral: 'bg-green-500/10 text-green-600 border-green-500/20',
  'walk-in': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'whatsapp broadcast': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  website: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  manual: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  partner: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'social media': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'csv import': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

// ─── Main Workspace ───
type LoanWorkspaceView = "pipeline" | "disbursement" | "after_sales" | "bulk_tools" | "emi_calculator" | "performance";
type DateFilter = DateFilterValue;
type StageFilter = "all" | "in_pipeline" | "disbursed" | "lost";
interface LoanWorkspaceProps {
  initialView?: LoanWorkspaceView;
}

export const LoanWorkspace = ({ initialView = "pipeline" }: LoanWorkspaceProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
   const [activeView, setActiveView] = useState<LoanWorkspaceView>(initialView);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingApp, setDraggingApp] = useState<any>(null);
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [showWonDialog, setShowWonDialog] = useState(false);
  const [newApp, setNewApp] = useState({
    customer_name: '', phone: '', email: '', loan_amount: '', car_model: '',
    down_payment: '', employment_type: '', monthly_income: '', city: '',
    priority: 'medium', source: 'Manual', loan_type: 'new_car_loan', remarks: '',
  });
  const [showImport, setShowImport] = useState(false);
  const [prevLeadCount, setPrevLeadCount] = useState<number | null>(null);

  // ── Real-time subscription for live updates ──
  useRealtimeTable('loan_applications', ['loan-applications']);

  // Fetch data
  const { data: rawApplications = [] } = useQuery({
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

  // ── New lead toast notification ──
  useEffect(() => {
    if (prevLeadCount === null) {
      setPrevLeadCount(rawApplications.length);
      return;
    }
    if (rawApplications.length > prevLeadCount) {
      const newest = rawApplications[0];
      if (newest) {
        toast("🆕 New Loan Lead!", {
          description: `${newest.customer_name || "Unknown"} — ${newest.phone || ""}`,
          duration: 6000,
        });
      }
    }
    setPrevLeadCount(rawApplications.length);
  }, [rawApplications.length]);

  const { data: dbBankPartners = [] } = useQuery({
    queryKey: ['loan-bank-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_bank_partners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) {
        console.warn('loan_bank_partners fetch error:', error.message);
        return [];
      }
      return data || [];
    },
  });

  const bankPartners = useMemo(() => {
    if (dbBankPartners.length > 0) return dbBankPartners;
    // Fallback: hardcoded list of major Indian banks & NBFCs
    const defaults = [
      { name: "State Bank of India (SBI)", interest_rate_min: 8.5, interest_rate_max: 10.5 },
      { name: "HDFC Bank", interest_rate_min: 8.5, interest_rate_max: 10.75 },
      { name: "ICICI Bank", interest_rate_min: 8.7, interest_rate_max: 11.0 },
      { name: "Axis Bank", interest_rate_min: 8.75, interest_rate_max: 11.25 },
      { name: "Kotak Mahindra Bank", interest_rate_min: 8.5, interest_rate_max: 10.99 },
      { name: "Bank of Baroda", interest_rate_min: 8.45, interest_rate_max: 10.6 },
      { name: "Punjab National Bank (PNB)", interest_rate_min: 8.65, interest_rate_max: 10.45 },
      { name: "Union Bank of India", interest_rate_min: 8.7, interest_rate_max: 10.9 },
      { name: "Canara Bank", interest_rate_min: 8.65, interest_rate_max: 10.45 },
      { name: "IDFC First Bank", interest_rate_min: 8.75, interest_rate_max: 12.0 },
      { name: "Yes Bank", interest_rate_min: 9.0, interest_rate_max: 12.5 },
      { name: "IndusInd Bank", interest_rate_min: 9.0, interest_rate_max: 13.0 },
      { name: "Federal Bank", interest_rate_min: 9.0, interest_rate_max: 12.0 },
      { name: "Bajaj Finance", interest_rate_min: 9.0, interest_rate_max: 14.0 },
      { name: "Tata Capital", interest_rate_min: 9.25, interest_rate_max: 13.0 },
      { name: "Mahindra Finance", interest_rate_min: 9.5, interest_rate_max: 16.0 },
      { name: "Hero FinCorp", interest_rate_min: 9.5, interest_rate_max: 18.0 },
      { name: "Sundaram Finance", interest_rate_min: 9.0, interest_rate_max: 14.0 },
      { name: "Cholamandalam Finance", interest_rate_min: 9.25, interest_rate_max: 15.0 },
      { name: "HDB Financial Services", interest_rate_min: 10.0, interest_rate_max: 18.0 },
      { name: "Shriram Finance", interest_rate_min: 10.0, interest_rate_max: 18.0 },
      { name: "AU Small Finance Bank", interest_rate_min: 9.5, interest_rate_max: 14.0 },
      { name: "L&T Finance", interest_rate_min: 9.5, interest_rate_max: 14.0 },
    ];
    return defaults.map((b, i) => ({ ...b, id: `default_${i}`, is_active: true, sort_order: i }));
  }, [dbBankPartners]);


  const applications = useMemo(() =>
    rawApplications.map((a: any) => ({ ...a, stage: normalizeStage(a.stage) })),
    [rawApplications]
  );

  // ── Date-filtered applications ──
  const dateFilteredApps = useMemo(() => {
    if (dateFilter === "all") return applications;
    if (dateFilter === "custom" && customRange?.from && customRange?.to) {
      return applications.filter((a: any) =>
        isWithinInterval(new Date(a.created_at), { start: customRange.from!, end: new Date(customRange.to!.getTime() + 86400000 - 1) })
      );
    }
    const now = new Date();
    let cutoff: Date;
    switch (dateFilter) {
      case "today": cutoff = startOfDay(now); break;
      case "7days": cutoff = subDays(now, 7); break;
      case "30days": cutoff = subDays(now, 30); break;
      case "this_month": cutoff = startOfMonth(now); break;
      default: return applications;
    }
    return applications.filter((a: any) => isAfter(new Date(a.created_at), cutoff));
  }, [applications, dateFilter, customRange]);

  // ── Stage-filtered applications (for pipeline view) ──
  const filteredApps = useMemo(() => {
    if (stageFilter === "all") return dateFilteredApps;
    if (stageFilter === "in_pipeline") return dateFilteredApps.filter((a: any) => !["disbursed", "lost"].includes(a.stage));
    if (stageFilter === "disbursed") return dateFilteredApps.filter((a: any) => a.stage === "disbursed");
    if (stageFilter === "lost") return dateFilteredApps.filter((a: any) => a.stage === "lost");
    return dateFilteredApps;
  }, [dateFilteredApps, stageFilter]);

  // KPIs always show from dateFilteredApps (not stage-filtered)
  const totalApps = dateFilteredApps.length;
  const inPipeline = dateFilteredApps.filter((a: any) => !['disbursed', 'lost'].includes(a.stage)).length;
  const disbursed = dateFilteredApps.filter((a: any) => a.stage === 'disbursed').length;
  const lost = dateFilteredApps.filter((a: any) => a.stage === 'lost').length;
  const totalValue = dateFilteredApps
    .filter((a: any) => a.stage === 'disbursed')
    .reduce((s: number, a: any) => s + (Number(a.disbursement_amount) || Number(a.loan_amount) || 0), 0);

  const loanNotifications = useMemo(() => buildLoanNotifications(dateFilteredApps), [dateFilteredApps]);

  const formatAmount = (amt: number | null) => {
    if (!amt) return '-';
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
    return `₹${(amt / 1000).toFixed(0)}K`;
  };

  const handleKpiClick = (filter: StageFilter) => {
    if (filter === "disbursed") {
      setShowWonDialog(true);
      return;
    }
    setStageFilter(prev => prev === filter ? "all" : filter);
    if (activeView !== "pipeline") setActiveView("pipeline");
  };

  // Create lead
  const createMutation = useMutation({
    mutationFn: async (app: typeof newApp) => {
      const { error } = await supabase.from('loan_applications').insert({
        customer_name: app.customer_name,
        phone: app.phone.replace(/\D/g, ''),
        loan_amount: app.loan_amount ? Number(app.loan_amount) : null,
        car_model: app.car_model || null,
        priority: app.priority,
        source: app.source,
        loan_type: app.loan_type,
        lead_source_tag: app.source.toLowerCase().replace(/\s/g, '_'),
        remarks: [
          app.remarks,
          app.email ? `Email: ${app.email}` : '',
          app.down_payment ? `Down Payment: ₹${app.down_payment}` : '',
          app.employment_type ? `Employment: ${EMPLOYMENT_TYPES.find(e => e.value === app.employment_type)?.label || app.employment_type}` : '',
          app.monthly_income ? `Income: ₹${app.monthly_income}` : '',
          app.city ? `City: ${app.city}` : '',
        ].filter(Boolean).join(' | ') || null,
        stage: 'new_lead',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success("Lead added");
      setShowAddDialog(false);
      setNewApp({ customer_name: '', phone: '', email: '', loan_amount: '', car_model: '', down_payment: '', employment_type: '', monthly_income: '', city: '', priority: 'medium', source: 'Manual', loan_type: 'new_car_loan', remarks: '' });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Stage mutations
  const quickMoveMutation = useMutation({
    mutationFn: async ({ appId, fromStage, toStage }: { appId: string; fromStage: string; toStage: string }) => {
      const { error } = await supabase.from('loan_applications')
        .update({ stage: toStage, stage_updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
        .eq('id', appId);
      if (error) throw error;
      await supabase.from('loan_stage_history').insert({
        application_id: appId, from_stage: fromStage, to_stage: toStage,
        remarks: 'Moved via drag & drop',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success("Stage updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Drag & Drop
  const handleDragStart = useCallback((e: React.DragEvent, app: any) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ id: app.id, stage: app.stage }));
    setDraggingApp(app);
  }, []);
  const handleDragEnd = useCallback(() => { setDraggingApp(null); setDragOverStage(null); }, []);
  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStage(stage);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage(null);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent, targetStage: LoanStage) => {
    e.preventDefault(); setDragOverStage(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.stage === targetStage) return;
      // 🔒 Disbursed leads are permanently locked
      if (data.stage === 'disbursed') { toast.error("Disbursed leads cannot be moved"); return; }
      const app = applications.find((a: any) => a.id === data.id);
      if (!app) return;
      if (['lost', 'disbursed', 'loan_application'].includes(targetStage)) {
        setSelectedApp({ ...app, _targetStage: targetStage });
        setShowStageModal(true);
        return;
      }
      quickMoveMutation.mutate({ appId: app.id, fromStage: app.stage, toStage: targetStage });
    } catch {}
    setDraggingApp(null);
  }, [applications, quickMoveMutation]);

  const handleCardClick = (app: any) => { setSelectedApp(app); setShowStageModal(true); };
  const handleWhatsApp = async (phone: string, name: string) => {
    const msg = `Hi ${name}, this is from GrabYourCar regarding your car loan inquiry. How can I help you today?`;
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone, message: msg, name, logEvent: "loan_inquiry" });
  };

  const pipelineStages = LOAN_STAGES.filter(s => s !== 'lost');

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  return (
    <div className="space-y-4">
      {/* KPI Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 p-5 sm:p-6 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Banknote className="h-5 w-5" />
              </div>
              Car Loan Workspace
            </h2>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => setShowImport(true)} className="gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/20">
                <FileSpreadsheet className="h-4 w-4" /> Import
              </Button>
              <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/20">
                <Plus className="h-4 w-4" /> Add Lead
              </Button>
            </div>
          </div>

          {/* Clickable KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total Leads", value: totalApps, icon: Users, bgc: "bg-blue-500/20", filter: "all" as StageFilter },
              { label: "In Pipeline", value: inPipeline, icon: TrendingUp, bgc: "bg-orange-400/20", filter: "in_pipeline" as StageFilter },
              { label: "Disbursed", value: disbursed, icon: CheckCircle2, bgc: "bg-emerald-400/20", filter: "disbursed" as StageFilter },
              { label: "Lost", value: lost, icon: XCircle, bgc: "bg-red-400/20", filter: "lost" as StageFilter },
              { label: "Total Value", value: formatAmount(totalValue), icon: IndianRupee, bgc: "bg-cyan-400/20", filter: "disbursed" as StageFilter },
            ].map(kpi => {
              const isActive = stageFilter === kpi.filter && kpi.filter !== "all";
              return (
                <div
                  key={kpi.label}
                  onClick={() => handleKpiClick(kpi.filter)}
                  className={cn(
                    `${kpi.bgc} backdrop-blur-sm rounded-xl px-4 py-3 border cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.98]`,
                    isActive ? "ring-2 ring-white border-white/60 shadow-lg" : "border-white/10"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className="h-4 w-4 text-white/70" />
                    <span className="text-[10px] uppercase tracking-wider text-white/70">{kpi.label}</span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                </div>
              );
            })}
          </div>

          {/* Date Filter Bar */}
          <DateFilterBar
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            variant="dark"
            showClear={stageFilter !== "all" || dateFilter !== "all"}
            onClear={() => { setStageFilter("all"); setDateFilter("all"); setCustomRange(undefined); }}
          />
        </div>
      </div>

      {/* Workspace Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {([
          { key: "pipeline", label: "Pipeline", icon: Banknote },
          { key: "disbursement", label: "Disbursement", icon: CheckCircle2 },
          { key: "after_sales", label: "After Sales", icon: HeartHandshake },
          { key: "performance", label: "Performance", icon: BarChart3 },
          { key: "emi_calculator", label: "EMI Calc", icon: IndianRupee },
        ] as { key: LoanWorkspaceView; label: string; icon: any }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
              activeView === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {loanNotifications.length > 0 && <StageNotificationBanner items={loanNotifications} />}

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-emerald-600" /> New Car Loan Lead</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">Loan Type *</Label>
              <Select value={newApp.loan_type} onValueChange={v => setNewApp(p => ({ ...p, loan_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LOAN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Name *</Label><Input value={newApp.customer_name} onChange={e => setNewApp(p => ({ ...p, customer_name: e.target.value }))} /></div>
              <div><Label className="text-xs">Phone *</Label><Input value={newApp.phone} onChange={e => setNewApp(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input type="email" value={newApp.email} onChange={e => setNewApp(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label className="text-xs">City</Label><Input value={newApp.city} onChange={e => setNewApp(p => ({ ...p, city: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Loan Amount</Label><Input type="number" value={newApp.loan_amount} onChange={e => setNewApp(p => ({ ...p, loan_amount: e.target.value }))} /></div>
              <div><Label className="text-xs">Car Model</Label><Input value={newApp.car_model} onChange={e => setNewApp(p => ({ ...p, car_model: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Down Payment</Label><Input type="number" value={newApp.down_payment} onChange={e => setNewApp(p => ({ ...p, down_payment: e.target.value }))} /></div>
              <div><Label className="text-xs">Monthly Income</Label><Input type="number" value={newApp.monthly_income} onChange={e => setNewApp(p => ({ ...p, monthly_income: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Employment Type</Label>
                <Select value={newApp.employment_type} onValueChange={v => setNewApp(p => ({ ...p, employment_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={newApp.priority} onValueChange={v => setNewApp(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Lead Source</Label>
              <Select value={newApp.source} onValueChange={v => setNewApp(p => ({ ...p, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Remarks</Label><Textarea value={newApp.remarks} onChange={e => setNewApp(p => ({ ...p, remarks: e.target.value }))} rows={2} /></div>
            <Button onClick={() => createMutation.mutate(newApp)} disabled={!newApp.customer_name || !newApp.phone || createMutation.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Create Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <LeadImportDialog
        open={showImport} onOpenChange={setShowImport} title="Import Loan Leads"
        templateColumns={["name", "phone", "loan_amount", "car_model", "source"]}
        onImport={async (leads) => {
          const rows = leads.map(l => ({
            customer_name: l.name || l.customer_name || "Unknown",
            phone: (l.phone || l.mobile || "").replace(/\D/g, ""),
            loan_amount: l.loan_amount ? Number(l.loan_amount) : null,
            car_model: l.car_model || null,
            source: l.source || "CSV Import",
            lead_source_tag: "csv_import",
            stage: "new_lead" as const,
            priority: "medium",
          }));
          const { error } = await supabase.from("loan_applications").insert(rows);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["loan-applications"] });
        }}
      />

      <div className="min-h-[600px]">
        {activeView === "pipeline" && (
          <div className="space-y-4">
            {draggingApp && (
              <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-1.5 border border-dashed border-primary/30 animate-pulse">
                Drop on a stage to move <strong>{draggingApp.customer_name}</strong>
              </div>
            )}

            <ScrollArea className="w-full">
              <div className="flex min-w-max">
                {pipelineStages.map((stage, colIdx) => {
                  const stageApps = filteredApps.filter((a: any) => a.stage === stage);
                  const stageValue = stageApps.reduce((s: number, a: any) => s + (Number(a.loan_amount) || 0), 0);
                  const isDragOver = dragOverStage === stage;
                  const showDropIndicator = draggingApp && isDragOver;

                  return (
                    <div key={stage}
                      className={`w-[260px] shrink-0 flex flex-col ${colIdx > 0 ? 'border-l border-border/40' : ''}`}
                      onDragOver={e => handleDragOver(e, stage)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDrop(e, stage)}>
                      <div className={`mx-1.5 rounded-lg border p-2.5 mb-2 transition-all ${STAGE_COLORS[stage]} ${showDropIndicator ? 'ring-2 ring-primary scale-[1.02] shadow-lg' : ''}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs">{STAGE_LABELS[stage]}</span>
                          <Badge variant="secondary" className="text-[10px] h-5">{stageApps.length}</Badge>
                        </div>
                        {stageValue > 0 && <p className="text-[10px] mt-1 opacity-70">Rs. {(stageValue / 100000).toFixed(1)}L</p>}
                      </div>
                      <div className={`flex-1 px-1.5 pb-2 min-h-[120px] transition-all ${showDropIndicator ? 'bg-primary/5' : ''}`}>
                        {stageApps.length === 0 && !showDropIndicator && (
                          <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/40 py-8">No leads</div>
                        )}
                        {showDropIndicator && stageApps.length === 0 && (
                          <div className="h-full flex items-center justify-center text-[11px] text-primary/60 py-8 font-medium">Drop here</div>
                        )}
                        {stageApps.map((app: any, cardIdx: number) => (
                          <div key={app.id} className={cardIdx > 0 ? 'border-t border-border/30 pt-2 mt-2' : ''}>
                            <LoanCard app={app} stage={stage}
                              onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                              onClick={handleCardClick} onWhatsApp={handleWhatsApp}
                              isDragging={draggingApp?.id === app.id} formatAmount={formatAmount} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="w-[260px] shrink-0 flex flex-col border-l border-border/40"
                  onDragOver={e => handleDragOver(e, 'lost')}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, 'lost')}>
                  <div className={`mx-1.5 rounded-lg border p-2.5 mb-2 transition-all ${STAGE_COLORS['lost']} ${dragOverStage === 'lost' && draggingApp ? 'ring-2 ring-red-500 scale-[1.02] shadow-lg' : ''}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-xs">Lost</span>
                      <Badge variant="secondary" className="text-[10px] h-5">{lost}</Badge>
                    </div>
                  </div>
                  <div className={`flex-1 px-1.5 pb-2 min-h-[120px] transition-all ${dragOverStage === 'lost' && draggingApp ? 'bg-red-500/5' : ''}`}>
                    {filteredApps.filter((a: any) => a.stage === 'lost').map((app: any, i: number) => (
                      <div key={app.id} className={i > 0 ? 'border-t border-border/30 pt-2 mt-2' : ''}>
                        <LoanCard app={app} stage="lost"
                          onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                          onClick={handleCardClick} onWhatsApp={handleWhatsApp}
                          isDragging={draggingApp?.id === app.id} formatAmount={formatAmount} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {activeView === "disbursement" && <LoanDisbursementBook applications={dateFilteredApps} />}
        {activeView === "after_sales" && <LoanAfterSales applications={dateFilteredApps} />}
        {activeView === "performance" && <LoanPerformanceDashboard applications={dateFilteredApps} dateFilter={dateFilter} />}
        {activeView === "bulk_tools" && (
          <div className="text-center py-12">
            <Wrench className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Use the Import button above to bulk import leads via CSV</p>
          </div>
        )}
        {activeView === "emi_calculator" && <EMICalculator />}
      </div>


      {/* Stage Detail Modal */}
      {selectedApp && (
        <LoanStageDetailModal
          open={showStageModal} onOpenChange={setShowStageModal}
          application={selectedApp} bankPartners={bankPartners}
        />
      )}

      {/* Won / Disbursed Cases Dialog */}
      <Dialog open={showWonDialog} onOpenChange={setShowWonDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Won / Disbursed Cases ({dateFilteredApps.filter((a: any) => a.stage === 'disbursed').length})
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {dateFilteredApps.filter((a: any) => a.stage === 'disbursed').length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">No disbursed cases found for this period</div>
            )}
            {dateFilteredApps
              .filter((a: any) => a.stage === 'disbursed')
              .sort((a: any, b: any) => new Date(b.stage_updated_at || b.created_at).getTime() - new Date(a.stage_updated_at || a.created_at).getTime())
              .map((app: any) => {
                const amt = Number(app.disbursement_amount) || Number(app.loan_amount) || 0;
                return (
                  <div key={app.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{app.customer_name || "Unknown"}</span>
                          {app.priority === 'hot' && <Badge className="text-[9px] h-4 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">🔥 Hot</Badge>}
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground mt-2">
                          <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {app.phone || "—"}</div>
                          <div className="flex items-center gap-1.5"><Car className="h-3 w-3" /> {app.car_model || app.car_variant || "—"}</div>
                          <div className="flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {app.bank_name || app.selected_bank || "—"}</div>
                          <div className="flex items-center gap-1.5"><IndianRupee className="h-3 w-3" /> {formatAmount(amt)}</div>
                          <div className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> {app.loan_type ? app.loan_type.replace(/_/g, ' ') : "—"}</div>
                          <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {app.disbursement_date || app.stage_updated_at ? new Date(app.disbursement_date || app.stage_updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</div>
                        </div>
                        {app.remarks && <p className="text-[11px] text-muted-foreground mt-2 line-clamp-1">{app.remarks}</p>}
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs font-bold">
                          {formatAmount(amt)}
                        </Badge>
                        <div className="flex gap-1">
                          {app.phone && (
                            <>
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => window.open(`tel:${app.phone}`)}>
                                <PhoneCall className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="outline" className="h-7 w-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleWhatsApp(app.phone, app.customer_name || 'Customer')}>
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Lead Card ───
const LoanCard = ({ app, stage, onDragStart, onDragEnd, onClick, onWhatsApp, isDragging, formatAmount }: any) => {
  const loanTypeInfo = LOAN_TYPES.find(t => t.value === app.loan_type);

  return (
    <Card draggable onDragStart={(e: React.DragEvent) => onDragStart(e, app)} onDragEnd={onDragEnd}
      className={`border-border/40 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${isDragging ? 'opacity-30 scale-95' : ''}`}
      onClick={() => onClick(app)}>
      <CardContent className="p-2.5 space-y-1.5">
        {/* Name + Priority */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0" />
            <span className="font-medium text-xs truncate max-w-[150px]">{app.customer_name}</span>
          </div>
          {app.priority && (
            <Badge className={`text-[9px] px-1.5 py-0 shrink-0 ${PRIORITY_OPTIONS.find((o: any) => o.value === app.priority)?.color || ''}`}>
              {app.priority === 'hot' ? '🔥' : ''} {app.priority}
            </Badge>
          )}
        </div>

        {/* Loan Type Badge */}
        {loanTypeInfo && (
          <Badge className={`text-[8px] px-1.5 py-0 ${loanTypeInfo.color}`}>{loanTypeInfo.label}</Badge>
        )}

        {/* Phone + Quick Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Phone className="h-2.5 w-2.5" />{app.phone}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e: React.MouseEvent) => { e.stopPropagation(); window.open(`tel:+91${app.phone.replace(/\D/g, '').slice(-10)}`, '_self'); }}>
              <PhoneCall className="h-3 w-3 text-emerald-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onWhatsApp(app.phone, app.customer_name); }}>
              <MessageCircle className="h-3 w-3 text-green-600" />
            </Button>
          </div>
        </div>

        {/* Amount + Car */}
        <div className="flex items-center gap-3">
          {app.loan_amount && (
            <div className="flex items-center gap-1 text-[11px]">
              <IndianRupee className="h-2.5 w-2.5 text-emerald-500" />
              <span className="font-semibold">{formatAmount(app.loan_amount)}</span>
            </div>
          )}
          {app.car_model && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Car className="h-2.5 w-2.5" />{app.car_model}
            </div>
          )}
        </div>

        {/* Source badge */}
        {app.source && (
          <Badge variant="outline" className={`text-[8px] px-1.5 py-0 ${SOURCE_COLORS[app.source.toLowerCase()] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
            {app.source}
          </Badge>
        )}

        {/* Stage-specific info */}
        {stage === 'smart_calling' && app.call_status && (
          <Badge variant="outline" className="text-[9px]">{app.call_status}</Badge>
        )}
        {stage === 'offer_shared' && app.lender_name && (
          <div className="text-[10px] text-violet-600 flex items-center gap-1">
            <Building2 className="h-2.5 w-2.5" /> {app.lender_name}
          </div>
        )}
        {stage === 'loan_application' && (
          <Badge variant="outline" className={`text-[9px] ${app.sanction_amount ? 'border-green-500/30 text-green-600' : 'border-amber-500/30 text-amber-600'}`}>
            {app.sanction_amount ? `Approved ₹${(app.sanction_amount / 100000).toFixed(1)}L` : 'Pending'}
          </Badge>
        )}
        {stage === 'disbursed' && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-600">
            <CheckCircle2 className="h-2.5 w-2.5" />
            {app.disbursement_amount ? formatAmount(app.disbursement_amount) : 'Disbursed'}
            {app.incentive_eligible && <Badge className="text-[8px] bg-green-500/10 text-green-600 ml-1">Incentive ✓</Badge>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Stage Detail Modal ───
const LoanStageDetailModal = ({ open, onOpenChange, application, bankPartners }: any) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [targetStage, setTargetStage] = useState<string>(application?._targetStage || '');
  const [remarks, setRemarks] = useState('');
  const [callStatus, setCallStatus] = useState(application?.call_status || '');
  const [callRemarks, setCallRemarks] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [lostRemarks, setLostRemarks] = useState('');
  const [selectedBank, setSelectedBank] = useState(application?.bank_partner_id || '');
  const [customBankName, setCustomBankName] = useState('');
  const [interestRate, setInterestRate] = useState(application?.interest_rate?.toString() || '');
  const [tenureMonths, setTenureMonths] = useState(application?.tenure_months?.toString() || '');
  const [emiAmount, setEmiAmount] = useState(application?.emi_amount?.toString() || '');
  const [sanctionAmount, setSanctionAmount] = useState(application?.sanction_amount?.toString() || '');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loanStatus, setLoanStatus] = useState<string>(application?.sanction_amount ? 'approved' : '');
  const [disbAmount, setDisbAmount] = useState(application?.disbursement_amount?.toString() || '');
  const [disbDate, setDisbDate] = useState(application?.disbursement_date || '');
  const [disbBank, setDisbBank] = useState(application?.lender_name || '');
  const [sanctionFile, setSanctionFile] = useState<File | null>(null);
  const [disbursementFile, setDisbursementFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // ── Auto-calculate EMI when loan_amount + interest_rate + tenure change ──
  useEffect(() => {
    const P = Number(application?.loan_amount || 0);
    const annualRate = Number(interestRate);
    const months = Number(tenureMonths);
    if (P > 0 && annualRate > 0 && months > 0) {
      const r = annualRate / 12 / 100;
      const emi = (P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
      setEmiAmount(Math.round(emi).toString());
    }
  }, [interestRate, tenureMonths, application?.loan_amount]);

  // ── File upload helper ──
  const uploadDocument = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    if (!allowed.includes(ext)) throw new Error('Only PDF, JPG, PNG files are allowed');
    const filePath = `${folder}/${application.id}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('loan-documents').upload(filePath, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('loan-documents').getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const currentStage = application?.stage || 'new_lead';
  const loanTypeInfo = LOAN_TYPES.find(t => t.value === application?.loan_type);

  const formatAmount = (amt: number | null) => {
    if (!amt) return '-';
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
    return `₹${(amt / 1000).toFixed(0)}K`;
  };

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from('loan_applications')
        .update({ ...updates, last_activity_at: new Date().toISOString(), stage_updated_at: new Date().toISOString() })
        .eq('id', application.id);
      if (error) throw error;
      if (updates.stage && updates.stage !== currentStage) {
        await supabase.from('loan_stage_history').insert({
          application_id: application.id, from_stage: currentStage, to_stage: updates.stage,
          changed_by: user?.id, remarks: updates.remarks || remarks || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success("Updated successfully");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSmartCallingSave = () => {
    if (!callStatus) { toast.error("Select a call status"); return; }
    if (!callRemarks.trim()) { toast.error("Remarks are mandatory"); return; }
    const nextStage = callStatus === 'Interested' ? 'interested' : callStatus === 'Not Interested' ? 'lost' : currentStage;
    const updates: any = { call_status: callStatus, call_remarks: callRemarks, remarks: callRemarks, stage: nextStage };
    if (nextStage === 'lost') { updates.lost_reason = 'Customer not responding'; updates.lost_remarks = callRemarks; }
    updateMutation.mutate(updates);
  };

  const handleOfferSave = () => {
    const selectedPartner = bankPartners.find((b: any) => b.id === selectedBank);
    const hasRealPartnerId = Boolean(selectedBank && isUuid(selectedBank));
    const isCustom = selectedBank === '__custom__' || Boolean(selectedPartner && !hasRealPartnerId);

    if (!selectedBank) { toast.error("Select a bank partner"); return; }
    if (isCustom && !((selectedPartner?.name || customBankName).trim())) { toast.error("Enter custom bank/NBFC name"); return; }

    const bankName = isCustom
      ? (selectedPartner?.name || customBankName).trim()
      : (selectedPartner?.name || '');

    updateMutation.mutate({
      bank_partner_id: hasRealPartnerId ? selectedBank : null,
      lender_name: bankName,
      interest_rate: interestRate ? Number(interestRate) : null,
      tenure_months: tenureMonths ? Number(tenureMonths) : null,
      emi_amount: emiAmount ? Number(emiAmount) : null,
      stage: 'offer_shared',
      remarks: remarks || `Offer shared: ${bankName}`,
    });
  };

  const handleLoanAppSave = async () => {
    if (!loanStatus) { toast.error("Select loan status"); return; }
    if (loanStatus === 'rejected' && !rejectionReason.trim()) { toast.error("Rejection reason required"); return; }
    if (loanStatus === 'approved' && !sanctionAmount) { toast.error("Sanction amount required"); return; }
    if (loanStatus === 'approved' && !sanctionFile && !application.sanction_letter_url) { toast.error("Upload sanction/approval letter"); return; }

    const updates: any = {
      stage: loanStatus === 'approved' ? 'loan_application' : 'lost',
      remarks: remarks || (loanStatus === 'approved' ? `Approved: ₹${sanctionAmount}` : `Rejected: ${rejectionReason}`),
    };

    if (loanStatus === 'approved') {
      updates.sanction_amount = Number(sanctionAmount);
      updates.sanction_date = new Date().toISOString();
      if (sanctionFile) {
        try {
          setUploadingFile(true);
          const url = await uploadDocument(sanctionFile, 'sanction-letters');
          updates.sanction_letter_url = url;
        } catch (err: any) { toast.error(`Upload failed: ${err.message}`); return; }
        finally { setUploadingFile(false); }
      }
    } else {
      updates.rejection_reason = rejectionReason;
      updates.lost_reason = 'Loan not approved';
      updates.lost_remarks = rejectionReason;
    }
    updateMutation.mutate(updates);
  };

  const handleDisbursedSave = async () => {
    if (!disbAmount || !disbDate || !disbBank) { toast.error("All disbursement details required"); return; }
    if (!disbursementFile && !application.disbursement_letter_url) { toast.error("Upload disbursement proof document"); return; }

    const updates: any = {
      stage: 'disbursed', disbursement_amount: Number(disbAmount), disbursement_date: disbDate,
      lender_name: disbBank, incentive_eligible: true, converted_at: new Date().toISOString(),
      remarks: `Disbursed: ₹${disbAmount} via ${disbBank}`,
    };

    if (disbursementFile) {
      try {
        setUploadingFile(true);
        const url = await uploadDocument(disbursementFile, 'disbursement-proofs');
        updates.disbursement_letter_url = url;
      } catch (err: any) { toast.error(`Upload failed: ${err.message}`); return; }
      finally { setUploadingFile(false); }
    }
    updateMutation.mutate(updates);
  };

  const handleLostSave = () => {
    if (!lostReason) { toast.error("Select lost reason"); return; }
    if (!lostRemarks.trim()) { toast.error("Remarks required"); return; }
    updateMutation.mutate({ stage: 'lost', lost_reason: lostReason, lost_remarks: lostRemarks });
  };

  const handleMoveStage = (stage: string) => {
    updateMutation.mutate({ stage, remarks: remarks || `Moved to ${STAGE_LABELS[stage as LoanStage]}` });
  };

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${STAGE_COLORS[currentStage as LoanStage] || ''}`}>
              <Banknote className="h-4 w-4" />
            </div>
            {application.customer_name}
            <Badge className={`text-[10px] ${STAGE_COLORS[currentStage as LoanStage] || ''}`}>
              {STAGE_LABELS[currentStage as LoanStage] || currentStage}
            </Badge>
            {loanTypeInfo && <Badge className={`text-[9px] ${loanTypeInfo.color}`}>{loanTypeInfo.label}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Info Card */}
          <Card className="border-border/50 bg-muted/30">
            <CardContent className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground">Client ID</p>
                  <p className="font-mono text-xs font-semibold">{application.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Phone</p>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-xs">{application.phone}</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => window.open(`tel:+91${application.phone.replace(/\D/g, '').slice(-10)}`)}>
                      <PhoneCall className="h-3 w-3 text-emerald-600" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={async () => {
                      const msg = `Hi ${application.customer_name}, this is from GrabYourCar regarding your car loan. How can I help?`;
                      const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
                      await sendWhatsApp({ phone: application.phone, message: msg, name: application.customer_name, logEvent: "loan_followup" });
                    }}>
                      <MessageCircle className="h-3 w-3 text-green-600" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Loan Amount</p>
                  <p className="font-semibold text-xs">{formatAmount(application.loan_amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Car</p>
                  <p className="text-xs">{application.car_model || '—'}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {application.source && <Badge variant="outline" className="text-[9px]">Source: {application.source}</Badge>}
                {loanTypeInfo && <Badge variant="outline" className={`text-[9px] ${loanTypeInfo.color}`}>{loanTypeInfo.label}</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Remarks */}
          {application.remarks && (
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Remarks History</p>
              <div className="bg-muted/30 rounded p-2 text-xs whitespace-pre-wrap max-h-24 overflow-y-auto">{application.remarks}</div>
            </div>
          )}

          {/* Quote History */}
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Shared Quotes / Offers
            </p>
            <LoanQuoteHistory applicationId={application.id} phone={application.phone} />
          </div>

          {/* SMART CALLING — only for new_lead & smart_calling */}
          {(currentStage === 'new_lead' || currentStage === 'smart_calling') && (
            <div className="space-y-3 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-medium"><PhoneCall className="h-4 w-4" /> Smart Calling</div>
              <div>
                <Label>Call Status *</Label>
                <Select value={callStatus} onValueChange={setCallStatus}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>{CALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Remarks *</Label><Textarea value={callRemarks} onChange={e => setCallRemarks(e.target.value)} placeholder="Call notes..." rows={2} /></div>
              <Button onClick={handleSmartCallingSave} disabled={updateMutation.isPending} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                {updateMutation.isPending ? "Saving..." : "Save & Update Status"}
              </Button>
            </div>
          )}

          {/* OFFER SHARED — only for interested & offer_shared */}
          {(currentStage === 'interested' || currentStage === 'offer_shared') && (
            <div className="space-y-3 p-4 rounded-lg border border-violet-500/20 bg-violet-500/5">
              <div className="flex items-center gap-2 text-violet-700 text-sm font-medium"><Building2 className="h-4 w-4" /> Share Offer — Bank Partners</div>
              <div>
                <Label>Select Bank/NBFC *</Label>
                <Select value={selectedBank} onValueChange={(v) => { setSelectedBank(v); if (v !== '__custom__') setCustomBankName(''); }}>
                  <SelectTrigger><SelectValue placeholder="Choose bank partner" /></SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {bankPartners.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} {b.interest_rate_min ? `(${b.interest_rate_min}%-${b.interest_rate_max}%)` : ''}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Add Custom Bank/NBFC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedBank === '__custom__' && (
                <div>
                  <Label>Custom Bank/NBFC Name *</Label>
                  <Input placeholder="Enter bank or NBFC name" value={customBankName} onChange={e => setCustomBankName(e.target.value)} />
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Interest %</Label><Input type="number" step="0.1" value={interestRate} onChange={e => setInterestRate(e.target.value)} /></div>
                <div><Label>Tenure (months)</Label><Input type="number" value={tenureMonths} onChange={e => setTenureMonths(e.target.value)} /></div>
                <div>
                  <Label>EMI Amount <span className="text-[9px] text-muted-foreground">(auto-calculated)</span></Label>
                  <Input type="number" value={emiAmount} readOnly className="bg-muted/50 font-semibold" />
                </div>
              </div>
              <div><Label>Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Offer details..." rows={2} /></div>
              <Button onClick={handleOfferSave} disabled={updateMutation.isPending} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                {updateMutation.isPending ? "Saving..." : "Save Offer Details"}
              </Button>
            </div>
          )}

          {/* LOAN APPLICATION — only for loan_application stage */}
          {(currentStage === 'loan_application' || application._targetStage === 'loan_application') && (
            <div className="space-y-3 p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
              <div className="flex items-center gap-2 text-indigo-700 text-sm font-medium"><FileText className="h-4 w-4" /> Loan Application Status</div>
              <div>
                <Label>Loan Status *</Label>
                <Select value={loanStatus} onValueChange={setLoanStatus}>
                  <SelectTrigger><SelectValue placeholder="Approved or Rejected?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">✅ Approved</SelectItem>
                    <SelectItem value="rejected">❌ Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {loanStatus === 'approved' && <div><Label>Sanction Amount *</Label><Input type="number" value={sanctionAmount} onChange={e => setSanctionAmount(e.target.value)} placeholder="e.g. 750000" /></div>}
              {loanStatus === 'approved' && (
                <div>
                  <Label className="flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> Sanction / Approval Letter * <span className="text-[9px] text-muted-foreground">(PDF, JPG, PNG)</span>
                  </Label>
                  {application.sanction_letter_url ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">✅ Already uploaded</Badge>
                      <Button variant="link" size="sm" className="text-[10px] h-5 p-0" onClick={() => window.open(application.sanction_letter_url, '_blank')}>View</Button>
                    </div>
                  ) : null}
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-1" onChange={e => setSanctionFile(e.target.files?.[0] || null)} />
                  {!sanctionFile && !application.sanction_letter_url && (
                    <p className="text-[10px] text-red-500 mt-1">⚠ Upload sanction/approval letter to proceed</p>
                  )}
                </div>
              )}
              {loanStatus === 'rejected' && <div><Label>Rejection Reason *</Label><Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Why was loan rejected?" rows={2} /></div>}
              <div><Label>Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} /></div>
              <Button onClick={handleLoanAppSave} disabled={!loanStatus || updateMutation.isPending || uploadingFile || (loanStatus === 'approved' && !sanctionFile && !application.sanction_letter_url)}
                className={`w-full ${loanStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}>
                {uploadingFile ? "Uploading..." : updateMutation.isPending ? "Saving..." : loanStatus === 'rejected' ? 'Mark as Rejected (Lost)' : 'Save Approval'}
              </Button>
            </div>
          )}

          {/* DISBURSED — Read-only summary when already disbursed */}
          {currentStage === 'disbursed' && !application._targetStage && (
            <div className="space-y-3 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium"><CheckCircle2 className="h-4 w-4" /> Disbursement Complete</div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">🔒 Locked</Badge>
              </div>
              {application.incentive_eligible && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">✅ Incentive Eligible</Badge>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Disbursed Amount</p>
                  <p className="font-bold text-emerald-600 text-sm">{application.disbursement_amount ? `₹${Number(application.disbursement_amount).toLocaleString('en-IN')}` : '—'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Disbursement Date</p>
                  <p className="font-semibold">{application.disbursement_date ? new Date(application.disbursement_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Bank / Lender</p>
                  <p className="font-semibold flex items-center gap-1"><Building2 className="h-3 w-3 text-muted-foreground" />{application.lender_name || '—'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">EMI</p>
                  <p className="font-bold text-primary">{application.emi_amount ? `₹${Math.round(application.emi_amount).toLocaleString('en-IN')}` : '—'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Interest Rate</p>
                  <p className="font-semibold">{application.interest_rate ? `${application.interest_rate}%` : '—'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Tenure</p>
                  <p className="font-semibold">{application.tenure_months ? `${application.tenure_months} months` : '—'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Car</p>
                  <p className="font-semibold">{application.car_model || '—'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Sanction Amount</p>
                  <p className="font-semibold">{application.sanction_amount ? `₹${Number(application.sanction_amount).toLocaleString('en-IN')}` : '—'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-background border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Loan Amount</p>
                  <p className="font-semibold">{application.loan_amount ? `₹${Number(application.loan_amount).toLocaleString('en-IN')}` : '—'}</p>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Documents</p>
                <div className="flex flex-wrap gap-2">
                  {application.sanction_letter_url && (
                    <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1.5" onClick={() => window.open(application.sanction_letter_url, '_blank')}>
                      <FileText className="h-3 w-3 text-indigo-500" /> Sanction Letter
                    </Button>
                  )}
                  {application.disbursement_letter_url && (
                    <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1.5" onClick={() => window.open(application.disbursement_letter_url, '_blank')}>
                      <FileText className="h-3 w-3 text-emerald-500" /> Disbursement Proof
                    </Button>
                  )}
                  {!application.sanction_letter_url && !application.disbursement_letter_url && (
                    <p className="text-[10px] text-muted-foreground">No documents uploaded</p>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {application.remarks && (
                <div className="rounded-lg border p-2.5 bg-background">
                  <p className="text-[10px] text-muted-foreground mb-1">Remarks</p>
                  <p className="text-xs whitespace-pre-wrap">{application.remarks}</p>
                </div>
              )}
            </div>
          )}

          {/* DISBURSED — Entry form when moving TO disbursed */}
          {currentStage !== 'disbursed' && application._targetStage === 'disbursed' && (
            <div className="space-y-3 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium"><CheckCircle2 className="h-4 w-4" /> Disbursement Details</div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Disbursement Amount *</Label><Input type="number" value={disbAmount} onChange={e => setDisbAmount(e.target.value)} /></div>
                <div><Label>Disbursement Date *</Label><Input type="date" value={disbDate} onChange={e => setDisbDate(e.target.value)} /></div>
              </div>
              <div><Label>Bank Name *</Label><Input value={disbBank} onChange={e => setDisbBank(e.target.value)} placeholder="e.g. HDFC Bank" /></div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 rounded bg-background border"><p className="text-muted-foreground">Car</p><p className="font-medium">{application.car_model || '—'}</p></div>
                <div className="p-2 rounded bg-background border"><p className="text-muted-foreground">Sanction Amount</p><p className="font-medium">{application.sanction_amount ? `₹${(application.sanction_amount / 100000).toFixed(1)}L` : '-'}</p></div>
              </div>
              <div>
                <Label className="flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> Disbursement Proof * <span className="text-[9px] text-muted-foreground">(PDF, JPG, PNG)</span>
                </Label>
                {application.disbursement_letter_url ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">✅ Already uploaded</Badge>
                    <Button variant="link" size="sm" className="text-[10px] h-5 p-0" onClick={() => window.open(application.disbursement_letter_url, '_blank')}>View</Button>
                  </div>
                ) : null}
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-1" onChange={e => setDisbursementFile(e.target.files?.[0] || null)} />
                {!disbursementFile && !application.disbursement_letter_url && (
                  <p className="text-[10px] text-red-500 mt-1">⚠ Upload disbursement proof to proceed</p>
                )}
              </div>
              <div><Label>Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} /></div>
              <Button onClick={handleDisbursedSave} disabled={updateMutation.isPending || uploadingFile || (!disbursementFile && !application.disbursement_letter_url)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                {uploadingFile ? "Uploading..." : updateMutation.isPending ? "Saving..." : "Complete Disbursement & Enable Incentive"}
              </Button>
            </div>
          )}

          {/* LOST */}
          {(application._targetStage === 'lost' || currentStage === 'lost') && currentStage !== 'lost' && (
            <div className="space-y-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2 text-red-600 text-sm font-medium"><AlertTriangle className="h-4 w-4" /> Mark as Lost</div>
              <div>
                <Label>Lost Reason *</Label>
                <Select value={lostReason} onValueChange={setLostReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>{LOST_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Detailed Remarks *</Label><Textarea value={lostRemarks} onChange={e => setLostRemarks(e.target.value)} placeholder="Why was this lead lost?" rows={3} /></div>
              <Button onClick={handleLostSave} disabled={updateMutation.isPending} variant="destructive" className="w-full">
                {updateMutation.isPending ? "Saving..." : "Mark as Lost"}
              </Button>
            </div>
          )}

          {/* Quick Move Buttons */}
          {!application._targetStage && currentStage !== 'disbursed' && currentStage !== 'lost' && (
            <div className="border-t pt-3">
              <p className="text-[10px] text-muted-foreground mb-2">Quick Move to Stage</p>
              <div className="flex flex-wrap gap-1.5">
                {LOAN_STAGES.filter(s => s !== currentStage).map(s => (
                  <Button key={s} variant="outline" size="sm" className={`text-[10px] h-7 ${STAGE_COLORS[s]}`}
                    onClick={() => {
                      if (s === 'lost' || s === 'disbursed' || s === 'loan_application') setTargetStage(s);
                      else handleMoveStage(s);
                    }}>
                    {STAGE_LABELS[s]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
