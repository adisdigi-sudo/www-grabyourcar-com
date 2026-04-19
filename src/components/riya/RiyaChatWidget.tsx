import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { X, Send, Loader2, Minus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import riyaAvatar from "@/assets/riya-avatar.png";

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

const AGENT_NAMES = [
  "Prabhjeet", "Anshdeep", "Isha", "Rahul", "Gaurav",
  "Karan", "Pratham", "Simran", "Aditya", "Neha",
  "Manpreet", "Riya", "Arjun", "Pooja", "Harshit",
  "Sneha", "Vikram", "Tanya", "Rohan", "Meera",
];

const pickAgent = () => AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];

const buildGreeting = (name: string) =>
  `Hi! I'm **${name}** from **GrabYourCar** 👋\n\nKaise help kar sakta hoon? Cars, insurance, loans, HSRP, rentals — sab ki info de dunga 🚗`;

export const RiyaChatWidget = ({
  variant = "floating",
  className,
  initialOpen = false,
  greeting,
}: RiyaChatWidgetProps) => {
  const [agentName] = useState(() => pickAgent());
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: greeting || buildGreeting(agentName) },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `gyc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
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
          agentName,
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
          content: `Network issue lag raha hai 😕 Direct WhatsApp karein: [Click here](https://wa.me/919855924442) 📞`,
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
          <img
            src={riyaAvatar}
            alt="Riya - GrabYourCar Assistant"
            loading="lazy"
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover border-2 border-primary-foreground/40 bg-background"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight">{agentName}</div>
          <div className="text-xs opacity-90 leading-tight">GrabYourCar Assistant • Online</div>
        </div>
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
          GrabYourCar
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
            "w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 p-0.5",
            "shadow-2xl hover:shadow-primary/40 hover:scale-110 transition-all group"
          )}
          aria-label="Open Riya chat"
        >
          <img
            src={riyaAvatar}
            alt="Chat with Riya from GrabYourCar"
            loading="lazy"
            width={64}
            height={64}
            className="w-full h-full rounded-full object-cover bg-background"
          />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-400 border-2 border-background animate-pulse" />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-foreground text-background text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
