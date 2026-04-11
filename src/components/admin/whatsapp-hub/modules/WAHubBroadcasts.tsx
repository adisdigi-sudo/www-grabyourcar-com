import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Megaphone, Rocket, Plus, Trash2, Play, Pause, Eye,
  CheckCheck, Check, Clock, AlertCircle, Zap, BarChart3,
  Users, MessageSquare, Send, ArrowRight, Timer, Target,
  TrendingUp, Calendar, Layers, GripVertical, RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// ─── Stats Overview ───
function BroadcastStats() {
  const { data } = useQuery({
    queryKey: ["broadcast-pro-stats"],
    queryFn: async () => {
      const [{ data: campaigns }, { data: drips }, { data: logs }] = await Promise.all([
        supabase.from("wa_campaigns").select("status, total_sent, total_delivered, total_read, total_failed").eq("channel", "whatsapp"),
        supabase.from("wa_drip_sequences").select("id, is_active"),
        supabase.from("wa_message_logs").select("status").or("channel.is.null,channel.eq.whatsapp").limit(1000),
      ]);
      const c = campaigns || [];
      const totalSent = c.reduce((s, x: any) => s + (x.total_sent || 0), 0);
      const totalDel = c.reduce((s, x: any) => s + (x.total_delivered || 0), 0);
      const totalRead = c.reduce((s, x: any) => s + (x.total_read || 0), 0);
      const totalFailed = c.reduce((s, x: any) => s + (x.total_failed || 0), 0);
      return {
        campaigns: c.length,
        activeCampaigns: c.filter((x: any) => ["sending", "queued"].includes(x.status)).length,
        activeDrips: (drips || []).filter((d: any) => d.is_active).length,
        totalSent, totalDel, totalRead, totalFailed,
        deliveryRate: totalSent > 0 ? Math.round((totalDel / totalSent) * 100) : 0,
        readRate: totalDel > 0 ? Math.round((totalRead / totalDel) * 100) : 0,
      };
    },
    refetchInterval: 15000,
  });

  const items = [
    { label: "Campaigns", value: data?.campaigns || 0, icon: Megaphone, color: "text-primary" },
    { label: "Active", value: data?.activeCampaigns || 0, icon: Zap, color: "text-amber-500" },
    { label: "Drips Active", value: data?.activeDrips || 0, icon: Timer, color: "text-violet-500" },
    { label: "Sent", value: data?.totalSent || 0, icon: Send, color: "text-muted-foreground" },
    { label: "Delivered", value: `${data?.deliveryRate || 0}%`, icon: CheckCheck, color: "text-green-500" },
    { label: "Read Rate", value: `${data?.readRate || 0}%`, icon: Eye, color: "text-blue-500" },
  ];

  return (
    <div className="grid grid-cols-6 gap-2">
      {items.map((i) => (
        <Card key={i.label} className="p-3">
          <div className="flex items-center gap-2">
            <i.icon className={`h-4 w-4 ${i.color}`} />
            <div>
              <p className="text-[11px] text-muted-foreground">{i.label}</p>
              <p className="text-lg font-bold">{typeof i.value === "number" ? i.value.toLocaleString() : i.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── One-Shot Broadcast Tab ───
function OneShotBroadcast() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", message: "", template_id: "", segment: "all", batch_size: 50,
  });

  const { data: templates } = useQuery({
    queryKey: ["broadcast-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_templates").select("id, name, body, status").eq("status", "approved").order("name");
      return data || [];
    },
  });

  const { data: segments } = useQuery({
    queryKey: ["broadcast-segments"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_contact_segments").select("id, name, contact_count").order("name");
      return data || [];
    },
  });

  const shootMutation = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.message) throw new Error("Name and message required");
      const { data: campaign, error } = await supabase.from("wa_campaigns").insert({
        name: form.name,
        message_content: form.message,
        template_id: form.template_id || null,
        batch_size: form.batch_size,
        status: "draft",
        campaign_type: "broadcast",
        channel: "whatsapp",
        segment_rules: form.segment !== "all" ? [{ field: "segment_id", operator: "eq", value: form.segment }] : [],
      } as any).select().single();
      if (error) throw error;
      const { error: launchErr } = await supabase.functions.invoke("wa-campaign-launcher", {
        body: { campaignId: campaign.id },
      });
      if (launchErr) throw launchErr;
      return campaign;
    },
    onSuccess: () => {
      toast.success("🚀 Broadcast launched!");
      qc.invalidateQueries({ queryKey: ["broadcast-pro-stats"] });
      qc.invalidateQueries({ queryKey: ["broadcast-history"] });
      setForm({ name: "", message: "", template_id: "", segment: "all", batch_size: 50 });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const handleTemplateSelect = (id: string) => {
    const t = templates?.find((t: any) => t.id === id);
    setForm((p) => ({ ...p, template_id: id, message: t?.body || p.message }));
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Megaphone className="h-4 w-4 text-green-600" /> Quick Broadcast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Campaign name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-9 text-sm" />

            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pick a template..." /></SelectTrigger>
              <SelectContent>
                {templates?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Textarea placeholder="Message content... Use {name}, {phone} for personalization" value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} rows={5} className="text-sm" />

            <div className="flex flex-wrap gap-1">
              {["name", "phone", "city", "car_model"].map((v) => (
                <Button key={v} variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setForm((p) => ({ ...p, message: p.message + `{${v}}` }))}>{`{${v}}`}</Button>
              ))}
            </div>

            <Select value={form.segment} onValueChange={(v) => setForm((p) => ({ ...p, segment: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Audience segment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                {segments?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.contact_count || 0})</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Batch:</span>
              <Select value={String(form.batch_size)} onValueChange={(v) => setForm((p) => ({ ...p, batch_size: Number(v) }))}>
                <SelectTrigger className="h-8 text-sm w-20"><SelectValue /></SelectTrigger>
                <SelectContent>{[25, 50, 100, 200].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => shootMutation.mutate()} disabled={shootMutation.isPending || !form.name || !form.message}>
              <Rocket className="h-4 w-4" /> {shootMutation.isPending ? "Launching..." : "🚀 Shoot Now!"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Live Preview */}
      <div>
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-blue-500" /> Phone Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto w-[280px] bg-gray-900 rounded-[2rem] p-3 shadow-xl">
              <div className="bg-white dark:bg-gray-800 rounded-[1.5rem] overflow-hidden">
                <div className="bg-green-600 text-white px-4 py-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold">G</div>
                  <div>
                    <p className="text-sm font-semibold">GrabYourCar</p>
                    <p className="text-[10px] opacity-75">online</p>
                  </div>
                </div>
                <div className="p-3 bg-[#e5ddd5] dark:bg-gray-700 min-h-[300px] flex flex-col justify-end">
                  {form.message ? (
                    <div className="bg-[#dcf8c6] dark:bg-green-900/40 rounded-lg p-3 text-sm max-w-[240px] ml-auto shadow-sm">
                      <p className="text-[12px] whitespace-pre-wrap leading-relaxed">
                        {form.message.replace(/\{name\}/g, "Rahul Sharma").replace(/\{phone\}/g, "9876543210").replace(/\{city\}/g, "Mumbai").replace(/\{car_model\}/g, "Creta")}
                      </p>
                      <span className="text-[9px] text-gray-500 float-right mt-1">
                        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
                      </span>
                    </div>
                  ) : (
                    <p className="text-center text-xs text-gray-500 py-12">Type a message to see preview</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Drip Campaigns Tab ───
function DripCampaigns() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newDrip, setNewDrip] = useState({ name: "", vertical: "all", steps: [{ day: 0, message: "", template_name: "", delay_hours: 0 }] });

  const { data: sequences } = useQuery({
    queryKey: ["drip-sequences-pro"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_drip_sequences").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: enrollmentCounts } = useQuery({
    queryKey: ["drip-enrollment-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_drip_enrollments").select("sequence_id, status");
      const counts: Record<string, { active: number; completed: number; total: number }> = {};
      (data || []).forEach((e: any) => {
        if (!counts[e.sequence_id]) counts[e.sequence_id] = { active: 0, completed: 0, total: 0 };
        counts[e.sequence_id].total++;
        if (e.status === "active") counts[e.sequence_id].active++;
        if (e.status === "completed") counts[e.sequence_id].completed++;
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newDrip.name || newDrip.steps.length === 0) throw new Error("Name and at least one step required");
      const { error } = await supabase.from("wa_drip_sequences").insert({
        name: newDrip.name,
        vertical: newDrip.vertical,
        steps: newDrip.steps,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Drip sequence created!");
      qc.invalidateQueries({ queryKey: ["drip-sequences-pro"] });
      setShowCreate(false);
      setNewDrip({ name: "", vertical: "all", steps: [{ day: 0, message: "", template_name: "", delay_hours: 0 }] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await supabase.from("wa_drip_sequences").update({ is_active: isActive }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drip-sequences-pro"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("wa_drip_sequences").delete().eq("id", id);
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["drip-sequences-pro"] }); },
  });

  const addStep = () => {
    const lastDay = newDrip.steps[newDrip.steps.length - 1]?.day || 0;
    setNewDrip((p) => ({ ...p, steps: [...p.steps, { day: lastDay + 1, message: "", template_name: "", delay_hours: 24 }] }));
  };

  const updateStep = (idx: number, field: string, value: any) => {
    setNewDrip((p) => ({ ...p, steps: p.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s) }));
  };

  const removeStep = (idx: number) => {
    if (newDrip.steps.length <= 1) return;
    setNewDrip((p) => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Timer className="h-4 w-4 text-violet-500" /> Drip Sequences</h3>
          <p className="text-xs text-muted-foreground">Multi-step automated follow-up campaigns</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Drip</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {(sequences || []).map((seq: any) => {
          const counts = enrollmentCounts?.[seq.id] || { active: 0, completed: 0, total: 0 };
          const steps = (seq.steps || []) as any[];
          return (
            <Card key={seq.id} className={!seq.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-sm">{seq.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{seq.vertical || "All"}</Badge>
                      <Badge variant={seq.is_active ? "default" : "secondary"} className="text-[10px]">
                        {seq.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={seq.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: seq.id, isActive: v })} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this drip?")) deleteMutation.mutate(seq.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Step Flow Visualization */}
                <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                  {steps.map((step: any, i: number) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {i + 1}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-0.5">Day {step.day}</span>
                      </div>
                      {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </div>
                  ))}
                </div>

                {/* Enrollment Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-xs font-bold">{counts.active}</p>
                    <p className="text-[10px] text-muted-foreground">Active</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-xs font-bold">{counts.completed}</p>
                    <p className="text-[10px] text-muted-foreground">Done</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-xs font-bold">{counts.total}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(sequences || []).length === 0 && (
          <Card className="col-span-2 p-8 text-center text-muted-foreground">
            <Timer className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No drip sequences yet. Create your first one.</p>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Drip Sequence</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sequence Name *</Label>
                <Input placeholder="e.g., New Lead Follow-up" value={newDrip.name} onChange={(e) => setNewDrip((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Vertical</Label>
                <Select value={newDrip.vertical} onValueChange={(v) => setNewDrip((p) => ({ ...p, vertical: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="cars">Cars</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Steps</Label>
                <Button size="sm" variant="outline" onClick={addStep}><Plus className="h-3 w-3 mr-1" /> Add Step</Button>
              </div>
              {newDrip.steps.map((step, idx) => (
                <Card key={idx} className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{idx + 1}</div>
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs shrink-0">Day:</Label>
                        <Input type="number" min={0} value={step.day} onChange={(e) => updateStep(idx, "day", Number(e.target.value))} className="h-7 text-xs w-16" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Label className="text-xs shrink-0">Delay (hrs):</Label>
                        <Input type="number" min={0} value={step.delay_hours} onChange={(e) => updateStep(idx, "delay_hours", Number(e.target.value))} className="h-7 text-xs w-16" />
                      </div>
                    </div>
                    {newDrip.steps.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => removeStep(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Input placeholder="Template name (optional)" value={step.template_name} onChange={(e) => updateStep(idx, "template_name", e.target.value)} className="h-7 text-xs mb-2" />
                  <Textarea placeholder={`Step ${idx + 1} message... Use {name}, {phone}`} value={step.message} onChange={(e) => updateStep(idx, "message", e.target.value)} rows={2} className="text-xs" />
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <Layers className="h-4 w-4 mr-1" /> Create Sequence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Event Triggers Tab ───
function EventTriggers() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", trigger_event: "new_lead", message: "", template_name: "", is_active: true, vertical: "all" });

  const TRIGGER_EVENTS = [
    { value: "new_lead", label: "New Lead Created", icon: "🆕" },
    { value: "lead_won", label: "Lead Won / Converted", icon: "🏆" },
    { value: "lead_lost", label: "Lead Lost", icon: "❌" },
    { value: "follow_up_due", label: "Follow-up Due", icon: "📅" },
    { value: "no_response_24h", label: "No Response 24hrs", icon: "⏰" },
    { value: "quote_sent", label: "Quote Sent", icon: "📋" },
    { value: "payment_received", label: "Payment Received", icon: "💰" },
    { value: "policy_issued", label: "Policy Issued", icon: "📄" },
    { value: "renewal_reminder", label: "Renewal Reminder", icon: "🔄" },
    { value: "birthday", label: "Birthday Wish", icon: "🎂" },
  ];

  const { data: rules } = useQuery({
    queryKey: ["wa-trigger-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_chatbot_rules").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.message) throw new Error("Name and message required");
      const { error } = await supabase.from("wa_chatbot_rules").insert({
        name: form.name,
        intent_keywords: [`event:${form.trigger_event}`],
        response_content: form.message,
        response_type: "text",
        template_name: form.template_name || null,
        is_active: form.is_active,
        priority: 10,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trigger created!");
      qc.invalidateQueries({ queryKey: ["wa-trigger-rules"] });
      setShowCreate(false);
      setForm({ name: "", trigger_event: "new_lead", message: "", template_name: "", is_active: true, vertical: "all" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleRule = async (id: string, isActive: boolean) => {
    await supabase.from("wa_chatbot_rules").update({ is_active: !isActive }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["wa-trigger-rules"] });
  };

  const triggerRules = (rules || []).filter((r: any) => (r.intent_keywords || []).some((k: string) => k.startsWith("event:")));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Event Triggers</h3>
          <p className="text-xs text-muted-foreground">Auto-send messages when events occur</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Trigger</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {triggerRules.map((rule: any) => {
          const eventKey = ((rule.intent_keywords || []) as string[]).find((k: string) => k.startsWith("event:"))?.replace("event:", "") || "";
          const event = TRIGGER_EVENTS.find((e) => e.value === eventKey);
          return (
            <Card key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{event?.icon || "⚡"}</span>
                    <div>
                      <p className="font-medium text-sm">{rule.rule_name}</p>
                      <p className="text-xs text-muted-foreground">{event?.label || eventKey}</p>
                    </div>
                  </div>
                  <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule.id, rule.is_active)} />
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 bg-muted/50 rounded p-2">{rule.response_content}</p>
              </CardContent>
            </Card>
          );
        })}
        {triggerRules.length === 0 && (
          <Card className="col-span-2 p-8 text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No event triggers set up yet.</p>
          </Card>
        )}
      </div>

      {/* Create Trigger Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Event Trigger</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Trigger Name *</Label>
              <Input placeholder="e.g., Welcome New Lead" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>When this happens:</Label>
              <Select value={form.trigger_event} onValueChange={(v) => setForm((p) => ({ ...p, trigger_event: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.icon} {e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template (optional)</Label>
              <Input placeholder="Meta-approved template name" value={form.template_name} onChange={(e) => setForm((p) => ({ ...p, template_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Message Content *</Label>
              <Textarea placeholder="Hello {name}! ..." value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <Zap className="h-4 w-4 mr-1" /> Create Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Campaign History Tab ───
function CampaignHistory() {
  const { data: campaigns } = useQuery({
    queryKey: ["broadcast-history"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_campaigns").select("*").eq("channel", "whatsapp").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { class: string; icon: any }> = {
      completed: { class: "bg-green-500/10 text-green-600", icon: CheckCheck },
      sending: { class: "bg-amber-500/10 text-amber-600", icon: RefreshCw },
      queued: { class: "bg-blue-500/10 text-blue-600", icon: Clock },
      failed: { class: "bg-destructive/10 text-destructive", icon: AlertCircle },
      draft: { class: "bg-muted text-muted-foreground", icon: Clock },
    };
    const cfg = map[status] || map.draft;
    const Icon = cfg.icon;
    return <Badge className={cfg.class}><Icon className="h-3 w-3 mr-1" />{status}</Badge>;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Read</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(campaigns || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No campaigns yet</TableCell>
                </TableRow>
              ) : (campaigns || []).map((c: any) => {
                const total = (c.total_sent || 0) + (c.total_failed || 0) || 1;
                const delRate = Math.round(((c.total_delivered || 0) / total) * 100);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{c.message_content?.slice(0, 50)}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{(c.total_sent || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm">{(c.total_delivered || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({delRate}%)</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{(c.total_read || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-destructive">{(c.total_failed || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ─── Main Broadcasts Pro ───
export function WAHubBroadcasts() {
  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <BroadcastStats />

      <Tabs defaultValue="broadcast" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="broadcast" className="gap-1.5 text-xs">
            <Megaphone className="h-3.5 w-3.5" /> One-Shot
          </TabsTrigger>
          <TabsTrigger value="drips" className="gap-1.5 text-xs">
            <Timer className="h-3.5 w-3.5" /> Drip Campaigns
          </TabsTrigger>
          <TabsTrigger value="triggers" className="gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Event Triggers
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast"><OneShotBroadcast /></TabsContent>
        <TabsContent value="drips"><DripCampaigns /></TabsContent>
        <TabsContent value="triggers"><EventTriggers /></TabsContent>
        <TabsContent value="history"><CampaignHistory /></TabsContent>
      </Tabs>
    </div>
  );
}
