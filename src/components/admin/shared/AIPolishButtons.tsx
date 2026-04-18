import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sparkles, Wand2, Languages, Smile, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type AIPolishMode =
  | "polish"
  | "professional"
  | "friendly"
  | "shorten"
  | "hindi"
  | "english"
  | "hinglish"
  | "emoji";

const INSTRUCTIONS: Record<AIPolishMode, string> = {
  polish: "Fix grammar, spelling, and punctuation. Keep the same meaning, tone, language and length. Keep WhatsApp formatting (*bold*, _italic_), emojis and line breaks intact.",
  professional: "Rewrite in a polite, professional business tone for a customer-facing message. Keep facts, numbers, names, links and formatting intact.",
  friendly: "Rewrite in a warm, friendly conversational tone. Keep facts, numbers, names, links and formatting intact.",
  shorten: "Make it crisp and shorter (under 60 words if possible) without losing key information.",
  hindi: "Translate to natural Hindi (Devanagari script). Keep names, numbers, links and formatting intact.",
  english: "Translate to natural professional English. Keep names, numbers, links and formatting intact.",
  hinglish: "Rewrite in natural Hinglish (Hindi written in Roman/English letters) — the way Indian customers chat on WhatsApp.",
  emoji: "Add 2-4 relevant emojis at natural places to make it lively, but do not overdo it. Keep all original text and formatting.",
};

interface AIPolishButtonsProps {
  /** Current text in the composer */
  value: string;
  /** Setter to update the composer text */
  onChange: (next: string) => void;
  /** When true, disables all AI buttons (e.g. while sending) */
  disabled?: boolean;
  /** Optional extra context for the AI prompt (e.g. "WhatsApp message for car dealership") */
  contextHint?: string;
  /** Compact icon-only mode (default), or labeled mode */
  size?: "icon" | "compact";
  className?: string;
}

/**
 * Reusable AI rewrite/polish buttons for any chat composer.
 * Renders a "Sparkles" quick-fix button + a dropdown for tone/translate.
 * Includes Undo of the last AI change.
 */
export function AIPolishButtons({
  value,
  onChange,
  disabled,
  contextHint,
  size = "icon",
  className,
}: AIPolishButtonsProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [previous, setPrevious] = useState<string | null>(null);

  const run = useCallback(
    async (mode: AIPolishMode) => {
      const trimmed = (value || "").trim();
      if (!trimmed) {
        toast.error("Type a message first");
        return;
      }
      setIsWorking(true);
      setPrevious(value);
      try {
        const systemPrompt = `You are a message editor for a customer-facing CRM in India${
          contextHint ? ` (${contextHint})` : ""
        }. ${INSTRUCTIONS[mode]} Return ONLY the final message text — no quotes, no explanations, no markdown code fences.`;

        const { data, error } = await supabase.functions.invoke("ai-generate", {
          body: {
            systemPrompt,
            prompt: trimmed,
            temperature: 0.4,
            max_tokens: 800,
          },
        });
        if (error) throw error;
        const cleaned = String(data?.content || "")
          .trim()
          .replace(/^```[\w]*\n?/, "")
          .replace(/\n?```$/, "")
          .replace(/^["']|["']$/g, "");
        if (!cleaned) throw new Error("AI returned empty response");
        onChange(cleaned);
        toast.success("AI updated ✨ — open menu → Undo to revert");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "AI failed");
        setPrevious(null);
      } finally {
        setIsWorking(false);
      }
    },
    [value, onChange, contextHint],
  );

  const undo = useCallback(() => {
    if (previous !== null) {
      onChange(previous);
      setPrevious(null);
      toast.success("Reverted");
    }
  }, [previous, onChange]);

  const isDisabled = disabled || isWorking || !value?.trim();

  return (
    <div className={cn("flex items-center gap-1 shrink-0", className)}>
      {/* Quick AI Fix */}
      <Button
        type="button"
        variant="outline"
        size={size === "icon" ? "icon" : "sm"}
        className={cn(
          "shrink-0 border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700",
          "dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-300",
          size === "icon" ? "h-9 w-9" : "h-9 gap-1.5 text-xs px-2",
        )}
        title="AI Fix — grammar, spelling & polish"
        onClick={() => run("polish")}
        disabled={isDisabled}
      >
        {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {size !== "icon" && <span>AI Fix</span>}
      </Button>

      {/* Rewrite menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size={size === "icon" ? "icon" : "sm"}
            className={cn("shrink-0", size === "icon" ? "h-9 w-9" : "h-9 gap-1.5 text-xs px-2")}
            title="AI Rewrite — tone & translate"
            disabled={isDisabled}
          >
            <Wand2 className="h-4 w-4" />
            {size !== "icon" && <span>Rewrite</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs">Tone</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => run("professional")} className="text-xs gap-2">
            <Wand2 className="h-3.5 w-3.5" /> Make Professional
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("friendly")} className="text-xs gap-2">
            <Smile className="h-3.5 w-3.5" /> Make Friendly
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("shorten")} className="text-xs gap-2">
            <Sparkles className="h-3.5 w-3.5" /> Shorten / Crisp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("emoji")} className="text-xs gap-2">
            <Smile className="h-3.5 w-3.5" /> Add Emojis
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs">Translate</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => run("hindi")} className="text-xs gap-2">
            <Languages className="h-3.5 w-3.5" /> Hindi (हिंदी)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("hinglish")} className="text-xs gap-2">
            <Languages className="h-3.5 w-3.5" /> Hinglish
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("english")} className="text-xs gap-2">
            <Languages className="h-3.5 w-3.5" /> English
          </DropdownMenuItem>
          {previous !== null && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={undo} className="text-xs gap-2">
                <X className="h-3.5 w-3.5" /> Undo last AI change
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
