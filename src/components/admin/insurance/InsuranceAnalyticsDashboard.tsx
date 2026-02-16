import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, TrendingUp, Users, ShieldCheck, RefreshCw,
  DollarSign, Target, Award
} from "lucide-react";

export function InsuranceAnalyticsDashboard() {
  const { data: clients } = useQuery({
    queryKey: ["ins-analytics-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_clients").select("id, lead_status, lead_source, created_at, assigned_advisor_id, advisor_name");
      return data || [];
    },
  });

  const { data: policies } = useQuery({
    queryKey: ["ins-analytics-policies"],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_policies").select("id, status, premium_amount, policy_type, insurer, expiry_date, renewal_status, is_renewal, created_at");
      return data || [];
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["ins-analytics-commissions"],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_commissions").select("id, total_earned, status, advisor_name, commission_type");
      return data || [];
    },
  });

  // Pipeline Funnel
  const funnel = {
    total: clients?.length || 0,
    new: clients?.filter(c => c.lead_status === "new").length || 0,
    contacted: clients?.filter(c => c.lead_status === "contacted").length || 0,
    quoted: clients?.filter(c => c.lead_status === "quoted").length || 0,
    negotiating: clients?.filter(c => c.lead_status === "negotiating").length || 0,
    converted: clients?.filter(c => c.lead_status === "converted").length || 0,
    lost: clients?.filter(c => c.lead_status === "lost").length || 0,
  };

  // Revenue
  const totalPremium = policies?.reduce((s, p) => s + (p.premium_amount || 0), 0) || 0;
  const totalCommission = commissions?.reduce((s, c) => s + (c.total_earned || 0), 0) || 0;
  const renewalRevenue = policies?.filter(p => p.is_renewal).reduce((s, p) => s + (p.premium_amount || 0), 0) || 0;

  // Policy Type Distribution
  const policyTypes = policies?.reduce((acc: Record<string, number>, p) => {
    acc[p.policy_type || "other"] = (acc[p.policy_type || "other"] || 0) + 1;
    return acc;
  }, {}) || {};

  // Source Distribution
  const sources = clients?.reduce((acc: Record<string, number>, c) => {
    acc[c.lead_source || "unknown"] = (acc[c.lead_source || "unknown"] || 0) + 1;
    return acc;
  }, {}) || {};

  // Top Insurers
  const insurers = policies?.reduce((acc: Record<string, number>, p) => {
    if (p.insurer) acc[p.insurer] = (acc[p.insurer] || 0) + 1;
    return acc;
  }, {}) || {};

  // Advisor Performance
  const advisorPerf = clients?.reduce((acc: Record<string, { total: number; converted: number }>, c) => {
    const name = c.advisor_name || "Unassigned";
    if (!acc[name]) acc[name] = { total: 0, converted: 0 };
    acc[name].total++;
    if (c.lead_status === "converted") acc[name].converted++;
    return acc;
  }, {}) || {};

  const conversionRate = funnel.total > 0 ? ((funnel.converted / funnel.total) * 100).toFixed(1) : "0";
  const now = new Date();
  const renewalsExpiring30 = policies?.filter(p => {
    if (!p.expiry_date || p.status !== "active") return false;
    const d = new Date(p.expiry_date);
    return d >= now && d <= new Date(now.getTime() + 30 * 86400000);
  }).length || 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={DollarSign} label="Total Premium" value={`₹${(totalPremium / 100000).toFixed(1)}L`} sub="All policies" color="text-primary" bg="bg-primary/10" />
        <MetricCard icon={TrendingUp} label="Commission Earned" value={`₹${(totalCommission / 1000).toFixed(1)}K`} sub="All time" color="text-chart-2" bg="bg-chart-2/10" />
        <MetricCard icon={Target} label="Conversion Rate" value={`${conversionRate}%`} sub={`${funnel.converted}/${funnel.total} clients`} color="text-chart-1" bg="bg-chart-1/10" />
        <MetricCard icon={RefreshCw} label="Renewals Due" value={String(renewalsExpiring30)} sub="Next 30 days" color="text-destructive" bg="bg-destructive/10" />
      </div>

      {/* Sales Funnel */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />Sales Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { label: "New Leads", count: funnel.new, color: "bg-blue-500", pct: funnel.total ? (funnel.new / funnel.total * 100) : 0 },
              { label: "Contacted", count: funnel.contacted, color: "bg-yellow-500", pct: funnel.total ? (funnel.contacted / funnel.total * 100) : 0 },
              { label: "Quoted", count: funnel.quoted, color: "bg-purple-500", pct: funnel.total ? (funnel.quoted / funnel.total * 100) : 0 },
              { label: "Negotiating", count: funnel.negotiating, color: "bg-orange-500", pct: funnel.total ? (funnel.negotiating / funnel.total * 100) : 0 },
              { label: "Converted", count: funnel.converted, color: "bg-green-500", pct: funnel.total ? (funnel.converted / funnel.total * 100) : 0 },
              { label: "Lost", count: funnel.lost, color: "bg-red-500", pct: funnel.total ? (funnel.lost / funnel.total * 100) : 0 },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="text-xs w-20 text-right text-muted-foreground">{f.label}</span>
                <div className="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden">
                  <div className={`h-full ${f.color} rounded-full transition-all flex items-center px-2`} style={{ width: `${Math.max(f.pct, 2)}%` }}>
                    <span className="text-[10px] text-white font-medium">{f.count}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-10">{f.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Source Breakdown */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Lead Sources</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
              <div key={src} className="flex justify-between text-sm">
                <span className="capitalize">{src}</span>
                <Badge variant="outline" className="text-[10px]">{count as number}</Badge>
              </div>
            ))}
            {Object.keys(sources).length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
          </CardContent>
        </Card>

        {/* Insurer Distribution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Insurers</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(insurers).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([name, count]) => (
              <div key={name} className="flex justify-between text-sm">
                <span>{name}</span>
                <Badge variant="outline" className="text-[10px]">{count as number}</Badge>
              </div>
            ))}
            {Object.keys(insurers).length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
          </CardContent>
        </Card>

        {/* Advisor Performance */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Award className="h-3.5 w-3.5" />Advisor Performance</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(advisorPerf).sort((a, b) => b[1].converted - a[1].converted).map(([name, perf]) => (
              <div key={name} className="flex justify-between text-sm">
                <span>{name}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{(perf as any).total} leads</Badge>
                  <Badge className="bg-green-100 text-green-800 text-[10px] border-0">{(perf as any).converted} conv</Badge>
                </div>
              </div>
            ))}
            {Object.keys(advisorPerf).length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color, bg }: any) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground/70">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
