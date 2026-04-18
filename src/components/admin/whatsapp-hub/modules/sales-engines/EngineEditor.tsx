import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VERTICALS, type SalesEngine, type SalesEngineStep } from "./types";
import { StepBranchEditor } from "./StepBranchEditor";
import { EngineSimulator } from "./EngineSimulator";

interface Props {
  engineId: string;
  onBack: () => void;
}

export function EngineEditor({ engineId, onBack }: Props) {
  const [engine, setEngine] = useState<SalesEngine | null>(null);
  const [steps, setSteps] = useState<SalesEngineStep[]>([]);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  useEffect(() => { load(); }, [engineId, refreshKey]);

  async function load() {
    const { data: eng } = await supabase
      .from("sales_engines" as any)
      .select("*")
      .eq("id", engineId)
      .maybeSingle();
    setEngine(eng as unknown as SalesEngine);

    const { data: stepsData } = await supabase
      .from("sales_engine_steps" as any)
      .select("*")
      .eq("engine_id", engineId)
      .order("step_order");
    const sd = (stepsData || []) as unknown as SalesEngineStep[];
    setSteps(sd);
    if (sd.length && !activeStepId) setActiveStepId(sd[0].id);
  }

  async function saveMeta() {
    if (!engine) return;
    setSavingMeta(true);
    const { error } = await supabase
      .from("sales_engines" as any)
      .update({
        name: engine.name,
        description: engine.description,
        vertical: engine.vertical,
        language: engine.language,
        is_active: engine.is_active,
        qualify_action: engine.qualify_action,
        handover_phone: engine.handover_phone,
        notes: engine.notes,
      })
      .eq("id", engine.id);
    setSavingMeta(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Engine saved ✓" });
  }

  async function addStep() {
    const nextOrder = steps.length + 1;
    const stepKey = `step_${nextOrder}_${Date.now().toString(36).slice(-4)}`;
    const { data, error } = await supabase
      .from("sales_engine_steps" as any)
      .insert({
        engine_id: engineId,
        step_key: stepKey,
        step_order: nextOrder,
        title: `Step ${nextOrder}`,
        message_text: "Type your question here...",
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Add step failed", description: error.message, variant: "destructive" });
    } else if (data) {
      setRefreshKey((k) => k + 1);
      setActiveStepId((data as any).id);
    }
  }

  async function deleteStep(id: string) {
    if (!confirm("Delete this step and all its branches?")) return;
    await supabase.from("sales_engine_steps" as any).delete().eq("id", id);
    setActiveStepId(null);
    setRefreshKey((k) => k + 1);
  }

  if (!engine) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const activeStep = steps.find((s) => s.id === activeStepId);
  const allStepKeys = steps.map((s) => s.step_key);
  const verticalMeta = VERTICALS.find((v) => v.value === engine.vertical);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg">{engine.name}</h2>
            {verticalMeta && <Badge className={`${verticalMeta.color} text-white border-0`}>{verticalMeta.label}</Badge>}
            <Badge variant={engine.is_active ? "default" : "secondary"}>{engine.is_active ? "Active" : "Paused"}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{engine.description}</p>
        </div>
      </div>

      {/* Engine settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Engine Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Engine name</Label>
              <Input value={engine.name} onChange={(e) => setEngine({ ...engine, name: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Vertical (lead goes here)</Label>
              <Select value={engine.vertical} onValueChange={(v) => setEngine({ ...engine, vertical: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VERTICALS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Language</Label>
              <Select value={engine.language || "hinglish"} onValueChange={(v) => setEngine({ ...engine, language: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hinglish">Hinglish</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={engine.description || ""} onChange={(e) => setEngine({ ...engine, description: e.target.value })} rows={2} className="text-xs" />
          </div>
          <div className="grid grid-cols-3 gap-3 items-end">
            <div className="flex items-center gap-2">
              <Switch checked={engine.is_active} onCheckedChange={(v) => setEngine({ ...engine, is_active: v })} />
              <Label className="text-xs">Active (auto-engage replies)</Label>
            </div>
            <div>
              <Label className="text-xs">Handover phone (optional)</Label>
              <Input value={engine.handover_phone || ""} onChange={(e) => setEngine({ ...engine, handover_phone: e.target.value })} placeholder="91XXXXXXXXXX" className="h-8 text-xs" />
            </div>
            <Button onClick={saveMeta} disabled={savingMeta} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" /> Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Builder + Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Steps list */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Steps ({steps.length})</CardTitle>
            <Button size="sm" variant="outline" onClick={addStep} className="h-7 gap-1">
              <Plus className="h-3 w-3" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveStepId(s.id)}
                className={`w-full text-left p-2 rounded border transition-all ${
                  activeStepId === s.id ? "border-green-500 bg-green-50 dark:bg-green-950/30" : "border-border hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant="outline" className="text-[9px] h-4 px-1">#{i + 1}</Badge>
                  <span className="text-xs font-semibold">{s.title || s.step_key}</span>
                  {s.is_initial && <Badge className="text-[9px] h-4 px-1 bg-green-600">START</Badge>}
                  {s.is_terminal && <Badge className="text-[9px] h-4 px-1 bg-purple-600">FINAL</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{s.message_text}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Step editor */}
        <div className="lg:col-span-1">
          {activeStep ? (
            <StepBranchEditor
              step={activeStep}
              allStepKeys={allStepKeys}
              onSaved={() => setRefreshKey((k) => k + 1)}
              onDelete={() => deleteStep(activeStep.id)}
            />
          ) : (
            <div className="border rounded p-6 text-center text-sm text-muted-foreground">
              Select a step to edit, or click "+ Add" to create one.
            </div>
          )}
        </div>

        {/* Live simulator */}
        <div className="lg:col-span-1">
          <EngineSimulator engineId={engineId} key={refreshKey} />
        </div>
      </div>
    </div>
  );
}
