import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Car, CalendarDays, Users, MapPin, CheckCircle, AlertTriangle, BarChart3, Phone, Zap, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface RentalDashboardProps {
  onNavigate?: (tab: string) => void;
}

export const RentalDashboard = ({ onNavigate }: RentalDashboardProps) => {
  const { data: stats } = useQuery({
    queryKey: ["rental-dashboard-stats"],
    queryFn: async () => {
      const [total, confirmed, completed, cancelled] = await Promise.all([
        supabase.from("driver_bookings").select("*", { count: "exact", head: true }),
        supabase.from("driver_bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("driver_bookings").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("driver_bookings").select("*", { count: "exact", head: true }).eq("status", "cancelled"),
      ]);
      return {
        total: total.count || 0,
        confirmed: confirmed.count || 0,
        completed: completed.count || 0,
        cancelled: cancelled.count || 0,
      };
    },
  });

  const kpis = [
    { label: "Total Bookings", value: stats?.total || 0, icon: CalendarDays, gradient: "from-blue-500 to-cyan-500" },
    { label: "Active Trips", value: stats?.confirmed || 0, icon: Car, gradient: "from-green-500 to-emerald-500" },
    { label: "Completed", value: stats?.completed || 0, icon: CheckCircle, gradient: "from-purple-500 to-violet-500" },
    { label: "Cancelled", value: stats?.cancelled || 0, icon: AlertTriangle, gradient: "from-red-500 to-orange-500" },
  ];

  const utilization = stats?.total ? Math.round(((stats.confirmed + stats.completed) / stats.total) * 100) : 0;

  const quickActions = [
    { label: "Smart Calling", icon: Phone, desc: "Follow-up queue", id: "calling-system", badge: "🔥" },
    { label: "All Leads", icon: Users, desc: "Manage inquiries", id: "leads-all" },
    { label: "Rental Bookings", icon: CalendarDays, desc: "View all bookings", id: "services-rentals" },
    { label: "Driver Assignments", icon: Users, desc: "Manage drivers", id: "services-driver-bookings" },
    { label: "API Partners", icon: MapPin, desc: "External integrations", id: "services-api-partners" },
    { label: "Fleet Management", icon: Car, desc: "Available fleet", id: "services-rentals" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 via-primary/5 to-background border p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Self-Drive Rentals</h1>
            <p className="text-muted-foreground text-sm">Fleet management, bookings & trip tracking</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-[0.04]`} />
              <CardContent className="p-4 relative">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${kpi.gradient} flex items-center justify-center mb-3`}>
                  <kpi.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Fleet Utilization</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{utilization}%</p>
              <p className="text-sm text-muted-foreground">Overall utilization rate</p>
            </div>
            <Progress value={utilization} className="h-3" />
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="p-2 rounded bg-muted">
                <p className="font-bold text-green-600">{stats?.confirmed || 0}</p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="font-bold">{stats?.completed || 0}</p>
                <p className="text-[10px] text-muted-foreground">Completed</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="font-bold text-red-500">{stats?.cancelled || 0}</p>
                <p className="text-[10px] text-muted-foreground">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5" /> Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((a) => (
                <div
                  key={a.label}
                  className="p-3 rounded-lg border hover:bg-accent hover:border-primary/20 cursor-pointer transition-all group"
                  onClick={() => onNavigate?.(a.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <a.icon className="h-5 w-5 text-primary" />
                    {a.badge && <Badge variant="secondary" className="text-[10px]">{a.badge}</Badge>}
                  </div>
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
