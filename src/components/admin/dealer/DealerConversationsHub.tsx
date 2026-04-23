import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Send, MessageCircle, Search, Building2, Phone, Clock,
  CheckCheck, Check, AlertCircle, RefreshCw, LayoutList, MessagesSquare,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type Recipient = {
  id: string;
  campaign_id: string;
  dealer_rep_id: string | null;
  dealer_name: string | null;
  rep_name: string | null;
  phone: string;
  send_status: string;
  sent_at: string | null;
  delivered_at: string | null;
  replied_at: string | null;
  reply_message: string | null;
  ai_followup_sent: boolean;
  ai_followup_sent_at: string | null;
  ai_followup_reply: string | null;
  created_at: string;
};

type Campaign = {
  id: string;
  brand: string | null;
  model: string | null;
  variant: string | null;
  message_template: string | null;
  created_at: string;
};

const STATUS_BADGE: Record<string, { label: string; className: string; icon: any }> = {
  sent: { label: "Sent", className: "bg-blue-100 text-blue-800", icon: Check },
  delivered: { label: "Delivered", className: "bg-emerald-100 text-emerald-800", icon: CheckCheck },
  read: { label: "Read", className: "bg-emerald-100 text-emerald-800", icon: CheckCheck },
  replied: { label: "Replied", className: "bg-purple-100 text-purple-800", icon: MessageCircle },
  failed: { label: "Failed", className: "bg-red-100 text-red-800", icon: AlertCircle },
  pending: { label: "Pending", className: "bg-gray-100 text-gray-800", icon: Clock },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.pending;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.className} text-[10px] gap-1`}>
      <Icon className="h-2.5 w-2.5" /> {cfg.label}
    </Badge>
  );
}

export default function DealerConversationsHub() {
  const qc = useQueryClient();
  const [view, setView] = useState<"chat" | "table">("chat");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Recipients (one row per dealer per campaign)
  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ["dealer-conversations-recipients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dealer_inquiry_recipients")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data as Recipient[]) || [];
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["dealer-conversations-campaigns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dealer_inquiry_campaigns")
        .select("id, brand, model, variant, message_template, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data as Campaign[]) || [];
    },
  });

  const campaignMap = useMemo(() => {
    const m = new Map<string, Campaign>();
    campaigns.forEach((c) => m.set(c.id, c));
    return m;
  }, [campaigns]);

  // ── Realtime: replies + delivery/read updates
  useEffect(() => {
    const channel = supabase
      .channel("dealer-conversations-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dealer_inquiry_recipients" },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["dealer-conversations-recipients"] });
          // Toast on new replies
          const newRow = payload.new as Recipient | undefined;
          const oldRow = payload.old as Recipient | undefined;
          if (newRow?.replied_at && newRow.replied_at !== oldRow?.replied_at) {
            toast.success(`💬 ${newRow.rep_name || newRow.dealer_name || newRow.phone} replied`);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  // ── Group by dealer-rep (each dealer gets one chat thread containing all their campaigns)
  type Thread = {
    key: string;
    rep_name: string | null;
    dealer_name: string | null;
    phone: string;
    items: Recipient[];
    lastAt: number;
    lastStatus: string;
    unreadReplies: number;
    brand: string | null;
  };

  const threads: Thread[] = useMemo(() => {
    const map = new Map<string, Thread>();
    for (const r of recipients) {
      const key = (r.dealer_rep_id || r.phone) as string;
      const camp = r.campaign_id ? campaignMap.get(r.campaign_id) : undefined;
      const ts = new Date(r.replied_at || r.delivered_at || r.sent_at || r.created_at).getTime();
      const existing = map.get(key);
      if (existing) {
        existing.items.push(r);
        if (ts > existing.lastAt) {
          existing.lastAt = ts;
          existing.lastStatus = r.replied_at ? "replied" : r.send_status;
        }
        if (r.replied_at) existing.unreadReplies += 1;
        if (camp?.brand && !existing.brand) existing.brand = camp.brand;
      } else {
        map.set(key, {
          key,
          rep_name: r.rep_name,
          dealer_name: r.dealer_name,
          phone: r.phone,
          items: [r],
          lastAt: ts,
          lastStatus: r.replied_at ? "replied" : r.send_status,
          unreadReplies: r.replied_at ? 1 : 0,
          brand: camp?.brand || null,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.lastAt - a.lastAt);
  }, [recipients, campaignMap]);

  const brands = useMemo(
    () => Array.from(new Set(threads.map((t) => t.brand).filter(Boolean))) as string[],
    [threads]
  );

  const filteredThreads = useMemo(() => {
    const q = search.toLowerCase().trim();
    return threads.filter((t) => {
      if (q) {
        const hay = `${t.rep_name || ""} ${t.dealer_name || ""} ${t.phone || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (brandFilter !== "all" && t.brand !== brandFilter) return false;
      if (statusFilter !== "all" && t.lastStatus !== statusFilter) return false;
      return true;
    });
  }, [threads, search, brandFilter, statusFilter]);

  const selectedThread = useMemo(
    () => filteredThreads.find((t) => t.key === selectedId) || filteredThreads[0],
    [filteredThreads, selectedId]
  );

  // Build a flat chronological message list for the selected thread
  const messages = useMemo(() => {
    if (!selectedThread) return [] as Array<{
      id: string; direction: "out" | "in"; text: string; ts: string; meta?: string; status?: string;
    }>;
    const out: Array<any> = [];
    for (const r of selectedThread.items) {
      const camp = r.campaign_id ? campaignMap.get(r.campaign_id) : undefined;
      const carLabel = camp ? [camp.brand, camp.model, camp.variant].filter(Boolean).join(" ") : "";
      // Initial outbound
      if (r.sent_at || r.send_status === "sent" || r.send_status === "delivered" || r.send_status === "read" || r.send_status === "failed") {
        out.push({
          id: `${r.id}-out`,
          direction: "out",
          text: camp?.message_template || `Inquiry sent for ${carLabel || "vehicle"}`,
          ts: r.sent_at || r.created_at,
          meta: carLabel ? `📋 ${carLabel}` : undefined,
          status: r.send_status,
        });
      }
      // AI follow-up outbound
      if (r.ai_followup_sent && r.ai_followup_sent_at) {
        out.push({
          id: `${r.id}-fu`,
          direction: "out",
          text: `🤖 AI follow-up sent`,
          ts: r.ai_followup_sent_at,
          meta: "Auto follow-up",
          status: "sent",
        });
      }
      // Inbound reply
      if (r.replied_at && r.reply_message) {
        out.push({
          id: `${r.id}-in`,
          direction: "in",
          text: r.reply_message,
          ts: r.replied_at,
        });
      }
      if (r.ai_followup_reply) {
        out.push({
          id: `${r.id}-in2`,
          direction: "in",
          text: r.ai_followup_reply,
          ts: r.ai_followup_sent_at || r.replied_at || r.created_at,
        });
      }
    }
    return out.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  }, [selectedThread, campaignMap]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedThread?.key]);

  // ── Send a manual reply via WhatsApp API
  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selectedThread || !reply.trim()) return;
      const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
      const result = await sendWhatsApp({
        phone: selectedThread.phone,
        message: reply.trim(),
        name: selectedThread.rep_name || selectedThread.dealer_name || undefined,
        logEvent: "dealer_conversation_reply",
        vertical: "dealer",
        silent: true,
      });
      if (!result.success) throw new Error(result.error || "Send failed");
    },
    onSuccess: () => {
      toast.success("✅ Reply sent");
      setReply("");
      qc.invalidateQueries({ queryKey: ["dealer-conversations-recipients"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to send"),
  });

  return (
    <div className="space-y-3">
      {/* Top filter bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search dealer name, rep or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="replied">💬 Replied</SelectItem>
                <SelectItem value="read">✅ Read</SelectItem>
                <SelectItem value="delivered">✓ Delivered</SelectItem>
                <SelectItem value="sent">→ Sent</SelectItem>
                <SelectItem value="failed">⚠️ Failed</SelectItem>
              </SelectContent>
            </Select>

            <Tabs value={view} onValueChange={(v: any) => setView(v)} className="ml-auto">
              <TabsList className="h-9">
                <TabsTrigger value="chat" className="gap-1 text-xs"><MessagesSquare className="h-3.5 w-3.5" /> Chat</TabsTrigger>
                <TabsTrigger value="table" className="gap-1 text-xs"><LayoutList className="h-3.5 w-3.5" /> Table</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button variant="outline" size="sm" className="h-9 gap-1"
              onClick={() => qc.invalidateQueries({ queryKey: ["dealer-conversations-recipients"] })}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
            <span>📨 {filteredThreads.length} conversations</span>
            <span>💬 {filteredThreads.reduce((s, t) => s + t.unreadReplies, 0)} replies</span>
            <span className="ml-auto inline-flex items-center gap-1 text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Live
            </span>
          </div>
        </CardContent>
      </Card>

      {view === "chat" ? (
        <div className="grid grid-cols-12 gap-3 h-[calc(100vh-340px)] min-h-[500px]">
          {/* Thread list */}
          <Card className="col-span-4 flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Dealers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-0.5 p-2">
                  {isLoading && (
                    <p className="text-xs text-muted-foreground p-3">Loading…</p>
                  )}
                  {!isLoading && filteredThreads.length === 0 && (
                    <p className="text-xs text-muted-foreground p-6 text-center">No conversations match your filters.</p>
                  )}
                  {filteredThreads.map((t) => {
                    const isSelected = (selectedThread?.key || "") === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setSelectedId(t.key)}
                        className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                          isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}>
                            {(t.rep_name || t.dealer_name || "D")[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-medium text-xs truncate">{t.rep_name || t.dealer_name || t.phone}</p>
                              <span className="text-[9px] text-muted-foreground flex-shrink-0">
                                {formatDistanceToNow(new Date(t.lastAt), { addSuffix: false })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {t.brand && <Badge variant="outline" className="text-[8px] h-3.5 px-1">{t.brand}</Badge>}
                              {t.dealer_name && <span className="text-[10px] text-muted-foreground truncate">{t.dealer_name}</span>}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <StatusBadge status={t.lastStatus} />
                              {t.unreadReplies > 0 && (
                                <Badge className="bg-green-500 text-white text-[9px] h-4">{t.unreadReplies}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat pane */}
          <Card className="col-span-8 flex flex-col overflow-hidden">
            {selectedThread ? (
              <>
                <CardHeader className="pb-2 border-b flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {(selectedThread.rep_name || selectedThread.dealer_name || "D")[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{selectedThread.rep_name || selectedThread.dealer_name || selectedThread.phone}</p>
                        <div className="flex gap-2 items-center">
                          {selectedThread.brand && <Badge variant="outline" className="text-[9px]">{selectedThread.brand}</Badge>}
                          {selectedThread.dealer_name && <span className="text-xs text-muted-foreground">{selectedThread.dealer_name}</span>}
                          <span className="text-xs text-muted-foreground font-mono">📞 {selectedThread.phone}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(`tel:${selectedThread.phone}`)}>
                      <Phone className="h-3 w-3" /> Call
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0 bg-muted/20">
                  <ScrollArea className="h-full p-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
                        <div className="text-center">
                          <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p>No messages yet</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((m) => (
                          <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-xl px-3.5 py-2 shadow-sm ${
                              m.direction === "out" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"
                            }`}>
                              {m.meta && (
                                <p className={`text-[10px] mb-1 ${m.direction === "out" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                  {m.meta}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                              <div className={`flex items-center gap-1.5 mt-1 ${
                                m.direction === "out" ? "text-primary-foreground/60 justify-end" : "text-muted-foreground"
                              }`}>
                                <span className="text-[10px]">{format(new Date(m.ts), "dd MMM, hh:mm a")}</span>
                                {m.direction === "out" && m.status && (
                                  m.status === "read" || m.status === "delivered" ? (
                                    <CheckCheck className="h-3 w-3" />
                                  ) : m.status === "failed" ? (
                                    <AlertCircle className="h-3 w-3" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>

                <div className="p-3 border-t flex-shrink-0 bg-card">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a reply…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && reply.trim() && sendReply.mutate()}
                      className="flex-1"
                    />
                    <Button onClick={() => sendReply.mutate()} disabled={!reply.trim() || sendReply.isPending} className="gap-1">
                      <Send className="h-4 w-4" /> {sendReply.isPending ? "Sending…" : "Send"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    💡 Sends via WhatsApp Cloud API — only works when dealer's 24-hr window is open.
                  </p>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-16 w-16 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Select a dealer to view conversation</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      ) : (
        // ── Table view
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[calc(100vh-340px)] min-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer / Rep</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reply</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredThreads.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                      No conversations match your filters.
                    </TableCell></TableRow>
                  ) : filteredThreads.map((t) => {
                    const lastReply = t.items.find((i) => i.reply_message)?.reply_message;
                    return (
                      <TableRow key={t.key} className="cursor-pointer hover:bg-muted/40"
                        onClick={() => { setView("chat"); setSelectedId(t.key); }}>
                        <TableCell>
                          <div className="font-medium text-sm">{t.rep_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{t.dealer_name || "—"}</div>
                        </TableCell>
                        <TableCell>{t.brand ? <Badge variant="outline" className="text-[10px]">{t.brand}</Badge> : "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{t.phone}</TableCell>
                        <TableCell className="text-xs">{formatDistanceToNow(new Date(t.lastAt), { addSuffix: true })}</TableCell>
                        <TableCell><StatusBadge status={t.lastStatus} /></TableCell>
                        <TableCell className="max-w-[300px]">
                          {lastReply ? (
                            <span className="text-xs line-clamp-2 italic text-foreground">"{lastReply}"</span>
                          ) : <span className="text-[10px] text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-7 text-xs">Open Chat</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
