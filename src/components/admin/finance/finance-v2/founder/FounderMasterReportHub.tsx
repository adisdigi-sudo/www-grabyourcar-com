import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
} from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wallet, Users, Shield, Banknote, Car, FileText, Target, FileDown,
  TrendingUp, TrendingDown, Search, Filter, FileSpreadsheet, BarChart3,
  Radio, RotateCcw,
} from "lucide-react";
import { SectionCard } from "../shared/SectionCard";
import { StatTile } from "../shared/StatTile";
import {
  computeInsurancePayout, computeLoanPayout, computeDealPayout, inr, RuleRow,
} from "../shared/payoutEngine";
import { buildRowInvoice, buildMonthlyStatement } from "../shared/founderReportPDF";

/* ---------- PERIOD HELPERS ---------- */
type PeriodKind = "week" | "month" | "quarter" | "year" | "custom";

interface Period {
  start: string; // yyyy-mm-dd
  end: string;
  label: string;
  kind: PeriodKind;
}

const fmtISO = (d: Date) => format(d, "yyyy-MM-dd");

const buildPeriod = (kind: PeriodKind, anchor: Date, custom?: { from: string; to: string }): Period => {
  if (kind === "week") {
    const s = startOfWeek(anchor, { weekStartsOn: 1 });
    const e = endOfWeek(anchor, { weekStartsOn: 1 });
    return { start: fmtISO(s), end: fmtISO(e), kind, label: `${format(s, "dd MMM")} – ${format(e, "dd MMM yyyy")}` };
  }
  if (kind === "quarter") {
    const s = startOfQuarter(anchor); const e = endOfQuarter(anchor);
    return { start: fmtISO(s), end: fmtISO(e), kind, label: `Q${Math.floor(anchor.getMonth() / 3) + 1} ${anchor.getFullYear()}` };
  }
  if (kind === "year") {
    const s = startOfYear(anchor); const e = endOfYear(anchor);
    return { start: fmtISO(s), end: fmtISO(e), kind, label: `${anchor.getFullYear()}` };
  }
  if (kind === "custom" && custom?.from && custom?.to) {
    return { start: custom.from, end: custom.to, kind, label: `${format(new Date(custom.from), "dd MMM")} – ${format(new Date(custom.to), "dd MMM yyyy")}` };
  }
  // default month
  const s = startOfMonth(anchor); const e = endOfMonth(anchor);
  return { start: fmtISO(s), end: fmtISO(e), kind: "month", label: format(anchor, "MMMM yyyy") };
};

