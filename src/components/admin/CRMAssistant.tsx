import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, Sparkles, Minimize2, RotateCcw, Brain, Zap, Target, TrendingUp, AlertTriangle, ShoppingCart, Users, DollarSign, Lightbulb, FileSpreadsheet, Lock, Phone, Shield, Upload, Search, Megaphone, Car, ClipboardCheck } from "lucide-react";
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

// ===== SUPER ADMIN ONLY — FULL FOUNDER ROOM =====
const ADMIN_QUICK_ACTIONS = [
  { icon: Zap, label: "What to do now?", prompt: "What should I focus on RIGHT NOW? Show exact data from database with names and phones." },
  { icon: Target, label: "Today's targets", prompt: "Show me EXACT target status for all team members from database. Real numbers only." },
  { icon: TrendingUp, label: "Revenue boost", prompt: "Show 5 revenue actions from ACTUAL data — real leads, real deals, real renewals with names and phones." },
  { icon: AlertTriangle, label: "Risk alerts", prompt: "What risks exist in ACTUAL data? Show real overdue follow-ups, unpaid deals, expiring policies." },
  { icon: DollarSign, label: "Cash position", prompt: "Show EXACT cash position from bank accounts, pending payments, and revenue from actual database." },
  { icon: Users, label: "Team status", prompt: "Show EXACT team performance from targets table. Real achievement numbers, not estimates." },
  { icon: FileSpreadsheet, label: "📊 Excel Report", action: "generate_report" },
  { icon: ShoppingCart, label: "Cross-sell", prompt: "Find cross-sell from ACTUAL customer data. Real names, real phones, real opportunities." },
];

// ===== TEAM MEMBER — LIMITED OPERATIONAL ACTIONS PER VERTICAL =====
const INSURANCE_ACTIONS = [
  { icon: Search, label: "🔍 Find client", prompt: "Search for a client — tell me the name, phone or vehicle number to look up." },
  { icon: Target, label: "📋 My renewals", prompt: "Show all my pending insurance renewals with customer names, phones, and expiry dates. What should I call first?" },
  { icon: Phone, label: "📞 Who to call?", prompt: "Which renewal customer should I call RIGHT NOW? Give me the phone number and what to say." },
  { icon: TrendingUp, label: "💰 My incentive", prompt: "How much incentive have I earned? What can I earn if I close pending renewals?" },
  { icon: Megaphone, label: "🚀 Run campaign", prompt: "Help me draft a renewal reminder WhatsApp message for my pending customers." },
  { icon: ClipboardCheck, label: "📊 My report", prompt: "Generate my personal performance report — targets, achievements, pending work." },
];

const SALES_ACTIONS = [
  { icon: Search, label: "🔍 Find lead", prompt: "Search for a lead — tell me the name or phone to look up." },
  { icon: Target, label: "📋 My leads", prompt: "Show all my pending sales leads. Who should I call first?" },
  { icon: Phone, label: "📞 Next call", prompt: "Which lead should I call RIGHT NOW? Give me the phone and what to say." },
  { icon: TrendingUp, label: "💰 My targets", prompt: "Show my sales targets and achievement. How much more do I need?" },
  { icon: Lightbulb, label: "💡 Close tips", prompt: "Give me 3 tips to close my pending deals faster today." },
  { icon: ClipboardCheck, label: "📊 My report", prompt: "Generate my personal sales performance report." },
];

const RENTAL_ACTIONS = [
  { icon: Search, label: "🔍 Find booking", prompt: "Search for a booking — tell me customer name, phone, or car name." },
  { icon: Car, label: "🚗 Returns due", prompt: "Show all self-drive car returns due today and next 3 days with customer details." },
  { icon: Shield, label: "📋 KYC pending", prompt: "Show all bookings with pending KYC verification." },
  { icon: Phone, label: "📞 Who to call?", prompt: "Which customer should I call for return confirmation or payment?" },
  { icon: Target, label: "🎯 My targets", prompt: "Show my rental booking targets and achievements." },
  { icon: ClipboardCheck, label: "📊 My report", prompt: "Generate my self-drive performance report." },
];

