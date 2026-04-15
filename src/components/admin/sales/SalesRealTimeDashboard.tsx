import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, TrendingUp, CheckCircle2, XCircle, Flame, Eye, Clock,
  BarChart3, Phone, MessageCircle, Car,
} from "lucide-react";
import { differenceInHours } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  requirement_understood: "Req. Understood",
  quote_shared: "Quote Shared",
  follow_up: "Follow-Up",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4", "#10b981", "#ec4899", "#22c55e", "#ef4444"];

export function SalesRealTimeDashboard() {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["sales-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_pipeline")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const now = new Date();
  const totalLeads = leads.length;
  const won = leads.filter((l: any) => l.status_outcome === "won").length;
  const lost = leads.filter((l: any) => l.status_outcome === "lost").length;
  const active = totalLeads - won - lost;
  const conversion = totalLeads > 0 ? ((won / totalLeads) * 100).toFixed(1) : "0";

  const hotLeads = leads.filter(
    (l: any) =>
      l.buying_intent === "Immediate (This Week)" ||
      l.is_hot ||
      (l.last_activity_at && differenceInHours(now, new Date(l.last_activity_at)) < 2)
  ).length;

  const abandonedLeads = leads.filter((l: any) => l.is_abandoned).length;

  const staleLeads = leads.filter(
    (l: any) =>
      l.last_activity_at &&
      differenceInHours(now, new Date(l.last_activity_at)) > 48 &&
      l.status_outcome !== "won" &&
      l.status_outcome !== "lost"
  ).length;

  // Stage distribution chart data
  const stageCounts = leads.reduce((acc: Record<string, number>, l: any) => {
    const stage = l.pipeline_stage || "new_lead";
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  const stageChartData = Object.entries(stageCounts).map(([stage, count]) => ({
    name: STAGE_LABELS[stage] || stage,
    value: count as number,
  }));

  // Source distribution
  const sourceCounts = leads.reduce((acc: Record<string, number>, l: any) => {
    const src = l.source || "Unknown";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  const sourceChartData = Object.entries(sourceCounts)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total Leads", value: totalLeads, icon: Users, color: "text-blue-600", bg: "from-blue-500/10" },
          { label: "Active", value: active, icon: TrendingUp, color: "text-cyan-600", bg: "from-cyan-500/10" },
          { label: "Won", value: won, icon: CheckCircle2, color: "text-emerald-600", bg: "from-emerald-500/10" },
          { label: "Lost", value: lost, icon: XCircle, color: "text-red-600", bg: "from-red-500/10" },
          { label: "Conversion", value: `${conversion}%`, icon: BarChart3, color: "text-violet-600", bg: "from-violet-500/10" },
          { label: "Hot Leads", value: hotLeads, icon: Flame, color: "text-orange-600", bg: "from-orange-500/10" },
          { label: "Abandoned", value: abandonedLeads, icon: Eye, color: "text-amber-600", bg: "from-amber-500/10" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border overflow-hidden">
            <CardContent className="p-3 relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bg} to-transparent opacity-50`} />
              <div className="relative flex items-center gap-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <div>
                  <p className="text-lg font-bold leading-none">{kpi.value}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Pipeline Distribution */}
        <Card className="border">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3">Pipeline Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stageChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card className="border">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3">Lead Sources</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {sourceChartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {staleLeads > 0 && (
        <Card className="border border-amber-300/50 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-sm text-amber-700">
                {staleLeads} Stale Lead{staleLeads > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                No activity for 48+ hours. Follow up immediately.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
