import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Mail, Send, AlertTriangle, CheckCircle2, Clock,
  Ban, RefreshCw, Inbox, XCircle, PenSquare, Reply, X, Loader2,
  MailPlus, Bold, Italic, Underline, List, ListOrdered, Link2,
  Paperclip, Type, ChevronDown, Star, Trash2, Archive, FileText,
  AlertCircle, MailOpen, ArrowLeft, MoreHorizontal, Forward
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict, subDays, subHours } from "date-fns";

type TimeRange = "24h" | "7d" | "30d" | "all";
type Folder = "inbox" | "sent" | "drafts" | "spam" | "all";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  sent: { label: "Delivered", color: "bg-green-500/10 text-green-700 border-green-200", icon: CheckCircle2 },
  pending: { label: "Queued", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200", icon: Clock },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-700 border-red-200", icon: XCircle },
  dlq: { label: "Dead Letter", color: "bg-red-500/10 text-red-800 border-red-300", icon: AlertTriangle },
  suppressed: { label: "Suppressed", color: "bg-orange-500/10 text-orange-700 border-orange-200", icon: Ban },
  bounced: { label: "Bounced", color: "bg-red-500/10 text-red-600 border-red-200", icon: XCircle },
  complained: { label: "Spam Report", color: "bg-purple-500/10 text-purple-700 border-purple-200", icon: AlertTriangle },
};

const FOLDER_CONFIG: Record<Folder, { label: string; icon: React.ElementType; color: string }> = {
  inbox: { label: "Inbox", icon: Inbox, color: "text-blue-600" },
  sent: { label: "Sent", icon: Send, color: "text-green-600" },
  drafts: { label: "Drafts", icon: FileText, color: "text-orange-600" },
  spam: { label: "Spam", icon: AlertCircle, color: "text-red-600" },
  all: { label: "All Mail", icon: Mail, color: "text-muted-foreground" },
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

interface EmailThread {
  id: string;
  email: string;
  subject: string;
  preview: string;
  messages: EmailLogEntry[];
  lastStatus: string;
  lastAt: string;
  isStarred: boolean;
  folder: "inbox" | "sent" | "spam";
  fromName: string;
}

function getTimeRangeDate(range: TimeRange): Date | null {
  switch (range) {
    case "24h": return subHours(new Date(), 24);
    case "7d": return subDays(new Date(), 7);
    case "30d": return subDays(new Date(), 30);
    default: return null;
  }
}

// ─── RICH TEXT EDITOR ───
function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your email...",
  minHeight = "250px"
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState("14");
  const [fontFamily, setFontFamily] = useState("sans-serif");

  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30">
        {/* Font Family */}
        <Select value={fontFamily} onValueChange={(v) => { setFontFamily(v); execCommand("fontName", v); }}>
          <SelectTrigger className="h-7 w-[110px] text-xs border-0 bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sans-serif">Sans Serif</SelectItem>
            <SelectItem value="serif">Serif</SelectItem>
            <SelectItem value="monospace">Monospace</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Font Size */}
        <Select value={fontSize} onValueChange={(v) => { setFontSize(v); execCommand("fontSize", v === "12" ? "2" : v === "14" ? "3" : v === "16" ? "4" : v === "18" ? "5" : v === "24" ? "6" : "3"); }}>
          <SelectTrigger className="h-7 w-[60px] text-xs border-0 bg-transparent">
            <Type className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12">12</SelectItem>
            <SelectItem value="14">14</SelectItem>
            <SelectItem value="16">16</SelectItem>
            <SelectItem value="18">18</SelectItem>
            <SelectItem value="24">24</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Text Formatting */}
        <TooltipProvider delayDuration={200}>
          <Tooltip><TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => execCommand("bold")}>
              <Bold className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">Bold (Ctrl+B)</p></TooltipContent></Tooltip>

          <Tooltip><TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => execCommand("italic")}>
              <Italic className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">Italic (Ctrl+I)</p></TooltipContent></Tooltip>

          <Tooltip><TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => execCommand("underline")}>
              <Underline className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs">Underline (Ctrl+U)</p></TooltipContent></Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Lists */}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => execCommand("insertUnorderedList")}>
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => execCommand("insertOrderedList")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Link */}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
          const url = prompt("Enter URL:");
          if (url) execCommand("createLink", url);
        }}>
          <Link2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        className="p-3 outline-none text-sm leading-relaxed"
        style={{ minHeight, fontFamily }}
        data-placeholder={placeholder}
        onInput={() => {
          if (editorRef.current) onChange(editorRef.current.innerHTML);
        }}
        suppressContentEditableWarning
      />
    </div>
  );
}

