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
import { Trophy, Target, TrendingUp } from "lucide-react";
import { fmtINR } from "./periodMath";

type RangeKey = "today" | "week" | "month" | "quarter" | "half" | "year";

const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  quarter: "This Quarter",
  half: "This Half-Year",
  year: "This Year",
};

const startOf = (k: RangeKey): Date => {
  const d = new Date();
  switch (k) {
    case "today": d.setHours(0, 0, 0, 0); return d;
    case "week": {
      const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const x = new Date(d); x.setDate(diff); x.setHours(0, 0, 0, 0); return x;
    }
    case "month": return new Date(d.getFullYear(), d.getMonth(), 1);
    case "quarter": {
      const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1);
    }
    case "half": {
      const h = d.getMonth() < 6 ? 0 : 6; return new Date(d.getFullYear(), h, 1);
    }
    case "year": return new Date(d.getFullYear(), 0, 1);
  }
};

export const AchievementsTab = () => {
  const [range, setRange] = useState<RangeKey>("month");
  const since = useMemo(() => startOf(range).toISOString(), [range]);
  const sinceDate = useMemo(() => startOf(range).toISOString().split("T")[0], [range]);

  // Insurance policies issued
  const { data: policies = [] } = useQuery({
    queryKey: ["ach-policies", since],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_policies")
        .select("id, premium_amount, status, issued_date, created_at")
        .gte("created_at", since);
      return data || [];
    },
  });

  // Loans disbursed
  const { data: loans = [] } = useQuery({
    queryKey: ["ach-loans", since],
    queryFn: async () => {
      const { data } = await (supabase.from("loan_applications") as any)
        .select("id, loan_amount, status, created_at")
        .gte("created_at", since);
      return data || [];
    },
  });

  // Car deals
  const { data: deals = [] } = useQuery({
    queryKey: ["ach-deals", since],
    queryFn: async () => {
      const { data } = await (supabase.from("deals") as any)
        .select("id, deal_value, payment_received_amount, payment_status, vertical_name, created_at")
        .gte("created_at", since);
      return data || [];
    },
  });

  // HSRP bookings
  const { data: hsrp = [] } = useQuery({
    queryKey: ["ach-hsrp", since],
    queryFn: async () => {
      const { data } = await (supabase.from("hsrp_bookings") as any)
        .select("id, payment_amount, service_price, payment_status, created_at")
        .gte("created_at", since);
      return data || [];
    },
  });

  // Rentals
  const { data: rentals = [] } = useQuery({
    queryKey: ["ach-rentals", since],
    queryFn: async () => {
      const { data } = await (supabase.from("rental_bookings") as any)
        .select("id, total_amount, payment_status, created_at")
        .gte("created_at", since);
      return data || [];
    },
  });

  // Accessories orders
  const { data: orders = [] } = useQuery({
    queryKey: ["ach-orders", since],
    queryFn: async () => {
      const { data } = await (supabase.from("accessory_orders") as any)
        .select("id, total_amount, payment_status, created_at")
        .gte("created_at", since);
      return data || [];
    },
  });

  const verticals = useMemo(() => {
    const policiesPaid = policies.filter((p: any) => p.status === "active");
    const loansApproved = loans.filter((l: any) => ["approved", "disbursed"].includes(String(l.status).toLowerCase()));
    const dealsPaid = deals.filter((d: any) => d.payment_status === "received");
    const hsrpPaid = hsrp.filter((h: any) => h.payment_status === "paid");
    const rentalsPaid = rentals.filter((r: any) => r.payment_status === "paid");
    const ordersPaid = orders.filter((o: any) => o.payment_status === "paid");

    return [
      {
        name: "Insurance",
        count: policiesPaid.length,
        revenue: policiesPaid.reduce((s: number, p: any) => s + Number(p.premium_amount || 0), 0),
        unit: "policies",
      },
      {
        name: "Car Loans",
        count: loansApproved.length,
        revenue: loansApproved.reduce((s: number, l: any) => s + Number(l.loan_amount || 0), 0),
        unit: "loans",
      },
      {
        name: "Car Sales",
        count: dealsPaid.filter((d: any) => (d.vertical_name || "").toLowerCase().includes("sales") || !d.vertical_name).length,
        revenue: dealsPaid.reduce((s: number, d: any) => s + Number(d.payment_received_amount || d.deal_value || 0), 0),
        unit: "deals",
      },
      {
        name: "HSRP",
        count: hsrpPaid.length,
        revenue: hsrpPaid.reduce((s: number, h: any) => s + Number(h.payment_amount || h.service_price || 0), 0),
        unit: "bookings",
      },
      {
        name: "Self Drive Rental",
        count: rentalsPaid.length,
        revenue: rentalsPaid.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0),
        unit: "rentals",
      },
      {
        name: "Accessories",
        count: ordersPaid.length,
        revenue: ordersPaid.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0),
        unit: "orders",
      },
    ];
  }, [policies, loans, deals, hsrp, rentals, orders]);

  const totalCount = verticals.reduce((s, v) => s + v.count, 0);
  const totalRevenue = verticals.reduce((s, v) => s + v.revenue, 0);
  const avgPerUnit = totalCount > 0 ? totalRevenue / totalCount : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Period</Label>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as RangeKey[]).map(k => (
                <SelectItem key={k} value={k}>{RANGE_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">Auto-pulled from CRM • Since {sinceDate}</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Conversions</p>
              <Trophy className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold mt-2">{totalCount}</p>
            <p className="text-xs text-muted-foreground mt-1">across all verticals</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Revenue Generated</p>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold mt-2 text-blue-700">{fmtINR(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{RANGE_LABELS[range]}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Avg per Conversion</p>
              <Target className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold mt-2">{fmtINR(avgPerUnit)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per vertical */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Achievements by Vertical</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vertical</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Avg / Unit</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verticals.map(v => {
                const share = totalRevenue > 0 ? (v.revenue / totalRevenue) * 100 : 0;
                return (
                  <TableRow key={v.name}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{v.count} {v.unit}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{fmtINR(v.revenue)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {fmtINR(v.count > 0 ? v.revenue / v.count : 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{share.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
