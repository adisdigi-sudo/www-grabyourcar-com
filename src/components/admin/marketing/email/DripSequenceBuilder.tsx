import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Play, Pause, Plus, Trash2, Clock, Mail,
  ArrowDown, Loader2, GitBranch, Users, Zap, Settings
} from "lucide-react";

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_event: string | null;
  is_active: boolean;
  created_at: string;
}

interface Step {
  id: string;
  sequence_id: string;
  template_id: string | null;
  step_order: number;
  delay_hours: number;
  delay_days: number;
  conditions: any;
  is_active: boolean;
}

interface Template {
  id: string;
  name: string;
  subject: string;
}

interface Enrollment {
  id: string;
  subscriber_id: string;
  sequence_id: string;
  current_step_index: number;
  status: string;
  enrolled_at: string;
  next_send_at: string | null;
}

export function DripSequenceBuilder() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);

  const [seqForm, setSeqForm] = useState({ name: "", description: "", trigger_type: "manual", trigger_event: "" });
  const [stepForm, setStepForm] = useState({ template_id: "", delay_days: 0, delay_hours: 0 });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    const [seqRes, tmpRes] = await Promise.all([
      supabase.from("email_sequences").select("*").order("created_at", { ascending: false }),
      supabase.from("email_templates").select("id, name, subject").eq("is_active", true),
    ]);
    if (seqRes.data) setSequences(seqRes.data as Sequence[]);
    if (tmpRes.data) setTemplates(tmpRes.data as Template[]);
    setIsLoading(false);
  };

  const fetchSteps = async (seqId: string) => {
    const [stepsRes, enrollRes] = await Promise.all([
      supabase.from("email_sequence_steps").select("*").eq("sequence_id", seqId).order("step_order"),
      supabase.from("email_drip_enrollments").select("*").eq("sequence_id", seqId),
    ]);
    if (stepsRes.data) setSteps(stepsRes.data as Step[]);
    if (enrollRes.data) setEnrollments(enrollRes.data as Enrollment[]);
  };

  const selectSequence = (seq: Sequence) => {
    setSelectedSequence(seq);
    fetchSteps(seq.id);
  };

  const handleCreateSequence = async () => {
    if (!seqForm.name) { toast.error("Name required"); return; }
    const { error } = await supabase.from("email_sequences").insert({
      name: seqForm.name,
      description: seqForm.description || null,
      trigger_type: seqForm.trigger_type,
      trigger_event: seqForm.trigger_event || null,
      is_active: false,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Sequence created");
    setIsCreateOpen(false);
    setSeqForm({ name: "", description: "", trigger_type: "manual", trigger_event: "" });
    fetchAll();
  };

  const handleAddStep = async () => {
    if (!selectedSequence || !stepForm.template_id) { toast.error("Select a template"); return; }
    const nextOrder = steps.length + 1;
    const { error } = await supabase.from("email_sequence_steps").insert({
      sequence_id: selectedSequence.id,
      template_id: stepForm.template_id,
      step_order: nextOrder,
      delay_days: stepForm.delay_days,
      delay_hours: stepForm.delay_hours,
      is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Step added");
    setIsAddStepOpen(false);
    setStepForm({ template_id: "", delay_days: 0, delay_hours: 0 });
    fetchSteps(selectedSequence.id);
  };

  const handleDeleteStep = async (id: string) => {
    if (!selectedSequence) return;
    await supabase.from("email_sequence_steps").delete().eq("id", id);
    toast.success("Step removed");
    fetchSteps(selectedSequence.id);
  };

  const toggleSequenceActive = async (seq: Sequence) => {
    await supabase.from("email_sequences").update({ is_active: !seq.is_active }).eq("id", seq.id);
    toast.success(seq.is_active ? "Sequence paused" : "Sequence activated");
    fetchAll();
    if (selectedSequence?.id === seq.id) setSelectedSequence({ ...seq, is_active: !seq.is_active });
  };

  const handleDeleteSequence = async (id: string) => {
    if (!confirm("Delete this sequence and all its steps?")) return;
    await supabase.from("email_sequence_steps").delete().eq("sequence_id", id);
    await supabase.from("email_sequences").delete().eq("id", id);
    toast.success("Sequence deleted");
    if (selectedSequence?.id === id) { setSelectedSequence(null); setSteps([]); }
    fetchAll();
  };

  const getTemplateName = (id: string | null) => templates.find(t => t.id === id)?.name || "Unknown";

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Automated email sequences that drip content over time</p>
        <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Sequence</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Sequences List */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Sequences ({sequences.length})</Label>
          {sequences.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Create your first drip sequence</p>
              </CardContent>
            </Card>
          ) : sequences.map(seq => (
            <Card
              key={seq.id}
              className={`cursor-pointer transition-colors ${selectedSequence?.id === seq.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
              onClick={() => selectSequence(seq)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{seq.name}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{seq.trigger_type}</Badge>
                      <Badge className={seq.is_active ? "bg-green-100 text-green-800 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>
                        {seq.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); toggleSequenceActive(seq); }}>
                      {seq.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); handleDeleteSequence(seq.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Step Timeline */}
        <div className="lg:col-span-2">
          {selectedSequence ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedSequence.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedSequence.description || "No description"}</p>
                </div>
                <Button size="sm" onClick={() => setIsAddStepOpen(true)}><Plus className="h-3 w-3 mr-1" />Add Step</Button>
              </div>

              {/* Enrollment Stats */}
              <div className="grid grid-cols-3 gap-2">
                <Card><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{enrollments.filter(e => e.status === "active").length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{enrollments.filter(e => e.status === "completed").length}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{enrollments.filter(e => e.status === "paused").length}</p>
                  <p className="text-xs text-muted-foreground">Paused</p>
                </CardContent></Card>
              </div>

              {/* Steps Timeline */}
              {steps.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Add steps to build your drip sequence</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-0">
                  {steps.map((step, idx) => (
                    <div key={step.id}>
                      {idx > 0 && (
                        <div className="flex items-center gap-2 py-2 pl-6">
                          <div className="w-0.5 h-4 bg-border" />
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Wait {step.delay_days > 0 ? `${step.delay_days}d` : ""}{step.delay_hours > 0 ? ` ${step.delay_hours}h` : ""}
                            {step.delay_days === 0 && step.delay_hours === 0 ? "Immediately" : ""}
                          </span>
                          <ArrowDown className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <Card className={!step.is_active ? "opacity-50" : ""}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{getTemplateName(step.template_id)}</p>
                              <p className="text-xs text-muted-foreground">
                                Step {step.step_order} • {step.delay_days}d {step.delay_hours}h delay
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteStep(step.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center text-muted-foreground">
                <Zap className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Select a sequence to view and edit its steps</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Sequence Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Drip Sequence</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input placeholder="e.g., Welcome Series" value={seqForm.name} onChange={e => setSeqForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea placeholder="What this sequence does..." value={seqForm.description} onChange={e => setSeqForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={seqForm.trigger_type} onValueChange={v => setSeqForm(p => ({ ...p, trigger_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Enrollment</SelectItem>
                  <SelectItem value="new_subscriber">New Subscriber</SelectItem>
                  <SelectItem value="tag_added">Tag Added</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {seqForm.trigger_type === "tag_added" && (
              <div className="space-y-2"><Label>Tag Name</Label><Input placeholder="e.g., corporate" value={seqForm.trigger_event} onChange={e => setSeqForm(p => ({ ...p, trigger_event: e.target.value }))} /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSequence}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Step Modal */}
      <Dialog open={isAddStepOpen} onOpenChange={setIsAddStepOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Sequence Step</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Template *</Label>
              <Select value={stepForm.template_id} onValueChange={v => setStepForm(p => ({ ...p, template_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} — {t.subject}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Delay (days)</Label><Input type="number" min={0} value={stepForm.delay_days} onChange={e => setStepForm(p => ({ ...p, delay_days: parseInt(e.target.value) || 0 }))} /></div>
              <div className="space-y-2"><Label>Delay (hours)</Label><Input type="number" min={0} value={stepForm.delay_hours} onChange={e => setStepForm(p => ({ ...p, delay_hours: parseInt(e.target.value) || 0 }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStepOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStep}>Add Step</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
