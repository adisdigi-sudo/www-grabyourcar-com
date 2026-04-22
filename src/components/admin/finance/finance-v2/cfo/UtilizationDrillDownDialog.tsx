import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, Layers, TrendingUp, TrendingDown } from "lucide-react";
import { format, startOfMonth, endOfMonth, parse } from "date-fns";
import { fmt } from "../../corporate-budget/types";
import { cn } from "@/lib/utils";
import { buildExportFilename } from "../shared/exportNaming";
import { toast } from "sonner";

export interface DrillContext {
  mode: "vertical" | "month";
  /** when mode=vertical: the vertical name; when mode=month: a "MMM yy" label */
  key: string;
  granularityLabel: string;
  /** ISO yyyy-mm-dd; window in which we should look */
  rangeStart: string;
  rangeEnd: string;
  planned: number;
  actual: number;
}

interface Props {
  context: DrillContext | null;
  onClose: () => void;
}

export const UtilizationDrillDownDialog = ({ context, onClose }: Props) => {
  const open = !!context;

  // Resolve the actual filtering window
  const window = (() => {
    if (!context) return { start: "", end: "" };
    if (context.mode === "month") {
      const d = parse(context.key, "MMM yy", new Date());
      return {
        start: format(startOfMonth(d), "yyyy-MM-dd"),
        end: format(endOfMonth(d), "yyyy-MM-dd"),
      };
    }
    return { start: context.rangeStart, end: context.rangeEnd };
  })();

  const { data: budgetLines = [] } = useQuery({
    queryKey: ["util-drill-budget-lines", context?.mode, context?.key, window.start, window.end],
    enabled: open,
    queryFn: async () => {
      let q = (supabase.from("corporate_budget_lines") as any)
        .select("id, category_name, planned_amount, actual_amount, vertical, department, notes, corporate_budgets!inner(id, title, period_start, period_end, status)")
        .gte("corporate_budgets.period_start", window.start)
        .lte("corporate_budgets.period_start", window.end);
      if (context?.mode === "vertical") q = q.eq("vertical", context.key);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["util-drill-expenses", context?.mode, context?.key, window.start, window.end],
    enabled: open,
    queryFn: async () => {
      let q = (supabase.from("expenses") as any)
        .select("id, expense_date, amount, vertical_name, expense_type, vendor_name, description")
        .gte("expense_date", window.start)
        .lte("expense_date", window.end)
        .order("expense_date", { ascending: false });
      if (context?.mode === "vertical") q = q.ilike("vertical_name", context.key);
      const { data } = await q;
      return data || [];
    },
  });

  const variance = (context?.planned ?? 0) - (context?.actual ?? 0);
  const util = context && context.planned > 0
    ? Math.round((context.actual / context.planned) * 100) : 0;

  const downloadCSV = () => {
    if (!context) return;
    const rows: string[] = [];
    rows.push(`"Utilization drill-down","${context.mode === "vertical" ? "Vertical" : "Month"}: ${context.key}","Window: ${window.start} → ${window.end}"`);
    rows.push("");
    rows.push('"Section","Date / Period","Reference","Vertical","Planned","Actual","Notes"');
    for (const l of budgetLines as any[]) {
      const meta = l.corporate_budgets || {};
      rows.push([
        '"Budget Line"',
        `"${meta.period_start || ""} → ${meta.period_end || ""}"`,
        `"${(l.category_name || "—").replace(/"/g, '""')}"`,
        `"${l.vertical || "—"}"`,
        Number(l.planned_amount || 0),
        Number(l.actual_amount || 0),
        `"${(l.notes || meta.title || "").replace(/"/g, '""')}"`,
      ].join(","));
    }
    for (const e of expenses as any[]) {
      rows.push([
        '"Expense"',
        `"${e.expense_date || ""}"`,
        `"${(e.expense_type || e.vendor_name || "—").replace(/"/g, '""')}"`,
        `"${e.vertical_name || "—"}"`,
        0,
        Number(e.amount || 0),
        `"${(e.description || "").replace(/"/g, '""')}"`,
      ].join(","));
    }
    rows.push("");
    rows.push(`"TOTAL","","","",${context.planned},${context.actual},""`);

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildExportFilename({
      module: "utilization-drilldown",
      scope: `${context.mode}-${context.key}`,
      period: context.granularityLabel,
      ext: "csv",
    });
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Drill-down exported");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="font-serif text-lg">
                {context?.mode === "vertical" ? "Vertical" : "Month"}: {context?.key}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {context?.granularityLabel} · window {window.start} → {window.end}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {context && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-slate-50/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Planned</p>
                <p className="text-base font-serif font-semibold tabular-nums mt-1">{fmt(context.planned)}</p>
              </div>
              <div className="rounded-lg border bg-slate-50/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Actual</p>
                <p className="text-base font-serif font-semibold tabular-nums mt-1">{fmt(context.actual)}</p>
              </div>
              <div className="rounded-lg border bg-slate-50/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  {variance >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />}
                  Variance
                </p>
                <p className={cn("text-base font-serif font-semibold tabular-nums mt-1",
                  variance >= 0 ? "text-emerald-700" : "text-red-700")}>
                  {variance >= 0 ? "+" : "−"}{fmt(Math.abs(variance))}
                </p>
              </div>
              <div className="rounded-lg border bg-slate-50/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Utilization</p>
                <p className={cn("text-base font-serif font-semibold tabular-nums mt-1",
                  util > 100 ? "text-red-700" : util >= 80 ? "text-amber-700" : "text-emerald-700")}>
                  {util}%
                </p>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Planned Budget Lines</h4>
                <Badge variant="outline" className="text-[10px]">{budgetLines.length}</Badge>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  <div className="col-span-4">Category</div>
                  <div className="col-span-3">Plan / Period</div>
                  <div className="col-span-2 text-right">Planned</div>
                  <div className="col-span-2 text-right">Actual</div>
                  <div className="col-span-1 text-right">Used</div>
                </div>
                <div className="divide-y max-h-56 overflow-y-auto">
                  {budgetLines.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-500">No planned lines for this slice.</div>
                  ) : (budgetLines as any[]).map((l) => {
                    const meta = l.corporate_budgets || {};
                    const planned = Number(l.planned_amount || 0);
                    const actual = Number(l.actual_amount || 0);
                    const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
                    return (
                      <div key={l.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs items-center bg-white">
                        <div className="col-span-4">
                          <p className="font-medium text-slate-900 truncate">{l.category_name || "—"}</p>
                          <p className="text-[10px] text-slate-500 truncate">{l.vertical || "—"} · {l.department || "All"}</p>
                        </div>
                        <div className="col-span-3 text-[11px] text-slate-600 truncate">
                          {meta.title || "—"}
                          <p className="text-[10px] text-slate-400">{meta.period_start} → {meta.period_end}</p>
                        </div>
                        <div className="col-span-2 text-right tabular-nums font-semibold">{fmt(planned)}</div>
                        <div className="col-span-2 text-right tabular-nums">{fmt(actual)}</div>
                        <div className={cn("col-span-1 text-right text-[11px] tabular-nums",
                          pct > 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "text-emerald-600")}>
                          {pct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Recorded Expenses (Actual)</h4>
                <Badge variant="outline" className="text-[10px]">{expenses.length}</Badge>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  <div className="col-span-3">Date</div>
                  <div className="col-span-4">Vendor / Type</div>
                  <div className="col-span-3">Vertical</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                <div className="divide-y max-h-56 overflow-y-auto">
                  {expenses.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-500">No expenses recorded for this slice.</div>
                  ) : (expenses as any[]).map((e) => (
                    <div key={e.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs items-center bg-white">
                      <div className="col-span-3 tabular-nums">{e.expense_date}</div>
                      <div className="col-span-4 truncate">
                        <p className="font-medium text-slate-900 truncate">{e.vendor_name || e.expense_type || "—"}</p>
                        {e.description && <p className="text-[10px] text-slate-500 truncate">{e.description}</p>}
                      </div>
                      <div className="col-span-3 text-slate-600 capitalize truncate">{e.vertical_name || "—"}</div>
                      <div className="col-span-2 text-right tabular-nums font-semibold">{fmt(e.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        <DialogFooter className="border-t pt-3 gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button className="bg-slate-900 hover:bg-slate-800 gap-1" onClick={downloadCSV}>
            <FileDown className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UtilizationDrillDownDialog;