// ─── COMPOSE EMAIL PANEL ───
function ComposeEmailPanel({
  onClose,
  onSent,
  defaultTo = "",
  defaultSubject = "",
  defaultBody = "",
  isReply = false,
}: {
  onClose: () => void;
  onSent: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  isReply?: boolean;
}) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [fromName, setFromName] = useState("GrabYourCar");
  const [fromEmail, setFromEmail] = useState("noreply@grabyourcar.com");
  const [sending, setSending] = useState(false);
  const [cc, setCc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string; size: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: "File too large", description: `${file.name} exceeds 10MB limit`, variant: "destructive" });
          continue;
        }
        const ext = file.name.split(".").pop() || "file";
        const path = `email-attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("policy-documents").upload(path, file);
        if (uploadError) {
          toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
          continue;
        }
        const { data: urlData } = supabase.storage.from("policy-documents").getPublicUrl(path);
        setAttachments(prev => [...prev, { name: file.name, url: urlData.publicUrl, size: file.size }]);
      }
      toast({ title: "📎 File attached" });
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const handleSend = async () => {
    if (!to || !subject) {
      toast({ title: "To & Subject required", variant: "destructive" });
      return;
    }
    const attachmentHtml = attachments.length > 0
      ? `<br/><hr style="margin:16px 0;border:none;border-top:1px solid #e5e5e5"/><p style="font-size:13px;color:#666;margin-bottom:8px">📎 Attachments:</p>` +
        attachments.map(a => `<p style="margin:4px 0"><a href="${a.url}" target="_blank" style="color:#2563eb;text-decoration:underline">${a.name}</a> <span style="color:#999;font-size:11px">(${(a.size / 1024).toFixed(0)} KB)</span></p>`).join("")
      : "";
    const htmlBody = (body || "<p>&nbsp;</p>") + attachmentHtml;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-direct-email", {
        body: { to, subject, body: htmlBody, from_name: fromName, from_email: fromEmail, reply_to: fromEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "✅ Email sent", description: `Delivered to ${to}` });
      onSent();
      onClose();
    } catch (e: any) {
      toast({ title: "Send failed", description: e?.message || "Unable to queue email", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-background rounded-t-xl sm:rounded-xl shadow-2xl border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40 rounded-t-xl">
          <div className="flex items-center gap-2">
            <PenSquare className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{isReply ? "Reply" : "New Message"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {/* From */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-12 text-right text-xs">From</span>
            <div className="flex-1 flex gap-2">
              <Input value={fromName} onChange={e => setFromName(e.target.value)} className="h-8 text-xs w-[120px]" placeholder="Name" />
              <Select value={fromEmail} onValueChange={setFromEmail}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
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

          {/* To */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-12 text-right text-xs">To</span>
            <Input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="h-8 text-xs flex-1"
              disabled={isReply}
            />
            {!showCcBcc && (
              <Button variant="link" size="sm" className="text-xs h-6 px-1" onClick={() => setShowCcBcc(true)}>
                Cc/Bcc
              </Button>
            )}
          </div>

          {showCcBcc && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-12 text-right text-xs">Cc</span>
              <Input value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@example.com" className="h-8 text-xs flex-1" />
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-12 text-right text-xs">Subject</span>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="h-8 text-xs flex-1"
            />
          </div>

          <Separator />

          {/* Rich Text Editor */}
          <RichTextEditor value={body} onChange={setBody} minHeight="200px" />

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-muted/50 border rounded-md px-2 py-1 text-xs">
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                  <span className="max-w-[150px] truncate">{att.name}</span>
                  <span className="text-muted-foreground">({(att.size / 1024).toFixed(0)}KB)</span>
                  <button onClick={() => removeAttachment(idx)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip,.csv,.txt"
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={handleSend} disabled={sending || uploading || !to || !subject} className="gap-1.5 font-medium">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {sending ? "Sending..." : "Send"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Attach file"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            {attachments.length > 0 && (
              <span className="text-xs text-muted-foreground ml-1">{attachments.length} file(s)</span>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onClose}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN EMAIL CLIENT ───
export function EmailInboxDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [folder, setFolder] = useState<Folder>("all");
  const [search, setSearch] = useState("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState<{ email: string; subject: string; body?: string } | null>(null);
  const [starredEmails, setStarredEmails] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // ─── FETCH EMAILS ───
  const { data: rawSendLogs = [], isLoading: loadingSendLogs, refetch: refetchSendLogs } = useQuery({
    queryKey: ["email-send-log", timeRange],
    queryFn: async () => {
      let query = supabase.from("email_send_log").select("*").order("created_at", { ascending: false }).limit(500);
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
      let query = supabase.from("email_logs").select("*").order("sent_at", { ascending: false }).limit(500);
      const rangeDate = getTimeRangeDate(timeRange);
      if (rangeDate) query = query.gte("sent_at", rangeDate.toISOString());
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        message_id: d.resend_id || d.id,
        template_name: d.metadata?.type === "direct" ? "Direct Email" : (d.metadata?.campaign_name || "Campaign Email"),
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
  const refetch = useCallback(() => { refetchSendLogs(); refetchEmailLogs(); }, [refetchSendLogs, refetchEmailLogs]);

  // ─── MERGE & DEDUPLICATE ───
  const allLogs = useMemo(() => {
    const combined = [...rawSendLogs, ...rawEmailLogs];
    const map = new Map<string, EmailLogEntry>();
    const statusPriority = { sent: 5, delivered: 5, failed: 4, dlq: 4, suppressed: 4, bounced: 4, complained: 4, pending: 2, queued: 2 } as Record<string, number>;
    const sorted = [...combined].sort((a, b) => {
      const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (statusPriority[a.status] || 0) - (statusPriority[b.status] || 0);
    });
    for (const log of sorted) {
      const key = log.message_id || log.id;
      map.set(key, log);
    }
    return Array.from(map.values());
  }, [rawSendLogs, rawEmailLogs]);

  // ─── KNOWN SENDER DOMAINS (outgoing) ───
  const OUTGOING_DOMAINS = ["grabyourcar.com", "notify.grabyourcar.com"];

  const isOutgoingEmail = useCallback((log: EmailLogEntry) => {
    // If metadata has from_email or from, check if it's from our domain
    const from = log.metadata?.from_email || log.metadata?.from || "";
    const fromDomain = from.includes("@") ? from.split("@").pop()?.replace(">", "").toLowerCase() : "";
    if (OUTGOING_DOMAINS.some(d => fromDomain === d)) return true;
    // Template-based sends are always outgoing
    if (log.template_name && log.template_name !== "Direct Email" && log.template_name !== "auth_emails") return true;
    // If metadata type is direct, it's outgoing
    if (log.metadata?.type === "direct") return true;
    return false;
  }, []);

  // ─── BUILD THREADS ───
  const threads = useMemo((): EmailThread[] => {
    const threadMap = new Map<string, EmailLogEntry[]>();
    for (const log of allLogs) {
      const key = log.recipient_email?.toLowerCase() + "::" + (log.metadata?.subject || log.template_name || "");
      if (!threadMap.has(key)) threadMap.set(key, []);
      threadMap.get(key)!.push(log);
    }

    const result: EmailThread[] = [];
    for (const [, messages] of threadMap) {
      const sorted = messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = sorted[0];
      const subject = latest.metadata?.subject || latest.template_name || "No Subject";
      const preview = latest.metadata?.body_html
        ? latest.metadata.body_html.replace(/<[^>]+>/g, "").substring(0, 100)
        : latest.template_name;
      const isSpam = latest.status === "complained" || latest.status === "suppressed";
      const outgoing = isOutgoingEmail(latest);

      // Determine folder: spam > sent (outgoing) > inbox (incoming/replies)
      let emailFolder: "inbox" | "sent" | "spam" = "inbox";
      if (isSpam) emailFolder = "spam";
      else if (outgoing) emailFolder = "sent";

      result.push({
        id: latest.message_id || latest.id,
        email: latest.recipient_email?.toLowerCase() || "unknown",
        subject,
        preview: preview || "",
        messages: sorted,
        lastStatus: latest.status,
        lastAt: latest.created_at,
        isStarred: starredEmails.has(latest.message_id || latest.id),
        folder: emailFolder,
        fromName: latest.metadata?.from?.split("<")[0]?.trim() || (outgoing ? "GrabYourCar" : latest.recipient_email?.split("@")[0] || "Unknown"),
      });
    }
    return result.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [allLogs, starredEmails, isOutgoingEmail]);

  // ─── FILTERED THREADS ───
  const filteredThreads = useMemo(() => {
    let list = threads;
    if (folder === "inbox") list = list.filter(t => t.folder === "inbox");
    else if (folder === "sent") list = list.filter(t => t.folder === "sent");
    else if (folder === "spam") list = list.filter(t => t.folder === "spam");
    else if (folder === "drafts") list = []; // drafts empty for now
    // "all" shows everything
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.email.includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.preview.toLowerCase().includes(q)
      );
    }
    return list;
  }, [threads, folder, search]);

  const stats = useMemo(() => {
    const total = allLogs.length;
    const sent = allLogs.filter(l => l.status === "sent").length;
    const failed = allLogs.filter(l => ["failed", "dlq"].includes(l.status)).length;
    const pending = allLogs.filter(l => l.status === "pending").length;
    const spam = allLogs.filter(l => ["suppressed", "complained"].includes(l.status)).length;
    const inboxCount = threads.filter(t => t.folder === "inbox").length;
    const sentCount = threads.filter(t => t.folder === "sent").length;
    const spamCount = threads.filter(t => t.folder === "spam").length;
    return { total, sent, failed, pending, spam, inboxCount, sentCount, spamCount };
  }, [allLogs, threads]);

  const selectedThread = threads.find(t => t.id === selectedEmailId);

  const toggleStar = (id: string) => {
    setStarredEmails(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleReply = (thread: EmailThread) => {
    setReplyTo({
      email: thread.email,
      subject: thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`,
      body: "",
    });
  };

  const handleResend = async (log: EmailLogEntry) => {
    const isDirectEmail = log.template_name === "direct_email" || log.template_name === "Direct Email" || log.metadata?.type === "direct";
    if (isDirectEmail) {
      setReplyTo({
        email: log.recipient_email,
        subject: log.metadata?.subject || "",
        body: typeof log.metadata?.body_html === "string"
          ? log.metadata.body_html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")
          : "",
      });
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: { templateName: log.template_name, recipientEmail: log.recipient_email, idempotencyKey: `resend-${log.id}-${Date.now()}` },
      });
      if (error) throw error;
      toast({ title: "Email re-queued ✓" });
      refetch();
    } catch (e: any) {
      toast({ title: "Resend failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] border rounded-xl overflow-hidden bg-background shadow-sm">
      {/* ─── LEFT SIDEBAR ─── */}
      <div className="w-[200px] border-r flex flex-col bg-muted/20 shrink-0">
        {/* Compose Button */}
        <div className="p-3">
          <Button className="w-full gap-2 shadow-md" onClick={() => { setShowCompose(true); setReplyTo(null); }}>
            <PenSquare className="h-4 w-4" />
            Compose
          </Button>
        </div>

        {/* Folders */}
        <nav className="flex-1 px-2 space-y-0.5">
          {(["inbox", "sent", "drafts", "spam", "all"] as Folder[]).map(f => {
            const cfg = FOLDER_CONFIG[f];
            const Icon = cfg.icon;
            const count = f === "inbox" ? stats.inboxCount
              : f === "sent" ? stats.sentCount
              : f === "spam" ? stats.spamCount
              : f === "drafts" ? 0
              : threads.length;
            return (
              <button
                key={f}
                onClick={() => { setFolder(f); setSelectedEmailId(null); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                  folder === f ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/60"
                )}
              >
                <Icon className={cn("h-4 w-4", folder === f ? "text-primary" : cfg.color)} />
                <span className="flex-1 text-left">{cfg.label}</span>
                {count > 0 && (
                  <span className={cn("text-xs tabular-nums", folder === f ? "text-primary font-semibold" : "text-muted-foreground")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Stats Footer */}
        <div className="p-3 border-t space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Queued</span>
            <span className="text-yellow-600 font-medium">{stats.pending}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Failed</span>
            <span className="text-red-600 font-medium">{stats.failed}</span>
          </div>
        </div>
      </div>

      {/* ─── MIDDLE: EMAIL LIST ─── */}
      <div className={cn("flex flex-col border-r", selectedThread ? "w-[360px] shrink-0" : "flex-1")}>
        {/* Search & Filter Bar */}
        <div className="p-2 border-b flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search emails..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
          <div className="flex gap-0.5">
            {(["24h", "7d", "30d"] as TimeRange[]).map(r => (
              <Button key={r} size="sm" variant={timeRange === r ? "default" : "ghost"} className="h-7 text-[10px] px-2" onClick={() => setTimeRange(r)}>
                {r}
              </Button>
            ))}
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={refetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Email List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <MailOpen className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No emails in {FOLDER_CONFIG[folder].label}</p>
              <p className="text-xs mt-1">Compose a new email to get started</p>
            </div>
          ) : (
            filteredThreads.map(thread => {
              const statusCfg = STATUS_CONFIG[thread.lastStatus];
              const isSelected = selectedEmailId === thread.id;
              return (
                <div
                  key={thread.id}
                  onClick={() => setSelectedEmailId(thread.id)}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 border-b cursor-pointer transition-colors group",
                    isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                  )}
                >
                  {/* Star */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStar(thread.id); }}
                    className="mt-0.5 shrink-0"
                  >
                    <Star className={cn("h-4 w-4", thread.isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30 group-hover:text-muted-foreground")} />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{thread.email}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNowStrict(new Date(thread.lastAt), { addSuffix: false })}
                      </span>
                    </div>
                    <p className="text-xs font-medium truncate mt-0.5">{thread.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-muted-foreground truncate flex-1">{thread.preview}</p>
                      {statusCfg && (
                        <Badge variant="outline" className={cn("text-[9px] h-4 px-1 shrink-0", statusCfg.color)}>
                          {statusCfg.label}
                        </Badge>
                      )}
                    </div>
                    {thread.messages.length > 1 && (
                      <span className="text-[10px] text-muted-foreground">{thread.messages.length} messages</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </ScrollArea>
      </div>

      {/* ─── RIGHT: EMAIL DETAIL ─── */}
      {selectedThread ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center gap-3">
            <Button size="icon" variant="ghost" className="h-8 w-8 lg:hidden" onClick={() => setSelectedEmailId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold truncate">{selectedThread.subject}</h3>
              <p className="text-xs text-muted-foreground">{selectedThread.email} • {selectedThread.messages.length} message{selectedThread.messages.length > 1 ? "s" : ""}</p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => handleReply(selectedThread)}>
                <Reply className="h-3.5 w-3.5" /> Reply
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                <Forward className="h-3.5 w-3.5" /> Forward
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-3xl">
              {[...selectedThread.messages].reverse().map(msg => {
                const statusCfg = STATUS_CONFIG[msg.status];
                const StatusIcon = statusCfg?.icon || Mail;
                const msgSubject = msg.metadata?.subject;
                const bodyHtml = msg.metadata?.body_html;
                const fromStr = msg.metadata?.from || "GrabYourCar";

                return (
                  <div key={msg.id} className="border rounded-lg overflow-hidden">
                    {/* Message Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {fromStr.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{fromStr.split("<")[0].trim()}</p>
                          <p className="text-[10px] text-muted-foreground">to {msg.recipient_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-[10px]", statusCfg?.color)}>
                          <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                          {statusCfg?.label || msg.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(msg.created_at), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="p-4">
                      {msgSubject && <p className="text-sm font-semibold mb-2">{msgSubject}</p>}
                      {bodyHtml ? (
                        <div className="text-sm leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          {msg.template_name === "auth_emails" ? "Authentication email" : `Template: ${msg.template_name}`}
                        </p>
                      )}

                      {msg.error_message && (
                        <div className="mt-3 p-2.5 rounded bg-red-50 border border-red-200 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-red-700">Delivery Error</p>
                            <p className="text-xs text-red-600 mt-0.5">{msg.error_message}</p>
                          </div>
                        </div>
                      )}

                      {(msg.status === "failed" || msg.status === "dlq") && (
                        <Button size="sm" variant="outline" className="mt-3 h-7 text-xs gap-1" onClick={() => handleResend(msg)}>
                          <RefreshCw className="h-3 w-3" /> Retry Send
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Quick Reply */}
          <div className="px-4 py-3 border-t bg-muted/20">
            <div className="flex gap-2">
              <Input
                placeholder="Click Reply to compose a response..."
                className="h-9 text-sm flex-1"
                readOnly
                onClick={() => handleReply(selectedThread)}
              />
              <Button size="sm" className="h-9 gap-1.5" onClick={() => handleReply(selectedThread)}>
                <Reply className="h-3.5 w-3.5" /> Reply
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Mail className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Select an email to read</p>
            <p className="text-sm mt-1">Or compose a new message</p>
            <Button className="mt-4 gap-2" onClick={() => setShowCompose(true)}>
              <PenSquare className="h-4 w-4" /> Compose Email
            </Button>
          </div>
        </div>
      )}

      {/* ─── COMPOSE MODAL ─── */}
      {(showCompose || replyTo) && (
        <ComposeEmailPanel
          onClose={() => { setShowCompose(false); setReplyTo(null); }}
          onSent={refetch}
          defaultTo={replyTo?.email || ""}
          defaultSubject={replyTo?.subject || ""}
          defaultBody={replyTo?.body || ""}
          isReply={!!replyTo}
        />
      )}
    </div>
  );
}
