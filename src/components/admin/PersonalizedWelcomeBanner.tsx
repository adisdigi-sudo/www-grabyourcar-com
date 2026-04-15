import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Sun, Sunrise, Moon, Sparkles, RefreshCcw, Quote, Coffee, Flame, Target, Zap, Star, Heart, Trophy, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const COFOUNDER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-cofounder`;

interface Props {
  userName?: string;
  userVertical?: string;
  userRole?: string;
}

function getGreeting(): { text: string; hindiText: string; icon: typeof Sun; period: string; gradient: string; emoji: string; bgClass: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)
    return { text: "Good Morning", hindiText: "सुप्रभात", icon: Sunrise, period: "morning", gradient: "from-amber-500/20 via-orange-400/15 to-yellow-300/10", emoji: "☀️", bgClass: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30" };
  if (hour >= 12 && hour < 17)
    return { text: "Good Afternoon", hindiText: "नमस्ते", icon: Sun, period: "afternoon", gradient: "from-sky-500/20 via-blue-400/15 to-cyan-300/10", emoji: "🌤️", bgClass: "bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/30" };
  if (hour >= 17 && hour < 21)
    return { text: "Good Evening", hindiText: "शुभ संध्या", icon: Moon, period: "evening", gradient: "from-purple-500/20 via-violet-400/15 to-indigo-300/10", emoji: "🌆", bgClass: "bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/30" };
  return { text: "Good Night", hindiText: "शुभ रात्रि", icon: Moon, period: "night", gradient: "from-indigo-600/20 via-blue-800/15 to-slate-700/10", emoji: "🌙", bgClass: "bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/40 dark:to-slate-950/30" };
}

function getDisplayName(userName?: string): string {
  if (!userName) return "Team";
  const clean = userName.replace(/@.*$/, "").split(/[_.\-]/)[0];
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

const DESI_ICONS = [Coffee, Flame, Target, Zap, Star, Heart, Trophy, Rocket];

const VERTICAL_EMOJIS: Record<string, string> = {
  Insurance: "🛡️", "Automotive Sales": "🚗", "Self-Drive Rental": "🔑",
  "HSRP & FASTag": "🏷️", Accessories: "🛒", "Marketing & Tech": "📱",
  "Car Database": "📊", "Dealer Network": "🤝", "Accounts & Finance": "💰",
  "HR & Office Culture": "👥", "Car Loans / Finance": "🏦",
};

export function PersonalizedWelcomeBanner({ userName, userVertical, userRole }: Props) {
  const greeting = useMemo(() => getGreeting(), []);
  const displayName = useMemo(() => getDisplayName(userName), [userName]);
  const [quote, setQuote] = useState("");
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteIcon, setQuoteIcon] = useState(0);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verticalEmoji = userVertical ? VERTICAL_EMOJIS[userVertical] || "🏢" : "🏢";
  const isSuperAdmin = !userRole || userRole === "super_admin" || userRole === "admin";

  const fetchMotivationalQuote = useCallback(async () => {
    setIsLoadingQuote(true);
    setQuoteIcon(Math.floor(Math.random() * DESI_ICONS.length));
    try {
      const timeContext = greeting.period;
      const roleContext = isSuperAdmin ? "founder/CEO" : `${userVertical || ""} team member`;
      const nameContext = displayName !== "Team" ? displayName : "team member";
      const prompt = `You are a fun, energetic Bollywood-style motivational coach for an Indian automotive startup team. Generate a short motivational quote (max 20 words) for ${nameContext}, a ${roleContext}, during their ${timeContext} work session.

