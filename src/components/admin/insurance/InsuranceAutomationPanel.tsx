import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Zap, Plus, Trash2, Clock, Send, AlertTriangle, CheckCircle, Settings,
  Bell, MessageSquare, ShieldCheck, CreditCard, RefreshCw, Users,
  Calendar, Play, Pause, Eye, RotateCw, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { triggerWhatsApp } from "@/lib/whatsappTrigger";
import { toast } from "sonner";

// ─── EVENT CATEGORIES ───
const INSURANCE_EVENTS = [
  { value: "insurance_inquiry", label: "New Insurance Inquiry", icon: Users, category: "lead" },
  { value: "insurance_policy_issued", label: "New Policy Confirmation", icon: ShieldCheck, category: "policy" },
  { value: "insurance_payment_received", label: "Payment Receipt", icon: CreditCard, category: "payment" },
  { value: "insurance_renewal_60d", label: "Renewal — 60 Days", icon: Calendar, category: "renewal" },
  { value: "insurance_renewal_30d", label: "Renewal — 30 Days", icon: Calendar, category: "renewal" },
  { value: "insurance_renewal_15d", label: "Renewal — 15 Days", icon: RefreshCw, category: "renewal" },
  { value: "insurance_renewal_7d", label: "Renewal — 7 Days (Critical)", icon: AlertTriangle, category: "renewal" },
  { value: "insurance_renewal_1d", label: "Renewal — 1 Day (Urgent)", icon: AlertTriangle, category: "renewal" },
  { value: "insurance_lapsed", label: "Policy Lapsed / Expired", icon: AlertTriangle, category: "renewal" },
  { value: "insurance_claim_filed", label: "Claim Filed", icon: ShieldCheck, category: "service" },
  { value: "insurance_addon_recommend", label: "Add-on Recommendation", icon: Plus, category: "upsell" },
  { value: "insurance_ncb_alert", label: "NCB Protection Alert", icon: Bell, category: "upsell" },
  { value: "insurance_birthday", label: "Birthday Greeting", icon: Calendar, category: "engagement" },
  { value: "insurance_anniversary", label: "Policy Anniversary", icon: Calendar, category: "engagement" },
];

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "renewal", label: "🔄 Renewals" },
  { id: "policy", label: "📋 Policy" },
  { id: "payment", label: "💳 Payment" },
  { id: "lead", label: "👤 Leads" },
  { id: "upsell", label: "💡 Upsell" },
  { id: "engagement", label: "🎂 Engagement" },
  { id: "service", label: "🛡️ Service" },
];

interface EventTrigger {
  id: string;
  event_name: string;
  template_id: string | null;
  delay_seconds: number;
  priority: string;
  is_active: boolean;
  cooldown_hours: number;
  max_sends_per_lead: number;
  conditions: any;
  variable_mapping: any;
  created_at: string;
  wa_template_catalog?: { template_name: string; sample_body: string } | null;
}

