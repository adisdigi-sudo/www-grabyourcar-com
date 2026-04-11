import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Mail,
  Smartphone,
  Send,
  Loader2,
  User,
  Clock,
  CheckCheck,
  Search,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { omniSend, type OmniChannel } from "@/lib/omniSend";

interface OmniChatPanelProps {
  phone?: string;
  email?: string;
  context?: string;
  initialMessage?: string;
  initialName?: string;
}

interface ChatThread {
  id: string;
  phone: string;
  customer_name: string | null;
  last_message: string;
  last_at: string;
  channel: string;
  unread_count?: number;
  isDraft?: boolean;
}

interface ChatMessage {
  id: string;
  message_content: string | null;
  message_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  channel: string;
  provider: string;
  customer_name: string | null;
  direction?: "inbound" | "outbound";
}

type InboxMessageRow = {
  id: string;
  direction: "inbound" | "outbound";
  content: string | null;
  message_type: string;
  status: string | null;
  read_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string | null;
  sent_by_name: string | null;
};

function normalizePhone(value: string): string {
  const clean = value.replace(/\D/g, "").replace(/^0+/, "");
  if (clean.startsWith("91") && clean.length === 12) return clean;
  if (clean.length === 10 && /^[6-9]/.test(clean)) return `91${clean}`;
  return clean;
}

function mapInboxStatus(message: {
  status?: string | null;
  read_at?: string | null;
  delivered_at?: string | null;
  failed_at?: string | null;
}): string {
  if (message.read_at) return "read";
  if (message.delivered_at) return "delivered";
  if (message.failed_at) return "failed";
  return message.status || "received";
}

