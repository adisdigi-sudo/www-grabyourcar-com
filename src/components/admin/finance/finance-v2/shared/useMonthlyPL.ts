/**
 * Live Monthly P&L computation + persistence
 *
 * - Pulls the same revenue and expense sources used by FinancialIntelligenceDashboard
 *   (paid invoices, direct payments, won deals, paid HSRP / accessory / rental orders,
 *   payroll, debit refunds).
 * - Returns a 6-month P&L array (current month + last 5).
 * - Provides `persistSnapshots` which UPSERTs each month into
 *   `monthly_financial_snapshots` so Founder & CFO can browse historical P&L.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths } from "date-fns";

export interface MonthlyPLRow {
  month_year: string;       // "2026-04"
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  source_breakdown: Record<string, number>;
  expense_breakdown: Record<string, number>;
  computed_at: string;
}

const monthKey = (d: string | Date | null | undefined): string | null => {
  if (!d) return null;
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (isNaN(dt.getTime())) return null;
    return format(dt, "yyyy-MM");
  } catch { return null; }
};

const VERTICAL_KEY = "ALL"; // We persist a single global "ALL" row per month.

export const useLiveMonthlyPL = (monthsBack = 6) => {
  const months = useMemo(
    () => Array.from({ length: monthsBack }, (_, i) => format(subMonths(new Date(), i), "yyyy-MM")).reverse(),
    [monthsBack],
  );
  const startDate = `${months[0]}-01`;

  const { data: invoices = [] } = useQuery({
    queryKey: ["mpl-invoices", startDate],
    queryFn: async () => {
      const { data } = await supabase.from("invoices")
        .select("total_amount, status, paid_at, invoice_date, vertical_name")
        .gte("invoice_date", startDate);
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["mpl-payments", startDate],
    queryFn: async () => {
      const { data } = await (supabase.from("payment_received") as any)
        .select("amount, payment_date, notes, invoice_number")
        .gte("payment_date", startDate);
      return data || [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["mpl-deals", startDate],
    queryFn: async () => {
      const { data } = await supabase.from("deals")
        .select("payment_received_amount, payment_status, closed_at, created_at, vertical_name")
        .eq("payment_status", "received")
        .gte("created_at", startDate);
      return data || [];
    },
  });

  const { data: hsrp = [] } = useQuery({
    queryKey: ["mpl-hsrp", startDate],
    queryFn: async () => {
      const { data } = await supabase.from("hsrp_bookings")
        .select("payment_amount, service_price, payment_status, created_at")
        .eq("payment_status", "paid")
        .gte("created_at", startDate);
      return data || [];
    },
  });

  const { data: accessory = [] } = useQuery({
    queryKey: ["mpl-accessory", startDate],
    queryFn: async () => {
      const { data } = await supabase.from("accessory_orders")
        .select("total_amount, payment_status, created_at")
        .eq("payment_status", "paid")
        .gte("created_at", startDate);
      return data || [];
    },
  });

  const { data: rentals = [] } = useQuery({
    queryKey: ["mpl-rentals", startDate],
    queryFn: async () => {
      const { data } = await (supabase.from("rental_bookings") as any)
        .select("total_amount, payment_status, created_at")
        .eq("payment_status", "paid")
        .gte("created_at", startDate);
      return data || [];
    },
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ["mpl-payroll"],
    queryFn: async () => {
      const { data } = await (supabase.from("payroll_records") as any)
        .select("net_salary, payroll_month, payment_status");
      return data || [];
    },
  });

  const rows: MonthlyPLRow[] = useMemo(() => {
    return months.map(m => {
      const source: Record<string, number> = {};
      const expense: Record<string, number> = {};
      const addSrc = (k: string, v: number) => { if (v > 0) source[k] = (source[k] || 0) + v; };
      const addExp = (k: string, v: number) => { if (v > 0) expense[k] = (expense[k] || 0) + v; };

      invoices.filter((i: any) => i.status === "paid" && monthKey(i.paid_at || i.invoice_date) === m)
        .forEach((i: any) => addSrc(i.vertical_name || "Invoiced", Number(i.total_amount || 0)));
      payments
        .filter((p: any) => !p.invoice_number && monthKey(p.payment_date) === m && !/^\[DEBIT\]/i.test(String(p.notes || "")))
        .forEach((p: any) => addSrc("Direct Payments", Number(p.amount || 0)));
      deals.filter((d: any) => monthKey(d.closed_at || d.created_at) === m)
        .forEach((d: any) => addSrc(d.vertical_name || "Deals", Number(d.payment_received_amount || 0)));
      hsrp.filter((h: any) => monthKey(h.created_at) === m)
        .forEach((h: any) => addSrc("HSRP", Number(h.payment_amount || h.service_price || 0)));
      accessory.filter((a: any) => monthKey(a.created_at) === m)
        .forEach((a: any) => addSrc("Accessories", Number(a.total_amount || 0)));
      rentals.filter((r: any) => monthKey(r.created_at) === m)
        .forEach((r: any) => addSrc("Self Drive", Number(r.total_amount || 0)));

      const monthPayroll = payrolls.filter((p: any) => p.payroll_month === m)
        .reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
      addExp("Payroll", monthPayroll);
      const refunds = payments
        .filter((p: any) => monthKey(p.payment_date) === m && /^\[DEBIT\]/i.test(String(p.notes || "")))
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      addExp("Refunds", refunds);

      const total_revenue = Object.values(source).reduce((a, b) => a + b, 0);
      const total_expenses = Object.values(expense).reduce((a, b) => a + b, 0);
      return {
        month_year: m,
        total_revenue,
        total_expenses,
        net_profit: total_revenue - total_expenses,
        source_breakdown: source,
        expense_breakdown: expense,
        computed_at: new Date().toISOString(),
      };
    });
  }, [months, invoices, payments, deals, hsrp, accessory, rentals, payrolls]);

  return { rows, months };
};

/**
 * Persist all currently computed months to monthly_financial_snapshots.
 * Idempotent — safe to call repeatedly (UPSERTs on (vertical_name, month_year) where tenant_id IS NULL).
 */
