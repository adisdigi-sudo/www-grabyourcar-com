import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Brain, Zap, CheckCircle2, XCircle, Clock, TrendingUp, Send,
  Sparkles, AlertCircle, PlayCircle, Settings, MessageSquare, Mail
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function AIBrainDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("queue");

  // Fetch config
  const { data: config } = useQuery({
    queryKey: ["ai-brain-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_brain_config").select("*").limit(1).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch decisions
  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ["ai-brain-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_brain_decisions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Stats
  const stats = {
    pending: decisions.filter(d => d.status === "pending").length,
    autoSent: decisions.filter(d => d.status === "auto_sent").length,
    sent: decisions.filter(d => d.status === "sent").length,
    rejected: decisions.filter(d => d.status === "rejected").length,
    avgConfidence: decisions.length ? Math.round(decisions.reduce((s, d) => s + Number(d.confidence_score || 0), 0) / decisions.length) : 0,
  };

  // Update config
  const updateConfig = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("ai_brain_config").update(updates).eq("id", config!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-brain-config"] });
      toast.success("AI Brain settings updated");
    },
  });

  // Approve & send
  const approveMutation = useMutation({
    mutationFn: async (decisionId: string) => {
      const dec = decisions.find(d => d.id === decisionId);
      if (!dec) throw new Error("Decision not found");

      const { error: sendErr } = await supabase.functions.invoke("wa-automation-trigger", {
        body: {
          event: "ai_brain_approved",
          phone: dec.customer_phone,
          name: dec.customer_name,
          customMessage: dec.message_content,
        },
      });
      if (sendErr) throw sendErr;

      await supabase.from("ai_brain_decisions").update({
        status: "sent",
        approved_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      }).eq("id", decisionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-brain-decisions"] });
      toast.success("Message sent");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await supabase.from("ai_brain_decisions").update({
        status: "rejected",
        rejected_reason: reason,
      }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-brain-decisions"] });
      toast.success("Rejected");
    },
  });

  // Run now
  const runNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-communication-brain", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["ai-brain-decisions"] });
      queryClient.invalidateQueries({ queryKey: ["ai-brain-config"] });
      const s = data?.summary;
      toast.success(`AI Brain ran: ${s?.decisions || 0} decisions, ${s?.auto_sent || 0} auto-sent, ${s?.queued || 0} queued`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pending = decisions.filter(d => d.status === "pending");
  const sent = decisions.filter(d => ["auto_sent", "sent"].includes(d.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="relative">
              <Brain className="h-8 w-8 text-primary" />
              <Sparkles className="h-4 w-4 text-amber-500 absolute -top-1 -right-1" />
            </div>
            AI Communication Brain
          </h1>
          <p className="text-muted-foreground mt-1">
            Autonomous AI deciding who to contact, what to say, and when — across all 11 verticals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">AI Brain:</span>
            <Switch
              checked={config?.is_enabled ?? false}
              onCheckedChange={(v) => updateConfig.mutate({ is_enabled: v })}
            />
            <Badge variant={config?.is_enabled ? "default" : "secondary"}>
              {config?.is_enabled ? "🟢 Active" : "⚪ Paused"}
            </Badge>
          </div>
          <Button onClick={() => runNow.mutate()} disabled={runNow.isPending} className="gap-2">
            <PlayCircle className="h-4 w-4" />
            {runNow.isPending ? "Running..." : "Run Now"}
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Clock} label="Pending Approval" value={stats.pending} color="amber" />
        <StatCard icon={Zap} label="Auto-Sent" value={stats.autoSent} color="green" />
        <StatCard icon={Send} label="Manually Sent" value={stats.sent} color="blue" />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="red" />
        <StatCard icon={TrendingUp} label="Avg Confidence" value={`${stats.avgConfidence}%`} color="purple" />
      </div>

      {/* Last run */}
      {config?.last_run_at && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Last AI Brain run</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(config.last_run_at), { addSuffix: true })} •
                  Next run in ~{config.scan_interval_minutes} min
                </p>
              </div>
            </div>
            {config.last_run_summary && (
              <div className="text-right text-xs text-muted-foreground">
                <div>Scanned: <span className="font-semibold">{(config.last_run_summary as any).scanned || 0}</span></div>
                <div>Decisions: <span className="font-semibold">{(config.last_run_summary as any).decisions || 0}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="queue" className="gap-2">
            <Clock className="h-4 w-4" />
            Approval Queue ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Sent ({sent.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Suggestions Awaiting Approval</CardTitle>
              <CardDescription>
                Medium-confidence decisions. Review and approve, or let high-confidence ones auto-send.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : pending.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm text-muted-foreground">No pending AI suggestions.</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {pending.map(dec => (
                      <DecisionCard
                        key={dec.id}
                        decision={dec}
                        onApprove={() => approveMutation.mutate(dec.id)}
                        onReject={(reason) => rejectMutation.mutate({ id: dec.id, reason })}
                        isApproving={approveMutation.isPending}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recently Sent Messages</CardTitle>
              <CardDescription>Auto-sent or manually approved messages.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {sent.slice(0, 50).map(dec => (
                    <SentCard key={dec.id} decision={dec} />
                  ))}
                  {sent.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No messages sent yet.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Brain Configuration</CardTitle>
              <CardDescription>Tune autonomy, schedule, and channels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Auto-Send Threshold</label>
                  <Badge variant="outline">{config?.auto_send_threshold || 90}% confidence</Badge>
                </div>
                <Slider
                  value={[config?.auto_send_threshold || 90]}
                  min={50}
                  max={100}
                  step={5}
                  onValueChange={([v]) => updateConfig.mutate({ auto_send_threshold: v })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Decisions above this confidence auto-send. Below it, queued for approval.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Scan Interval</label>
                <Badge variant="outline">Every {config?.scan_interval_minutes || 15} minutes</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Business Hours Only</label>
                  <p className="text-xs text-muted-foreground">
                    Only run between {config?.business_start_hour || 9}:00 - {config?.business_end_hour || 21}:00 IST
                  </p>
                </div>
                <Switch
                  checked={config?.business_hours_only ?? true}
                  onCheckedChange={(v) => updateConfig.mutate({ business_hours_only: v })}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Enabled Verticals</label>
                <div className="flex flex-wrap gap-2">
                  {(config?.enabled_verticals || []).map((v: string) => (
                    <Badge key={v} variant="default" className="capitalize">{v}</Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 text-sm">
                <p className="font-medium mb-1 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  How it works
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Every {config?.scan_interval_minutes || 15} min, AI scans all enabled verticals</li>
                  <li>Picks customers needing outreach (no contact in 24h, recent activity)</li>
                  <li>AI generates personalized message in customer's likely language</li>
                  <li>Confidence ≥ {config?.auto_send_threshold || 90}% → auto-send WhatsApp</li>
                  <li>Lower confidence → queue for manager approval</li>
                  <li>All decisions logged for audit & learning</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colorMap: Record<string, string> = {
    amber: "text-amber-500 bg-amber-500/10",
    green: "text-green-500 bg-green-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    red: "text-red-500 bg-red-500/10",
    purple: "text-purple-500 bg-purple-500/10",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DecisionCard({ decision, onApprove, onReject, isApproving }: any) {
  const ChannelIcon = decision.message_channel === "email" ? Mail : MessageSquare;
  const conf = Number(decision.confidence_score || 0);
  const confColor = conf >= 80 ? "text-green-500" : conf >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <Card className="border-border/50 hover:border-primary/30 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">{decision.vertical}</Badge>
            <Badge variant="secondary" className="gap-1">
              <ChannelIcon className="h-3 w-3" />
              {decision.message_channel}
            </Badge>
            <span className={`text-xs font-semibold ${confColor}`}>{conf}% confident</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(decision.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">{decision.customer_name || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{decision.customer_phone}</p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          {decision.message_subject && <p className="font-medium mb-1">📧 {decision.message_subject}</p>}
          <p className="whitespace-pre-wrap">{decision.message_content}</p>
        </div>

        <div className="text-xs text-muted-foreground italic flex items-start gap-1">
          <Brain className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{decision.reasoning}</span>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={onApprove} disabled={isApproving} className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve & Send
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReject("Manager rejected")}>
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SentCard({ decision }: any) {
  const isAuto = decision.status === "auto_sent";
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Badge variant={isAuto ? "default" : "secondary"} className="shrink-0">
          {isAuto ? <Zap className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
          {isAuto ? "Auto" : "Manual"}
        </Badge>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{decision.customer_name} · {decision.customer_phone}</p>
          <p className="text-xs text-muted-foreground truncate">{decision.message_content}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <Badge variant="outline" className="text-xs capitalize">{decision.vertical}</Badge>
        <p className="text-xs text-muted-foreground mt-1">
          {decision.sent_at ? formatDistanceToNow(new Date(decision.sent_at), { addSuffix: true }) : "—"}
        </p>
      </div>
    </div>
  );
}
