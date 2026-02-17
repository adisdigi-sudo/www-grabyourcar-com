import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Clock, CheckCircle, AlertTriangle, IndianRupee, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const HSRPDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["hsrp-dashboard-stats"],
    queryFn: async () => {
      const { count: totalOrders } = await supabase
        .from("accessory_orders")
        .select("*", { count: "exact", head: true });

      return { totalOrders: totalOrders || 0 };
    },
  });

  const kpis = [
    { label: "Total Orders", value: stats?.totalOrders || 0, icon: FileText, color: "text-blue-500" },
    { label: "Pending", value: "—", icon: Clock, color: "text-amber-500" },
    { label: "Completed", value: "—", icon: CheckCircle, color: "text-green-500" },
    { label: "Revenue", value: "—", icon: IndianRupee, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          HSRP & FASTag Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Manage HSRP plates, FASTag issuance, and delivery</p>
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

      <Card>
        <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {[
            { label: "HSRP Management", icon: Shield },
            { label: "Order Tracking", icon: Truck },
            { label: "Reports", icon: FileText },
          ].map((a) => (
            <Badge key={a.label} variant="outline" className="px-4 py-2 text-sm cursor-pointer hover:bg-accent">
              <a.icon className="h-4 w-4 mr-2" />{a.label}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
