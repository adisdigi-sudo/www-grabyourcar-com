import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Bot, CheckCircle2, SkipForward, MessageCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const AGENT_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  morning_briefing: { label: "Morning Briefing", emoji: "🌅", color: "bg-amber-500/10 text-amber-700" },
  evening_report: { label: "Evening Report", emoji: "🌙", color: "bg-indigo-500/10 text-indigo-700" },
  stale_lead_checker: { label: "Stale Leads", emoji: "⏰", color: "bg-orange-500/10 text-orange-700" },
  auto_quote: { label: "Auto Quote", emoji: "💰", color: "bg-emerald-500/10 text-emerald-700" },
  weekly_pl: { label: "Weekly P&L", emoji: "📊", color: "bg-violet-500/10 text-violet-700" },
};

function PendingCard({ msg, onAction }: { msg: any; onAction: () => void }) {
  const [editedBody, setEditedBody] = useState(msg.message_body);
  const [busy, setBusy] = useState(false);
  const meta = AGENT_LABELS[msg.agent_type] || { label: msg.agent_type, emoji: "🤖", color: "bg-muted" };

  const approve = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          to: msg.recipient_phone,
          message: editedBody,
          messageType: "text",
          name: msg.recipient_name || "Recipient",
          logEvent: `autopilot_${msg.agent_type}`,
          message_context: msg.agent_type,
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Send failed");

      await supabase
        .from("auto_pilot_pending_messages")
        .update({ status: "sent", sent_at: new Date().toISOString(), message_body: editedBody, approved_at: new Date().toISOString() })
        .eq("id", msg.id);
      toast.success("✅ Sent via WhatsApp");
      onAction();
    } catch (e: any) {
      await supabase
        .from("auto_pilot_pending_messages")
        .update({ status: "failed", error_message: e.message })
        .eq("id", msg.id);
      toast.error(e.message || "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    setBusy(true);
    await supabase
      .from("auto_pilot_pending_messages")
      .update({ status: "skipped", skipped_at: new Date().toISOString() })
      .eq("id", msg.id);
    toast.message("⏭ Skipped");
    onAction();
    setBusy(false);
  };

  return (
    <Card className="border-l-4" style={{ borderLeftColor: "hsl(var(--primary))" }}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge className={`${meta.color} text-[11px]`}>{meta.emoji} {meta.label}</Badge>
            <span className="text-xs text-muted-foreground">→ {msg.recipient_name || "—"} · {msg.recipient_phone}</span>
          </div>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
          </span>
        </div>

        <div className="bg-[#e5ddd5] dark:bg-muted/30 rounded p-2">
          <Textarea
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
            rows={Math.min(10, Math.max(3, editedBody.split("\n").length))}
            className="font-mono text-xs bg-[#dcf8c6] dark:bg-green-900/20 border-0 resize-none"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={skip} disabled={busy}>
            <SkipForward className="h-3.5 w-3.5 mr-1" /> Skip Today
          </Button>
          <Button size="sm" onClick={approve} disabled={busy} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve & Send Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function WAHubAutoPilotPreview() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");

  const { data: messages = [], refetch, isFetching } = useQuery({
    queryKey: ["autopilot-pending", tab],
    queryFn: async () => {
      const { data } = await supabase
        .from("auto_pilot_pending_messages")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    refetchInterval: 20000,
  });

  const triggerAgent = async (agent: string) => {
    toast.info(`Generating ${AGENT_LABELS[agent]?.label || agent}…`);
    const { data, error } = await supabase.functions.invoke("auto-pilot-engine", {
      body: { agent_type: agent, manual: true },
    });
    if (error) toast.error(error.message);
    else toast.success(`Generated. Check Pending tab.`);
    qc.invalidateQueries({ queryKey: ["autopilot-pending"] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">Auto-Pilot Preview Queue</h3>
                <p className="text-[11px] text-muted-foreground">AI-generated messages wait for your approval before going to WhatsApp.</p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(AGENT_LABELS).map(([key, m]) => (
                <Button key={key} size="sm" variant="outline" onClick={() => triggerAgent(key)} className="h-7 text-[11px]">
                  {m.emoji} Generate {m.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="h-7">
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending" className="text-xs gap-1"><MessageCircle className="h-3.5 w-3.5" /> Pending</TabsTrigger>
          <TabsTrigger value="sent" className="text-xs gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Sent</TabsTrigger>
          <TabsTrigger value="skipped" className="text-xs gap-1"><SkipForward className="h-3.5 w-3.5" /> Skipped</TabsTrigger>
          <TabsTrigger value="failed" className="text-xs gap-1"><AlertCircle className="h-3.5 w-3.5" /> Failed</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-3">
          <ScrollArea className="h-[60vh]">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No <b>{tab}</b> auto-pilot messages.
                {tab === "pending" && <p className="text-xs mt-2">Click any "Generate" button above to create a preview.</p>}
              </div>
            ) : (
              <div className="space-y-2 pr-3">
                {tab === "pending"
                  ? messages.map((m: any) => <PendingCard key={m.id} msg={m} onAction={() => refetch()} />)
                  : messages.map((m: any) => {
                      const meta = AGENT_LABELS[m.agent_type] || { label: m.agent_type, emoji: "🤖", color: "bg-muted" };
                      return (
                        <Card key={m.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <Badge className={`${meta.color} text-[11px]`}>{meta.emoji} {meta.label}</Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {m.sent_at ? `Sent ${formatDistanceToNow(new Date(m.sent_at), { addSuffix: true })}` :
                                 m.skipped_at ? `Skipped ${formatDistanceToNow(new Date(m.skipped_at), { addSuffix: true })}` :
                                 formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">→ {m.recipient_name || "—"} · {m.recipient_phone}</p>
                            <pre className="whitespace-pre-wrap font-sans text-xs bg-muted/40 p-2 rounded max-h-32 overflow-auto">{m.message_body}</pre>
                            {m.error_message && <p className="text-[11px] text-destructive mt-1">⚠ {m.error_message}</p>}
                          </CardContent>
                        </Card>
                      );
                    })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