export const useSnapshotPersistence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: MonthlyPLRow[]) => {
      if (!rows.length) return 0;
      const payload = rows.map(r => ({
        vertical_name: VERTICAL_KEY,
        month_year: r.month_year,
        total_revenue: r.total_revenue,
        total_expenses: r.total_expenses,
        net_profit: r.net_profit,
        source_breakdown: r.source_breakdown,
        expense_breakdown: r.expense_breakdown,
        computed_at: r.computed_at,
        // legacy columns preserved
        total_deal_value: r.total_revenue,
        total_dealer_payout: 0,
        total_revenue_margin: r.net_profit,
        total_commission: 0,
        tenant_id: null,
      }));
      const { error } = await (supabase.from("monthly_financial_snapshots") as any).upsert(payload, {
        onConflict: "vertical_name,month_year",
        ignoreDuplicates: false,
      });
      if (error) throw error;
      return payload.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pl-snapshots-history"] }),
  });
};

/**
 * Auto-persist the current month (and the previous 5) once per page mount + every 5 minutes.
 * Silent — no toast, no UI flicker. Used in CFO + Founder cockpit pages.
 */
export const useAutoSnapshot = (rows: MonthlyPLRow[], enabled = true) => {
  const persist = useSnapshotPersistence();
  const lastRunRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !rows.length) return;
    // Only trigger when actual revenue/expense activity is non-zero in any month
    const hasData = rows.some(r => r.total_revenue > 0 || r.total_expenses > 0);
    if (!hasData) return;
    const now = Date.now();
    if (now - lastRunRef.current < 5 * 60 * 1000) return;
    lastRunRef.current = now;
    persist.mutate(rows, {
      onError: (e: any) => console.warn("[auto-snapshot] failed:", e?.message),
    });
  }, [rows, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
};

/** Read persisted P&L history (newest first). */
export const useSnapshotHistory = () => {
  return useQuery({
    queryKey: ["pl-snapshots-history"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("monthly_financial_snapshots") as any)
        .select("*")
        .eq("vertical_name", VERTICAL_KEY)
        .order("month_year", { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        month_year: string;
        total_revenue: number | null;
        total_expenses: number | null;
        net_profit: number | null;
        source_breakdown: Record<string, number> | null;
        expense_breakdown: Record<string, number> | null;
        computed_at: string | null;
      }>;
    },
  });
};
