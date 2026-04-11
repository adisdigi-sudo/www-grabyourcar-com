import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Search, ArrowLeft, MessageSquare, Mail, Instagram, Phone, MessagesSquare,
  Send, Paperclip, Smile, Users, LayoutTemplate, Workflow, Bot, BarChart3,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  useOmniConversations, useOmniMessages, useSendOmniMessage,
  useRealtimeOmniMessages, useRealtimeOmniConversations,
  type Channel, type ConversationStatus, type OmniConversation, type OmniMessage,
} from "@/hooks/useOmniInbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { WaTemplateManager } from "@/components/admin/inbox/WaTemplateManager";
import { WaContactManager } from "@/components/admin/inbox/WaContactManager";
import { WaFlowBuilder } from "@/components/admin/inbox/WaFlowBuilder";
import { WaChatbotBuilder } from "@/components/admin/inbox/WaChatbotBuilder";
import { WaInboxAnalytics } from "@/components/admin/inbox/WaInboxAnalytics";

const channelIcons: Record<Channel, any> = {
  whatsapp: MessageSquare, email: Mail, instagram: Instagram, messenger: MessageSquare, voip: Phone,
};
const channelColors: Record<Channel, string> = {
  whatsapp: "text-green-500", email: "text-blue-500", instagram: "text-pink-500", messenger: "text-indigo-500", voip: "text-orange-500",
};
const channels: { id: Channel | "all"; label: string; icon: any }[] = [
  { id: "all", label: "All Channels", icon: MessagesSquare },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "email", label: "Email", icon: Mail },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "messenger", label: "Messenger", icon: MessageSquare },
  { id: "voip", label: "VoIP", icon: Phone },
];
const statuses = [
  { id: "all" as const, label: "All" },
  { id: "open" as const, label: "Open" },
  { id: "assigned" as const, label: "Assigned" },
  { id: "resolved" as const, label: "Resolved" },
  { id: "closed" as const, label: "Closed" },
];

