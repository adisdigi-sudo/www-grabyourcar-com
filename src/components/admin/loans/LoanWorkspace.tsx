import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Banknote, Plus, Phone, IndianRupee, Car, GripVertical, Calculator,
  Share2, PhoneCall, MessageCircle, CheckCircle2, XCircle, Building2,
  FileText, Upload, AlertTriangle, Clock, TrendingUp, Users, Download, Flame, FileSpreadsheet
} from "lucide-react";
import jsPDF from "jspdf";
import { LeadImportDialog } from "../shared/LeadImportDialog";
import { StageNotificationBanner, buildLoanNotifications } from "../shared/StageNotificationBanner";
import {
  LOAN_STAGES, STAGE_LABELS, STAGE_COLORS, LEAD_SOURCES, PRIORITY_OPTIONS,
  CALL_STATUSES, LOST_REASONS, normalizeStage, type LoanStage
} from "./LoanStageConfig";

// ─── EMI Calculator ───
const EMICalculator = () => {
  const [amount, setAmount] = useState(800000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(60);
  const [showShare, setShowShare] = useState(false);

  const monthlyRate = rate / 12 / 100;
  const emi = monthlyRate > 0
    ? (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1)
    : amount / tenure;
  const totalPayable = emi * tenure;
  const totalInterest = totalPayable - amount;

  const formatAmt = (v: number) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${Math.round(v)}`;
  };

  const handleShareWhatsApp = () => {
    const msg = `🚗 *Car Loan EMI Plan*\n\n💰 Loan Amount: ${formatAmt(amount)}\n📊 Interest Rate: ${rate}%\n📅 Tenure: ${tenure} months\n\n💵 *Monthly EMI: ${formatAmt(emi)}*\n📈 Total Interest: ${formatAmt(totalInterest)}\n💳 Total Payable: ${formatAmt(totalPayable)}\n\n_Powered by GrabYourCar_\n🌐 www.grabyourcar.com`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();

    // Header gradient
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, w, 50, "F");
    doc.setFillColor(13, 148, 103);
    doc.rect(0, 45, w, 5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Car Loan EMI Plan", w / 2, 22, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("GrabYourCar - Your Trusted Auto Finance Partner", w / 2, 32, { align: "center" });
    doc.text("www.grabyourcar.com", w / 2, 40, { align: "center" });

    let y = 65;
    doc.setTextColor(60, 60, 60);

    // Summary box
    const boxX = 20; const boxW = w - 40;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(boxX, y, boxW, 40, 4, 4, "F");
    doc.setDrawColor(16, 185, 129);
    doc.roundedRect(boxX, y, boxW, 40, 4, 4, "S");

    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text(formatAmt(emi), w / 2, y + 20, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Monthly EMI", w / 2, y + 30, { align: "center" });

    y += 55;

    // Details table
    const rows = [
      ["Loan Amount", formatAmt(amount)],
      ["Interest Rate (p.a.)", `${rate}%`],
      ["Tenure", `${tenure} months (${(tenure / 12).toFixed(1)} years)`],
      ["Monthly EMI", formatAmt(emi)],
      ["Total Interest Payable", formatAmt(totalInterest)],
      ["Total Amount Payable", formatAmt(totalPayable)],
    ];

    rows.forEach(([label, value], i) => {
      const rowY = y + i * 14;
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(boxX, rowY - 4, boxW, 14, "F");
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(label, boxX + 8, rowY + 4);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(value, boxX + boxW - 8, rowY + 4, { align: "right" });
    });

    y += rows.length * 14 + 15;

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(boxX, y, boxX + boxW, y);
    y += 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("* This is an indicative EMI calculation. Actual EMI may vary based on bank/NBFC terms.", boxX, y);
    doc.text(`Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")} | GrabYourCar`, boxX, y + 6);

    doc.save(`EMI_Plan_Rs${Math.round(amount / 100000)}L_${tenure}m.pdf`);
    toast.success("EMI Plan PDF downloaded!");
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border bg-card">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/8 via-teal-500/5 to-cyan-500/8" />
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-xl tracking-tight">Car Loan EMI Calculator</h2>
              <p className="text-xs text-muted-foreground">Calculate & share beautiful EMI plans instantly</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10" onClick={handleShareWhatsApp}>
              <Share2 className="h-4 w-4" /> Share WhatsApp
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Loan Amount (₹)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
              className="mt-1 font-semibold bg-background/60" />
            <input type="range" min={100000} max={5000000} step={50000} value={amount}
              onChange={e => setAmount(Number(e.target.value))} className="w-full mt-1 accent-emerald-500" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Interest Rate (%)</Label>
            <Input type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value))}
              className="mt-1 font-semibold bg-background/60" />
            <input type="range" min={5} max={20} step={0.1} value={rate}
              onChange={e => setRate(Number(e.target.value))} className="w-full mt-1 accent-emerald-500" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tenure (months)</Label>
            <Input type="number" value={tenure} onChange={e => setTenure(Number(e.target.value))}
              className="mt-1 font-semibold bg-background/60" />
            <input type="range" min={12} max={84} step={6} value={tenure}
              onChange={e => setTenure(Number(e.target.value))} className="w-full mt-1 accent-emerald-500" />
          </div>
          <div className="flex flex-col justify-center items-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly EMI</p>
            <p className="text-2xl font-bold text-emerald-600">{formatAmt(emi)}</p>
            <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
              <span>Interest: {formatAmt(totalInterest)}</span>
              <span>Total: {formatAmt(totalPayable)}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Workspace ───
