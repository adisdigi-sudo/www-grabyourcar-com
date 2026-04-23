import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WaConversationSidebar } from "@/components/admin/inbox/WaConversationSidebar";
import { WaChatWindow } from "@/components/admin/inbox/WaChatWindow";
import { WaCustomerInfoPanel } from "@/components/admin/inbox/WaCustomerInfoPanel";
import type { WaConversation, WaMessage } from "@/components/admin/WhatsAppBusinessInbox";

interface ScopedWaInboxProps {
  allowedPhones?: string[];
  scopeLabel?: string;
  context?: string;
}

function normalizePhone(value: string) {
  const clean = String(value || "").replace(/\D/g, "").replace(/^0+/, "");
  if (clean.startsWith("91") && clean.length === 12) return clean;
  if (clean.length === 10 && /^[6-9]/.test(clean)) return `91${clean}`;
  return clean;
}

export function ScopedWaInbox({ allowedPhones = [], scopeLabel, context }: ScopedWaInboxProps) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<WaConversation | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);

  const allowedKeys = useMemo(
    () => new Set((allowedPhones || []).map((phone) => normalizePhone(phone).slice(-10)).filter(Boolean)),
    [allowedPhones],
  );

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("wa_conversations")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("last_message_at", { ascending: false })
      .limit(300);

    if (error) {
      console.error("Error fetching scoped conversations:", error);
      setConversations([]);
      setSelectedConvo(null);
      setIsLoading(false);
      return;
    }

    const scoped = ((data || []) as unknown as WaConversation[])
      .filter((item) => item.phone)
      .filter((item) => {
        if (allowedKeys.size === 0) return true;
        return allowedKeys.has(normalizePhone(item.phone).slice(-10));
      });

    setConversations(scoped);
    setSelectedConvo((current) => {
      if (!scoped.length) return null;
      if (!current) return scoped[0];
      return scoped.find((item) => item.id === current.id) || scoped[0];
    });
    setIsLoading(false);
  }, [allowedKeys]);

  const fetchMessages = useCallback(async (convoId: string) => {
    const { data, error } = await supabase
      .from("wa_inbox_messages")
      .select("*")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      console.error("Error fetching scoped messages:", error);
      setMessages([]);
      return;
    }

    setMessages((data || []) as unknown as WaMessage[]);
  }, []);

  useEffect(() => {
    fetchConversations();

    const convoChannel = supabase
      .channel(`scoped-wa-conversations-${scopeLabel || context || "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(convoChannel);
    };
  }, [fetchConversations, scopeLabel, context]);

  useEffect(() => {
    if (!selectedConvo) {
      setMessages([]);
      return;
    }

    fetchMessages(selectedConvo.id);

    if (selectedConvo.unread_count > 0) {
      supabase.from("wa_conversations").update({ unread_count: 0 }).eq("id", selectedConvo.id);
    }

    supabase
      .from("wa_inbox_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", selectedConvo.id)
      .eq("direction", "inbound")
      .is("read_at", null)
      .then(() => {});

    const msgChannel = supabase
      .channel(`scoped-wa-messages-${selectedConvo.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wa_inbox_messages", filter: `conversation_id=eq.${selectedConvo.id}` },
        () => {
          fetchMessages(selectedConvo.id);
          fetchConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [selectedConvo, fetchMessages, fetchConversations]);

  const handleSendMessage = async (content: string, messageType: string = "text", extras: Record<string, unknown> = {}) => {
    if (!selectedConvo) return false;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    let senderName = userData?.user?.email?.split("@")[0] || "Agent";

    if (userId) {
      const { data: tm } = await supabase
        .from("team_members")
        .select("display_name")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      if (tm?.display_name) senderName = tm.display_name;
    }

    const { data, error } = await supabase.functions.invoke("wa-send-inbox", {
      body: {
        conversation_id: selectedConvo.id,
        phone: selectedConvo.phone,
        message_type: messageType,
        content,
        sent_by: userId,
        sent_by_name: senderName,
        ...extras,
      },
    });

    if (error || !data?.success) {
      const errMsg = data?.error || error?.message || "Send failed";
      if (data?.window_expired) {
        toast({ title: "⏰ 24hr Window Expired", description: "Message not sent. Please send an approved template message to re-open the conversation.", variant: "destructive" });
      } else {
        toast({ title: "Failed to send", description: errMsg, variant: "destructive" });
      }
      return false;
    }

    setMessages((prev) => ([
      ...prev,
      {
        id: `temp-${Date.now()}`,
        conversation_id: selectedConvo.id,
        direction: "outbound",
        message_type: messageType as WaMessage["message_type"],
        content,
        media_url: (extras.media_url as string | null) || null,
        media_mime_type: null,
        media_filename: (extras.media_filename as string | null) || null,
        template_name: (extras.template_name as string | null) || null,
        template_variables: (extras.template_variables as Record<string, string> | null) || null,
        wa_message_id: null,
        status: "sent",
        error_code: null,
        error_message: null,
        sent_by_name: senderName,
        read_at: null,
        delivered_at: null,
        failed_at: null,
        created_at: new Date().toISOString(),
      },
    ]));

    setConversations((prev) => prev.map((item) => item.id === selectedConvo.id
      ? { ...item, last_message: content || String(extras.media_filename || "Attachment"), last_message_at: new Date().toISOString(), unread_count: 0, status: "resolved" }
      : item));
    setSelectedConvo((current) => current ? { ...current, last_message: content || String(extras.media_filename || "Attachment"), last_message_at: new Date().toISOString(), unread_count: 0, status: "resolved" } : current);

    toast({ title: "Message sent ✓" });
    setTimeout(() => {
      fetchMessages(selectedConvo.id);
      fetchConversations();
    }, 500);
    return true;
  };

  const isWindowOpen = selectedConvo?.window_expires_at
    ? new Date(selectedConvo.window_expires_at) > new Date()
    : false;

  return (
    <Card className="h-[640px] overflow-hidden">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" />
              Conversations
            </CardTitle>
            {scopeLabel ? <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">{scopeLabel} only</Badge> : null}
            {!scopeLabel && context ? <Badge variant="outline" className="text-[10px]">{context}</Badge> : null}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{conversations.length} chats</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchConversations}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-73px)]">
        <div className="h-full flex overflow-hidden">
          <WaConversationSidebar
            conversations={conversations}
            selectedId={selectedConvo?.id || null}
            onSelect={(convo) => {
              setSelectedConvo(convo);
              setShowCustomerInfo(false);
            }}
            isLoading={isLoading}
          />
          <WaChatWindow
            conversation={selectedConvo}
            messages={messages}
            onSend={handleSendMessage}
            isWindowOpen={isWindowOpen}
            onToggleInfo={() => setShowCustomerInfo(!showCustomerInfo)}
          />
          {showCustomerInfo && selectedConvo ? (
            <WaCustomerInfoPanel
              conversation={selectedConvo}
              messageCount={messages.length}
              onClose={() => setShowCustomerInfo(false)}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}