export function InsuranceAutomationPanel() {
  const [triggers, setTriggers] = useState<EventTrigger[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [stats, setStats] = useState({ active: 0, total: 0, sentToday: 0, pendingRenewals: 0 });
  const [filterCat, setFilterCat] = useState("all");
  const [showQuickSend, setShowQuickSend] = useState(false);
  const [quickSendData, setQuickSendData] = useState<any>(null);
  const [scanningRenewals, setScanningRenewals] = useState(false);
  const [renewalResults, setRenewalResults] = useState<any[]>([]);
  const [form, setForm] = useState({
    event_name: "insurance_inquiry",
    template_id: "",
    delay_seconds: "0",
    priority: 1,
    cooldown_hours: "24",
    max_sends_per_lead: "1",
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [trigRes, tmplRes, logsRes] = await Promise.all([
      supabase.from("wa_event_triggers").select("*, wa_template_catalog(template_name, sample_body)").order("created_at", { ascending: false }),
      supabase.from("wa_template_catalog").select("id, template_name, category, sample_body").eq("is_active", true),
      supabase.from("wa_message_logs").select("id", { count: "exact" }).gte("created_at", new Date(Date.now() - 86400000).toISOString()).like("trigger_event", "insurance_%"),
    ]);
    const data = (trigRes.data || []) as unknown as EventTrigger[];
    const insuranceTriggers = data.filter(t => t.event_name.startsWith("insurance_"));
    setTriggers(insuranceTriggers);
    setTemplates(tmplRes.data || []);

    // Count pending renewals (expiring in 30 days)
    const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("insurance_policies")
      .select("id", { count: "exact" })
      .gte("expiry_date", today)
      .lte("expiry_date", thirtyDays)
      .eq("status", "active");

    setStats({
      active: insuranceTriggers.filter(t => t.is_active).length,
      total: insuranceTriggers.length,
      sentToday: logsRes.count || 0,
      pendingRenewals: count || 0,
    });
  };

  const handleCreate = async () => {
    if (!form.template_id) { toast.error("Select a template"); return; }
    const { error } = await supabase.from("wa_event_triggers").insert({
      event_name: form.event_name,
      template_id: form.template_id,
      delay_seconds: parseInt(form.delay_seconds) || 0,
      priority: form.priority,
      cooldown_hours: parseInt(form.cooldown_hours) || 24,
      max_sends_per_lead: parseInt(form.max_sends_per_lead) || 1,
      is_active: false,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success("Trigger created"); setIsCreating(false); fetchData(); }
  };

  const toggleTrigger = async (id: string, isActive: boolean) => {
    await supabase.from("wa_event_triggers").update({ is_active: !isActive }).eq("id", id);
    toast.success(isActive ? "Trigger paused" : "Trigger activated");
    fetchData();
  };

  const deleteTrigger = async (id: string) => {
    if (!confirm("Delete this trigger?")) return;
    await supabase.from("wa_event_triggers").delete().eq("id", id);
    toast.success("Trigger deleted");
    fetchData();
  };

  // ─── SCAN & TRIGGER RENEWALS ───
  const scanAndTriggerRenewals = async () => {
    setScanningRenewals(true);
    setRenewalResults([]);

    try {
      const now = new Date();
      const windows = [
        { days: 1, event: "insurance_renewal_1d" },
        { days: 7, event: "insurance_renewal_7d" },
        { days: 15, event: "insurance_renewal_15d" },
        { days: 30, event: "insurance_renewal_30d" },
        { days: 60, event: "insurance_renewal_60d" },
      ];

      const results: any[] = [];

      for (const w of windows) {
        const target = new Date(now.getTime() + w.days * 86400000).toISOString().split("T")[0];
        const rangeStart = new Date(now.getTime() + (w.days - 1) * 86400000).toISOString().split("T")[0];

        const { data: policies } = await supabase
          .from("insurance_policies")
          .select("id, policy_number, expiry_date, insurer, premium_amount, insurance_clients(customer_name, phone, email)")
          .gte("expiry_date", rangeStart)
          .lte("expiry_date", target)
          .eq("status", "active")
          .limit(100);

        if (policies && policies.length > 0) {
          for (const p of policies) {
            const client = (p as any).insurance_clients;
            if (client?.phone) {
              triggerWhatsApp({
                event: w.event,
                phone: client.phone,
                name: client.customer_name || "",
                data: {
                  policy_number: p.policy_number || "",
                  insurer: p.insurer || "",
                  expiry_date: p.expiry_date || "",
                  premium: String(p.premium_amount || ""),
                },
              });
              results.push({
                name: client.customer_name,
                phone: client.phone,
                event: w.event,
                policy: p.policy_number,
                expiry: p.expiry_date,
                days: w.days,
              });
            }
          }
        }
      }

      // Also check lapsed policies (expired in last 30 days)
      const thirtyAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
      const today = now.toISOString().split("T")[0];
      const { data: lapsed } = await supabase
        .from("insurance_policies")
        .select("id, policy_number, expiry_date, insurer, insurance_clients(customer_name, phone)")
        .gte("expiry_date", thirtyAgo)
        .lt("expiry_date", today)
        .eq("status", "active")
        .limit(50);

      if (lapsed) {
        for (const p of lapsed) {
          const client = (p as any).insurance_clients;
          if (client?.phone) {
            triggerWhatsApp({
              event: "insurance_lapsed",
              phone: client.phone,
              name: client.customer_name || "",
              data: { policy_number: p.policy_number || "", expiry_date: p.expiry_date || "" },
            });
            results.push({
              name: client.customer_name,
              phone: client.phone,
              event: "insurance_lapsed",
              policy: p.policy_number,
              expiry: p.expiry_date,
              days: 0,
            });
          }
        }
      }

      setRenewalResults(results);
      toast.success(`Triggered ${results.length} WhatsApp messages`);
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
    } finally {
      setScanningRenewals(false);
    }
  };

  // ─── QUICK SEND ───
  const handleQuickSend = (type: string) => {
    setQuickSendData({ type, phone: "", name: "", policyNumber: "", amount: "" });
    setShowQuickSend(true);
  };

  const executeQuickSend = () => {
    if (!quickSendData?.phone) { toast.error("Enter phone number"); return; }
    triggerWhatsApp({
      event: quickSendData.type,
      phone: quickSendData.phone,
      name: quickSendData.name,
      data: {
        policy_number: quickSendData.policyNumber,
        amount: quickSendData.amount,
      },
    });
    toast.success("WhatsApp message triggered");
    setShowQuickSend(false);
  };

  const filtered = filterCat === "all"
    ? triggers
    : triggers.filter(t => {
        const ev = INSURANCE_EVENTS.find(e => e.value === t.event_name);
        return ev?.category === filterCat;
      });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Insurance Automation Engine
          </h2>
          <p className="text-xs text-muted-foreground">
            Automated WhatsApp triggers for renewals, policy updates & payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={scanAndTriggerRenewals} disabled={scanningRenewals}>
            {scanningRenewals ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCw className="h-4 w-4 mr-1" />}
            Scan & Send Renewals
          </Button>
          <Button size="sm" onClick={() => setIsCreating(true)} className="bg-success text-success-foreground hover:bg-success/90">
            <Plus className="h-4 w-4 mr-1" /> New Trigger
          </Button>
        </div>
      </div>

      <Tabs defaultValue="triggers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="triggers" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" /> Event Triggers</TabsTrigger>
          <TabsTrigger value="quick" className="gap-1.5 text-xs"><Send className="h-3.5 w-3.5" /> Quick Send</TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" /> Scan Results</TabsTrigger>
        </TabsList>

        {/* ─── TRIGGERS TAB ─── */}
        <TabsContent value="triggers" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-primary">{stats.active}</p>
              <p className="text-[10px] text-muted-foreground">Active Triggers</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total Triggers</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-green-600">{stats.sentToday}</p>
              <p className="text-[10px] text-muted-foreground">Sent Today</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-amber-600">{stats.pendingRenewals}</p>
              <p className="text-[10px] text-muted-foreground">Renewals (30d)</p>
            </CardContent></Card>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <Button
                key={c.id}
                size="sm"
                variant={filterCat === c.id ? "default" : "outline"}
                onClick={() => setFilterCat(c.id)}
                className="text-xs h-7"
              >
                {c.label}
              </Button>
            ))}
          </div>

          {/* Triggers List */}
          <div className="grid gap-2">
            {filtered.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No triggers in this category
              </CardContent></Card>
            ) : filtered.map(trigger => {
              const evInfo = INSURANCE_EVENTS.find(e => e.value === trigger.event_name);
              const Icon = evInfo?.icon || Zap;
              return (
                <Card key={trigger.id} className={!trigger.is_active ? "opacity-50" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Switch checked={trigger.is_active} onCheckedChange={() => toggleTrigger(trigger.id, trigger.is_active)} />
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {evInfo?.label || trigger.event_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            Template: {trigger.wa_template_catalog?.template_name || "—"}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <Badge variant="secondary" className="text-[9px]">{evInfo?.category}</Badge>
                            {trigger.delay_seconds > 0 && (
                              <Badge variant="outline" className="text-[9px]"><Clock className="h-2.5 w-2.5 mr-0.5" />{Math.round(trigger.delay_seconds / 60)}m</Badge>
                            )}
                            <Badge variant="outline" className="text-[9px]">Max {trigger.max_sends_per_lead}/lead</Badge>
                          </div>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="text-destructive h-7 w-7 flex-shrink-0" onClick={() => deleteTrigger(trigger.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── QUICK SEND TAB ─── */}
        <TabsContent value="quick" className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Send instant WhatsApp messages to clients for specific insurance events — ideal for calling & sales support teams.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { type: "insurance_policy_issued", label: "📋 New Policy Confirmation", desc: "Send policy details to client after issuance", team: "Operations" },
              { type: "insurance_payment_received", label: "💳 Payment Receipt", desc: "Confirm payment received for premium", team: "Finance" },
              { type: "insurance_renewal_7d", label: "🔔 Renewal Reminder", desc: "Manual reminder for upcoming renewal", team: "Calling Team" },
              { type: "insurance_lapsed", label: "⚠️ Lapsed Policy Alert", desc: "Recover lapsed policy with a nudge", team: "Sales Team" },
              { type: "insurance_claim_filed", label: "🛡️ Claim Update", desc: "Update client on claim filing status", team: "Claims Team" },
              { type: "insurance_addon_recommend", label: "💡 Add-on Suggestion", desc: "Recommend add-ons for better coverage", team: "Sales Team" },
            ].map(q => (
              <button
                key={q.type}
                onClick={() => handleQuickSend(q.type)}
                className="flex items-start gap-3 p-4 rounded-xl border hover:border-primary/30 hover:bg-muted/50 transition-all text-left"
              >
                <div>
                  <p className="text-sm font-medium">{q.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{q.desc}</p>
                  <Badge variant="secondary" className="text-[9px] mt-1.5">{q.team}</Badge>
                </div>
              </button>
            ))}
          </div>
        </TabsContent>

        {/* ─── SCAN RESULTS TAB ─── */}
        <TabsContent value="log" className="space-y-4">
          {renewalResults.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">
              <RotateCw className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Click "Scan & Send Renewals" to auto-detect and trigger renewal messages
            </CardContent></Card>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{renewalResults.length} messages triggered in last scan</p>
              <div className="border rounded-lg overflow-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Client</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">Event</TableHead>
                      <TableHead className="text-xs">Policy</TableHead>
                      <TableHead className="text-xs">Expiry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renewalResults.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{r.name || "—"}</TableCell>
                        <TableCell className="text-xs">{r.phone}</TableCell>
                        <TableCell>
                          <Badge variant={r.days <= 7 ? "destructive" : "secondary"} className="text-[9px]">
                            {INSURANCE_EVENTS.find(e => e.value === r.event)?.label || r.event}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.policy || "—"}</TableCell>
                        <TableCell className="text-xs">{r.expiry || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── CREATE TRIGGER DIALOG ─── */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Insurance Trigger</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Insurance Event *</Label>
              <Select value={form.event_name} onValueChange={v => setForm({ ...form, event_name: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSURANCE_EVENTS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Template *</Label>
              <Select value={form.template_id} onValueChange={v => setForm({ ...form, template_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority (1-10)</Label>
              <Input type="number" min="1" max="10" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Delay (sec)</Label>
                <Input type="number" value={form.delay_seconds} onChange={e => setForm({ ...form, delay_seconds: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max/Lead</Label>
                <Input type="number" value={form.max_sends_per_lead} onChange={e => setForm({ ...form, max_sends_per_lead: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cooldown (hrs)</Label>
                <Input type="number" value={form.cooldown_hours} onChange={e => setForm({ ...form, cooldown_hours: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate}><Zap className="h-4 w-4 mr-2" /> Create Trigger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── QUICK SEND DIALOG ─── */}
      <Dialog open={showQuickSend} onOpenChange={setShowQuickSend}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" /> Quick WhatsApp Send
            </DialogTitle>
          </DialogHeader>
          {quickSendData && (
            <div className="space-y-3">
              <Badge variant="secondary" className="text-xs">
                {INSURANCE_EVENTS.find(e => e.value === quickSendData.type)?.label}
              </Badge>
              <div className="space-y-2">
                <Label className="text-xs">Phone Number *</Label>
                <Input
                  placeholder="10-digit mobile number"
                  value={quickSendData.phone}
                  onChange={e => setQuickSendData({ ...quickSendData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Client Name</Label>
                <Input
                  placeholder="Customer name"
                  value={quickSendData.name}
                  onChange={e => setQuickSendData({ ...quickSendData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Policy Number</Label>
                <Input
                  placeholder="POL-XXXX"
                  value={quickSendData.policyNumber}
                  onChange={e => setQuickSendData({ ...quickSendData, policyNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Amount (₹)</Label>
                <Input
                  placeholder="Premium / payment amount"
                  value={quickSendData.amount}
                  onChange={e => setQuickSendData({ ...quickSendData, amount: e.target.value })}
                />
              </div>
              <Button onClick={executeQuickSend} className="w-full gap-1.5">
                <MessageSquare className="h-4 w-4" /> Send via WhatsApp
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
