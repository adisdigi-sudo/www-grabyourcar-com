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
  FileText, Bell, Award, BarChart3, UserCheck, AlertCircle, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-cofounder`;

function useStream() {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const startStream = useCallback(async (action: string, extras: any = {}) => {
    setContent("");
    setIsStreaming(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ action, ...extras }),
      });
      if (!resp.ok || !resp.body) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `Error ${resp.status}`); }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", accumulated = "";
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
          try { const t = JSON.parse(j).choices?.[0]?.delta?.content; if (t) { accumulated += t; setContent(accumulated); } } catch {}
        }
      }
    } catch (e: any) { toast.error(e.message || "Failed"); } finally { setIsStreaming(false); }
  }, []);

  return { content, isStreaming, startStream, reset: () => setContent("") };
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
  const insight = useStream();
  const report = useStream();
  const coaching = useStream();
  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = format(new Date(), "yyyy-MM");

  // Tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["cofounder-tasks", today],
    queryFn: async () => {
      const { data } = await supabase.from("ai_cofounder_tasks").select("*").eq("due_date", today).order("priority").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Targets
  const { data: targets = [] } = useQuery({
    queryKey: ["team-targets", currentMonth],
    queryFn: async () => {
      const { data } = await supabase.from("team_targets").select("*").eq("month_year", currentMonth).order("vertical_name");
      return data || [];
    },
  });

  // Problems
  const { data: problems = [] } = useQuery({
    queryKey: ["team-problems"],
    queryFn: async () => {
      const { data } = await supabase.from("team_problems").select("*").in("status", ["open", "escalated"]).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Pushes
  const { data: pushes = [] } = useQuery({
    queryKey: ["ai-pushes", today],
    queryFn: async () => {
      const { data } = await supabase.from("ai_daily_pushes").select("*").gte("created_at", `${today}T00:00:00`).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  // Team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-active"],
    queryFn: async () => {
      const { data } = await supabase.from("team_members").select("*").eq("is_active", true);
      return data || [];
    },
  });

  const generateTasks = useMutation({
    mutationFn: async () => {
      const r = await fetch(CHAT_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }, body: JSON.stringify({ action: "suggest_tasks", user_name: "Boss", user_role: "founder" }) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["cofounder-tasks"] }); toast.success(`${d.tasks?.length || 0} tasks generated!`); },
    onError: (e: any) => toast.error(e.message),
  });

  const generatePushes = useMutation({
    mutationFn: async () => {
      const r = await fetch(CHAT_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }, body: JSON.stringify({ action: "generate_pushes" }) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["ai-pushes"] }); toast.success(`${d.pushes_generated || 0} reminders sent!`); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "complete" | "dismiss" }) => {
      const update: any = { status: action === "approve" ? "approved" : action === "complete" ? "completed" : "dismissed" };
      if (action === "approve") update.approved_at = new Date().toISOString();
      if (action === "complete") update.completed_at = new Date().toISOString();
      if (action === "dismiss") update.dismissed_at = new Date().toISOString();
      const { error } = await supabase.from("ai_cofounder_tasks").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cofounder-tasks"] }); toast.success("Updated"); },
  });

  const saveTarget = useMutation({
    mutationFn: async () => {
      const r = await fetch(CHAT_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ action: "set_targets", target_data: [{ ...targetForm, month_year: currentMonth }] }) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team-targets"] }); setShowTargetDialog(false); toast.success("Target set & team notified!"); },
  });

  const submitProblem = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("team_problems").insert({ ...problemForm, status: "open" }).select().single();
      if (error) throw error;
      // Ask AI to solve
      const r = await fetch(CHAT_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ action: "solve_problem", problem_data: { id: data.id, description: problemForm.problem_description, reported_by: problemForm.reported_by_name, vertical: problemForm.vertical_name } }) });
      return r.json();
    },
    onSuccess: (sol) => {
      qc.invalidateQueries({ queryKey: ["team-problems"] });
      setShowProblemDialog(false);
      if (sol.can_solve_automatically) toast.success("AI solved it automatically! ✅");
      else toast.info("Escalated to founder for decision 📋");
    },
  });

  useEffect(() => {
    if (activeTab === "briefing" && !briefing.content && !briefing.isStreaming) {
      briefing.startStream("daily_briefing", { user_name: "Boss", user_role: "founder" });
    }
  }, [activeTab]);

  const priorityConfig: Record<string, { color: string; icon: any }> = {
    urgent: { color: "bg-red-500/10 text-red-600 border-red-200", icon: AlertTriangle },
    high: { color: "bg-orange-500/10 text-orange-600 border-orange-200", icon: Zap },
    medium: { color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: Clock },
    low: { color: "bg-green-500/10 text-green-600 border-green-200", icon: CheckCircle2 },
  };

  const taskStats = {
    total: tasks.length, pending: tasks.filter((t: any) => t.status === "pending").length,
    approved: tasks.filter((t: any) => t.status === "approved").length,
    completed: tasks.filter((t: any) => t.status === "completed").length,
    urgent: tasks.filter((t: any) => t.priority === "urgent").length,
  };

  const avgAchievement = targets.length > 0 ? Math.round(targets.reduce((s: number, t: any) => s + Number(t.achievement_pct || 0), 0) / targets.length) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg"><Brain className="h-6 w-6" /></div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">AI Co-Founder <Sparkles className="h-5 w-5 text-amber-500" /></h2>
            <p className="text-xs text-muted-foreground">Strategic partner • Team manager • Personal assistant • Problem solver</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => briefing.startStream("daily_briefing", { user_name: "Boss", user_role: "founder" })}>
            <RefreshCcw className={`h-3.5 w-3.5 ${briefing.isStreaming ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => generatePushes.mutate()} disabled={generatePushes.isPending}>
            <Bell className={`h-3.5 w-3.5 ${generatePushes.isPending ? "animate-bounce" : ""}`} /> Push Reminders
          </Button>
          <Button size="sm" className="gap-1 bg-gradient-to-r from-violet-600 to-purple-600" onClick={() => generateTasks.mutate()} disabled={generateTasks.isPending}>
            <Rocket className={`h-3.5 w-3.5 ${generateTasks.isPending ? "animate-bounce" : ""}`} /> Generate Tasks
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: "Tasks Today", value: taskStats.total, icon: Target, gradient: "from-blue-500 to-indigo-600" },
          { label: "Pending", value: taskStats.pending, icon: Clock, gradient: "from-amber-500 to-orange-600" },
          { label: "Completed", value: taskStats.completed, icon: CheckCircle2, gradient: "from-teal-500 to-cyan-600" },
          { label: "Urgent", value: taskStats.urgent, icon: AlertTriangle, gradient: taskStats.urgent > 0 ? "from-red-500 to-rose-600" : "from-gray-400 to-gray-500" },
          { label: "Targets Set", value: targets.length, icon: Target, gradient: "from-purple-500 to-pink-600" },
          { label: "Avg Achievement", value: `${avgAchievement}%`, icon: TrendingUp, gradient: avgAchievement >= 80 ? "from-green-500 to-emerald-600" : "from-yellow-500 to-amber-600" },
          { label: "Open Problems", value: problems.length, icon: AlertCircle, gradient: problems.length > 0 ? "from-red-500 to-rose-600" : "from-green-500 to-emerald-600" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${s.gradient}`} />
              <CardContent className="pt-2.5 pb-2 flex items-center gap-2">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${s.gradient} text-white`}><s.icon className="h-3.5 w-3.5" /></div>
                <div>
                  <p className="text-sm font-bold leading-tight">{s.value}</p>
                  <p className="text-[9px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="briefing" className="gap-1 text-xs"><Sparkles className="h-3 w-3" /> Briefing</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1 text-xs relative">
            <Target className="h-3 w-3" /> Tasks
            {taskStats.pending > 0 && <span className="absolute -top-1 -right-0.5 bg-red-500 text-white text-[7px] rounded-full w-3.5 h-3.5 flex items-center justify-center">{taskStats.pending}</span>}
          </TabsTrigger>
          <TabsTrigger value="targets" className="gap-1 text-xs"><BarChart3 className="h-3 w-3" /> Targets</TabsTrigger>
          <TabsTrigger value="problems" className="gap-1 text-xs relative">
            <AlertCircle className="h-3 w-3" /> Problems
            {problems.length > 0 && <span className="absolute -top-1 -right-0.5 bg-orange-500 text-white text-[7px] rounded-full w-3.5 h-3.5 flex items-center justify-center">{problems.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="pushes" className="gap-1 text-xs"><Bell className="h-3 w-3" /> Reminders</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1 text-xs"><FileText className="h-3 w-3" /> Reports</TabsTrigger>
          <TabsTrigger value="ask" className="gap-1 text-xs"><MessageCircle className="h-3 w-3" /> Ask</TabsTrigger>
        </TabsList>

        {/* BRIEFING */}
        <TabsContent value="briefing" className="mt-4">
          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" /> {format(new Date(), "EEEE, dd MMMM yyyy")} — Daily Briefing
                {briefing.isStreaming && <Badge variant="outline" className="text-[10px] animate-pulse">🔴 Live</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {briefing.content ? (
                <ScrollArea className="max-h-[500px]"><div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{briefing.content}</ReactMarkdown></div></ScrollArea>
              ) : briefing.isStreaming ? (
                <div className="flex items-center gap-3 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
                  <div><p className="font-medium">AI Co-Founder is analyzing your business...</p><p className="text-xs text-muted-foreground">Scanning leads, targets, renewals, orders...</p></div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground"><Brain className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>Click "Refresh" to get today's briefing</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks" className="mt-4 space-y-3">
          {tasks.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground"><Rocket className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>No tasks yet. Click "Generate Tasks" to create an action plan.</p></CardContent></Card>
          ) : (
            <AnimatePresence>
              {tasks.map((task: any, i: number) => {
                const pc = priorityConfig[task.priority] || priorityConfig.medium;
                const PIcon = pc.icon;
                return (
                  <motion.div key={task.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                    <Card className={`border-l-4 ${task.priority === "urgent" ? "border-l-red-500" : task.priority === "high" ? "border-l-orange-500" : task.priority === "medium" ? "border-l-blue-500" : "border-l-green-500"} ${task.status === "completed" ? "opacity-60" : ""}`}>
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-1.5 rounded-lg mt-0.5 ${pc.color}`}><PIcon className="h-3.5 w-3.5" /></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={`font-medium text-sm ${task.status === "completed" ? "line-through" : ""}`}>{task.title}</p>
                                <Badge variant="outline" className={`text-[8px] ${pc.color}`}>{task.priority}</Badge>
                                <Badge variant="secondary" className="text-[8px]">{task.task_type?.replace(/_/g, " ")}</Badge>
                                {task.vertical && <Badge variant="outline" className="text-[8px]">{task.vertical}</Badge>}
                                <Badge variant={task.status === "completed" ? "default" : "secondary"} className="text-[8px]">{task.status}</Badge>
                              </div>
                              {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
                              {task.ai_suggestion && <p className="text-xs text-violet-600 mt-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> {task.ai_suggestion}</p>}
                              {task.team_member_name && <p className="text-[10px] text-muted-foreground mt-1">👤 {task.team_member_name}</p>}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {task.status === "pending" && (
                              <>
                                <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 text-green-600" onClick={() => updateTask.mutate({ id: task.id, action: "approve" })}><ThumbsUp className="h-3 w-3" /> Approve</Button>
                                <Button size="sm" variant="ghost" className="h-6" onClick={() => updateTask.mutate({ id: task.id, action: "dismiss" })}><X className="h-3 w-3" /></Button>
                              </>
                            )}
                            {task.status === "approved" && (
                              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => updateTask.mutate({ id: task.id, action: "complete" })}><CheckCircle2 className="h-3 w-3" /> Done</Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </TabsContent>

        {/* TARGETS */}
        <TabsContent value="targets" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4" /> Monthly Targets — {format(new Date(), "MMMM yyyy")}</h3>
            <Button size="sm" className="gap-1" onClick={() => setShowTargetDialog(true)}><Plus className="h-3.5 w-3.5" /> Set Target</Button>
          </div>
          
          {targets.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground"><Target className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>No targets set yet. Set targets for your team to start tracking.</p></CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {targets.map((t: any) => {
                const pct = Number(t.achievement_pct || 0);
                const color = pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-blue-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
                return (
                  <Card key={t.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{t.team_member_name}</span>
                          <Badge variant="outline" className="text-[9px]">{t.vertical_name}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{pct}%</span>
                          {pct >= 100 && <Award className="h-4 w-4 text-amber-500" />}
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mb-2">
                        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Deals: {t.achieved_count}/{t.target_count}</span>
                        <span>Revenue: ₹{Number(t.achieved_revenue || 0).toLocaleString()}/₹{Number(t.target_revenue || 0).toLocaleString()}</span>
                      </div>
                      <div className="mt-2">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-violet-600"
                          onClick={() => { coaching.reset(); setActiveTab("ask"); coaching.startStream("team_coaching", { member_name: t.team_member_name, member_vertical: t.vertical_name }); }}>
                          <Brain className="h-3 w-3" /> AI Coach This Member
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* PROBLEMS */}
        <TabsContent value="problems" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Team Problems & Escalations</h3>
            <Button size="sm" className="gap-1" onClick={() => setShowProblemDialog(true)}><Plus className="h-3.5 w-3.5" /> Report Problem</Button>
          </div>
          
          {problems.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground"><CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>No open problems! Team is running smooth 🚀</p></CardContent></Card>
          ) : (
            problems.map((p: any) => (
              <Card key={p.id} className={`border-l-4 ${p.escalated_to_founder ? "border-l-red-500" : p.ai_solved ? "border-l-green-500" : "border-l-yellow-500"}`}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{p.reported_by_name}</span>
                        {p.vertical_name && <Badge variant="outline" className="text-[9px]">{p.vertical_name}</Badge>}
                        <Badge variant={p.status === "escalated" ? "destructive" : p.status === "ai_resolved" ? "default" : "secondary"} className="text-[9px]">{p.status}</Badge>
                      </div>
                      <p className="text-sm">{p.problem_description}</p>
                      {p.ai_solution && (
                        <div className="mt-2 p-2 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
                          <p className="text-xs font-medium text-violet-700 dark:text-violet-300 flex items-center gap-1"><Brain className="h-3 w-3" /> AI Solution:</p>
                          <p className="text-xs mt-1">{p.ai_solution}</p>
                        </div>
                      )}
                      {p.escalated_to_founder && !p.founder_response && (
                        <div className="mt-2">
                          <Textarea placeholder="Founder's response..." className="text-xs h-16" onBlur={async (e) => {
                            if (e.target.value.trim()) {
                              await supabase.from("team_problems").update({ founder_response: e.target.value, status: "resolved", resolved_at: new Date().toISOString() }).eq("id", p.id);
                              qc.invalidateQueries({ queryKey: ["team-problems"] });
                              toast.success("Response saved!");
                            }
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* PUSHES / REMINDERS */}
        <TabsContent value="pushes" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4" /> Today's Reminders & Pushes</h3>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => generatePushes.mutate()} disabled={generatePushes.isPending}>
              <Sparkles className="h-3.5 w-3.5" /> Generate New
            </Button>
          </div>
          {pushes.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground"><Bell className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>No reminders yet. Click "Push Reminders" to generate.</p></CardContent></Card>
          ) : (
            pushes.map((p: any) => (
              <Card key={p.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-2.5 flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg mt-0.5 ${p.push_type === "target_push" ? "bg-purple-100 text-purple-600" : p.push_type === "renewal_alert" ? "bg-red-100 text-red-600" : p.push_type === "follow_up" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}>
                    {p.push_type === "target_push" ? <Target className="h-3.5 w-3.5" /> : p.push_type === "renewal_alert" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">{p.team_member_name}</span>
                      <Badge variant="outline" className="text-[8px]">{p.push_type?.replace(/_/g, " ")}</Badge>
                      {p.vertical_name && <Badge variant="secondary" className="text-[8px]">{p.vertical_name}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.message}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* REPORTS */}
        <TabsContent value="reports" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => report.startStream("generate_report", { report_type: "weekly", period: currentMonth })} disabled={report.isStreaming}>
              <FileText className="h-3.5 w-3.5" /> Weekly Report
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => report.startStream("generate_report", { report_type: "monthly", period: currentMonth })} disabled={report.isStreaming}>
              <BarChart3 className="h-3.5 w-3.5" /> Monthly Report
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => report.startStream("generate_report", { report_type: "incentive", period: currentMonth })} disabled={report.isStreaming}>
              <Award className="h-3.5 w-3.5" /> Incentive Report
            </Button>
          </div>
          <Card className="border-violet-200 dark:border-violet-800">
            <CardContent className="pt-4">
              {report.content ? (
                <ScrollArea className="max-h-[500px]"><div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{report.content}</ReactMarkdown></div></ScrollArea>
              ) : report.isStreaming ? (
                <div className="flex items-center gap-3 py-6"><div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent" /><p className="text-sm">Generating report...</p></div>
              ) : (
                <div className="text-center py-8 text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>Select a report type to generate</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASK CO-FOUNDER */}
        <TabsContent value="ask" className="mt-4">
          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-violet-500" /> Ask Your AI Co-Founder</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Ask anything... targets, strategy, coaching, problems..." value={question} onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && question.trim()) { insight.startStream("quick_insight", { question, user_name: "Boss", user_role: "founder" }); } }} className="flex-1" />
                <Button className="gap-1 bg-gradient-to-r from-violet-600 to-purple-600" onClick={() => insight.startStream("quick_insight", { question, user_name: "Boss", user_role: "founder" })} disabled={!question.trim() || insight.isStreaming}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["How to hit ₹10L this week?", "Team performance review", "Who needs coaching?", "Cross-sell opportunities", "Incentive calculation"].map(q => (
                  <Button key={q} variant="outline" size="sm" className="text-[10px] h-6" onClick={() => { setQuestion(q); insight.startStream("quick_insight", { question: q, user_name: "Boss", user_role: "founder" }); }}>{q}</Button>
                ))}
              </div>
              {(insight.content || coaching.content) ? (
                <ScrollArea className="max-h-[400px]"><div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/30 rounded-xl"><ReactMarkdown>{insight.content || coaching.content}</ReactMarkdown></div></ScrollArea>
              ) : (insight.isStreaming || coaching.isStreaming) ? (
                <div className="flex items-center gap-3 py-6"><div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent" /><p className="text-sm text-muted-foreground">Thinking like a founder...</p></div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Set Target Dialog */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Set Monthly Target</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select onValueChange={(v) => {
              const m = teamMembers.find((m: any) => m.user_id === v || m.id === v);
              if (m) setTargetForm(f => ({ ...f, user_id: m.user_id || m.id, team_member_name: m.full_name }));
            }}>
              <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
              <SelectContent>{teamMembers.map((m: any) => <SelectItem key={m.id} value={m.user_id || m.id}>{m.full_name}</SelectItem>)}</SelectContent>
            </Select>
            <Select onValueChange={(v) => setTargetForm(f => ({ ...f, vertical_name: v }))}>
              <SelectTrigger><SelectValue placeholder="Select vertical" /></SelectTrigger>
              <SelectContent>
                {["Insurance", "Car Sales", "Self Drive", "HSRP", "Car Loans", "Accessories", "Marketing"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">Target Deals</label><Input type="number" value={targetForm.target_count} onChange={e => setTargetForm(f => ({ ...f, target_count: parseInt(e.target.value) || 0 }))} /></div>
              <div><label className="text-xs font-medium">Target Revenue (₹)</label><Input type="number" value={targetForm.target_revenue} onChange={e => setTargetForm(f => ({ ...f, target_revenue: parseInt(e.target.value) || 0 }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => saveTarget.mutate()} disabled={!targetForm.team_member_name || !targetForm.vertical_name || saveTarget.isPending} className="gap-1">
              <Target className="h-4 w-4" /> {saveTarget.isPending ? "Setting..." : "Set Target & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Problem Dialog */}
      <Dialog open={showProblemDialog} onOpenChange={setShowProblemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Report Team Problem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Reported by (name)" value={problemForm.reported_by_name} onChange={e => setProblemForm(f => ({ ...f, reported_by_name: e.target.value }))} />
            <Select onValueChange={(v) => setProblemForm(f => ({ ...f, vertical_name: v }))}>
              <SelectTrigger><SelectValue placeholder="Vertical (optional)" /></SelectTrigger>
              <SelectContent>
                {["Insurance", "Car Sales", "Self Drive", "HSRP", "Car Loans", "Accessories", "General"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Describe the problem..." value={problemForm.problem_description} onChange={e => setProblemForm(f => ({ ...f, problem_description: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button onClick={() => submitProblem.mutate()} disabled={!problemForm.reported_by_name || !problemForm.problem_description || submitProblem.isPending} className="gap-1">
              <Brain className="h-4 w-4" /> {submitProblem.isPending ? "AI Solving..." : "Submit & Let AI Solve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
