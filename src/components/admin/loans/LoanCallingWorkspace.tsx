import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PhoneCall, Search, IndianRupee, Car,
  CheckCircle2, Filter, ArrowUpDown, Plus,
  Zap, Inbox, Phone, TrendingUp, Timer, XCircle, CalendarClock,
  Banknote, FileText, ArrowRight, Clock, Users
} from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";
import { STAGE_LABELS, STAGE_COLORS, PRIORITY_OPTIONS, LEAD_SOURCES, LOAN_STAGES, type LoanStage } from "./LoanStageConfig";
import { LoanCallDispositionModal } from "./LoanCallDispositionModal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  applications: any[];
}

export const LoanCallingWorkspace = ({ applications }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showDisposition, setShowDisposition] = useState(false);
  const [activeTab, setActiveTab] = useState("smart-queue");
  const [showAddLead, setShowAddLead] = useState(false);

  // New lead form
  const [newLead, setNewLead] = useState({
    customer_name: '', phone: '', loan_amount: '', car_model: '',
    priority: 'medium', source: 'Manual', remarks: '',
  });

  // Fetch latest loan applications
  const { data: resolvedApplications = applications } = useQuery({
    queryKey: ['loan-applications-calling'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_applications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
    initialData: applications,
  });

  // Get today's call stats
  const { data: todayCalls = [] } = useQuery({
    queryKey: ['loan-calls-today'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('call_logs')
        .select('id, disposition, lead_type, duration_seconds, created_at')
        .eq('lead_type', 'loan')
        .gte('created_at', today.toISOString());
      if (error) throw error;
      return data;
    },
  });

  // Create lead mutation
  const createMutation = useMutation({
    mutationFn: async (lead: typeof newLead) => {
      const { error } = await supabase.from('loan_applications').insert({
        customer_name: lead.customer_name,
        phone: lead.phone.replace(/\D/g, ''),
        loan_amount: lead.loan_amount ? Number(lead.loan_amount) : null,
        car_model: lead.car_model || null,
        priority: lead.priority,
        source: lead.source,
        lead_source_tag: lead.source.toLowerCase().replace(/\s/g, '_'),
        remarks: lead.remarks || null,
        stage: 'new_lead',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      queryClient.invalidateQueries({ queryKey: ['loan-applications-calling'] });
      toast.success("Lead added successfully");
      setShowAddLead(false);
      setNewLead({ customer_name: '', phone: '', loan_amount: '', car_model: '', priority: 'medium', source: 'Manual', remarks: '' });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Filter callable applications
  const callableApps = useMemo(() => {
    let filtered = resolvedApplications.filter((a: any) => !['converted', 'lost'].includes(a.stage));

    if (stageFilter !== "all") filtered = filtered.filter((a: any) => a.stage === stageFilter);
    if (priorityFilter !== "all") filtered = filtered.filter((a: any) => a.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((a: any) =>
        a.customer_name?.toLowerCase().includes(q) ||
        a.phone?.includes(q) ||
        a.car_model?.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a: any, b: any) => {
      const aOverdue = a.follow_up_at && isPast(new Date(a.follow_up_at));
      const bOverdue = b.follow_up_at && isPast(new Date(b.follow_up_at));
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      const pOrder: Record<string, number> = { hot: 0, high: 1, medium: 2, low: 3 };
      const pa = pOrder[a.priority || 'medium'] ?? 2;
      const pb = pOrder[b.priority || 'medium'] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [resolvedApplications, stageFilter, priorityFilter, search]);

  // Fresh leads
  const freshLeads = useMemo(() => {
    return resolvedApplications
      .filter((a: any) => a.stage === 'new_lead')
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [resolvedApplications]);

  // Stats
  const connectedToday = todayCalls.filter((c: any) => c.disposition === 'connected').length;
  const totalDuration = todayCalls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0);
  const avgDuration = todayCalls.length > 0 ? Math.round(totalDuration / todayCalls.length / 60 * 10) / 10 : 0;
  const overdueCount = resolvedApplications.filter((a: any) => a.follow_up_at && isPast(new Date(a.follow_up_at)) && !['converted', 'lost'].includes(a.stage)).length;
  const pendingFollowUps = resolvedApplications.filter((a: any) => a.follow_up_at && !isPast(new Date(a.follow_up_at)) && !['converted', 'lost'].includes(a.stage)).length;
  const totalPipelineValue = resolvedApplications
    .filter((a: any) => !['converted', 'lost'].includes(a.stage))
    .reduce((s: number, a: any) => s + (Number(a.loan_amount) || 0), 0);
  const stageBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    resolvedApplications.forEach((a: any) => {
      if (!['converted', 'lost'].includes(a.stage)) {
        counts[a.stage] = (counts[a.stage] || 0) + 1;
      }
    });
    return counts;
  }, [resolvedApplications]);

  const handleDial = (app: any) => {
    const phone = app.phone?.replace(/\D/g, '');
    if (phone) window.open(`tel:+91${phone.slice(-10)}`, '_self');
    setSelectedApp(app);
    setTimeout(() => setShowDisposition(true), 1500);
  };

  const formatAmount = (amt: number) => {
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
    if (amt >= 1000) return `₹${(amt / 1000).toFixed(0)}K`;
    return `₹${amt}`;
  };

  return (
    <div className="space-y-5">
      {/* ===== HERO HEADER — Car Loan Specific ===== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border bg-card"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/8 via-teal-500/5 to-cyan-500/8" />
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/5 rounded-full blur-2xl" />

        <div className="relative z-10 p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20">
                  <Banknote className="h-7 w-7" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-card animate-pulse" />
              </div>
              <div>
                <h2 className="font-bold text-2xl tracking-tight">Car Loan Calling</h2>
                <div className="flex items-center gap-3 mt-1">
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-medium">
                    <Banknote className="h-3 w-3 mr-1" /> Finance CRM
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {resolvedApplications.filter((a: any) => !['converted', 'lost'].includes(a.stage)).length} active leads
                  </span>
                  {totalPipelineValue > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <IndianRupee className="h-3 w-3 mr-0.5" />
                      {formatAmount(totalPipelineValue)} pipeline
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                  <Plus className="h-4 w-4" /> Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-emerald-600" /> New Car Loan Lead</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Name *</Label><Input value={newLead.customer_name} onChange={e => setNewLead(p => ({ ...p, customer_name: e.target.value }))} placeholder="Customer name" /></div>
                    <div><Label>Phone *</Label><Input value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit mobile" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Loan Amount</Label><Input type="number" value={newLead.loan_amount} onChange={e => setNewLead(p => ({ ...p, loan_amount: e.target.value }))} placeholder="e.g. 800000" /></div>
                    <div><Label>Car Model</Label><Input value={newLead.car_model} onChange={e => setNewLead(p => ({ ...p, car_model: e.target.value }))} placeholder="e.g. Hyundai Creta" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Priority</Label>
                      <Select value={newLead.priority} onValueChange={v => setNewLead(p => ({ ...p, priority: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Source</Label>
                      <Select value={newLead.source} onValueChange={v => setNewLead(p => ({ ...p, source: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Remarks</Label><Textarea value={newLead.remarks} onChange={e => setNewLead(p => ({ ...p, remarks: e.target.value }))} placeholder="Any notes..." rows={2} /></div>
                  <Button onClick={() => createMutation.mutate(newLead)} disabled={!newLead.customer_name || !newLead.phone || createMutation.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    {createMutation.isPending ? "Adding..." : "Add to Queue"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stage Pipeline Mini-Bar */}
          <div className="mt-5 flex gap-1 items-end overflow-x-auto pb-1">
            {LOAN_STAGES.filter(s => (s as string) !== 'converted' && s !== 'lost').map(stage => {
              const count = stageBreakdown[stage] || 0;
              const maxCount = Math.max(...Object.values(stageBreakdown), 1);
              return (
                <div key={stage} className="flex flex-col items-center gap-1 min-w-[60px]">
                  <span className="text-[10px] font-bold text-foreground">{count}</span>
                  <div
                    className={`w-full rounded-t-sm transition-all ${count > 0 ? 'bg-emerald-500/60' : 'bg-muted/40'}`}
                    style={{ height: `${Math.max(4, (count / maxCount) * 32)}px` }}
                  />
                  <span className="text-[8px] text-muted-foreground text-center leading-tight whitespace-nowrap">
                    {STAGE_LABELS[stage].split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ===== STATS ROW ===== */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "Calls Today", value: todayCalls.length, icon: PhoneCall, gradient: "from-blue-500/10 to-blue-500/5", iconColor: "text-blue-600" },
          { label: "Connected", value: connectedToday, icon: CheckCircle2, gradient: "from-emerald-500/10 to-emerald-500/5", iconColor: "text-emerald-600" },
          { label: "Connect %", value: `${todayCalls.length > 0 ? Math.round((connectedToday / todayCalls.length) * 100) : 0}%`, icon: TrendingUp, gradient: "from-cyan-500/10 to-cyan-500/5", iconColor: "text-cyan-600" },
          { label: "Avg Time", value: `${avgDuration}m`, icon: Timer, gradient: "from-violet-500/10 to-violet-500/5", iconColor: "text-violet-600" },
          { label: "Follow-ups", value: pendingFollowUps, icon: CalendarClock, gradient: "from-amber-500/10 to-amber-500/5", iconColor: "text-amber-600" },
          { label: "Overdue", value: overdueCount, icon: XCircle, gradient: "from-red-500/10 to-red-500/5", iconColor: "text-red-600" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/40 overflow-hidden">
              <CardContent className="p-3">
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-50`} />
                <div className="relative flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg bg-background/80 ${s.iconColor}`}>
                    <s.icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-base font-bold leading-none">{s.value}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ===== MAIN TABS ===== */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="smart-queue" className="gap-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700">
              <Zap className="h-3.5 w-3.5" /> Smart Queue
              {callableApps.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-5 bg-emerald-500/10 text-emerald-700">{callableApps.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="fresh-leads" className="gap-1.5 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-700">
              <Inbox className="h-3.5 w-3.5" /> Fresh Leads
              {freshLeads.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-5 bg-blue-500/10 text-blue-700">{freshLeads.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="quick-dial" className="gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Quick Dial
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, car..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-64 bg-muted/30"
            />
          </div>
        </div>

        {/* ===== SMART QUEUE ===== */}
        <TabsContent value="smart-queue" className="mt-4">
          <div className="flex gap-2 mb-3 flex-wrap">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[160px] bg-muted/30">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {(['new_lead', 'contacted', 'qualified', 'eligibility_check', 'lender_match', 'offer_shared', 'documents_requested', 'documents_received', 'approval', 'disbursement'] as LoanStage[]).map(s => (
                  <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] bg-muted/30">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {PRIORITY_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="self-center text-xs text-muted-foreground">
              {callableApps.length} leads in queue
            </Badge>
          </div>

          {callableApps.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <PhoneCall className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-lg">Queue is Empty</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                  No follow-ups or retries pending. Add new leads or use Quick Dial.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-520px)]">
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {callableApps.map((app: any, idx: number) => (
                    <LoanLeadCard key={app.id} app={app} showStage onDial={handleDial} delay={idx * 0.02} />
                  ))}
                </div>
              </AnimatePresence>
            </ScrollArea>
          )}
        </TabsContent>

        {/* ===== FRESH LEADS ===== */}
        <TabsContent value="fresh-leads" className="mt-4">
          {freshLeads.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <Inbox className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="font-semibold text-lg">No Fresh Leads</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  All new leads have been contacted. Add more using the button above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-460px)]">
              <div className="space-y-2">
                {freshLeads.map((app: any, idx: number) => (
                  <LoanLeadCard key={app.id} app={app} showStage={false} onDial={handleDial} delay={idx * 0.02} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* ===== QUICK DIAL ===== */}
        <TabsContent value="quick-dial" className="mt-4">
          <QuickDialPanel />
        </TabsContent>
      </Tabs>

      {/* Disposition Modal */}
      {selectedApp && (
        <LoanCallDispositionModal
          open={showDisposition}
          onOpenChange={setShowDisposition}
          application={selectedApp}
        />
      )}
    </div>
  );
};

// ===== Lead Card Component — Car Loan Specific =====
function LoanLeadCard({ app, showStage, onDial, delay = 0 }: {
  app: any; showStage: boolean; onDial: (app: any) => void; delay?: number;
}) {
  const isOverdue = app.follow_up_at && isPast(new Date(app.follow_up_at));
  const stageIndex = LOAN_STAGES.indexOf(app.stage as LoanStage);
  const progress = stageIndex >= 0 ? Math.round(((stageIndex + 1) / 10) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay }}
    >
      <Card className={`border-border/40 hover:shadow-lg transition-all group relative overflow-hidden ${
        isOverdue ? 'ring-1 ring-red-500/30' : ''
      }`}>
        {/* Stage progress bar at top */}
        <div className="h-1 bg-muted/30">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Lead Info */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Name Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-base truncate">{app.customer_name}</span>
                {showStage && (
                  <Badge className={`${STAGE_COLORS[app.stage as LoanStage] || 'bg-muted text-muted-foreground'} text-[10px] px-2 py-0.5 border-0 font-medium`}>
                    {STAGE_LABELS[app.stage as LoanStage] || app.stage}
                  </Badge>
                )}
                {isOverdue && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse">
                    OVERDUE
                  </Badge>
                )}
              </div>

              {/* Details Row */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="h-3 w-3" />
                  {app.phone}
                </span>
                {app.car_model && (
                  <span className="flex items-center gap-1">
                    <Car className="h-3 w-3 text-blue-500" />
                    {app.car_model}
                  </span>
                )}
                {app.loan_amount && (
                  <span className="flex items-center gap-1 font-semibold text-emerald-600">
                    <IndianRupee className="h-3 w-3" />
                    ₹{(app.loan_amount / 100000).toFixed(1)}L
                  </span>
                )}
              </div>

              {/* Follow-up / Time info */}
              <div className="flex items-center gap-3 text-[11px]">
                {app.follow_up_at ? (
                  <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-amber-600'}`}>
                    <CalendarClock className="h-3 w-3" />
                    {isOverdue ? 'Overdue: ' : 'Follow-up: '}
                    {format(new Date(app.follow_up_at), 'MMM d, h:mm a')}
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                  </span>
                )}
                {app.source && (
                  <span className="text-muted-foreground/60">via {app.source}</span>
                )}
              </div>

              {app.remarks && (
                <p className="text-[11px] text-muted-foreground/70 line-clamp-1 italic">
                  "{app.remarks}"
                </p>
              )}
            </div>

            {/* Right: Call Button */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                className="shadow-md bg-emerald-600 hover:bg-emerald-700 text-white px-4"
                onClick={() => onDial(app)}
              >
                <Phone className="h-4 w-4 mr-1.5" /> Call
              </Button>
              <span className="text-[9px] text-muted-foreground">
                Stage {stageIndex + 1}/10
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ===== Quick Dial Panel =====
function QuickDialPanel() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  return (
    <Card className="border-border/40">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10">
            <Phone className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold">Quick Dial</h3>
            <p className="text-xs text-muted-foreground">Make a call without creating a lead record</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Customer name" /></div>
          <div><Label>Phone *</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number" /></div>
        </div>
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!phone || phone.replace(/\D/g, '').length < 10}
          onClick={() => window.open(`tel:+91${phone.replace(/\D/g, '').slice(-10)}`, '_self')}
        >
          <Phone className="h-4 w-4 mr-2" /> Dial Now
        </Button>
      </CardContent>
    </Card>
  );
}
