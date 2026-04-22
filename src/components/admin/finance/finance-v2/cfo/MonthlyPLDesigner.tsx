import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet, FileDown, Plus, Trash2, ArrowRight, TrendingUp, TrendingDown, AlertCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fmt, VERTICALS } from "../../corporate-budget/types";
import { cn } from "@/lib/utils";

interface PLLine {
  id: string;
  category: string;
  amount: number;
  type: "revenue" | "expense";
  vertical: string;
  notes?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_REVENUE_BUCKETS = ["Insurance Premiums", "Car Sales", "Loan Commissions", "HSRP Fees", "Rentals", "Accessories Sales", "Other Income"];
const DEFAULT_EXPENSE_BUCKETS = ["Salaries & HR", "Marketing & Ads", "Office Rent", "Tech & Tools", "Travel", "Professional Fees", "Utilities", "Other Expenses"];

const newLine = (type: "revenue" | "expense"): PLLine => ({
  id: crypto.randomUUID(),
  category: "",
  amount: 0,
  type,
  vertical: "All",
  notes: "",
});

interface LineErrors {
  category?: string;
  amount?: string;
}

export const MonthlyPLDesigner = ({ open, onClose }: Props) => {
  const [monthYear, setMonthYear] = useState(format(new Date(), "yyyy-MM"));
  const [revenueLines, setRevenueLines] = useState<PLLine[]>(
    DEFAULT_REVENUE_BUCKETS.map((c) => ({ ...newLine("revenue"), category: c }))
  );
  const [expenseLines, setExpenseLines] = useState<PLLine[]>(
    DEFAULT_EXPENSE_BUCKETS.map((c) => ({ ...newLine("expense"), category: c }))
  );
  const [autoFilling, setAutoFilling] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const periodStart = format(startOfMonth(new Date(monthYear + "-01")), "yyyy-MM-dd");
  const periodEnd = format(endOfMonth(new Date(monthYear + "-01")), "yyyy-MM-dd");

  const { data: liveActuals } = useQuery({
    queryKey: ["pl-live-actuals", monthYear],
    enabled: open,
    queryFn: async () => {
      const [exp, inv, plEntries] = await Promise.all([
        (supabase.from("expenses") as any)
          .select("amount, vertical_name, expense_type")
          .gte("expense_date", periodStart).lte("expense_date", periodEnd),
        (supabase.from("invoices") as any)
          .select("total_amount, vertical_name")
          .eq("status", "paid")
          .gte("created_at", periodStart).lte("created_at", periodEnd + "T23:59:59"),
        (supabase.from("vertical_pl_entries") as any)
          .select("vertical_slug, gross_revenue, profit, cost_of_service")
          .eq("month_year", monthYear),
      ]);
      return {
        expenses: exp.data || [],
        invoices: inv.data || [],
        plEntries: plEntries.data || [],
      };
    },
  });

  const totalRevenue = useMemo(() => revenueLines.reduce((s, l) => s + Number(l.amount || 0), 0), [revenueLines]);
  const totalExpense = useMemo(() => expenseLines.reduce((s, l) => s + Number(l.amount || 0), 0), [expenseLines]);
  const netProfit = totalRevenue - totalExpense;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // ---- VALIDATION ----
  // A line is "active" if it has any data entered (category OR amount). Empty default rows are ignored.
  const validateLine = (l: PLLine): LineErrors => {
    const errs: LineErrors = {};
    const hasCategory = l.category.trim().length > 0;
    const hasAmount = Number(l.amount) > 0;
    if (hasAmount && !hasCategory) errs.category = "Category is required when an amount is set";
    if (hasCategory && !hasAmount) errs.amount = "Amount must be greater than 0";
    return errs;
  };

  const revenueErrors = useMemo(() => revenueLines.map(validateLine), [revenueLines]);
  const expenseErrors = useMemo(() => expenseLines.map(validateLine), [expenseLines]);

  const validRevenueLines = useMemo(
    () => revenueLines.filter((l) => l.category.trim() && Number(l.amount) > 0),
    [revenueLines]
  );
  const validExpenseLines = useMemo(
    () => expenseLines.filter((l) => l.category.trim() && Number(l.amount) > 0),
    [expenseLines]
  );

  const lineErrorCount =
    revenueErrors.filter((e) => e.category || e.amount).length +
    expenseErrors.filter((e) => e.category || e.amount).length;

  const validationIssues: string[] = [];
  if (validRevenueLines.length === 0 && validExpenseLines.length === 0) {
    validationIssues.push("Add at least one revenue or expense allocation with a category and amount.");
  }
  if (lineErrorCount > 0) {
    validationIssues.push(`${lineErrorCount} ${lineErrorCount === 1 ? "row has" : "rows have"} a missing category or amount. Complete or remove them.`);
  }
  // Duplicate category check within same section
  const dupRev = new Set<string>();
  const dupExp = new Set<string>();
  const seenRev = new Set<string>();
  const seenExp = new Set<string>();
  for (const l of validRevenueLines) {
    const k = l.category.trim().toLowerCase();
    if (seenRev.has(k)) dupRev.add(k); else seenRev.add(k);
  }
  for (const l of validExpenseLines) {
    const k = l.category.trim().toLowerCase();
    if (seenExp.has(k)) dupExp.add(k); else seenExp.add(k);
  }
  if (dupRev.size + dupExp.size > 0) {
    validationIssues.push("Duplicate categories detected in the same section — please consolidate.");
  }

  const canExport = validationIssues.length === 0;

  const autoFillFromLive = () => {
    if (!liveActuals) return;
    setAutoFilling(true);

    const revenueByVertical: Record<string, number> = {};
    for (const inv of liveActuals.invoices) {
      const v = (inv.vertical_name || "Other").toString();
      revenueByVertical[v] = (revenueByVertical[v] || 0) + Number(inv.total_amount || 0);
    }
    for (const p of liveActuals.plEntries) {
      const v = (p.vertical_slug || "other").toString();
      revenueByVertical[v] = (revenueByVertical[v] || 0) + Number(p.gross_revenue || 0);
    }

    setRevenueLines((prev) => prev.map((l) => {
      const matchKey = Object.keys(revenueByVertical).find(
        (k) => l.category.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(l.category.toLowerCase().split(" ")[0])
      );
      if (matchKey) return { ...l, amount: Math.round(revenueByVertical[matchKey]) };
      return l;
    }));

    const expenseByType: Record<string, number> = {};
    for (const e of liveActuals.expenses) {
      const t = (e.expense_type || "Other").toString();
      expenseByType[t] = (expenseByType[t] || 0) + Number(e.amount || 0);
    }
    setExpenseLines((prev) => prev.map((l) => {
      const matchKey = Object.keys(expenseByType).find(
        (k) => l.category.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(l.category.toLowerCase().split(" ")[0])
      );
      if (matchKey) return { ...l, amount: Math.round(expenseByType[matchKey]) };
      return l;
    }));

    setAutoFilling(false);
    toast.success("Auto-filled from live data");
  };

  const updateLine = (type: "revenue" | "expense", id: string, patch: Partial<PLLine>) => {
    if (type === "revenue") setRevenueLines((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    else setExpenseLines((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (type: "revenue" | "expense", id: string) => {
    if (type === "revenue") setRevenueLines((p) => p.filter((l) => l.id !== id));
    else setExpenseLines((p) => p.filter((l) => l.id !== id));
  };

  const guard = (fn: () => void) => () => {
    if (!canExport) {
      setShowErrors(true);
      toast.error(validationIssues[0] || "Fix validation errors before downloading.");
      return;
    }
    fn();
  };

  const downloadCSV = () => {
    const rows: string[] = [];
    rows.push(`"Monthly P&L Statement","${monthYear}"`);
    rows.push("");
    rows.push('"Section","Category","Vertical","Amount (INR)","Notes"');
    for (const l of validRevenueLines)
      rows.push(`"Revenue","${l.category}","${l.vertical}",${l.amount},"${l.notes || ""}"`);
    rows.push(`"","Total Revenue","",${totalRevenue},""`);
    rows.push("");
    for (const l of validExpenseLines)
      rows.push(`"Expense","${l.category}","${l.vertical}",${l.amount},"${l.notes || ""}"`);
    rows.push(`"","Total Expenses","",${totalExpense},""`);
    rows.push("");
    rows.push(`"","Net Profit","",${netProfit},"${margin.toFixed(2)}% margin"`);

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PnL-${monthYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("P&L downloaded");
  };

  const downloadHTML = () => {
    const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>P&L ${monthYear}</title>
<style>
body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:24px;color:#0f172a}
h1{font-size:22px;margin:0 0 4px;border-bottom:2px solid #0f172a;padding-bottom:8px}
h2{font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#475569;margin-top:24px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
table{width:100%;border-collapse:collapse;font-family:Arial;font-size:12px}
td,th{padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:left}
.amt{text-align:right;font-variant-numeric:tabular-nums}
.tot{font-weight:bold;background:#f8fafc}
.profit{font-size:18px;padding:12px;background:#0f172a;color:white;border-radius:6px;margin-top:16px;display:flex;justify-content:space-between}
.muted{color:#64748b;font-size:11px}
</style></head><body>
<h1>Profit &amp; Loss Statement</h1>
<p class="muted">Period: ${monthYear} · Generated ${format(new Date(), "dd MMM yyyy, p")}</p>
<h2>Revenue</h2>
<table><thead><tr><th>Category</th><th>Vertical</th><th class="amt">Amount</th></tr></thead><tbody>
${validRevenueLines.map((l) => `<tr><td>${l.category}</td><td>${l.vertical}</td><td class="amt">${fmt(l.amount)}</td></tr>`).join("")}
<tr class="tot"><td colspan="2">Total Revenue</td><td class="amt">${fmt(totalRevenue)}</td></tr>
</tbody></table>
<h2>Expenses</h2>
<table><thead><tr><th>Category</th><th>Vertical</th><th class="amt">Amount</th></tr></thead><tbody>
${validExpenseLines.map((l) => `<tr><td>${l.category}</td><td>${l.vertical}</td><td class="amt">${fmt(l.amount)}</td></tr>`).join("")}
<tr class="tot"><td colspan="2">Total Expenses</td><td class="amt">${fmt(totalExpense)}</td></tr>
</tbody></table>
<div class="profit"><span>Net ${netProfit >= 0 ? "Profit" : "Loss"}</span><span>${fmt(Math.abs(netProfit))} · ${margin.toFixed(1)}%</span></div>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 400);
    }
  };

  const renderLines = (lines: PLLine[], errors: LineErrors[], type: "revenue" | "expense") => (
    <div className="rounded-lg border overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        <div className="col-span-4">Category <span className="text-red-500">*</span></div>
        <div className="col-span-3">Vertical</div>
        <div className="col-span-2 text-right">Amount (₹) <span className="text-red-500">*</span></div>
        <div className="col-span-2">Notes</div>
        <div className="col-span-1"></div>
      </div>
      <div className="divide-y max-h-72 overflow-y-auto">
        {lines.map((l, idx) => {
          const err = errors[idx] || {};
          const showLineErr = showErrors && (err.category || err.amount);
          return (
            <div key={l.id} className={cn(
              "grid grid-cols-12 gap-2 px-3 py-2 items-center bg-white",
              showLineErr && "bg-red-50/40"
            )}>
              <div className="col-span-4">
                <Input className={cn("h-8 text-xs", showLineErr && err.category && "border-red-400 focus-visible:ring-red-300")}
                  value={l.category}
                  onChange={(e) => updateLine(type, l.id, { category: e.target.value })}
                  placeholder="Category" />
                {showLineErr && err.category && (
                  <p className="text-[10px] text-red-600 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="h-2.5 w-2.5" /> {err.category}
                  </p>
                )}
              </div>
              <Select value={l.vertical} onValueChange={(v) => updateLine(type, l.id, { vertical: v })}>
                <SelectTrigger className="col-span-3 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{VERTICALS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <div className="col-span-2">
                <Input className={cn("h-8 text-xs text-right tabular-nums", showLineErr && err.amount && "border-red-400 focus-visible:ring-red-300")}
                  type="number" min={0} value={l.amount || ""}
                  onChange={(e) => updateLine(type, l.id, { amount: Number(e.target.value) || 0 })}
                  placeholder="0" />
                {showLineErr && err.amount && (
                  <p className="text-[10px] text-red-600 mt-0.5 text-right flex items-center justify-end gap-1">
                    <AlertCircle className="h-2.5 w-2.5" /> {err.amount}
                  </p>
                )}
              </div>
              <Input className="col-span-2 h-8 text-xs"
                value={l.notes || ""}
                onChange={(e) => updateLine(type, l.id, { notes: e.target.value })}
                placeholder="—" />
              <Button size="icon" variant="ghost" className="col-span-1 h-8 w-8 justify-self-end text-slate-400 hover:text-red-600"
                onClick={() => removeLine(type, l.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 bg-slate-50 border-t flex items-center justify-between">
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
          onClick={() => type === "revenue"
            ? setRevenueLines((p) => [...p, newLine("revenue")])
            : setExpenseLines((p) => [...p, newLine("expense")])}>
          <Plus className="h-3 w-3" /> Add line
        </Button>
        <p className="text-xs font-semibold tabular-nums">
          Subtotal: {fmt(lines.reduce((s, l) => s + Number(l.amount || 0), 0))}
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-serif text-xl">Monthly P&L Designer</DialogTitle>
              <DialogDescription className="text-xs">
                Allocate revenue & expense buckets · auto-fill from live data · download report
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <Label className="text-xs">Reporting Month</Label>
              <Input type="month" value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                className="mt-1.5 w-44" />
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={autoFillFromLive} disabled={autoFilling || !liveActuals}>
              <ArrowRight className="h-3.5 w-3.5" /> Auto-fill from live data
            </Button>
          </div>

          {liveActuals && (
            <div className="grid grid-cols-3 gap-3 rounded-lg border bg-slate-50/50 p-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Live Invoices Paid</p>
                <p className="text-sm font-semibold mt-0.5">{liveActuals.invoices.length} · {fmt(liveActuals.invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0))}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Recorded Expenses</p>
                <p className="text-sm font-semibold mt-0.5">{liveActuals.expenses.length} · {fmt(liveActuals.expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0))}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Vertical P&L Entries</p>
                <p className="text-sm font-semibold mt-0.5">{liveActuals.plEntries.length}</p>
              </div>
            </div>
          )}

          {/* ---- Validation summary ---- */}
          {showErrors && validationIssues.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50/60 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <div className="text-xs text-red-800 space-y-0.5">
                  <p className="font-semibold">Cannot generate P&L — fix the following:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {validationIssues.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif font-semibold text-sm text-slate-900">Revenue</h3>
              <Badge variant="outline" className="text-[10px]">
                {validRevenueLines.length} active · {revenueLines.length} buckets
              </Badge>
            </div>
            {renderLines(revenueLines, revenueErrors, "revenue")}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif font-semibold text-sm text-slate-900">Expenses</h3>
              <Badge variant="outline" className="text-[10px]">
                {validExpenseLines.length} active · {expenseLines.length} buckets
              </Badge>
            </div>
            {renderLines(expenseLines, expenseErrors, "expense")}
          </section>

          <section className="rounded-xl border bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-300">Total Revenue</p>
                <p className="text-base font-bold mt-1 tabular-nums">{fmt(totalRevenue)}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-300">Total Expenses</p>
                <p className="text-base font-bold mt-1 tabular-nums">{fmt(totalExpense)}</p>
              </div>
              <div className={cn("rounded-lg p-3 border",
                netProfit >= 0 ? "bg-emerald-500/20 border-emerald-500/40" : "bg-red-500/20 border-red-500/40")}>
                <p className="text-[10px] uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  {netProfit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  Net {netProfit >= 0 ? "Profit" : "Loss"}
                </p>
                <p className="text-base font-bold mt-1 tabular-nums">{fmt(Math.abs(netProfit))}</p>
              </div>
              <div className="rounded-lg bg-amber-500/20 border border-amber-500/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-300">Margin</p>
                <p className="text-base font-bold mt-1 tabular-nums">{margin.toFixed(1)}%</p>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" className={cn("gap-1", !canExport && "opacity-60")} onClick={guard(downloadCSV)}>
            <FileDown className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button className={cn("gap-1 bg-slate-900 hover:bg-slate-800", !canExport && "opacity-60")} onClick={guard(downloadHTML)}>
            <FileDown className="h-3.5 w-3.5" /> Print / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyPLDesigner;
