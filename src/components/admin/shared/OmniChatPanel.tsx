import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  MessageSquare, Mail, Smartphone, Send, Loader2, User,
  Clock, CheckCheck, Search, RefreshCw
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
  unread?: boolean;
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
}

function normalizePhone(value: string): string {
  const clean = value.replace(/\D/g, "").replace(/^0+/, "");
  if (clean.startsWith("91") && clean.length === 12) return clean;
  if (clean.length === 10 && /^[6-9]/.test(clean)) return `91${clean}`;
  return clean;
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

  // Load threads
  useEffect(() => {
    loadThreads();
  }, []);

  // Prime composer when opened from CRM quick actions
  useEffect(() => {
    if (!phone) return;
    setReplyChannel("whatsapp");
    setReplyMessage(initialMessage || "");
  }, [phone, initialMessage]);

  // Auto-select thread if phone provided, or create a draft thread
  useEffect(() => {
    if (!phone) return;

    const normalizedPhone = normalizePhone(phone);
    const match = threads.find((t) => {
      const threadPhone = normalizePhone(t.phone);
      return threadPhone === normalizedPhone ||
        threadPhone.endsWith(normalizedPhone.slice(-10)) ||
        normalizedPhone.endsWith(threadPhone.slice(-10));
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
      };
    });
  }, [phone, threads, initialMessage, initialName]);

  // Load messages for selected thread
  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread.phone);
    }
  }, [selectedThread]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadThreads() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("wa_message_logs")
        .select("phone, customer_name, message_content, sent_at, created_at, channel")
        .order("created_at", { ascending: false })
        .limit(500);

      // Group by phone to get threads
      const threadMap = new Map<string, ChatThread>();
      for (const msg of data || []) {
        if (!threadMap.has(msg.phone)) {
          threadMap.set(msg.phone, {
            id: msg.phone,
            phone: msg.phone,
            customer_name: msg.customer_name,
            last_message: msg.message_content || "",
            last_at: msg.sent_at || msg.created_at,
            channel: msg.channel || "whatsapp",
          });
        }
      }

      setThreads(Array.from(threadMap.values()));
    } catch (err) {
      console.error("Failed to load threads:", err);
    }
    setLoading(false);
  }

  async function loadMessages(phoneNum: string) {
    const { data } = await supabase
      .from("wa_message_logs")
      .select("*")
      .eq("phone", phoneNum)
      .order("created_at", { ascending: true })
      .limit(100);

    setMessages((data as ChatMessage[]) || []);
  }

  async function handleReply() {
    if (!replyMessage.trim() || !selectedThread) return;

    setSending(true);
    const result = await omniSend({
      channel: replyChannel,
      phone: selectedThread.phone,
      message: replyMessage,
      name: selectedThread.customer_name || undefined,
      vertical: context,
    });

    if (result.success || result.fallback) {
      setReplyMessage("");
      setTimeout(() => {
        loadMessages(selectedThread.phone);
        loadThreads();
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
    if (ch === "email") return <Mail className="h-3 w-3 text-blue-500" />;
    if (ch === "rcs") return <Smartphone className="h-3 w-3 text-purple-500" />;
    return <MessageSquare className="h-3 w-3 text-green-500" />;
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Conversations
            {context && <Badge variant="outline" className="text-[10px]">{context}</Badge>}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadThreads}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex gap-2 p-2 overflow-hidden">
        {/* Thread List */}
        <div className="w-1/3 flex flex-col gap-1.5 border-r pr-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
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
              <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
            ) : (
              <div className="space-y-1">
                {filteredThreads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThread(t)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
                      selectedThread?.id === t.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {channelIcon(t.channel)}
                      <span className="font-medium truncate flex-1">
                        {t.customer_name || t.phone}
                      </span>
                    </div>
                    <p className="text-muted-foreground truncate text-[10px]">{t.last_message}</p>
                    <p className="text-muted-foreground text-[9px] mt-0.5">
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

        {/* Chat View */}
        <div className="flex-1 flex flex-col">
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 p-2 border-b mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedThread.customer_name || selectedThread.phone}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{selectedThread.phone}</p>
                </div>
                {channelIcon(selectedThread.channel)}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-2">
                <div className="space-y-2 py-2">
                  {messages.map((m) => (
                    <div key={m.id} className="flex flex-col items-end">
                      <div className="max-w-[80%] bg-primary/10 rounded-lg p-2">
                        <p className="text-xs whitespace-pre-wrap">{m.message_content}</p>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          {channelIcon(m.channel || "whatsapp")}
                          <span className="text-[9px] text-muted-foreground">
                            {m.sent_at
                              ? new Date(m.sent_at).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                          {m.status === "queued" && <Clock className="h-3 w-3 text-amber-500" />}
                          {m.status === "sent" && <CheckCheck className="h-3 w-3 text-muted-foreground" />}
                          {m.status === "delivered" && <CheckCheck className="h-3 w-3 text-blue-500" />}
                          {m.status === "read" && <CheckCheck className="h-3 w-3 text-green-500" />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Reply */}
              <div className="border-t pt-2 space-y-1.5">
                <div className="flex gap-1">
                  {(["whatsapp", "email", "rcs"] as OmniChannel[]).map((ch) => (
                    <Button
                      key={ch}
                      variant={replyChannel === ch ? "default" : "ghost"}
                      size="sm"
                      className="h-6 text-[10px] px-2"
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
                    className="text-xs h-8"
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
