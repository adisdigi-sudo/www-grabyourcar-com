import { useState, useEffect, useCallback, useMemo } from "react";
import { Sun, Sunrise, Moon, Sparkles, RefreshCcw, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const COFOUNDER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-cofounder`;

interface Props {
  userName?: string;
  userVertical?: string;
  userRole?: string;
}

function getGreeting(): { text: string; icon: typeof Sun; period: string; gradient: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)
    return { text: "Good Morning", icon: Sunrise, period: "morning", gradient: "from-amber-500/15 via-orange-400/10 to-yellow-300/10", emoji: "☀️" };
  if (hour >= 12 && hour < 17)
    return { text: "Good Afternoon", icon: Sun, period: "afternoon", gradient: "from-sky-500/15 via-blue-400/10 to-cyan-300/10", emoji: "🌤️" };
  if (hour >= 17 && hour < 21)
    return { text: "Good Evening", icon: Moon, period: "evening", gradient: "from-purple-500/15 via-violet-400/10 to-indigo-300/10", emoji: "🌆" };
  return { text: "Good Night", icon: Moon, period: "night", gradient: "from-indigo-600/15 via-blue-800/10 to-slate-700/10", emoji: "🌙" };
}

function getDisplayName(userName?: string): string {
  if (!userName) return "Team";
  // Clean up email-like names: "isha_Gycins" → "Isha", "admin.gyc" → "Admin"
  const clean = userName.replace(/@.*$/, "").split(/[_.\-]/)[0];
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

const VERTICAL_ICONS: Record<string, string> = {
  Insurance: "🛡️",
  "Automotive Sales": "🚗",
  "Self-Drive Rental": "🔑",
  "HSRP & FASTag": "🏷️",
  Accessories: "🛒",
  "Marketing & Tech": "📱",
  "Car Database": "📊",
  "Dealer Network": "🤝",
  "Accounts & Finance": "💰",
  "HR & Office Culture": "👥",
  "Car Loans / Finance": "🏦",
};

export function PersonalizedWelcomeBanner({ userName, userVertical, userRole }: Props) {
  const greeting = useMemo(() => getGreeting(), []);
  const displayName = useMemo(() => getDisplayName(userName), [userName]);
  const [quote, setQuote] = useState("");
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const verticalIcon = userVertical ? VERTICAL_ICONS[userVertical] || "🏢" : "🏢";
  const isSuperAdmin = !userRole || userRole === "super_admin" || userRole === "admin";

  const fetchMotivationalQuote = useCallback(async () => {
    setIsLoadingQuote(true);
    try {
      const timeContext = greeting.period;
      const roleContext = isSuperAdmin ? "founder/CEO" : `${userVertical || ""} team member`;
      const prompt = `Generate a short, powerful motivational quote (max 15 words) for a ${roleContext} starting their ${timeContext} work session in the automotive industry. Make it personal, energizing and fun. Don't use quotation marks. Just the quote itself, nothing else.`;
      
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
      // Silent fail — decorative
    } finally {
      setIsLoadingQuote(false);
    }
  }, [greeting.period, isSuperAdmin, userName, userRole, userVertical]);

  useEffect(() => {
    const t = setTimeout(() => fetchMotivationalQuote(), 800);
    return () => clearTimeout(t);
  }, []);

  const GIcon = greeting.icon;

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
          "bg-gradient-to-r",
          greeting.gradient,
          "dark:border-border/30"
        )}>
          {/* Decorative circles */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
          <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-accent/5 blur-xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Main Greeting */}
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                  className="text-3xl"
                >
                  {greeting.emoji}
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">
                    {greeting.text}, <span className="text-primary">{displayName}</span>! 👋
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-muted-foreground">
                      {verticalIcon} {userVertical || "GrabYourCar"} •{" "}
                      {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                    </span>
                    {isSuperAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-2.5 w-2.5" /> FOUNDER
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Motivational Quote */}
              {(quote || isLoadingQuote) && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start gap-2 mt-3 pl-1"
                >
                  <Quote className="h-4 w-4 text-primary/40 shrink-0 mt-0.5 rotate-180" />
                  {isLoadingQuote && !quote ? (
                    <span className="text-sm text-muted-foreground italic animate-pulse">
                      Crafting your inspiration...
                    </span>
                  ) : (
                    <p className="text-sm font-medium text-foreground/70 italic leading-relaxed">
                      {quote}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
                    onClick={fetchMotivationalQuote}
                    title="New quote"
                  >
                    <RefreshCcw className={cn("h-3 w-3", isLoadingQuote && "animate-spin")} />
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
