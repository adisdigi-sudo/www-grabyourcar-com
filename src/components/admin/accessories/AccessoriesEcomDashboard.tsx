import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingCart,
  Package,
  IndianRupee,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  BarChart3,
} from "lucide-react";

interface Props {
  onNavigate: (panel: string) => void;
}

export function AccessoriesEcomDashboard({ onNavigate }: Props) {
  const { data: stats } = useQuery({
    queryKey: ["acc-ecom-dashboard"],
    queryFn: async () => {
      const [total, pending, delivered, paid, customers] = await Promise.all([
        supabase.from("accessory_orders").select("*", { count: "exact", head: true }),
        supabase.from("accessory_orders").select("*", { count: "exact", head: true }).eq("order_status", "pending"),
        supabase.from("accessory_orders").select("*", { count: "exact", head: true }).eq("order_status", "delivered"),
        supabase.from("accessory_orders").select("total_amount").eq("payment_status", "paid"),
        supabase.from("accessory_orders").select("user_id"),
      ]);
      const revenue = paid.data?.reduce((s, o) => s + (o.total_amount || 0), 0) || 0;
      const uniqueCustomers = new Set(customers.data?.map((c) => c.user_id) || []).size;
      return {
        total: total.count || 0,
        pending: pending.count || 0,
        delivered: delivered.count || 0,
        revenue,
        customers: uniqueCustomers,
      };
    },
  });

  const kpis = [
    { label: "Total Orders", value: stats?.total || 0, icon: ShoppingCart, color: "text-blue-500" },
    { label: "Pending", value: stats?.pending || 0, icon: Clock, color: "text-amber-500" },
    { label: "Delivered", value: stats?.delivered || 0, icon: CheckCircle, color: "text-emerald-500" },
    { label: "Revenue", value: `₹${((stats?.revenue || 0) / 1000).toFixed(1)}K`, icon: IndianRupee, color: "text-primary" },
  ];

  const fulfillmentRate = stats?.total ? Math.round((stats.delivered / stats.total) * 100) : 0;

  const quickLinks = [
    { label: "Products", desc: "Manage catalog", panel: "products", icon: Package },
    { label: "Orders", desc: "View all orders", panel: "orders", icon: ShoppingCart },
    { label: "Cross-Sell", desc: "Configure rules", panel: "crosssell", icon: TrendingUp },
    { label: "Customers", desc: "View customers", panel: "customers", icon: Users },
  ];

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          Accessories Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">E-Commerce overview & quick actions</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Fulfillment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Fulfillment Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{fulfillmentRate}%</p>
              <p className="text-xs text-muted-foreground">orders delivered</p>
            </div>
            <Progress value={fulfillmentRate} className="h-2" />
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-muted">
                <p className="font-bold text-amber-500">{stats?.pending || 0}</p>
                <p className="text-muted-foreground">Pending</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="font-bold text-emerald-500">{stats?.delivered || 0}</p>
                <p className="text-muted-foreground">Delivered</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="font-bold">{stats?.customers || 0}</p>
                <p className="text-muted-foreground">Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((q) => (
                <button
                  key={q.panel}
                  onClick={() => onNavigate(q.panel)}
                  className="p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                >
                  <q.icon className="h-5 w-5 text-primary mb-1.5" />
                  <p className="text-sm font-medium">{q.label}</p>
                  <p className="text-[11px] text-muted-foreground">{q.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
