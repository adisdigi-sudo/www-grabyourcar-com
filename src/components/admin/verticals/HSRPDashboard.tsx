import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, FileText, Clock, CheckCircle, BarChart3, Car, Phone, Users, Truck, Zap, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface HSRPDashboardProps {
  onNavigate?: (tab: string) => void;
}

export const HSRPDashboard = ({ onNavigate }: HSRPDashboardProps) => {
  const { data: stats } = useQuery({
    queryKey: ["hsrp-dashboard-stats"],
    queryFn: async () => {
      const [total, pending, completed] = await Promise.all([
        supabase.from("hsrp_bookings").select("*", { count: "exact", head: true }),
        supabase.from("hsrp_bookings").select("*", { count: "exact", head: true }).eq("order_status", "pending"),
        supabase.from("hsrp_bookings").select("*", { count: "exact", head: true }).eq("order_status", "completed"),
      ]);
      return {
        total: total.count || 0,
        pending: pending.count || 0,
        delivered: completed.count || 0,
      };
    },
  });

  const kpis = [
    { label: "Total Applications", value: stats?.total || 0, icon: FileText, gradient: "from-blue-500 to-cyan-500" },
    { label: "Pending", value: stats?.pending || 0, icon: Clock, gradient: "from-amber-500 to-orange-500" },
    { label: "Completed", value: stats?.delivered || 0, icon: CheckCircle, gradient: "from-green-500 to-emerald-500" },
    { label: "Completion Rate", value: stats?.total ? `${Math.round((stats.delivered / stats.total) * 100)}%` : "0%", icon: BarChart3, gradient: "from-purple-500 to-violet-500" },
  ];

  const quickActions = [
    { label: "Smart Calling", icon: Phone, desc: "Follow-up queue", id: "calling-system", badge: "🔥" },
    { label: "All Leads", icon: Users, desc: "Manage inquiries", id: "leads-all" },
    { label: "HSRP Management", icon: Shield, desc: "All applications", id: "services-hsrp" },
    { label: "Order Tracking", icon: Truck, desc: "Track deliveries", id: "services-hsrp" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-primary/5 to-background border p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">HSRP & FASTag</h1>
            <p className="text-muted-foreground text-sm">Application management, tracking & delivery</p>
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
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Processing Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { stage: "New Application", pct: 100 },
              { stage: "Documents Verified", pct: 75 },
              { stage: "Plate Ordered", pct: 55 },
              { stage: "In Transit", pct: 35 },
              { stage: "Installed", pct: stats?.total ? Math.round((stats.delivered / stats.total) * 100) : 15 },
            ].map((p) => (
              <div key={p.stage} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{p.stage}</span>
                  <span className="text-muted-foreground">{p.pct}%</span>
                </div>
                <Progress value={p.pct} className="h-2" />
              </div>
            ))}
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
