import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, LineChart, Line,
} from "recharts";
import { SectionCard } from "../shared/SectionCard";
import { TrendingUp, BarChart3, Image as ImageIcon, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmt, VERTICALS } from "../../corporate-budget/types";
import { format, startOfMonth, subMonths, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { buildExportFilename } from "../shared/exportNaming";
import { UtilizationDrillDownDialog, type DrillContext } from "./UtilizationDrillDownDialog";

type Granularity = "month" | "quarter" | "year";

const GRANULARITY: { id: Granularity; label: string; months: number }[] = [
  { id: "month", label: "Last 6 Months", months: 6 },
  { id: "quarter", label: "Last 4 Quarters", months: 12 },
  { id: "year", label: "Last 2 Years", months: 24 },
];

const VERTICAL_KEYS = VERTICALS.filter((v) => v !== "All");

// --- Custom tooltip with utilization & variance ---
const RichTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const planned = Number(payload.find((p: any) => p.dataKey === "Planned")?.value || 0);
  const actual = Number(payload.find((p: any) => p.dataKey === "Actual")?.value || 0);
  const variance = planned - actual;
  const util = planned > 0 ? Math.round((actual / planned) * 100) : 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-xl px-3 py-2 text-xs min-w-[200px]">
      <p className="font-semibold text-slate-900 mb-1.5 border-b pb-1">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-slate-400" /> Planned</span>
          <span className="font-semibold tabular-nums">{fmt(planned)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-slate-900" /> Actual</span>
          <span className="font-semibold tabular-nums">{fmt(actual)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1 mt-1 border-t">
          <span className="text-slate-500">Variance</span>
          <span className={cn("font-semibold tabular-nums", variance >= 0 ? "text-emerald-700" : "text-red-700")}>
            {variance >= 0 ? "+" : "−"}{fmt(Math.abs(variance))}
          </span>
        </div>
        {planned > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Utilization</span>
            <span className={cn("font-semibold tabular-nums",
              util > 100 ? "text-red-700" : util >= 80 ? "text-amber-700" : "text-emerald-700")}>
              {util}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const SERIES_KEYS = ["Planned", "Actual"] as const;
type SeriesKey = typeof SERIES_KEYS[number];

export const UtilizationInsights = () => {
  const [gran, setGran] = useState<Granularity>("month");
  const monthsBack = useMemo(() => GRANULARITY.find((g) => g.id === gran)!.months, [gran]);
  const [hidden, setHidden] = useState<Record<SeriesKey, boolean>>({ Planned: false, Actual: false });
  const [drill, setDrill] = useState<DrillContext | null>(null);

  const verticalChartRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);

  const granularityLabel = useMemo(() => GRANULARITY.find((g) => g.id === gran)!.label, [gran]);
  const rangeStart = useMemo(
    () => format(subMonths(startOfMonth(new Date()), monthsBack), "yyyy-MM-dd"),
    [monthsBack]
  );
  const rangeEnd = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const openVerticalDrill = (row: any) => {
    setDrill({
      mode: "vertical",
      key: row.vertical,
      granularityLabel,
      rangeStart,
      rangeEnd,
      planned: row.Planned,
      actual: row.Actual,
    });
  };

  const openMonthDrill = (row: any) => {
    setDrill({
      mode: "month",
      key: row.month,
      granularityLabel,
      rangeStart,
      rangeEnd,
      planned: row.Planned,
      actual: row.Actual,
    });
  };

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

  const timeData = useMemo(() => {
    const buckets: Record<string, { Planned: number; Actual: number }> = {};
    const now = startOfMonth(new Date());
    for (let i = monthsBack - 1; i >= 0; i--) {
      const key = format(subMonths(now, i), "MMM yy");
      buckets[key] = { Planned: 0, Actual: 0 };
    }
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
        cursor = addMonths(cursor, 1);
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

  // ---- exports ----
  const downloadCSV = () => {
    const rows: string[] = [];
    rows.push(`"Utilization Insights","${GRANULARITY.find((g) => g.id === gran)!.label}","Generated ${format(new Date(), "dd MMM yyyy, p")}"`);
    rows.push("");
    rows.push('"By Vertical"');
    rows.push('"Vertical","Planned (INR)","Actual (INR)","Variance","Utilization %"');
    for (const r of verticalData) {
      rows.push(`"${r.vertical}",${r.Planned},${r.Actual},${r.Planned - r.Actual},${r.utilization}`);
    }
    rows.push(`"TOTAL",${totalPlanned},${totalActual},${totalPlanned - totalActual},${overallUtil}`);
    rows.push("");
    rows.push('"Trend Over Time"');
    rows.push('"Month","Planned (INR)","Actual (INR)"');
    for (const r of timeData) rows.push(`"${r.month}",${r.Planned},${r.Actual}`);

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildExportFilename({
      module: "utilization-insights",
      scope: "summary",
      period: granularityLabel,
      ext: "csv",
    });
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const downloadPNG = async (which: "vertical" | "trend") => {
    const node = which === "vertical" ? verticalChartRef.current : trendChartRef.current;
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { backgroundColor: "#ffffff", pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = buildExportFilename({
        module: "utilization-insights",
        scope: which === "vertical" ? "by-vertical" : "trend",
        period: granularityLabel,
        ext: "png",
      });
      a.click();
      toast.success("Chart exported as PNG");
    } catch (e: any) {
      toast.error("PNG export failed");
    }
  };

  const handleLegendClick = (e: any) => {
    const k = e.dataKey as SeriesKey;
    if (!SERIES_KEYS.includes(k)) return;
    setHidden((h) => ({ ...h, [k]: !h[k] }));
  };

  return (
    <SectionCard
      title="Utilization Insights"
      description="Planned vs actual spend · vertical-wise & period trend"
      icon={BarChart3}
      className="lg:col-span-3"
      action={
        <div className="flex items-center gap-2 flex-wrap">
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
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={downloadCSV}>
            <FileDown className="h-3 w-3" /> CSV
          </Button>
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
        <div ref={verticalChartRef} className="rounded-lg border bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-serif font-semibold text-sm text-slate-900">By Vertical</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Click legend to toggle</span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1"
                onClick={() => downloadPNG("vertical")}>
                <ImageIcon className="h-3 w-3" /> PNG
              </Button>
            </div>
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
                <Tooltip content={<RichTooltip />} cursor={{ fill: "rgba(15,23,42,0.04)" }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
                  onClick={handleLegendClick}
                  formatter={(v) => (
                    <span style={{ color: hidden[v as SeriesKey] ? "#cbd5e1" : "#0f172a", textDecoration: hidden[v as SeriesKey] ? "line-through" : "none" }}>
                      {v}
                    </span>
                  )}
                />
                <Bar dataKey="Planned" fill="#94a3b8" radius={[3, 3, 0, 0]} hide={hidden.Planned} />
                <Bar dataKey="Actual" fill="#0f172a" radius={[3, 3, 0, 0]} hide={hidden.Actual} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div ref={trendChartRef} className="rounded-lg border bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-serif font-semibold text-sm text-slate-900">Trend Over Time</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Monthly rolling
              </span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1"
                onClick={() => downloadPNG("trend")}>
                <ImageIcon className="h-3 w-3" /> PNG
              </Button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeData} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<RichTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
              <Legend
                wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
                onClick={handleLegendClick}
                formatter={(v) => (
                  <span style={{ color: hidden[v as SeriesKey] ? "#cbd5e1" : "#0f172a", textDecoration: hidden[v as SeriesKey] ? "line-through" : "none" }}>
                    {v}
                  </span>
                )}
              />
              <Line type="monotone" dataKey="Planned" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} hide={hidden.Planned} />
              <Line type="monotone" dataKey="Actual" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} hide={hidden.Actual} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SectionCard>
  );
};

export default UtilizationInsights;
