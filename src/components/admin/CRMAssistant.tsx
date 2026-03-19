import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, Minimize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "📊 How many leads this week?",
  "🔥 Show hot leads needing attention",
  "💰 Sales performance summary",
  "⏰ Stale leads needing follow-up",
  "📱 Draft follow-up WhatsApp message",
  "📈 Top performing lead sources",
];

export function CRMAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your **CRM AI Assistant** 🤖\n\nI can help with:\n- 📊 Lead analytics & data queries\n- 📱 Draft WhatsApp follow-up messages\n- 🔥 Find stale leads needing attention\n- 💰 Sales performance insights\n- 📈 Pipeline forecasting\n\nAsk me anything about your CRM data!" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const query = text || input.trim();
    if (!query || isLoading) return;

    const userMsg: Message = { role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to use CRM Assistant");
        return;
      }

      // Send conversation history for multi-turn context
      const conversationHistory = messages.filter(m => m.role === "user" || m.role === "assistant").slice(-10);

      const { data, error } = await supabase.functions.invoke("crm-ai-assistant", {
        body: { query, conversation_history: conversationHistory },
      });

      if (error) throw error;

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.response || data.error || "No response" },
      ]);
    } catch (e: any) {
      const errMsg = e?.message || "Failed to get response";
      if (errMsg.includes("429")) toast.error("Rate limited — please wait a moment");
      else if (errMsg.includes("402")) toast.error("AI credits exhausted");
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${errMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([{
      role: "assistant",
      content: "Fresh start! 🔄 How can I help you with your CRM data?",
    }]);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 z-50 h-14 w-14 rounded-full shadow-xl bg-gradient-to-br from-primary to-primary/80 hover:scale-105 transition-transform"
        size="icon"
      >
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-24 z-50 bg-card border rounded-full px-4 py-2 shadow-xl cursor-pointer flex items-center gap-2 hover:shadow-2xl transition-shadow"
      >
        <Bot className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">CRM Assistant</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-24 z-50 w-[420px] h-[540px] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-primary/5 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <div>
            <span className="font-semibold text-sm">CRM AI Assistant</span>
            <span className="text-[10px] ml-2 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">v2</span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetChat} title="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(true)}>
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[88%] rounded-xl px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_a]:text-primary">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-xl px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                <span className="animate-spin h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full" />
                Analyzing CRM data...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick prompts */}
      {messages.length <= 2 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1 shrink-0">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-full px-2.5 py-1 transition-colors font-medium"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t flex gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask anything about your CRM data..."
          className="text-sm"
          disabled={isLoading}
        />
        <Button size="icon" onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