export const FounderMasterReportHub = () => {
  const qc = useQueryClient();
  const [periodKind, setPeriodKind] = useState<PeriodKind>("month");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [customFrom, setCustomFrom] = useState<string>(fmtISO(startOfMonth(new Date())));
  const [customTo, setCustomTo] = useState<string>(fmtISO(endOfMonth(new Date())));
  const [vertical, setVertical] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [liveOn, setLiveOn] = useState(true);

  // Custom payout % overrides — keyed by record id
  const [policyOverrides, setPolicyOverrides] = useState<Record<string, number>>({});
  const [loanOverrides, setLoanOverrides] = useState<Record<string, number>>({});

  const period = useMemo(
    () => buildPeriod(periodKind, anchor, { from: customFrom, to: customTo }),
    [periodKind, anchor, customFrom, customTo]
  );

  const periodStart = period.start;
  const periodEnd = period.end;
  const periodLabel = period.label;
  // Stable cache key for the period
  const pKey = `${periodKind}-${periodStart}-${periodEnd}`;

  /* ---------- DATA ---------- */
  const { data: rules = [] } = useQuery({
    queryKey: ["founder-commission-rules"],
    queryFn: async () => {
      const { data } = await (supabase.from("commission_rules") as any).select("*").eq("is_active", true);
      return (data || []) as RuleRow[];
    },
  });

  const { data: payroll = [] } = useQuery({
    queryKey: ["founder-payroll", pKey],
    queryFn: async () => {
      // payroll_records uses payroll_month (yyyy-MM). For ranges spanning multiple months, fetch all months in range.
      const months: string[] = [];
      const s = new Date(periodStart); const e = new Date(periodEnd);
      const cur = new Date(s.getFullYear(), s.getMonth(), 1);
      while (cur <= e) { months.push(format(cur, "yyyy-MM")); cur.setMonth(cur.getMonth() + 1); }
      const { data } = await (supabase.from("payroll_records") as any)
        .select("*").in("payroll_month", months).order("net_salary", { ascending: false });
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["founder-expenses", pKey],
    queryFn: async () => {
      const { data } = await (supabase.from("expenses") as any).select("*")
        .gte("expense_date", periodStart).lte("expense_date", periodEnd);
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["founder-invoices", pKey],
    queryFn: async () => {
      const { data } = await (supabase.from("invoices") as any).select("*")
        .gte("invoice_date", periodStart).lte("invoice_date", periodEnd)
        .order("invoice_date", { ascending: false });
      return data || [];
    },
  });

  // POLICIES — only ACTIVE policies issued in the period (renewed/lapsed/cancelled excluded)
  const { data: policies = [] } = useQuery({
    queryKey: ["founder-policies", pKey],
    queryFn: async () => {
      const { data } = await (supabase.from("insurance_policies") as any)
        .select("*, insurance_clients(customer_name, vehicle_number, phone, assigned_executive)")
        .eq("status", "active")
        .gte("issued_date", periodStart).lte("issued_date", periodEnd)
        .order("issued_date", { ascending: false });
      return data || [];
    },
  });

  // LOANS — anything that lives in the period: disbursed in range OR sanctioned in range OR created in range
  const { data: loans = [] } = useQuery({
    queryKey: ["founder-loans", pKey],
    queryFn: async () => {
      const startTs = periodStart + "T00:00:00";
      const endTs = periodEnd + "T23:59:59";
      const orFilter = [
        `and(disbursement_date.gte.${periodStart},disbursement_date.lte.${periodEnd})`,
        `and(sanction_date.gte.${periodStart},sanction_date.lte.${periodEnd})`,
        `and(created_at.gte.${startTs},created_at.lte.${endTs})`,
      ].join(",");
      const { data } = await (supabase.from("loan_applications") as any).select("*")
        .or(orFilter)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // DEALS — closed_at in range OR created in range (covers both new and recently-closed deals)
  const { data: deals = [] } = useQuery({
    queryKey: ["founder-deals", pKey],
    queryFn: async () => {
      const startTs = periodStart + "T00:00:00";
      const endTs = periodEnd + "T23:59:59";
      const orFilter = [
        `and(created_at.gte.${startTs},created_at.lte.${endTs})`,
        `and(closed_at.gte.${startTs},closed_at.lte.${endTs})`,
      ].join(",");
      const { data } = await (supabase.from("deals") as any)
        .select("*, master_customers(name, phone)")
        .or(orFilter)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["founder-targets", pKey],
    queryFn: async () => {
      const months: string[] = [];
      const s = new Date(periodStart); const e = new Date(periodEnd);
      const cur = new Date(s.getFullYear(), s.getMonth(), 1);
      while (cur <= e) { months.push(format(cur, "yyyy-MM")); cur.setMonth(cur.getMonth() + 1); }
      const { data } = await (supabase.from("team_targets") as any).select("*")
        .in("month_year", months).order("achievement_pct", { ascending: false });
      return data || [];
    },
  });

  /* ---------- LIVE REALTIME ---------- */
  useEffect(() => {
    if (!liveOn) return;
    const tables = [
      ["insurance_policies", "founder-policies"],
      ["loan_applications", "founder-loans"],
      ["deals", "founder-deals"],
      ["invoices", "founder-invoices"],
      ["expenses", "founder-expenses"],
      ["payroll_records", "founder-payroll"],
      ["team_targets", "founder-targets"],
    ];
    const ch = supabase.channel("founder-master-live");
    tables.forEach(([table, key]) => {
      ch.on("postgres_changes" as any, { event: "*", schema: "public", table }, () => {
        qc.invalidateQueries({ queryKey: [key, pKey] });
      });
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [liveOn, pKey, qc]);

  /* ---------- COMPUTATIONS ---------- */
  const payrollTotal = payroll.reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
  const grossSalaryTotal = payroll.reduce((s: number, p: any) => s + Number(p.gross_salary || 0), 0);
  const expenseTotal = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const revenueTotal = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const receivablesTotal = invoices.filter((i: any) => i.status !== "paid").reduce((s: number, i: any) => s + Number(i.balance_due || i.total_amount || 0), 0);

  // Apply custom % override if set
  const recalcWithPct = (base: number, pct: number) => {
    const gross = (base * pct) / 100;
    const tds = gross * 0.05;
    const net = gross - tds;
    return { gross, tds, net };
  };

  const policyComputed = useMemo(() => policies.map((p: any) => {
    const def = computeInsurancePayout(p, rules);
    const override = policyOverrides[p.id];
    if (override !== undefined && !isNaN(override)) {
      const r = recalcWithPct(def.base, override);
      return { ...p, _calc: { base: def.base, pct: override, gross: r.gross, tds: r.tds, net: r.net, isCustom: true } };
    }
    return { ...p, _calc: { ...def, isCustom: false } };
  }), [policies, rules, policyOverrides]);

  const loanComputed = useMemo(() => loans.map((l: any) => {
    const def = computeLoanPayout(l, rules);
    const override = loanOverrides[l.id];
    if (override !== undefined && !isNaN(override)) {
      const r = recalcWithPct(def.base, override);
      return { ...l, _calc: { base: def.base, pct: override, gross: r.gross, tds: r.tds, net: r.net, isCustom: true } };
    }
    return { ...l, _calc: { ...def, isCustom: false } };
  }), [loans, rules, loanOverrides]);

  const dealComputed = useMemo(() => deals.map((d: any) => ({ ...d, _calc: computeDealPayout(d) })), [deals]);

  const insuranceNet = policyComputed.reduce((s, p) => s + p._calc.net, 0);
  const loanNet = loanComputed.reduce((s, l) => s + l._calc.net, 0);
  const dealNet = dealComputed.reduce((s, d) => s + d._calc.net, 0);
  const incentiveTotal = insuranceNet + loanNet + dealNet;

  const profit = revenueTotal + insuranceNet + loanNet + dealNet - payrollTotal - expenseTotal;

  const verticals = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((i: any) => i.vertical_name && set.add(i.vertical_name));
    expenses.forEach((e: any) => e.vertical_name && set.add(e.vertical_name));
    deals.forEach((d: any) => d.vertical_name && set.add(d.vertical_name));
    return Array.from(set).sort();
  }, [invoices, expenses, deals]);

  const filterText = (txt: string) => !search || txt.toLowerCase().includes(search.toLowerCase());
  const filterVert = (v: string | null | undefined) => vertical === "all" || (v || "").toLowerCase() === vertical.toLowerCase();

  /* ---------- RENDER ---------- */
  return (
    <SectionCard
      title="Founder Master Report Hub"
      description="Live · Period-filtered · Custom payout %: P&L · Payroll · Policies · Loans · Deals · Invoices · Team."
      icon={BarChart3}
      className="lg:col-span-3"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={liveOn ? "default" : "secondary"} className="gap-1 text-[10px] cursor-pointer" onClick={() => setLiveOn(v => !v)}>
            <Radio className={`h-2.5 w-2.5 ${liveOn ? "animate-pulse" : ""}`} />
            {liveOn ? "Live" : "Paused"}
          </Badge>
        </div>
      }
    >
      {/* Period filter strip — Weekly · Monthly · Quarterly · Yearly · Custom Range */}
      <div className="flex items-center gap-2 flex-wrap mb-3 p-3 rounded-lg border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-white shadow-sm">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Live Period</span>
        <div className="flex items-center gap-1 bg-white rounded-md border p-0.5">
          {([
            { k: "week" as PeriodKind, label: "Weekly" },
            { k: "month" as PeriodKind, label: "Monthly" },
            { k: "quarter" as PeriodKind, label: "Quarterly" },
            { k: "year" as PeriodKind, label: "Yearly" },
            { k: "custom" as PeriodKind, label: "Custom Range" },
          ]).map(({ k, label }) => (
            <button
              key={k}
              onClick={() => setPeriodKind(k)}
              className={`text-[11px] px-3 py-1 rounded font-medium transition ${
                periodKind === k ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {periodKind !== "custom" && (
          <Input
            type={periodKind === "year" ? "number" : "date"}
            value={periodKind === "year" ? anchor.getFullYear() : fmtISO(anchor)}
            onChange={(e) => {
              if (periodKind === "year") {
                const y = parseInt(e.target.value);
                if (!isNaN(y)) setAnchor(new Date(y, 0, 1));
              } else {
                setAnchor(new Date(e.target.value));
              }
            }}
            className="h-8 w-40 text-xs"
          />
        )}

        {periodKind === "custom" && (
          <>
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 w-36 text-xs" />
            <span className="text-xs text-slate-500">to</span>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 w-36 text-xs" />
          </>
        )}

        <Badge variant="default" className="text-[10px] ml-auto bg-amber-600">{periodLabel}</Badge>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
        <StatTile label="Revenue (Paid)" value={inr(revenueTotal)} icon={TrendingUp} trend="up" trendLabel={`${invoices.filter((i: any) => i.status === "paid").length} inv`} />
        <StatTile label="Receivables" value={inr(receivablesTotal)} icon={FileText} trend={receivablesTotal > 0 ? "down" : "neutral"} trendLabel={`${invoices.filter((i: any) => i.status !== "paid").length} pending`} />
        <StatTile label="Payroll" value={inr(payrollTotal)} icon={Users} hint={`${payroll.length} emp`} />
        <StatTile label="Expenses" value={inr(expenseTotal)} icon={Wallet} hint={`${expenses.length} entries`} />
        <StatTile label="Total Incentives" value={inr(incentiveTotal)} icon={Target} trend="up" trendLabel="Net of TDS" />
        <StatTile label="Net P&L" value={inr(Math.abs(profit))} icon={profit >= 0 ? TrendingUp : TrendingDown} trend={profit >= 0 ? "up" : "down"} trendLabel={profit >= 0 ? "Surplus" : "Deficit"} />
      </div>

      {/* Live Vertical Counts — exact records in selected period */}
      <div className="grid grid-cols-3 gap-3 mb-5 p-3 rounded-lg border bg-slate-50/40">
        <div className="text-center">
          <div className="text-[10px] uppercase text-slate-500 font-semibold">Policies Issued</div>
          <div className="text-xl font-bold text-blue-700">{policies.length}</div>
          <div className="text-[10px] text-slate-500">Net Payout: {inr(insuranceNet)}</div>
        </div>
        <div className="text-center border-x">
          <div className="text-[10px] uppercase text-slate-500 font-semibold">Car Loan Cases</div>
          <div className="text-xl font-bold text-emerald-700">{loans.length}</div>
          <div className="text-[10px] text-slate-500">
            {loans.filter((l: any) => l.stage === "disbursed").length} disbursed · Net: {inr(loanNet)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase text-slate-500 font-semibold">Car Sales / Deals</div>
          <div className="text-xl font-bold text-amber-700">{deals.length}</div>
          <div className="text-[10px] text-slate-500">Net Margin: {inr(dealNet)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-4 p-3 rounded-lg border bg-slate-50/50">
        <Filter className="h-3.5 w-3.5 text-slate-500" />
        <Select value={vertical} onValueChange={setVertical}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Vertical" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Verticals</SelectItem>
            {verticals.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, ref, employee…" className="h-8 pl-7 text-xs" />
        </div>
        {(Object.keys(policyOverrides).length > 0 || Object.keys(loanOverrides).length > 0) && (
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-amber-700"
            onClick={() => { setPolicyOverrides({}); setLoanOverrides({}); }}>
            <RotateCcw className="h-3 w-3" /> Reset {Object.keys(policyOverrides).length + Object.keys(loanOverrides).length} custom %
          </Button>
        )}
      </div>

      <Tabs defaultValue="pnl" className="w-full">
        <TabsList className="grid grid-cols-7 h-9">
          <TabsTrigger value="pnl" className="text-xs gap-1"><BarChart3 className="h-3 w-3" />P&L</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs gap-1"><Users className="h-3 w-3" />Payroll</TabsTrigger>
          <TabsTrigger value="policies" className="text-xs gap-1"><Shield className="h-3 w-3" />Policies</TabsTrigger>
          <TabsTrigger value="loans" className="text-xs gap-1"><Banknote className="h-3 w-3" />Loans</TabsTrigger>
          <TabsTrigger value="deals" className="text-xs gap-1"><Car className="h-3 w-3" />Deals</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs gap-1"><FileText className="h-3 w-3" />Invoices</TabsTrigger>
          <TabsTrigger value="team" className="text-xs gap-1"><Target className="h-3 w-3" />Team</TabsTrigger>
        </TabsList>

        {/* P&L */}
        <TabsContent value="pnl" className="mt-4 space-y-3">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                <tr><th className="px-3 py-2 text-left">Line</th><th className="px-3 py-2 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y">
                <tr><td className="px-3 py-2">Revenue (Paid Invoices)</td><td className="px-3 py-2 text-right text-emerald-700 font-medium">+ {inr(revenueTotal)}</td></tr>
                <tr><td className="px-3 py-2">Insurance Net Payouts</td><td className="px-3 py-2 text-right text-emerald-700 font-medium">+ {inr(insuranceNet)}</td></tr>
                <tr><td className="px-3 py-2">Loan Net Payouts</td><td className="px-3 py-2 text-right text-emerald-700 font-medium">+ {inr(loanNet)}</td></tr>
                <tr><td className="px-3 py-2">Automotive Deal Net</td><td className="px-3 py-2 text-right text-emerald-700 font-medium">+ {inr(dealNet)}</td></tr>
                <tr><td className="px-3 py-2">Payroll (Net)</td><td className="px-3 py-2 text-right text-red-700 font-medium">- {inr(payrollTotal)}</td></tr>
                <tr><td className="px-3 py-2">Operational Expenses</td><td className="px-3 py-2 text-right text-red-700 font-medium">- {inr(expenseTotal)}</td></tr>
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-3 py-2">Net Profit / Loss — {periodLabel}</td>
                  <td className={`px-3 py-2 text-right ${profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{profit >= 0 ? "+ " : "- "}{inr(Math.abs(profit))}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">Gross salary basis: {inr(grossSalaryTotal)} · Pending receivables not yet recognized as revenue.</p>
        </TabsContent>

        {/* PAYROLL */}
        <TabsContent value="payroll" className="mt-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Dept</th>
                  <th className="px-3 py-2 text-right">Gross</th><th className="px-3 py-2 text-right">Deductions</th>
                  <th className="px-3 py-2 text-right">TDS</th><th className="px-3 py-2 text-right">Net Salary</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payroll.filter((p: any) => filterText(p.employee_name)).map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{p.employee_name}<div className="text-[10px] text-slate-500">{p.designation || "—"}</div></td>
                    <td className="px-3 py-2">{p.department || "—"}</td>
                    <td className="px-3 py-2 text-right">{inr(p.gross_salary)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{inr(p.total_deductions)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{inr(p.tds)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{inr(p.net_salary)}</td>
                    <td className="px-3 py-2 text-center"><Badge variant={p.payment_status === "paid" ? "default" : "secondary"} className="text-[10px]">{p.payment_status}</Badge></td>
                  </tr>
                ))}
                {payroll.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No payroll for {periodLabel}</td></tr>}
                {payroll.length > 0 && (
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>TOTAL — {payroll.length} employees</td>
                    <td className="px-3 py-2 text-right">{inr(grossSalaryTotal)}</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right">{inr(payrollTotal)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* POLICIES */}
        <TabsContent value="policies" className="mt-4 space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-[11px] text-slate-500">💡 Edit the <b>%</b> column inline to override the default payout rate. TDS auto-recalculates.</p>
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => {
              buildMonthlyStatement({
                monthLabel: periodLabel, module: "insurance",
                rows: policyComputed.map((p: any) => ({
                  date: p.issued_date || p.start_date || "—",
                  reference: p.policy_number || p.id.slice(0, 8),
                  customer: p.insurance_clients?.customer_name || "—",
                  productOrType: `${p.policy_type} · ${p.insurer}`,
                  base: p._calc.base, pct: p._calc.pct, gross: p._calc.gross, tds: p._calc.tds, net: p._calc.net,
                })),
              });
            }}><FileSpreadsheet className="h-3 w-3" />Statement PDF</Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Policy #</th><th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Type / Insurer</th>
                  <th className="px-3 py-2 text-right">Net Premium</th>
                  <th className="px-3 py-2 text-center">Custom %</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">TDS</th>
                  <th className="px-3 py-2 text-right">Net Payout</th>
                  <th className="px-3 py-2 text-center">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {policyComputed.filter((p: any) => filterText(`${p.policy_number} ${p.insurance_clients?.customer_name || ""}`)).map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">{p.policy_number || p.id.slice(0, 8)}</td>
                    <td className="px-3 py-2">{p.insurance_clients?.customer_name || "—"}<div className="text-[10px] text-slate-500">{p.insurance_clients?.vehicle_number || ""}</div></td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px] capitalize">{p.policy_type}</Badge><div className="text-[10px] text-slate-500 mt-0.5">{p.insurer}</div></td>
                    <td
                      className="px-3 py-2 text-right"
                      title={
                        `Total Premium: ${inr(p._calc.breakup?.total_premium || 0)}\n` +
                        `Less GST ${p._calc.breakup?.gst_pct ?? 18}%:  -${inr(p._calc.breakup?.gst_amount ?? p._calc.breakup?.gst_18pct ?? 0)}\n` +
                        `Base (ex-GST): ${inr(p._calc.breakup?.base_ex_gst || 0)}\n` +
                        (p._calc.kind === "comprehensive"
                          ? `Less TP part: -${inr(p._calc.breakup?.tp_less || 0)}\n` +
                            `Less PA driver: -${inr(p._calc.breakup?.pa_less || 0)}\n`
                          : "") +
                        `Payable Base: ${inr(p._calc.base)}\n` +
                        `Payout %: ${p._calc.pct}%${p._calc.isCustom ? " (custom)" : ""}`
                      }
                    >
                      <div className="font-medium">{inr(p._calc.base)}</div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        {inr(p._calc.breakup?.total_premium || 0)} − {p._calc.breakup?.gst_pct ?? 18}% GST
                        {p._calc.kind === "comprehensive" && (p._calc.breakup?.tp_less || 0) > 0 && " − TP"}
                        {p._calc.kind === "comprehensive" && (p._calc.breakup?.pa_less || 0) > 0 && " − PA"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={p._calc.pct}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setPolicyOverrides(prev => ({ ...prev, [p.id]: isNaN(v) ? 0 : v }));
                          }}
                          className={`h-6 w-16 text-[11px] text-right px-1 ${p._calc.isCustom ? "border-amber-400 bg-amber-50 font-semibold text-amber-700" : "text-blue-700"}`}
                        />
                        <span className="text-[10px] text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{inr(p._calc.gross)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{inr(p._calc.tds)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">{inr(p._calc.net)}</td>
                    <td className="px-3 py-2 text-center">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => buildRowInvoice({
                        module: "insurance", reference: p.policy_number || p.id.slice(0, 8),
                        customer: p.insurance_clients?.customer_name || "—",
                        meta: [["Insurer", p.insurer], ["Type", p.policy_type], ["Vehicle", p.insurance_clients?.vehicle_number || "—"], ["Issued", p.issued_date || "—"], ["Payout %", `${p._calc.pct}%${p._calc.isCustom ? " (custom)" : ""}`]],
                        base: { label: "Net Premium", amount: p._calc.base }, pct: p._calc.pct, gross: p._calc.gross, tds: p._calc.tds, net: p._calc.net,
                      })}><FileDown className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {policies.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">No policies issued in {periodLabel}</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* LOANS */}
        <TabsContent value="loans" className="mt-4 space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-[11px] text-slate-500">💡 Edit the <b>%</b> column inline to override default. TDS auto-recalculates.</p>
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => {
              buildMonthlyStatement({
                monthLabel: periodLabel, module: "loan",
                rows: loanComputed.map((l: any) => ({
                  date: l.disbursement_date || "—",
                  reference: l.disbursement_reference || l.id.slice(0, 8),
                  customer: l.customer_name || "—",
                  productOrType: `${l.lender_name || "—"} · ${l.car_model || "—"}`,
                  base: l._calc.base, pct: l._calc.pct, gross: l._calc.gross, tds: l._calc.tds, net: l._calc.net,
                })),
              });
            }}><FileSpreadsheet className="h-3 w-3" />Statement PDF</Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Bank / Car</th>
                  <th className="px-3 py-2 text-right">Net Disbursement</th>
                  <th className="px-3 py-2 text-center">Custom %</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">TDS</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2 text-center">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loanComputed.filter((l: any) => filterText(`${l.customer_name || ""} ${l.disbursement_reference || ""}`)).map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{l.customer_name}<div className="text-[10px] text-slate-500">{l.phone}</div></td>
                    <td className="px-3 py-2">{l.lender_name || "—"}<div className="text-[10px] text-slate-500">{l.car_model || ""}</div></td>
                    <td className="px-3 py-2 text-right">{inr(l._calc.base)}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={l._calc.pct}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setLoanOverrides(prev => ({ ...prev, [l.id]: isNaN(v) ? 0 : v }));
                          }}
                          className={`h-6 w-16 text-[11px] text-right px-1 ${l._calc.isCustom ? "border-amber-400 bg-amber-50 font-semibold text-amber-700" : "text-blue-700"}`}
                        />
                        <span className="text-[10px] text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{inr(l._calc.gross)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{inr(l._calc.tds)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">{inr(l._calc.net)}</td>
                    <td className="px-3 py-2 text-center">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => buildRowInvoice({
                        module: "loan", reference: l.disbursement_reference || l.id.slice(0, 8),
                        customer: l.customer_name || "—",
                        meta: [["Bank", l.lender_name || "—"], ["Car", l.car_model || "—"], ["Sanction", String(l.sanction_amount || "—")], ["Disbursed", l.disbursement_date || "—"], ["Payout %", `${l._calc.pct}%${l._calc.isCustom ? " (custom)" : ""}`]],
                        base: { label: "Net Disbursement", amount: l._calc.base }, pct: l._calc.pct, gross: l._calc.gross, tds: l._calc.tds, net: l._calc.net,
                      })}><FileDown className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {loans.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">No disbursements in {periodLabel}</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* DEALS */}
        <TabsContent value="deals" className="mt-4 space-y-2">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => {
              buildMonthlyStatement({
                monthLabel: periodLabel, module: "deal",
                rows: dealComputed.map((d: any) => ({
                  date: d.created_at?.slice(0, 10) || "—",
                  reference: d.deal_number || d.id.slice(0, 8),
                  customer: d.master_customers?.name || "—",
                  productOrType: d.vertical_name || "—",
                  base: d._calc.dealValue, pct: d._calc.pct, gross: d._calc.grossMargin, tds: d._calc.tds, net: d._calc.net,
                })),
              });
            }}><FileSpreadsheet className="h-3 w-3" />Statement PDF</Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Deal #</th>
                  <th className="px-3 py-2 text-left">Customer · Vertical</th>
                  <th className="px-3 py-2 text-right">Deal Value</th>
                  <th className="px-3 py-2 text-right">Dealer Payout</th>
                  <th className="px-3 py-2 text-right">Gross Margin</th>
                  <th className="px-3 py-2 text-right">% Margin</th>
                  <th className="px-3 py-2 text-right">TDS</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2 text-right">Received / Pending</th>
                  <th className="px-3 py-2 text-center">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dealComputed.filter((d: any) => filterVert(d.vertical_name) && filterText(`${d.deal_number || ""} ${d.master_customers?.name || ""}`)).map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">{d.deal_number || d.id.slice(0, 8)}</td>
                    <td className="px-3 py-2">{d.master_customers?.name || "—"}<div className="text-[10px] text-slate-500">{d.vertical_name}</div></td>
                    <td className="px-3 py-2 text-right">{inr(d._calc.dealValue)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{inr(d._calc.dealerPayout)}</td>
                    <td className="px-3 py-2 text-right">{inr(d._calc.grossMargin)}</td>
                    <td className="px-3 py-2 text-right font-medium text-blue-700">{d._calc.pct.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right text-red-600">{inr(d._calc.tds)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">{inr(d._calc.net)}</td>
                    <td className="px-3 py-2 text-right text-[11px]">
                      <span className="text-emerald-700">{inr(d._calc.received)}</span> / <span className="text-amber-700">{inr(d._calc.pending)}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => buildRowInvoice({
                        module: "deal", reference: d.deal_number || d.id.slice(0, 8),
                        customer: d.master_customers?.name || "—",
                        meta: [["Vertical", d.vertical_name || "—"], ["Deal Value", inr(d._calc.dealValue)], ["Received", inr(d._calc.received)], ["Pending", inr(d._calc.pending)]],
                        base: { label: "Gross Margin", amount: d._calc.grossMargin }, pct: d._calc.pct, gross: d._calc.grossMargin, tds: d._calc.tds, net: d._calc.net,
                      })}><FileDown className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {deals.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">No deals in {periodLabel}</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* INVOICES */}
        <TabsContent value="invoices" className="mt-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Client</th><th className="px-3 py-2 text-left">Vertical</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Paid</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.filter((i: any) => filterVert(i.vertical_name) && filterText(`${i.invoice_number} ${i.client_name}`)).map((i: any) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">{i.invoice_number}</td>
                    <td className="px-3 py-2">{i.invoice_date}</td>
                    <td className="px-3 py-2">{i.client_name}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{i.vertical_name || "—"}</Badge></td>
                    <td className="px-3 py-2 text-right">{inr(i.total_amount)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{inr(i.amount_paid)}</td>
                    <td className="px-3 py-2 text-right text-amber-700">{inr(i.balance_due)}</td>
                    <td className="px-3 py-2 text-center"><Badge variant={i.status === "paid" ? "default" : "secondary"} className="text-[10px]">{i.status}</Badge></td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">No invoices in {periodLabel}</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TEAM TARGETS & EMPLOYEE PERFORMANCE */}
        <TabsContent value="team" className="mt-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Member</th>
                  <th className="px-3 py-2 text-left">Vertical</th>
                  <th className="px-3 py-2 text-left">Month</th>
                  <th className="px-3 py-2 text-right">Target</th>
                  <th className="px-3 py-2 text-right">Achieved</th>
                  <th className="px-3 py-2 text-right">Revenue Target</th>
                  <th className="px-3 py-2 text-right">Revenue Achieved</th>
                  <th className="px-3 py-2 text-right">% Achieved</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {targets.filter((t: any) => filterVert(t.vertical_name) && filterText(t.team_member_name)).map((t: any) => {
                  const pct = Number(t.achievement_pct || 0);
                  const status = pct >= 100 ? { label: "Exceeded", cls: "bg-emerald-100 text-emerald-700" } : pct >= 80 ? { label: "On Track", cls: "bg-blue-100 text-blue-700" } : pct >= 50 ? { label: "At Risk", cls: "bg-amber-100 text-amber-700" } : { label: "Behind", cls: "bg-red-100 text-red-700" };
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{t.team_member_name}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{t.vertical_name}</Badge></td>
                      <td className="px-3 py-2 text-[10px] text-slate-500">{t.month_year}</td>
                      <td className="px-3 py-2 text-right">{t.target_count}</td>
                      <td className="px-3 py-2 text-right font-semibold">{t.achieved_count}</td>
                      <td className="px-3 py-2 text-right">{inr(t.target_revenue)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{inr(t.achieved_revenue)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{pct.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-center"><span className={`text-[10px] px-2 py-0.5 rounded ${status.cls}`}>{status.label}</span></td>
                    </tr>
                  );
                })}
                {targets.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">No targets set for {periodLabel}. Configure them in CFO → Team Targets.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </SectionCard>
  );
};

export default FounderMasterReportHub;
