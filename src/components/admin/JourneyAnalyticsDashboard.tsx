import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import {
  TrendingUp, Send, CheckCircle2, AlertTriangle, Clock, Zap,
  ArrowRight, Target, Percent
} from "lucide-react";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const JOURNEY_LABELS: Record<string, string> = {
  car_to_insurance: "Car → Insurance",
  car_to_loan: "Car → Loan",
  loan_to_car: "Loan → Car",
  insurance_to_accessories: "Insurance → Accessories",
  car_to_accessories: "Car → Accessories",
  loan_to_insurance: "Loan → Insurance",
};

export function JourneyAnalyticsDashboard() {
  const { data: triggers } = useQuery({
    queryKey: ["journey-analytics-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_journey_triggers")
        .select("id, trigger_type, status, created_at, sent_at, converted_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      return data || [];
    },
  });

  // Compute analytics
  const analytics = (() => {
    if (!triggers) return null;

    const byType: Record<string, { total: number; sent: number; converted: number; pending: number; failed: number }> = {};
    let totalSent = 0, totalConverted = 0, totalPending = 0, totalFailed = 0;

    for (const t of triggers) {
      if (!byType[t.trigger_type]) byType[t.trigger_type] = { total: 0, sent: 0, converted: 0, pending: 0, failed: 0 };
      byType[t.trigger_type].total++;
      if (t.status === "sent") { byType[t.trigger_type].sent++; totalSent++; }
      if (t.status === "converted") { byType[t.trigger_type].converted++; totalConverted++; }
      if (t.status === "pending") { byType[t.trigger_type].pending++; totalPending++; }
      if (t.status === "failed") { byType[t.trigger_type].failed++; totalFailed++; }
    }

    const conversionRate = totalSent + totalConverted > 0
      ? ((totalConverted / (totalSent + totalConverted)) * 100).toFixed(1)
      : "0";

    const funnelData = Object.entries(byType).map(([type, data]) => ({
      name: JOURNEY_LABELS[type] || type,
      total: data.total,
      sent: data.sent,
      converted: data.converted,
      conversionRate: data.sent + data.converted > 0
        ? ((data.converted / (data.sent + data.converted)) * 100).toFixed(1)
        : "0",
    }));

    const pieData = Object.entries(byType).map(([type, data]) => ({
      name: JOURNEY_LABELS[type] || type,
      value: data.total,
    }));

    // Daily trend (last 30 days)
    const dailyMap: Record<string, { sent: number; converted: number }> = {};
    for (const t of triggers) {
      const day = t.created_at.substring(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { sent: 0, converted: 0 };
      if (t.status === "sent") dailyMap[day].sent++;
      if (t.status === "converted") dailyMap[day].converted++;
    }
    const trendData = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, data]) => ({ date: date.substring(5), ...data }));

    return {
      total: triggers.length,
      totalSent,
      totalConverted,
      totalPending,
      totalFailed,
      conversionRate,
      funnelData,
      pieData,
      trendData,
      byType,
    };
  })();

  if (!analytics) return <div className="text-center py-8 text-sm text-muted-foreground">Loading analytics...</div>;

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Triggers", value: analytics.total, icon: Zap, color: "text-primary" },
          { label: "Messages Sent", value: analytics.totalSent, icon: Send, color: "text-blue-600" },
          { label: "Converted", value: analytics.totalConverted, icon: CheckCircle2, color: "text-green-600" },
          { label: "Conversion Rate", value: `${analytics.conversionRate}%`, icon: Percent, color: "text-purple-600" },
          { label: "Pending Queue", value: analytics.totalPending, icon: Clock, color: "text-yellow-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Funnel by Journey Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" /> Conversion by Journey Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="sent" fill="hsl(var(--primary))" name="Sent" radius={[0, 2, 2, 0]} />
                <Bar dataKey="converted" fill="#10b981" name="Converted" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Journey Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={analytics.pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {analytics.pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Daily Trend (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analytics.trendData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="sent" stroke="hsl(var(--primary))" name="Sent" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="converted" stroke="#10b981" name="Converted" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Per-Journey Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-4">Journey</th>
                  <th className="pb-2 pr-4 text-center">Total</th>
                  <th className="pb-2 pr-4 text-center">Pending</th>
                  <th className="pb-2 pr-4 text-center">Sent</th>
                  <th className="pb-2 pr-4 text-center">Converted</th>
                  <th className="pb-2 pr-4 text-center">Failed</th>
                  <th className="pb-2 text-center">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analytics.byType).map(([type, data]) => {
                  const rate = data.sent + data.converted > 0
                    ? ((data.converted / (data.sent + data.converted)) * 100).toFixed(1)
                    : "0";
                  return (
                    <tr key={type} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{JOURNEY_LABELS[type] || type}</td>
                      <td className="py-2 pr-4 text-center">{data.total}</td>
                      <td className="py-2 pr-4 text-center">
                        <Badge variant="outline" className="text-[10px]">{data.pending}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">{data.sent}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">{data.converted}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">{data.failed}</Badge>
                      </td>
                      <td className="py-2 text-center font-bold text-primary">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
