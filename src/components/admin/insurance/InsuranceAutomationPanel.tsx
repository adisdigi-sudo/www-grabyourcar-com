import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Plus, Trash2, Clock, Send, AlertTriangle, CheckCircle, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const INSURANCE_EVENTS = [
  { value: "insurance_inquiry", label: "New Insurance Inquiry" },
  { value: "insurance_renewal_60d", label: "Renewal — 60 Days" },
  { value: "insurance_renewal_30d", label: "Renewal — 30 Days" },
  { value: "insurance_renewal_15d", label: "Renewal — 15 Days" },
  { value: "insurance_renewal_7d", label: "Renewal — 7 Days (Critical)" },
  { value: "insurance_policy_issued", label: "Policy Issued" },
  { value: "insurance_payment_received", label: "Payment Received" },
  { value: "insurance_claim_filed", label: "Claim Filed" },
  { value: "insurance_addon_recommend", label: "Add-on Recommendation" },
  { value: "insurance_lapsed", label: "Policy Lapsed" },
  { value: "insurance_ncb_alert", label: "NCB Protection Alert" },
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
  const [stats, setStats] = useState({ active: 0, total: 0, sentToday: 0 });
  const [form, setForm] = useState({
    event_name: "insurance_inquiry",
    template_id: "",
    delay_seconds: "0",
    priority: 1,
    cooldown_hours: "24",
    max_sends_per_lead: "1",
  });
  const { toast } = useToast();

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
    setStats({
      active: insuranceTriggers.filter(t => t.is_active).length,
      total: insuranceTriggers.length,
      sentToday: logsRes.count || 0,
    });
  };

  const handleCreate = async () => {
    if (!form.template_id) { toast({ title: "Select a template", variant: "destructive" }); return; }
    const { error } = await supabase.from("wa_event_triggers").insert({
      event_name: form.event_name,
      template_id: form.template_id,
      delay_seconds: parseInt(form.delay_seconds) || 0,
      priority: form.priority,
      cooldown_hours: parseInt(form.cooldown_hours) || 24,
      max_sends_per_lead: parseInt(form.max_sends_per_lead) || 1,
      is_active: false,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Trigger created" }); setIsCreating(false); fetchData(); }
  };

  const toggleTrigger = async (id: string, isActive: boolean) => {
    await supabase.from("wa_event_triggers").update({ is_active: !isActive }).eq("id", id);
    toast({ title: isActive ? "Trigger paused" : "Trigger activated" });
    fetchData();
  };

  const deleteTrigger = async (id: string) => {
    if (!confirm("Delete this trigger?")) return;
    await supabase.from("wa_event_triggers").delete().eq("id", id);
    toast({ title: "Trigger deleted" });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Insurance Automation Engine
          </h2>
          <p className="text-sm text-muted-foreground">Event-triggered WhatsApp messages for insurance workflows</p>
        </div>
        <Button size="sm" onClick={() => setIsCreating(true)}><Plus className="h-4 w-4 mr-1" /> New Trigger</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.active}</p>
          <p className="text-xs text-muted-foreground">Active Triggers</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Triggers</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.sentToday}</p>
          <p className="text-xs text-muted-foreground">Sent Today</p>
        </CardContent></Card>
      </div>

      {/* Triggers List */}
      <div className="grid gap-3">
        {triggers.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
            No insurance automation triggers yet.
          </CardContent></Card>
        ) : triggers.map(trigger => (
          <Card key={trigger.id} className={!trigger.is_active ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch checked={trigger.is_active} onCheckedChange={() => toggleTrigger(trigger.id, trigger.is_active)} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {INSURANCE_EVENTS.find(e => e.value === trigger.event_name)?.label || trigger.event_name}
                      </p>
                      <Badge variant={String(trigger.priority) === "critical" ? "destructive" : String(trigger.priority) === "high" ? "default" : "secondary"} className="text-xs">
                        {String(trigger.priority)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Template: {trigger.wa_template_catalog?.template_name || "—"}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {trigger.delay_seconds > 0 && (
                        <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />{Math.round(trigger.delay_seconds / 60)}min delay</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">Max {trigger.max_sends_per_lead}/lead</Badge>
                      <Badge variant="outline" className="text-xs">{trigger.cooldown_hours}h cooldown</Badge>
                    </div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => deleteTrigger(trigger.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
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
    </div>
  );
}
