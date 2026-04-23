import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Bot,
  CheckCheck,
  CheckCircle2,
  MessageCircle,
  Phone,
  Search,
  Send,
  XCircle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type Filter = "all" | "replied" | "delivered" | "read" | "pending" | "failed";

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-700 border-slate-200", icon: Activity },
  submitted: { label: "Submitted", cls: "bg-amber-100 text-amber-800 border-amber-200", icon: Send },
  sent: { label: "Sent", cls: "bg-blue-100 text-blue-800 border-blue-200", icon: Send },
  delivered: { label: "Delivered", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  read: { label: "Read", cls: "bg-violet-100 text-violet-700 border-violet-200", icon: CheckCheck },
  failed: { label: "Failed", cls: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  invalid: { label: "Invalid #", cls: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

function StatPill({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center gap-2 text-xs font-medium opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

export default function DealerCampaignTracker() {
  const qc = useQueryClient();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data: campaigns = [] } = useQuery({
    queryKey: ["dlr-tracker-campaigns"],
    queryFn: async () => {
      const { data } = await (supabase.from("dealer_inquiry_campaigns") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      return data || [];
    },
    refetchInterval: 5000,
  });

  // Auto-select latest campaign
  useEffect(() => {
    if (!campaignId && campaigns.length > 0) setCampaignId(campaigns[0].id);
  }, [campaigns, campaignId]);

  const { data: recipients = [] } = useQuery({
    queryKey: ["dlr-tracker-recipients", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data } = await (supabase.from("dealer_inquiry_recipients") as any)
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!campaignId,
    refetchInterval: 4000,
  });

  // Live realtime
  useEffect(() => {
    if (!campaignId) return;
    const ch = supabase
      .channel(`dlr-tracker-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dealer_inquiry_recipients", filter: `campaign_id=eq.${campaignId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["dlr-tracker-recipients", campaignId] });
          qc.invalidateQueries({ queryKey: ["dlr-tracker-campaigns"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dealer_inquiry_campaigns", filter: `id=eq.${campaignId}` },
        () => qc.invalidateQueries({ queryKey: ["dlr-tracker-campaigns"] })
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [campaignId, qc]);

  const campaign = useMemo(() => campaigns.find((c: any) => c.id === campaignId), [campaigns, campaignId]);

  const stats = useMemo(() => {
    const total = recipients.length;
    const failed = recipients.filter((r: any) => ["failed", "invalid"].includes(r.send_status)).length;
    const delivered = recipients.filter((r: any) => r.send_status === "delivered").length;
    const read = recipients.filter((r: any) => r.send_status === "read").length;
    const sent = recipients.filter((r: any) => ["sent", "submitted"].includes(r.send_status)).length;
    const replied = recipients.filter((r: any) => Boolean(r.replied_at)).length;
    const aiFollowed = recipients.filter((r: any) => r.ai_followup_sent).length;
    return { total, sent, delivered, read, failed, replied, aiFollowed };
  }, [recipients]);

  const filtered = useMemo(() => {
    let rows = recipients;
    if (filter === "replied") rows = rows.filter((r: any) => Boolean(r.replied_at));
    else if (filter === "delivered") rows = rows.filter((r: any) => r.send_status === "delivered");
    else if (filter === "read") rows = rows.filter((r: any) => r.send_status === "read");
    else if (filter === "failed") rows = rows.filter((r: any) => ["failed", "invalid"].includes(r.send_status));
    else if (filter === "pending") rows = rows.filter((r: any) => ["pending", "submitted", "sent"].includes(r.send_status));
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r: any) =>
        (r.dealer_name || "").toLowerCase().includes(q) ||
        (r.rep_name || "").toLowerCase().includes(q) ||
        (r.phone || "").includes(q)
      );
    }
    // Sort: replied first, then read, delivered, pending, failed
    const order = (s: string, replied: boolean) => {
      if (replied) return 0;
      if (s === "read") return 1;
      if (s === "delivered") return 2;
      if (["sent", "submitted"].includes(s)) return 3;
      if (s === "pending") return 4;
      return 5;
    };
    return [...rows].sort((a: any, b: any) => order(a.send_status, !!a.replied_at) - order(b.send_status, !!b.replied_at));
  }, [recipients, filter, search]);

  if (!campaigns.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No campaigns yet</p>
          <p className="text-sm mt-1">Send your first dealer blast from <b>Smart Inquiry</b> tab to see live tracking here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Campaign picker */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Live Campaign Tracker
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["dlr-tracker-recipients", campaignId] })} className="gap-1 text-xs">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {campaigns.map((c: any) => {
                const active = c.id === campaignId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCampaignId(c.id)}
                    className={`text-left rounded-lg border px-3 py-2 min-w-[220px] transition-all ${
                      active ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{c.campaign_name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(c.created_at), "dd MMM, hh:mm a")} · {[c.brand, c.model].filter(Boolean).join(" › ") || "All"}
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">{c.sent_count || 0}/{c.total_dealers || 0} accepted</Badge>
                      {c.replied_count > 0 && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] h-4 px-1">{c.replied_count} reply</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {campaign && (
        <>
          {/* Sticky stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mx-1 px-1 border-b">
            <StatPill label="Total" value={stats.total} icon={MessageCircle} tone="bg-slate-50 border-slate-200 text-slate-800" />
            <StatPill label="Accepted" value={stats.sent} icon={Send} tone="bg-blue-50 border-blue-200 text-blue-800" />
            <StatPill label="Delivered" value={stats.delivered} icon={CheckCircle2} tone="bg-emerald-50 border-emerald-200 text-emerald-800" />
            <StatPill label="Read" value={stats.read} icon={CheckCheck} tone="bg-violet-50 border-violet-200 text-violet-800" />
            <StatPill label="Replied" value={stats.replied} icon={MessageCircle} tone="bg-green-50 border-green-200 text-green-800" />
            <StatPill label="Failed" value={stats.failed} icon={XCircle} tone="bg-red-50 border-red-200 text-red-800" />
            <StatPill label="AI Followed" value={stats.aiFollowed} icon={Bot} tone="bg-indigo-50 border-indigo-200 text-indigo-800" />
          </div>

          {/* Filter + search */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs">All ({stats.total})</TabsTrigger>
                    <TabsTrigger value="replied" className="text-xs">Replied ({stats.replied})</TabsTrigger>
                    <TabsTrigger value="read" className="text-xs">Read ({stats.read})</TabsTrigger>
                    <TabsTrigger value="delivered" className="text-xs">Delivered ({stats.delivered})</TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs">Pending ({stats.sent})</TabsTrigger>
                    <TabsTrigger value="failed" className="text-xs">Failed ({stats.failed})</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search dealer / phone..."
                    className="pl-8 h-8 text-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">No matching dealers</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {filtered.map((r: any) => {
                    const meta = STATUS_META[r.send_status] || STATUS_META.pending;
                    const StatusIcon = meta.icon;
                    const replied = Boolean(r.replied_at);
                    return (
                      <div
                        key={r.id}
                        className={`rounded-lg border p-3 transition-colors ${
                          replied ? "border-emerald-300 bg-emerald-50/50" : "border-border bg-card hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs ${
                            replied ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                          }`}>
                            {(r.rep_name || r.dealer_name || "?")[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">{r.rep_name || "Dealer"}</div>
                                <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                  {r.dealer_name && <span>{r.dealer_name} ·</span>}
                                  <Phone className="h-2.5 w-2.5" /> {r.phone}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] gap-1 ${meta.cls}`}>
                                  <StatusIcon className="h-3 w-3" /> {meta.label}
                                </Badge>
                                {replied && (
                                  <Badge className="bg-green-600 text-white text-[10px] gap-1">
                                    <MessageCircle className="h-3 w-3" /> Replied
                                  </Badge>
                                )}
                                {r.ai_followup_sent && (
                                  <Badge className="bg-indigo-100 text-indigo-700 text-[10px] gap-1 border-indigo-200" variant="outline">
                                    <Bot className="h-3 w-3" /> AI Sent
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Reply message highlighted */}
                            {replied && r.reply_message && (
                              <div className="mt-2 rounded-md bg-white border border-emerald-200 p-2.5">
                                <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-1 flex items-center gap-1">
                                  <Sparkles className="h-2.5 w-2.5" /> Dealer Reply · {formatDistanceToNow(new Date(r.replied_at), { addSuffix: true })}
                                </div>
                                <div className="text-sm whitespace-pre-wrap">{r.reply_message}</div>
                              </div>
                            )}

                            {/* Failure / error */}
                            {(r.send_status === "failed" || r.send_status === "invalid") && r.qualification_data?.last_error && (
                              <div className="mt-2 rounded-md bg-red-50 border border-red-200 p-2 text-[11px] text-red-700">
                                <b>Error:</b> {r.qualification_data.last_error}
                              </div>
                            )}

                            {/* Timeline */}
                            <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                              {r.sent_at && <span>📤 Sent {formatDistanceToNow(new Date(r.sent_at), { addSuffix: true })}</span>}
                              {r.delivered_at && <span>✓ Delivered {formatDistanceToNow(new Date(r.delivered_at), { addSuffix: true })}</span>}
                              {r.ai_followup_sent_at && <span>🤖 AI followed {formatDistanceToNow(new Date(r.ai_followup_sent_at), { addSuffix: true })}</span>}
                            </div>

                            {/* AI follow-up reply */}
                            {r.ai_followup_reply && (
                              <div className="mt-2 rounded-md bg-indigo-50 border border-indigo-200 p-2">
                                <div className="text-[10px] uppercase tracking-wide text-indigo-700 font-semibold mb-1 flex items-center gap-1">
                                  <Bot className="h-2.5 w-2.5" /> AI Follow-up Response
                                </div>
                                <div className="text-xs whitespace-pre-wrap">{r.ai_followup_reply}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
