import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, ShoppingCart, TrendingUp, IndianRupee, Tags, FileText, Star, BarChart3, Car, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const AccessoriesDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["accessories-dashboard-stats"],
    queryFn: async () => {
      const [total, pending, delivered, paid] = await Promise.all([
        supabase.from("accessory_orders").select("*", { count: "exact", head: true }),
        supabase.from("accessory_orders").select("*", { count: "exact", head: true }).eq("order_status", "pending"),
        supabase.from("accessory_orders").select("*", { count: "exact", head: true }).eq("order_status", "delivered"),
        supabase.from("accessory_orders").select("total_amount").eq("payment_status", "paid"),
      ]);

      const revenue = paid.data?.reduce((s, o) => s + (o.total_amount || 0), 0) || 0;

      return {
        total: total.count || 0,
        pending: pending.count || 0,
        delivered: delivered.count || 0,
        revenue,
      };
    },
  });

  const kpis = [
    { label: "Total Orders", value: stats?.total || 0, icon: ShoppingCart, color: "text-blue-500" },
    { label: "Pending", value: stats?.pending || 0, icon: Package, color: "text-amber-500" },
    { label: "Delivered", value: stats?.delivered || 0, icon: CheckCircle, color: "text-green-500" },
    { label: "Revenue", value: `₹${((stats?.revenue || 0) / 1000).toFixed(0)}K`, icon: IndianRupee, color: "text-primary" },
  ];

  const fulfillmentRate = stats?.total ? Math.round((stats.delivered / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-7 w-7 text-primary" />
          Accessories & E-Commerce Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Products, orders & cross-sell management</p>
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
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Fulfillment Rate</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{fulfillmentRate}%</p>
              <p className="text-sm text-muted-foreground">Orders delivered successfully</p>
            </div>
            <Progress value={fulfillmentRate} className="h-3" />
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="p-2 rounded bg-muted">
                <p className="font-bold text-amber-500">{stats?.pending || 0}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="font-bold text-green-600">{stats?.delivered || 0}</p>
                <p className="text-[10px] text-muted-foreground">Delivered</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="font-bold text-primary">{stats?.total || 0}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Products", icon: Package, desc: "Manage catalog" },
                { label: "Orders", icon: FileText, desc: "View all orders" },
                { label: "Cross-Sell", icon: Tags, desc: "Configure rules" },
                { label: "Car Database", icon: Car, desc: "Vehicle accessories" },
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
