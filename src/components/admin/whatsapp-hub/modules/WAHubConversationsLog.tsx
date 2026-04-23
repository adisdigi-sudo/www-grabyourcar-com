import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCheck, Check, AlertCircle, Clock, RefreshCw, Search, MessageSquare,
  FileText, Bell, Star, Send, Phone, Filter, Download,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

type Intent =
  | "all" | "followup" | "quote_share" | "renewal_reminder"
  | "feedback" | "policy_document" | "transactional"
  | "manual_chat" | "customer_reply" | "template_other";

type StatusFilter = "all" | "sent" | "delivered" | "read" | "failed" | "received";

interface MsgRow {
  id: string;
  conversation_id: string;
  direction: string;
  message_type: string;
  content: string | null;
  template_name: string | null;
  status: string | null;
  error_message: string | null;
  intent: string | null;
  vertical: string | null;
  lead_id: string | null;
  created_at: string;
  wa_message_id: string | null;
  conv?: {
    phone: string;
    customer_name: string | null;
    assigned_vertical: string | null;
    window_expires_at: string | null;
  };
}

const INTENT_META: Record<string, { label: string; color: string; icon: any }> = {
  followup: { label: "Follow-up", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300", icon: Bell },
  quote_share: { label: "Quote Share", color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300", icon: FileText },
  renewal_reminder: { label: "Renewal", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", icon: RefreshCw },
  feedback: { label: "Feedback", color: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300", icon: Star },
  policy_document: { label: "Policy / PDF", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", icon: FileText },
  transactional: { label: "Transactional", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: Send },
  manual_chat: { label: "Manual", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300", icon: MessageSquare },
  customer_reply: { label: "Customer", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300", icon: MessageSquare },
  template_other: { label: "Template", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", icon: Send },
};

const STATUS_ICON: Record<string, any> = {
  sent: { icon: Check, color: "text-slate-500" },
  delivered: { icon: CheckCheck, color: "text-slate-500" },
  read: { icon: CheckCheck, color: "text-blue-500" },
  failed: { icon: AlertCircle, color: "text-rose-500" },
  pending: { icon: Clock, color: "text-amber-500" },
  received: { icon: MessageSquare, color: "text-indigo-500" },
};

export function WAHubConversationsLog() {
  const [rows, setRows] = useState<MsgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [intent, setIntent] = useState<Intent>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [vertical, setVertical] = useState<string>("all");
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [search, setSearch] = useState("");

  const sinceISO = useMemo(() => {
    if (range === "all") return null;
    const ms = range === "24h" ? 86400e3 : range === "7d" ? 7 * 86400e3 : 30 * 86400e3;
    return new Date(Date.now() - ms).toISOString();
  }, [range]);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("wa_inbox_messages")
      .select("id, conversation_id, direction, message_type, content, template_name, status, error_message, intent, vertical, lead_id, created_at, wa_message_id, conv:wa_conversations!wa_inbox_messages_conversation_id_fkey(phone, customer_name, assigned_vertical, window_expires_at)")
      .order("created_at", { ascending: false })
      .limit(500);

    if (sinceISO) q = q.gte("created_at", sinceISO);
    if (intent !== "all") q = q.eq("intent", intent);
    if (status !== "all") q = q.eq("status", status);
    if (vertical !== "all") q = q.eq("vertical", vertical);

    const { data, error } = await q;
    if (error) {
      toast.error("Failed to load: " + error.message);
      setLoading(false);
      return;
    }
    setRows((data || []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // realtime
    const ch = supabase
      .channel("wa-conv-log")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_inbox_messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, status, vertical, range]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      r.conv?.phone?.toLowerCase().includes(s) ||
      r.conv?.customer_name?.toLowerCase().includes(s) ||
      r.content?.toLowerCase().includes(s) ||
      r.template_name?.toLowerCase().includes(s)
    );
  }, [rows, search]);

  // KPIs
  const kpi = useMemo(() => {
    const total = rows.length;
    const out = rows.filter((r) => r.direction === "outbound");
    const sent = out.filter((r) => ["sent", "delivered", "read"].includes(r.status || ""));
    const delivered = out.filter((r) => ["delivered", "read"].includes(r.status || "")).length;
    const read = out.filter((r) => r.status === "read").length;
    const failed = out.filter((r) => r.status === "failed").length;
    const inbound = rows.filter((r) => r.direction === "inbound").length;
    const successRate = out.length ? Math.round((sent.length / out.length) * 100) : 0;
    return { total, outbound: out.length, sent: sent.length, delivered, read, failed, inbound, successRate };
  }, [rows]);

  const intentCounts = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.intent || "manual_chat", (m.get(r.intent || "manual_chat") || 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const verticals = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.vertical && s.add(r.vertical));
    return Array.from(s);
  }, [rows]);

  const exportCsv = () => {
    const headers = ["When", "Phone", "Name", "Direction", "Intent", "Vertical", "Template", "Status", "Error", "Content"];
    const lines = filtered.map((r) => [
      new Date(r.created_at).toISOString(),
      r.conv?.phone || "",
      r.conv?.customer_name || "",
      r.direction,
      r.intent || "",
      r.vertical || "",
      r.template_name || "",
      r.status || "",
      (r.error_message || "").replace(/[\n\r,]/g, " "),
      (r.content || "").slice(0, 200).replace(/[\n\r,]/g, " "),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `wa-conversations-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <KPI label="Total" value={kpi.total} />
        <KPI label="Outbound" value={kpi.outbound} />
        <KPI label="Delivered" value={kpi.delivered} accent="text-emerald-600" />
        <KPI label="Read" value={kpi.read} accent="text-blue-600" />
        <KPI label="Failed" value={kpi.failed} accent="text-rose-600" />
        <KPI label="Inbound" value={kpi.inbound} accent="text-indigo-600" />
        <KPI label="Success" value={`${kpi.successRate}%`} accent="text-emerald-600" />
      </div>

      {/* Intent Filter Pills */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filter by intent
            </CardTitle>
            <div className="flex items-center gap-2">
              <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
                <TabsList className="h-8">
                  <TabsTrigger value="24h" className="text-xs h-6">24h</TabsTrigger>
                  <TabsTrigger value="7d" className="text-xs h-6">7d</TabsTrigger>
                  <TabsTrigger value="30d" className="text-xs h-6">30d</TabsTrigger>
                  <TabsTrigger value="all" className="text-xs h-6">All</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button size="sm" variant="outline" className="h-8" onClick={load}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={exportCsv}>
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <IntentPill label="All" count={rows.length} active={intent === "all"} onClick={() => setIntent("all")} />
            {Object.entries(INTENT_META).map(([key, meta]) => {
              const c = intentCounts.find((x) => x[0] === key)?.[1] || 0;
              const Icon = meta.icon;
              return (
                <IntentPill
                  key={key}
                  label={meta.label}
                  icon={<Icon className="h-3 w-3" />}
                  count={c}
                  active={intent === key}
                  onClick={() => setIntent(key as Intent)}
                  className={meta.color}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search phone, name, content…"
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="received">Received (inbound)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vertical} onValueChange={setVertical}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All verticals</SelectItem>
                {verticals.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Live Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Live Message Log</span>
            <Badge variant="outline" className="text-[10px] gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live · {filtered.length} of {rows.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-32">When</TableHead>
                  <TableHead>Lead / Phone</TableHead>
                  <TableHead className="w-32">Intent</TableHead>
                  <TableHead className="w-24">Vertical</TableHead>
                  <TableHead>Content / Template</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No messages match filters.</TableCell></TableRow>
                )}
                {!loading && filtered.map((r) => {
                  const meta = INTENT_META[r.intent || "manual_chat"] || INTENT_META.manual_chat;
                  const StatusInfo = STATUS_ICON[r.status || "pending"] || STATUS_ICON.pending;
                  const SIcon = StatusInfo.icon;
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
                        <div className="text-[10px] opacity-60">{format(new Date(r.created_at), "dd MMM HH:mm")}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {r.conv?.customer_name || r.conv?.phone || "—"}
                        </div>
                        {r.conv?.customer_name && (
                          <div className="text-[11px] text-muted-foreground">{r.conv.phone}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] gap-1 ${meta.color}`}>
                          {r.intent || "manual_chat"}
                        </Badge>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{r.direction}</div>
                      </TableCell>
                      <TableCell>
                        {r.vertical ? (
                          <Badge variant="outline" className="text-[10px]">{r.vertical}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="max-w-md">
                        {r.template_name && (
                          <div className="text-[11px] font-mono text-violet-600 dark:text-violet-400 mb-0.5">
                            📄 {r.template_name}
                          </div>
                        )}
                        <div className="text-xs line-clamp-2 text-foreground/80">
                          {r.content || <span className="italic text-muted-foreground">(no body)</span>}
                        </div>
                        {r.error_message && (
                          <div className="text-[10px] text-rose-600 mt-0.5 line-clamp-1">⚠ {r.error_message}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1 text-xs font-medium ${StatusInfo.color}`}>
                          <SIcon className="h-3.5 w-3.5" />
                          {r.status || "pending"}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
        <div className={`text-2xl font-bold mt-0.5 ${accent || ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function IntentPill({
  label, count, active, onClick, icon, className,
}: {
  label: string; count: number; active: boolean; onClick: () => void; icon?: React.ReactNode; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 h-8 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : `border-border hover:border-primary/50 ${className || "bg-background"}`
      }`}
    >
      {icon}
      {label}
      <span className={`ml-1 px-1.5 rounded-full text-[10px] ${active ? "bg-primary-foreground/20" : "bg-muted"}`}>
        {count}
      </span>
    </button>
  );
}
