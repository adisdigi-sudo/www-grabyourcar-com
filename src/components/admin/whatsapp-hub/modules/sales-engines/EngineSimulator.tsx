import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, User, RotateCcw, Send } from "lucide-react";
import type { SalesEngineStep, SalesEngineBranch } from "./types";

interface ChatMsg {
  from: "bot" | "user";
  text: string;
  meta?: string;
}

export function EngineSimulator({ engineId }: { engineId: string }) {
  const [steps, setSteps] = useState<SalesEngineStep[]>([]);
  const [branches, setBranches] = useState<Record<string, SalesEngineBranch[]>>({});
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [currentStepKey, setCurrentStepKey] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [engineId]);

  async function load() {
    const { data: s } = await supabase
      .from("sales_engine_steps" as any)
      .select("*")
      .eq("engine_id", engineId)
      .order("step_order");
    const stepsData = (s || []) as unknown as SalesEngineStep[];
    setSteps(stepsData);

    if (stepsData.length) {
      const ids = stepsData.map((x) => x.id);
      const { data: b } = await supabase
        .from("sales_engine_branches" as any)
        .select("*")
        .in("step_id", ids)
        .order("branch_order");
      const grouped: Record<string, SalesEngineBranch[]> = {};
      ((b || []) as unknown as SalesEngineBranch[]).forEach((br) => {
        if (!grouped[br.step_id]) grouped[br.step_id] = [];
        grouped[br.step_id].push(br);
      });
      setBranches(grouped);

      const initial = stepsData.find((x) => x.is_initial) || stepsData[0];
      reset(stepsData, initial);
    }
  }

  function reset(allSteps?: SalesEngineStep[], initial?: SalesEngineStep) {
    const useSteps = allSteps || steps;
    const init = initial || useSteps.find((x) => x.is_initial) || useSteps[0];
    if (!init) return;
    setChat([{ from: "bot", text: init.message_text, meta: init.title || init.step_key }]);
    setCurrentStepKey(init.step_key);
    setInput("");
    setDone(null);
  }

  function handleReply() {
    if (!input.trim() || !currentStepKey || done) return;
    const userText = input.trim();
    const step = steps.find((s) => s.step_key === currentStepKey);
    if (!step) return;

    const stepBranches = branches[step.id] || [];
    let matched: SalesEngineBranch | undefined;

    for (const br of stepBranches) {
      if (br.match_type === "any") {
        matched = br;
        break;
      }
      if (br.match_type === "keyword" && br.match_keywords) {
        const lower = userText.toLowerCase();
        if (br.match_keywords.some((k) => lower.includes(k.toLowerCase()))) {
          matched = br;
          break;
        }
      }
    }

    if (!matched) matched = stepBranches.find((br) => br.match_type === "no_match");

    const newChat: ChatMsg[] = [...chat, { from: "user", text: userText }];

    if (!matched) {
      newChat.push({ from: "bot", text: "⚠️ No matching branch. Conversation ends.", meta: "no_match" });
      setChat(newChat);
      setDone("no_match");
      setInput("");
      return;
    }

    if (matched.action === "qualify") {
      newChat.push({ from: "bot", text: `✅ QUALIFIED — ${matched.action_note || "Lead created in CRM"}`, meta: "qualify" });
      setChat(newChat);
      setDone("qualified");
      setInput("");
      return;
    }
    if (matched.action === "disqualify") {
      newChat.push({ from: "bot", text: `❌ Disqualified — ${matched.action_note || "Not interested"}`, meta: "disqualify" });
      setChat(newChat);
      setDone("disqualified");
      setInput("");
      return;
    }
    if (matched.action === "handover") {
      newChat.push({ from: "bot", text: `👤 Handover to agent — ${matched.action_note || ""}`, meta: "handover" });
      setChat(newChat);
      setDone("handover");
      setInput("");
      return;
    }
    if (matched.action === "end") {
      newChat.push({ from: "bot", text: matched.action_note || "Conversation ended.", meta: "end" });
      setChat(newChat);
      setDone("ended");
      setInput("");
      return;
    }

    // continue
    const nextStep = steps.find((s) => s.step_key === matched!.next_step_key);
    if (!nextStep) {
      newChat.push({ from: "bot", text: "⚠️ Next step not found.", meta: "error" });
      setChat(newChat);
      setDone("error");
      setInput("");
      return;
    }
    newChat.push({ from: "bot", text: nextStep.message_text, meta: nextStep.title || nextStep.step_key });
    setChat(newChat);
    setCurrentStepKey(nextStep.step_key);
    setInput("");
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="h-4 w-4 text-green-600" /> Live Test Simulator
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => reset()} className="h-7 gap-1">
          <RotateCcw className="h-3 w-3" /> Reset
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {chat.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                m.from === "user"
                  ? "bg-green-600 text-white rounded-br-sm"
                  : "bg-card border rounded-bl-sm"
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {m.from === "user" ? <User className="h-3 w-3 opacity-70" /> : <Bot className="h-3 w-3 text-green-600" />}
                  {m.meta && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-current/20">
                      {m.meta}
                    </Badge>
                  )}
                </div>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          ))}
          {done && (
            <div className="text-center text-xs text-muted-foreground py-2">
              — Session ended ({done}) —
            </div>
          )}
        </div>
        <div className="border-t p-2 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReply()}
            placeholder={done ? "Reset to test again" : "Type customer reply..."}
            disabled={!!done}
            className="h-9"
          />
          <Button size="sm" onClick={handleReply} disabled={!!done || !input.trim()} className="bg-green-600 hover:bg-green-700">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
