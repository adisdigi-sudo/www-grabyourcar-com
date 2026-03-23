import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, IndianRupee, TrendingUp, User } from "lucide-react";
import { format } from "date-fns";

export function SalesDealTracker() {
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["sales-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_pipeline")
        .select("*")
        .eq("status_outcome", "won")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const totalDeals = deals.length;
  const totalRevenue = deals.reduce((s: number, d: any) => s + (d.deal_value || 0), 0);
  const avgDeal = totalDeals > 0 ? Math.round(totalRevenue / totalDeals) : 0;

  const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      {/* Deal KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Deals", value: totalDeals, icon: Car, color: "text-blue-600" },
          { label: "Total Revenue", value: formatINR(totalRevenue), icon: IndianRupee, color: "text-emerald-600" },
          { label: "Avg Deal Size", value: formatINR(avgDeal), icon: TrendingUp, color: "text-violet-600" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <div>
                  <p className="text-lg font-bold leading-none">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deal Cards */}
      {deals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No closed deals yet</div>
      ) : (
        <div className="space-y-2">
          {deals.map((deal: any) => (
            <Card key={deal.id} className="border hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{deal.customer_name}</span>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">Won</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {[deal.car_brand, deal.car_model, deal.car_variant].filter(Boolean).join(" ") || "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {deal.source || "—"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {deal.deal_value ? (
                      <p className="font-bold text-emerald-600">{formatINR(deal.deal_value)}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No value set</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {deal.delivery_date
                        ? format(new Date(deal.delivery_date), "dd MMM yyyy")
                        : deal.updated_at
                        ? format(new Date(deal.updated_at), "dd MMM yyyy")
                        : ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
