import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, LineChart, Line,
} from "recharts";
import { SectionCard } from "../shared/SectionCard";
import { TrendingUp, BarChart3 } from "lucide-react";
import { fmt, VERTICALS } from "../../corporate-budget/types";
import { format, startOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

type Granularity = "month" | "quarter" | "year";

const GRANULARITY: { id: Granularity; label: string; months: number }[] = [
  { id: "month", label: "Last 6 Months", months: 6 },
  { id: "quarter", label: "Last 4 Quarters", months: 12 },
  { id: "year", label: "Last 2 Years", months: 24 },
];

const VERTICAL_KEYS = VERTICALS.filter((v) => v !== "All");

const COLORS: Record<string, string> = {
  Insurance: "#0ea5e9",
  "Car Sales": "#6366f1",
  "Car Loans": "#10b981",
  HSRP: "#f59e0b",
  "Self Drive Rental": "#ec4899",
  Accessories: "#8b5cf6",
  General: "#64748b",
};

export const UtilizationInsights = () => {
  const [gran, setGran] = useState<Granularity>("month");
  const monthsBack = useMemo(() => GRANULARITY.find((g) => g.id === gran)!.months, [gran]);

  const { data: budgetLines = [] } = useQuery({
    queryKey: ["util-budget-lines", monthsBack],
    queryFn: async () => {
      const since = format(subMonths(startOfMonth(new Date()), monthsBack), "yyyy-MM-dd");
      const { data } = await (supabase.from("corporate_budget_lines") as any)
        .select("planned_amount, actual_amount, vertical, budget_id, corporate_budgets!inner(period_start, period_end, status)")
        .gte("corporate_budgets.period_start", since);
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["util-expenses", monthsBack],
    queryFn: async () => {
      const since = format(subMonths(startOfMonth(new Date()), monthsBack), "yyyy-MM-dd");
      const { data } = await (supabase.from("expenses") as any)
        .select("amount, vertical_name, expense_date")
        .gte("expense_date", since);
      return data || [];
    },
  });

  // Aggregate planned by vertical
  const verticalData = useMemo(() => {
    const map: Record<string, { planned: number; actual: number }> = {};
    for (const v of VERTICAL_KEYS) map[v] = { planned: 0, actual: 0 };
    for (const l of budgetLines) {
      const v = l.vertical || "General";
      if (!map[v]) map[v] = { planned: 0, actual: 0 };
      map[v].planned += Number(l.planned_amount || 0);
      map[v].actual += Number(l.actual_amount || 0);
    }
    for (const e of expenses) {
      const raw = (e.vertical_name || "General").toString();
      const matched =
        VERTICAL_KEYS.find((v) => v.toLowerCase() === raw.toLowerCase()) || "General";
      if (!map[matched]) map[matched] = { planned: 0, actual: 0 };
      map[matched].actual += Number(e.amount || 0);
    }
    return Object.entries(map)
      .map(([vertical, v]) => ({
        vertical,
        Planned: Math.round(v.planned),
        Actual: Math.round(v.actual),
        utilization: v.planned > 0 ? Math.round((v.actual / v.planned) * 100) : 0,
      }))
      .filter((r) => r.Planned > 0 || r.Actual > 0);
  }, [budgetLines, expenses]);

  // Time-series by month (planned distributed evenly across budget months, actual = expenses sum per month)
  const timeData = useMemo(() => {
    const buckets: Record<string, { Planned: number; Actual: number }> = {};
    const now = startOfMonth(new Date());
    for (let i = monthsBack - 1; i >= 0; i--) {
      const key = format(subMonths(now, i), "MMM yy");
      buckets[key] = { Planned: 0, Actual: 0 };
    }
    // Spread planned across the budget's period months
    for (const l of budgetLines) {
      const meta = l.corporate_budgets;
      if (!meta) continue;
      const start = new Date(meta.period_start);
      const end = new Date(meta.period_end);
      const months: string[] = [];
      let cursor = startOfMonth(start);
      while (cursor <= end) {
        const k = format(cursor, "MMM yy");
        if (k in buckets) months.push(k);
        cursor = startOfMonth(subMonths(cursor, -1));
      }
      const split = months.length > 0 ? Number(l.planned_amount || 0) / months.length : 0;
      for (const m of months) buckets[m].Planned += split;
    }
    for (const e of expenses) {
      const k = format(new Date(e.expense_date), "MMM yy");
      if (k in buckets) buckets[k].Actual += Number(e.amount || 0);
    }
    return Object.entries(buckets).map(([month, v]) => ({
      month,
      Planned: Math.round(v.Planned),
      Actual: Math.round(v.Actual),
    }));
  }, [budgetLines, expenses, monthsBack]);

  const totalPlanned = verticalData.reduce((s, r) => s + r.Planned, 0);
  const totalActual = verticalData.reduce((s, r) => s + r.Actual, 0);
  const overallUtil = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  return (
    <SectionCard
      title="Utilization Insights"
      description="Planned vs actual spend · vertical-wise & period trend"
      icon={BarChart3}
      className="lg:col-span-3"
      action={
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {GRANULARITY.map((g) => (
            <button
              key={g.id}
              onClick={() => setGran(g.id)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                gran === g.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg border bg-slate-50/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Total Planned</p>
          <p className="text-lg font-serif font-semibold tabular-nums mt-1">{fmt(totalPlanned)}</p>
        </div>
        <div className="rounded-lg border bg-slate-50/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Total Actual</p>
          <p className="text-lg font-serif font-semibold tabular-nums mt-1">{fmt(totalActual)}</p>
        </div>
        <div className="rounded-lg border bg-slate-50/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Variance</p>
          <p className={cn("text-lg font-serif font-semibold tabular-nums mt-1",
            totalPlanned - totalActual >= 0 ? "text-emerald-700" : "text-red-700")}>
            {fmt(Math.abs(totalPlanned - totalActual))}
          </p>
        </div>
        <div className="rounded-lg border bg-slate-50/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Utilization</p>
          <p className="text-lg font-serif font-semibold tabular-nums mt-1">{overallUtil}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-lg border bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-serif font-semibold text-sm text-slate-900">By Vertical</p>
            <span className="text-[10px] text-slate-500">Planned vs Actual</span>
          </div>
          {verticalData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              No spend data in selected window.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={verticalData} margin={{ top: 8, right: 8, left: -10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="vertical" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} height={50} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Planned" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Actual" fill="#0f172a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-lg border bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-serif font-semibold text-sm text-slate-900">Trend Over Time</p>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Monthly rolling
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeData} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Planned" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Actual" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SectionCard>
  );
};

export default UtilizationInsights;
