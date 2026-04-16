import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WaConversationSidebar } from "./inbox/WaConversationSidebar";
import { WaChatWindow } from "./inbox/WaChatWindow";
import { WaCustomerInfoPanel } from "./inbox/WaCustomerInfoPanel";
import { WaTemplateManager } from "./inbox/WaTemplateManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, LayoutTemplate, BarChart3, Megaphone } from "lucide-react";
import { WACampaignCommandCenter } from "./marketing/wa/WACampaignCommandCenter";
import { WAAnalyticsDashboard } from "./marketing/wa/WAAnalyticsDashboard";

export interface WaConversation {
  id: string;
  phone: string;
  customer_name: string | null;
  last_message: string | null;
  last_message_at: string;
  last_customer_message_at: string | null;
  window_expires_at: string | null;
  unread_count: number;
  assigned_vertical: string | null;
  assigned_user_id: string | null;
  status: string;
  is_pinned: boolean;
  tags: string[] | null;
  lead_id: string | null;
  client_id: string | null;
  human_takeover: boolean;
  human_takeover_at: string | null;
  created_at: string;
}

export interface WaMessage {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  message_type: string;
  content: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  media_filename: string | null;
  template_name: string | null;
  template_variables: Record<string, string> | null;
  wa_message_id: string | null;
  status: string;
  error_code: string | null;
  error_message: string | null;
  sent_by_name: string | null;
  read_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
}

export default function WhatsAppBusinessInbox() {
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
      console.error("Error fetching conversations:", error);
      setConversations([]);
      setSelectedConvo(null);
    } else {
      const nextConversations = ((data || []) as unknown as WaConversation[]).filter((item) => item.phone);
      setConversations(nextConversations);
      setSelectedConvo((current) => {
        if (!nextConversations.length) return null;
        if (!current) return nextConversations[0];
        return nextConversations.find((item) => item.id === current.id) || nextConversations[0];
      });
    }
    setIsLoading(false);
  }, []);

  const fetchMessages = useCallback(async (convoId: string) => {
    const { data, error } = await supabase
      .from("wa_inbox_messages")
      .select("*")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages((data || []) as unknown as WaMessage[]);
    }
  }, []);

  useEffect(() => {
    fetchConversations();

    const convoChannel = supabase
      .channel("wa-inbox-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(convoChannel); };
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedConvo) {
      setMessages([]);
      return;
    }

    fetchMessages(selectedConvo.id);

    // Mark as read
    if (selectedConvo.unread_count > 0) {
      supabase.from("wa_conversations").update({ unread_count: 0 }).eq("id", selectedConvo.id);
    }

    const msgChannel = supabase
      .channel(`wa-inbox-msgs-${selectedConvo.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "wa_inbox_messages",
        filter: `conversation_id=eq.${selectedConvo.id}`,
      }, () => {
        fetchMessages(selectedConvo.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(msgChannel); };
  }, [selectedConvo, fetchMessages]);

  const handleSendMessage = async (content: string, messageType: string = "text", extras: Record<string, unknown> = {}) => {
    if (!selectedConvo) return;

    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.functions.invoke("wa-send-inbox", {
      body: {
        conversation_id: selectedConvo.id,
        phone: selectedConvo.phone,
        message_type: messageType,
        content,
        sent_by: userData?.user?.id,
        sent_by_name: userData?.user?.email?.split("@")[0] || "Agent",
        ...extras,
      },
    });

    if (error || !data?.success) {
      const errMsg = data?.error || error?.message || "Send failed";
      if (data?.window_expired) {
        toast({ title: "24hr Window Expired", description: "Use a template message instead", variant: "destructive" });
      } else if (String(data?.meta_error_code || "") === "131026") {
        toast({
          title: "Recipient WhatsApp par reachable nahi hai",
          description: "Yeh number abhi WhatsApp par message receive nahi kar paa raha — number verify karen ya customer ko normal call/SMS karein.",
          variant: "destructive"
        });
      } else {
        toast({ title: "Failed to send", description: errMsg, variant: "destructive" });
      }
      return false;
    }

    if (data?.cost_saved) {
      toast({ title: "Message sent ✓ 💰", description: "Sent as free text (window open) — template cost saved!" });
    } else {
      toast({ title: "Message sent ✓" });
    }
    return true;
  };

  const isWindowOpen = selectedConvo?.window_expires_at
    ? new Date(selectedConvo.window_expires_at) > new Date()
    : false;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <Tabs defaultValue="inbox" className="flex-1 flex flex-col">
        <div className="border-b bg-card px-4">
          <TabsList className="h-11">
            <TabsTrigger value="inbox" className="gap-2">
              <MessageSquare className="h-4 w-4" /> Inbox
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <LayoutTemplate className="h-4 w-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="broadcasts" className="gap-2">
              <Megaphone className="h-4 w-4" /> Broadcasts
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="inbox" className="flex-1 m-0 flex overflow-hidden">
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
        </TabsContent>

        <TabsContent value="templates" className="flex-1 m-0 overflow-auto p-4">
          <WaTemplateManager />
        </TabsContent>

        <TabsContent value="broadcasts" className="flex-1 m-0 overflow-auto p-4">
          <WACampaignCommandCenter />
        </TabsContent>

        <TabsContent value="analytics" className="flex-1 m-0 overflow-auto p-4">
          <WAAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
