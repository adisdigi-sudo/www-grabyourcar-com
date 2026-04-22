import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, RefreshCw, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PROMPTS: Array<{ id: string; label: string; icon: typeof Target; prompt: string }> = [
  {
    id: "growth",
    label: "Growth Plan",
    icon: TrendingUp,
    prompt:
      "Tu mera AI Co-Founder hai. Aaj ke deals, leads aur targets dekh ke 5 specific actions de jo aaj/kal me execute ho sake aur revenue badhe. Short bullets, INR me numbers, vertical-wise focus.",
  },
  {
    id: "risks",
    label: "Risks & Leaks",
    icon: AlertTriangle,
    prompt:
      "Mere business ke top 3 risks aur revenue leaks identify kar (overdue tasks, dropped leads, payment pending). Har point ka impact ₹ me + fix action.",
  },
  {
    id: "targets",
    label: "Target Coaching",
    icon: Target,
    prompt:
      "Current month targets vs achieved dekho. Kaunsi vertical/team behind hai? Specific kya karna chahiye unhe goal tak pohchane ke liye? 4-5 actionable bullets.",
  },
];

export function FounderAICoach() {
  const [activePromptId, setActivePromptId] = useState<string>(PROMPTS[0].id);
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["founder-coach-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("crm_users")
        .select("name,role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      return data as { name: string; role: string } | null;
    },
  });

  const ask = async (promptId: string) => {
    const p = PROMPTS.find((x) => x.id === promptId);
    if (!p) return;
    setActivePromptId(promptId);
    setLoading(true);
    setResponse("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-cofounder", {
        body: {
          action: "chat",
          user_name: profile?.name || "Founder",
          user_role: profile?.role || "super_admin",
          vertical: "all",
          question: p.prompt,
          conversation_history: [],
        },
      });
      if (error) throw error;
      const text =
        (data && (data.response || data.message || data.answer)) ||
        (typeof data === "string" ? data : "");
      if (!text) throw new Error("Empty response");
      setResponse(text);
    } catch (e: any) {
      console.error("[FounderAICoach] error", e);
      toast.error(e?.message || "AI Coach failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
              <Brain className="h-4 w-4" />
            </div>
            AI Growth Coach
            <Badge variant="secondary" className="text-[10px]">
              Gemini
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => ask(activePromptId)}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={activePromptId === p.id ? "default" : "outline"}
              onClick={() => ask(p.id)}
              disabled={loading}
              className="gap-1.5"
            >
              <p.icon className="h-3.5 w-3.5" />
              {p.label}
            </Button>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4 min-h-[180px]">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse" />
              AI Coach soch raha hai…
            </div>
          ) : response ? (
            <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
              {response}
            </pre>
          ) : (
            <div className="text-sm text-muted-foreground">
              Upar koi option chuno — AI Coach growth plan, risks ya target coaching dega.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default FounderAICoach;
