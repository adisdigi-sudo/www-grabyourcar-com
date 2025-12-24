import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, GitCompare, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { cars } from "@/data/carsData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/car-advisor`;

const DEFAULT_MESSAGE: Message = {
  role: "assistant",
  content: "Hi! I'm your car advisor. Tell me about your needs - budget, family size, city or highway driving - and I'll help you find the perfect car! 🚗",
};

// Detect which cars are mentioned in a message
const detectMentionedCars = (content: string) => {
  const lowerContent = content.toLowerCase();
  return cars.filter((car) => {
    const carName = car.name.toLowerCase();
    const brandName = car.brand.toLowerCase();
    return (
      lowerContent.includes(carName) ||
      (lowerContent.includes(brandName) && lowerContent.includes(carName.split(" ")[1]?.toLowerCase() || ""))
    );
  });
};

// Car card component
const CarCard = ({ car }: { car: typeof cars[0] }) => (
  <Link
    to={`/car/${car.slug}`}
    className="flex items-center gap-3 p-2 rounded-lg bg-background/50 hover:bg-background/80 border border-border/50 transition-colors group"
  >
    <img
      src={car.image}
      alt={car.name}
      className="w-16 h-12 object-cover rounded-md"
    />
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm text-foreground group-hover:text-primary truncate">
        {car.name}
      </p>
      <p className="text-xs text-muted-foreground">{car.price}</p>
    </div>
    <span className="text-xs text-primary font-medium">View →</span>
  </Link>
);

export const CarAdvisorChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([DEFAULT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  // Load conversation when chat opens and user is logged in
  const loadConversation = useCallback(async () => {
    if (!user || hasLoadedRef.current) return;
    
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("id, messages")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading conversation:", error);
        return;
      }

      if (data) {
        setConversationId(data.id);
        const savedMessages = data.messages as Message[];
        if (savedMessages && savedMessages.length > 0) {
          setMessages(savedMessages);
        }
      }
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("Error loading conversation:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user && !hasLoadedRef.current) {
      loadConversation();
    }
  }, [isOpen, user, loadConversation]);

  // Reset loaded state when user changes
  useEffect(() => {
    hasLoadedRef.current = false;
    setConversationId(null);
    setMessages([DEFAULT_MESSAGE]);
  }, [user?.id]);

  // Save conversation to database
  const saveConversation = useCallback(async (newMessages: Message[]) => {
    if (!user) return;

    try {
      if (conversationId) {
        // Update existing conversation
        await supabase
          .from("chat_conversations")
          .update({ messages: JSON.parse(JSON.stringify(newMessages)) })
          .eq("id", conversationId);
      } else {
        // Create new conversation
        const { data, error } = await supabase
          .from("chat_conversations")
          .insert({
            user_id: user.id,
            messages: JSON.parse(JSON.stringify(newMessages)),
          })
          .select("id")
          .single();

        if (!error && data) {
          setConversationId(data.id);
        }
      }
    } catch (err) {
      console.error("Error saving conversation:", err);
    }
  }, [user, conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    let finalMessages = newMessages;

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length > newMessages.length) {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev.slice(0, newMessages.length), { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Save final messages after streaming completes
      finalMessages = [...newMessages, { role: "assistant" as const, content: assistantContent }];
      saveConversation(finalMessages);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = { role: "assistant", content: "Sorry, I encountered an error. Please try again." };
      setMessages((prev) => [...prev, errorMessage]);
      finalMessages = [...newMessages, errorMessage];
      saveConversation(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = async () => {
    setMessages([DEFAULT_MESSAGE]);
    setConversationId(null);
    
    if (user) {
      // Create new conversation in DB
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          user_id: user.id,
          messages: JSON.parse(JSON.stringify([DEFAULT_MESSAGE])),
        })
        .select("id")
        .single();

      if (!error && data) {
        setConversationId(data.id);
      }
    }
    
    toast({ title: "New conversation started" });
  };

  const clearHistory = async () => {
    if (!user || !conversationId) return;
    
    await supabase
      .from("chat_conversations")
      .delete()
      .eq("id", conversationId);
    
    setMessages([DEFAULT_MESSAGE]);
    setConversationId(null);
    toast({ title: "Chat history cleared" });
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "transition-transform hover:scale-105"
        )}
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] rounded-2xl border bg-card shadow-2xl animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 rounded-t-2xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary-foreground">Car Advisor</h3>
              <p className="text-xs text-primary-foreground/80">
                {user ? "Chat history saved" : "Sign in to save history"}
              </p>
            </div>
            {user && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={startNewConversation}
                  title="New conversation"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={clearHistory}
                  title="Clear history"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-muted-foreground">Loading chat history...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const mentionedCars = message.role === "assistant" ? detectMentionedCars(message.content) : [];
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div
                        className={cn(
                          "flex gap-2",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {message.role === "assistant" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          )}
                        >
                          {message.content}
                        </div>
                        {message.role === "user" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                            <User className="h-4 w-4 text-secondary-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Car Cards */}
                      {mentionedCars.length > 0 && (
                        <div className="ml-10 space-y-2">
                          {mentionedCars.map((car) => (
                            <CarCard key={car.id} car={car} />
                          ))}
                          
                          {/* Compare Button */}
                          {mentionedCars.length >= 2 && (
                            <Link
                              to="/compare"
                              state={{ preselectedCars: mentionedCars.slice(0, 3).map(c => c.id) }}
                              className="flex items-center justify-center gap-2 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors text-primary font-medium text-sm"
                            >
                              <GitCompare className="h-4 w-4" />
                              Compare these {mentionedCars.length > 3 ? 3 : mentionedCars.length} cars
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
