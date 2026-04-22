import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { inr } from "../shared/payoutEngine";
import { AlertTriangle } from "lucide-react";

interface Row {
  id: string;
  ref: string;
  customer: string;
  meta: string;
  summaryNet: number;
  tableNet: number;
  diff: number;
  reason: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  module: "Policies" | "Loans" | "Deals" | null;
  rows: Row[];
  totalDiff: number;
}

export const ReconciliationDrillModal = ({ open, onOpenChange, module, rows, totalDiff }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            {module} Reconciliation — Mismatched Rows
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-slate-600 mb-3 p-2 rounded bg-amber-50 border border-amber-200">
          Total mismatch: <b>{inr(Math.abs(totalDiff))}</b>. Rows below are the ones whose computed net differs from the
          summary's expected value (typically due to per-record custom % overrides, missing rule data, or filter changes).
        </div>

        {rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            ✓ No mismatched rows — all {module?.toLowerCase()} records reconcile cleanly.
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-[10px] uppercase text-slate-600">
                <tr>
                  <th className="px-2 py-2 text-left">Reference</th>
                  <th className="px-2 py-2 text-left">Customer</th>
                  <th className="px-2 py-2 text-left">Detail</th>
                  <th className="px-2 py-2 text-right">Expected</th>
                  <th className="px-2 py-2 text-right">Actual</th>
                  <th className="px-2 py-2 text-right">Δ</th>
                  <th className="px-2 py-2 text-left">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-amber-50/50">
                    <td className="px-2 py-2 font-mono text-[10px]">{r.ref}</td>
                    <td className="px-2 py-2">{r.customer}</td>
                    <td className="px-2 py-2 text-slate-600">{r.meta}</td>
                    <td className="px-2 py-2 text-right">{inr(r.summaryNet)}</td>
                    <td className="px-2 py-2 text-right">{inr(r.tableNet)}</td>
                    <td className={`px-2 py-2 text-right font-semibold ${Math.abs(r.diff) < 1 ? "text-emerald-700" : "text-amber-700"}`}>
                      {r.diff >= 0 ? "+ " : "- "}{inr(Math.abs(r.diff))}
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant="outline" className="text-[9px]">{r.reason}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
