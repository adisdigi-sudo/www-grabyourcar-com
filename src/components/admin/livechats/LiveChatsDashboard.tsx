import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Bot, Send, User, UserCheck, X, Loader2, MessageCircle, BellRing } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ChatSession {
  id: string;
  session_key: string;
  visitor_name: string | null;
  visitor_phone: string | null;
  vertical_interest: string | null;
  last_message_preview: string | null;
  last_message_at: string;
  last_visitor_message_at: string | null;
  message_count: number;
  takeover_state: string;
  assigned_agent_name: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  sender_name: string | null;
  created_at: string;
}

const VERTICAL_COLORS: Record<string, string> = {
  loans: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  insurance: "bg-blue-500/10 text-blue-700 border-blue-300",
  sales: "bg-orange-500/10 text-orange-700 border-orange-300",
  hsrp: "bg-purple-500/10 text-purple-700 border-purple-300",
  rentals: "bg-pink-500/10 text-pink-700 border-pink-300",
  accessories: "bg-amber-500/10 text-amber-700 border-amber-300",
};

export const LiveChatsDashboard = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ai" | "human">("all");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const knownSessionIdsRef = useRef<Set<string>>(new Set());
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  // Load sessions + realtime
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("riya_chat_sessions")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(100);
      if (!cancelled) {
        const nextSessions = (data as ChatSession[]) || [];
        knownSessionIdsRef.current = new Set(nextSessions.map((session) => session.id));
        setSessions(nextSessions);
        setLoading(false);
      }
    };
    load();
    const channel = supabase
      .channel("livechats-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "riya_chat_sessions" }, (payload) => {
        const next = payload.new as Partial<ChatSession> | null;
        if (payload.eventType === "INSERT" && next?.id && !knownSessionIdsRef.current.has(next.id)) {
          knownSessionIdsRef.current.add(next.id);
          toast.success("New live chat started", {
            description: (next.visitor_name || next.visitor_phone || "Visitor") + " just sent a message.",
            icon: <BellRing className="h-4 w-4" />,
          });
        }
        load();
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // Load messages + realtime for active session
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("riya_chat_messages")
        .select("*")
        .eq("session_id", activeId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        const nextMessages = (data as ChatMessage[]) || [];
        knownMessageIdsRef.current = new Set(nextMessages.map((message) => message.id));
        setMessages(nextMessages);
      }
    };
    load();
    const channel = supabase
      .channel(`livechats-msgs-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "riya_chat_messages", filter: `session_id=eq.${activeId}` },
        (payload) => {
          const nextMessage = payload.new as ChatMessage;
          if (knownMessageIdsRef.current.has(nextMessage.id)) return;
          knownMessageIdsRef.current.add(nextMessage.id);
          setMessages((prev) => [...prev, nextMessage]);
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeId]);

  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredSessions = useMemo(() => {
    if (filter === "all") return sessions;
    return sessions.filter((s) => s.takeover_state === filter);
  }, [sessions, filter]);

  const activeSession = useMemo(() => sessions.find((s) => s.id === activeId), [sessions, activeId]);

  const takeover = async () => {
    if (!activeSession) return;
    const agentName = user?.email?.split("@")[0] || "Agent";
    const { error } = await supabase
      .from("riya_chat_sessions")
      .update({
        takeover_state: "human",
        assigned_agent_id: user?.id || null,
        assigned_agent_name: agentName,
        human_taken_over_at: new Date().toISOString(),
      })
      .eq("id", activeSession.id);
    if (error) {
      toast.error("Takeover failed: " + error.message);
      return;
    }
    // System message in chat
    await supabase.from("riya_chat_messages").insert({
      session_id: activeSession.id,
      role: "system",
      content: `🙋 ${agentName} (real human) ne chat join kar liya hai. Riya pause kar di gayi hai.`,
      sender_name: "System",
    });
    toast.success(`Takeover successful — Riya paused, you're live`);
  };

  const releaseToAI = async () => {
    if (!activeSession) return;
    await supabase
      .from("riya_chat_sessions")
      .update({ takeover_state: "ai", assigned_agent_id: null, assigned_agent_name: null })
      .eq("id", activeSession.id);
    await supabase.from("riya_chat_messages").insert({
      session_id: activeSession.id,
      role: "system",
      content: "🤖 Chat wapas Riya (AI) ke paas transfer ho gayi.",
      sender_name: "System",
    });
    toast.success("Released to AI");
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || !activeSession || sending) return;
    setSending(true);
    const agentName = user?.email?.split("@")[0] || "Agent";
    const { error } = await supabase.from("riya_chat_messages").insert({
      session_id: activeSession.id,
      role: "assistant",
      content: text,
      sender_name: agentName,
      sender_id: user?.id || null,
    });
    if (error) {
      toast.error("Send failed: " + error.message);
      setSending(false);
      return;
    }
    await supabase
      .from("riya_chat_sessions")
      .update({
        last_message_preview: text.slice(0, 200),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", activeSession.id);
    setReply("");
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Live Chats
            <Badge variant="destructive" className="text-[10px]">LIVE</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time visitor conversations with Riya. Click any chat to view, takeover, or reply directly.
          </p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "ai" | "human")}>
          <TabsList>
            <TabsTrigger value="all">All ({sessions.length})</TabsTrigger>
            <TabsTrigger value="ai">
              <Bot className="h-3 w-3 mr-1" /> AI ({sessions.filter((s) => s.takeover_state === "ai").length})
            </TabsTrigger>
            <TabsTrigger value="human">
              <UserCheck className="h-3 w-3 mr-1" /> Live ({sessions.filter((s) => s.takeover_state === "human").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Sessions list */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm">Conversations ({filteredSessions.length})</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No conversations yet</div>
            ) : (
              <div className="divide-y">
                {filteredSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className={cn(
                      "w-full text-left p-3 hover:bg-muted/50 transition-colors",
                      activeId === s.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {s.takeover_state === "human" ? (
                          <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Bot className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        <span className="font-medium text-sm truncate">
                          {s.visitor_name || s.visitor_phone || `Visitor ${s.session_key.slice(-6)}`}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(s.last_message_at), { addSuffix: false })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
                      {s.last_message_preview || "No messages yet"}
                    </p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {s.vertical_interest && (
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] px-1.5 py-0", VERTICAL_COLORS[s.vertical_interest])}
                        >
                          {s.vertical_interest}
                        </Badge>
                      )}
                      {s.visitor_phone && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          📞 {s.visitor_phone}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {s.message_count} msgs
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat view */}
        <Card className="flex flex-col overflow-hidden">
          {!activeSession ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation to view
            </div>
          ) : (
            <>
              <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between gap-2 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {activeSession.visitor_name || activeSession.visitor_phone || "Anonymous Visitor"}
                    {activeSession.takeover_state === "human" && (
                      <Badge variant="default" className="text-[9px]">YOU LIVE</Badge>
                    )}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Session: {activeSession.session_key.slice(-12)} • Started{" "}
                    {formatDistanceToNow(new Date(activeSession.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeSession.takeover_state === "ai" ? (
                    <Button size="sm" variant="default" onClick={takeover}>
                      <UserCheck className="h-3.5 w-3.5 mr-1" /> Take Over
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={releaseToAI}>
                      <Bot className="h-3.5 w-3.5 mr-1" /> Release to Riya
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setActiveId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 min-h-0 px-4" viewportRef={scrollViewportRef}>
                <div className="space-y-3 py-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        m.role === "user" ? "justify-start" : m.role === "system" ? "justify-center" : "justify-end"
                      )}
                    >
                      {m.role === "system" ? (
                        <div className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          {m.content}
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "max-w-[min(85%,42rem)] overflow-hidden rounded-2xl px-3 py-2 text-sm shadow-sm",
                            m.role === "user"
                              ? "bg-muted rounded-bl-sm"
                              : "bg-primary text-primary-foreground rounded-br-sm"
                          )}
                        >
                          <div className="text-[10px] opacity-70 mb-0.5">
                            {m.sender_name || (m.role === "user" ? "Visitor" : "Riya (AI)")} •{" "}
                            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                          </div>
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_p]:my-1 [&_*]:break-words">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <CardContent className="p-3 border-t">
                {activeSession.takeover_state !== "human" ? (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    🤖 Riya AI is handling this chat. Click <strong>Take Over</strong> above to reply manually.
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder="Type your reply as the human agent..."
                      disabled={sending}
                      maxLength={1000}
                    />
                    <Button onClick={sendReply} disabled={!reply.trim() || sending} size="icon">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LiveChatsDashboard;
