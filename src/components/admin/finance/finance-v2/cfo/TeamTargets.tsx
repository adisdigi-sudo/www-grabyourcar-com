import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Loader2, FileDown, Image as ImageIcon } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { SectionCard } from "../shared/SectionCard";
import { fmt, VERTICALS } from "../../corporate-budget/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const VERTICAL_KEYS = VERTICALS.filter((v) => v !== "All");

interface TargetForm {
  id?: string;
  vertical_name: string;
  period_type: string;
  month_year: string;
  target_revenue: number;
  target_leads: number;
  target_closures: number;
}

const blank = (): TargetForm => ({
  vertical_name: "Insurance",
  period_type: "monthly",
  month_year: format(new Date(), "yyyy-MM"),
  target_revenue: 0,
  target_leads: 0,
  target_closures: 0,
});

export const TeamTargets = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TargetForm | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<string>(format(new Date(), "yyyy-MM"));
  const tableRef = useRef<HTMLDivElement>(null);

  const downloadCSV = () => {
    const rows: string[] = [];
    rows.push(`"Team Targets","${filterPeriod}","Generated ${format(new Date(), "dd MMM yyyy, p")}"`);
    rows.push("");
    rows.push('"Vertical","Period","Target Revenue","Achieved Revenue","Revenue %","Target Leads","Achieved Leads","Target Closures","Achieved Closures"');
    for (const t of targets) {
      const pct = t.target_revenue > 0 ? Math.round((Number(t.achieved_revenue || 0) / Number(t.target_revenue)) * 100) : 0;
      rows.push([
        `"${t.vertical_name}"`, `"${t.period_type} ${t.month_year}"`,
        t.target_revenue || 0, t.achieved_revenue || 0, pct,
        t.target_leads || 0, t.achieved_leads || 0,
        t.target_closures || 0, t.achieved_closures || 0,
      ].join(","));
    }
    rows.push("");
    rows.push(`"TOTAL","",${totals.revenue},${totals.achieved},${totals.revenue > 0 ? Math.round((totals.achieved / totals.revenue) * 100) : 0},${totals.leads},${totals.leadsAch},${totals.closures},${totals.closuresAch}`);
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-targets-${filterPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const downloadPNG = async () => {
    if (!tableRef.current) return;
    try {
      const dataUrl = await toPng(tableRef.current, { backgroundColor: "#ffffff", pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `team-targets-${filterPeriod}.png`;
      a.click();
      toast.success("PNG exported");
    } catch {
      toast.error("PNG export failed");
    }
  };

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ["team-targets-cfo", filterPeriod],
    queryFn: async () => {
      const { data } = await (supabase.from("vertical_targets") as any)
        .select("*")
        .eq("month_year", filterPeriod)
        .order("vertical_name");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: TargetForm) => {
      if (!form.vertical_name) throw new Error("Vertical required");
      if (form.target_revenue <= 0) throw new Error("Target revenue must be positive");
      const payload = {
        vertical_name: form.vertical_name,
        period_type: form.period_type,
        month_year: form.month_year,
        target_revenue: form.target_revenue,
        target_leads: form.target_leads,
        target_closures: form.target_closures,
      };
      if (form.id) {
        const { error } = await (supabase.from("vertical_targets") as any)
          .update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("vertical_targets") as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Target saved");
      qc.invalidateQueries({ queryKey: ["team-targets-cfo"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("vertical_targets") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Target removed");
      qc.invalidateQueries({ queryKey: ["team-targets-cfo"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete"),
  });

  const totals = useMemo(() => {
    const t = { revenue: 0, achieved: 0, leads: 0, leadsAch: 0, closures: 0, closuresAch: 0 };
    for (const r of targets) {
      t.revenue += Number(r.target_revenue || 0);
      t.achieved += Number(r.achieved_revenue || 0);
      t.leads += Number(r.target_leads || 0);
      t.leadsAch += Number(r.achieved_leads || 0);
      t.closures += Number(r.target_closures || 0);
      t.closuresAch += Number(r.achieved_closures || 0);
    }
    return t;
  }, [targets]);

  return (
    <SectionCard
      title="Team Targets"
      description="Vertical-wise revenue, leads & conversion goals with progress tracking"
      icon={Target}
      className="lg:col-span-3"
      action={
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="h-8 text-xs w-36"
          />
          <Button size="sm" className="gap-1 bg-slate-900 hover:bg-slate-800"
            onClick={() => setEditing({ ...blank(), month_year: filterPeriod })}>
            <Plus className="h-3.5 w-3.5" /> Set Target
          </Button>
        </div>
      }
    >
      {/* Aggregate strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Revenue", t: totals.revenue, a: totals.achieved, money: true },
          { label: "Leads", t: totals.leads, a: totals.leadsAch, money: false },
          { label: "Closures", t: totals.closures, a: totals.closuresAch, money: false },
        ].map((s) => {
          const pct = s.t > 0 ? Math.min(100, Math.round((s.a / s.t) * 100)) : 0;
          return (
            <div key={s.label} className="rounded-lg border bg-slate-50/50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</p>
                {pct >= 80 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-amber-600" />}
              </div>
              <p className="text-base font-serif font-semibold mt-1 tabular-nums">
                {s.money ? fmt(s.a) : s.a.toLocaleString()}
                <span className="text-slate-400 font-normal text-xs"> / {s.money ? fmt(s.t) : s.t.toLocaleString()}</span>
              </p>
              <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all",
                  pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500")}
                  style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{pct}% achieved</p>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-slate-500">Loading…</div>
      ) : targets.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">
          No targets set for {filterPeriod}. Click <strong>Set Target</strong> to add one.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            <div className="col-span-3">Vertical</div>
            <div className="col-span-2">Period</div>
            <div className="col-span-3">Revenue Progress</div>
            <div className="col-span-1 text-right">Leads</div>
            <div className="col-span-1 text-right">Closures</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y">
            {targets.map((t: any) => {
              const pct = t.target_revenue > 0
                ? Math.min(100, Math.round((Number(t.achieved_revenue || 0) / Number(t.target_revenue)) * 100))
                : 0;
              return (
                <div key={t.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center bg-white hover:bg-slate-50/50">
                  <div className="col-span-3 text-sm font-medium text-slate-900 capitalize">{t.vertical_name}</div>
                  <div className="col-span-2 text-xs text-slate-600 capitalize">{t.period_type} · {t.month_year}</div>
                  <div className="col-span-3">
                    <p className="text-xs tabular-nums">{fmt(t.achieved_revenue || 0)} / {fmt(t.target_revenue)}</p>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn("h-full",
                        pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500")}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="col-span-1 text-right text-xs tabular-nums">
                    {(t.achieved_leads || 0)}/{t.target_leads || 0}
                  </div>
                  <div className="col-span-1 text-right text-xs tabular-nums">
                    {(t.achieved_closures || 0)}/{t.target_closures || 0}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setEditing({
                        id: t.id,
                        vertical_name: t.vertical_name,
                        period_type: t.period_type,
                        month_year: t.month_year,
                        target_revenue: Number(t.target_revenue || 0),
                        target_leads: Number(t.target_leads || 0),
                        target_closures: Number(t.target_closures || 0),
                      })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => {
                        if (confirm(`Remove target for ${t.vertical_name}?`)) deleteMutation.mutate(t.id);
                      }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing?.id ? "Edit Target" : "Set New Target"}</DialogTitle>
            <DialogDescription className="text-xs">
              Configure revenue, leads and closure goals per vertical
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Vertical</Label>
                  <Select value={editing.vertical_name}
                    onValueChange={(v) => setEditing({ ...editing, vertical_name: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VERTICAL_KEYS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Period</Label>
                  <Select value={editing.period_type}
                    onValueChange={(v) => setEditing({ ...editing, period_type: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Month</Label>
                <Input type="month" value={editing.month_year}
                  onChange={(e) => setEditing({ ...editing, month_year: e.target.value })}
                  className="mt-1.5" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Revenue (₹) *</Label>
                  <Input type="number" min={0} value={editing.target_revenue || ""}
                    onChange={(e) => setEditing({ ...editing, target_revenue: Number(e.target.value) || 0 })}
                    className="mt-1.5 tabular-nums" />
                </div>
                <div>
                  <Label className="text-xs">Leads</Label>
                  <Input type="number" min={0} value={editing.target_leads || ""}
                    onChange={(e) => setEditing({ ...editing, target_leads: Number(e.target.value) || 0 })}
                    className="mt-1.5 tabular-nums" />
                </div>
                <div>
                  <Label className="text-xs">Closures</Label>
                  <Input type="number" min={0} value={editing.target_closures || ""}
                    onChange={(e) => setEditing({ ...editing, target_closures: Number(e.target.value) || 0 })}
                    className="mt-1.5 tabular-nums" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saveMutation.isPending}>Cancel</Button>
            <Button className="bg-slate-900 hover:bg-slate-800"
              onClick={() => editing && saveMutation.mutate(editing)}
              disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
};

export default TeamTargets;
