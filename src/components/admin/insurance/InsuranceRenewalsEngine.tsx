import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { triggerWhatsApp } from "@/lib/whatsappTrigger";
import {
  RefreshCw, AlertTriangle, Clock, CheckCircle2, XCircle,
  Bell, Calendar, Phone, Loader2, Zap, MessageSquare,
  Share2, Mail, Search, TrendingUp, Star, PhoneCall
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, differenceInDays } from "date-fns";

export function InsuranceRenewalsEngine() {
  const [windowFilter, setWindowFilter] = useState("all");
  const [runningEngine, setRunningEngine] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ["ins-renewals-engine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("*, insurance_clients(customer_name, phone, email, vehicle_number, city)")
        .eq("status", "active")
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const now = useMemo(() => new Date(), []);

  const enriched = useMemo(() => {
    if (!policies) return [];
    return policies.map((p: any) => {
      const daysLeft = p.expiry_date ? differenceInDays(new Date(p.expiry_date), now) : null;
      let urgency = "safe";
      if (daysLeft === null) urgency = "unknown";
      else if (daysLeft <= 0) urgency = "expired";
      else if (daysLeft <= 7) urgency = "critical";
      else if (daysLeft <= 15) urgency = "urgent";
      else if (daysLeft <= 30) urgency = "warning";
      else if (daysLeft <= 60) urgency = "upcoming";

      // Priority scoring
      const premium = Number(p.premium_amount || 0);
      let priorityScore = 0;
      if (premium >= 50000) priorityScore += 3;
      else if (premium >= 20000) priorityScore += 2;
      else if (premium >= 10000) priorityScore += 1;
      if (daysLeft !== null && daysLeft <= 7 && daysLeft >= 0) priorityScore += 3;
      else if (daysLeft !== null && daysLeft <= 15) priorityScore += 2;
      else if (daysLeft !== null && daysLeft <= 30) priorityScore += 1;

      return { ...p, daysLeft, urgency, priorityScore };
    });
  }, [policies, now]);

  const filtered = useMemo(() => {
    let result = windowFilter === "all" ? enriched : enriched.filter((p) => {
      if (windowFilter === "expired") return p.urgency === "expired";
      if (windowFilter === "7") return p.daysLeft !== null && p.daysLeft > 0 && p.daysLeft <= 7;
      if (windowFilter === "15") return p.daysLeft !== null && p.daysLeft > 0 && p.daysLeft <= 15;
      if (windowFilter === "30") return p.daysLeft !== null && p.daysLeft > 0 && p.daysLeft <= 30;
      if (windowFilter === "60") return p.daysLeft !== null && p.daysLeft > 0 && p.daysLeft <= 60;
      if (windowFilter === "high_value") return Number(p.premium_amount || 0) >= 20000;
      return true;
    });

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(p =>
        p.insurance_clients?.customer_name?.toLowerCase().includes(s) ||
        p.insurance_clients?.phone?.includes(s) ||
        p.insurance_clients?.vehicle_number?.toLowerCase().includes(s) ||
        p.policy_number?.toLowerCase().includes(s)
      );
    }

    return result.sort((a, b) => b.priorityScore - a.priorityScore);
  }, [enriched, windowFilter, search]);

  const summary = useMemo(() => ({
    expired: enriched.filter(p => p.urgency === "expired").length,
    critical: enriched.filter(p => p.urgency === "critical").length,
    urgent: enriched.filter(p => p.urgency === "urgent").length,
    warning: enriched.filter(p => p.urgency === "warning").length,
    upcoming: enriched.filter(p => p.urgency === "upcoming").length,
    highValue: enriched.filter(p => Number(p.premium_amount || 0) >= 20000).length,
    totalPremium: enriched.reduce((s, p) => s + Number(p.premium_amount || 0), 0),
  }), [enriched]);

  const URGENCY_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
    expired: { bg: "bg-destructive/10", text: "text-destructive", icon: XCircle },
    critical: { bg: "bg-destructive/5", text: "text-destructive", icon: AlertTriangle },
    urgent: { bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-700 dark:text-orange-400", icon: Clock },
    warning: { bg: "bg-yellow-50 dark:bg-yellow-950/20", text: "text-yellow-700 dark:text-yellow-400", icon: Bell },
    upcoming: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400", icon: Calendar },
    safe: { bg: "bg-green-50 dark:bg-green-950/20", text: "text-green-700 dark:text-green-400", icon: CheckCircle2 },
    unknown: { bg: "bg-muted/30", text: "text-muted-foreground", icon: Clock },
  };

  const runRenewalEngine = async () => {
    setRunningEngine(true);
    try {
      const { data, error } = await supabase.functions.invoke("insurance-renewal-engine", {
        body: { action: "all" },
      });
      if (error) throw error;
      toast.success(`Engine complete: ${data.triggered} reminders, ${data.tasks_created} tasks, ${data.recovered} recoveries`);
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
        days_left: String(Math.abs(p.daysLeft || 0)),
        expiry_date: p.expiry_date || "",
        insurer: p.insurer || "",
        premium: String(p.premium_amount || ""),
        vehicle: client.vehicle_number || "",
        policy_number: p.policy_number || "",
      },
    });
    toast.success(`Nudge sent to ${client.customer_name || client.phone}`);
  };

  const sharePolicy = (p: any) => {
    const c = p.insurance_clients;
    const text = `📋 Renewal Alert\n━━━━━━━━━━━━━━━━\n👤 ${c?.customer_name || "—"}\n📄 Policy: ${p.policy_number || "N/A"}\n🏢 ${p.insurer || "—"}\n🚗 ${c?.vehicle_number || "—"}\n💰 Premium: ₹${Number(p.premium_amount || 0).toLocaleString("en-IN")}\n📅 Expiry: ${p.expiry_date ? format(new Date(p.expiry_date), "dd MMM yyyy") : "N/A"}\n⏳ ${p.daysLeft !== null ? (p.daysLeft <= 0 ? `Expired ${Math.abs(p.daysLeft)}d ago` : `${p.daysLeft} days left`) : "N/A"}\n\n— Grabyourcar Insurance`;
    if (navigator.share) {
      navigator.share({ title: `Renewal - ${c?.customer_name}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied!");
    }
  };

  const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" /> Renewal Conversion Engine
          </h2>
          <p className="text-sm text-muted-foreground">
            {enriched.length} active policies • ₹{(summary.totalPremium / 100000).toFixed(1)}L total premium
          </p>
        </div>
        <Button onClick={runRenewalEngine} disabled={runningEngine} className="gap-1.5">
          {runningEngine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {runningEngine ? "Running..." : "Run Auto-Reminders"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {[
          { label: "Expired", count: summary.expired, color: "text-destructive", bg: "bg-destructive/10", filter: "expired" },
          { label: "≤ 7 Days", count: summary.critical, color: "text-destructive", bg: "bg-destructive/5", filter: "7" },
          { label: "≤ 15 Days", count: summary.urgent, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/20", filter: "15" },
          { label: "≤ 30 Days", count: summary.warning, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/20", filter: "30" },
          { label: "≤ 60 Days", count: summary.upcoming, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20", filter: "60" },
          { label: "High Value", count: summary.highValue, color: "text-primary", bg: "bg-primary/10", filter: "high_value" },
          { label: "All Active", count: enriched.length, color: "text-foreground", bg: "bg-muted/50", filter: "all" },
        ].map(s => (
          <Card
            key={s.label}
            className={`cursor-pointer hover:shadow-md transition-all ${windowFilter === s.filter ? "ring-2 ring-primary" : ""}`}
            onClick={() => setWindowFilter(windowFilter === s.filter ? "all" : s.filter)}
          >
            <CardContent className="pt-3 pb-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, phone, policy, vehicle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
      </div>

      {/* Renewals List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Renewal Pipeline — {filtered.length} policies
          </CardTitle>
          <CardDescription className="text-xs">Sorted by priority score (high premium + urgency)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No policies in this window</p>
          ) : (
            <div className="divide-y">
              {filtered.map((p: any) => {
                const style = URGENCY_STYLES[p.urgency] || URGENCY_STYLES.unknown;
                const Icon = style.icon;
                const client = p.insurance_clients;
                const phone = displayPhone(client?.phone);
                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedPolicy(p)}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}>
                        <Icon className={`h-4 w-4 ${style.text}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{client?.customer_name || "—"}</p>
                          {p.priorityScore >= 4 && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="font-mono">{p.policy_number || "—"}</span>
                          <span>{p.insurer || "—"}</span>
                          {client?.vehicle_number && <span>{client.vehicle_number}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right hidden sm:block">
                        <Badge className={`${style.bg} ${style.text} border-0 text-[10px]`}>
                          {p.daysLeft !== null ? (p.daysLeft <= 0 ? `Expired ${Math.abs(p.daysLeft)}d` : `${p.daysLeft}d left`) : "—"}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          ₹{Number(p.premium_amount || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      {phone && (
                        <>
                          <a href={`tel:${phone}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Call">
                              <PhoneCall className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                          </a>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="WhatsApp" onClick={(e) => { e.stopPropagation(); sendRenewalNudge(p); }}>
                            <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Share" onClick={(e) => { e.stopPropagation(); sharePolicy(p); }}>
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policy Detail Dialog */}
      {selectedPolicy && (
        <Dialog open onOpenChange={() => setSelectedPolicy(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">Renewal Details</DialogTitle>
            </DialogHeader>
            <RenewalDetailView policy={selectedPolicy} onShare={() => sharePolicy(selectedPolicy)} onNudge={() => sendRenewalNudge(selectedPolicy)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function RenewalDetailView({ policy, onShare, onNudge }: { policy: any; onShare: () => void; onNudge: () => void }) {
  const client = policy.insurance_clients;
  const phone = (!client?.phone || client.phone.startsWith("IB_")) ? null : client.phone;
  const reminderSchedule = [
    { days: 60, label: "60-day awareness" },
    { days: 45, label: "45-day reminder" },
    { days: 30, label: "30-day reminder" },
    { days: 15, label: "15-day urgency" },
    { days: 7, label: "7-day priority" },
    { days: 1, label: "Final reminder" },
  ];

  return (
    <div className="space-y-4">
      {/* Customer */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3">
          <h3 className="font-semibold">{client?.customer_name || "—"}</h3>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
            {phone && <a href={`tel:${phone}`} className="text-primary hover:underline flex items-center gap-1"><Phone className="h-3 w-3" /> {phone}</a>}
            {client?.email && <a href={`mailto:${client.email}`} className="text-primary hover:underline flex items-center gap-1"><Mail className="h-3 w-3" /> {client.email}</a>}
          </div>
        </CardContent>
      </Card>

      {/* Policy Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Policy Number", value: policy.policy_number },
          { label: "Insurer", value: policy.insurer },
          { label: "Vehicle", value: client?.vehicle_number },
          { label: "Premium", value: policy.premium_amount ? `₹${Number(policy.premium_amount).toLocaleString("en-IN")}` : null },
          { label: "Expiry", value: policy.expiry_date ? format(new Date(policy.expiry_date), "dd MMM yyyy") : null },
          { label: "Days Left", value: policy.daysLeft !== null ? (policy.daysLeft <= 0 ? `Expired ${Math.abs(policy.daysLeft)}d ago` : `${policy.daysLeft} days`) : null },
        ].map(item => (
          <div key={item.label}>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="text-sm font-medium">{item.value || "—"}</p>
          </div>
        ))}
      </div>

      {/* Renewal Reminder Timeline */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Bell className="h-4 w-4 text-primary" /> Auto-Reminder Schedule
        </h4>
        <div className="space-y-1">
          {reminderSchedule.map(r => {
            const triggered = policy.daysLeft !== null && policy.daysLeft <= r.days;
            return (
              <div key={r.days} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                triggered ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400" : "bg-muted/30 text-muted-foreground"
              }`}>
                <span className="font-medium">{r.label}</span>
                <Badge variant={triggered ? "default" : "secondary"} className="text-[10px] h-5">
                  {triggered ? "✓ Triggered" : "Scheduled"}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {phone && (
          <>
            <a href={`tel:${phone}`}>
              <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                <PhoneCall className="h-3.5 w-3.5" /> Call
              </Button>
            </a>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onNudge}>
              <MessageSquare className="h-3.5 w-3.5 text-green-600" /> Send WhatsApp
            </Button>
          </>
        )}
        {client?.email && (
          <a href={`mailto:${client.email}`}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </Button>
          </a>
        )}
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onShare}>
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
      </div>
    </div>
  );
}
