import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, GitBranch, Save, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ACTIONS, type SalesEngineStep, type SalesEngineBranch } from "./types";

interface Props {
  step: SalesEngineStep;
  allStepKeys: string[];
  onSaved: () => void;
  onDelete: () => void;
}

export function StepBranchEditor({ step, allStepKeys, onSaved, onDelete }: Props) {
  const [edited, setEdited] = useState<SalesEngineStep>(step);
  const [branches, setBranches] = useState<SalesEngineBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEdited(step);
    loadBranches();
  }, [step.id]);

  async function loadBranches() {
    const { data } = await supabase
      .from("sales_engine_branches" as any)
      .select("*")
      .eq("step_id", step.id)
      .order("branch_order");
    setBranches(((data || []) as unknown as SalesEngineBranch[]));
  }

  async function saveStep() {
    setLoading(true);
    const { error } = await supabase
      .from("sales_engine_steps" as any)
      .update({
        title: edited.title,
        message_text: edited.message_text,
        capture_field: edited.capture_field || null,
        is_initial: edited.is_initial,
        is_terminal: edited.is_terminal,
      })
      .eq("id", step.id);

    // upsert branches
    for (const br of branches) {
      if (br.id.startsWith("new-")) {
        await supabase.from("sales_engine_branches" as any).insert({
          step_id: step.id,
          branch_order: br.branch_order,
          match_type: br.match_type,
          match_keywords: br.match_keywords,
          next_step_key: br.next_step_key,
          action: br.action,
          action_note: br.action_note,
        });
      } else {
        await supabase.from("sales_engine_branches" as any).update({
          branch_order: br.branch_order,
          match_type: br.match_type,
          match_keywords: br.match_keywords,
          next_step_key: br.next_step_key,
          action: br.action,
          action_note: br.action_note,
        }).eq("id", br.id);
      }
    }
    setLoading(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Step saved ✓" });
      onSaved();
      loadBranches();
    }
  }

  function addBranch() {
    setBranches([...branches, {
      id: `new-${Date.now()}`,
      step_id: step.id,
      branch_order: branches.length + 1,
      match_type: "keyword",
      match_keywords: [],
      next_step_key: null,
      action: "continue",
      action_note: null,
    }]);
  }

  async function removeBranch(br: SalesEngineBranch) {
    if (!br.id.startsWith("new-")) {
      await supabase.from("sales_engine_branches" as any).delete().eq("id", br.id);
    }
    setBranches(branches.filter((b) => b.id !== br.id));
  }

  function updateBranch(idx: number, patch: Partial<SalesEngineBranch>) {
    const next = [...branches];
    next[idx] = { ...next[idx], ...patch };
    setBranches(next);
  }

  return (
    <div className="space-y-3">
      {/* Step message */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-bold uppercase text-muted-foreground">Step Message</span>
              <Badge variant="outline" className="text-[10px]">{step.step_key}</Badge>
              {edited.is_initial && <Badge className="text-[10px] bg-green-600">START</Badge>}
              {edited.is_terminal && <Badge className="text-[10px] bg-purple-600">FINAL</Badge>}
            </div>
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Internal title</Label>
              <Input value={edited.title || ""} onChange={(e) => setEdited({ ...edited, title: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Capture reply as field (optional)</Label>
              <Input value={edited.capture_field || ""} onChange={(e) => setEdited({ ...edited, capture_field: e.target.value })} placeholder="e.g. loan_amount, city" className="h-8 text-xs" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Message customer sees on WhatsApp</Label>
            <Textarea
              value={edited.message_text}
              onChange={(e) => setEdited({ ...edited, message_text: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={edited.is_initial} onChange={(e) => setEdited({ ...edited, is_initial: e.target.checked })} />
              Start step
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={edited.is_terminal} onChange={(e) => setEdited({ ...edited, is_terminal: e.target.checked })} />
              Final step
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Branches */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-bold uppercase text-muted-foreground">Reply Routing</span>
            </div>
            <Button size="sm" variant="outline" onClick={addBranch} className="h-7 gap-1">
              <Plus className="h-3 w-3" /> Add Branch
            </Button>
          </div>

          {branches.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded">
              No branches. Add at least one — typically: <b>"any"</b> match → next step OR <b>keyword</b> match → qualify.
            </div>
          )}

          {branches.map((br, idx) => (
            <div key={br.id} className="border rounded p-2 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">#{idx + 1}</Badge>
                <Select value={br.match_type} onValueChange={(v) => updateBranch(idx, { match_type: v as any })}>
                  <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Keyword match</SelectItem>
                    <SelectItem value="any">Any reply</SelectItem>
                    <SelectItem value="no_match">No match (fallback)</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => removeBranch(br)} className="h-7 ml-auto text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {br.match_type === "keyword" && (
                <Input
                  value={(br.match_keywords || []).join(", ")}
                  onChange={(e) => updateBranch(idx, { match_keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="haan, yes, chahiye, interested"
                  className="h-8 text-xs"
                />
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] uppercase">Action</Label>
                  <Select value={br.action} onValueChange={(v) => updateBranch(idx, { action: v as any })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {br.action === "continue" && (
                  <div>
                    <Label className="text-[10px] uppercase">Next step</Label>
                    <Select value={br.next_step_key || ""} onValueChange={(v) => updateBranch(idx, { next_step_key: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick step..." /></SelectTrigger>
                      <SelectContent>
                        {allStepKeys.filter((k) => k !== step.step_key).map((k) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(br.action === "qualify" || br.action === "disqualify" || br.action === "handover" || br.action === "end") && (
                  <div>
                    <Label className="text-[10px] uppercase">Note (internal)</Label>
                    <Input value={br.action_note || ""} onChange={(e) => updateBranch(idx, { action_note: e.target.value })} placeholder="e.g. Hot lead — call immediately" className="h-8 text-xs" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={saveStep} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
        <Save className="h-4 w-4 mr-2" /> {loading ? "Saving..." : "Save Step + Branches"}
      </Button>
    </div>
  );
}
