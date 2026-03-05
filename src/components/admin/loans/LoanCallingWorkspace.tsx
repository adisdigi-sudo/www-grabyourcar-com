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
  PhoneCall, MessageCircle, Search, IndianRupee, Car, Clock,
  CheckCircle2, User, Filter, Flame, ArrowUpDown, Plus, Upload,
  Download, Zap, Inbox, Phone, TrendingUp, Timer, XCircle, CalendarClock
} from "lucide-react";
import { format, isToday, isPast, formatDistanceToNow } from "date-fns";
import { STAGE_LABELS, STAGE_COLORS, PRIORITY_OPTIONS, LEAD_SOURCES, type LoanStage } from "./LoanStageConfig";
import { LoanCallDispositionModal } from "./LoanCallDispositionModal";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
  const [showImport, setShowImport] = useState(false);

  // New lead form
  const [newLead, setNewLead] = useState({
    customer_name: '', phone: '', loan_amount: '', car_model: '',
    priority: 'medium', source: 'Manual', remarks: '',
  });

  // Quick import state
  const [importText, setImportText] = useState('');

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
      toast.success("Lead added to calling queue");
      setShowAddLead(false);
      setNewLead({ customer_name: '', phone: '', loan_amount: '', car_model: '', priority: 'medium', source: 'Manual', remarks: '' });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Quick paste import
  const quickImportMutation = useMutation({
    mutationFn: async (text: string) => {
      const lines = text.trim().split('\n').filter(l => l.trim());
      const leads: any[] = [];

      for (const line of lines) {
        // Support formats: "Name, Phone" or "Name, Phone, Amount" or "Name, Phone, Amount, Car"
        const parts = line.split(/[,\t]/).map(p => p.trim());
        if (parts.length < 2) continue;

        const name = parts[0];
        const phone = parts[1]?.replace(/\D/g, '');
        if (!name || !phone || phone.length < 10) continue;

        leads.push({
          customer_name: name,
          phone: phone.slice(-10),
          loan_amount: parts[2] ? Number(parts[2]) || null : null,
          car_model: parts[3] || null,
          priority: parts[4] || 'medium',
          source: 'Quick Import',
          lead_source_tag: 'quick_import',
          stage: 'new_lead',
        });
      }

      if (leads.length === 0) throw new Error('No valid leads found. Use format: Name, Phone, Amount, Car');

      const { error } = await supabase.from('loan_applications').insert(leads);
      if (error) throw error;
      return leads.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success(`${count} leads imported to calling queue`);
      setShowImport(false);
      setImportText('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Filter callable applications
  const callableApps = useMemo(() => {
    let filtered = applications.filter(a => !['converted', 'lost'].includes(a.stage));

    if (stageFilter !== "all") filtered = filtered.filter(a => a.stage === stageFilter);
    if (priorityFilter !== "all") filtered = filtered.filter(a => a.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(a =>
        a.customer_name?.toLowerCase().includes(q) ||
        a.phone?.includes(q) ||
        a.car_model?.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a: any, b: any) => {
      // Overdue follow-ups first
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
  }, [applications, stageFilter, priorityFilter, search]);

  // Fresh leads (new_lead stage, never contacted)
  const freshLeads = useMemo(() => {
    return applications
      .filter(a => a.stage === 'new_lead')
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [applications]);

  // Stats
  const connectedToday = todayCalls.filter((c: any) => c.disposition === 'connected').length;
  const totalDuration = todayCalls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0);
  const avgDuration = todayCalls.length > 0 ? Math.round(totalDuration / todayCalls.length / 60 * 10) / 10 : 0;
  const overdueCount = applications.filter(a => a.follow_up_at && isPast(new Date(a.follow_up_at)) && !['converted', 'lost'].includes(a.stage)).length;
  const pendingFollowUps = applications.filter(a => a.follow_up_at && !isPast(new Date(a.follow_up_at)) && !['converted', 'lost'].includes(a.stage)).length;

  const handleDial = (app: any) => {
    // Open phone dialer
    const phone = app.phone?.replace(/\D/g, '');
    if (phone) window.open(`tel:+91${phone.slice(-10)}`, '_self');
    // Open disposition after delay
    setSelectedApp(app);
    setTimeout(() => setShowDisposition(true), 1500);
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const msg = `Hi ${name}, this is from GrabYourCar regarding your car loan inquiry. How can I help you today?`;
    window.open(`https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const downloadQueueCSV = () => {
    const rows = callableApps.map((lead: any) => ({
      customer_name: lead.customer_name || '',
      phone: lead.phone || '',
      stage: lead.stage || '',
      priority: lead.priority || '',
      loan_amount: lead.loan_amount || '',
      car_model: lead.car_model || '',
      source: lead.source || '',
      follow_up_at: lead.follow_up_at || '',
      remarks: lead.remarks || '',
      created_at: lead.created_at || '',
    }));

    if (rows.length === 0) {
      toast.error('No queue data to export');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((key) => {
            const value = String(row[key as keyof typeof row] ?? '');
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `loan_smart_queue_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderLeadCard = (app: any, showStage = true) => {
    const isOverdue = app.follow_up_at && isPast(new Date(app.follow_up_at));
    return (
      <Card
        key={app.id}
        className={`border-border/50 hover:shadow-md transition-all ${
          isOverdue ? 'border-l-4 border-l-red-500' :
          app.priority === 'hot' ? 'border-l-4 border-l-orange-500' :
          app.priority === 'high' ? 'border-l-4 border-l-amber-500' : ''
        }`}
      >
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold truncate">{app.customer_name}</span>
              {app.priority === 'hot' && <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0 border-0">🔥 Hot</Badge>}
              {app.priority === 'high' && <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 border-0">⚡ High</Badge>}
              {showStage && (
                <Badge className={`${STAGE_COLORS[app.stage as LoanStage] || 'bg-muted text-muted-foreground'} text-[10px] px-1.5 border-0`}>
                  {STAGE_LABELS[app.stage as LoanStage] || app.stage}
                </Badge>
              )}
              {isOverdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">OVERDUE</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{app.phone}</span>
              {app.car_model && (
                <span className="flex items-center gap-0.5"><Car className="h-3 w-3" />{app.car_model}</span>
              )}
              {app.loan_amount && (
                <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />₹{(app.loan_amount / 100000).toFixed(1)}L</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
              {app.follow_up_at && (
                <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                  📅 {isOverdue ? 'Overdue: ' : 'F/U: '}{format(new Date(app.follow_up_at), 'MMM d, h:mm a')}
                  {!isOverdue && <span className="ml-1">({formatDistanceToNow(new Date(app.follow_up_at), { addSuffix: true })})</span>}
                </span>
              )}
              {app.source && <span>via {app.source}</span>}
              {!app.follow_up_at && (
                <span>{formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}</span>
              )}
            </div>
            {app.remarks && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">💬 {app.remarks}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              onClick={() => handleWhatsApp(app.phone, app.customer_name)}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button size="sm" className="shadow-sm" onClick={() => handleDial(app)}>
              <Phone className="h-4 w-4 mr-1" /> Call
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Hero Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border p-5">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-[0.06]" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl">Smart Calling</h2>
                <Badge className="bg-primary/10 text-primary border-0 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs gap-1">
                  <IndianRupee className="h-3 w-3" /> Car Loans
                </Badge>
                <span className="text-xs text-muted-foreground">Loan eligibility & document follow-ups</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadQueueCSV}>
              <Download className="h-4 w-4" /> Export Queue
            </Button>
            <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Quick Add Loan Lead</DialogTitle></DialogHeader>
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
                  <Button onClick={() => createMutation.mutate(newLead)} disabled={!newLead.customer_name || !newLead.phone || createMutation.isPending} className="w-full">
                    {createMutation.isPending ? "Adding..." : "Add to Queue"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showImport} onOpenChange={setShowImport}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Upload className="h-4 w-4" /> Quick Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Quick Paste Import</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                    <p className="font-medium">Paste leads in any of these formats:</p>
                    <code className="block text-muted-foreground">Name, Phone</code>
                    <code className="block text-muted-foreground">Name, Phone, LoanAmount</code>
                    <code className="block text-muted-foreground">Name, Phone, LoanAmount, CarModel</code>
                    <p className="text-muted-foreground mt-1">One lead per line. Copy from Excel/Sheets works too!</p>
                  </div>
                  <Textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder={`Rahul Sharma, 9876543210, 800000, Hyundai Creta\nPriya Singh, 9876543211, 1200000, Toyota Fortuner\nAmit Kumar, 9876543212`}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  {importText.trim() && (
                    <div className="text-xs text-muted-foreground">
                      {importText.trim().split('\n').filter(l => l.trim()).length} lines detected
                    </div>
                  )}
                  <Button
                    onClick={() => quickImportMutation.mutate(importText)}
                    disabled={!importText.trim() || quickImportMutation.isPending}
                    className="w-full"
                  >
                    {quickImportMutation.isPending ? "Importing..." : "Import Leads"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Calls Today", value: todayCalls.length, icon: PhoneCall, color: "text-primary" },
          { label: "Connected", value: connectedToday, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Connect Rate", value: `${todayCalls.length > 0 ? Math.round((connectedToday / todayCalls.length) * 100) : 0}%`, icon: TrendingUp, color: "text-blue-600" },
          { label: "Avg Duration", value: `${avgDuration}m`, icon: Timer, color: "text-purple-600" },
          { label: "Pending F/U", value: pendingFollowUps, icon: CalendarClock, color: "text-amber-600" },
          { label: "Overdue", value: overdueCount, icon: XCircle, color: "text-red-600" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}><s.icon className="h-4 w-4" /></div>
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="smart-queue" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Smart Queue
              {callableApps.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-5">{callableApps.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="fresh-leads" className="gap-1.5">
              <Inbox className="h-3.5 w-3.5" /> Fresh Leads
              {freshLeads.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-5">{freshLeads.length}</Badge>}
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
              className="pl-9 w-64"
            />
          </div>
        </div>

        {/* Smart Queue */}
        <TabsContent value="smart-queue" className="mt-4">
          {/* Filters */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[160px]">
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
              <SelectTrigger className="w-[140px]">
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
          </div>

          {callableApps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PhoneCall className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-lg">Queue is Empty</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  No follow-ups or retries pending. Use Quick Dial to make calls.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-500px)]">
              <div className="space-y-2">
                {callableApps.map(app => renderLeadCard(app, true))}
              </div>
            </ScrollArea>
          )}

          <p className="text-xs text-muted-foreground text-center mt-2">
            Showing {callableApps.length} of {applications.filter(a => !['converted', 'lost'].includes(a.stage)).length} active leads
          </p>
        </TabsContent>

        {/* Fresh Leads */}
        <TabsContent value="fresh-leads" className="mt-4">
          {freshLeads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-lg">No Fresh Leads</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  All new leads have been contacted. Add more using the buttons above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-440px)]">
              <div className="space-y-2">
                {freshLeads.map(app => renderLeadCard(app, false))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Quick Dial */}
        <TabsContent value="quick-dial" className="mt-4">
          <QuickDialPanel onDial={(phone, name) => {
            window.open(`tel:+91${phone.replace(/\D/g, '').slice(-10)}`, '_self');
          }} />
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

// Quick Dial sub-component
function QuickDialPanel({ onDial }: { onDial: (phone: string, name: string) => void }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Phone className="h-4 w-4" /> Quick Dial
        </h3>
        <p className="text-sm text-muted-foreground">Enter a number to make a quick call without a lead record.</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Customer name" /></div>
          <div><Label>Phone *</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number" /></div>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" disabled={!phone || phone.replace(/\D/g, '').length < 10} onClick={() => onDial(phone, name)}>
            <Phone className="h-4 w-4 mr-2" /> Dial
          </Button>
          <Button variant="outline" className="flex-1 text-emerald-600" disabled={!phone || phone.replace(/\D/g, '').length < 10}
            onClick={() => window.open(`https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}`, '_blank')}>
            <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
