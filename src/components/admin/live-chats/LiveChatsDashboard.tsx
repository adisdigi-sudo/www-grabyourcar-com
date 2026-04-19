import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle, Phone, RefreshCw, User, Clock, Globe, Send, UserCheck, Bot,
  AlertTriangle, Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Session {
  id: string;
  session_key: string;
  agent_name: string | null;
  visitor_name: string | null;
  visitor_phone: string | null;
  visitor_city: string | null;
  vertical_interest: string | null;
  last_message_preview: string | null;
  last_message_at: string;
  message_count: number;
  lead_captured: boolean;
  lead_id: string | null;
  page_url: string | null;
  created_at: string;
  takeover_state?: string;
  assigned_agent_name?: string | null;
  human_taken_over_at?: string | null;
}

interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
  sender_name?: string | null;
}

const VERTICALS = ["all", "sales", "loans", "insurance", "rental", "hsrp", "accessories", "fleet", "dealer"];

function slaSeverity(lastMsgAt: string, takeoverState?: string) {
  const ageSec = (Date.now() - new Date(lastMsgAt).getTime()) / 1000;
  if (takeoverState === "human" && ageSec > 120) return { tone: "bg-red-500 text-white animate-pulse", label: "SLA breach" };
  if (ageSec > 60) return { tone: "bg-amber-500/15 text-amber-700", label: "Aging" };
  return null;
}

