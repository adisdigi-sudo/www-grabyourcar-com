import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { Period, PERIOD_LABELS, expandAll, fmtINR } from "./periodMath";

type RangeKey = "month" | "quarter" | "half" | "year";

const RANGE_LABELS: Record<RangeKey, string> = {
  month: "Monthly", quarter: "Quarterly", half: "Half-Yearly", year: "Yearly",
};

const PERIOD_FOR_RANGE: Record<RangeKey, Period> = {
  month: "monthly", quarter: "quarterly", half: "half_yearly", year: "yearly",
};

const startOf = (k: RangeKey): Date => {
  const d = new Date();
  switch (k) {
    case "month": return new Date(d.getFullYear(), d.getMonth(), 1);
    case "quarter": return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
    case "half": return new Date(d.getFullYear(), d.getMonth() < 6 ? 0 : 6, 1);
    case "year": return new Date(d.getFullYear(), 0, 1);
  }
};

const VERTICAL_LIST = ["Insurance", "Car Sales", "Car Loans", "HSRP", "Self Drive Rental", "Accessories"];

export const UnifiedPLTab = () => {
  const [range, setRange] = useState<RangeKey>("month");
  const since = useMemo(() => startOf(range).toISOString(), [range]);
  const sinceDate = useMemo(() => startOf(range).toISOString().split("T")[0], [range]);
  const period = PERIOD_FOR_RANGE[range];

  // Spend plans (planned expenses)
  const { data: plans = [] } = useQuery({
    queryKey: ["pl-plans"],
    queryFn: async () => {
      const { data } = await (supabase.from("spend_plans") as any)
        .select("*").eq("is_active", true);
      return data || [];
    },
  });

  // Actual expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ["pl-expenses", since],
    queryFn: async () => {
      const { data } = await supabase.from("expenses")
        .select("amount, vertical_name, expense_type, expense_date")
        .gte("expense_date", sinceDate);
      return data || [];
    },
  });

  // Payroll for the period
  const { data: payrolls = [] } = useQuery({
    queryKey: ["pl-payroll", since],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_records")
        .select("net_salary, vertical_name, created_at")
        .gte("created_at", since);
      return data || [];
    },
  });

  // Revenue sources
  const { data: policies = [] } = useQuery({
    queryKey: ["pl-policies", since],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_policies")
        .select("premium_amount, status, created_at").eq("status", "active").gte("created_at", since);
      return data || [];
    },
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["pl-loans", since],
    queryFn: async () => {
      const { data } = await (supabase.from("loan_applications") as any)
        .select("loan_amount, status, created_at").gte("created_at", since);
      return data || [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["pl-deals", since],
    queryFn: async () => {
      const { data } = await (supabase.from("deals") as any)
        .select("payment_received_amount, deal_value, payment_status, vertical_name, created_at")
        .eq("payment_status", "received").gte("created_at", since);
      return data || [];
    },
  });

  const { data: hsrp = [] } = useQuery({
    queryKey: ["pl-hsrp", since],
    queryFn: async () => {
      const { data } = await (supabase.from("hsrp_bookings") as any)
        .select("payment_amount, service_price, payment_status, created_at")
        .eq("payment_status", "paid").gte("created_at", since);
      return data || [];
    },
  });

  const { data: rentals = [] } = useQuery({
    queryKey: ["pl-rentals", since],
    queryFn: async () => {
      const { data } = await (supabase.from("rental_bookings") as any)
        .select("total_amount, payment_status, created_at")
        .eq("payment_status", "paid").gte("created_at", since);
      return data || [];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["pl-orders", since],
    queryFn: async () => {
      const { data } = await (supabase.from("accessory_orders") as any)
        .select("total_amount, payment_status, created_at")
        .eq("payment_status", "paid").gte("created_at", since);
      return data || [];
    },
  });

  const board = useMemo(() => {
    const sumPlanForVertical = (vName: string) => {
      // Convert each plan to the selected period
      return plans
        .filter((p: any) => (p.vertical || "General") === vName)
        .reduce((s: number, p: any) => s + expandAll(Number(p.base_amount), p.base_period)[period], 0);
    };

    const sumExpensesForVertical = (vName: string) =>
      expenses
        .filter((e: any) => (e.vertical_name || "General") === vName)
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

    const sumPayrollForVertical = (vName: string) =>
      payrolls
        .filter((p: any) => (p.vertical_name || "General") === vName)
        .reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);

    const revenueByVertical: Record<string, number> = {
      Insurance: policies.reduce((s: number, p: any) => s + Number(p.premium_amount || 0), 0),
      "Car Loans": loans
        .filter((l: any) => ["approved", "disbursed"].includes(String(l.status).toLowerCase()))
        .reduce((s: number, l: any) => s + Number(l.loan_amount || 0), 0),
      "Car Sales": deals.reduce((s: number, d: any) => s + Number(d.payment_received_amount || d.deal_value || 0), 0),
      HSRP: hsrp.reduce((s: number, h: any) => s + Number(h.payment_amount || h.service_price || 0), 0),
      "Self Drive Rental": rentals.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0),
      Accessories: orders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0),
    };

    return VERTICAL_LIST.map(v => {
      const revenue = revenueByVertical[v] || 0;
      const planned = sumPlanForVertical(v);
      const actualExpenses = sumExpensesForVertical(v);
      const salaries = sumPayrollForVertical(v);
      const totalSpent = actualExpenses + salaries;
      const grossProfit = revenue - actualExpenses;
      const netProfit = revenue - totalSpent;
      const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      const variance = planned - totalSpent; // positive = under budget
      return {
        vertical: v, revenue, planned, actualExpenses, salaries,
        totalSpent, grossProfit, netProfit, margin, variance,
      };
    });
  }, [plans, expenses, payrolls, policies, loans, deals, hsrp, rentals, orders, period]);

  const totals = board.reduce((acc, r) => ({
    revenue: acc.revenue + r.revenue,
    planned: acc.planned + r.planned,
    actualExpenses: acc.actualExpenses + r.actualExpenses,
    salaries: acc.salaries + r.salaries,
    totalSpent: acc.totalSpent + r.totalSpent,
    netProfit: acc.netProfit + r.netProfit,
  }), { revenue: 0, planned: 0, actualExpenses: 0, salaries: 0, totalSpent: 0, netProfit: 0 });

  const overallMargin = totals.revenue > 0 ? (totals.netProfit / totals.revenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">View as</Label>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as RangeKey[]).map(k => (
                <SelectItem key={k} value={k}>{RANGE_LABELS[k]} ({PERIOD_LABELS[PERIOD_FOR_RANGE[k]]})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">Live data since {sinceDate}</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{fmtINR(totals.revenue)}</p>
            <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="h-3 w-3 text-emerald-500" /><span className="text-[11px] text-muted-foreground">earned</span></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="text-xl font-bold text-red-700 mt-1">{fmtINR(totals.totalSpent)}</p>
            <div className="flex items-center gap-1 mt-1"><ArrowDownRight className="h-3 w-3 text-red-500" /><span className="text-[11px] text-muted-foreground">expenses + salaries</span></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Planned Budget</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{fmtINR(totals.planned)}</p>
            <div className="flex items-center gap-1 mt-1"><Wallet className="h-3 w-3 text-blue-500" /><span className="text-[11px] text-muted-foreground">{PERIOD_LABELS[period]}</span></div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${totals.netProfit >= 0 ? "border-l-emerald-600" : "border-l-red-600"}`}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Net Profit / Loss</p>
            <p className={`text-xl font-bold mt-1 ${totals.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {fmtINR(totals.netProfit)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {totals.netProfit >= 0
                ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                : <TrendingDown className="h-3 w-3 text-red-500" />}
              <span className="text-[11px] text-muted-foreground">Margin {overallMargin.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CFO equation banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-4 flex-wrap text-sm">
            <span className="font-semibold text-emerald-700">{fmtINR(totals.revenue)} Revenue</span>
            <span className="text-muted-foreground">−</span>
            <span className="font-semibold text-red-700">{fmtINR(totals.totalSpent)} Expenses</span>
            <span className="text-muted-foreground">=</span>
            <Badge className={totals.netProfit >= 0 ? "bg-emerald-600" : "bg-red-600"}>
              {totals.netProfit >= 0 ? "Profit" : "Loss"}: {fmtINR(Math.abs(totals.netProfit))}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Per vertical P&L */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Per-Vertical P&L ({RANGE_LABELS[range]})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vertical</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Salaries</TableHead>
                <TableHead className="text-right">Other Expenses</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Net P/L</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {board.map(r => (
                <TableRow key={r.vertical}>
                  <TableCell className="font-medium">{r.vertical}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtINR(r.revenue)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-blue-700">{fmtINR(r.planned)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtINR(r.salaries)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtINR(r.actualExpenses)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmtINR(r.totalSpent)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    <span className={r.variance >= 0 ? "text-emerald-700" : "text-red-700"}>
                      {r.variance >= 0 ? "+" : ""}{fmtINR(r.variance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold">
                    <span className={r.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}>
                      {fmtINR(r.netProfit)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={r.margin >= 0 ? "default" : "destructive"} className="text-xs">
                      {r.margin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtINR(totals.revenue)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-blue-700">{fmtINR(totals.planned)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtINR(totals.salaries)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtINR(totals.actualExpenses)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtINR(totals.totalSpent)}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  <span className={(totals.planned - totals.totalSpent) >= 0 ? "text-emerald-700" : "text-red-700"}>
                    {fmtINR(totals.planned - totals.totalSpent)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">
                  <span className={totals.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}>
                    {fmtINR(totals.netProfit)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={overallMargin >= 0 ? "default" : "destructive"}>
                    {overallMargin.toFixed(1)}%
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
