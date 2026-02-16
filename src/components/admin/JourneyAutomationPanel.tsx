import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Zap, Loader2, RefreshCw, Play, Pause, Send, Clock, CheckCircle2,
  AlertTriangle, ArrowRight, MessageSquare, Users, Car, Shield,
  Banknote, ShoppingBag, Eye, Trash2, BarChart3, Settings, Activity,
  TrendingUp, Filter, Calendar
} from "lucide-react";

const JOURNEY_TYPES = [
  { value: "car_to_insurance", label: "Car → Insurance", icon: Shield, color: "text-green-600 bg-green-100", description: "Car buyer without insurance" },
  { value: "car_to_loan", label: "Car → Loan", icon: Banknote, color: "text-purple-600 bg-purple-100", description: "Car inquiry without financing" },
  { value: "loan_to_car", label: "Loan → Car", icon: Car, color: "text-blue-600 bg-blue-100", description: "Loan approved, no car selected" },
  { value: "insurance_to_accessories", label: "Insurance → Accessories", icon: ShoppingBag, color: "text-orange-600 bg-orange-100", description: "Insured customer, no accessories" },
  { value: "car_to_accessories", label: "Car → Accessories", icon: ShoppingBag, color: "text-amber-600 bg-amber-100", description: "Car buyer, no accessories ordered" },
  { value: "loan_to_insurance", label: "Loan → Insurance", icon: Shield, color: "text-teal-600 bg-teal-100", description: "Loan lead without insurance" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Send },
  converted: { label: "Converted", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  dismissed: { label: "Dismissed", color: "bg-muted text-muted-foreground", icon: Pause },
};

export function JourneyAutomationPanel() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [executing, setExecuting] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch triggers with customer data
  const { data: triggers, isLoading } = useQuery({
    queryKey: ["journey-triggers", statusFilter, typeFilter],
    queryFn: async () => {
      let q = supabase
        .from("customer_journey_triggers")
        .select("*, unified_customers(phone, customer_name, city, email)")
        .order("created_at", { ascending: false })
        .limit(500);

      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (typeFilter !== "all") q = q.eq("trigger_type", typeFilter);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["journey-trigger-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("customer_journey_triggers").select("*", { count: "exact", head: true });
      const { count: pending } = await supabase.from("customer_journey_triggers").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { count: sent } = await supabase.from("customer_journey_triggers").select("*", { count: "exact", head: true }).eq("status", "sent");
      const { count: converted } = await supabase.from("customer_journey_triggers").select("*", { count: "exact", head: true }).eq("status", "converted");
      return { total: total || 0, pending: pending || 0, sent: sent || 0, converted: converted || 0 };
    },
  });

  // Execute all pending triggers
  const executeAll = async () => {
    setExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke("journey-executor", {
        body: { action: "execute_pending" },
      });
      if (error) throw error;
      toast.success(`Executed ${data.processed} triggers, ${data.sent} messages sent`);
      queryClient.invalidateQueries({ queryKey: ["journey-triggers"] });
      queryClient.invalidateQueries({ queryKey: ["journey-trigger-stats"] });
    } catch (e: any) {
      toast.error(e.message || "Execution failed");
    } finally {
      setExecuting(false);
    }
  };

  // Execute single trigger
  const executeSingle = async (triggerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("journey-executor", {
        body: { action: "execute_single", trigger_id: triggerId },
      });
      if (error) throw error;
      toast.success("Message sent successfully");
      queryClient.invalidateQueries({ queryKey: ["journey-triggers"] });
      queryClient.invalidateQueries({ queryKey: ["journey-trigger-stats"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    }
  };

  // Dismiss trigger
  const dismissTrigger = async (triggerId: string) => {
    const { error } = await supabase
      .from("customer_journey_triggers")
      .update({ status: "dismissed" })
      .eq("id", triggerId);
    if (error) toast.error("Failed to dismiss");
    else {
      toast.success("Trigger dismissed");
      queryClient.invalidateQueries({ queryKey: ["journey-triggers"] });
      queryClient.invalidateQueries({ queryKey: ["journey-trigger-stats"] });
    }
  };

  // Mark as converted
  const markConverted = async (triggerId: string) => {
    const { error } = await supabase
      .from("customer_journey_triggers")
      .update({ status: "converted", converted_at: new Date().toISOString() })
      .eq("id", triggerId);
    if (error) toast.error("Failed to update");
    else {
      toast.success("Marked as converted! 🎉");
      queryClient.invalidateQueries({ queryKey: ["journey-triggers"] });
      queryClient.invalidateQueries({ queryKey: ["journey-trigger-stats"] });
    }
  };

  // Re-analyze all customers
  const reAnalyze = async () => {
    setExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-journey-engine", {
        body: { action: "analyze" },
      });
      if (error) throw error;
      toast.success(`Analysis complete: ${data.triggers_created} new triggers created`);
      queryClient.invalidateQueries({ queryKey: ["journey-triggers"] });
      queryClient.invalidateQueries({ queryKey: ["journey-trigger-stats"] });
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setExecuting(false);
    }
  };

  const getJourneyConfig = (type: string) => JOURNEY_TYPES.find(j => j.value === type);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Journey Automation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cross-vertical WhatsApp journeys powered by CRM intelligence
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={reAnalyze} disabled={executing} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${executing ? "animate-spin" : ""}`} />
            Re-Analyze
          </Button>
          <Button onClick={executeAll} disabled={executing} size="sm" className="gap-1.5">
            {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Execute All Pending ({stats?.pending || 0})
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Triggers", value: stats?.total || 0, icon: Activity, color: "text-primary" },
          { label: "Pending", value: stats?.pending || 0, icon: Clock, color: "text-yellow-600" },
          { label: "Sent", value: stats?.sent || 0, icon: Send, color: "text-blue-600" },
          { label: "Converted", value: stats?.converted || 0, icon: CheckCircle2, color: "text-green-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Journey Type Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Journey Flows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {JOURNEY_TYPES.map(j => {
              const count = triggers?.filter(t => t.trigger_type === j.value).length || 0;
              return (
                <div
                  key={j.value}
                  className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setTypeFilter(j.value === typeFilter ? "all" : j.value)}
                >
                  <div className={`p-1.5 rounded-md ${j.color}`}>
                    <j.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{j.label}</p>
                    <p className="text-[10px] text-muted-foreground">{j.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Journey Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Journeys</SelectItem>
            {JOURNEY_TYPES.map(j => (
              <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Triggers List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Journey Triggers
          </CardTitle>
          <CardDescription>{triggers?.length || 0} triggers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {triggers?.map((t: any) => {
                  const jConfig = getJourneyConfig(t.trigger_type);
                  const sConfig = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
                  const customer = t.unified_customers;
                  const StatusIcon = sConfig.icon;

                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-all"
                    >
                      {/* Journey Type Icon */}
                      <div className={`p-2 rounded-lg ${jConfig?.color || "bg-muted text-muted-foreground"}`}>
                        {jConfig ? <jConfig.icon className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                      </div>

                      {/* Customer + Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {customer?.customer_name || customer?.phone || "Unknown"}
                          </p>
                          <Badge className={`${sConfig.color} border-0 text-[9px] gap-0.5`}>
                            <StatusIcon className="h-2.5 w-2.5" /> {sConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {t.recommendation}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>{jConfig?.label || t.trigger_type}</span>
                          <span>•</span>
                          <span>{new Date(t.created_at).toLocaleDateString("en-IN")}</span>
                          {t.sent_at && <><span>•</span><span>Sent: {new Date(t.sent_at).toLocaleDateString("en-IN")}</span></>}
                          {customer?.phone && <><span>•</span><span>{customer.phone}</span></>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        {t.status === "pending" && (
                          <>
                            <Button size="sm" variant="default" className="h-7 px-2 text-[10px] gap-1" onClick={() => executeSingle(t.id)}>
                              <Send className="h-3 w-3" /> Send
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => dismissTrigger(t.id)}>
                              <Pause className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {t.status === "sent" && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] gap-1" onClick={() => markConverted(t.id)}>
                            <CheckCircle2 className="h-3 w-3" /> Converted
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelectedTrigger(t)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {(!triggers || triggers.length === 0) && (
                  <div className="text-center py-8">
                    <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No triggers found. Click "Re-Analyze" to detect cross-sell opportunities.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Trigger Detail Dialog */}
      {selectedTrigger && (
        <Dialog open onOpenChange={() => setSelectedTrigger(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base">Trigger Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{getJourneyConfig(selectedTrigger.trigger_type)?.label}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={`${STATUS_CONFIG[selectedTrigger.status]?.color || ""} border-0 text-xs`}>{selectedTrigger.status}</Badge></div>
                <div><span className="text-muted-foreground">Event:</span> <span>{selectedTrigger.trigger_event}</span></div>
                <div><span className="text-muted-foreground">Created:</span> <span>{new Date(selectedTrigger.created_at).toLocaleString("en-IN")}</span></div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Recommendation:</p>
                <p className="bg-muted/50 p-3 rounded-lg">{selectedTrigger.recommendation}</p>
              </div>
              {selectedTrigger.metadata && (
                <div>
                  <p className="text-muted-foreground mb-1">Metadata:</p>
                  <pre className="bg-muted/50 p-3 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(selectedTrigger.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {selectedTrigger.unified_customers && (
                <div>
                  <p className="text-muted-foreground mb-1">Customer:</p>
                  <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                    <p><strong>{selectedTrigger.unified_customers.customer_name}</strong></p>
                    <p className="text-xs">{selectedTrigger.unified_customers.phone}</p>
                    {selectedTrigger.unified_customers.city && <p className="text-xs">{selectedTrigger.unified_customers.city}</p>}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
