import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Play, Pause, Trash2, MessageSquare, Zap, Bot, Phone } from "lucide-react";

interface DripStep {
  day: number;
  delay_hours: number;
  message: string;
  template_name: string;
  type: "text" | "template";
}

export function WADripSequenceManager() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newSequence, setNewSequence] = useState({
    name: "",
    vertical: "car",
    trigger_event: "new_lead",
    steps: [{ day: 0, delay_hours: 0, message: "Hi {name}! Thanks for your interest. Our expert will reach out shortly. 🚗", template_name: "", type: "text" as const }],
  });

  const { data: sequences, isLoading } = useQuery({
    queryKey: ["wa-drip-sequences"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wa_drip_sequences").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollmentCounts } = useQuery({
    queryKey: ["wa-drip-enrollment-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wa_drip_enrollments").select("sequence_id, status");
      if (error) throw error;
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
      const { error } = await supabase.from("wa_drip_sequences").insert({
        name: newSequence.name,
        vertical: newSequence.vertical,
        trigger_event: newSequence.trigger_event,
        steps: newSequence.steps as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-drip-sequences"] });
      setShowCreate(false);
      toast.success("Drip sequence created!");
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("wa_drip_sequences").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wa-drip-sequences"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wa_drip_sequences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-drip-sequences"] });
      toast.success("Sequence deleted");
    },
  });

  const addStep = () => {
    const lastDay = newSequence.steps[newSequence.steps.length - 1]?.day || 0;
    setNewSequence({
      ...newSequence,
      steps: [...newSequence.steps, { day: lastDay + 1, delay_hours: 0, message: "", template_name: "", type: "text" }],
    });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const steps = [...newSequence.steps];
    (steps[index] as any)[field] = value;
    setNewSequence({ ...newSequence, steps });
  };

  const removeStep = (index: number) => {
    setNewSequence({ ...newSequence, steps: newSequence.steps.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-green-500" />
            WhatsApp Drip Sequences
          </h2>
          <p className="text-muted-foreground">Automated multi-step follow-up sequences per vertical</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Create Sequence</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Drip Sequence</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Sequence name" value={newSequence.name} onChange={(e) => setNewSequence({ ...newSequence, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Select value={newSequence.vertical} onValueChange={(v) => setNewSequence({ ...newSequence, vertical: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car Sales</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="loan">Loans</SelectItem>
                    <SelectItem value="hsrp">HSRP</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                    <SelectItem value="rental">Self-Drive</SelectItem>
                    <SelectItem value="all">All Verticals</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newSequence.trigger_event} onValueChange={(v) => setNewSequence({ ...newSequence, trigger_event: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_lead">New Lead</SelectItem>
                    <SelectItem value="lead_interested">Lead Interested</SelectItem>
                    <SelectItem value="lead_no_response">No Response (48h)</SelectItem>
                    <SelectItem value="lead_follow_up">Follow-up Due</SelectItem>
                    <SelectItem value="policy_expiry">Policy Expiry</SelectItem>
                    <SelectItem value="manual">Manual Enrollment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Steps</h4>
                {newSequence.steps.map((step, i) => (
                  <Card key={i} className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Day {step.day}</Badge>
                      {step.delay_hours > 0 && <Badge variant="secondary">+{step.delay_hours}h</Badge>}
                      <div className="flex-1" />
                      {i > 0 && <Button variant="ghost" size="sm" onClick={() => removeStep(i)}><Trash2 className="h-3 w-3" /></Button>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <Input type="number" placeholder="Day" value={step.day} onChange={(e) => updateStep(i, "day", parseInt(e.target.value) || 0)} />
                      <Input type="number" placeholder="Delay hours" value={step.delay_hours} onChange={(e) => updateStep(i, "delay_hours", parseInt(e.target.value) || 0)} />
                    </div>
                    <Textarea placeholder="Message text (use {name}, {phone} as variables)" value={step.message} onChange={(e) => updateStep(i, "message", e.target.value)} rows={2} />
                  </Card>
                ))}
                <Button variant="outline" onClick={addStep} className="w-full"><Plus className="h-4 w-4 mr-2" />Add Step</Button>
              </div>

              <Button onClick={() => createMutation.mutate()} disabled={!newSequence.name || createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Sequence"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading sequences...</div>
      ) : !sequences?.length ? (
        <Card className="p-12 text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No Drip Sequences Yet</h3>
          <p className="text-muted-foreground mb-4">Create automated WhatsApp follow-up sequences for each vertical</p>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Create First Sequence</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sequences.map((seq: any) => {
            const steps = (seq.steps || []) as DripStep[];
            const counts = enrollmentCounts?.[seq.id] || { active: 0, completed: 0, total: 0 };
            return (
              <Card key={seq.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${seq.is_active ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{seq.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{seq.vertical}</Badge>
                          <span>Trigger: {seq.trigger_event}</span>
                          <span>•</span>
                          <span>{steps.length} steps</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <div className="font-medium">{counts.active} active</div>
                        <div className="text-muted-foreground">{counts.completed} completed</div>
                      </div>
                      <Switch checked={seq.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: seq.id, isActive: checked })} />
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(seq.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="px-3 py-1 bg-muted rounded-full text-xs whitespace-nowrap">
                          Day {step.day}{step.delay_hours ? `+${step.delay_hours}h` : ""}
                        </div>
                        {i < steps.length - 1 && <span className="text-muted-foreground">→</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
