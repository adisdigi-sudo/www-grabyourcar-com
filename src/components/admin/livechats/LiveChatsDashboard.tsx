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
import { Bot, Send, User, UserCheck, X, Loader2, MessageCircle, BellRing, Clock3 } from "lucide-react";
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
  human_taken_over_at: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  sender_name: string | null;
  created_at: string;
}

const HUMAN_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

const formatPhoneChip = (phone: string | null) => (phone ? `📞 ${phone}` : null);
const sanitizeAgentName = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return "GrabYourCar Team";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 10) return "GrabYourCar Team";
  return trimmed;
};
const formatSessionTitle = (session: Pick<ChatSession, "visitor_name" | "visitor_phone" | "session_key">) => {
  if (session.visitor_name?.trim()) return session.visitor_name.trim();
  return `Website Visitor ${session.session_key.slice(-4)}`;
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
  const [timeoutTick, setTimeoutTick] = useState(Date.now());
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const knownSessionIdsRef = useRef<Set<string>>(new Set());
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  const resolveAgentName = async () => {
    if (!user?.id) return user?.email?.split("@")[0] || "Agent";

    const { data } = await supabase
      .from("team_members")
      .select("display_name, phone")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    return sanitizeAgentName(data?.display_name) || user?.email?.split("@")[0] || "GrabYourCar Team";
  };

  const loadSessions = async () => {
    const { data } = await supabase
      .from("riya_chat_sessions")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(100);

    const nextSessions = (data as ChatSession[]) || [];
    knownSessionIdsRef.current = new Set(nextSessions.map((session) => session.id));
    setSessions(nextSessions);
    setActiveId((current) => {
      if (current && nextSessions.some((session) => session.id === current)) return current;
      return nextSessions[0]?.id ?? null;
    });
    setLoading(false);
  };

  const loadMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from("riya_chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    const nextMessages = (data as ChatMessage[]) || [];
    knownMessageIdsRef.current = new Set(nextMessages.map((message) => message.id));
    setMessages(nextMessages);
  };

  const updateSessionLocally = (sessionId: string, patch: Partial<ChatSession>) => {
    setSessions((prev) => prev.map((session) => (session.id === sessionId ? { ...session, ...patch } : session)));
  };

  const releaseSessionToAI = async (sessionId: string, reason: "manual" | "timeout") => {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session || session.takeover_state !== "human") return;

    const { error } = await supabase
      .from("riya_chat_sessions")
      .update({
        takeover_state: "ai",
        assigned_agent_id: null,
        assigned_agent_name: null,
      })
      .eq("id", sessionId)
      .eq("takeover_state", "human");

    if (error) {
      toast.error("AI resume failed: " + error.message);
      return;
    }

    const content =
      reason === "timeout"
        ? "🤖 Human reply 5 minute tak nahi aayi, isliye Riya dobara active ho gayi hai."
        : "🤖 Chat wapas Riya (AI) ke paas transfer ho gayi.";

    await supabase.from("riya_chat_messages").insert({
      session_id: sessionId,
      role: "system",
      content,
      sender_name: "System",
    });

    updateSessionLocally(sessionId, {
      takeover_state: "ai",
      assigned_agent_name: null,
      human_taken_over_at: null,
    });

    if (reason === "timeout") {
      toast("Riya resumed automatically", {
        description: `${formatSessionTitle(session)} par AI wapas active ho gaya.`,
      });
    } else {
      toast.success("Released to AI");
    }
  };

  useEffect(() => {
    loadSessions();

    const channel = supabase
      .channel("livechats-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "riya_chat_sessions" }, (payload) => {
        const next = payload.new as Partial<ChatSession> | null;
        if (payload.eventType === "INSERT" && next?.id && !knownSessionIdsRef.current.has(next.id)) {
          knownSessionIdsRef.current.add(next.id);
          toast.success("New live chat started", {
            description: formatSessionTitle({
              visitor_name: next.visitor_name || null,
              visitor_phone: next.visitor_phone || null,
              session_key: next.session_key || "new-chat",
            }) + " just sent a message.",
            icon: <BellRing className="h-4 w-4" />,
          });
        }
        loadSessions();
      })
      .subscribe();

    const timeoutInterval = window.setInterval(() => setTimeoutTick(Date.now()), 30_000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(timeoutInterval);
    };
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    loadMessages(activeId);

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
      supabase.removeChannel(channel);
    };
  }, [activeId]);

  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const staleHumanSessions = sessions.filter((session) => {
      if (session.takeover_state !== "human" || !session.human_taken_over_at) return false;
      return Date.now() - new Date(session.human_taken_over_at).getTime() >= HUMAN_IDLE_TIMEOUT_MS;
    });

    staleHumanSessions.forEach((session) => {
      releaseSessionToAI(session.id, "timeout");
    });
  }, [sessions, timeoutTick]);

  const filteredSessions = useMemo(() => {
    if (filter === "all") return sessions;
    return sessions.filter((session) => session.takeover_state === filter);
  }, [sessions, filter]);

  const activeSession = useMemo(() => sessions.find((session) => session.id === activeId) ?? null, [sessions, activeId]);

  const humanCountdownLabel = useMemo(() => {
    if (!activeSession || activeSession.takeover_state !== "human" || !activeSession.human_taken_over_at) return null;
    const elapsed = Date.now() - new Date(activeSession.human_taken_over_at).getTime();
    const remaining = Math.max(HUMAN_IDLE_TIMEOUT_MS - elapsed, 0);
    const minutes = Math.floor(remaining / 60_000);
    const seconds = Math.floor((remaining % 60_000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [activeSession, timeoutTick]);

  const takeover = async () => {
    if (!activeSession) return;
    const agentName = await resolveAgentName();
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("riya_chat_sessions")
      .update({
        takeover_state: "human",
        assigned_agent_id: user?.id || null,
        assigned_agent_name: agentName,
        human_taken_over_at: nowIso,
      })
      .eq("id", activeSession.id);

    if (error) {
      toast.error("Takeover failed: " + error.message);
      return;
    }

    await supabase.from("riya_chat_messages").insert({
      session_id: activeSession.id,
      role: "system",
      content: `🙋 ${agentName} ne chat manually join kar li hai. Ab aap WhatsApp-style live reply kar sakte hain.`,
      sender_name: "System",
    });

    updateSessionLocally(activeSession.id, {
      takeover_state: "human",
      assigned_agent_name: agentName,
      human_taken_over_at: nowIso,
    });

    toast.success("Manual chat active");
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || !activeSession || sending) return;

    setSending(true);
    const agentName = await resolveAgentName();
    const nowIso = new Date().toISOString();

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
        takeover_state: "human",
        assigned_agent_id: user?.id || null,
        assigned_agent_name: agentName,
        human_taken_over_at: nowIso,
        last_message_preview: text.slice(0, 200),
        last_message_at: nowIso,
      })
      .eq("id", activeSession.id);

    updateSessionLocally(activeSession.id, {
      takeover_state: "human",
      assigned_agent_name: agentName,
      human_taken_over_at: nowIso,
      last_message_preview: text.slice(0, 200),
      last_message_at: nowIso,
    });

    setReply("");
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessageCircle className="h-6 w-6 text-primary" />
            Live Chats
            <Badge variant="destructive" className="text-[10px]">LIVE</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            Manual thread bilkul WhatsApp jaisa — human reply rukte hi 5 minute baad Riya wapas active ho jayegi.
          </p>
        </div>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as "all" | "ai" | "human")}>
          <TabsList>
            <TabsTrigger value="all">All ({sessions.length})</TabsTrigger>
            <TabsTrigger value="ai">
              <Bot className="mr-1 h-3 w-3" /> AI ({sessions.filter((session) => session.takeover_state === "ai").length})
            </TabsTrigger>
            <TabsTrigger value="human">
              <UserCheck className="mr-1 h-3 w-3" /> Live ({sessions.filter((session) => session.takeover_state === "human").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid h-[calc(100vh-220px)] min-h-[560px] grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="border-b py-3 px-4">
            <CardTitle className="text-sm">Conversations ({filteredSessions.length})</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No conversations yet</div>
            ) : (
              <div className="divide-y divide-border">
                {filteredSessions.map((session) => {
                  const isHuman = session.takeover_state === "human";
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setActiveId(session.id)}
                      className={cn(
                        "w-full px-3 py-3 text-left transition-colors hover:bg-muted/50",
                        activeId === session.id && "bg-muted"
                      )}
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isHuman ? (
                              <UserCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                            ) : (
                              <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <span className="truncate text-sm font-medium">
                              {formatSessionTitle(session)}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(session.last_message_at), { addSuffix: false })}
                        </span>
                      </div>

                      <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                        {session.last_message_preview || "No messages yet"}
                      </p>

                      <div className="flex flex-wrap items-center gap-1">
                        {session.vertical_interest && (
                          <Badge variant="outline" className="px-1.5 py-0 text-[9px] uppercase">
                            {session.vertical_interest}
                          </Badge>
                        )}
                        {formatPhoneChip(session.visitor_phone) && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
                            {formatPhoneChip(session.visitor_phone)}
                          </Badge>
                        )}
                        <Badge variant="outline" className="px-1.5 py-0 text-[9px]">
                          {session.message_count} msgs
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          {!activeSession ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a conversation to view
            </div>
          ) : (
            <>
              <CardHeader className="border-b py-3 px-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      <span className="truncate">{formatSessionTitle(activeSession)}</span>
                      {activeSession.takeover_state === "human" ? (
                        <Badge className="text-[9px]">MANUAL LIVE</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px]">RIYA ACTIVE</Badge>
                      )}
                    </CardTitle>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Session: {activeSession.session_key.slice(-12)} • Started {formatDistanceToNow(new Date(activeSession.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeSession.takeover_state === "human" && humanCountdownLabel && (
                      <div className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        AI resumes in {humanCountdownLabel}
                      </div>
                    )}
                    {activeSession.takeover_state === "ai" ? (
                      <Button size="sm" onClick={takeover}>
                        <UserCheck className="mr-1 h-3.5 w-3.5" /> Take Over
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => releaseSessionToAI(activeSession.id, "manual")}>
                        <Bot className="mr-1 h-3.5 w-3.5" /> Release to Riya
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setActiveId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <div className="flex-1 min-h-0 bg-muted/20">
                <ScrollArea className="h-full px-3 md:px-5" viewportRef={scrollViewportRef}>
                  <div className="space-y-3 py-4">
                    {messages.map((message) => {
                      const isSystem = message.role === "system";
                      const isVisitor = message.role === "user";

                      if (isSystem) {
                        return (
                          <div key={message.id} className="flex justify-center">
                            <div className="max-w-[90%] rounded-full bg-background px-3 py-1 text-center text-[10px] text-muted-foreground shadow-sm">
                              {message.content}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={message.id} className={cn("flex", isVisitor ? "justify-start" : "justify-end")}>
                          <div
                            className={cn(
                              "max-w-[min(88%,42rem)] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                              isVisitor
                                ? "rounded-bl-sm border border-border bg-background text-foreground"
                                : "rounded-br-sm bg-primary text-primary-foreground"
                            )}
                          >
                            <div className={cn("mb-1 text-[10px]", isVisitor ? "text-muted-foreground" : "text-primary-foreground/80")}>
                              {message.sender_name || (isVisitor ? "Visitor" : "Riya (AI)")} • {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </div>
                            <div className="prose prose-sm max-w-none break-words dark:prose-invert [&_*]:break-words [&_p]:my-1">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <CardContent className="border-t p-3">
                {activeSession.takeover_state !== "human" ? (
                  <div className="py-2 text-center text-xs text-muted-foreground">
                    Riya abhi handle kar rahi hai — manual WhatsApp-style reply ke liye <strong>Take Over</strong> dabaiye.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-border bg-background p-2">
                      <div className="flex items-end gap-2">
                        <Input
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              sendReply();
                            }
                          }}
                          placeholder="Type a manual reply..."
                          disabled={sending}
                          maxLength={1000}
                          className="border-0 shadow-none focus-visible:ring-0"
                        />
                        <AIPolishButtons
                          value={reply}
                          onChange={setReply}
                          disabled={sending}
                          contextHint="Live chat reply to a website visitor on GrabYourCar"
                        />
                        <Button onClick={sendReply} disabled={!reply.trim() || sending} size="icon" className="shrink-0 rounded-full">
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Har manual reply ke baad 5 minute timer reset hoga. Agar human silent raha, Riya automatically resume karegi. ✨ AI Fix / Rewrite use karke message polish kar sakte hain.
                    </p>
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
