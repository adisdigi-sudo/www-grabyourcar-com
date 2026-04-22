import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { CHANNELS, VERTICALS, fmt, calcExpectedOutcome } from "./channelDefaults";

export const PlanBudgetTab = () => {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [showAlloc, setShowAlloc] = useState(false);
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [newBudget, setNewBudget] = useState<any>({
    budget_name: `Marketing Budget ${format(new Date(), "MMM yyyy")}`,
    period_start: format(new Date(), "yyyy-MM-01"),
    period_end: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd"),
    total_budget: "",
  });
  const [allocForm, setAllocForm] = useState<any>({ channel: "", allocated_amount: "", target_vertical: "" });

  const { data: budgets = [] } = useQuery({
    queryKey: ["marketing-budgets"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("marketing_budgets").select("*").order("period_start", { ascending: false });
      return data || [];
    },
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["budget-allocations", activeBudgetId],
    queryFn: async () => {
      if (!activeBudgetId) return [];
      const { data } = await (supabase.from as any)("budget_allocations").select("*").eq("budget_id", activeBudgetId).order("created_at");
      return data || [];
    },
    enabled: !!activeBudgetId,
  });

  const createBudget = useMutation({
    mutationFn: async (b: any) => {
      const { data, error } = await (supabase.from as any)("marketing_budgets").insert({
        ...b,
        total_budget: Number(b.total_budget),
        status: "active",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["marketing-budgets"] });
      toast.success("Budget plan created");
      setShowNew(false);
      setActiveBudgetId(d.id);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addAlloc = useMutation({
    mutationFn: async (a: any) => {
      const ch = CHANNELS.find(c => c.value === a.channel);
      const out = calcExpectedOutcome(a.channel, Number(a.allocated_amount), a.target_vertical);
      const { error } = await (supabase.from as any)("budget_allocations").insert({
        budget_id: activeBudgetId,
        channel: a.channel,
        channel_label: ch?.label,
        allocated_amount: Number(a.allocated_amount),
        target_vertical: a.target_vertical || null,
        expected_volume: out.volume,
        expected_leads: out.leads,
        expected_closures: out.closures,
        expected_revenue: out.revenue,
        cost_per_message: ch?.costPerUnit,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-allocations", activeBudgetId] });
      toast.success("Allocation added");
      setShowAlloc(false);
      setAllocForm({ channel: "", allocated_amount: "", target_vertical: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delAlloc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("budget_allocations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget-allocations", activeBudgetId] }),
  });

  const activeBudget = budgets.find((b: any) => b.id === activeBudgetId) || budgets[0];
  const totalAllocated = allocations.reduce((s: number, a: any) => s + Number(a.allocated_amount || 0), 0);
  const totalExpRevenue = allocations.reduce((s: number, a: any) => s + Number(a.expected_revenue || 0), 0);
  const totalExpLeads = allocations.reduce((s: number, a: any) => s + Number(a.expected_leads || 0), 0);
  const totalExpClosures = allocations.reduce((s: number, a: any) => s + Number(a.expected_closures || 0), 0);
  const remaining = activeBudget ? Number(activeBudget.total_budget) - totalAllocated : 0;
  const expectedROI = activeBudget && Number(activeBudget.total_budget) > 0 ? totalExpRevenue / Number(activeBudget.total_budget) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={activeBudgetId || activeBudget?.id || ""} onValueChange={setActiveBudgetId}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select a budget plan" /></SelectTrigger>
            <SelectContent>
              {budgets.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.budget_name} · {fmt(b.total_budget)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2"><Plus className="h-4 w-4" /> New Budget</Button>
      </div>

      {activeBudget ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Total Budget</p><p className="text-lg font-bold">{fmt(activeBudget.total_budget)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Allocated</p><p className="text-lg font-bold text-blue-600">{fmt(totalAllocated)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Remaining</p><p className={`text-lg font-bold ${remaining < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(remaining)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Expected Revenue</p><p className="text-lg font-bold text-emerald-600">{fmt(totalExpRevenue)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Expected ROI</p><p className="text-lg font-bold text-primary">{expectedROI.toFixed(1)}x</p></CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Channel Allocations</h3>
                <Button size="sm" onClick={() => setShowAlloc(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Channel</Button>
              </div>
              {allocations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No allocations yet. Add channels to distribute budget.</p>
              ) : (
                <div className="space-y-2">
                  {allocations.map((a: any) => {
                    const ch = CHANNELS.find(c => c.value === a.channel);
                    const v = VERTICALS.find(x => x.value === a.target_vertical);
                    const pct = Number(activeBudget.total_budget) > 0 ? (Number(a.allocated_amount) / Number(activeBudget.total_budget)) * 100 : 0;
                    return (
                      <div key={a.id} className="rounded-lg border border-border p-3 bg-card/40">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{ch?.icon}</span>
                            <div>
                              <p className="text-sm font-semibold">{ch?.label || a.channel}</p>
                              <p className="text-[11px] text-muted-foreground">{v ? `→ ${v.label}` : "All verticals"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{fmt(a.allocated_amount)} ({pct.toFixed(0)}%)</Badge>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => delAlloc.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        <Progress value={pct} className="h-1.5 mb-2" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                          <div className="bg-muted/40 rounded p-1.5"><span className="text-muted-foreground">Volume:</span> <strong>{a.expected_volume?.toLocaleString("en-IN")} {ch?.unitName}s</strong></div>
                          <div className="bg-muted/40 rounded p-1.5"><span className="text-muted-foreground">Leads:</span> <strong>{a.expected_leads}</strong></div>
                          <div className="bg-muted/40 rounded p-1.5"><span className="text-muted-foreground">Closures:</span> <strong>{a.expected_closures}</strong></div>
                          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded p-1.5"><span className="text-muted-foreground">Revenue:</span> <strong className="text-emerald-700 dark:text-emerald-400">{fmt(a.expected_revenue)}</strong></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {totalExpClosures > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded p-2">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Forecast: <strong className="text-foreground">{totalExpLeads} leads</strong> → <strong className="text-foreground">{totalExpClosures} closures</strong> → <strong className="text-emerald-600">{fmt(totalExpRevenue)} revenue</strong> (ROI {expectedROI.toFixed(1)}x)
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No budget plans yet</p>
          <p className="text-xs">Click "New Budget" to start planning your marketing spend</p>
        </CardContent></Card>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Marketing Budget</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Budget Name</Label><Input value={newBudget.budget_name} onChange={e => setNewBudget((p: any) => ({ ...p, budget_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Period Start</Label><Input type="date" value={newBudget.period_start} onChange={e => setNewBudget((p: any) => ({ ...p, period_start: e.target.value }))} /></div>
              <div><Label>Period End</Label><Input type="date" value={newBudget.period_end} onChange={e => setNewBudget((p: any) => ({ ...p, period_end: e.target.value }))} /></div>
            </div>
            <div><Label>Total Budget (₹)</Label><Input type="number" placeholder="e.g. 15000" value={newBudget.total_budget} onChange={e => setNewBudget((p: any) => ({ ...p, total_budget: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={() => createBudget.mutate(newBudget)} disabled={!newBudget.total_budget}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAlloc} onOpenChange={setShowAlloc}>
        <DialogContent>
          <DialogHeader><DialogTitle>Allocate to Channel</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Channel *</Label>
              <Select value={allocForm.channel} onValueChange={v => setAllocForm((p: any) => ({ ...p, channel: v }))}>
                <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Amount (₹) *</Label><Input type="number" placeholder="e.g. 5000" value={allocForm.allocated_amount} onChange={e => setAllocForm((p: any) => ({ ...p, allocated_amount: e.target.value }))} /></div>
            <div><Label>Target Vertical (optional)</Label>
              <Select value={allocForm.target_vertical} onValueChange={v => setAllocForm((p: any) => ({ ...p, target_vertical: v }))}>
                <SelectTrigger><SelectValue placeholder="All verticals" /></SelectTrigger>
                <SelectContent>{VERTICALS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {allocForm.channel && allocForm.allocated_amount && (() => {
              const out = calcExpectedOutcome(allocForm.channel, Number(allocForm.allocated_amount), allocForm.target_vertical);
              const ch = CHANNELS.find(c => c.value === allocForm.channel);
              return (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs space-y-1">
                  <p className="font-semibold flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> AI Forecast</p>
                  <p>• Volume: <strong>{out.volume.toLocaleString("en-IN")} {ch?.unitName}s</strong></p>
                  <p>• Expected leads: <strong>{out.leads}</strong></p>
                  <p>• Expected closures: <strong>{out.closures}</strong></p>
                  <p>• Expected revenue: <strong className="text-emerald-600">{fmt(out.revenue)}</strong></p>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlloc(false)}>Cancel</Button>
            <Button onClick={() => addAlloc.mutate(allocForm)} disabled={!allocForm.channel || !allocForm.allocated_amount}>Allocate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
