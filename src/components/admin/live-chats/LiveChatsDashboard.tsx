import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, RefreshCw, User, Clock, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

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
}

interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
}

export const LiveChatsDashboard = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Initial load + realtime subscription for sessions
  useEffect(() => {
    let mounted = true;

    const loadSessions = async () => {
      const { data } = await supabase
        .from("riya_chat_sessions")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(200);
      if (mounted) {
        setSessions((data as Session[]) || []);
        setLoading(false);
      }
    };

    loadSessions();

    const channel = supabase
      .channel("riya-chat-sessions-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "riya_chat_sessions" },
        () => loadSessions()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Load + subscribe to messages for selected session
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    let mounted = true;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("riya_chat_messages")
        .select("*")
        .eq("session_id", selectedId)
        .order("created_at", { ascending: true });
      if (mounted) setMessages((data as Message[]) || []);
    };

    loadMessages();

    const channel = supabase
      .channel(`riya-chat-msg-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "riya_chat_messages", filter: `session_id=eq.${selectedId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [selectedId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sessions;
    const s = search.toLowerCase();
    return sessions.filter(
      (sess) =>
        sess.visitor_name?.toLowerCase().includes(s) ||
        sess.visitor_phone?.includes(s) ||
        sess.last_message_preview?.toLowerCase().includes(s) ||
        sess.session_key.toLowerCase().includes(s)
    );
  }, [sessions, search]);

  const selected = sessions.find((s) => s.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Live Chats
          </h1>
          <p className="text-sm text-muted-foreground">
            Realtime view of every conversation between visitors and Riya
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </Badge>
          <Badge variant="outline">{sessions.length} sessions</Badge>
          <Badge variant="outline">{sessions.filter((s) => s.lead_captured).length} leads</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Session list */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="pb-3 space-y-2 border-b">
            <Input
              placeholder="Search by name, phone, message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                  Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No chats yet
                </div>
              ) : (
                filtered.map((sess) => (
                  <button
                    key={sess.id}
                    onClick={() => setSelectedId(sess.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors",
                      selectedId === sess.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-sm truncate flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {sess.visitor_name || sess.visitor_phone || "Visitor"}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(sess.last_message_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
                      {sess.last_message_preview || "—"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {sess.lead_captured && (
                        <Badge variant="default" className="h-5 text-[10px] gap-1">
                          <Phone className="h-2.5 w-2.5" />
                          Lead
                        </Badge>
                      )}
                      {sess.vertical_interest && (
                        <Badge variant="outline" className="h-5 text-[10px]">
                          {sess.vertical_interest}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        {sess.message_count} msgs
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Transcript */}
        <Card className="flex flex-col overflow-hidden">
          {selected ? (
            <>
              <CardHeader className="pb-3 border-b space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selected.visitor_name || selected.visitor_phone || "Anonymous visitor"}
                  </CardTitle>
                  {selected.visitor_phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-7 text-xs gap-1"
                    >
                      <a href={`https://wa.me/91${selected.visitor_phone}`} target="_blank" rel="noopener">
                        <Phone className="h-3 w-3" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Started {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                  </span>
                  <span>Agent: <strong>{selected.agent_name}</strong></span>
                  {selected.page_url && (() => {
                    let pathLabel = selected.page_url;
                    try {
                      pathLabel = new URL(selected.page_url).pathname || "/";
                    } catch {
                      // page_url may be a relative path or invalid — fall back to raw string
                    }
                    return (
                      <a
                        href={selected.page_url}
                        target="_blank"
                        rel="noopener"
                        className="flex items-center gap-1 hover:text-primary truncate max-w-[280px]"
                      >
                        <Globe className="h-3 w-3" />
                        {pathLabel}
                      </a>
                    );
                  })()}
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        m.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        )}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                        <div className="text-[10px] opacity-60 mt-1">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      No messages yet
                    </div>
                  )}
                </div>
              </ScrollArea>
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
