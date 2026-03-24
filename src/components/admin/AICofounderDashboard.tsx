import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  Sparkles, CheckCircle2, Clock, AlertTriangle, Zap, Send, RefreshCcw,
  Target, TrendingUp, Brain, Rocket, ThumbsUp, X, MessageCircle, Users,
  FileText, Bell, Award, BarChart3, UserCheck, AlertCircle, Plus,
  ShieldAlert, ShoppingCart, DollarSign, Search, Crosshair, Bug, Landmark,
  TrendingDown, Banknote, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-cofounder`;

function useStream() {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const startStream = useCallback(async (action: string, extras: any = {}) => {
    setContent(""); setIsStreaming(true);
    try {
      const resp = await fetch(CHAT_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }, body: JSON.stringify({ action, ...extras }) });
      if (!resp.ok || !resp.body) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `Error ${resp.status}`); }
      const reader = resp.body.getReader(); const decoder = new TextDecoder(); let buffer = "", acc = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx); buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim(); if (j === "[DONE]") break;
          try { const t = JSON.parse(j).choices?.[0]?.delta?.content; if (t) { acc += t; setContent(acc); } } catch {}
        }
      }
    } catch (e: any) { toast.error(e.message || "Failed"); } finally { setIsStreaming(false); }
  }, []);
  return { content, isStreaming, startStream, reset: () => setContent("") };
}

async function callAction(action: string, extras: any = {}) {
  const r = await fetch(CHAT_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }, body: JSON.stringify({ action, ...extras }) });
  if (!r.ok) throw new Error("Failed");
  return r.json();
}

export default function AICofounderDashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("briefing");
  const [question, setQuestion] = useState("");
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [showProblemDialog, setShowProblemDialog] = useState(false);
  const [targetForm, setTargetForm] = useState({ user_id: "", team_member_name: "", vertical_name: "", target_count: 0, target_revenue: 0 });
  const [problemForm, setProblemForm] = useState({ reported_by_name: "", vertical_name: "", problem_description: "" });

  const briefing = useStream();
  const report = useStream();
  const runway = useStream();
  const investor = useStream();
  const ecommerce = useStream();
  const coaching = useStream();

  // Persistent Ask chat
  const [askMessages, setAskMessages] = useState<{ role: string; content: string }[]>([]);
  const [askConvId, setAskConvId] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askStreamContent, setAskStreamContent] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const askLoadedRef = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    })();
  }, []);

  // Load saved conversation on mount
  useEffect(() => {
    if (askLoadedRef[0] || !currentUserId) return;
    askLoadedRef[1](true);
    (async () => {
      const { data } = await supabase
        .from("ai_cofounder_conversations")
        .select("id, messages")
        .eq("user_id", currentUserId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setAskConvId(data.id);
        const msgs = data.messages as { role: string; content: string }[];
        if (msgs?.length > 0) setAskMessages(msgs);
      }
    })();
  }, [currentUserId]);

  const saveAskConversation = useCallback(async (msgs: { role: string; content: string }[]) => {
    const payload = JSON.parse(JSON.stringify(msgs));
    if (!currentUserId) return;
    if (askConvId) {
      await supabase
        .from("ai_cofounder_conversations")
        .update({ messages: payload, updated_at: new Date().toISOString() })
        .eq("id", askConvId)
        .eq("user_id", currentUserId);
    } else {
      const { data } = await supabase
        .from("ai_cofounder_conversations")
        .insert({ user_id: currentUserId, messages: payload })
        .select("id")
        .single();
      if (data) setAskConvId(data.id);
    }
  }, [askConvId, currentUserId]);

  const sendAskMessage = useCallback(async (q: string) => {
    if (!q.trim() || askLoading) return;
    const userMsg = { role: "user", content: q };
    const newMsgs = [...askMessages, userMsg];
    setAskMessages(newMsgs);
    setQuestion("");
    setAskLoading(true);
    setAskStreamContent("");
    let acc = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ action: "quick_insight", question: q, user_name: "Boss", user_role: "super_admin", conversation_history: newMsgs.slice(-20) }),
      });
      if (!resp.ok || !resp.body) throw new Error("Failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
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
            if (t) { acc += t; setAskStreamContent(acc); }
          } catch {}
        }
      }
      const assistantMsg = { role: "assistant", content: acc || "I'm here to help!" };
      const finalMsgs = [...newMsgs, assistantMsg];
      setAskMessages(finalMsgs);
      setAskStreamContent("");
      saveAskConversation(finalMsgs);
    } catch (e: any) {
      toast.error(e.message || "Failed");
      const errMsg = { role: "assistant", content: "Sorry, encountered an error. Please try again." };
      const finalMsgs = [...newMsgs, errMsg];
      setAskMessages(finalMsgs);
      saveAskConversation(finalMsgs);
    } finally {
      setAskLoading(false);
    }
  }, [askMessages, askLoading, saveAskConversation]);

  const clearAskHistory = useCallback(async () => {
    setAskMessages([]);
    if (askConvId && currentUserId) {
      await supabase
        .from("ai_cofounder_conversations")
        .delete()
        .eq("id", askConvId)
        .eq("user_id", currentUserId);
      setAskConvId(null);
    }
    toast.success("Chat history cleared");
  }, [askConvId, currentUserId]);

  const today = format(new Date(), "yyyy-MM-dd");
  const cm = format(new Date(), "yyyy-MM");

  const { data: tasks = [] } = useQuery({ queryKey: ["cofounder-tasks", today], queryFn: async () => { const { data } = await supabase.from("ai_cofounder_tasks").select("*").eq("due_date", today).order("priority").order("created_at", { ascending: false }); return data || []; } });
  const { data: targets = [] } = useQuery({ queryKey: ["team-targets", cm], queryFn: async () => { const { data } = await supabase.from("team_targets").select("*").eq("month_year", cm).order("vertical_name"); return data || []; } });
  const { data: problems = [] } = useQuery({ queryKey: ["team-problems"], queryFn: async () => { const { data } = await supabase.from("team_problems").select("*").in("status", ["open", "escalated"]).order("created_at", { ascending: false }); return data || []; } });
  const { data: pushes = [] } = useQuery({ queryKey: ["ai-pushes", today], queryFn: async () => { const { data } = await supabase.from("ai_daily_pushes").select("*").gte("created_at", `${today}T00:00:00`).order("created_at", { ascending: false }).limit(50); return data || []; } });
  const { data: risks = [] } = useQuery({ queryKey: ["ai-risks"], queryFn: async () => { const { data } = await supabase.from("ai_risk_indicators").select("*").eq("auto_resolved", false).order("created_at", { ascending: false }).limit(30); return data || []; } });
  const { data: crossSells = [] } = useQuery({ queryKey: ["ai-cross-sells"], queryFn: async () => { const { data } = await supabase.from("ai_cross_sell_suggestions").select("*").eq("status", "pending").order("potential_revenue", { ascending: false }).limit(30); return data || []; } });
  const { data: mistakeLogs = [] } = useQuery({ queryKey: ["ai-mistakes"], queryFn: async () => { const { data } = await supabase.from("ai_mistake_logs").select("*").eq("status", "detected").order("created_at", { ascending: false }).limit(20); return data || []; } });
  const { data: teamMembers = [] } = useQuery({ queryKey: ["team-members-active"], queryFn: async () => { const { data } = await supabase.from("team_members").select("*").eq("is_active", true); return data || []; } });

  const genTasks = useMutation({ mutationFn: () => callAction("suggest_tasks", { user_name: "Boss", user_role: "super_admin" }), onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["cofounder-tasks"] }); toast.success(`${d.tasks?.length || 0} tasks generated!`); } });
  const genPushes = useMutation({ mutationFn: () => callAction("generate_pushes"), onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["ai-pushes"] }); toast.success(`${d.pushes_generated || 0} reminders sent!`); } });
  const scanRisks = useMutation({ mutationFn: () => callAction("scan_risks"), onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["ai-risks"] }); toast.success(`${d.risks?.length || 0} risks detected!`); } });
  const findCrossSells = useMutation({ mutationFn: () => callAction("find_cross_sells"), onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["ai-cross-sells"] }); toast.success(`${d.suggestions?.length || 0} opportunities found!`); } });
  const detectMistakes = useMutation({ mutationFn: () => callAction("detect_mistakes"), onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["ai-mistakes"] }); toast.success(`${d.mistakes?.length || 0} issues detected!`); } });

  const updateTask = useMutation({
    mutationFn: async ({ id, action: a }: { id: string; action: "approve" | "complete" | "dismiss" }) => {
      const u: any = { status: a === "approve" ? "approved" : a === "complete" ? "completed" : "dismissed" };
      if (a === "approve") u.approved_at = new Date().toISOString();
      if (a === "complete") u.completed_at = new Date().toISOString();
      if (a === "dismiss") u.dismissed_at = new Date().toISOString();
      const { error } = await supabase.from("ai_cofounder_tasks").update(u).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cofounder-tasks"] }); toast.success("Updated"); },
  });

  const saveTarget = useMutation({
    mutationFn: () => callAction("set_targets", { target_data: [{ ...targetForm, month_year: cm }] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team-targets"] }); setShowTargetDialog(false); toast.success("Target set!"); },
  });

  const submitProblem = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("team_problems").insert({ ...problemForm, status: "open" }).select().single();
      if (error) throw error;
      return callAction("solve_problem", { problem_data: { id: data.id, description: problemForm.problem_description, reported_by: problemForm.reported_by_name, vertical: problemForm.vertical_name } });
    },
    onSuccess: (sol) => { qc.invalidateQueries({ queryKey: ["team-problems"] }); setShowProblemDialog(false); toast.success(sol.can_solve_automatically ? "AI solved it! ✅" : "Escalated to founder 📋"); },
  });

  useEffect(() => { if (activeTab === "briefing" && !briefing.content && !briefing.isStreaming) briefing.startStream("daily_briefing", { user_name: "Boss", user_role: "super_admin" }); }, [activeTab]);

  const pc: Record<string, { color: string; icon: any }> = {
    urgent: { color: "bg-red-500/10 text-red-600", icon: AlertTriangle },
    high: { color: "bg-orange-500/10 text-orange-600", icon: Zap },
    medium: { color: "bg-blue-500/10 text-blue-600", icon: Clock },
    low: { color: "bg-green-500/10 text-green-600", icon: CheckCircle2 },
  };

  const ts = { total: tasks.length, pending: tasks.filter((t: any) => t.status === "pending").length, completed: tasks.filter((t: any) => t.status === "completed").length, urgent: tasks.filter((t: any) => t.priority === "urgent").length };
  const avgAch = targets.length ? Math.round(targets.reduce((s: number, t: any) => s + Number(t.achievement_pct || 0), 0) / targets.length) : 0;

  const sevColor: Record<string, string> = { critical: "bg-red-500 text-white", high: "bg-orange-500 text-white", medium: "bg-yellow-500 text-black", low: "bg-green-500 text-white" };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg"><Brain className="h-6 w-6" /></div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">AI Co-Founder <Sparkles className="h-5 w-5 text-amber-500" /></h2>
            <p className="text-[10px] text-muted-foreground">24/7 Revenue Engine • Sales Director • CFO • Risk Radar • Team Manager • E-commerce Autopilot</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => briefing.startStream("daily_briefing", { user_name: "Boss", user_role: "founder" })}><RefreshCcw className={`h-3 w-3 ${briefing.isStreaming ? "animate-spin" : ""}`} /> Briefing</Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => genPushes.mutate()} disabled={genPushes.isPending}><Bell className="h-3 w-3" /> Push</Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => scanRisks.mutate()} disabled={scanRisks.isPending}><ShieldAlert className="h-3 w-3" /> Scan Risks</Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => findCrossSells.mutate()} disabled={findCrossSells.isPending}><Crosshair className="h-3 w-3" /> Cross-Sell</Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => detectMistakes.mutate()} disabled={detectMistakes.isPending}><Bug className="h-3 w-3" /> Mistakes</Button>
          <Button size="sm" className="gap-1 text-xs h-7 bg-gradient-to-r from-violet-600 to-purple-600" onClick={() => genTasks.mutate()} disabled={genTasks.isPending}><Rocket className="h-3 w-3" /> Generate Tasks</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5">
        {[
          { label: "Tasks", value: ts.total, icon: Target, g: "from-blue-500 to-indigo-600" },
          { label: "Pending", value: ts.pending, icon: Clock, g: "from-amber-500 to-orange-600" },
          { label: "Done", value: ts.completed, icon: CheckCircle2, g: "from-teal-500 to-cyan-600" },
          { label: "Urgent", value: ts.urgent, icon: AlertTriangle, g: ts.urgent > 0 ? "from-red-500 to-rose-600" : "from-gray-400 to-gray-500" },
          { label: "Targets", value: targets.length, icon: Target, g: "from-purple-500 to-pink-600" },
          { label: "Achievement", value: `${avgAch}%`, icon: TrendingUp, g: avgAch >= 80 ? "from-green-500 to-emerald-600" : "from-yellow-500 to-amber-600" },
          { label: "Risks", value: risks.length, icon: ShieldAlert, g: risks.length > 0 ? "from-red-500 to-rose-600" : "from-green-500 to-emerald-600" },
          { label: "Cross-Sells", value: crossSells.length, icon: Crosshair, g: "from-cyan-500 to-blue-600" },
          { label: "Mistakes", value: mistakeLogs.length, icon: Bug, g: mistakeLogs.length > 0 ? "from-orange-500 to-red-600" : "from-green-500 to-emerald-600" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
            <Card className="overflow-hidden">
              <div className={`h-0.5 bg-gradient-to-r ${s.g}`} />
              <CardContent className="pt-2 pb-1.5 flex items-center gap-1.5 px-2">
                <div className={`p-1 rounded bg-gradient-to-br ${s.g} text-white`}><s.icon className="h-3 w-3" /></div>
                <div><p className="text-xs font-bold leading-tight">{s.value}</p><p className="text-[8px] text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="briefing" className="gap-1 text-[10px]"><Sparkles className="h-3 w-3" /> Briefing</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1 text-[10px] relative"><Target className="h-3 w-3" /> Tasks {ts.pending > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[7px] rounded-full w-3 h-3 flex items-center justify-center">{ts.pending}</span>}</TabsTrigger>
            <TabsTrigger value="targets" className="gap-1 text-[10px]"><BarChart3 className="h-3 w-3" /> Targets</TabsTrigger>
            <TabsTrigger value="risks" className="gap-1 text-[10px] relative"><ShieldAlert className="h-3 w-3" /> Risk Radar {risks.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[7px] rounded-full w-3 h-3 flex items-center justify-center">{risks.length}</span>}</TabsTrigger>
            <TabsTrigger value="crosssell" className="gap-1 text-[10px]"><Crosshair className="h-3 w-3" /> Cross-Sell</TabsTrigger>
            <TabsTrigger value="mistakes" className="gap-1 text-[10px]"><Bug className="h-3 w-3" /> Mistakes</TabsTrigger>
            <TabsTrigger value="runway" className="gap-1 text-[10px]"><Landmark className="h-3 w-3" /> Runway</TabsTrigger>
            <TabsTrigger value="ecommerce" className="gap-1 text-[10px]"><ShoppingCart className="h-3 w-3" /> E-com</TabsTrigger>
            <TabsTrigger value="investor" className="gap-1 text-[10px]"><TrendingUp className="h-3 w-3" /> Investor</TabsTrigger>
            <TabsTrigger value="problems" className="gap-1 text-[10px]"><AlertCircle className="h-3 w-3" /> Problems</TabsTrigger>
            <TabsTrigger value="pushes" className="gap-1 text-[10px]"><Bell className="h-3 w-3" /> Reminders</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1 text-[10px]"><FileText className="h-3 w-3" /> Reports</TabsTrigger>
            <TabsTrigger value="ask" className="gap-1 text-[10px]"><MessageCircle className="h-3 w-3" /> Ask</TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* BRIEFING */}
        <TabsContent value="briefing" className="mt-3">
          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-500" /> {format(new Date(), "EEEE, dd MMM yyyy")} {briefing.isStreaming && <Badge variant="outline" className="text-[9px] animate-pulse">🔴 Live</Badge>}</CardTitle></CardHeader>
            <CardContent>
              {briefing.content ? <ScrollArea className="max-h-[500px]"><div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{briefing.content}</ReactMarkdown></div></ScrollArea>
              : briefing.isStreaming ? <div className="flex items-center gap-3 py-8"><div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" /><div><p className="font-medium">Analyzing business across all verticals...</p><p className="text-xs text-muted-foreground">Revenue, risks, targets, follow-ups, inventory...</p></div></div>
              : <div className="text-center py-8 text-muted-foreground"><Brain className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>Click "Briefing" to start</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks" className="mt-3 space-y-2">
          {tasks.length === 0 ? <Card><CardContent className="py-6 text-center text-muted-foreground"><Rocket className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Click "Generate Tasks" to create action plan</p></CardContent></Card>
          : <AnimatePresence>{tasks.map((t: any, i: number) => {
            const p = pc[t.priority] || pc.medium; const PI = p.icon;
            return <motion.div key={t.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className={`border-l-4 ${t.priority === "urgent" ? "border-l-red-500" : t.priority === "high" ? "border-l-orange-500" : t.priority === "medium" ? "border-l-blue-500" : "border-l-green-500"} ${t.status === "completed" ? "opacity-50" : ""}`}>
                <CardContent className="py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <div className={`p-1 rounded mt-0.5 ${p.color}`}><PI className="h-3 w-3" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <p className={`font-medium text-xs ${t.status === "completed" ? "line-through" : ""}`}>{t.title}</p>
                          <Badge variant="outline" className={`text-[7px] ${p.color}`}>{t.priority}</Badge>
                          <Badge variant="secondary" className="text-[7px]">{t.task_type?.replace(/_/g, " ")}</Badge>
                          {t.vertical && <Badge variant="outline" className="text-[7px]">{t.vertical}</Badge>}
                        </div>
                        {t.description && <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>}
                        {t.ai_suggestion && <p className="text-[10px] text-violet-600 mt-0.5 flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" /> {t.ai_suggestion}</p>}
                        {t.team_member_name && <p className="text-[9px] text-muted-foreground mt-0.5">👤 {t.team_member_name}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {t.status === "pending" && <>
                        <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 text-green-600 px-1.5" onClick={() => updateTask.mutate({ id: t.id, action: "approve" })}><ThumbsUp className="h-2.5 w-2.5" />✓</Button>
                        <Button size="sm" variant="ghost" className="h-5 px-1" onClick={() => updateTask.mutate({ id: t.id, action: "dismiss" })}><X className="h-2.5 w-2.5" /></Button>
                      </>}
                      {t.status === "approved" && <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 px-1.5" onClick={() => updateTask.mutate({ id: t.id, action: "complete" })}><CheckCircle2 className="h-2.5 w-2.5" />Done</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>;
          })}</AnimatePresence>}
        </TabsContent>

        {/* TARGETS */}
        <TabsContent value="targets" className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Monthly Targets — {format(new Date(), "MMM yyyy")}</h3>
            <Button size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowTargetDialog(true)}><Plus className="h-3 w-3" /> Set Target</Button>
          </div>
          {targets.length === 0 ? <Card><CardContent className="py-6 text-center text-muted-foreground"><Target className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Set targets to track team performance</p></CardContent></Card>
          : <div className="grid gap-2">{targets.map((t: any) => {
            const pct = Number(t.achievement_pct || 0);
            const col = pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-blue-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
            return <Card key={t.id}><CardContent className="py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2"><UserCheck className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-medium text-xs">{t.team_member_name}</span><Badge variant="outline" className="text-[8px]">{t.vertical_name}</Badge></div>
                <div className="flex items-center gap-1.5"><span className="text-xs font-bold">{pct}%</span>{pct >= 100 && <Award className="h-3.5 w-3.5 text-amber-500" />}</div>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mb-1.5"><div className={`${col} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>Deals: {t.achieved_count}/{t.target_count}</span>
                <span>₹{Number(t.achieved_revenue || 0).toLocaleString()}/₹{Number(t.target_revenue || 0).toLocaleString()}</span>
              </div>
              <Button size="sm" variant="ghost" className="h-5 text-[9px] gap-0.5 text-violet-600 mt-1 px-1" onClick={() => { coaching.reset(); setActiveTab("ask"); coaching.startStream("team_coaching", { member_name: t.team_member_name, member_vertical: t.vertical_name }); }}><Brain className="h-2.5 w-2.5" /> Coach</Button>
            </CardContent></Card>;
          })}</div>}
        </TabsContent>

        {/* RISK RADAR */}
        <TabsContent value="risks" className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Risk Radar — Live Threats</h3>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => scanRisks.mutate()} disabled={scanRisks.isPending}><Search className="h-3 w-3" /> Scan Now</Button>
          </div>
          {risks.length === 0 ? <Card><CardContent className="py-6 text-center text-muted-foreground"><ShieldAlert className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">No active risks. Click "Scan Now" to analyze.</p></CardContent></Card>
          : risks.map((r: any) => <Card key={r.id} className={`border-l-4 ${r.severity === "critical" ? "border-l-red-600" : r.severity === "high" ? "border-l-orange-500" : r.severity === "medium" ? "border-l-yellow-500" : "border-l-green-500"}`}>
            <CardContent className="py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1"><Badge className={`text-[8px] ${sevColor[r.severity] || "bg-gray-500 text-white"}`}>{r.severity?.toUpperCase()}</Badge><span className="font-medium text-xs">{r.title}</span>{r.vertical_name && <Badge variant="outline" className="text-[8px]">{r.vertical_name}</Badge>}</div>
                  <p className="text-[10px] text-muted-foreground">{r.description}</p>
                  {r.impact_amount > 0 && <p className="text-[10px] font-medium text-red-600 mt-0.5">Impact: ₹{Number(r.impact_amount).toLocaleString()}</p>}
                  {r.recommended_action && <p className="text-[10px] text-violet-600 mt-0.5">💡 {r.recommended_action}</p>}
                </div>
                <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1.5" onClick={async () => { await supabase.from("ai_risk_indicators").update({ auto_resolved: true, resolved_at: new Date().toISOString() }).eq("id", r.id); qc.invalidateQueries({ queryKey: ["ai-risks"] }); toast.success("Resolved"); }}><CheckCircle2 className="h-2.5 w-2.5" /></Button>
              </div>
            </CardContent>
          </Card>)}
        </TabsContent>

        {/* CROSS-SELL */}
        <TabsContent value="crosssell" className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Crosshair className="h-4 w-4" /> Cross-Sell Opportunities</h3>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => findCrossSells.mutate()} disabled={findCrossSells.isPending}><Search className="h-3 w-3" /> Find More</Button>
          </div>
          {crossSells.length === 0 ? <Card><CardContent className="py-6 text-center text-muted-foreground"><Crosshair className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Click "Find More" to discover opportunities</p></CardContent></Card>
          : crossSells.map((cs: any) => <Card key={cs.id} className="border-l-4 border-l-cyan-500">
            <CardContent className="py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1"><span className="font-medium text-xs">{cs.customer_name}</span>{cs.customer_phone && <span className="text-[9px] text-muted-foreground">{cs.customer_phone}</span>}</div>
                  <div className="flex items-center gap-1 text-[9px] mb-1"><Badge variant="outline" className="text-[8px]">{cs.source_vertical}</Badge><span>→</span><Badge className="text-[8px] bg-cyan-100 text-cyan-700">{cs.target_vertical}</Badge></div>
                  <p className="text-[10px]">{cs.suggestion}</p>
                  {cs.potential_revenue > 0 && <p className="text-[10px] font-medium text-green-600 mt-0.5">💰 Potential: ₹{Number(cs.potential_revenue).toLocaleString()}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5 text-green-600 px-1.5" onClick={async () => { await supabase.from("ai_cross_sell_suggestions").update({ status: "approved", actioned_at: new Date().toISOString() }).eq("id", cs.id); qc.invalidateQueries({ queryKey: ["ai-cross-sells"] }); toast.success("Approved!"); }}><ThumbsUp className="h-2.5 w-2.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-5 px-1" onClick={async () => { await supabase.from("ai_cross_sell_suggestions").update({ status: "dismissed" }).eq("id", cs.id); qc.invalidateQueries({ queryKey: ["ai-cross-sells"] }); }}><X className="h-2.5 w-2.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>)}
        </TabsContent>

        {/* MISTAKES */}
        <TabsContent value="mistakes" className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Bug className="h-4 w-4" /> Mistake Detective — Process Failures</h3>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => detectMistakes.mutate()} disabled={detectMistakes.isPending}><Search className="h-3 w-3" /> Scan</Button>
          </div>
          {mistakeLogs.length === 0 ? <Card><CardContent className="py-6 text-center text-muted-foreground"><CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">No mistakes detected. Click "Scan" to check.</p></CardContent></Card>
          : mistakeLogs.map((m: any) => <Card key={m.id} className="border-l-4 border-l-orange-500">
            <CardContent className="py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1"><Badge variant="secondary" className="text-[8px]">{m.mistake_type?.replace(/_/g, " ")}</Badge>{m.vertical_name && <Badge variant="outline" className="text-[8px]">{m.vertical_name}</Badge>}{m.team_member_name && <span className="text-[9px] text-muted-foreground">👤 {m.team_member_name}</span>}</div>
                  <p className="text-[10px]">{m.description}</p>
                  {m.impact && <p className="text-[10px] text-red-600 mt-0.5">Impact: {m.impact}</p>}
                  {m.ai_fix_suggestion && <p className="text-[10px] text-violet-600 mt-0.5">💡 Fix: {m.ai_fix_suggestion}</p>}
                </div>
                <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1.5" onClick={async () => { await supabase.from("ai_mistake_logs").update({ status: "fixed", fixed_at: new Date().toISOString(), founder_acknowledged: true }).eq("id", m.id); qc.invalidateQueries({ queryKey: ["ai-mistakes"] }); toast.success("Marked fixed"); }}><CheckCircle2 className="h-2.5 w-2.5" /></Button>
              </div>
            </CardContent>
          </Card>)}
        </TabsContent>

        {/* RUNWAY / CFO */}
        <TabsContent value="runway" className="mt-3">
          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Landmark className="h-4 w-4" /> CFO Brain — Financial Health & Runway</CardTitle></CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" className="gap-1 mb-3 text-xs" onClick={() => runway.startStream("calculate_runway")} disabled={runway.isStreaming}><DollarSign className="h-3.5 w-3.5" /> Analyze Financial Health</Button>
              {runway.content ? <ScrollArea className="max-h-[500px]"><div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{runway.content}</ReactMarkdown></div></ScrollArea>
              : runway.isStreaming ? <div className="flex items-center gap-3 py-6"><div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent" /><p className="text-sm">Calculating runway & financials...</p></div>
              : <div className="text-center py-6 text-muted-foreground"><Landmark className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Click to analyze cash flow, runway, and expenses</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* E-COMMERCE AUTOPILOT */}
        <TabsContent value="ecommerce" className="mt-3">
          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> E-Commerce Autopilot</CardTitle></CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" className="gap-1 mb-3 text-xs" onClick={() => ecommerce.startStream("ecommerce_autopilot")} disabled={ecommerce.isStreaming}><Eye className="h-3.5 w-3.5" /> Run Autopilot Scan</Button>
              {ecommerce.content ? <ScrollArea className="max-h-[500px]"><div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{ecommerce.content}</ReactMarkdown></div></ScrollArea>
              : ecommerce.isStreaming ? <div className="flex items-center gap-3 py-6"><div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent" /><p className="text-sm">Scanning inventory, pricing, fulfillment...</p></div>
              : <div className="text-center py-6 text-muted-foreground"><ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">AI will manage inventory, pricing & suggest products</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVESTOR PREP */}
        <TabsContent value="investor" className="mt-3">
          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Investor Readiness & Fundraising</CardTitle></CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" className="gap-1 mb-3 text-xs" onClick={() => investor.startStream("investor_prep")} disabled={investor.isStreaming}><Banknote className="h-3.5 w-3.5" /> Generate Investor Report</Button>
              {investor.content ? <ScrollArea className="max-h-[500px]"><div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{investor.content}</ReactMarkdown></div></ScrollArea>
              : investor.isStreaming ? <div className="flex items-center gap-3 py-6"><div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent" /><p className="text-sm">Preparing investor readiness report...</p></div>
              : <div className="text-center py-6 text-muted-foreground"><TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Get pitch metrics, investor profile & outreach templates</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROBLEMS */}
        <TabsContent value="problems" className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Team Problems</h3>
            <Button size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowProblemDialog(true)}><Plus className="h-3 w-3" /> Report</Button>
          </div>
          {problems.length === 0 ? <Card><CardContent className="py-6 text-center text-muted-foreground"><CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">No open problems 🚀</p></CardContent></Card>
          : problems.map((p: any) => <Card key={p.id} className={`border-l-4 ${p.escalated_to_founder ? "border-l-red-500" : "border-l-yellow-500"}`}>
            <CardContent className="py-2.5">
              <div className="flex items-center gap-2 mb-1"><span className="font-medium text-xs">{p.reported_by_name}</span>{p.vertical_name && <Badge variant="outline" className="text-[8px]">{p.vertical_name}</Badge>}<Badge variant={p.status === "escalated" ? "destructive" : "secondary"} className="text-[8px]">{p.status}</Badge></div>
              <p className="text-[10px]">{p.problem_description}</p>
              {p.ai_solution && <div className="mt-1.5 p-1.5 bg-violet-50 dark:bg-violet-950/30 rounded"><p className="text-[9px] font-medium text-violet-700">🧠 AI: {p.ai_solution}</p></div>}
              {p.escalated_to_founder && !p.founder_response && <Textarea placeholder="Founder's response..." className="text-xs h-14 mt-1.5" onBlur={async (e) => { if (e.target.value.trim()) { await supabase.from("team_problems").update({ founder_response: e.target.value, status: "resolved", resolved_at: new Date().toISOString() }).eq("id", p.id); qc.invalidateQueries({ queryKey: ["team-problems"] }); toast.success("Saved"); } }} />}
            </CardContent>
          </Card>)}
        </TabsContent>

        {/* PUSHES */}
        <TabsContent value="pushes" className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> Today's Reminders</h3>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => genPushes.mutate()} disabled={genPushes.isPending}><Sparkles className="h-3 w-3" /> Generate</Button>
          </div>
          {pushes.length === 0 ? <Card><CardContent className="py-6 text-center text-muted-foreground"><Bell className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">No reminders yet</p></CardContent></Card>
          : pushes.map((p: any) => <Card key={p.id}>
            <CardContent className="py-2 flex items-start gap-2">
              <div className={`p-1 rounded mt-0.5 ${p.push_type?.includes("alert") || p.push_type?.includes("risk") ? "bg-red-100 text-red-600" : p.push_type?.includes("target") ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                {p.push_type?.includes("target") ? <Target className="h-3 w-3" /> : p.push_type?.includes("alert") ? <AlertTriangle className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5"><span className="font-medium text-[10px]">{p.team_member_name}</span><Badge variant="outline" className="text-[7px]">{p.push_type?.replace(/_/g, " ")}</Badge></div>
                <p className="text-[10px] text-muted-foreground">{p.message}</p>
              </div>
            </CardContent>
          </Card>)}
        </TabsContent>

        {/* REPORTS */}
        <TabsContent value="reports" className="mt-3 space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {[{ label: "Weekly", type: "weekly", icon: FileText }, { label: "Monthly", type: "monthly", icon: BarChart3 }, { label: "Incentive", type: "incentive", icon: Award }].map(r => (
              <Button key={r.type} size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => report.startStream("generate_report", { report_type: r.type, period: cm })} disabled={report.isStreaming}><r.icon className="h-3 w-3" /> {r.label}</Button>
            ))}
          </div>
          <Card className="border-violet-200 dark:border-violet-800"><CardContent className="pt-3">
            {report.content ? <ScrollArea className="max-h-[500px]"><div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{report.content}</ReactMarkdown></div></ScrollArea>
            : report.isStreaming ? <div className="flex items-center gap-3 py-6"><div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent" /><p className="text-sm">Generating report...</p></div>
            : <div className="text-center py-6 text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Select report type</p></div>}
          </CardContent></Card>
        </TabsContent>

        {/* ASK - Persistent Chat */}
        <TabsContent value="ask" className="mt-3">
          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-violet-500" /> Ask AI Co-Founder</CardTitle>
                {askMessages.length > 0 && <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1 text-muted-foreground" onClick={clearAskHistory}><X className="h-3 w-3" /> Clear History</Button>}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Quick actions */}
              {askMessages.length === 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {["Revenue acceleration plan", "Who needs coaching?", "Cross-sell opportunities", "Investor pitch metrics", "Cost cutting suggestions", "Team performance", "Runway extension plan"].map(q => (
                    <Button key={q} variant="outline" size="sm" className="text-[9px] h-5 px-1.5" onClick={() => sendAskMessage(q)}>{q}</Button>
                  ))}
                </div>
              )}
              {/* Chat messages */}
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {askMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 mt-0.5"><Brain className="h-3.5 w-3.5 text-violet-600" /></div>}
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"}`}>
                        {msg.role === "assistant" ? <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5"><ReactMarkdown>{msg.content}</ReactMarkdown></div> : msg.content}
                      </div>
                    </div>
                  ))}
                  {askLoading && askStreamContent && (
                    <div className="flex gap-2 justify-start">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 mt-0.5"><Brain className="h-3.5 w-3.5 text-violet-600" /></div>
                      <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2 text-xs bg-muted">
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5"><ReactMarkdown>{askStreamContent}</ReactMarkdown></div>
                      </div>
                    </div>
                  )}
                  {askLoading && !askStreamContent && (
                    <div className="flex gap-2"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30"><Brain className="h-3.5 w-3.5 text-violet-600" /></div>
                      <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2"><div className="flex gap-1.5 items-center"><span className="h-1.5 w-1.5 rounded-full bg-violet-500/60 animate-bounce" style={{ animationDelay: "0ms" }} /><span className="h-1.5 w-1.5 rounded-full bg-violet-500/60 animate-bounce" style={{ animationDelay: "150ms" }} /><span className="h-1.5 w-1.5 rounded-full bg-violet-500/60 animate-bounce" style={{ animationDelay: "300ms" }} /></div></div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              {/* Coaching content */}
              {coaching.content && <ScrollArea className="max-h-[300px]"><div className="prose prose-sm dark:prose-invert max-w-none p-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl border border-violet-200 dark:border-violet-800"><p className="text-[10px] font-semibold text-violet-600 mb-1">🎯 Team Coaching</p><ReactMarkdown>{coaching.content}</ReactMarkdown></div></ScrollArea>}
              {coaching.isStreaming && !coaching.content && <div className="flex items-center gap-3 py-2"><div className="animate-spin rounded-full h-4 w-4 border-2 border-violet-500 border-t-transparent" /><p className="text-xs text-muted-foreground">Coaching...</p></div>}
              {/* Input */}
              <div className="flex gap-2 pt-1">
                <Input placeholder="Ask anything about your business..." value={question} onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && question.trim() && !askLoading) sendAskMessage(question); }} className="flex-1 text-xs" />
                <Button className="gap-1 bg-gradient-to-r from-violet-600 to-purple-600" onClick={() => sendAskMessage(question)} disabled={!question.trim() || askLoading} size="sm"><Send className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Set Target Dialog */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Set Monthly Target</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select onValueChange={(v) => { const m = teamMembers.find((m: any) => m.user_id === v || m.id === v); if (m) setTargetForm(f => ({ ...f, user_id: m.user_id || m.id, team_member_name: m.display_name || m.username })); }}>
              <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
              <SelectContent>{teamMembers.map((m: any) => <SelectItem key={m.id} value={m.user_id || m.id}>{m.display_name || m.username}</SelectItem>)}</SelectContent>
            </Select>
            <Select onValueChange={(v) => setTargetForm(f => ({ ...f, vertical_name: v }))}><SelectTrigger><SelectValue placeholder="Vertical" /></SelectTrigger>
              <SelectContent>{["Insurance","Car Sales","Self Drive","HSRP","Car Loans","Accessories","Marketing"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">Target Deals</label><Input type="number" value={targetForm.target_count} onChange={e => setTargetForm(f => ({ ...f, target_count: parseInt(e.target.value) || 0 }))} /></div>
              <div><label className="text-xs font-medium">Target Revenue (₹)</label><Input type="number" value={targetForm.target_revenue} onChange={e => setTargetForm(f => ({ ...f, target_revenue: parseInt(e.target.value) || 0 }))} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={() => saveTarget.mutate()} disabled={!targetForm.team_member_name || !targetForm.vertical_name || saveTarget.isPending}><Target className="h-4 w-4 mr-1" />{saveTarget.isPending ? "Setting..." : "Set Target & Notify"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Problem Dialog */}
      <Dialog open={showProblemDialog} onOpenChange={setShowProblemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Report Problem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Reported by" value={problemForm.reported_by_name} onChange={e => setProblemForm(f => ({ ...f, reported_by_name: e.target.value }))} />
            <Select onValueChange={(v) => setProblemForm(f => ({ ...f, vertical_name: v }))}><SelectTrigger><SelectValue placeholder="Vertical" /></SelectTrigger>
              <SelectContent>{["Insurance","Car Sales","Self Drive","HSRP","Car Loans","Accessories","General"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea placeholder="Describe the problem..." value={problemForm.problem_description} onChange={e => setProblemForm(f => ({ ...f, problem_description: e.target.value }))} />
          </div>
          <DialogFooter><Button onClick={() => submitProblem.mutate()} disabled={!problemForm.reported_by_name || !problemForm.problem_description || submitProblem.isPending}><Brain className="h-4 w-4 mr-1" />{submitProblem.isPending ? "AI Solving..." : "Submit & Let AI Solve"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