const HSRP_ACTIONS = [
  { icon: Search, label: "🔍 Find order", prompt: "Search for an HSRP order by registration number, name, or phone." },
  { icon: Target, label: "📋 Pending orders", prompt: "Show all my pending HSRP orders with customer details and status." },
  { icon: Phone, label: "📞 Next call", prompt: "Which HSRP customer should I call? Payment pending or status update needed?" },
  { icon: TrendingUp, label: "💰 My targets", prompt: "Show my HSRP targets and achievement this month." },
  { icon: ClipboardCheck, label: "📊 My report", prompt: "Generate my HSRP performance report." },
];

const DEFAULT_TEAM_ACTIONS = [
  { icon: Search, label: "🔍 Search", prompt: "Search for a customer or lead — tell me the name, phone, or vehicle number." },
  { icon: Target, label: "🎯 My targets", prompt: "Show my personal targets and how much I've achieved." },
  { icon: Phone, label: "📞 Who to call?", prompt: "Who should I call first today? Give me priority contacts." },
  { icon: TrendingUp, label: "💰 My incentive", prompt: "How much incentive have I earned so far?" },
  { icon: Lightbulb, label: "💡 Tips", prompt: "Give me 3 tips to improve my performance today." },
  { icon: ClipboardCheck, label: "📊 My report", prompt: "Generate my personal performance report." },
];

function getTeamActions(vertical?: string) {
  if (!vertical) return DEFAULT_TEAM_ACTIONS;
  const v = vertical.toLowerCase();
  if (v.includes("insurance")) return INSURANCE_ACTIONS;
  if (v.includes("sales") || v.includes("automotive")) return SALES_ACTIONS;
  if (v.includes("rental") || v.includes("self") || v.includes("drive")) return RENTAL_ACTIONS;
  if (v.includes("hsrp")) return HSRP_ACTIONS;
  return DEFAULT_TEAM_ACTIONS;
}

