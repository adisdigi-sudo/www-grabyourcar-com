import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sparkles, ArrowRight, Users, TrendingUp, Target, CheckCircle, Clock, AlertTriangle
} from "lucide-react";

export const CrossVerticalIntelligence = () => {
  const { data: opportunities } = useQuery({
    queryKey: ["cross-sell-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cross_sell_opportunities")
        .select("*, unified_customers(name, phone)")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ["cross-sell-metrics"],
    queryFn: async () => {
      const { count: totalCustomers } = await supabase
        .from("unified_customers")
        .select("*", { count: "exact", head: true });

      const { count: multiVertical } = await supabase
        .from("unified_customers")
        .select("*", { count: "exact", head: true })
        .or("is_car_buyer.eq.true,is_insurance_client.eq.true,is_loan_client.eq.true")
        .or("is_car_buyer.eq.true,is_insurance_client.eq.true");

      const { count: openOps } = await supabase
        .from("cross_sell_opportunities")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");

      const { count: convertedOps } = await supabase
        .from("cross_sell_opportunities")
        .select("*", { count: "exact", head: true })
        .eq("status", "converted");

      return {
        totalCustomers: totalCustomers || 0,
        multiVertical: multiVertical || 0,
        openOps: openOps || 0,
        convertedOps: convertedOps || 0,
      };
    },
  });

  const markContacted = async (id: string) => {
    const { error } = await supabase.from("cross_sell_opportunities").update({ status: "contacted" }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Marked as contacted");
  };

  const kpis = [
    { label: "Unified Customers", value: metrics?.totalCustomers || 0, icon: Users, color: "text-blue-500" },
    { label: "Multi-Vertical", value: metrics?.multiVertical || 0, icon: Target, color: "text-green-500" },
    { label: "Open Opportunities", value: metrics?.openOps || 0, icon: Clock, color: "text-amber-500" },
    { label: "Converted", value: metrics?.convertedOps || 0, icon: CheckCircle, color: "text-primary" },
  ];

  const priorityColor = (p: string) => {
    if (p === "high") return "destructive";
    if (p === "medium") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          Cross-Vertical Intelligence
        </h1>
        <p className="text-muted-foreground mt-1">AI-driven cross-sell opportunities across all verticals</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
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
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Open Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!opportunities?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No open cross-sell opportunities yet. They will appear as customers interact across verticals.</p>
          ) : (
            <div className="space-y-3">
              {opportunities.map((op: any) => (
                <div key={op.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{op.unified_customers?.name || op.unified_customers?.phone || "Unknown"}</span>
                      <Badge variant={priorityColor(op.priority)} className="text-[10px]">{op.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="outline" className="capitalize text-[10px]">{op.source_vertical}</Badge>
                      <ArrowRight className="h-3 w-3" />
                      <Badge variant="secondary" className="capitalize text-[10px]">{op.target_vertical}</Badge>
                    </div>
                    {op.suggested_action && <p className="text-xs mt-1">{op.suggested_action}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {op.estimated_value && <span className="text-sm font-medium">₹{Number(op.estimated_value).toLocaleString("en-IN")}</span>}
                    <Button size="sm" variant="outline" onClick={() => markContacted(op.id)}>Contacted</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
