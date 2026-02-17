import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, FileText, Clock, CheckCircle, IndianRupee, Truck, AlertTriangle, BarChart3, Car } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const HSRPDashboard = () => {
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
    { label: "Total Applications", value: stats?.total || 0, icon: FileText, color: "text-blue-500" },
    { label: "Pending", value: stats?.pending || 0, icon: Clock, color: "text-amber-500" },
    { label: "Completed", value: stats?.delivered || 0, icon: CheckCircle, color: "text-green-500" },
    { label: "Completion Rate", value: stats?.total ? `${Math.round((stats.delivered / stats.total) * 100)}%` : "0%", icon: BarChart3, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          HSRP & FASTag Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Manage HSRP plates, FASTag issuance & delivery tracking</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
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
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "HSRP Management", icon: Shield, desc: "View all applications" },
                { label: "Order Tracking", icon: Truck, desc: "Track deliveries" },
                { label: "Car Database", icon: Car, desc: "Vehicle lookup" },
                { label: "Reports", icon: FileText, desc: "Generate reports" },
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
