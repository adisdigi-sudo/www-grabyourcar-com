import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Mail, Send, AlertTriangle, CheckCircle2, Clock,
  Ban, RefreshCw, Inbox, Shield, TrendingUp, XCircle,
  PenSquare, Reply, X, Loader2, MailPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict, subDays, subHours } from "date-fns";

type TimeRange = "24h" | "7d" | "30d" | "all";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  sent: { label: "Sent", color: "bg-green-500/10 text-green-700 border-green-200", icon: CheckCircle2 },
  pending: { label: "Queued", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200", icon: Clock },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-700 border-red-200", icon: XCircle },
  dlq: { label: "Dead Letter", color: "bg-red-500/10 text-red-800 border-red-300", icon: AlertTriangle },
  suppressed: { label: "Suppressed", color: "bg-orange-500/10 text-orange-700 border-orange-200", icon: Ban },
  bounced: { label: "Bounced", color: "bg-red-500/10 text-red-600 border-red-200", icon: XCircle },
  complained: { label: "Complained", color: "bg-purple-500/10 text-purple-700 border-purple-200", icon: AlertTriangle },
};

interface EmailLogEntry {
  id: string;
  message_id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
  metadata: any;
}

interface ConversationThread {
  email: string;
  messages: EmailLogEntry[];
  lastStatus: string;
  lastAt: string;
  templateNames: string[];
  totalSent: number;
  totalFailed: number;
}

function getTimeRangeDate(range: TimeRange): Date | null {
  switch (range) {
    case "24h": return subHours(new Date(), 24);
    case "7d": return subDays(new Date(), 7);
    case "30d": return subDays(new Date(), 30);
    default: return null;
  }
}