export const LoanWorkspace = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingApp, setDraggingApp] = useState<any>(null);
  const [newApp, setNewApp] = useState({
    customer_name: '', phone: '', loan_amount: '', car_model: '',
    priority: 'medium', source: 'Manual', remarks: '',
  });

  const [showImport, setShowImport] = useState(false);

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

  const { data: bankPartners = [] } = useQuery({
    queryKey: ['loan-bank-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_bank_partners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Normalize legacy stages
  const applications = useMemo(() =>
    rawApplications.map((a: any) => ({
      ...a,
      stage: normalizeStage(a.stage),
    })),
    [rawApplications]
  );

  // KPI stats
  const totalApps = applications.length;
  const inPipeline = applications.filter((a: any) => !['disbursed', 'lost'].includes(a.stage)).length;
  const disbursed = applications.filter((a: any) => a.stage === 'disbursed').length;
  const lost = applications.filter((a: any) => a.stage === 'lost').length;
  const totalValue = applications
    .filter((a: any) => a.stage === 'disbursed')
    .reduce((s: number, a: any) => s + (Number(a.disbursement_amount) || Number(a.loan_amount) || 0), 0);

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
        lead_source_tag: app.source.toLowerCase().replace(/\s/g, '_'),
        remarks: app.remarks || null,
        stage: 'new_lead',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success("Lead added");
      setShowAddDialog(false);
      setNewApp({ customer_name: '', phone: '', loan_amount: '', car_model: '', priority: 'medium', source: 'Manual', remarks: '' });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Quick stage move
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
      const app = applications.find((a: any) => a.id === data.id);
      if (!app) return;
      // Stages needing modal: lost, disbursed, loan_application, offer_shared
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

  const handleWhatsApp = (phone: string, name: string) => {
    const msg = `Hi ${name}, this is from GrabYourCar regarding your car loan inquiry. How can I help you today?`;
    window.open(`https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const formatAmount = (amt: number | null) => {
    if (!amt) return '—';
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
    return `₹${(amt / 1000).toFixed(0)}K`;
  };

  const pipelineStages = LOAN_STAGES.filter(s => s !== 'lost');

  return (
    <div className="space-y-5">
      {/* EMI Calculator Header */}
      <EMICalculator />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Leads", value: totalApps, icon: Users, color: "text-blue-600", bg: "from-blue-500/10" },
          { label: "In Pipeline", value: inPipeline, icon: TrendingUp, color: "text-indigo-600", bg: "from-indigo-500/10" },
          { label: "Disbursed", value: disbursed, icon: CheckCircle2, color: "text-emerald-600", bg: "from-emerald-500/10" },
          { label: "Lost", value: lost, icon: XCircle, color: "text-red-600", bg: "from-red-500/10" },
          { label: "Total Value", value: formatAmount(totalValue), icon: IndianRupee, color: "text-emerald-600", bg: "from-emerald-500/10" },
        ].map((s, i) => (
          <Card key={i} className="border-border/40 overflow-hidden">
            <CardContent className="p-3 relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} to-transparent opacity-50`} />
              <div className="relative flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg bg-background/80 ${s.color}`}>
                  <s.icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{s.value}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Pipeline</h2>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            {disbursed} Disbursed
          </Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            {lost} Lost
          </Badge>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4" /> New Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-emerald-600" /> New Car Loan Lead</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={newApp.customer_name} onChange={e => setNewApp(p => ({ ...p, customer_name: e.target.value }))} /></div>
                <div><Label>Phone *</Label><Input value={newApp.phone} onChange={e => setNewApp(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Loan Amount</Label><Input type="number" value={newApp.loan_amount} onChange={e => setNewApp(p => ({ ...p, loan_amount: e.target.value }))} /></div>
                <div><Label>Car Model</Label><Input value={newApp.car_model} onChange={e => setNewApp(p => ({ ...p, car_model: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={newApp.priority} onValueChange={v => setNewApp(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Source</Label>
                  <Select value={newApp.source} onValueChange={v => setNewApp(p => ({ ...p, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Remarks</Label><Textarea value={newApp.remarks} onChange={e => setNewApp(p => ({ ...p, remarks: e.target.value }))} rows={2} /></div>
              <Button onClick={() => createMutation.mutate(newApp)} disabled={!newApp.customer_name || !newApp.phone || createMutation.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
                Create Lead
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Drag hint */}
      {draggingApp && (
        <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-1.5 border border-dashed border-primary/30 animate-pulse">
          Drop on a stage to move <strong>{draggingApp.customer_name}</strong>
        </div>
      )}

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {pipelineStages.map(stage => {
            const stageApps = applications.filter((a: any) => a.stage === stage);
            const stageValue = stageApps.reduce((s: number, a: any) => s + (Number(a.loan_amount) || 0), 0);
            const isDragOver = dragOverStage === stage;
            const showDropIndicator = draggingApp && isDragOver;

            return (
              <div key={stage} className="w-[270px] shrink-0 flex flex-col"
                onDragOver={e => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, stage)}>
                {/* Column Header */}
                <div className={`rounded-lg border p-2.5 mb-2 transition-all ${STAGE_COLORS[stage]} ${
                  showDropIndicator ? 'ring-2 ring-primary scale-[1.02] shadow-lg' : ''
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs">{STAGE_LABELS[stage]}</span>
                    <Badge variant="secondary" className="text-[10px] h-5">{stageApps.length}</Badge>
                  </div>
                  {stageValue > 0 && (
                    <p className="text-[10px] mt-1 opacity-70">₹{(stageValue / 100000).toFixed(1)}L</p>
                  )}
                </div>

                {/* Cards */}
                <div className={`space-y-2 min-h-[120px] flex-1 rounded-lg transition-all p-1 ${
                  showDropIndicator ? 'bg-primary/5 border-2 border-dashed border-primary/30' : ''
                }`}>
                  {stageApps.length === 0 && !showDropIndicator && (
                    <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/40 py-8">No leads</div>
                  )}
                  {showDropIndicator && stageApps.length === 0 && (
                    <div className="h-full flex items-center justify-center text-[11px] text-primary/60 py-8 font-medium">Drop here ✓</div>
                  )}
                  {stageApps.map((app: any) => (
                    <LoanCard key={app.id} app={app} stage={stage}
                      onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                      onClick={handleCardClick} onWhatsApp={handleWhatsApp}
                      isDragging={draggingApp?.id === app.id} formatAmount={formatAmount} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Lost Column */}
          <div className="w-[270px] shrink-0 flex flex-col"
            onDragOver={e => handleDragOver(e, 'lost')}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 'lost')}>
            <div className={`rounded-lg border p-2.5 mb-2 transition-all ${STAGE_COLORS['lost']} ${
              dragOverStage === 'lost' && draggingApp ? 'ring-2 ring-red-500 scale-[1.02] shadow-lg' : ''
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs">Lost</span>
                <Badge variant="secondary" className="text-[10px] h-5">{lost}</Badge>
              </div>
            </div>
            <div className={`space-y-2 min-h-[120px] flex-1 rounded-lg transition-all p-1 ${
              dragOverStage === 'lost' && draggingApp ? 'bg-red-500/5 border-2 border-dashed border-red-500/30' : ''
            }`}>
              {applications.filter((a: any) => a.stage === 'lost').slice(0, 5).map((app: any) => (
                <LoanCard key={app.id} app={app} stage="lost"
                  onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                  onClick={handleCardClick} onWhatsApp={handleWhatsApp}
                  isDragging={draggingApp?.id === app.id} formatAmount={formatAmount} />
              ))}
            </div>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Stage Detail Modal */}
      {selectedApp && (
        <LoanStageDetailModal
          open={showStageModal}
          onOpenChange={setShowStageModal}
          application={selectedApp}
          bankPartners={bankPartners}
        />
      )}
    </div>
  );
};

// ─── Lead Card ───
const LoanCard = ({ app, stage, onDragStart, onDragEnd, onClick, onWhatsApp, isDragging, formatAmount }: any) => {
  const sourceColors: Record<string, string> = {
    meta: 'bg-blue-500/10 text-blue-600', 'google ads': 'bg-red-500/10 text-red-600',
    referral: 'bg-green-500/10 text-green-600', 'walk-in': 'bg-amber-500/10 text-amber-600',
    'whatsapp broadcast': 'bg-emerald-500/10 text-emerald-600', website: 'bg-purple-500/10 text-purple-600',
    manual: 'bg-gray-500/10 text-gray-600', partner: 'bg-indigo-500/10 text-indigo-600',
  };

  return (
    <Card draggable onDragStart={e => onDragStart(e, app)} onDragEnd={onDragEnd}
      className={`border-border/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${isDragging ? 'opacity-30 scale-95' : ''}`}
      onClick={() => onClick(app)}>
      <CardContent className="p-2.5 space-y-1.5">
        {/* Client ID + Name */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0" />
            <span className="font-medium text-xs truncate max-w-[140px]">{app.customer_name}</span>
          </div>
          {app.priority && (
            <Badge className={`text-[9px] px-1.5 py-0 shrink-0 ${PRIORITY_OPTIONS.find((o: any) => o.value === app.priority)?.color || ''}`}>
              {app.priority === 'hot' ? '🔥' : ''} {app.priority}
            </Badge>
          )}
        </div>

        {/* Client ID */}
        <div className="text-[9px] font-mono text-muted-foreground/50 truncate">ID: {app.id.slice(0, 8)}</div>

        {/* Phone + Quick Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Phone className="h-2.5 w-2.5" />{app.phone}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => { e.stopPropagation(); window.open(`tel:+91${app.phone.replace(/\D/g, '').slice(-10)}`, '_self'); }}>
              <PhoneCall className="h-3 w-3 text-emerald-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => { e.stopPropagation(); onWhatsApp(app.phone, app.customer_name); }}>
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
          <Badge className={`text-[8px] px-1 py-0 ${sourceColors[app.source.toLowerCase()] || 'bg-gray-500/10 text-gray-500'}`}>
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
  const [interestRate, setInterestRate] = useState(application?.interest_rate?.toString() || '');
  const [tenureMonths, setTenureMonths] = useState(application?.tenure_months?.toString() || '');
  const [emiAmount, setEmiAmount] = useState(application?.emi_amount?.toString() || '');
  const [sanctionAmount, setSanctionAmount] = useState(application?.sanction_amount?.toString() || '');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loanStatus, setLoanStatus] = useState<string>(application?.sanction_amount ? 'approved' : '');
  const [disbAmount, setDisbAmount] = useState(application?.disbursement_amount?.toString() || '');
  const [disbDate, setDisbDate] = useState(application?.disbursement_date || '');
  const [disbBank, setDisbBank] = useState(application?.lender_name || '');
  // Removed unused fileRef

  const currentStage = application?.stage || 'new_lead';

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from('loan_applications')
        .update({ ...updates, last_activity_at: new Date().toISOString(), stage_updated_at: new Date().toISOString() })
        .eq('id', application.id);
      if (error) throw error;
      if (updates.stage && updates.stage !== currentStage) {
        await supabase.from('loan_stage_history').insert({
          application_id: application.id,
          from_stage: currentStage,
          to_stage: updates.stage,
          changed_by: user?.id,
          remarks: updates.remarks || remarks || null,
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
    const updates: any = {
      call_status: callStatus,
      call_remarks: callRemarks,
      remarks: callRemarks,
      stage: nextStage,
    };
    if (nextStage === 'lost') {
      updates.lost_reason = 'Customer not responding';
      updates.lost_remarks = callRemarks;
    }
    updateMutation.mutate(updates);
  };

  const handleOfferSave = () => {
    if (!selectedBank) { toast.error("Select a bank partner"); return; }
    updateMutation.mutate({
      bank_partner_id: selectedBank,
      lender_name: bankPartners.find((b: any) => b.id === selectedBank)?.name || '',
      interest_rate: interestRate ? Number(interestRate) : null,
      tenure_months: tenureMonths ? Number(tenureMonths) : null,
      emi_amount: emiAmount ? Number(emiAmount) : null,
      stage: 'offer_shared',
      remarks: remarks || `Offer shared: ${bankPartners.find((b: any) => b.id === selectedBank)?.name}`,
    });
  };

  const handleLoanAppSave = () => {
    if (!loanStatus) { toast.error("Select loan status"); return; }
    if (loanStatus === 'rejected' && !rejectionReason.trim()) { toast.error("Rejection reason required"); return; }
    if (loanStatus === 'approved' && !sanctionAmount) { toast.error("Sanction amount required"); return; }
    const updates: any = {
      stage: loanStatus === 'approved' ? 'loan_application' : 'lost',
      remarks: remarks || (loanStatus === 'approved' ? `Approved: ₹${sanctionAmount}` : `Rejected: ${rejectionReason}`),
    };
    if (loanStatus === 'approved') {
      updates.sanction_amount = Number(sanctionAmount);
      updates.sanction_date = new Date().toISOString();
    } else {
      updates.rejection_reason = rejectionReason;
      updates.lost_reason = 'Loan not approved';
      updates.lost_remarks = rejectionReason;
    }
    updateMutation.mutate(updates);
  };

  const handleDisbursedSave = () => {
    if (!disbAmount || !disbDate || !disbBank) { toast.error("All disbursement details required"); return; }
    updateMutation.mutate({
      stage: 'disbursed',
      disbursement_amount: Number(disbAmount),
      disbursement_date: disbDate,
      lender_name: disbBank,
      incentive_eligible: true,
      converted_at: new Date().toISOString(),
      remarks: `Disbursed: ₹${disbAmount} via ${disbBank}`,
    });
  };

  const handleLostSave = () => {
    if (!lostReason) { toast.error("Select lost reason"); return; }
    if (!lostRemarks.trim()) { toast.error("Remarks required"); return; }
    updateMutation.mutate({
      stage: 'lost',
      lost_reason: lostReason,
      lost_remarks: lostRemarks,
    });
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
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client ID Card */}
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
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                      const msg = `Hi ${application.customer_name}, this is from GrabYourCar regarding your car loan. How can I help?`;
                      window.open(`https://wa.me/91${application.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(msg)}`);
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
              {application.source && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-[9px]">Source: {application.source}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Remarks / Chat History */}
          {application.remarks && (
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Remarks History</p>
              <div className="bg-muted/30 rounded p-2 text-xs whitespace-pre-wrap max-h-24 overflow-y-auto">
                {application.remarks}
              </div>
            </div>
          )}

          {/* ─── Stage-Specific Actions ─── */}

          {/* SMART CALLING */}
          {(currentStage === 'new_lead' || currentStage === 'smart_calling') && (
            <div className="space-y-3 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                <PhoneCall className="h-4 w-4" /> Smart Calling
              </div>
              <div>
                <Label>Call Status *</Label>
                <Select value={callStatus} onValueChange={setCallStatus}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {CALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Remarks *</Label>
                <Textarea value={callRemarks} onChange={e => setCallRemarks(e.target.value)} placeholder="Call notes..." rows={2} />
              </div>
              <Button onClick={handleSmartCallingSave} disabled={updateMutation.isPending} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                {updateMutation.isPending ? "Saving..." : "Save & Update Status"}
              </Button>
            </div>
          )}

          {/* OFFER SHARED */}
          {(currentStage === 'interested' || currentStage === 'offer_shared') && (
            <div className="space-y-3 p-4 rounded-lg border border-violet-500/20 bg-violet-500/5">
              <div className="flex items-center gap-2 text-violet-700 text-sm font-medium">
                <Building2 className="h-4 w-4" /> Share Offer — Bank Partners
              </div>
              <div>
                <Label>Select Bank/NBFC *</Label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger><SelectValue placeholder="Choose bank partner" /></SelectTrigger>
                  <SelectContent>
                    {bankPartners.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.interest_rate_min ? `(${b.interest_rate_min}%-${b.interest_rate_max}%)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Interest %</Label><Input type="number" step="0.1" value={interestRate} onChange={e => setInterestRate(e.target.value)} /></div>
                <div><Label>Tenure (months)</Label><Input type="number" value={tenureMonths} onChange={e => setTenureMonths(e.target.value)} /></div>
                <div><Label>EMI Amount</Label><Input type="number" value={emiAmount} onChange={e => setEmiAmount(e.target.value)} /></div>
              </div>
              <div><Label>Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Offer details..." rows={2} /></div>
              <Button onClick={handleOfferSave} disabled={updateMutation.isPending} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                {updateMutation.isPending ? "Saving..." : "Save Offer Details"}
              </Button>
            </div>
          )}

          {/* LOAN APPLICATION */}
          {(currentStage === 'offer_shared' || currentStage === 'loan_application' || application._targetStage === 'loan_application') && (
            <div className="space-y-3 p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
              <div className="flex items-center gap-2 text-indigo-700 text-sm font-medium">
                <FileText className="h-4 w-4" /> Loan Application Status
              </div>
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
              {loanStatus === 'approved' && (
                <div><Label>Sanction Amount *</Label><Input type="number" value={sanctionAmount} onChange={e => setSanctionAmount(e.target.value)} placeholder="e.g. 750000" /></div>
              )}
              {loanStatus === 'rejected' && (
                <div><Label>Rejection Reason *</Label><Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Why was loan rejected?" rows={2} /></div>
              )}
              <div><Label>Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} /></div>
              <Button onClick={handleLoanAppSave} disabled={!loanStatus || updateMutation.isPending}
                className={`w-full ${loanStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}>
                {updateMutation.isPending ? "Saving..." : loanStatus === 'rejected' ? 'Mark as Rejected (Lost)' : 'Save Approval'}
              </Button>
            </div>
          )}

          {/* DISBURSED */}
          {(currentStage === 'loan_application' || currentStage === 'disbursed' || application._targetStage === 'disbursed') && (
            <div className="space-y-3 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" /> Disbursement Details
              </div>
              {currentStage === 'disbursed' && application.incentive_eligible && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">✅ Incentive Eligible</Badge>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Disbursement Amount *</Label><Input type="number" value={disbAmount} onChange={e => setDisbAmount(e.target.value)} /></div>
                <div><Label>Disbursement Date *</Label><Input type="date" value={disbDate} onChange={e => setDisbDate(e.target.value)} /></div>
              </div>
              <div><Label>Bank Name *</Label><Input value={disbBank} onChange={e => setDisbBank(e.target.value)} placeholder="e.g. HDFC Bank" /></div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 rounded bg-background border">
                  <p className="text-muted-foreground">Car</p>
                  <p className="font-medium">{application.car_model || '—'}</p>
                </div>
                <div className="p-2 rounded bg-background border">
                  <p className="text-muted-foreground">Sanction Amount</p>
                  <p className="font-medium">{application.sanction_amount ? `₹${(application.sanction_amount / 100000).toFixed(1)}L` : '—'}</p>
                </div>
              </div>
              <div><Label>Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} /></div>
              {currentStage !== 'disbursed' && (
                <Button onClick={handleDisbursedSave} disabled={updateMutation.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  {updateMutation.isPending ? "Saving..." : "Complete Disbursement & Enable Incentive"}
                </Button>
              )}
            </div>
          )}

          {/* LOST */}
          {(application._targetStage === 'lost' || currentStage === 'lost') && currentStage !== 'lost' && (
            <div className="space-y-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" /> Mark as Lost
              </div>
              <div>
                <Label>Lost Reason *</Label>
                <Select value={lostReason} onValueChange={setLostReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {LOST_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Detailed Remarks *</Label>
                <Textarea value={lostRemarks} onChange={e => setLostRemarks(e.target.value)} placeholder="Why was this lead lost?" rows={3} />
              </div>
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
                      if (s === 'lost' || s === 'disbursed' || s === 'loan_application') {
                        setTargetStage(s);
                      } else {
                        handleMoveStage(s);
                      }
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

const formatAmount = (amt: number | null) => {
  if (!amt) return '—';
  if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
  return `₹${(amt / 1000).toFixed(0)}K`;
};
