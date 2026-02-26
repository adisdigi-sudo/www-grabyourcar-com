import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Car, Users, TrendingUp, Target, Phone, BarChart3, Zap, IndianRupee, CalendarDays, ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SalesDashboard = () => {
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
    { stage: "New Inquiry", key: "new", color: "bg-blue-500" },
    { stage: "Contacted", key: "contacted", color: "bg-cyan-500" },
    { stage: "Test Drive", key: "test_drive", color: "bg-amber-500" },
    { stage: "Negotiation", key: "negotiation", color: "bg-orange-500" },
    { stage: "Booking", key: "booked", color: "bg-purple-500" },
    { stage: "Delivered", key: "delivered", color: "bg-green-500" },
  ];

  const totalPipeline = Object.values(stats?.statusCounts || {}).reduce((s, v) => s + v, 0) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Car className="h-7 w-7 text-primary" />
          Automotive Sales Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Leads, inventory & sales pipeline at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: stats?.totalLeads || 0, icon: Users, color: "text-blue-500" },
          { label: "Hot Leads", value: stats?.hotLeads || 0, icon: Target, color: "text-red-500" },
          { label: "Cars Listed", value: stats?.totalCars || 0, icon: Car, color: "text-green-500" },
          { label: "Conversion", value: `${Math.round(((stats?.statusCounts?.["delivered"] || 0) / totalPipeline) * 100)}%`, icon: TrendingUp, color: "text-primary" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
              {[
                { label: "View All Leads", icon: Users, desc: "Browse & manage leads" },
                { label: "Car Catalog", icon: Car, desc: "Manage car listings" },
                { label: "AI Lead Scoring", icon: Zap, desc: "Prioritize hot leads" },
                { label: "Quote Generator", icon: IndianRupee, desc: "Create customer quotes" },
                { label: "Call Center", icon: Phone, desc: "Smart calling queue" },
                { label: "Discount Presets", icon: ShoppingCart, desc: "Manage offers" },
              ].map((a) => (
                <div key={a.label} className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                  <a.icon className="h-5 w-5 text-primary mb-2" />
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
