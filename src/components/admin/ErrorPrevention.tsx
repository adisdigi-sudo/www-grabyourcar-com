import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, FileX, Phone, CheckCircle, XCircle, Shield, Bell } from "lucide-react";
import { toast } from "sonner";

export const ErrorPrevention = () => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Untouched leads (no call log in 24h)
  const { data: untouchedLeads } = useQuery({
    queryKey: ["untouched-leads"],
    queryFn: async () => {
      // Get leads created > 24h ago
      const { data: leads, error } = await supabase
        .from("leads")
        .select("id, customer_name, phone, created_at, status, priority")
        .lte("created_at", twentyFourHoursAgo)
        .in("status", ["new", "contacted"])
        .order("created_at", { ascending: true })
        .limit(20);
      if (error) throw error;

      // Check which have recent call logs
      if (!leads?.length) return [];
      const { data: recentCalls } = await supabase
        .from("call_logs")
        .select("lead_id")
        .gte("created_at", fortyEightHoursAgo)
        .in("lead_id", leads.map((l) => l.id));

      const calledIds = new Set(recentCalls?.map((c) => c.lead_id) || []);
      return leads.filter((l) => !calledIds.has(l.id));
    },
  });

  // Loan leads missing documents (converted but no docs)
  const { data: missingDocs } = useQuery({
    queryKey: ["missing-docs-loans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_applications")
        .select("id, customer_name, phone, stage, created_at")
        .in("stage", ["sanctioned", "disbursement_pending"])
        .limit(20);
      if (error) throw error;

      if (!data?.length) return [];
      const { data: docs } = await supabase
        .from("loan_documents")
        .select("application_id")
        .in("application_id", data.map((d) => d.id));

      const docMap = new Set(docs?.map((d) => d.application_id) || []);
      return data.filter((d) => !docMap.has(d.id));
    },
  });

  // Insurance clients with missing policy numbers
  const { data: missingPolicies } = useQuery({
    queryKey: ["missing-policy-numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, lead_status, created_at")
        .eq("lead_status", "Won")
        .is("current_policy_number", null)
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Expired insurance without renewal follow-up
  const { data: expiredNoFollowup } = useQuery({
    queryKey: ["expired-no-followup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, policy_expiry_date")
        .lt("policy_expiry_date", new Date().toISOString().split("T")[0])
        .not("lead_status", "eq", "Lost")
        .order("policy_expiry_date", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const alerts = [
    {
      title: "Untouched Leads (24h+)",
      description: "Leads with no call activity in the last 24 hours",
      icon: Clock,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      count: untouchedLeads?.length || 0,
      items: untouchedLeads?.map((l: any) => ({
        label: l.customer_name || l.phone,
        sub: `Created ${new Date(l.created_at).toLocaleDateString("en-IN")}`,
        priority: l.priority,
      })) || [],
      severity: "critical" as const,
    },
    {
      title: "Missing Loan Documents",
      description: "Sanctioned loans without uploaded documents",
      icon: FileX,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      count: missingDocs?.length || 0,
      items: missingDocs?.map((d: any) => ({
        label: d.customer_name || d.phone,
        sub: `Stage: ${d.stage}`,
      })) || [],
      severity: "warning" as const,
    },
    {
      title: "Won Leads Without Policy #",
      description: "Insurance leads marked Won but missing policy number",
      icon: Shield,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      count: missingPolicies?.length || 0,
      items: missingPolicies?.map((p: any) => ({
        label: p.customer_name || p.phone,
        sub: `Since ${new Date(p.created_at).toLocaleDateString("en-IN")}`,
      })) || [],
      severity: "warning" as const,
    },
    {
      title: "Expired — No Follow-up",
      description: "Expired insurance policies with no renewal activity",
      icon: Bell,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      count: expiredNoFollowup?.length || 0,
      items: expiredNoFollowup?.map((e: any) => ({
        label: e.customer_name || e.phone,
        sub: `Expired ${new Date(e.policy_expiry_date).toLocaleDateString("en-IN")}`,
      })) || [],
      severity: "info" as const,
    },
  ];

  const totalIssues = alerts.reduce((s, a) => s + a.count, 0);
  const criticalCount = alerts.filter((a) => a.severity === "critical").reduce((s, a) => s + a.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
            Error Prevention Center
          </h1>
          <p className="text-muted-foreground mt-1">Auto-alerts, missing data, and process guardrails</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="destructive" className="px-3 py-1.5">
            {criticalCount} Critical
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5">
            {totalIssues} Total Issues
          </Badge>
        </div>
      </div>

      {/* Health Score */}
      <Card className={totalIssues === 0 ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}>
        <CardContent className="p-6 flex items-center gap-4">
          {totalIssues === 0 ? (
            <>
              <CheckCircle className="h-10 w-10 text-green-500" />
              <div>
                <h3 className="text-xl font-bold text-green-600">All Clear!</h3>
                <p className="text-sm text-muted-foreground">No pending issues detected across all verticals</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="h-10 w-10 text-amber-500" />
              <div>
                <h3 className="text-xl font-bold text-amber-600">{totalIssues} Issues Need Attention</h3>
                <p className="text-sm text-muted-foreground">Review and resolve issues below to maintain data quality</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Alert Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {alerts.map((alert) => (
          <Card key={alert.title} className={alert.count > 0 ? "" : "opacity-60"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.bgColor}`}>
                    <alert.icon className={`h-4 w-4 ${alert.color}`} />
                  </div>
                  {alert.title}
                </CardTitle>
                <Badge variant={alert.count > 0 ? (alert.severity === "critical" ? "destructive" : "secondary") : "outline"}>
                  {alert.count}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{alert.description}</p>
            </CardHeader>
            <CardContent>
              {alert.count === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">✅ No issues</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {alert.items.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded border text-sm">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.sub}</p>
                      </div>
                      {(item as any).priority && (
                        <Badge variant={(item as any).priority === "hot" ? "destructive" : "outline"} className="text-[10px]">
                          {(item as any).priority}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {alert.items.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">+{alert.items.length - 5} more</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ErrorPrevention;
