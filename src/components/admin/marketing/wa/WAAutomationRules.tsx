import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Plus, Trash2, Play, Pause, Activity, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_event: string;
  trigger_conditions: any[];
  template_id: string | null;
  message_content: string | null;
  delay_minutes: number;
  max_sends_per_lead: number;
  cooldown_hours: number;
  total_triggered: number;
  total_sent: number;
  total_suppressed: number;
  created_at: string;
}

const TRIGGER_EVENTS = [
  { value: "lead_created", label: "New Lead Created" },
  { value: "lead_updated", label: "Lead Status Changed" },
  { value: "form_submitted", label: "Form Submitted" },
  { value: "booking_created", label: "Booking Created" },
  { value: "price_drop", label: "Price Drop Alert" },
  { value: "test_drive_requested", label: "Test Drive Requested" },
  { value: "loan_approved", label: "Loan Approved" },
  { value: "abandoned_flow", label: "Abandoned Flow" },
];

export function WAAutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", trigger_event: "lead_created",
    message_content: "", delay_minutes: "0", max_sends_per_lead: "1", cooldown_hours: "24",
    template_id: "",
  });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [rulesRes, tmplRes] = await Promise.all([
      supabase.from("wa_automation_rules").select("*").order("created_at", { ascending: false }),
      supabase.from("whatsapp_templates").select("id, name, content").eq("is_active", true),
    ]);
    if (rulesRes.data) setRules(rulesRes.data as any);
    if (tmplRes.data) setTemplates(tmplRes.data);
  };

  const handleCreate = async () => {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    const template = templates.find(t => t.id === form.template_id);
    const { error } = await supabase.from("wa_automation_rules").insert({
      name: form.name,
      description: form.description || null,
      trigger_event: form.trigger_event,
      template_id: form.template_id || null,
      message_content: template?.content || form.message_content,
      delay_minutes: parseInt(form.delay_minutes) || 0,
      max_sends_per_lead: parseInt(form.max_sends_per_lead) || 1,
      cooldown_hours: parseInt(form.cooldown_hours) || 24,
      is_active: false,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Automation rule created" }); setIsCreating(false); fetchData(); }
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    await supabase.from("wa_automation_rules").update({ is_active: !isActive }).eq("id", id);
    toast({ title: isActive ? "Rule paused" : "Rule activated" });
    fetchData();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this automation rule?")) return;
    await supabase.from("wa_automation_rules").delete().eq("id", id);
    toast({ title: "Rule deleted" });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Automation Rules</h2>
          <p className="text-sm text-muted-foreground">Event-triggered WhatsApp messages</p>
        </div>
        <Button size="sm" onClick={() => setIsCreating(true)}><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
      </div>

      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
            No automation rules yet. Create your first event-triggered message.
          </CardContent></Card>
        ) : rules.map(rule => (
          <Card key={rule.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule.id, rule.is_active)} />
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {TRIGGER_EVENTS.find(t => t.value === rule.trigger_event)?.label || rule.trigger_event}
                      </Badge>
                      {rule.delay_minutes > 0 && (
                        <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />{rule.delay_minutes}min delay</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Triggered: <span className="font-medium text-foreground">{rule.total_triggered}</span></p>
                    <p className="text-muted-foreground">Sent: <span className="font-medium text-foreground">{rule.total_sent}</span></p>
                  </div>
                  <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Automation Rule</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input placeholder="e.g., Welcome New Leads" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Trigger Event *</Label>
              <Select value={form.trigger_event} onValueChange={v => setForm({ ...form, trigger_event: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={form.template_id} onValueChange={v => setForm({ ...form, template_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select template or write custom" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!form.template_id && (
              <div className="space-y-2">
                <Label>Custom Message</Label>
                <Textarea placeholder="Hello {name}! Welcome to GrabYourCar..." value={form.message_content} onChange={e => setForm({ ...form, message_content: e.target.value })} rows={3} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Delay (min)</Label>
                <Input type="number" value={form.delay_minutes} onChange={e => setForm({ ...form, delay_minutes: e.target.value })} />
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
            <Button onClick={handleCreate}><Zap className="h-4 w-4 mr-2" /> Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
