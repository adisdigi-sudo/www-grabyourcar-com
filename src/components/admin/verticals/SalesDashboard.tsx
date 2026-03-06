import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Car, Users, TrendingUp, Target, Phone, BarChart3, Zap, IndianRupee, ShoppingCart, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface SalesDashboardProps {
  onNavigate?: (tab: string) => void;
}

export const SalesDashboard = ({ onNavigate }: SalesDashboardProps) => {
  const { data: stats } = useQuery({
    queryKey: ["sales-dashboard-stats"],
    queryFn: async () => {
      const [leads, hotLeads, cars, recentLeads] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("priority", "hot"),
        supabase.from("cars").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("status").order("created_at", { ascending: false }).limit(100),
      ]);

      const statusCounts: Record<string, number> = {};
      recentLeads.data?.forEach((l) => {
        statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
      });

      return {
        totalLeads: leads.count || 0,
        hotLeads: hotLeads.count || 0,
        totalCars: cars.count || 0,
        statusCounts,
      };
    },
  });

  const pipeline = [
    { stage: "New Inquiry", key: "new", color: "from-blue-500 to-cyan-500" },
    { stage: "Contacted", key: "contacted", color: "from-cyan-500 to-teal-500" },
    { stage: "Test Drive", key: "test_drive", color: "from-amber-500 to-orange-500" },
    { stage: "Negotiation", key: "negotiation", color: "from-orange-500 to-red-500" },
    { stage: "Booking", key: "booked", color: "from-purple-500 to-violet-500" },
    { stage: "Delivered", key: "delivered", color: "from-green-500 to-emerald-500" },
  ];

  const totalPipeline = Object.values(stats?.statusCounts || {}).reduce((s, v) => s + v, 0) || 1;

  const quickActions = [
    { label: "Smart Calling", icon: Phone, desc: "Auto-prioritized queue", id: "calling-system", badge: "🔥" },
    { label: "All Leads", icon: Users, desc: "Browse & manage leads", id: "leads-all" },
    { label: "Quote Generator", icon: IndianRupee, desc: "Create customer quotes", id: "services-quote-generator" },
    { label: "Discount Presets", icon: ShoppingCart, desc: "Manage offers", id: "services-discounts" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-primary/5 to-background border p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Automotive Sales</h1>
            <p className="text-muted-foreground text-sm">Leads, pipeline & sales operations</p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: stats?.totalLeads || 0, icon: Users, gradient: "from-blue-500 to-cyan-500" },
          { label: "Hot Leads", value: stats?.hotLeads || 0, icon: Target, gradient: "from-red-500 to-orange-500" },
          { label: "Cars Listed", value: stats?.totalCars || 0, icon: Car, gradient: "from-green-500 to-emerald-500" },
          { label: "Conversion", value: `${Math.round(((stats?.statusCounts?.["delivered"] || 0) / totalPipeline) * 100)}%`, icon: TrendingUp, gradient: "from-purple-500 to-violet-500" },
        ].map((kpi, i) => (
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
        {/* Pipeline */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Sales Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pipeline.map((p) => {
              const count = stats?.statusCounts?.[p.key] || 0;
              const pct = Math.round((count / totalPipeline) * 100);
              return (
                <div key={p.stage} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{p.stage}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Actions */}
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
