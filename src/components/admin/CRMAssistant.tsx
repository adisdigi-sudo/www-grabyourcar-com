import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, Sparkles, Minimize2, RotateCcw, Brain, Zap, Target, TrendingUp, AlertTriangle, ShoppingCart, Users, DollarSign, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

type Message = { role: "user" | "assistant"; content: string };

interface CRMAssistantProps {
  userRole?: string;
  userName?: string;
  userVertical?: string;
}

const COFOUNDER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-cofounder`;

const ADMIN_QUICK_ACTIONS = [
  { icon: Zap, label: "What should I do now?", prompt: "What should I focus on RIGHT NOW to maximize revenue today?" },
  { icon: Target, label: "Today's targets", prompt: "Show me today's target status for all team members with specific actions to close gaps" },
  { icon: TrendingUp, label: "Revenue boost", prompt: "Give me 5 immediate revenue-boosting actions I can take in the next 2 hours" },
  { icon: AlertTriangle, label: "Risk alerts", prompt: "What are the top risks right now? Flag anything critical with urgency" },
  { icon: ShoppingCart, label: "Cross-sell now", prompt: "Which customers can I cross-sell to RIGHT NOW? Give names, phones, and what to pitch" },
  { icon: DollarSign, label: "Cash position", prompt: "What's our cash position, runway, and what payments are pending collection?" },
  { icon: Users, label: "Team status", prompt: "How is each team member performing? Who needs coaching or push?" },
  { icon: Lightbulb, label: "New ideas", prompt: "Suggest 3 creative ideas to grow revenue this week that we haven't tried" },
];

export function CRMAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [convId, setConvId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  // Load persistent conversation
  useEffect(() => {
    if (!isOpen || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const { data } = await supabase
        .from("ai_cofounder_conversations")
        .select("id, messages")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages as Message[]);
        setConvId(data.id);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamContent]);

  const saveConversation = useCallback(async (msgs: Message[]) => {
    const payload = JSON.parse(JSON.stringify(msgs));
    if (convId) {
      await supabase.from("ai_cofounder_conversations")
        .update({ messages: payload, updated_at: new Date().toISOString() })
        .eq("id", convId);
    } else {
      const { data } = await supabase.from("ai_cofounder_conversations")
        .insert({ user_id: "system", messages: payload })
        .select("id").single();
      if (data) setConvId(data.id);
    }
  }, [convId]);

  const sendMessage = async (text?: string) => {
    const query = text || input.trim();
    if (!query || isLoading) return;

    const userMsg: Message = { role: "user", content: query };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setStreamContent("");

    try {
      const resp = await fetch(COFOUNDER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: "quick_insight", question: query }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try {
            const t = JSON.parse(j).choices?.[0]?.delta?.content;
            if (t) { acc += t; setStreamContent(acc); }
          } catch {}
        }
      }

      const assistantMsg: Message = { role: "assistant", content: acc || "No response" };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setStreamContent("");
      saveConversation(finalMessages);
    } catch (e: any) {
      const errMsg = e?.message || "Failed to get response";
      if (errMsg.includes("429")) toast.error("Rate limited — please wait");
      else if (errMsg.includes("402")) toast.error("AI credits exhausted");
      const errMessage: Message = { role: "assistant", content: `❌ ${errMsg}` };
      setMessages(prev => [...prev, errMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = async () => {
    setMessages([]);
    setStreamContent("");
    setConvId(null);
    loadedRef.current = false;
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 hover:scale-110 transition-all duration-200 border-2 border-white/20"
          size="icon"
        >
          <Brain className="h-6 w-6 text-white" />
        </Button>
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white" />
        </span>
      </motion.div>
    );
  }

  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full px-5 py-2.5 shadow-xl cursor-pointer flex items-center gap-2 hover:shadow-2xl transition-shadow text-white"
      >
        <Brain className="h-4 w-4" />
        <span className="text-sm font-semibold">AI Co-Founder</span>
        <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="fixed bottom-6 right-6 z-50 w-[440px] h-[600px] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-violet-600/10 to-indigo-600/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm">AI Co-Founder</span>
              <Badge variant="secondary" className="ml-2 text-[9px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                24/7 LIVE
              </Badge>
            </div>
          </div>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetChat} title="New conversation">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(true)}>
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3" ref={scrollRef}>
          <div className="space-y-3">
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-4 space-y-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-600/10 to-indigo-600/10 inline-block">
                  <Brain className="h-8 w-8 text-violet-600" />
                </div>
                <div>
                  <p className="font-bold text-sm">Your AI Co-Founder</p>
                  <p className="text-xs text-muted-foreground mt-1">24/7 revenue engine, sales director, risk radar & team coach</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-2">
                  {QUICK_ACTIONS.map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => sendMessage(qa.prompt)}
                      className="flex items-center gap-1.5 text-left text-[11px] bg-muted/60 hover:bg-muted rounded-lg px-2.5 py-2 transition-colors group"
                    >
                      <qa.icon className="h-3.5 w-3.5 text-violet-600 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="font-medium">{qa.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[90%] rounded-xl px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                    : "bg-muted text-foreground"
                )}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_a]:text-primary [&_li]:my-0.5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {isLoading && streamContent && (
              <div className="flex justify-start">
                <div className="max-w-[90%] bg-muted rounded-xl px-3 py-2 text-sm">
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&_li]:my-0.5">
                    <ReactMarkdown>{streamContent}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {isLoading && !streamContent && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full" />
                  Analyzing your business data...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick actions when mid-conversation */}
        {messages.length > 0 && messages.length < 6 && !isLoading && (
          <div className="px-3 pb-1 flex flex-wrap gap-1 shrink-0">
            {QUICK_ACTIONS.slice(0, 4).map((qa) => (
              <button
                key={qa.label}
                onClick={() => sendMessage(qa.prompt)}
                className="text-[10px] bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/50 text-violet-700 dark:text-violet-300 rounded-full px-2 py-0.5 transition-colors font-medium"
              >
                {qa.label}
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
            placeholder="Ask your Co-Founder anything..."
            className="text-sm border-violet-200 dark:border-violet-800 focus-visible:ring-violet-500"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
