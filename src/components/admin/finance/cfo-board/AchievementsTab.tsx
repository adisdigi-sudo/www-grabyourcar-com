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
import { Trophy, Target, TrendingUp, User } from "lucide-react";
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

  // Won insurance policies = clients with lead_status='won' OR pipeline_stage='policy_issued'
  const { data: wonPolicies = [], isLoading } = useQuery({
    queryKey: ["cfo-won-insurance", since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, vehicle_number, current_premium, quote_amount, current_insurer, current_policy_type, current_policy_number, assigned_executive, lead_status, pipeline_stage, booking_date, updated_at, created_at")
        .or("lead_status.eq.won,pipeline_stage.eq.policy_issued")
        .gte("updated_at", since)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Active incentive rules for insurance (per-policy fixed amounts)
  const { data: rules = [] } = useQuery({
    queryKey: ["cfo-insurance-rules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("incentive_rules")
        .select("rule_name, rule_type, fixed_amount, percentage")
        .eq("vertical_name", "insurance")
        .eq("is_active", true)
        .eq("rule_type", "fixed");
      return data || [];
    },
  });

  // Resolve incentive per policy: detect renewal vs new from policy_type / rule names
  const newRuleAmt = useMemo(() => {
    const r = rules.find((x: any) => /new/i.test(x.rule_name));
    return Number(r?.fixed_amount || 500);
  }, [rules]);
  const renewalRuleAmt = useMemo(() => {
    const r = rules.find((x: any) => /renew/i.test(x.rule_name));
    return Number(r?.fixed_amount || 300);
  }, [rules]);

  const enriched = useMemo(() => {
    return wonPolicies.map((p: any) => {
      const isRenewal = /renew/i.test(String(p.current_policy_type || ""));
      const incentive = isRenewal ? renewalRuleAmt : newRuleAmt;
      const premium = Number(p.current_premium || p.quote_amount || 0);
      return {
        ...p,
        policy_kind: isRenewal ? "Renewal" : "New",
        premium,
        incentive,
        achiever: p.assigned_executive || "Unassigned",
        won_date: p.booking_date || (p.updated_at || "").split("T")[0],
      };
    });
  }, [wonPolicies, newRuleAmt, renewalRuleAmt]);

  // Per-employee aggregation
  const byAchiever = useMemo(() => {
    const m = new Map<string, { name: string; count: number; revenue: number; incentive: number }>();
    for (const p of enriched) {
      const key = p.achiever;
      const cur = m.get(key) || { name: key, count: 0, revenue: 0, incentive: 0 };
      cur.count += 1;
      cur.revenue += p.premium;
      cur.incentive += p.incentive;
      m.set(key, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [enriched]);

  const totalCount = enriched.length;
  const totalRevenue = enriched.reduce((s, p) => s + p.premium, 0);
  const totalIncentive = enriched.reduce((s, p) => s + p.incentive, 0);

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
        <p className="text-xs text-muted-foreground">
          Won Insurance Policies only • Since {sinceDate} • Incentive: New ₹{newRuleAmt} / Renewal ₹{renewalRuleAmt}
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Won Policies</p>
              <Trophy className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold mt-2">{totalCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Insurance only</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Premium Collected</p>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold mt-2 text-blue-700">{fmtINR(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{RANGE_LABELS[range]}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Eligible Incentive</p>
              <Target className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold mt-2 text-amber-700">{fmtINR(totalIncentive)}</p>
            <p className="text-xs text-muted-foreground mt-1">Auto-calculated per policy</p>
          </CardContent>
        </Card>
      </div>

      {/* Per Achiever */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Achievers Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Policies Won</TableHead>
                <TableHead className="text-right">Premium</TableHead>
                <TableHead className="text-right">Eligible Incentive</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byAchiever.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No won policies in this period</TableCell></TableRow>
              )}
              {byAchiever.map(a => (
                <TableRow key={a.name}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{a.count}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{fmtINR(a.revenue)}</TableCell>
                  <TableCell className="text-right font-semibold text-amber-700">{fmtINR(a.incentive)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per Policy detail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Won Policies — Detail</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Insurer</TableHead>
                <TableHead>Achiever</TableHead>
                <TableHead className="text-right">Premium</TableHead>
                <TableHead className="text-right">Incentive</TableHead>
                <TableHead>Won Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && enriched.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No won policies</TableCell></TableRow>
              )}
              {enriched.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.customer_name || "—"}</TableCell>
                  <TableCell className="text-xs">{p.vehicle_number || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={p.policy_kind === "Renewal" ? "outline" : "default"}>{p.policy_kind}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{p.current_insurer || "—"}</TableCell>
                  <TableCell className="text-xs">{p.achiever}</TableCell>
                  <TableCell className="text-right">{fmtINR(p.premium)}</TableCell>
                  <TableCell className="text-right text-amber-700 font-medium">{fmtINR(p.incentive)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.won_date || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