export const LiveChatsDashboard = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [vertical, setVertical] = useState("all");
  const [mode, setMode] = useState<"all" | "ai" | "human" | "waiting">("all");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState("Agent");
  const [agentId, setAgentId] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // load profile (agent display name)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAgentId(data.user.id);
        const meta: any = data.user.user_metadata || {};
        setAgentName(meta.full_name || meta.name || data.user.email || "Agent");
      }
    });
  }, []);

  /* ── sessions + realtime ── */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from("riya_chat_sessions")
        .select("*").order("last_message_at", { ascending: false }).limit(200);
      if (mounted) {
        setSessions((data as Session[]) || []);
        setLoading(false);
      }
    };
    load();
    const ch = supabase.channel("riya-sessions-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "riya_chat_sessions" }, () => load())
      .subscribe();
    // SLA refresh tick
    const tick = setInterval(() => setSessions((s) => [...s]), 15000);
    return () => { mounted = false; supabase.removeChannel(ch); clearInterval(tick); };
  }, []);

  /* ── messages for selected ── */
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from("riya_chat_messages")
        .select("*").eq("session_id", selectedId).order("created_at", { ascending: true });
      if (mounted) setMessages((data as Message[]) || []);
    };
    load();
    const ch = supabase.channel(`riya-msg-${selectedId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "riya_chat_messages", filter: `session_id=eq.${selectedId}` },
        (p) => setMessages((prev) => [...prev, p.new as Message]),
      ).subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [selectedId]);

  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const filtered = useMemo(() => {
    let out = sessions;
    if (vertical !== "all") out = out.filter((s) => (s.vertical_interest || "").toLowerCase() === vertical);
    if (mode === "ai") out = out.filter((s) => (s.takeover_state || "ai") === "ai");
    if (mode === "human") out = out.filter((s) => s.takeover_state === "human");
    if (mode === "waiting") {
      out = out.filter((s) => {
        const ageSec = (Date.now() - new Date(s.last_message_at).getTime()) / 1000;
        return ageSec > 60;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((s) =>
        s.visitor_name?.toLowerCase().includes(q) ||
        s.visitor_phone?.includes(q) ||
        s.last_message_preview?.toLowerCase().includes(q));
    }
    return out;
  }, [sessions, vertical, mode, search]);

  const selected = sessions.find((s) => s.id === selectedId);
  const counts = useMemo(() => ({
    all: sessions.length,
    ai: sessions.filter((s) => (s.takeover_state || "ai") === "ai").length,
    human: sessions.filter((s) => s.takeover_state === "human").length,
    waiting: sessions.filter((s) => (Date.now() - new Date(s.last_message_at).getTime()) / 1000 > 60).length,
  }), [sessions]);

  async function takeover() {
    if (!selectedId) return;
    const { error } = await supabase.functions.invoke("riya-takeover", {
      body: { action: "takeover", session_id: selectedId, agent_id: agentId, agent_name: agentName },
    });
    if (error) toast.error(error.message); else toast.success("You took over the chat — type a reply below");
  }
  async function release() {
    if (!selectedId) return;
    const { error } = await supabase.functions.invoke("riya-takeover", {
      body: { action: "release", session_id: selectedId, agent_id: agentId, agent_name: agentName },
    });
    if (error) toast.error(error.message); else toast.success("Handed back to AI");
  }
  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    const { error } = await supabase.functions.invoke("riya-takeover", {
      body: { action: "reply", session_id: selectedId, agent_id: agentId, agent_name: agentName, message: reply.trim() },
    });
    if (error) toast.error(error.message);
    else { setReply(""); }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Live Chats
          </h1>
          <p className="text-sm text-muted-foreground">Real-time visitor conversations — take over from AI anytime</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Live
          </Badge>
          <Badge variant="outline">{counts.all} sessions</Badge>
          <Badge className="bg-amber-500/15 text-amber-700">⏳ {counts.waiting} waiting</Badge>
          <Badge className="bg-blue-500/15 text-blue-700"><Bot className="h-3 w-3 mr-1" />{counts.ai}</Badge>
          <Badge className="bg-emerald-500/15 text-emerald-700"><UserCheck className="h-3 w-3 mr-1" />{counts.human}</Badge>
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={vertical} onValueChange={setVertical}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{VERTICALS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">🤖 AI</TabsTrigger>
              <TabsTrigger value="human" className="text-xs">🧑‍💼 Human</TabsTrigger>
              <TabsTrigger value="waiting" className="text-xs">⏳ Waiting</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input placeholder="Search by name, phone, message…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 max-w-xs" />
        </CardContent>
      </Card>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Session list */}
        <Card className="flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin inline mr-2" /> Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No chats match this filter</div>
              ) : (
                filtered.map((sess) => {
                  const sla = slaSeverity(sess.last_message_at, sess.takeover_state);
                  return (
                    <button key={sess.id} onClick={() => setSelectedId(sess.id)}
                      className={cn("w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors",
                        selectedId === sess.id && "bg-muted")}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="font-medium text-sm truncate flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {sess.visitor_name || sess.visitor_phone || "Visitor"}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(sess.last_message_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{sess.last_message_preview || "—"}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {sess.takeover_state === "human" ? (
                          <Badge className="h-5 text-[10px] gap-1 bg-emerald-500"><UserCheck className="h-2.5 w-2.5" />{sess.assigned_agent_name || "Agent"}</Badge>
                        ) : (
                          <Badge variant="outline" className="h-5 text-[10px] gap-1"><Bot className="h-2.5 w-2.5" /> AI</Badge>
                        )}
                        {sla && <Badge className={cn("h-5 text-[10px] gap-1", sla.tone)}><AlertTriangle className="h-2.5 w-2.5" />{sla.label}</Badge>}
                        {sess.lead_captured && <Badge className="h-5 text-[10px] gap-1"><Phone className="h-2.5 w-2.5" />Lead</Badge>}
                        {sess.vertical_interest && <Badge variant="outline" className="h-5 text-[10px]">{sess.vertical_interest}</Badge>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Transcript + reply box */}
        <Card className="flex flex-col overflow-hidden">
          {selected ? (
            <>
              <CardHeader className="pb-3 border-b space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selected.visitor_name || selected.visitor_phone || "Anonymous visitor"}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {selected.visitor_phone && (
                      <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1">
                        <a href={`https://wa.me/91${selected.visitor_phone}`} target="_blank" rel="noopener">
                          <Phone className="h-3 w-3" /> WhatsApp
                        </a>
                      </Button>
                    )}
                    {selected.takeover_state === "human" ? (
                      <Button size="sm" variant="outline" onClick={release} className="h-7 text-xs gap-1">
                        <Bot className="h-3 w-3" /> Hand back to AI
                      </Button>
                    ) : (
                      <Button size="sm" onClick={takeover} className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700">
                        <UserCheck className="h-3 w-3" /> Take over
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                    Started {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}</span>
                  <span>Mode: <strong>{selected.takeover_state === "human" ? `🧑‍💼 ${selected.assigned_agent_name}` : "🤖 AI"}</strong></span>
                  {selected.page_url && (() => {
                    let pathLabel = selected.page_url;
                    try { pathLabel = new URL(selected.page_url).pathname || "/"; } catch {}
                    return (
                      <a href={selected.page_url} target="_blank" rel="noopener"
                        className="flex items-center gap-1 hover:text-primary truncate max-w-[280px]">
                        <Globe className="h-3 w-3" />{pathLabel}
                      </a>
                    );
                  })()}
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-3">
                  {messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : m.role === "system" ? "justify-center" : "justify-start")}>
                      {m.role === "system" ? (
                        <div className="text-[11px] italic text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                          {m.content}
                        </div>
                      ) : (
                        <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                          m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm"
                            : m.sender_name && m.sender_name !== "Riya" ? "bg-emerald-100 dark:bg-emerald-950 rounded-bl-sm"
                            : "bg-muted rounded-bl-sm")}>
                          {m.sender_name && (
                            <div className="text-[10px] font-semibold opacity-70 mb-0.5">{m.sender_name}</div>
                          )}
                          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                          <div className="text-[10px] opacity-60 mt-1">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8">No messages yet</div>
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              </ScrollArea>

              {/* Reply box (only when human-takeover) */}
              {selected.takeover_state === "human" ? (
                <div className="border-t p-3 flex gap-2">
                  <Input value={reply} onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }}}
                    placeholder={`Reply as ${agentName}…`} />
                  <Button onClick={sendReply} disabled={!reply.trim()} className="gap-1">
                    <Send className="h-4 w-4" /> Send
                  </Button>
                </div>
              ) : (
                <div className="border-t p-3 text-center text-xs text-muted-foreground bg-muted/30">
                  🤖 Riya AI is handling this chat. Click <strong>Take over</strong> above to reply directly.
                </div>
              )}
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a conversation to view the transcript
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LiveChatsDashboard;
