import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export type Channel = "whatsapp" | "email" | "instagram" | "messenger" | "voip";
export type ConversationStatus = "open" | "assigned" | "resolved" | "closed";

export interface OmniConversation {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  channel: Channel;
  status: ConversationStatus;
  assigned_to: string | null;
  subject: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  tags: string[];
  unread_count: number;
  created_at: string;
}

export interface OmniMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  direction: "inbound" | "outbound";
  content: string;
  content_type: string;
  attachments: any[];
  read_at: string | null;
  created_at: string;
}

export function useOmniConversations(channelFilter?: Channel | "all", statusFilter?: ConversationStatus | "all") {
  return useQuery({
    queryKey: ["omni-conversations", channelFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("omni_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (channelFilter && channelFilter !== "all") query = query.eq("channel", channelFilter);
      if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as OmniConversation[];
    },
  });
}

export function useOmniMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["omni-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("omni_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as OmniMessage[];
    },
    enabled: !!conversationId,
  });
}

export function useSendOmniMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const { data, error } = await supabase
        .from("omni_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user?.id,
          direction: "outbound",
          content,
          content_type: "text",
        })
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from("omni_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: content.substring(0, 100),
        })
        .eq("id", conversationId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["omni-messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["omni-conversations"] });
    },
  });
}

export function useRealtimeOmniMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`omni-messages-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "omni_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["omni-messages", conversationId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);
}

export function useRealtimeOmniConversations() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("omni-conversations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "omni_conversations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["omni-conversations"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
}