export const OmniInboxPage = () => {
  const [selectedChannel, setSelectedChannel] = useState<Channel | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<ConversationStatus | "all">("all");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [input, setInput] = useState("");
  const isMobile = useIsMobile();

  const { data: conversations = [], isLoading: convsLoading } = useOmniConversations(selectedChannel, selectedStatus);
  const { data: messages = [], isLoading: msgsLoading } = useOmniMessages(selectedConversationId);
  const sendMessage = useSendOmniMessage();

  useRealtimeOmniConversations();
  useRealtimeOmniMessages(selectedConversationId);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null;

  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        c.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const showThread = isMobile && selectedConversationId;
  const showList = !isMobile || !selectedConversationId;

  const handleSend = () => {
    if (!input.trim() || !selectedConversationId) return;
    sendMessage.mutate({ conversationId: selectedConversationId, content: input.trim() });
    setInput("");
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col -mx-4">
      <Tabs defaultValue="inbox" className="flex-1 flex flex-col min-h-0">
        <div className="border-b bg-card px-4 shrink-0">
          <TabsList className="h-11 flex-wrap">
            <TabsTrigger value="inbox" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" /> Inbox
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" /> Contacts
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5 text-xs sm:text-sm">
              <LayoutTemplate className="h-4 w-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="flows" className="gap-1.5 text-xs sm:text-sm">
              <Workflow className="h-4 w-4" /> Flows
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="gap-1.5 text-xs sm:text-sm">
              <Bot className="h-4 w-4" /> Chatbot
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── Inbox Tab ─── */}
        <TabsContent value="inbox" className="flex-1 m-0 flex overflow-hidden">
          <div className="flex w-full h-full overflow-hidden rounded-lg border bg-background">
            {/* Left: Channel filters */}
            <div className="w-48 border-r bg-card p-3 flex-shrink-0 hidden lg:block overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Channels</h3>
                  <div className="space-y-0.5">
                    {channels.map((ch) => (
                      <button key={ch.id} onClick={() => setSelectedChannel(ch.id)} className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        selectedChannel === ch.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}>
                        <ch.icon className="h-4 w-4" /><span>{ch.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Status</h3>
                  <div className="space-y-0.5">
                    {statuses.map((s) => (
                      <button key={s.id} onClick={() => setSelectedStatus(s.id)} className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        selectedStatus === s.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Middle: Conversation list */}
            {showList && (
              <div className={`${isMobile ? "w-full" : "w-80"} border-r bg-card flex flex-col flex-shrink-0`}>
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {convsLoading ? (
                    <div className="space-y-2 p-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">No conversations yet</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5 p-1">
                      {filteredConversations.map((conv) => {
                        const Icon = channelIcons[conv.channel as Channel] || MessageSquare;
                        const initials = conv.contact_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";
                        return (
                          <button key={conv.id} onClick={() => setSelectedConversationId(conv.id)} className={cn(
                            "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                            selectedConversationId === conv.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"
                          )}>
                            <Avatar className="h-9 w-9 flex-shrink-0 mt-0.5"><AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback></Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium truncate">{conv.contact_name || "Unknown"}</span>
                                <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Icon className={cn("h-3 w-3 flex-shrink-0", channelColors[conv.channel as Channel])} />
                                <p className="text-xs text-muted-foreground truncate">{conv.last_message_preview || "No messages"}</p>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Badge variant={conv.status === "open" ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">{conv.status}</Badge>
                                {conv.unread_count > 0 && (
                                  <span className="bg-primary text-primary-foreground text-[10px] rounded-full h-4 min-w-4 flex items-center justify-center px-1">{conv.unread_count}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Right: Message thread */}
            {(!isMobile || showThread) && (
              <div className="flex-1 flex flex-col min-w-0">
                {isMobile && selectedConversationId && (
                  <div className="p-2 border-b bg-card">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedConversationId(null)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
                  </div>
                )}
                {!selectedConversation ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/20">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-primary/40" />
                    </div>
                    <h3 className="text-lg font-semibold">Select a conversation</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">Choose a conversation from the list to view messages and reply.</p>
                  </div>
                ) : (
                  <>
                    <div className="h-14 flex items-center gap-3 px-4 border-b bg-card flex-shrink-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{selectedConversation.contact_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{selectedConversation.contact_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{selectedConversation.channel} · {selectedConversation.status}</p>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {msgsLoading ? (
                        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}><div className="h-10 w-48 bg-muted animate-pulse rounded-xl" /></div>)}</div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-8">No messages yet. Send the first message!</div>
                      ) : (
                        messages.map((msg) => {
                          const isOutbound = msg.direction === "outbound";
                          return (
                            <div key={msg.id} className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
                              <div className={cn("max-w-[70%] rounded-2xl px-4 py-2.5", isOutbound ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md")}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p className={cn("text-[10px] mt-1", isOutbound ? "text-primary-foreground/60" : "text-muted-foreground")}>{format(new Date(msg.created_at), "HH:mm")}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="border-t p-3 bg-card flex-shrink-0">
                      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 text-muted-foreground"><Paperclip className="h-4 w-4" /></Button>
                        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className="flex-1" disabled={sendMessage.isPending} />
                        <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 text-muted-foreground"><Smile className="h-4 w-4" /></Button>
                        <Button type="submit" size="icon" disabled={!input.trim() || sendMessage.isPending} className="flex-shrink-0"><Send className="h-4 w-4" /></Button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Other Tabs ─── */}
        <TabsContent value="contacts" className="flex-1 m-0 overflow-auto p-4">
          <WaContactManager />
        </TabsContent>
        <TabsContent value="templates" className="flex-1 m-0 overflow-auto p-4">
          <WaTemplateManager />
        </TabsContent>
        <TabsContent value="flows" className="flex-1 m-0 overflow-auto p-4">
          <WaFlowBuilder />
        </TabsContent>
        <TabsContent value="chatbot" className="flex-1 m-0 overflow-auto p-4">
          <WaChatbotBuilder />
        </TabsContent>
        <TabsContent value="analytics" className="flex-1 m-0 overflow-auto p-4">
          <WaInboxAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};
