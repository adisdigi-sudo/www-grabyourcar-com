import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Zap, Trash2, Play, ArrowRight } from "lucide-react";

export function AutoClosePipelineManager() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newRule, setNewRule] = useState({
    vertical: "car",
    from_stage: "interested",
    to_stage: "qualified",
    description: "",
    conditions: { min_score: 70, require_ai_qualification: false },
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ["auto-close-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("auto_close_rules").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("auto_close_rules").insert({
        vertical: newRule.vertical,
        from_stage: newRule.from_stage,
        to_stage: newRule.to_stage,
        description: newRule.description,
        conditions: newRule.conditions as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-close-rules"] });
      setShowCreate(false);
      toast.success("Auto-close rule created!");
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("auto_close_rules").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auto-close-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("auto_close_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-close-rules"] });
      toast.success("Rule deleted");
    },
  });

  const runEvaluation = async () => {
    toast.info("Running auto-close evaluation...");
    const { data, error } = await supabase.functions.invoke("auto-close-pipeline", {
      body: { action: "evaluate" },
    });
    if (error) { toast.error("Evaluation failed"); return; }
    toast.success(`Evaluated ${data?.rules_evaluated || 0} rules, advanced ${data?.processed || 0} leads`);
  };

  const stages = [
    "new", "contacted", "interested", "qualified", "quoted", "negotiation",
    "won", "lost", "follow_up", "no_response",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Auto-Close Pipeline
          </h2>
          <p className="text-muted-foreground">Rules to auto-advance leads through pipeline stages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runEvaluation}>
            <Play className="h-4 w-4 mr-2" />Run Now
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Auto-Close Rule</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={newRule.vertical} onValueChange={(v) => setNewRule({ ...newRule, vertical: v })}>
                  <SelectTrigger><SelectValue placeholder="Vertical" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car Sales</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="loan">Loans</SelectItem>
                    <SelectItem value="hsrp">HSRP</SelectItem>
                    <SelectItem value="all">All Verticals</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">From Stage</label>
                    <Select value={newRule.from_stage} onValueChange={(v) => setNewRule({ ...newRule, from_stage: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">To Stage</label>
                    <Select value={newRule.to_stage} onValueChange={(v) => setNewRule({ ...newRule, to_stage: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Input placeholder="Description" value={newRule.description} onChange={(e) => setNewRule({ ...newRule, description: e.target.value })} />
                <div>
                  <label className="text-sm font-medium">Min AI Score (0-100)</label>
                  <Input type="number" value={newRule.conditions.min_score} onChange={(e) => setNewRule({ ...newRule, conditions: { ...newRule.conditions, min_score: parseInt(e.target.value) || 0 } })} />
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="w-full">
                  Create Rule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading rules...</div>
      ) : !rules?.length ? (
        <Card className="p-12 text-center">
          <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No Auto-Close Rules</h3>
          <p className="text-muted-foreground mb-4">Create rules to automatically advance leads through pipeline stages</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule: any) => {
            const conditions = rule.conditions || {};
            return (
              <Card key={rule.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rule.is_active ? "bg-yellow-100 text-yellow-600" : "bg-muted text-muted-foreground"}`}>
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{rule.vertical}</Badge>
                          <span className="font-mono text-sm">{rule.from_stage}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm font-bold">{rule.to_stage}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {rule.description || "No description"}
                          {conditions.min_score && <span> • Min score: {conditions.min_score}</span>}
                          {conditions.require_ai_qualification && <span> • AI qualification required</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={rule.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, isActive: checked })} />
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(rule.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
