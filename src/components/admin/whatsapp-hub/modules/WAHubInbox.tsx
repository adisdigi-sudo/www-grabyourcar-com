import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WaConversationSidebar } from "../../inbox/WaConversationSidebar";
import { WaChatWindow } from "../../inbox/WaChatWindow";
import { WaCustomerInfoPanel } from "../../inbox/WaCustomerInfoPanel";
import type { WaConversation, WaMessage } from "../../WhatsAppBusinessInbox";

export function WAHubInbox() {
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<WaConversation | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from("wa_conversations")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("last_message_at", { ascending: false })
      .limit(200);

    if (error) {
      setConversations([]);
      setSelectedConvo(null);
    } else {
      const next = ((data || []) as unknown as WaConversation[]).filter((item) => item.phone);
      setConversations(next);
      setSelectedConvo((current) => {
        if (!next.length) return null;
        if (!current) return next[0];
        return next.find((item) => item.id === current.id) || next[0];
      });
    }
    setIsLoading(false);
  }, []);

  const fetchMessages = useCallback(async (convoId: string) => {
    const { data } = await supabase
      .from("wa_inbox_messages")
      .select("*")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true })
      .limit(500);
    setMessages((data || []) as unknown as WaMessage[]);
  }, []);

  useEffect(() => {
    fetchConversations();
    const ch = supabase
      .channel("wa-hub-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, () => fetchConversations())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedConvo) { setMessages([]); return; }
    fetchMessages(selectedConvo.id);
    if (selectedConvo.unread_count > 0) {
      supabase.from("wa_conversations").update({ unread_count: 0 }).eq("id", selectedConvo.id);
    }
    const ch = supabase
      .channel(`wa-hub-msgs-${selectedConvo.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_inbox_messages", filter: `conversation_id=eq.${selectedConvo.id}` }, () => fetchMessages(selectedConvo.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedConvo, fetchMessages]);

  const handleSendMessage = async (content: string, messageType: string = "text", extras: Record<string, unknown> = {}) => {
    if (!selectedConvo) return;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    let senderName = userData?.user?.email?.split("@")[0] || "Agent";
    
    // Try to get proper display name from team_members
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
      toast({ title: "Failed to send", description: data?.error || error?.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Message sent ✓" });
    return true;
  };

  const isWindowOpen = selectedConvo?.window_expires_at
    ? new Date(selectedConvo.window_expires_at) > new Date()
    : false;

  return (
    <div className="h-full flex overflow-hidden">
      <WaConversationSidebar
        conversations={conversations}
        selectedId={selectedConvo?.id || null}
        onSelect={(convo) => { setSelectedConvo(convo); setShowCustomerInfo(false); }}
        isLoading={isLoading}
      />
      <WaChatWindow
        conversation={selectedConvo}
        messages={messages}
        onSend={handleSendMessage}
        isWindowOpen={isWindowOpen}
        onToggleInfo={() => setShowCustomerInfo(!showCustomerInfo)}
      />
      {showCustomerInfo && selectedConvo && (
        <WaCustomerInfoPanel
          conversation={selectedConvo}
          messageCount={messages.length}
          onClose={() => setShowCustomerInfo(false)}
        />
      )}
    </div>
  );
}
