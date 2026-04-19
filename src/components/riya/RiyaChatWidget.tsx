import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, Loader2, Minus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface RiyaChatWidgetProps {
  variant?: "floating" | "embedded";
  className?: string;
  initialOpen?: boolean;
  greeting?: string;
}

const DEFAULT_GREETING = `Hi! I'm **Riya** from **GrabYourCar** 👋

Main aapki kaise help kar sakti hoon? Cars, insurance, loans, HSRP, rentals — sab ki info de sakti hoon. Brochure bhi WhatsApp pe bhej dungi 🚗`;

export const RiyaChatWidget = ({
  variant = "floating",
  className,
  initialOpen = false,
  greeting = DEFAULT_GREETING,
}: RiyaChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `riya_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("riya-chat", {
        body: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          sessionId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const reply = data?.message || "Sorry, kuch issue hua. Phir se try karein?";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("[Riya] error:", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Oops, network issue ho raha hai. Aap direct WhatsApp kar sakte hain: [Click here](https://wa.me/919855924442) 📞`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const ChatBody = (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center font-bold text-base">
            R
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight">Riya</div>
          <div className="text-xs opacity-90 leading-tight">GrabYourCar Assistant • Online</div>
        </div>
        <Badge variant="secondary" className="text-[10px] h-5">AI</Badge>
        {variant === "floating" && (
          <>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors p-1"
              aria-label="Minimize"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors p-1"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3" ref={scrollRef}>
        <div className="space-y-3 py-4">
          {messages.map((m, idx) => (
            <div key={idx} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_a]:text-primary [&_a]:underline">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Riya typing...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-background">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Apna sawaal likhein..."
            disabled={loading}
            className="flex-1"
            maxLength={500}
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Powered by Riya AI • GrabYourCar
        </p>
      </div>
    </div>
  );

  if (variant === "embedded") {
    return (
      <Card className={cn("flex flex-col h-[600px] overflow-hidden", className)}>
        {ChatBody}
      </Card>
    );
  }

  // Floating
  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-40",
            "w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
            "shadow-2xl hover:shadow-primary/40 hover:scale-110 transition-all",
            "flex items-center justify-center group"
          )}
          aria-label="Open Riya chat"
        >
          <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-background animate-pulse" />
          <span className="absolute right-full mr-3 whitespace-nowrap bg-foreground text-background text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Chat with Riya
          </span>
        </button>
      )}

      {isOpen && (
        <div
          className={cn(
            "fixed z-50 bg-background border rounded-2xl shadow-2xl overflow-hidden",
            "bottom-4 right-4 left-4 top-20",
            "sm:bottom-6 sm:right-6 sm:left-auto sm:top-auto sm:w-[400px] sm:h-[600px]"
          )}
        >
          {ChatBody}
        </div>
      )}
    </>
  );
};

export default RiyaChatWidget;