RULES:
- Mix Hindi and English naturally (Hinglish style) like "Aaj ka din hai apna, let's crush it! 💪"
- Use fun Bollywood references, desi humor, cricket analogies, or startup hustle vibes
- Be personal - use their name "${nameContext}" sometimes
- Add energy words like "Boss", "Champion", "Rockstar", "Bhai/Didi"
- Include 1-2 relevant emojis
- Make it feel like a friend hyping them up, not formal
- Sometimes ask "Kaise ho aaj?" or "Ready hai na?" style questions
- Reference their work: ${userVertical || "business"}
- NO quotation marks, just the quote text
Examples style:
- "${nameContext}, aaj target pakka todna hai! Tum kar sakte ho 🔥"
- "Chai ready? Ab leads ko close karo like a boss! ☕💰"
- "Monday ho ya Friday, hustle never stops! Let's go ${nameContext} 🚀"`;
      
      const resp = await fetch(COFOUNDER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: "quick_insight",
          question: prompt,
          user_role: userRole || "super_admin",
          user_name: userName,
          vertical: userVertical,
        }),
      });

      if (!resp.ok || !resp.body) return;

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
            if (t) { acc += t; setQuote(acc); }
          } catch {}
        }
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoadingQuote(false);
    }
  }, [greeting.period, isSuperAdmin, userName, userRole, userVertical, displayName]);

  // Initial fetch + auto-refresh every 15 minutes
  useEffect(() => {
    const t = setTimeout(() => fetchMotivationalQuote(), 800);
    
    refreshTimerRef.current = setInterval(() => {
      fetchMotivationalQuote();
    }, 15 * 60 * 1000); // 15 minutes

    return () => {
      clearTimeout(t);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []);

  const QuoteIconComponent = DESI_ICONS[quoteIcon];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-5"
      >
        <div className={cn(
          "relative overflow-hidden rounded-2xl border border-border/50 px-6 py-5",
          greeting.bgClass,
          "dark:border-border/30"
        )}>
          {/* Decorative Bollywood-style patterns */}
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/5 blur-2xl" />
          <div className="absolute right-20 top-2 h-16 w-16 rounded-full bg-accent/8 blur-xl" />
          <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-primary/5 blur-xl" />
          
          {/* Subtle film strip decoration */}
          <div className="absolute top-0 right-0 w-32 h-full opacity-[0.03]">
            <div className="h-full w-full" style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 20px, currentColor 20px, currentColor 22px)",
            }} />
          </div>

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              {/* Main Greeting */}
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                  className="text-3xl"
                >
                  {greeting.emoji}
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">
                    {greeting.text}, <span className="text-primary">{displayName}</span>! 👋
                  </h2>
                  <p className="text-xs text-muted-foreground/70 font-medium mt-0.5">
                    {greeting.hindiText} • {verticalEmoji} {userVertical || "GrabYourCar"} •{" "}
                    {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                    {isSuperAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 ml-2 rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-2.5 w-2.5" /> FOUNDER
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Bollywood-style Quote Card */}
              {(quote || isLoadingQuote) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="relative"
                >
                  <div className="flex items-start gap-3 rounded-xl bg-background/60 dark:bg-background/40 backdrop-blur-sm border border-border/30 px-4 py-3 shadow-sm">
                    {/* Quote icon */}
                    <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                      <QuoteIconComponent className="h-4 w-4 text-primary" />
                    </div>
                    
                    {isLoadingQuote && !quote ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="animate-spin h-3 w-3 border-2 border-primary/30 border-t-primary rounded-full" />
                        <span className="italic">Aapke liye kuch special likh raha hoon... ✍️</span>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-foreground/85 leading-relaxed flex-1" style={{ fontStyle: "italic" }}>
                        "{quote}"
                      </p>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-50 hover:opacity-100 hover:bg-primary/10"
                      onClick={fetchMotivationalQuote}
                      title="Naya quote lao! 🎬"
                    >
                      <RefreshCcw className={cn("h-3.5 w-3.5", isLoadingQuote && "animate-spin")} />
                    </Button>
                  </div>
                  
                  {/* Auto-refresh indicator */}
                  <div className="flex items-center justify-end mt-1 pr-1">
                    <span className="text-[9px] text-muted-foreground/50">
                      🔄 Auto-refreshes every 15 min
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
