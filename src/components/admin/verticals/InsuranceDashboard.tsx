import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, FileText, AlertTriangle, TrendingUp, Clock, CheckCircle, IndianRupee } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const InsuranceDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["insurance-dashboard-stats"],
    queryFn: async () => {
      const { count: totalClients } = await supabase
        .from("client_profiles")
        .select("*", { count: "exact", head: true });

      const { count: expiringPolicies } = await supabase
        .from("client_profiles")
        .select("*", { count: "exact", head: true })
        .not("insurance_expiry", "is", null)
        .lte("insurance_expiry", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

      return {
        totalClients: totalClients || 0,
        expiringPolicies: expiringPolicies || 0,
      };
    },
  });

  const kpis = [
    { label: "Total Policyholders", value: stats?.totalClients || 0, icon: Users, color: "text-blue-500" },
    { label: "Expiring in 30 Days", value: stats?.expiringPolicies || 0, icon: AlertTriangle, color: "text-amber-500" },
    { label: "Renewals This Month", value: "—", icon: Clock, color: "text-green-500" },
    { label: "Revenue This Month", value: "—", icon: IndianRupee, color: "text-primary" },
  ];

  const quickActions = [
    { label: "Insurance CRM", tab: "services-insurance", icon: Shield },
    { label: "Import/Export", tab: "services-insurance-import", icon: FileText },
    { label: "Client Management", tab: "client-management", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          Insurance Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Manage policies, renewals, and claims</p>
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
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Badge key={action.tab} variant="outline" className="px-4 py-2 text-sm cursor-pointer hover:bg-accent">
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
