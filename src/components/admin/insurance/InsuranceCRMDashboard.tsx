import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileText, AlertTriangle, CheckCircle2, DollarSign, Clock,
  TrendingUp, RefreshCw, ArrowUpRight, Briefcase, ShieldCheck
} from "lucide-react";

export function InsuranceCRMDashboard() {
  const { data: clients } = useQuery({
    queryKey: ["ins-crm-clients-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, lead_status, created_at, policy_expiry_date, assigned_advisor_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: policies } = useQuery({
    queryKey: ["ins-crm-policies-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("id, status, premium_amount, expiry_date, renewal_status, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["ins-crm-tasks-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_tasks")
        .select("id, status, priority, due_date")
        .in("status", ["pending", "in_progress"]);
      if (error) throw error;
      return data;
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["ins-crm-commissions-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_commissions")
        .select("id, total_earned, status, created_at");
      if (error) throw error;
      return data;
    },
  });

  const today = new Date().toDateString();
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400000);

  const stats = {
    totalClients: clients?.length || 0,
    newToday: clients?.filter(c => new Date(c.created_at).toDateString() === today).length || 0,
    activePolicies: policies?.filter(p => p.status === "active").length || 0,
    expiringIn30: policies?.filter(p => {
      if (!p.expiry_date) return false;
      const exp = new Date(p.expiry_date);
      return exp >= now && exp <= in30Days && p.status === "active";
    }).length || 0,
    totalPremium: policies?.reduce((s, p) => s + (p.premium_amount || 0), 0) || 0,
    totalCommission: commissions?.reduce((s, c) => s + (c.total_earned || 0), 0) || 0,
    pendingTasks: tasks?.filter(t => t.status === "pending").length || 0,
    urgentTasks: tasks?.filter(t => t.priority === "urgent" || t.priority === "high").length || 0,
    renewalsPending: policies?.filter(p => p.renewal_status === "pending" && p.status === "active").length || 0,
    converted: clients?.filter(c => c.lead_status === "converted").length || 0,
  };

  const conversionRate = stats.totalClients > 0
    ? ((stats.converted / stats.totalClients) * 100).toFixed(1)
    : "0";

  const statCards = [
    { label: "Total Clients", value: stats.totalClients, sub: `+${stats.newToday} today`, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active Policies", value: stats.activePolicies, sub: `${stats.expiringIn30} expiring soon`, icon: ShieldCheck, color: "text-chart-2", bg: "bg-chart-2/10" },
    { label: "Premium Collected", value: `₹${(stats.totalPremium / 1000).toFixed(0)}K`, sub: "Total premium", icon: DollarSign, color: "text-chart-1", bg: "bg-chart-1/10" },
    { label: "Commission Earned", value: `₹${(stats.totalCommission / 1000).toFixed(0)}K`, sub: "All advisors", icon: TrendingUp, color: "text-chart-4", bg: "bg-chart-4/10" },
    { label: "Renewals Due", value: stats.expiringIn30, sub: "Next 30 days", icon: RefreshCw, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Pending Tasks", value: stats.pendingTasks, sub: `${stats.urgentTasks} urgent`, icon: Clock, color: "text-chart-5", bg: "bg-chart-5/10" },
    { label: "Conversion Rate", value: `${conversionRate}%`, sub: `${stats.converted} converted`, icon: ArrowUpRight, color: "text-chart-3", bg: "bg-chart-3/10" },
    { label: "Pipeline", value: clients?.filter(c => !["converted", "lost", "closed"].includes(c.lead_status || "")).length || 0, sub: "Active leads", icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold truncate">{s.value}</p>
                <p className="text-[11px] text-muted-foreground truncate">{s.label}</p>
                <p className="text-[10px] text-muted-foreground/70 truncate">{s.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Alerts */}
      {(stats.expiringIn30 > 0 || stats.urgentTasks > 0) && (
        <div className="flex flex-wrap gap-2">
          {stats.expiringIn30 > 0 && (
            <Badge variant="destructive" className="gap-1 py-1 px-3">
              <AlertTriangle className="h-3 w-3" />
              {stats.expiringIn30} policies expiring in 30 days
            </Badge>
          )}
          {stats.urgentTasks > 0 && (
            <Badge variant="outline" className="gap-1 py-1 px-3 border-destructive text-destructive">
              <Clock className="h-3 w-3" />
              {stats.urgentTasks} urgent tasks pending
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
