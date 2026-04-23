import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Sparkles, Tag, MessageSquare, ArrowUp, ArrowDown, Power } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface FlowRule {
  id: string;
  rule_name: string;
  match_type: "keyword" | "regex" | "fallback" | "ai";
  keywords: string[];
  reply_template: string | null;
  priority: number;
  is_active: boolean;
  ai_fallback: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
}

const emptyForm = {
  rule_name: "",
  match_type: "keyword" as FlowRule["match_type"],
  keywords: "",
  reply_template: "",
  priority: 100,
  is_active: true,
  ai_fallback: false,
};

export default function DealerReplyFlowBuilder() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [globalAi, setGlobalAi] = useState(true);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["dealer-reply-flows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_reply_flows")
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      return (data || []) as FlowRule[];
    },
  });

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (r: FlowRule) => {
    setEditingId(r.id);
    setForm({
      rule_name: r.rule_name,
      match_type: r.match_type,
      keywords: (r.keywords || []).join(", "),
      reply_template: r.reply_template || "",
      priority: r.priority,
      is_active: r.is_active,
      ai_fallback: r.ai_fallback,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.rule_name.trim()) {
      toast.error("Rule name required");
      return;
    }
    if (form.match_type === "keyword" && !form.keywords.trim()) {
      toast.error("Add at least one keyword");
      return;
    }
    if (form.match_type !== "ai" && !form.reply_template.trim()) {
      toast.error("Reply template required");
      return;
    }
    const payload = {
      rule_name: form.rule_name.trim(),
      match_type: form.match_type,
      keywords: form.keywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
      reply_template: form.match_type === "ai" ? null : form.reply_template.trim(),
      priority: Number(form.priority) || 100,
      is_active: form.is_active,
      ai_fallback: form.ai_fallback,
    };
    const { error } = editingId
      ? await supabase.from("dealer_reply_flows").update(payload).eq("id", editingId)
      : await supabase.from("dealer_reply_flows").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? "Rule updated" : "Rule created");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["dealer-reply-flows"] });
  };

  const toggle = async (r: FlowRule) => {
    await supabase.from("dealer_reply_flows").update({ is_active: !r.is_active }).eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["dealer-reply-flows"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await supabase.from("dealer_reply_flows").delete().eq("id", id);
    toast.success("Rule deleted");
    qc.invalidateQueries({ queryKey: ["dealer-reply-flows"] });
  };

  const move = async (r: FlowRule, dir: -1 | 1) => {
    const newP = Math.max(1, r.priority + dir * 10);
    await supabase.from("dealer_reply_flows").update({ priority: newP }).eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["dealer-reply-flows"] });
  };

  return (
    <div className="space-y-4">
      {/* Master toggle */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Auto-Reply System</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dealer reply aate hi rules check honge (priority order me). Match na ho to AI fallback (agar enabled) reply karega.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{globalAi ? "AI ON" : "AI OFF"}</span>
            <Switch checked={globalAi} onCheckedChange={setGlobalAi} />
          </div>
        </CardContent>
      </Card>

      {/* Rules list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Reply Rules ({rules.length})
          </CardTitle>
          <Button size="sm" onClick={openNew} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> New Rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!isLoading && rules.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No rules yet. Click <b>+ New Rule</b> to add one.
            </p>
          )}
          {rules.map((r, idx) => (
            <div
              key={r.id}
              className={`p-3 rounded-lg border transition-colors ${
                r.is_active ? "bg-card hover:bg-muted/30" : "bg-muted/40 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-0.5">
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => move(r, -1)} disabled={idx === 0}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 justify-center">{r.priority}</Badge>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => move(r, 1)} disabled={idx === rules.length - 1}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{r.rule_name}</p>
                    <Badge variant={r.match_type === "ai" ? "default" : "secondary"} className="text-[9px]">
                      {r.match_type === "ai" ? "🤖 AI" : r.match_type === "regex" ? "regex" : "keyword"}
                    </Badge>
                    {r.ai_fallback && <Badge variant="outline" className="text-[9px]">AI fallback</Badge>}
                    {r.trigger_count > 0 && (
                      <Badge variant="outline" className="text-[9px]">
                        🔥 {r.trigger_count} triggers
                      </Badge>
                    )}
                  </div>
                  {r.keywords.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {r.keywords.slice(0, 8).map((k) => (
                        <Badge key={k} variant="outline" className="text-[9px] font-normal">{k}</Badge>
                      ))}
                      {r.keywords.length > 8 && (
                        <span className="text-[10px] text-muted-foreground">+{r.keywords.length - 8} more</span>
                      )}
                    </div>
                  )}
                  {r.reply_template && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">
                      ↳ {r.reply_template}
                    </p>
                  )}
                  {r.last_triggered_at && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Last: {format(new Date(r.last_triggered_at), "dd MMM, hh:mm a")}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Editor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Reply Rule" : "New Reply Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Rule Name *</Label>
              <Input
                placeholder="e.g. Dealer says YES"
                value={form.rule_name}
                onChange={(e) => setForm({ ...form, rule_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Match Type</Label>
                <Select
                  value={form.match_type}
                  onValueChange={(v) => setForm({ ...form, match_type: v as FlowRule["match_type"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Keyword (any match)</SelectItem>
                    <SelectItem value="regex">Regex (advanced)</SelectItem>
                    <SelectItem value="ai">🤖 AI Auto-Generate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority (lower = first)</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                />
              </div>
            </div>
            {form.match_type !== "ai" && (
              <div>
                <Label className="text-xs">Keywords (comma-separated)</Label>
                <Input
                  placeholder="yes, haan, available, ready, stock"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Case-insensitive, matches if dealer's reply contains ANY of these words.
                </p>
              </div>
            )}
            {form.match_type !== "ai" && (
              <div>
                <Label className="text-xs">Reply Template *</Label>
                <Textarea
                  rows={4}
                  placeholder="Bhai zabardast! Apna best on-road price + delivery date bhej do."
                  value={form.reply_template}
                  onChange={(e) => setForm({ ...form, reply_template: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Variables: <code>{"{rep_name}"}</code> <code>{"{dealer_name}"}</code> <code>{"{brand}"}</code> <code>{"{model}"}</code> <code>{"{variant}"}</code>
                </p>
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-xs font-medium">AI Fallback</p>
                <p className="text-[10px] text-muted-foreground">
                  If this rule matches but reply feels off, also let AI craft a smart response.
                </p>
              </div>
              <Switch checked={form.ai_fallback} onCheckedChange={(v) => setForm({ ...form, ai_fallback: v })} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Power className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium">Active</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editingId ? "Update Rule" : "Create Rule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