export function CRMAssistant({ userRole, userName, userVertical }: CRMAssistantProps) {
  const isSuperAdmin = !userRole || userRole === "super_admin" || userRole === "admin";
  const QUICK_ACTIONS = isSuperAdmin ? ADMIN_QUICK_ACTIONS : getTeamActions(userVertical);
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
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) return;
    if (convId) {
      await supabase.from("ai_cofounder_conversations")
        .update({ messages: payload, updated_at: new Date().toISOString() })
        .eq("id", convId);
    } else {
      const { data } = await supabase.from("ai_cofounder_conversations")
        .insert({ user_id: userId, messages: payload })
        .select("id").single();
      if (data) setConvId(data.id);
    }
  }, [convId]);

  const sendMessage = async (text?: string, actionOverride?: string) => {
    const query = text || input.trim();
    if (!query && !actionOverride) return;
    if (isLoading) return;

    const displayText = query || (actionOverride === "generate_report" ? "📊 Generate full business report (Excel)" : "Running action...");
    const userMsg: Message = { role: "user", content: displayText };
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
        body: JSON.stringify({
          action: actionOverride || "quick_insight",
          question: query || undefined,
          report_type: actionOverride === "generate_report" ? "comprehensive" : undefined,
          user_role: userRole || "super_admin",
          user_name: userName,
          vertical: userVertical,
          conversation_history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
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

  // ===== TEAM RESTRICTED INPUT VALIDATION =====
  const getPlaceholder = () => {
    if (isSuperAdmin) return "Ask your Co-Founder anything...";
    return `Ask about your ${userVertical || ''} work, clients, targets...`;
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
          className={cn(
            "h-14 w-14 rounded-full shadow-2xl hover:scale-110 transition-all duration-200 border-2 border-white/20",
            isSuperAdmin
              ? "bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
              : "bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
          )}
          size="icon"
        >
          {isSuperAdmin ? <Brain className="h-6 w-6 text-white" /> : <Bot className="h-6 w-6 text-white" />}
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
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full px-5 py-2.5 shadow-xl cursor-pointer flex items-center gap-2 hover:shadow-2xl transition-shadow text-white",
          isSuperAdmin
            ? "bg-gradient-to-r from-violet-600 to-indigo-600"
            : "bg-gradient-to-r from-blue-600 to-cyan-600"
        )}
      >
        {isSuperAdmin ? <Brain className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        <span className="text-sm font-semibold">{isSuperAdmin ? "AI Co-Founder" : "Work Assistant"}</span>
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
        <div className={cn(
          "flex items-center justify-between px-4 py-3 border-b shrink-0",
          isSuperAdmin
            ? "bg-gradient-to-r from-violet-600/10 to-indigo-600/10"
            : "bg-gradient-to-r from-blue-600/10 to-cyan-600/10"
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "p-1.5 rounded-lg bg-gradient-to-br",
              isSuperAdmin ? "from-violet-600 to-indigo-600" : "from-blue-600 to-cyan-600"
            )}>
              {isSuperAdmin ? <Brain className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
            </div>
            <div>
              <span className="font-bold text-sm">{isSuperAdmin ? "AI Co-Founder" : "Work Assistant"}</span>
              {isSuperAdmin ? (
                <Badge variant="secondary" className="ml-2 text-[9px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                  FOUNDER ROOM
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-2 text-[9px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {userVertical || "TEAM"}
                </Badge>
              )}
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
                <div className={cn(
                  "p-3 rounded-2xl inline-block",
                  isSuperAdmin ? "bg-gradient-to-br from-violet-600/10 to-indigo-600/10" : "bg-gradient-to-br from-blue-600/10 to-cyan-600/10"
                )}>
                  {isSuperAdmin ? <Brain className="h-8 w-8 text-violet-600" /> : <Bot className="h-8 w-8 text-blue-600" />}
                </div>
                <div>
                  <p className="font-bold text-sm">{isSuperAdmin ? "Your AI Co-Founder" : `${userName || "Team"} Assistant`}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isSuperAdmin
                      ? "24/7 revenue engine, sales director, risk radar & team coach"
                      : `Your personal ${userVertical || ''} work assistant — clients, targets, follow-ups`}
                  </p>
                </div>

                {/* Team restriction notice */}
                {!isSuperAdmin && (
                  <div className="flex items-center gap-1.5 justify-center text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-1.5">
                    <Lock className="h-3 w-3" />
                    <span>Limited to your {userVertical || ''} work data only</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5 pt-2">
                  {QUICK_ACTIONS.map((qa: any) => (
                    <button
                      key={qa.label}
                      onClick={() => qa.action ? sendMessage(undefined, qa.action) : sendMessage(qa.prompt)}
                      className={cn(
                        "flex items-center gap-1.5 text-left text-[11px] rounded-lg px-2.5 py-2 transition-colors group",
                        isSuperAdmin
                          ? "bg-muted/60 hover:bg-muted"
                          : "bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40"
                      )}
                    >
                      <qa.icon className={cn(
                        "h-3.5 w-3.5 shrink-0 group-hover:scale-110 transition-transform",
                        isSuperAdmin ? "text-violet-600" : "text-blue-600"
                      )} />
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
                    ? isSuperAdmin
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                      : "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
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
                  <span className={cn(
                    "animate-spin h-3.5 w-3.5 border-2 rounded-full",
                    isSuperAdmin ? "border-violet-300 border-t-violet-600" : "border-blue-300 border-t-blue-600"
                  )} />
                  {isSuperAdmin ? "Analyzing your business data..." : "Looking up your data..."}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick actions when mid-conversation */}
        {messages.length > 0 && messages.length < 6 && !isLoading && (
          <div className="px-3 pb-1 flex flex-wrap gap-1 shrink-0">
            {QUICK_ACTIONS.slice(0, 4).map((qa: any) => (
              <button
                key={qa.label}
                onClick={() => qa.action ? sendMessage(undefined, qa.action) : sendMessage(qa.prompt)}
                className={cn(
                  "text-[10px] rounded-full px-2 py-0.5 transition-colors font-medium",
                  isSuperAdmin
                    ? "bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/50 text-violet-700 dark:text-violet-300"
                    : "bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                )}
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
            placeholder={getPlaceholder()}
            className={cn(
              "text-sm",
              isSuperAdmin
                ? "border-violet-200 dark:border-violet-800 focus-visible:ring-violet-500"
                : "border-blue-200 dark:border-blue-800 focus-visible:ring-blue-500"
            )}
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className={cn(
              isSuperAdmin
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
                : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
