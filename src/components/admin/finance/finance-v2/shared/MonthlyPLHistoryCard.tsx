/**
 * Monthly P&L history — shows persisted snapshots from `monthly_financial_snapshots`.
 * Used inside both the CFO Cockpit and Founder Cockpit so each month's profit/loss
 * is visible at a glance with drill-down to revenue/expense source breakdowns.
 */
import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, History, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  useLiveMonthlyPL,
  useSnapshotHistory,
  useSnapshotPersistence,
  useAutoSnapshot,
} from "./useMonthlyPL";

const fmt = (v: number | null | undefined) =>
  `Rs. ${Math.round(Number(v || 0)).toLocaleString("en-IN")}`;

export const MonthlyPLHistoryCard = ({ autoSave = true }: { autoSave?: boolean }) => {
  const { rows: liveRows } = useLiveMonthlyPL(12);
  const { data: history = [], isLoading } = useSnapshotHistory();
  const persist = useSnapshotPersistence();
  const [drillMonth, setDrillMonth] = useState<string | null>(null);

  // Auto-persist current month silently
  useAutoSnapshot(liveRows, autoSave);

  const handleManualSave = () => {
    persist.mutate(liveRows, {
      onSuccess: (count) => toast.success(`Saved ${count} month snapshot(s)`),
      onError: (e: any) => toast.error(e?.message || "Failed to save snapshot"),
    });
  };

  // Merge live + history: prefer live for current/recent months, fall back to history for older
  const liveMap = new Map(liveRows.map(r => [r.month_year, r]));
  const historyMap = new Map(history.map((h: any) => [h.month_year, h]));
  const allMonths = Array.from(new Set([
    ...liveRows.map(r => r.month_year),
    ...history.map((h: any) => h.month_year),
  ])).sort().reverse();

  const drillData = drillMonth
    ? (liveMap.get(drillMonth) || (() => {
        const h = historyMap.get(drillMonth);
        return h ? {
          month_year: h.month_year,
          total_revenue: Number(h.total_revenue || 0),
          total_expenses: Number(h.total_expenses || 0),
          net_profit: Number(h.net_profit || 0),
          source_breakdown: h.source_breakdown || {},
          expense_breakdown: h.expense_breakdown || {},
        } : null;
      })())
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Monthly Profit & Loss History
            <Badge variant="outline" className="text-[10px] ml-1">
              {history.length} saved · {liveRows.length} live
            </Badge>
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleManualSave}
            disabled={persist.isPending}
          >
            <Save className="h-3.5 w-3.5" />
            {persist.isPending ? "Saving…" : "Save Snapshot Now"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Each month's P&L is auto-saved so you can review historical performance anytime.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[11px] font-semibold">Month</TableHead>
              <TableHead className="text-[11px] font-semibold text-right">Revenue</TableHead>
              <TableHead className="text-[11px] font-semibold text-right">Expenses</TableHead>
              <TableHead className="text-[11px] font-semibold text-right">Net P&L</TableHead>
              <TableHead className="text-[11px] font-semibold text-right">Margin</TableHead>
              <TableHead className="text-[11px] font-semibold">Source</TableHead>
              <TableHead className="text-[11px] font-semibold w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">Loading…</TableCell></TableRow>
            )}
            {!isLoading && allMonths.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">No P&L data yet — click "Save Snapshot Now" to record this month.</TableCell></TableRow>
            )}
            {allMonths.map(m => {
              const live = liveMap.get(m);
              const hist = historyMap.get(m);
              const rev = live?.total_revenue ?? Number(hist?.total_revenue || 0);
              const exp = live?.total_expenses ?? Number(hist?.total_expenses || 0);
              const net = live?.net_profit ?? Number(hist?.net_profit || 0);
              const margin = rev > 0 ? (net / rev) * 100 : 0;
              const isLive = !!live && (live.total_revenue > 0 || live.total_expenses > 0);
              return (
                <TableRow key={m} className="hover:bg-muted/30 cursor-pointer" onClick={() => setDrillMonth(m)}>
                  <TableCell className="text-xs font-medium">
                    {format(new Date(`${m}-01`), "MMMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold text-emerald-700">{fmt(rev)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold text-rose-700">{fmt(exp)}</TableCell>
                  <TableCell className={`text-right text-sm font-bold ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    <span className="inline-flex items-center gap-1">
                      {net >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {fmt(net)}
                    </span>
                  </TableCell>
                  <TableCell className={`text-right text-xs ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {margin.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <Badge variant={isLive ? "default" : "outline"} className={`text-[9px] ${isLive ? "bg-emerald-600" : ""}`}>
                      {isLive && hist ? "LIVE + SAVED" : isLive ? "LIVE" : "SAVED"}
                    </Badge>
                  </TableCell>
                  <TableCell><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!drillMonth} onOpenChange={(o) => !o && setDrillMonth(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {drillMonth ? format(new Date(`${drillMonth}-01`), "MMMM yyyy") : ""} — P&L Breakdown
            </DialogTitle>
          </DialogHeader>
          {drillData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200">
                  <p className="text-[10px] uppercase text-emerald-700">Revenue</p>
                  <p className="text-lg font-bold text-emerald-700">{fmt(drillData.total_revenue)}</p>
                </div>
                <div className="rounded-lg p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200">
                  <p className="text-[10px] uppercase text-rose-700">Expenses</p>
                  <p className="text-lg font-bold text-rose-700">{fmt(drillData.total_expenses)}</p>
                </div>
                <div className={`rounded-lg p-3 border ${drillData.net_profit >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
                  <p className={`text-[10px] uppercase ${drillData.net_profit >= 0 ? "text-blue-700" : "text-red-700"}`}>Net P&L</p>
                  <p className={`text-lg font-bold ${drillData.net_profit >= 0 ? "text-blue-700" : "text-red-700"}`}>{fmt(drillData.net_profit)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-2">Revenue by Source</p>
                  <div className="space-y-1">
                    {Object.entries(drillData.source_breakdown || {}).sort((a: any, b: any) => b[1] - a[1]).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[11px] py-1 border-b last:border-0">
                        <span className="text-slate-700">{k}</span>
                        <span className="font-mono font-semibold">{fmt(v as number)}</span>
                      </div>
                    ))}
                    {Object.keys(drillData.source_breakdown || {}).length === 0 && (
                      <p className="text-[11px] text-muted-foreground">No revenue this month</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-rose-700 mb-2">Expense Breakdown</p>
                  <div className="space-y-1">
                    {Object.entries(drillData.expense_breakdown || {}).sort((a: any, b: any) => b[1] - a[1]).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[11px] py-1 border-b last:border-0">
                        <span className="text-slate-700">{k}</span>
                        <span className="font-mono font-semibold">{fmt(v as number)}</span>
                      </div>
                    ))}
                    {Object.keys(drillData.expense_breakdown || {}).length === 0 && (
                      <p className="text-[11px] text-muted-foreground">No expenses recorded</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default MonthlyPLHistoryCard;
