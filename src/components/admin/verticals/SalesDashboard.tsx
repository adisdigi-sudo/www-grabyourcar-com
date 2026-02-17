import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Users, TrendingUp, Target, IndianRupee, Phone, BarChart3, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SalesDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["sales-dashboard-stats"],
    queryFn: async () => {
      const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

      const { count: hotLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("priority", "hot");

      const { count: totalCars } = await supabase
        .from("cars")
        .select("*", { count: "exact", head: true });

      return { totalLeads: totalLeads || 0, hotLeads: hotLeads || 0, totalCars: totalCars || 0 };
    },
  });

  const kpis = [
    { label: "Total Leads", value: stats?.totalLeads || 0, icon: Users, color: "text-blue-500" },
    { label: "Hot Leads", value: stats?.hotLeads || 0, icon: Target, color: "text-red-500" },
    { label: "Cars Listed", value: stats?.totalCars || 0, icon: Car, color: "text-green-500" },
    { label: "Conversions", value: "—", icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Car className="h-7 w-7 text-primary" />
          Automotive Sales Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Manage leads, inventory, and sales pipeline</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
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
          <CardHeader><CardTitle className="text-lg">Sales Pipeline</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["New Inquiry", "Test Drive", "Negotiation", "Booking", "Delivered"].map((stage, i) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-sm">{stage}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(5 - i) * 20}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{(5 - i) * 8}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {[
              { label: "All Leads", icon: Users },
              { label: "Car Catalog", icon: Car },
              { label: "AI Scoring", icon: Zap },
              { label: "Quote Gen", icon: BarChart3 },
            ].map((a) => (
              <Badge key={a.label} variant="outline" className="px-4 py-2 text-sm cursor-pointer hover:bg-accent">
                <a.icon className="h-4 w-4 mr-2" />{a.label}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
