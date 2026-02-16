import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap, Users, Shield, Banknote, ShoppingBag, Car, Clock,
  Send, CheckCircle2, AlertTriangle, TrendingUp, ArrowRight,
  Bell, MessageSquare, Activity, Target, Sparkles
} from "lucide-react";

interface CRMAlert {
  id: string;
  type: "warning" | "opportunity" | "success" | "info";
  icon: typeof Zap;
  title: string;
  description: string;
  action?: string;
  actionTab?: string;
}

export function CRMCommandWidget({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  // Journey trigger stats
  const { data: journeyStats } = useQuery({
    queryKey: ["crm-widget-journey-stats"],
    queryFn: async () => {
      const { count: pending } = await supabase
        .from("customer_journey_triggers")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      const { count: sent } = await supabase
        .from("customer_journey_triggers")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent");
      const { count: converted } = await supabase
        .from("customer_journey_triggers")
        .select("*", { count: "exact", head: true })
        .eq("status", "converted");
      return { pending: pending || 0, sent: sent || 0, converted: converted || 0 };
    },
    refetchInterval: 60000,
  });

  // Unified customer stats
  const { data: crmStats } = useQuery({
    queryKey: ["crm-widget-customer-stats"],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("unified_customers")
        .select("*", { count: "exact", head: true });
      const { count: recentActive } = await supabase
        .from("unified_customers")
        .select("*", { count: "exact", head: true })
        .gte("last_activity_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      return { total: total || 0, recentActive: recentActive || 0 };
    },
    refetchInterval: 60000,
  });

  // Recent leads (last 24h)
  const { data: recentLeadCount } = useQuery({
    queryKey: ["crm-widget-recent-leads"],
    queryFn: async () => {
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Build smart alerts
  const alerts: CRMAlert[] = [];

  if (journeyStats && journeyStats.pending > 5) {
    alerts.push({
      id: "pending-triggers",
      type: "warning",
      icon: Clock,
      title: `${journeyStats.pending} pending journey triggers`,
      description: "Cross-sell messages waiting to be sent",
      action: "Execute Now",
      actionTab: "journey-automation",
    });
  }

  if (recentLeadCount && recentLeadCount > 0) {
    alerts.push({
      id: "new-leads",
      type: "info",
      icon: Users,
      title: `${recentLeadCount} new leads in 24h`,
      description: "Fresh inquiries ready for follow-up",
      action: "View Leads",
      actionTab: "leads-all",
    });
  }

  if (journeyStats && journeyStats.converted > 0) {
    alerts.push({
      id: "conversions",
      type: "success",
      icon: CheckCircle2,
      title: `${journeyStats.converted} journey conversions`,
      description: "Cross-sell triggers that converted to customers",
      action: "View Analytics",
      actionTab: "journey-automation",
    });
  }

  if (crmStats && crmStats.total > 0 && crmStats.recentActive < crmStats.total * 0.1) {
    alerts.push({
      id: "low-engagement",
      type: "opportunity",
      icon: TrendingUp,
      title: "Low engagement detected",
      description: `Only ${crmStats.recentActive} of ${crmStats.total} customers active this week`,
      action: "Re-Engage",
      actionTab: "journey-automation",
    });
  }

  const alertColors = {
    warning: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
    opportunity: "border-l-purple-500 bg-purple-50 dark:bg-purple-950/20",
    success: "border-l-green-500 bg-green-50 dark:bg-green-950/20",
    info: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          CRM Intelligence
          {journeyStats && journeyStats.pending > 0 && (
            <Badge variant="destructive" className="text-[9px] ml-auto">{journeyStats.pending} pending</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Customers", value: crmStats?.total || 0, icon: Users, color: "text-primary" },
            { label: "Pending", value: journeyStats?.pending || 0, icon: Clock, color: "text-yellow-600" },
            { label: "Sent", value: journeyStats?.sent || 0, icon: Send, color: "text-blue-600" },
            { label: "Converted", value: journeyStats?.converted || 0, icon: CheckCircle2, color: "text-green-600" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <s.icon className={`h-3.5 w-3.5 mx-auto mb-0.5 ${s.color}`} />
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Smart Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.slice(0, 3).map(alert => (
              <div
                key={alert.id}
                className={`border-l-4 rounded-r-lg p-2.5 ${alertColors[alert.type]}`}
              >
                <div className="flex items-start gap-2">
                  <alert.icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{alert.title}</p>
                    <p className="text-[10px] text-muted-foreground">{alert.description}</p>
                  </div>
                  {alert.action && onNavigate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] flex-shrink-0"
                      onClick={() => onNavigate(alert.actionTab!)}
                    >
                      {alert.action} <ArrowRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {alerts.length === 0 && (
          <div className="text-center py-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">All systems healthy — no action needed</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-[10px] h-7 gap-1"
            onClick={() => onNavigate?.("unified-crm")}
          >
            <Users className="h-3 w-3" /> Master CRM
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-[10px] h-7 gap-1"
            onClick={() => onNavigate?.("journey-automation")}
          >
            <Zap className="h-3 w-3" /> Journeys
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