export function OmniChatPanel({ phone, email, context, initialMessage, initialName }: OmniChatPanelProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyChannel, setReplyChannel] = useState<OmniChannel>("whatsapp");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadThreads();

    const convoChannel = supabase
      .channel("omni-chat-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, () => {
        loadThreads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(convoChannel);
    };
  }, []);

  useEffect(() => {
    if (!phone) return;
    setReplyChannel("whatsapp");
    setReplyMessage(initialMessage || "");
  }, [phone, initialMessage]);

  useEffect(() => {
    if (!phone) return;

    const normalizedPhone = normalizePhone(phone);
    const match = threads.find((t) => {
      const threadPhone = normalizePhone(t.phone);
      return (
        threadPhone === normalizedPhone ||
        threadPhone.endsWith(normalizedPhone.slice(-10)) ||
        normalizedPhone.endsWith(threadPhone.slice(-10))
      );
    });

    if (match) {
      setSelectedThread(match);
      return;
    }

    setSelectedThread((current) => {
      if (current && normalizePhone(current.phone) === normalizedPhone) return current;

      return {
        id: `draft-${normalizedPhone}`,
        phone: normalizedPhone,
        customer_name: initialName || null,
        last_message: initialMessage || "",
        last_at: new Date().toISOString(),
        channel: "whatsapp",
        isDraft: true,
      };
    });
  }, [phone, threads, initialMessage, initialName]);

  useEffect(() => {
    if (!selectedThread) return;

    loadMessages(selectedThread);

    if (selectedThread.isDraft) return;

    const msgChannel = supabase
      .channel(`omni-chat-messages-${selectedThread.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wa_inbox_messages",
          filter: `conversation_id=eq.${selectedThread.id}`,
        },
        () => {
          loadMessages(selectedThread);
          loadThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [selectedThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadThreads() {
    setLoading(true);
    try {
      const { data: inboxThreads, error: inboxError } = await supabase
        .from("wa_conversations")
        .select("id, phone, customer_name, last_message, last_message_at, unread_count")
        .order("last_message_at", { ascending: false })
        .limit(200);

      if (inboxError) throw inboxError;

      const mappedThreads: ChatThread[] = (inboxThreads || []).map((thread) => ({
        id: thread.id,
        phone: thread.phone,
        customer_name: thread.customer_name,
        last_message: thread.last_message || "",
        last_at: thread.last_message_at || new Date().toISOString(),
        channel: "whatsapp",
        unread_count: thread.unread_count || 0,
      }));

      setThreads(mappedThreads);
    } catch (err) {
      console.error("Failed to load threads:", err);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(thread: ChatThread) {
    if (thread.isDraft) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("wa_inbox_messages")
      .select("id, direction, content, message_type, status, read_at, delivered_at, failed_at, created_at, sent_by_name")
      .eq("conversation_id", thread.id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
      return;
    }

    setMessages((((data || []) as unknown) as InboxMessageRow[]).map((msg) => ({
      id: msg.id,
      message_content: msg.content,
      message_type: msg.message_type,
      status: mapInboxStatus(msg),
      sent_at: msg.created_at,
      created_at: msg.created_at || new Date().toISOString(),
      channel: "whatsapp",
      provider: "meta",
      customer_name: msg.direction === "inbound" ? thread.customer_name || null : msg.sent_by_name,
      direction: msg.direction,
    })));
  }

  async function handleReply() {
    if (!replyMessage.trim() || !selectedThread) return;

    setSending(true);
    const result = await omniSend({
      channel: replyChannel,
      phone: selectedThread.phone,
      email,
      message: replyMessage,
      name: selectedThread.customer_name || undefined,
      vertical: context,
    });

    if (result.success || result.fallback) {
      setReplyMessage("");
      setTimeout(() => {
        loadThreads();
        loadMessages(selectedThread);
      }, 1000);
    }
    setSending(false);
  }

  const filteredThreads = threads.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.phone.includes(q) ||
      t.customer_name?.toLowerCase().includes(q) ||
      t.last_message?.toLowerCase().includes(q)
    );
  });

  const channelIcon = (ch: string) => {
    if (ch === "email") return <Mail className="h-3 w-3 text-primary" />;
    if (ch === "rcs") return <Smartphone className="h-3 w-3 text-muted-foreground" />;
    return <MessageSquare className="h-3 w-3 text-primary" />;
  };

  return (
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            Conversations
            {context && (
              <Badge variant="outline" className="text-[10px]">
                {context}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadThreads}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 gap-2 overflow-hidden p-2">
        <div className="flex w-1/3 flex-col gap-1.5 border-r pr-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="h-8 pl-7 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No conversations yet</p>
            ) : (
              <div className="space-y-1">
                {filteredThreads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThread(t)}
                    className={`w-full rounded-lg border p-2 text-left text-xs transition-colors ${
                      selectedThread?.id === t.id
                        ? "border-primary/20 bg-primary/10"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                  >
                    <div className="mb-0.5 flex items-center gap-1.5">
                      {channelIcon(t.channel)}
                      <span className="flex-1 truncate font-medium">{t.customer_name || t.phone}</span>
                      {(t.unread_count || 0) > 0 && (
                        <Badge variant="default" className="h-4 min-w-4 px-1 text-[9px]">
                          {t.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">{t.last_message || "New message"}</p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">
                      {new Date(t.last_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex flex-1 flex-col">
          {!selectedThread ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-30" />
                <p>Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-1 flex items-center gap-2 border-b p-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{selectedThread.customer_name || selectedThread.phone}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedThread.phone}</p>
                </div>
                {channelIcon(selectedThread.channel)}
              </div>

              <ScrollArea className="flex-1 px-2">
                <div className="space-y-2 py-2">
                  {messages.map((m) => {
                    const isInbound = m.direction === "inbound";
                    return (
                      <div key={m.id} className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}>
                        <div className={`max-w-[80%] rounded-lg p-2 ${isInbound ? "bg-muted" : "bg-primary/10"}`}>
                          <p className="whitespace-pre-wrap text-xs">{m.message_content}</p>
                          <div className="mt-1 flex items-center justify-end gap-1">
                            {channelIcon(m.channel || "whatsapp")}
                            <span className="text-[9px] text-muted-foreground">
                              {m.sent_at
                                ? new Date(m.sent_at).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                            {!isInbound && m.status === "queued" && <Clock className="h-3 w-3 text-muted-foreground" />}
                            {!isInbound && ["sent", "delivered", "read"].includes(m.status) && (
                              <CheckCheck className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="space-y-1.5 border-t pt-2">
                <div className="flex gap-1">
                  {(["whatsapp", "email", "rcs"] as OmniChannel[]).map((ch) => (
                    <Button
                      key={ch}
                      variant={replyChannel === ch ? "default" : "ghost"}
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => setReplyChannel(ch)}
                    >
                      {ch === "whatsapp" ? "WA" : ch === "email" ? "Email" : "RCS"}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Input
                    placeholder={`Reply via ${replyChannel}...`}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="h-8 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleReply}
                    disabled={sending || !replyMessage.trim()}
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
