import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, MessageCircle, Search, Phone, Building2, User, Clock } from "lucide-react";
import { format } from "date-fns";

export default function DealerChatCenter() {
  const qc = useQueryClient();
  const [selectedDealer, setSelectedDealer] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [dealerSearch, setDealerSearch] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch dealers
  const { data: dealers = [] } = useQuery({
    queryKey: ["dealer-chat-dealers"],
    queryFn: async () => {
      const { data } = await supabase.from("dealer_companies")
        .select("id, company_name, brand_name, city, contact_phone, dealer_representatives(id, name, phone, whatsapp_number)")
        .eq("is_active", true).order("company_name");
      return data || [];
    },
  });

  // Fetch chat history for selected dealer
  const { data: chats = [] } = useQuery({
    queryKey: ["dealer-chats", selectedDealer],
    queryFn: async () => {
      if (!selectedDealer) return [];
      const { data } = await supabase.from("dealer_chat_history")
        .select("*")
        .eq("dealer_company_id", selectedDealer)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedDealer,
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedDealer || !message.trim()) return;
      const dealer = dealers.find((d: any) => d.id === selectedDealer);
      const rep = dealer?.dealer_representatives?.[0];

      // Save to chat history
      const { error } = await supabase.from("dealer_chat_history").insert({
        dealer_company_id: selectedDealer,
        dealer_rep_id: rep?.id || null,
        direction: "outbound",
        channel: "whatsapp",
        message: message.trim(),
        sender_name: "GrabYourCar Team",
        sender_phone: rep?.whatsapp_number || rep?.phone || dealer?.contact_phone || "",
        status: "sent",
      });
      if (error) throw error;

      // Open WhatsApp (API integration placeholder)
      const phone = (rep?.whatsapp_number || rep?.phone || dealer?.contact_phone || "").replace(/\D/g, "");
      if (phone) {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message.trim())}`, "_blank");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-chats", selectedDealer] });
      setMessage("");
      toast.success("Message sent & saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  const filteredDealers = dealers.filter((d: any) =>
    (d.company_name || "").toLowerCase().includes(dealerSearch.toLowerCase()) ||
    (d.brand_name || "").toLowerCase().includes(dealerSearch.toLowerCase()) ||
    (d.city || "").toLowerCase().includes(dealerSearch.toLowerCase())
  );

  const selectedDealerData = dealers.find((d: any) => d.id === selectedDealer);

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-280px)] min-h-[500px]">
      {/* Dealer List */}
      <div className="col-span-4 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Dealer Contacts
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search dealers..." value={dealerSearch} onChange={e => setDealerSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-0.5 p-2">
                {filteredDealers.map((d: any) => {
                  const repCount = d.dealer_representatives?.length || 0;
                  const isSelected = d.id === selectedDealer;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDealer(d.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {(d.company_name || "D")[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{d.company_name}</p>
                          <div className="flex gap-1 items-center">
                            {d.brand_name && <Badge variant="outline" className="text-[8px] h-3.5 px-1">{d.brand_name}</Badge>}
                            <span className="text-[10px] text-muted-foreground">{d.city || ""}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[8px] h-4">{repCount} rep{repCount !== 1 ? "s" : ""}</Badge>
                      </div>
                    </button>
                  );
                })}
                {filteredDealers.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-6">No dealers found</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Chat Window */}
      <div className="col-span-8 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {selectedDealer ? (
            <>
              {/* Header */}
              <CardHeader className="pb-2 flex-shrink-0 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {(selectedDealerData?.company_name || "D")[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{selectedDealerData?.company_name}</p>
                      <div className="flex gap-2 items-center">
                        {selectedDealerData?.brand_name && <Badge variant="outline" className="text-[9px]">{selectedDealerData.brand_name}</Badge>}
                        {selectedDealerData?.city && <span className="text-xs text-muted-foreground">{selectedDealerData.city}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedDealerData?.contact_phone && (
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => window.open(`tel:${selectedDealerData.contact_phone}`)}>
                        <Phone className="h-3 w-3" /> Call
                      </Button>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp (API: Later)
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  {chats.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      <div className="text-center">
                        <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No chat history with this dealer</p>
                        <p className="text-xs mt-1">Send a message to start the conversation</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chats.map((c: any) => (
                        <div key={c.id} className={`flex ${c.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] rounded-xl px-4 py-2.5 ${c.direction === "outbound" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                            <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                            <div className={`flex items-center gap-2 mt-1 ${c.direction === "outbound" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              <Clock className="h-2.5 w-2.5" />
                              <span className="text-[10px]">{format(new Date(c.created_at), "dd MMM, hh:mm a")}</span>
                              {c.sender_name && <span className="text-[10px]">· {c.sender_name}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              {/* Input */}
              <div className="p-3 border-t flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && message.trim() && sendMessage.mutate()}
                    className="flex-1"
                  />
                  <Button onClick={() => sendMessage.mutate()} disabled={!message.trim() || sendMessage.isPending} className="gap-1">
                    <Send className="h-4 w-4" /> Send
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  💡 Messages are saved to chat history. WhatsApp API integration coming soon — currently opens wa.me link.
                </p>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select a dealer to start chatting</p>
                <p className="text-sm mt-1">All conversations are saved for future reference</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
