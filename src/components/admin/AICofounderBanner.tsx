import { useState, useEffect, useCallback } from "react";
import { Brain, X, ChevronRight, Sparkles, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

const COFOUNDER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-cofounder`;

interface Props {
  activeTab: string;
  userRole?: string;
  userName?: string;
  userVertical?: string;
}

const TAB_CONTEXT: Record<string, string> = {
  dashboard: "Give ONE urgent revenue action for today with specific ₹ impact. Max 2 sentences.",
  "sales-crm": "Give ONE sales tip for the pipeline right now. Which lead to call first? Max 2 sentences.",
  "services-insurance": "Give ONE insurance renewal action. Which customer to call for renewal? Max 2 sentences.",
  "rental-crm": "Give ONE self-drive rental insight. Any returns due or upsell opportunity? Max 2 sentences.",
  "hsrp-crm": "Give ONE HSRP processing tip. Any stuck orders needing attention? Max 2 sentences.",
  "dealer-network": "Give ONE dealer network insight. Any new discount updates or inventory to check? Max 2 sentences.",
  "accounts-dashboard": "Give ONE financial insight. Cash position, pending payments, or expense alert? Max 2 sentences.",
  "calling-system": "Give ONE calling priority. Which lead should be called first and why? Max 2 sentences.",
  "marketing-hub": "Give ONE marketing idea to boost leads today. Max 2 sentences.",
};

const TEAM_TAB_CONTEXT: Record<string, string> = {
  "sales-crm": "Give ONE sales task for ME right now. Which lead should I call first? Max 2 sentences.",
  "services-insurance": "Give ONE renewal task for ME. Which customer should I call for renewal right now? Max 2 sentences.",
  "rental-crm": "Give ONE self-drive task for ME. Any returns due or bookings to confirm? Max 2 sentences.",
  "hsrp-crm": "Give ONE HSRP task for ME. Any orders I need to process? Max 2 sentences.",
  "dealer-network": "Give ONE dealer task for ME. Any updates to collect or calls to make? Max 2 sentences.",
  "calling-system": "Give ONE calling task for ME. Which lead should I call first and what to say? Max 2 sentences.",
};

export function AICofounderBanner({ activeTab, userRole, userName, userVertical }: Props) {
  const isSuperAdmin = !userRole || userRole === "super_admin" || userRole === "admin";
  const [suggestion, setSuggestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastTab, setLastTab] = useState("");

  const fetchSuggestion = useCallback(async () => {
    const contextMap = isSuperAdmin ? TAB_CONTEXT : TEAM_TAB_CONTEXT;
    const defaultPrompt = isSuperAdmin
      ? "Give ONE actionable insight for the business right now. Max 2 sentences."
      : `Give ONE task for ${userName || 'me'} in ${userVertical || 'my'} vertical right now. Max 2 sentences.`;
    const contextPrompt = contextMap[activeTab] || defaultPrompt;
    setIsLoading(true);
    setSuggestion("");

    try {
      const resp = await fetch(COFOUNDER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: "quick_insight", question: contextPrompt }),
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
            if (t) { acc += t; setSuggestion(acc); }
          } catch {}
        }
      }
    } catch {
      // Silently fail — banner is optional
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== lastTab) {
      setLastTab(activeTab);
      setIsDismissed(false);
      // Debounce to avoid rapid fetches on tab switching
      const t = setTimeout(() => fetchSuggestion(), 1500);
      return () => clearTimeout(t);
    }
  }, [activeTab, lastTab, fetchSuggestion]);

  if (isDismissed || (!suggestion && !isLoading)) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="mb-4 overflow-hidden"
      >
        <div className="relative flex items-start gap-3 rounded-xl border border-violet-200 dark:border-violet-800/50 bg-gradient-to-r from-violet-50/80 to-indigo-50/80 dark:from-violet-950/30 dark:to-indigo-950/30 px-4 py-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shrink-0 mt-0.5">
            <Brain className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-violet-700 dark:text-violet-300">AI Co-Founder</span>
              <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-300">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" /> INSIGHT
              </Badge>
            </div>
            {isLoading && !suggestion ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="animate-spin h-3 w-3 border-2 border-violet-300 border-t-violet-600 rounded-full" />
                Scanning your data...
              </div>
            ) : (
              <div className="text-xs text-foreground/80 prose prose-sm dark:prose-invert max-w-none [&>p]:mb-0 [&>p]:leading-relaxed">
                <ReactMarkdown>{suggestion}</ReactMarkdown>
              </div>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchSuggestion} title="Refresh">
              <RefreshCcw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsDismissed(true)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
