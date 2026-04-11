import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, Send, Search, User, Phone
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  phone: string;
  customer_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  status: string | null;
}

interface InboxMessage {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  message_type: string;
  content: string | null;
  status: string | null;
  sent_by_name: string | null;
  created_at: string | null;
  read_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
}

export function WAConversationInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [search, setSearch] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("wa_conversations")
      .select("id, phone, customer_name, last_message, last_message_at, unread_count, status")
      .order("last_message_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Failed to load WhatsApp conversations:", error);
      setConversations([]);
      setSelected(null);
      setIsLoading(false);
      return;
    }

    const nextConversations = ((data || []) as Conversation[]).filter((item) => item.phone);
    setConversations(nextConversations);
    setSelected((current) => {
      if (!nextConversations.length) return null;
      if (!current) return nextConversations[0];
      return nextConversations.find((item) => item.id === current.id) || nextConversations[0];
    });
    setIsLoading(false);
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setIsMessagesLoading(true);

    const { data, error } = await supabase
      .from("wa_inbox_messages")
      .select(
        "id, conversation_id, direction, message_type, content, status, sent_by_name, created_at, read_at, delivered_at, failed_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      console.error("Failed to load WhatsApp messages:", error);
      setMessages([]);
      setIsMessagesLoading(false);
      return;
    }

    setMessages((data || []) as InboxMessage[]);
    setIsMessagesLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel("wa-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }

    fetchMessages(selected.id);

    if ((selected.unread_count || 0) > 0) {
      supabase.from("wa_conversations").update({ unread_count: 0 }).eq("id", selected.id);
    }

    const channel = supabase
      .channel(`wa-inbox-messages-${selected.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wa_inbox_messages",
          filter: `conversation_id=eq.${selected.id}`,
        },
        () => {
          fetchMessages(selected.id);
          fetchConversations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selected, fetchMessages, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setIsSending(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke("wa-send-inbox", {
        body: {
          conversation_id: selected.id,
          phone: selected.phone,
          message_type: "text",
          content: replyText,
          sent_by: userData?.user?.id,
          sent_by_name: userData?.user?.email?.split("@")[0] || "Agent",
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Failed to send reply");
      }

      setReplyText("");
      toast({ title: "Reply sent ✅" });
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const filtered = conversations.filter(c =>
    !search || c.customer_name?.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const getMessageStatus = (message: InboxMessage) => {
    if (message.read_at) return "Read";
    if (message.delivered_at) return "Delivered";
    if (message.failed_at) return "Failed";
    return message.status || "Sent";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Conversation List */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[520px]">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Loading conversations...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No conversations yet
              </div>
            ) : filtered.map(conv => {
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelected(conv)}
                  className={cn(
                    "w-full text-left p-3 border-b hover:bg-muted/50 transition",
                    selected?.id === conv.id && "bg-muted"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{conv.customer_name || conv.phone}</p>
                        <p className="text-xs text-muted-foreground truncate">{conv.last_message?.slice(0, 60) || "No messages"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {conv.last_message_at
                          ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "--:--"}
                      </span>
                      {(conv.unread_count || 0) > 0 && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Window */}
      <Card className="md:col-span-2 flex flex-col">
        {selected ? (
          <>
            {/* Chat Header */}
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{selected.customer_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {selected.phone}
                    </p>
                  </div>
                </div>
                <Badge variant={selected.status === "active" ? "default" : "secondary"}>
                  {selected.status || "active"}
                </Badge>
              </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {isMessagesLoading ? (
                  <div className="text-center text-sm text-muted-foreground py-6">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">No messages in this conversation yet.</div>
                ) : messages.map((msg) => (
                  <div key={msg.id} className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-xl px-3 py-2 text-sm",
                      msg.direction === "outbound" 
                        ? "bg-primary text-primary-foreground rounded-br-sm" 
                        : "bg-muted rounded-bl-sm"
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content || "—"}</p>
                      {msg.created_at && (
                        <p className={cn(
                          "text-[10px] mt-1",
                          msg.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {msg.direction === "outbound" ? ` • ${getMessageStatus(msg)}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Reply Input */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a reply..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleReply()}
                  disabled={isSending}
                />
                <Button onClick={handleReply} disabled={isSending || !replyText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Select a conversation to start replying</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
