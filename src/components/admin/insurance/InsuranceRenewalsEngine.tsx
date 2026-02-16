import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { triggerWhatsApp } from "@/lib/whatsappTrigger";
import {
  RefreshCw, AlertTriangle, Clock, CheckCircle2, XCircle,
  Bell, Send, Calendar, Phone, Loader2, Zap, MessageSquare
} from "lucide-react";

export function InsuranceRenewalsEngine() {
  const [windowFilter, setWindowFilter] = useState("all");
  const [runningEngine, setRunningEngine] = useState(false);
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ["ins-renewals-engine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("*, insurance_clients(customer_name, phone, vehicle_number, city)")
        .eq("status", "active")
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const now = new Date();
  const enriched = policies?.map((p: any) => {
    const exp = new Date(p.expiry_date);
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
    let urgency = "safe";
    if (daysLeft <= 0) urgency = "expired";
    else if (daysLeft <= 7) urgency = "critical";
    else if (daysLeft <= 15) urgency = "urgent";
    else if (daysLeft <= 30) urgency = "warning";
    else if (daysLeft <= 60) urgency = "upcoming";
    return { ...p, daysLeft, urgency };
  }) || [];

  const filtered = windowFilter === "all" ? enriched : enriched.filter((p) => {
    if (windowFilter === "expired") return p.urgency === "expired";
    if (windowFilter === "7") return p.daysLeft > 0 && p.daysLeft <= 7;
    if (windowFilter === "15") return p.daysLeft > 0 && p.daysLeft <= 15;
    if (windowFilter === "30") return p.daysLeft > 0 && p.daysLeft <= 30;
    if (windowFilter === "60") return p.daysLeft > 0 && p.daysLeft <= 60;
    return true;
  });

  const summary = {
    expired: enriched.filter(p => p.urgency === "expired").length,
    critical: enriched.filter(p => p.urgency === "critical").length,
    urgent: enriched.filter(p => p.urgency === "urgent").length,
    warning: enriched.filter(p => p.urgency === "warning").length,
    upcoming: enriched.filter(p => p.urgency === "upcoming").length,
  };

  const URGENCY_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
    expired: { bg: "bg-destructive/10", text: "text-destructive", icon: XCircle },
    critical: { bg: "bg-destructive/5", text: "text-destructive", icon: AlertTriangle },
    urgent: { bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-700 dark:text-orange-400", icon: Clock },
    warning: { bg: "bg-yellow-50 dark:bg-yellow-950/20", text: "text-yellow-700 dark:text-yellow-400", icon: Bell },
    upcoming: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400", icon: Calendar },
    safe: { bg: "bg-green-50 dark:bg-green-950/20", text: "text-green-700 dark:text-green-400", icon: CheckCircle2 },
  };

  const runRenewalEngine = async () => {
    setRunningEngine(true);
    try {
      const { data, error } = await supabase.functions.invoke("insurance-renewal-engine", {
        body: { action: "all" },
      });
      if (error) throw error;
      toast.success(`Engine complete: ${data.triggered} reminders sent, ${data.tasks_created} tasks created, ${data.recovered} recoveries`);
      queryClient.invalidateQueries({ queryKey: ["ins-renewals-engine"] });
    } catch (e: any) {
      toast.error(e.message || "Engine failed");
    } finally {
      setRunningEngine(false);
    }
  };

  const sendRenewalNudge = (p: any) => {
    const client = p.insurance_clients;
    if (!client?.phone) { toast.error("No phone number"); return; }
    triggerWhatsApp({
      event: p.daysLeft <= 0 ? "insurance_renewal_lapsed" : "insurance_renewal_manual",
      phone: client.phone,
      name: client.customer_name || "Customer",
      data: {
        days_left: String(Math.abs(p.daysLeft)),
        expiry_date: p.expiry_date,
        insurer: p.insurer || "",
        premium: String(p.premium_amount || ""),
        vehicle: client.vehicle_number || "",
        policy_number: p.policy_number || "",
      },
    });
    toast.success(`Renewal nudge sent to ${client.customer_name || client.phone}`);
  };

  return (
    <div className="space-y-4">
      {/* Run Engine Button */}
      <div className="flex justify-end">
        <Button onClick={runRenewalEngine} disabled={runningEngine} className="gap-1.5">
          {runningEngine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {runningEngine ? "Running..." : "Run Renewal Engine"}
        </Button>
      </div>

      {/* Renewal Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Expired", count: summary.expired, color: "text-destructive", bgColor: "bg-destructive/10", filter: "expired" },
          { label: "≤ 7 Days", count: summary.critical, color: "text-destructive", bgColor: "bg-destructive/5", filter: "7" },
          { label: "≤ 15 Days", count: summary.urgent, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-950/20", filter: "15" },
          { label: "≤ 30 Days", count: summary.warning, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-950/20", filter: "30" },
          { label: "≤ 60 Days", count: summary.upcoming, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/20", filter: "60" },
        ].map(s => (
          <Card
            key={s.label}
            className={`cursor-pointer hover:shadow-md transition-all ${windowFilter === s.filter ? "ring-2 ring-primary" : ""}`}
            onClick={() => setWindowFilter(windowFilter === s.filter ? "all" : s.filter)}
          >
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Renewals List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Renewal Pipeline
              </CardTitle>
              <CardDescription>
                {filtered.length} policies {windowFilter !== "all" ? `in selected window` : "total"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((p: any) => {
                const style = URGENCY_STYLES[p.urgency];
                const Icon = style.icon;
                return (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl ${style.bg} transition-all hover:shadow-sm`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg}`}>
                        <Icon className={`h-4 w-4 ${style.text}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{p.insurance_clients?.customer_name || "—"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" /> {p.insurance_clients?.phone}
                          {p.insurance_clients?.vehicle_number && (
                            <span>• {p.insurance_clients.vehicle_number}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <Badge className={`${style.bg} ${style.text} border-0 text-[10px]`}>
                          {p.daysLeft <= 0 ? `Expired ${Math.abs(p.daysLeft)}d ago` : `${p.daysLeft} days left`}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {p.insurer} • ₹{p.premium_amount?.toLocaleString("en-IN") || 0}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => { e.stopPropagation(); sendRenewalNudge(p); }}
                        title="Send WhatsApp renewal nudge"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No policies in this window</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
