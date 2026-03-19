import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MessageSquare, Bot, User, HandMetal, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function WALiveConversations() {
  const queryClient = useQueryClient();
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ["wa-live-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("*")
        .eq("status", "active")
        .order("last_message_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const toggleTakeover = useMutation({
    mutationFn: async ({ id, human_takeover }: { id: string; human_takeover: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ human_takeover: !human_takeover })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-live-conversations"] });
      toast.success("Takeover toggled");
    },
  });

  const selected = conversations.find((c: any) => c.id === selectedConvo);
  const selectedMessages = (selected?.messages as any[]) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Conversation List */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Live Conversations</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[520px]">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No active conversations</p>
            ) : (
              conversations.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedConvo(c.id)}
                  className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedConvo === c.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{c.customer_name || c.phone_number}</span>
                    <div className="flex gap-1">
                      {c.human_takeover ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5">Manual</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5">AI</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {c.phone_number}
                    </span>
                    {c.last_message_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {c.intent_detected && (
                    <Badge variant="outline" className="text-[10px] mt-1">{c.intent_detected}</Badge>
                  )}
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat View */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          {selected ? (
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">{selected.customer_name || selected.phone_number}</CardTitle>
                <p className="text-xs text-muted-foreground">{selected.phone_number}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Human Takeover</span>
                <Switch
                  checked={selected.human_takeover || false}
                  onCheckedChange={() => toggleTakeover.mutate({
                    id: selected.id,
                    human_takeover: selected.human_takeover || false,
                  })}
                />
              </div>
            </div>
          ) : (
            <CardTitle className="text-sm text-muted-foreground">Select a conversation</CardTitle>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[520px] p-4">
            {selectedMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">
                  {selected ? "No messages yet" : "Select a conversation to view messages"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedMessages.map((msg: any, i: number) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      <div className="flex items-center gap-1 mb-0.5">
                        {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                        <span className="text-[10px] opacity-70">{msg.role === "user" ? "Customer" : "AI Bot"}</span>
                      </div>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
