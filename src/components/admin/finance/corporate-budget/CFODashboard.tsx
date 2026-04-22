import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
  Target,
  Activity,
} from "lucide-react";
import { fmt } from "./types";

/**
 * CFO-style live P&L dashboard.
 * Auto-calculates: Planned (from approved corporate budgets)
 *                  Actual Expenses (from `expenses` table)
 *                  Revenue (from `revenue_entries`)
 *                  Profit = Revenue − Expenses
 * Per-category variance vs budget. Crystal-clear breakdown.
 */
export const CFODashboard = () => {
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current
  const [verticalFilter, setVerticalFilter] = useState<string>("All");

  const targetMonth = useMemo(() => {
    const base = monthOffset >= 0
      ? addMonths(new Date(), monthOffset)
      : subMonths(new Date(), -monthOffset);
    return {
      start: startOfMonth(base),
      end: endOfMonth(base),
      label: format(base, "MMMM yyyy"),
      key: format(base, "yyyy-MM"),
    };
  }, [monthOffset]);

  // 1. Approved budgets covering this month
  const { data: budgetLines = [] } = useQuery({
    queryKey: ["cfo-budget-lines", targetMonth.key],
    queryFn: async () => {
      const { data: budgets } = await (supabase.from("corporate_budgets") as any)
        .select("id, status, period_start, period_end")
        .in("status", ["approved", "active"])
        .lte("period_start", format(targetMonth.end, "yyyy-MM-dd"))
        .gte("period_end", format(targetMonth.start, "yyyy-MM-dd"));
      const ids = (budgets || []).map((b: any) => b.id);
      if (!ids.length) return [];
      const { data: lines } = await (supabase.from("corporate_budget_lines") as any)
        .select("*")
        .in("budget_id", ids);
      return lines || [];
    },
  });

  // 2. Actual expenses for this month
  const { data: expenses = [] } = useQuery({
    queryKey: ["cfo-expenses", targetMonth.key],
    queryFn: async () => {
      const { data } = await (supabase.from("expenses") as any)
        .select("*")
        .eq("month_year", targetMonth.key);
      return data || [];
    },
  });

  // 3. Revenue for this month
  const { data: revenue = [] } = useQuery({
    queryKey: ["cfo-revenue", targetMonth.key],
    queryFn: async () => {
      const { data } = await (supabase.from("revenue_entries") as any)
        .select("*")
        .eq("month_year", targetMonth.key);
      return data || [];
    },
  });

  // 4. Vertical P&L entries (from closed deals)
  const { data: plEntries = [] } = useQuery({
    queryKey: ["cfo-pl", targetMonth.key],
    queryFn: async () => {
      const { data } = await (supabase.from("vertical_pl_entries") as any)
        .select("*")
        .eq("month_year", targetMonth.key);
      return data || [];
    },
  });

  // Build category breakdown
  const breakdown = useMemo(() => {
    // Map: categoryName -> { planned, actual, vertical }
    const map = new Map<string, {
      category: string;
      planned: number;
      actual: number;
      vertical: string;
    }>();

    // Planned from budget lines
    budgetLines.forEach((l: any) => {
      if (verticalFilter !== "All" && l.vertical !== "All" && l.vertical !== verticalFilter) return;
      const key = `${l.category_name}::${l.vertical || "All"}`;
      const existing = map.get(key) || {
        category: l.category_name,
        planned: 0,
        actual: 0,
        vertical: l.vertical || "All",
      };
      existing.planned += Number(l.planned_amount || 0);
      map.set(key, existing);
    });

    // Actuals from expenses (match by expense_type to category_name, case-insensitive)
    expenses.forEach((e: any) => {
      if (verticalFilter !== "All" && e.vertical_name !== verticalFilter && e.vertical_name?.toLowerCase() !== "general") return;
      const catName = e.expense_type || "Miscellaneous";
      const vertical = e.vertical_name || "General";
      // Try to match an existing planned line first
      let matched = false;
      for (const [key, val] of map.entries()) {
        if (
          val.category.toLowerCase() === catName.toLowerCase() &&
          (val.vertical === vertical || val.vertical === "All")
        ) {
          val.actual += Number(e.amount || 0);
          matched = true;
          break;
        }
      }
      if (!matched) {
        const key = `${catName}::${vertical}`;
        map.set(key, {
          category: catName,
          planned: 0,
          actual: Number(e.amount || 0),
          vertical,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => (b.planned + b.actual) - (a.planned + a.actual));
  }, [budgetLines, expenses, verticalFilter]);

  // Headline numbers
  const totals = useMemo(() => {
    const totalPlanned = breakdown.reduce((s, b) => s + b.planned, 0);
    const totalExpense = breakdown.reduce((s, b) => s + b.actual, 0);
    const totalRevenue = revenue
      .filter((r: any) => verticalFilter === "All" || r.vertical_name === verticalFilter)
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const dealRevenue = plEntries
      .filter((p: any) => verticalFilter === "All" || p.vertical_slug === verticalFilter.toLowerCase().replace(/\s+/g, "-"))
      .reduce((s: number, p: any) => s + Number(p.gross_revenue || 0), 0);
    const blendedRevenue = totalRevenue + dealRevenue;
    const grossProfit = blendedRevenue - totalExpense;
    const netMargin = blendedRevenue > 0 ? (grossProfit / blendedRevenue) * 100 : 0;
    const budgetUsed = totalPlanned > 0 ? (totalExpense / totalPlanned) * 100 : 0;
    const variance = totalPlanned - totalExpense; // positive = under budget
    return {
      totalPlanned,
      totalExpense,
      totalRevenue: blendedRevenue,
      grossProfit,
      netMargin,
      budgetUsed,
      variance,
    };
  }, [breakdown, revenue, plEntries, verticalFilter]);

  const verticals = ["All", "Insurance", "Car Sales", "Car Loans", "HSRP", "Self Drive Rental", "Accessories", "General"];

  const isProfitable = totals.grossProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> CFO P&L Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Live actuals vs plan · {targetMonth.label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMonthOffset((o) => o - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium px-3 min-w-[120px] text-center">
            {targetMonth.label}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMonthOffset((o) => o + 1)}
            disabled={monthOffset >= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Select value={verticalFilter} onValueChange={setVerticalFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {verticals.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* CFO Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Target className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">Planned Budget</p>
            </div>
            <p className="text-2xl font-bold">{fmt(totals.totalPlanned)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              From approved corporate budgets
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <Wallet className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">Actual Expense</p>
            </div>
            <p className="text-2xl font-bold">{fmt(totals.totalExpense)}</p>
            <Progress
              value={Math.min(totals.budgetUsed, 100)}
              className="mt-1.5 h-1"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {totals.budgetUsed.toFixed(0)}% of budget used
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <IndianRupee className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">Revenue Earned</p>
            </div>
            <p className="text-2xl font-bold">{fmt(totals.totalRevenue)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Logged + closed deals
            </p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${isProfitable ? "border-l-emerald-600" : "border-l-red-600"}`}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 mb-1 ${isProfitable ? "text-emerald-700" : "text-red-700"}`}>
              {isProfitable ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <p className="text-xs font-semibold uppercase tracking-wide">
                {isProfitable ? "Net Profit" : "Net Loss"}
              </p>
            </div>
            <p className={`text-2xl font-bold ${isProfitable ? "text-emerald-700" : "text-red-700"}`}>
              {fmt(Math.abs(totals.grossProfit))}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Margin: {totals.netMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* P&L Equation visual */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 font-semibold">
            CFO Equation · {targetMonth.label}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-base font-mono">
            <span className="text-emerald-700 font-bold">{fmt(totals.totalRevenue)}</span>
            <span className="text-muted-foreground">Revenue</span>
            <span className="text-2xl text-muted-foreground">−</span>
            <span className="text-rose-700 font-bold">{fmt(totals.totalExpense)}</span>
            <span className="text-muted-foreground">Expense</span>
            <span className="text-2xl text-muted-foreground">=</span>
            <span className={`font-bold text-lg ${isProfitable ? "text-emerald-700" : "text-red-700"}`}>
              {isProfitable ? "+" : "−"}{fmt(Math.abs(totals.grossProfit))}
            </span>
            <Badge className={isProfitable ? "bg-emerald-100 text-emerald-700 border-0" : "bg-red-100 text-red-700 border-0"}>
              {isProfitable ? "Profitable" : "Loss"}
            </Badge>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Budget Variance:</span>
              <span className={`font-semibold ${totals.variance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {totals.variance >= 0 ? "Saved " : "Over by "}
                {fmt(Math.abs(totals.variance))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category breakdown table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Category Breakdown · Planned vs Actual</h3>
            <p className="text-xs text-muted-foreground">
              Auto-pulled from your expense ledger. Variance shows where you over/under-spent.
            </p>
          </div>
          {breakdown.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto opacity-40 mb-2" />
              No budget or expense data for {targetMonth.label}.
              <p className="mt-1 text-xs">
                Create an approved corporate budget or log an expense to see live tracking.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Vertical</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((row, i) => {
                  const variance = row.planned - row.actual;
                  const used = row.planned > 0 ? (row.actual / row.planned) * 100 : 0;
                  const overspend = row.planned > 0 && row.actual > row.planned;
                  const noPlan = row.planned === 0 && row.actual > 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.category}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {row.vertical}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(row.planned)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-rose-600">
                        {fmt(row.actual)}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {variance >= 0 ? "+" : "−"}{fmt(Math.abs(variance))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-medium">{used.toFixed(0)}%</span>
                          {row.planned > 0 && (
                            <Progress
                              value={Math.min(used, 100)}
                              className={`h-1 w-16 ${overspend ? "[&>div]:bg-red-500" : ""}`}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {noPlan ? (
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] gap-1">
                            <AlertTriangle className="h-3 w-3" /> Unplanned
                          </Badge>
                        ) : overspend ? (
                          <Badge className="bg-red-100 text-red-700 border-0 text-[10px] gap-1">
                            <TrendingUp className="h-3 w-3" /> Over Budget
                          </Badge>
                        ) : used >= 80 ? (
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
                            Watch
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" /> On Track
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Helper note */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">How auto-calculation works:</p>
          <p>• <strong>Planned</strong> comes from approved/active corporate budgets covering this month.</p>
          <p>• <strong>Actual Expense</strong> is summed from the <code className="text-[10px]">expenses</code> ledger (matched by category & vertical).</p>
          <p>• <strong>Revenue</strong> blends logged revenue entries + closed deals (vertical P&L).</p>
          <p>• <strong>Profit = Revenue − Expense</strong>. Margin = Profit ÷ Revenue.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CFODashboard;