// ─── COMPOSE EMAIL PANEL ───
function ComposeEmailPanel({ 
  onClose, 
  onSent, 
  defaultTo = "",
  defaultSubject = "",
  isReply = false,
}: { 
  onClose: () => void; 
  onSent: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  isReply?: boolean;
}) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [fromName, setFromName] = useState("GrabYourCar");
  const [fromEmail, setFromEmail] = useState("noreply@grabyourcar.com");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast({ title: "To, Subject & Body required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const htmlBody = body.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('');
      const { data, error } = await supabase.functions.invoke("send-direct-email", {
        body: {
          to,
          subject,
          body: htmlBody,
          from_name: fromName,
          from_email: fromEmail,
          reply_to: fromEmail,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "✅ Email sent!", description: `Delivered to ${to}` });
      onSent();
      onClose();
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border rounded-lg bg-background shadow-lg">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <PenSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{isReply ? "Reply" : "Compose Email"}</span>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground font-medium">FROM NAME</label>
            <Input value={fromName} onChange={e => setFromName(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground font-medium">FROM EMAIL</label>
            <Select value={fromEmail} onValueChange={setFromEmail}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="noreply@grabyourcar.com">noreply@grabyourcar.com</SelectItem>
                <SelectItem value="founder@grabyourcar.com">founder@grabyourcar.com</SelectItem>
                <SelectItem value="sales@grabyourcar.com">sales@grabyourcar.com</SelectItem>
                <SelectItem value="hello@grabyourcar.com">hello@grabyourcar.com</SelectItem>
                <SelectItem value="accounts@grabyourcar.com">accounts@grabyourcar.com</SelectItem>
                <SelectItem value="hr@grabyourcar.com">hr@grabyourcar.com</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-medium">TO</label>
          <Input 
            value={to} 
            onChange={e => setTo(e.target.value)} 
            placeholder="recipient@example.com" 
            className="h-8 text-xs" 
            disabled={isReply}
          />
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-medium">SUBJECT</label>
          <Input 
            value={subject} 
            onChange={e => setSubject(e.target.value)} 
            placeholder="Email subject..." 
            className="h-8 text-xs" 
          />
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-medium">MESSAGE</label>
          <Textarea 
            value={body} 
            onChange={e => setBody(e.target.value)} 
            placeholder="Write your email here..."
            className="min-h-[150px] text-sm resize-none"
          />
        </div>

        <div className="flex justify-between items-center pt-1">
          <p className="text-[10px] text-muted-foreground">
            Sent via Resend • Auto plain-text version included
          </p>
          <Button onClick={handleSend} disabled={sending || !to || !subject || !body} size="sm" className="gap-1.5">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ───
export function EmailInboxDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState<{ email: string; subject: string } | null>(null);
  const { toast } = useToast();

  // ─── EMAIL LOGS (send_log + email_logs combined) ───
  const { data: rawSendLogs = [], isLoading: loadingSendLogs, refetch: refetchSendLogs } = useQuery({
    queryKey: ["email-send-log", timeRange],
    queryFn: async () => {
      let query = supabase
        .from("email_send_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const rangeDate = getTimeRangeDate(timeRange);
      if (rangeDate) query = query.gte("created_at", rangeDate.toISOString());
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EmailLogEntry[];
    },
    refetchInterval: 15000,
  });

  const { data: rawEmailLogs = [], isLoading: loadingEmailLogs, refetch: refetchEmailLogs } = useQuery({
    queryKey: ["email-logs-direct", timeRange],
    queryFn: async () => {
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(500);
      const rangeDate = getTimeRangeDate(timeRange);
      if (rangeDate) query = query.gte("sent_at", rangeDate.toISOString());
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        message_id: d.resend_id || d.id,
        template_name: d.metadata?.type === "direct" ? "📧 Direct Email" : (d.metadata?.campaign_name || "Campaign"),
        recipient_email: d.recipient_email,
        status: d.status,
        error_message: d.error_message,
        created_at: d.sent_at || d.created_at,
        metadata: { ...d.metadata, subject: d.subject },
      })) as EmailLogEntry[];
    },
    refetchInterval: 15000,
  });

  const isLoading = loadingSendLogs || loadingEmailLogs;

  const refetch = useCallback(() => {
    refetchSendLogs();
    refetchEmailLogs();
  }, [refetchSendLogs, refetchEmailLogs]);

  // Merge & deduplicate
  const allLogs = useMemo(() => {
    const combined = [...rawSendLogs, ...rawEmailLogs];
    const map = new Map<string, EmailLogEntry>();
    const sorted = [...combined].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const log of sorted) {
      const key = log.message_id || log.id;
      map.set(key, log);
    }
    return Array.from(map.values());
  }, [rawSendLogs, rawEmailLogs]);

  const templateNames = useMemo(() => {
    const names = new Set(allLogs.map(l => l.template_name).filter(Boolean));
    return Array.from(names).sort();
  }, [allLogs]);

  const filtered = useMemo(() => {
    let list = allLogs;
    if (statusFilter !== "all") list = list.filter(l => l.status === statusFilter);
    if (templateFilter !== "all") list = list.filter(l => l.template_name === templateFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.recipient_email?.toLowerCase().includes(q) ||
        l.template_name?.toLowerCase().includes(q) ||
        l.error_message?.toLowerCase().includes(q) ||
        l.metadata?.subject?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allLogs, statusFilter, templateFilter, search]);

  const threads = useMemo(() => {
    const map = new Map<string, EmailLogEntry[]>();
    for (const log of filtered) {
      const email = log.recipient_email?.toLowerCase() || "unknown";
      if (!map.has(email)) map.set(email, []);
      map.get(email)!.push(log);
    }
    const result: ConversationThread[] = [];
    for (const [email, messages] of map) {
      const sorted = messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      result.push({
        email,
        messages: sorted,
        lastStatus: sorted[0].status,
        lastAt: sorted[0].created_at,
        templateNames: [...new Set(sorted.map(m => m.template_name))],
        totalSent: sorted.filter(m => m.status === "sent").length,
        totalFailed: sorted.filter(m => ["failed", "dlq", "bounced"].includes(m.status)).length,
      });
    }
    return result.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [filtered]);

  const stats = useMemo(() => {
    const total = allLogs.length;
    const sent = allLogs.filter(l => l.status === "sent").length;
    const failed = allLogs.filter(l => ["failed", "dlq"].includes(l.status)).length;
    const suppressed = allLogs.filter(l => l.status === "suppressed").length;
    const pending = allLogs.filter(l => l.status === "pending").length;
    return { total, sent, failed, suppressed, pending };
  }, [allLogs]);

  const { data: suppressedList = [] } = useQuery({
    queryKey: ["suppressed-emails"],
    queryFn: async () => {
      const { data } = await supabase.from("suppressed_emails").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: sendState } = useQuery({
    queryKey: ["email-send-state"],
    queryFn: async () => {
      const { data } = await supabase.from("email_send_state").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const selectedThreadData = threads.find(t => t.email === selectedThread);

  const handleResend = async (log: EmailLogEntry) => {
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: log.template_name,
          recipientEmail: log.recipient_email,
          idempotencyKey: `resend-${log.id}-${Date.now()}`,
        },
      });
      if (error) throw error;
      toast({ title: "Email re-queued ✓" });
      refetch();
    } catch (e: any) {
      toast({ title: "Resend failed", description: e.message, variant: "destructive" });
    }
  };

  const handleReply = (email: string) => {
    const thread = threads.find(t => t.email === email);
    const lastSubject = thread?.messages[0]?.metadata?.subject || "";
    setReplyTo({
      email,
      subject: lastSubject.startsWith("Re:") ? lastSubject : `Re: ${lastSubject}`,
    });
    setShowCompose(false); // Close compose if open
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Mail className="h-3 w-3" /> Total</div>
          </CardContent>
        </Card>
        <Card className="border-green-200/50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><CheckCircle2 className="h-3 w-3" /> Delivered</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200/50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Queued</div>
          </CardContent>
        </Card>
        <Card className="border-red-200/50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><XCircle className="h-3 w-3" /> Failed</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200/50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.suppressed}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Ban className="h-3 w-3" /> Blocked</div>
          </CardContent>
        </Card>
      </div>

      {sendState && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3 flex items-center gap-3">
            <Shield className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Inbox Protection Active — Auto-throttling & suppression enforced
              </p>
              <p className="text-xs text-amber-600">
                Plain-text fallback, one-click unsubscribe headers, daily limits active.
              </p>
            </div>
            <Badge variant="outline" className="border-amber-300 text-amber-700">
              <TrendingUp className="h-3 w-3 mr-1" /> Protected
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="gap-1.5 h-8" onClick={() => { setShowCompose(true); setReplyTo(null); }}>
          <MailPlus className="h-3.5 w-3.5" /> Compose
        </Button>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search emails, subjects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <div className="flex gap-1">
          {(["24h", "7d", "30d", "all"] as TimeRange[]).map(r => (
            <Button key={r} size="sm" variant={timeRange === r ? "default" : "outline"} className="h-8 text-xs" onClick={() => setTimeRange(r)}>
              {r === "all" ? "All" : r === "24h" ? "24h" : r === "7d" ? "7d" : "30d"}
            </Button>
          ))}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">✅ Sent</SelectItem>
            <SelectItem value="pending">⏳ Queued</SelectItem>
            <SelectItem value="failed">❌ Failed</SelectItem>
            <SelectItem value="suppressed">🚫 Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={templateFilter} onValueChange={setTemplateFilter}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {templateNames.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-8" onClick={refetch}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Compose Panel (floating) */}
      {(showCompose || replyTo) && (
        <ComposeEmailPanel
          onClose={() => { setShowCompose(false); setReplyTo(null); }}
          onSent={refetch}
          defaultTo={replyTo?.email || ""}
          defaultSubject={replyTo?.subject || ""}
          isReply={!!replyTo}
        />
      )}

      {/* Inbox Layout */}
      <div className="flex border rounded-lg overflow-hidden bg-background" style={{ height: "calc(100vh - 420px)", minHeight: 400 }}>
        {/* Thread List */}
        <div className="w-[320px] border-r flex flex-col shrink-0">
          <div className="p-2 border-b bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground">
              {threads.length} Conversation{threads.length !== 1 ? "s" : ""}
            </p>
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No emails found</p>
                <Button size="sm" className="mt-3 gap-1" onClick={() => setShowCompose(true)}>
                  <MailPlus className="h-3.5 w-3.5" /> Send your first email
                </Button>
              </div>
            ) : (
              threads.map(thread => {
                const StatusIcon = STATUS_CONFIG[thread.lastStatus]?.icon || Mail;
                const statusCfg = STATUS_CONFIG[thread.lastStatus];
                const lastSubject = thread.messages[0]?.metadata?.subject;
                return (
                  <div
                    key={thread.email}
                    onClick={() => setSelectedThread(thread.email)}
                    className={cn(
                      "p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedThread === thread.email && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{thread.email}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {lastSubject || thread.templateNames.slice(0, 2).join(", ")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNowStrict(new Date(thread.lastAt), { addSuffix: true })}
                        </p>
                        <Badge variant="outline" className={cn("text-[10px] mt-0.5", statusCfg?.color)}>
                          <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                          {statusCfg?.label || thread.lastStatus}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      {thread.totalSent > 0 && <span className="text-[10px] text-green-600">✓ {thread.totalSent}</span>}
                      {thread.totalFailed > 0 && <span className="text-[10px] text-red-600">✗ {thread.totalFailed}</span>}
                      <span className="text-[10px] text-muted-foreground">{thread.messages.length} total</span>
                    </div>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* Thread Detail */}
        <div className="flex-1 flex flex-col">
          {!selectedThreadData ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to view details</p>
                <p className="text-xs mt-1">Or compose a new email</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{selectedThreadData.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedThreadData.messages.length} emails • {selectedThreadData.totalSent} delivered
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {suppressedList.some((s: any) => s.email?.toLowerCase() === selectedThread?.toLowerCase()) && (
                    <Badge variant="destructive" className="text-[10px]">
                      <Ban className="h-3 w-3 mr-1" /> Suppressed
                    </Badge>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleReply(selectedThreadData.email)}>
                    <Reply className="h-3 w-3" /> Reply
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3 max-w-2xl mx-auto">
                  {[...selectedThreadData.messages].reverse().map(msg => {
                    const statusCfg = STATUS_CONFIG[msg.status];
                    const StatusIcon = statusCfg?.icon || Mail;
                    const msgSubject = msg.metadata?.subject;
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className={cn(
                          "max-w-[85%] rounded-lg p-3 border",
                          msg.status === "sent" ? "bg-green-50/50 border-green-200/50" :
                          msg.status === "failed" || msg.status === "dlq" ? "bg-red-50/50 border-red-200/50" :
                          msg.status === "pending" ? "bg-yellow-50/50 border-yellow-200/50" :
                          "bg-muted/30 border-border/50"
                        )}>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn("text-[10px]", statusCfg?.color)}>
                              <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                              {statusCfg?.label || msg.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(msg.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          {msgSubject && <p className="text-xs font-medium text-muted-foreground mb-1">📋 {msgSubject}</p>}
                          <p className="text-sm font-medium">{msg.template_name}</p>
                          {msg.error_message && (
                            <p className="text-xs text-red-600 mt-1 bg-red-50 rounded p-1.5">
                              ⚠️ {msg.error_message}
                            </p>
                          )}
                          {(msg.status === "failed" || msg.status === "dlq") && (
                            <Button size="sm" variant="outline" className="mt-2 h-6 text-[10px]" onClick={() => handleResend(msg)}>
                              <RefreshCw className="h-3 w-3 mr-1" /> Retry
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Quick Reply at bottom */}
              <div className="p-3 border-t bg-muted/20">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Quick reply... (press Enter to open full compose)" 
                    className="h-8 text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleReply(selectedThreadData.email);
                      }
                    }}
                  />
                  <Button size="sm" className="h-8 gap-1" onClick={() => handleReply(selectedThreadData.email)}>
                    <Reply className="h-3.5 w-3.5" /> Reply
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Suppressed */}
      {suppressedList.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Ban className="h-4 w-4 text-orange-500" /> Auto-Blocked ({suppressedList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2">
              {suppressedList.map((s: any) => (
                <Badge key={s.id} variant="outline" className="text-xs border-orange-200 text-orange-700">
                  {s.email} — {s.reason || "unsubscribed"}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
