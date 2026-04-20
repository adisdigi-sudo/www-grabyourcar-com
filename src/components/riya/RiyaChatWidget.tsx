import { useState, useRef, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  X,
  Send,
  Loader2,
  Minus,
  Paperclip,
  Sparkles,
  Wand2,
  Languages,
  Smile,
} from "lucide-react";
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

const SESSION_KEY_STORAGE = "riya-chat-session-key";
const SESSION_UUID_STORAGE = "riya-chat-session-uuid";
const POLL_INTERVAL_MS = 2000;

const DEFAULT_GREETING = `Hanji, welcome to **GrabYourCar**! 🙏

Main **Riya** hoon — bataiye main aapki kaise help kar sakti hoon? 😊`;

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
  const [sessionId] = useState(() => {
    if (typeof window === "undefined") {
      return `riya_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    const existing = window.localStorage.getItem(SESSION_KEY_STORAGE);
    if (existing) return existing;

    const next = `riya_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(SESSION_KEY_STORAGE, next);
    return next;
  });
  const [sessionUuid, setSessionUuid] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(SESSION_UUID_STORAGE);
  });
  const [aiBusy, setAiBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenMessageIds = useRef<Set<string>>(new Set());
  const sessionReadClient = useMemo(() => {
    const url =
      import.meta.env.VITE_SUPABASE_URL || "https://ynoiwioypxpurwdbjvyt.supabase.co";
    const key =
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlub2l3aW95cHhwdXJ3ZGJqdnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1ODAyNDUsImV4cCI6MjA4MjE1NjI0NX0.LzN8OsDp2g0eSQcRLsunUKgCaWuZ4LWImnrMR_2onTU";
    return createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          "x-riya-session-key": sessionId,
        },
      },
    });
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionUuid) {
      window.localStorage.setItem(SESSION_UUID_STORAGE, sessionUuid);
    } else {
      window.localStorage.removeItem(SESSION_UUID_STORAGE);
    }
  }, [sessionUuid]);

  // Poll live agent / system messages using the session-key scoped public read policy.
  useEffect(() => {
    if (!sessionUuid) return;
    let cancelled = false;

    const syncMessages = async () => {
      const { data, error } = await sessionReadClient
        .from("riya_chat_messages")
        .select("id, role, content, sender_name")
        .eq("session_id", sessionUuid)
        .order("created_at", { ascending: true });

      if (cancelled || error || !data) return;

      const incoming = data.filter((msg) => {
        if (seenMessageIds.current.has(msg.id)) return false;
        if (msg.role === "user") return false;
        if (msg.role === "assistant" && msg.sender_name === "Riya (AI)") return false;
        return true;
      });

      if (!incoming.length) return;

      incoming.forEach((msg) => seenMessageIds.current.add(msg.id));
      setMessages((prev) => [
        ...prev,
        ...incoming.map((msg) => {
          const prefix =
            msg.role === "system"
              ? ""
              : msg.sender_name && msg.sender_name !== "Riya (AI)"
                ? `**${msg.sender_name}:** `
                : "";
          return { role: "assistant" as const, content: `${prefix}${msg.content}` };
        }),
      ]);
    };

    void syncMessages();
    const interval = window.setInterval(() => {
      void syncMessages();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [sessionReadClient, sessionUuid]);

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

      if (data?.sessionUuid && data.sessionUuid !== sessionUuid) {
        setSessionUuid(data.sessionUuid);
      }

      const reply = data?.message || "Sorry, kuch issue hua. Phir se try karein?";
      if (data?.messageId) {
        seenMessageIds.current.add(data.messageId);
      }
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

  type AiMode =
    | "polish"
    | "professional"
    | "friendly"
    | "shorten"
    | "hindi"
    | "english"
    | "hinglish"
    | "emoji";

  const runAi = async (mode: AiMode) => {
    const text = input.trim();
    if (!text || aiBusy || loading) return;
    const instructions: Record<AiMode, string> = {
      polish: "Fix grammar, spelling and punctuation only. Keep the same meaning, language and tone.",
      professional: "Rewrite in a polite, professional tone for a customer-facing chat.",
      friendly: "Rewrite in a warm, friendly conversational tone.",
      shorten: "Make it crisp and shorter (under 40 words) without losing meaning.",
      hindi: "Translate to natural Hindi (Devanagari).",
      english: "Translate to natural professional English.",
      hinglish: "Rewrite in natural Hinglish (Hindi in Roman/English letters).",
      emoji: "Add 1-3 relevant emojis at natural places. Keep all original text.",
    };
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          systemPrompt: `You are a chat message editor for a customer talking to GrabYourCar support. ${instructions[mode]} Return ONLY the final message text — no quotes, no explanations.`,
          prompt: text,
          temperature: 0.4,
          max_tokens: 400,
        },
      });
      if (error) throw error;
      const cleaned = String(data?.content || "")
        .trim()
        .replace(/^["']|["']$/g, "");
      if (cleaned) setInput(cleaned);
    } catch (e) {
      console.error("[Riya] AI rewrite failed:", e);
    } finally {
      setAiBusy(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading || loading) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "File 10MB se chhoti honi chahiye 🙏" },
      ]);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `riya-uploads/${sessionId}/${Date.now()}.${ext}`;
      const { error: upErr } = await sessionReadClient.storage
        .from("wa-media")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = sessionReadClient.storage.from("wa-media").getPublicUrl(path);
      const url = pub.publicUrl;
      const isImg = file.type.startsWith("image/");
      const userText = isImg ? `![${file.name}](${url})` : `📎 [${file.name}](${url})`;
      const next: Msg[] = [...messages, { role: "user", content: userText }];
      setMessages(next);
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("riya-chat", {
        body: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          sessionId,
        },
      });
      if (error) throw error;
      if (data?.sessionUuid && data.sessionUuid !== sessionUuid) setSessionUuid(data.sessionUuid);
      const reply = data?.message || "File mil gayi ✓";
      if (data?.messageId) seenMessageIds.current.add(data.messageId);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("[Riya] upload failed:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Upload nahi ho paaya, dobara try karein 🙏" },
      ]);
    } finally {
      setUploading(false);
      setLoading(false);
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
          <div className="font-semibold text-sm leading-tight">Riya</div>
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
      <ScrollArea className="flex-1 min-h-0 px-3" viewportRef={scrollRef}>
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
                <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_p]:my-1 [&_a]:text-primary [&_a]:underline [&_*]:break-words">
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
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileSelect}
        />
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploading || aiBusy}
            title="Attach file"
            aria-label="Attach file"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-primary"
            onClick={() => runAi("polish")}
            disabled={!input.trim() || aiBusy || loading}
            title="AI Fix — grammar & spelling"
            aria-label="AI Fix"
          >
            {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={!input.trim() || aiBusy || loading}
                title="AI Rewrite — tone & translate"
                aria-label="AI Rewrite"
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-52">
              <DropdownMenuLabel className="text-xs">Tone</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => runAi("professional")} className="text-xs gap-2">
                <Wand2 className="h-3.5 w-3.5" /> Professional
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAi("friendly")} className="text-xs gap-2">
                <Smile className="h-3.5 w-3.5" /> Friendly
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAi("shorten")} className="text-xs gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Shorten
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAi("emoji")} className="text-xs gap-2">
                <Smile className="h-3.5 w-3.5" /> Add Emojis
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">Translate</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => runAi("hindi")} className="text-xs gap-2">
                <Languages className="h-3.5 w-3.5" /> Hindi (हिंदी)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAi("hinglish")} className="text-xs gap-2">
                <Languages className="h-3.5 w-3.5" /> Hinglish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAi("english")} className="text-xs gap-2">
                <Languages className="h-3.5 w-3.5" /> English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Apna sawaal likhein..."
            disabled={loading || uploading}
            className="flex-1"
            maxLength={500}
          />
          <Button onClick={send} disabled={loading || uploading || !input.trim()} size="icon" className="shrink-0">
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
