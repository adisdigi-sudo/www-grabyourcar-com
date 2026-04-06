import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { IndianRupee, TrendingUp, Users, CheckCircle2, Clock } from "lucide-react";
import { ExecutiveLeaderboard } from "../shared/ExecutiveLeaderboard";
import { format } from "date-fns";

interface HSRPPerformanceDashboardProps {
  bookings: any[];
  dateFilter: string;
}

const PIE_COLORS = [
  "hsl(210, 70%, 55%)", "hsl(40, 85%, 55%)", "hsl(185, 65%, 50%)",
  "hsl(265, 60%, 55%)", "hsl(150, 60%, 45%)", "hsl(0, 65%, 55%)",
];

const STAGE_LABELS: Record<string, string> = {
  new_booking: "New Booking",
  verification: "Verification",
  payment: "Payment",
  scheduled: "Scheduled",
  installation: "Installation",
  completed: "Completed",
};

const formatINR = (amt: number) => {
  if (!amt) return "₹0";
  if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
  if (amt >= 1000) return `₹${(amt / 1000).toFixed(0)}K`;
  return `₹${amt.toLocaleString("en-IN")}`;
};

export function HSRPPerformanceDashboard({ bookings, dateFilter }: HSRPPerformanceDashboardProps) {
  const completedBookings = useMemo(() => bookings.filter(b => b.pipeline_stage === "completed"), [bookings]);
  const paidBookings = useMemo(() => bookings.filter(b => b.payment_status === "paid"), [bookings]);

  const totalRevenue = useMemo(() =>
    paidBookings.reduce((s, b) => s + (Number(b.payment_amount) || 0), 0), [paidBookings]);
  const completionRate = bookings.length > 0 ? ((completedBookings.length / bookings.length) * 100) : 0;
  const pendingCount = bookings.length - completedBookings.length;

  // Stage distribution
  const stageData = useMemo(() =>
    Object.entries(STAGE_LABELS).map(([key, label], i) => ({
      name: label,
      value: bookings.filter(b => b.pipeline_stage === key).length,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    })).filter(d => d.value > 0), [bookings]);

  // Service type breakdown
  const serviceStats = useMemo(() => {
    const map: Record<string, { total: number; completed: number; revenue: number }> = {};
    bookings.forEach(b => {
      const svc = b.service_type || "Unknown";
      if (!map[svc]) map[svc] = { total: 0, completed: 0, revenue: 0 };
      map[svc].total++;
      if (b.pipeline_stage === "completed") map[svc].completed++;
      if (b.payment_status === "paid") map[svc].revenue += Number(b.payment_amount) || 0;
    });
    return Object.entries(map)
      .map(([service, s]) => ({ service, ...s, compRate: s.total > 0 ? ((s.completed / s.total) * 100).toFixed(1) : "0" }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [bookings]);

  // Executive stats
  const executiveStats = useMemo(() => {
    const map: Record<string, { totalLeads: number; wonDeals: number; lostDeals: number; revenue: number }> = {};
    bookings.forEach(b => {
      const exec = b.assigned_to || "Unassigned";
      if (!map[exec]) map[exec] = { totalLeads: 0, wonDeals: 0, lostDeals: 0, revenue: 0 };
      map[exec].totalLeads++;
      if (b.pipeline_stage === "completed") {
        map[exec].wonDeals++;
        map[exec].revenue += Number(b.payment_amount) || 0;
      }
    });
    return Object.entries(map)
      .filter(([name]) => name !== "Unassigned")
      .map(([name, s]) => ({
        name,
        ...s,
        conversionRate: s.totalLeads > 0 ? (s.wonDeals / s.totalLeads) * 100 : 0,
      }));
  }, [bookings]);

  // Revenue trend
  const revenueTrend = useMemo(() => {
    const map: Record<string, number> = {};
    paidBookings.forEach(b => {
      const d = b.updated_at || b.created_at;
      if (!d) return;
      const key = new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      map[key] = (map[key] || 0) + (Number(b.payment_amount) || 0);
    });
    return Object.entries(map).map(([date, value]) => ({ date, value }));
  }, [paidBookings]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Revenue", value: formatINR(totalRevenue), icon: IndianRupee, color: "text-emerald-600", bg: "from-emerald-500/10" },
          { label: "Total Bookings", value: bookings.length, icon: Users, color: "text-blue-600", bg: "from-blue-500/10" },
          { label: "Completed", value: completedBookings.length, icon: CheckCircle2, color: "text-emerald-600", bg: "from-emerald-500/10" },
          { label: "Completion Rate", value: `${completionRate.toFixed(1)}%`, icon: TrendingUp, color: "text-violet-600", bg: "from-violet-500/10" },
          { label: "Pending", value: pendingCount, icon: Clock, color: "text-amber-600", bg: "from-amber-500/10" },
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="value" fill="hsl(185, 65%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Stage Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stageData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {stageData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service Type Performance */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Service Type Performance</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Service Type</TableHead>
                <TableHead className="text-[11px] text-center">Bookings</TableHead>
                <TableHead className="text-[11px] text-center">Completed</TableHead>
                <TableHead className="text-[11px] text-center">Completion %</TableHead>
                <TableHead className="text-[11px] text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceStats.map(s => (
                <TableRow key={s.service}>
                  <TableCell className="text-xs font-medium">{s.service}</TableCell>
                  <TableCell className="text-xs text-center">{s.total}</TableCell>
                  <TableCell className="text-xs text-center">
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">{s.completed}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-center">{s.compRate}%</TableCell>
                  <TableCell className="text-xs text-right font-semibold">{formatINR(s.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Executive Leaderboard */}
      <ExecutiveLeaderboard verticalName="HSRP" executiveStats={executiveStats} />

      {/* Completed Cases */}
      {completedBookings.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Completed Cases</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Owner</TableHead>
                  <TableHead className="text-[11px]">Reg No.</TableHead>
                  <TableHead className="text-[11px]">Service</TableHead>
                  <TableHead className="text-[11px] text-right">Amount</TableHead>
                  <TableHead className="text-[11px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedBookings.slice(0, 20).map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="text-xs font-medium">{b.owner_name}</TableCell>
                    <TableCell className="text-xs font-mono">{b.registration_number}</TableCell>
                    <TableCell className="text-xs">{b.service_type || "—"}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{formatINR(Number(b.payment_amount) || 0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{b.updated_at ? format(new Date(b.updated_at), "dd MMM yy") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
