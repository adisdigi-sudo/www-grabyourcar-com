import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wallet, Users, Shield, Banknote, Car, FileText, Target, FileDown,
  TrendingUp, TrendingDown, Search, Filter, FileSpreadsheet, BarChart3,
} from "lucide-react";
import { SectionCard } from "../shared/SectionCard";
import { StatTile } from "../shared/StatTile";
import {
  computeInsurancePayout, computeLoanPayout, computeDealPayout, inr, RuleRow,
} from "../shared/payoutEngine";
import { buildRowInvoice, buildMonthlyStatement } from "../shared/founderReportPDF";

const ymOptions = () => {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") });
  }
  return out;
};

export const FounderMasterReportHub = () => {
  const [ym, setYm] = useState(format(new Date(), "yyyy-MM"));
  const [vertical, setVertical] = useState<string>("all");
  const [search, setSearch] = useState("");

  const periodStart = startOfMonth(new Date(ym + "-01")).toISOString().slice(0, 10);
  const periodEnd = endOfMonth(new Date(ym + "-01")).toISOString().slice(0, 10);
  const monthLabel = format(new Date(ym + "-01"), "MMMM yyyy");

  /* ---------- DATA ---------- */
  const { data: rules = [] } = useQuery({
    queryKey: ["founder-commission-rules"],
    queryFn: async () => {
      const { data } = await (supabase.from("commission_rules") as any).select("*").eq("is_active", true);
      return (data || []) as RuleRow[];
    },
  });

  const { data: payroll = [] } = useQuery({
    queryKey: ["founder-payroll", ym],
    queryFn: async () => {
      const { data } = await (supabase.from("payroll_records") as any)
        .select("*").eq("payroll_month", ym).order("net_salary", { ascending: false });
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["founder-expenses", ym],
    queryFn: async () => {
      const { data } = await (supabase.from("expenses") as any).select("*")
        .gte("expense_date", periodStart).lte("expense_date", periodEnd);
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["founder-invoices", ym],
    queryFn: async () => {
      const { data } = await (supabase.from("invoices") as any).select("*")
        .gte("invoice_date", periodStart).lte("invoice_date", periodEnd)
        .order("invoice_date", { ascending: false });
      return data || [];
    },
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["founder-policies", ym],
    queryFn: async () => {
      const { data } = await (supabase.from("insurance_policies") as any)
        .select("*, insurance_clients(customer_name, vehicle_number, phone, assigned_executive)")
        .gte("issued_date", periodStart).lte("issued_date", periodEnd)
        .order("issued_date", { ascending: false });
      return data || [];
    },
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["founder-loans", ym],
    queryFn: async () => {
      const { data } = await (supabase.from("loan_applications") as any).select("*")
        .gte("disbursement_date", periodStart).lte("disbursement_date", periodEnd)
        .order("disbursement_date", { ascending: false });
      return data || [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["founder-deals", ym],
    queryFn: async () => {
      const { data } = await (supabase.from("deals") as any)
        .select("*, master_customers(name, phone)")
        .gte("created_at", periodStart + "T00:00:00").lte("created_at", periodEnd + "T23:59:59")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["founder-targets", ym],
    queryFn: async () => {
      const { data } = await (supabase.from("team_targets") as any).select("*")
        .eq("month_year", ym).order("achievement_pct", { ascending: false });
      return data || [];
    },
  });

  /* ---------- COMPUTATIONS ---------- */
  const payrollTotal = payroll.reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
  const grossSalaryTotal = payroll.reduce((s: number, p: any) => s + Number(p.gross_salary || 0), 0);
  const expenseTotal = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const revenueTotal = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const receivablesTotal = invoices.filter((i: any) => i.status !== "paid").reduce((s: number, i: any) => s + Number(i.balance_due || i.total_amount || 0), 0);

  const policyComputed = useMemo(() => policies.map((p: any) => ({ ...p, _calc: computeInsurancePayout(p, rules) })), [policies, rules]);
  const loanComputed = useMemo(() => loans.map((l: any) => ({ ...l, _calc: computeLoanPayout(l, rules) })), [loans, rules]);
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
      description="Month-wise: P&L · Payroll · Policies · Loans · Deals · Invoices · Team — every rupee, every record."
      icon={BarChart3}
      className="lg:col-span-3"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={ym} onValueChange={setYm}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ymOptions().map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
        <StatTile label="Revenue (Paid)" value={inr(revenueTotal)} icon={TrendingUp} trend="up" trendLabel={`${invoices.filter((i:any)=>i.status==="paid").length} inv`} />
        <StatTile label="Receivables" value={inr(receivablesTotal)} icon={FileText} trend={receivablesTotal>0?"down":"neutral"} trendLabel={`${invoices.filter((i:any)=>i.status!=="paid").length} pending`} />
        <StatTile label="Payroll" value={inr(payrollTotal)} icon={Users} hint={`${payroll.length} emp`} />
        <StatTile label="Expenses" value={inr(expenseTotal)} icon={Wallet} hint={`${expenses.length} entries`} />
        <StatTile label="Total Incentives Earned" value={inr(incentiveTotal)} icon={Target} trend="up" trendLabel="Net of TDS" />
        <StatTile label="Net P&L" value={inr(Math.abs(profit))} icon={profit>=0?TrendingUp:TrendingDown} trend={profit>=0?"up":"down"} trendLabel={profit>=0?"Surplus":"Deficit"} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-4 p-3 rounded-lg border bg-slate-50/50">
        <Filter className="h-3.5 w-3.5 text-slate-500"/>
        <Select value={vertical} onValueChange={setVertical}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Vertical"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Verticals</SelectItem>
            {verticals.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
          <Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search customer, ref, employee…" className="h-8 pl-7 text-xs"/>
        </div>
      </div>

      <Tabs defaultValue="pnl" className="w-full">
        <TabsList className="grid grid-cols-7 h-9">
          <TabsTrigger value="pnl" className="text-xs gap-1"><BarChart3 className="h-3 w-3"/>P&L</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs gap-1"><Users className="h-3 w-3"/>Payroll</TabsTrigger>
          <TabsTrigger value="policies" className="text-xs gap-1"><Shield className="h-3 w-3"/>Policies</TabsTrigger>
          <TabsTrigger value="loans" className="text-xs gap-1"><Banknote className="h-3 w-3"/>Loans</TabsTrigger>
          <TabsTrigger value="deals" className="text-xs gap-1"><Car className="h-3 w-3"/>Deals</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs gap-1"><FileText className="h-3 w-3"/>Invoices</TabsTrigger>
          <TabsTrigger value="team" className="text-xs gap-1"><Target className="h-3 w-3"/>Team</TabsTrigger>
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
                  <td className="px-3 py-2">Net Profit / Loss — {monthLabel}</td>
                  <td className={`px-3 py-2 text-right ${profit>=0?"text-emerald-700":"text-red-700"}`}>{profit>=0?"+ ":"- "}{inr(Math.abs(profit))}</td>
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
                {payroll.filter((p:any)=>filterText(p.employee_name)).map((p:any)=>(
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{p.employee_name}<div className="text-[10px] text-slate-500">{p.designation||"—"}</div></td>
                    <td className="px-3 py-2">{p.department||"—"}</td>
                    <td className="px-3 py-2 text-right">{inr(p.gross_salary)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{inr(p.total_deductions)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{inr(p.tds)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{inr(p.net_salary)}</td>
                    <td className="px-3 py-2 text-center"><Badge variant={p.payment_status==="paid"?"default":"secondary"} className="text-[10px]">{p.payment_status}</Badge></td>
                  </tr>
                ))}
                {payroll.length===0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No payroll for {monthLabel}</td></tr>}
                {payroll.length>0 && (
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>TOTAL — {payroll.length} employees</td>
                    <td className="px-3 py-2 text-right">{inr(grossSalaryTotal)}</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right">{inr(payrollTotal)}</td>
                    <td/>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* POLICIES */}
        <TabsContent value="policies" className="mt-4 space-y-2">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={()=>{
              buildMonthlyStatement({ monthLabel, module:"insurance",
                rows: policyComputed.map((p:any)=>({
                  date: p.issued_date || p.start_date || "—",
                  reference: p.policy_number || p.id.slice(0,8),
                  customer: p.insurance_clients?.customer_name || "—",
                  productOrType: `${p.policy_type} · ${p.insurer}`,
                  base: p._calc.base, pct: p._calc.pct, gross: p._calc.gross, tds: p._calc.tds, net: p._calc.net,
                })),
              });
            }}><FileSpreadsheet className="h-3 w-3"/>Monthly Statement PDF</Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Policy #</th><th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Type / Insurer</th>
                  <th className="px-3 py-2 text-right">Net Premium</th>
                  <th className="px-3 py-2 text-right">%</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">TDS</th>
                  <th className="px-3 py-2 text-right">Net Payout</th>
                  <th className="px-3 py-2 text-center">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {policyComputed.filter((p:any)=>filterText(`${p.policy_number} ${p.insurance_clients?.customer_name||""}`)).map((p:any)=>(
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">{p.policy_number||p.id.slice(0,8)}</td>
                    <td className="px-3 py-2">{p.insurance_clients?.customer_name||"—"}<div className="text-[10px] text-slate-500">{p.insurance_clients?.vehicle_number||""}</div></td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px] capitalize">{p.policy_type}</Badge><div className="text-[10px] text-slate-500 mt-0.5">{p.insurer}</div></td>
                    <td className="px-3 py-2 text-right">{inr(p._calc.base)}</td>
                    <td className="px-3 py-2 text-right font-medium text-blue-700">{p._calc.pct}%</td>
                    <td className="px-3 py-2 text-right">{inr(p._calc.gross)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{inr(p._calc.tds)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">{inr(p._calc.net)}</td>
                    <td className="px-3 py-2 text-center">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={()=>buildRowInvoice({
                        module:"insurance", reference: p.policy_number||p.id.slice(0,8),
                        customer: p.insurance_clients?.customer_name||"—",
                        meta: [["Insurer", p.insurer], ["Type", p.policy_type], ["Vehicle", p.insurance_clients?.vehicle_number||"—"], ["Issued", p.issued_date||"—"]],
                        base:{label:"Net Premium", amount: p._calc.base}, pct:p._calc.pct, gross:p._calc.gross, tds:p._calc.tds, net:p._calc.net,
                      })}><FileDown className="h-3.5 w-3.5"/></Button>
                    </td>
                  </tr>
                ))}
                {policies.length===0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">No policies issued in {monthLabel}</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* LOANS */}
        <TabsContent value="loans" className="mt-4 space-y-2">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={()=>{
              buildMonthlyStatement({ monthLabel, module:"loan",
                rows: loanComputed.map((l:any)=>({
                  date: l.disbursement_date || "—",
                  reference: l.disbursement_reference || l.id.slice(0,8),
                  customer: l.customer_name || "—",
                  productOrType: `${l.lender_name||"—"} · ${l.car_model||"—"}`,
                  base: l._calc.base, pct: l._calc.pct, gross: l._calc.gross, tds: l._calc.tds, net: l._calc.net,
                })),
              });
            }}><FileSpreadsheet className="h-3 w-3"/>Monthly Statement PDF</Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Bank / Car</th>
                  <th className="px-3 py-2 text-right">Net Disbursement</th>
                  <th className="px-3 py-2 text-right">% Payout</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">TDS</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2 text-center">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loanComputed.filter((l:any)=>filterText(`${l.customer_name||""} ${l.disbursement_reference||""}`)).map((l:any)=>(
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{l.customer_name}<div className="text-[10px] text-slate-500">{l.phone}</div></td>
                    <td className="px-3 py-2">{l.lender_name||"—"}<div className="text-[10px] text-slate-500">{l.car_model||""}</div></td>
                    <td className="px-3 py-2 text-right">{inr(l._calc.base)}</td>
                    <td className="px-3 py-2 text-right font-medium text-blue-700">{l._calc.pct}%</td>
                    <td className="px-3 py-2 text-right">{inr(l._calc.gross)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{inr(l._calc.tds)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">{inr(l._calc.net)}</td>
                    <td className="px-3 py-2 text-center">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={()=>buildRowInvoice({
                        module:"loan", reference: l.disbursement_reference||l.id.slice(0,8),
                        customer: l.customer_name||"—",
                        meta: [["Bank", l.lender_name||"—"],["Car", l.car_model||"—"],["Sanction", String(l.sanction_amount||"—")],["Disbursed", l.disbursement_date||"—"]],
                        base:{label:"Net Disbursement", amount: l._calc.base}, pct:l._calc.pct, gross:l._calc.gross, tds:l._calc.tds, net:l._calc.net,
                      })}><FileDown className="h-3.5 w-3.5"/></Button>
                    </td>
                  </tr>
                ))}
                {loans.length===0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">No disbursements in {monthLabel}</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* DEALS */}
        <TabsContent value="deals" className="mt-4 space-y-2">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={()=>{
              buildMonthlyStatement({ monthLabel, module:"deal",
                rows: dealComputed.map((d:any)=>({
                  date: d.created_at?.slice(0,10) || "—",
                  reference: d.deal_number || d.id.slice(0,8),
                  customer: d.master_customers?.name || "—",
                  productOrType: d.vertical_name || "—",
                  base: d._calc.dealValue, pct: d._calc.pct, gross: d._calc.grossMargin, tds: d._calc.tds, net: d._calc.net,
                })),
              });
            }}><FileSpreadsheet className="h-3 w-3"/>Monthly Statement PDF</Button>
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
                {dealComputed.filter((d:any)=>filterVert(d.vertical_name) && filterText(`${d.deal_number||""} ${d.master_customers?.name||""}`)).map((d:any)=>(
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">{d.deal_number||d.id.slice(0,8)}</td>
                    <td className="px-3 py-2">{d.master_customers?.name||"—"}<div className="text-[10px] text-slate-500">{d.vertical_name}</div></td>
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
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={()=>buildRowInvoice({
                        module:"deal", reference: d.deal_number||d.id.slice(0,8),
                        customer: d.master_customers?.name||"—",
                        meta:[["Vertical", d.vertical_name||"—"],["Deal Value", inr(d._calc.dealValue)],["Received", inr(d._calc.received)],["Pending", inr(d._calc.pending)]],
                        base:{label:"Gross Margin", amount: d._calc.grossMargin}, pct:d._calc.pct, gross:d._calc.grossMargin, tds:d._calc.tds, net:d._calc.net,
                      })}><FileDown className="h-3.5 w-3.5"/></Button>
                    </td>
                  </tr>
                ))}
                {deals.length===0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">No deals in {monthLabel}</td></tr>}
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
                {invoices.filter((i:any)=>filterVert(i.vertical_name) && filterText(`${i.invoice_number} ${i.client_name}`)).map((i:any)=>(
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">{i.invoice_number}</td>
                    <td className="px-3 py-2">{i.invoice_date}</td>
                    <td className="px-3 py-2">{i.client_name}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{i.vertical_name||"—"}</Badge></td>
                    <td className="px-3 py-2 text-right">{inr(i.total_amount)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{inr(i.amount_paid)}</td>
                    <td className="px-3 py-2 text-right text-amber-700">{inr(i.balance_due)}</td>
                    <td className="px-3 py-2 text-center"><Badge variant={i.status==="paid"?"default":"secondary"} className="text-[10px]">{i.status}</Badge></td>
                  </tr>
                ))}
                {invoices.length===0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">No invoices in {monthLabel}</td></tr>}
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
                  <th className="px-3 py-2 text-right">Target</th>
                  <th className="px-3 py-2 text-right">Achieved</th>
                  <th className="px-3 py-2 text-right">Revenue Target</th>
                  <th className="px-3 py-2 text-right">Revenue Achieved</th>
                  <th className="px-3 py-2 text-right">% Achieved</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {targets.filter((t:any)=>filterVert(t.vertical_name) && filterText(t.team_member_name)).map((t:any)=>{
                  const pct = Number(t.achievement_pct||0);
                  const status = pct >= 100 ? {label:"Exceeded", cls:"bg-emerald-100 text-emerald-700"} : pct >= 80 ? {label:"On Track", cls:"bg-blue-100 text-blue-700"} : pct >= 50 ? {label:"At Risk", cls:"bg-amber-100 text-amber-700"} : {label:"Behind", cls:"bg-red-100 text-red-700"};
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{t.team_member_name}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{t.vertical_name}</Badge></td>
                      <td className="px-3 py-2 text-right">{t.target_count}</td>
                      <td className="px-3 py-2 text-right font-semibold">{t.achieved_count}</td>
                      <td className="px-3 py-2 text-right">{inr(t.target_revenue)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{inr(t.achieved_revenue)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{pct.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-center"><span className={`text-[10px] px-2 py-0.5 rounded ${status.cls}`}>{status.label}</span></td>
                    </tr>
                  );
                })}
                {targets.length===0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">No targets set for {monthLabel}. Configure them in CFO → Team Targets.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </SectionCard>
  );
};

export default FounderMasterReportHub;
