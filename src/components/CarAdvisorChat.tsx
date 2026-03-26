import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, RotateCcw, Trash2, Zap } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-brain`;

const DEFAULT_MESSAGE: Message = {
  role: "assistant",
  content: "Hi! I'm your **Car Advisor** 🚗\n\nI can help you:\n- 🔍 Find the perfect car\n- 💰 Calculate EMI & loan options\n- 📋 Get on-road prices for your city\n- 🏪 Locate nearest dealers\n\nWhat are you looking for today?",
};

const QUICK_ACTIONS = [
  { label: "🔍 Find a Car", prompt: "Help me find a car within my budget" },
  { label: "💰 Calculate EMI", prompt: "Calculate EMI for a car loan of 10 lakhs" },
  { label: "📊 Compare Cars", prompt: "Compare Hyundai Creta vs Kia Seltos" },
  { label: "🏷️ Best Offers", prompt: "What are the best car deals and discounts right now?" },
];

export const CarAdvisorChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([DEFAULT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

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

      if (error && error.code !== "PGRST116") return;
      if (data) {
        setConversationId(data.id);
        const saved = data.messages as Message[];
        if (saved?.length > 0) setMessages(saved);
      }
      hasLoadedRef.current = true;
    } catch { /* ignore */ } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user && !hasLoadedRef.current) loadConversation();
  }, [isOpen, user, loadConversation]);

  useEffect(() => {
    hasLoadedRef.current = false;
    setConversationId(null);
    setMessages([DEFAULT_MESSAGE]);
  }, [user?.id]);

  const saveConversation = useCallback(async (newMessages: Message[]) => {
    if (!user) return;
    try {
      if (conversationId) {
        await supabase.from("chat_conversations").update({ messages: JSON.parse(JSON.stringify(newMessages)) }).eq("id", conversationId);
      } else {
        const { data } = await supabase.from("chat_conversations").insert({ user_id: user.id, messages: JSON.parse(JSON.stringify(newMessages)) }).select("id").single();
        if (data) setConversationId(data.id);
      }
    } catch { /* ignore */ }
  }, [user, conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const userText = text || input.trim();
    if (!userText || isLoading) return;

    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to use the car advisor chat.", variant: "destructive" });
      return;
    }

    const userMessage: Message = { role: "user", content: userText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Authentication required");

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          channel: "website",
          stream: true,
          page_context: location.pathname,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) { toast({ title: "Please wait", description: "Too many requests. Try again in a moment.", variant: "destructive" }); throw new Error("Rate limited"); }
        if (response.status === 402) { toast({ title: "Service unavailable", description: "AI service temporarily unavailable.", variant: "destructive" }); throw new Error("Credits exhausted"); }
        throw new Error("Failed to get response");
      }

      if (!response.body) throw new Error("No response body");

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
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length > newMessages.length) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
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

      // Flush remaining buffer
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) assistantContent += content;
          } catch { /* ignore */ }
        }
        if (assistantContent) {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
            }
            return [...prev, { role: "assistant", content: assistantContent }];
          });
        }
      }

      const finalMessages = [...newMessages, { role: "assistant" as const, content: assistantContent || "I'm here to help!" }];
      saveConversation(finalMessages);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = { role: "assistant", content: "Sorry, I encountered an error. Please try again. 🔄" };
      setMessages(prev => [...prev, errorMessage]);
      saveConversation([...newMessages, errorMessage]);
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
      const { data } = await supabase.from("chat_conversations").insert({ user_id: user.id, messages: JSON.parse(JSON.stringify([DEFAULT_MESSAGE])) }).select("id").single();
      if (data) setConversationId(data.id);
    }
    toast({ title: "New conversation started" });
  };

  const clearHistory = async () => {
    if (!user || !conversationId) return;
    await supabase.from("chat_conversations").delete().eq("id", conversationId);
    setMessages([DEFAULT_MESSAGE]);
    setConversationId(null);
    toast({ title: "Chat history cleared" });
  };

  const showQuickActions = messages.length <= 2 && !isLoading;

  return (
    <>
      {/* Chat Toggle */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "transition-all hover:scale-105",
          isOpen && "rotate-90"
        )}
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] rounded-2xl border bg-card shadow-2xl animate-in slide-in-from-bottom-4 flex flex-col" style={{ height: "min(520px, calc(100vh - 8rem))" }}>
          {/* Header */}
          <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 rounded-t-2xl shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary-foreground flex items-center gap-1.5">
                Car Advisor <Zap className="h-3.5 w-3.5 text-yellow-300" />
              </h3>
              <p className="text-xs text-primary-foreground/70">
                {user ? "AI-powered • Chat history saved" : "Sign in to save history"}
              </p>
            </div>
            {user && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={startNewConversation} title="New conversation">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={clearHistory} title="Clear history">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-muted-foreground animate-pulse">Loading chat history...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={cn("flex gap-2", message.role === "user" ? "justify-end" : "justify-start")}>
                    {message.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                        <Bot className="h-4 w-4 text-foreground" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}>
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&_a]:text-primary [&_a]:underline">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : message.content}
                    </div>
                    {message.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary mt-1">
                        <User className="h-4 w-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                      <div className="flex gap-1.5 items-center">
                        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Quick Actions */}
          {showQuickActions && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.prompt)}
                  className="text-xs bg-primary/10 hover:bg-primary/20 text-foreground rounded-full px-3 py-1.5 transition-colors font-medium"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t p-3 shrink-0">
            {!user ? (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground mb-2">Sign in to chat with our AI car advisor</p>
                <Link to="/auth">
                  <Button size="sm">Sign In</Button>
                </Link>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about cars, prices, EMI..."
                  disabled={isLoading}
                  className="flex-1 text-sm"
                />
                <Button onClick={() => sendMessage()} disabled={!input.trim() || isLoading} size="icon" className="shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
