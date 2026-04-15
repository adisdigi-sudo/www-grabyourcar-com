import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Bot, Play, Clock, CheckCircle, XCircle, Loader2, MessageSquare, RefreshCw, Zap, Brain, AlertTriangle } from "lucide-react";

interface AgentConfig {
  id: string;
  agent_type: string;
  agent_name: string;
  description: string;
  is_enabled: boolean;
  schedule_description: string;
  recipient_type: string;
  recipient_phones: string[];
  last_run_at: string | null;
  last_run_status: string | null;
  total_runs: number;
}

interface AgentLog {
  id: string;
  agent_type: string;
  status: string;
  summary: string | null;
  details: Record<string, unknown> | null;
  messages_sent: number;
  error_message: string | null;
  execution_time_ms: number | null;
  started_at: string;
  completed_at: string | null;
}

const AGENT_ICONS: Record<string, string> = {
  morning_briefing: "🌅",
  evening_report: "🌙",
  stale_lead_checker: "🔔",
  auto_quote: "📄",
  weekly_pl: "📊",
};

const AGENT_COLORS: Record<string, string> = {
  morning_briefing: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
  evening_report: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30",
  stale_lead_checker: "from-red-500/20 to-rose-500/20 border-red-500/30",
  auto_quote: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
  weekly_pl: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
};

export const AutoPilotDashboard = () => {
  const queryClient = useQueryClient();
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["auto-pilot-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auto_pilot_config")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as AgentConfig[];
    },
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["auto-pilot-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auto_pilot_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as AgentLog[];
    },
  });

  const toggleAgent = useMutation({
    mutationFn: async ({ agentType, enabled }: { agentType: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("auto_pilot_config")
        .update({ is_enabled: enabled })
        .eq("agent_type", agentType);
      if (error) throw error;
    },
    onSuccess: (_, { agentType, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ["auto-pilot-config"] });
      toast.success(`${enabled ? "Enabled" : "Disabled"} agent`);
    },
    onError: () => toast.error("Failed to update agent"),
  });

  const triggerAgent = useCallback(async (agentType: string) => {
    setRunningAgent(agentType);
    try {
      const { data, error } = await supabase.functions.invoke("auto-pilot-engine", {
        body: { agent_type: agentType, manual: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.summary || "Agent completed successfully");
      queryClient.invalidateQueries({ queryKey: ["auto-pilot-config"] });
      queryClient.invalidateQueries({ queryKey: ["auto-pilot-logs"] });
    } catch (e: any) {
      toast.error(e.message || "Agent failed");
    } finally {
      setRunningAgent(null);
    }
  }, [queryClient]);

  const totalRuns = agents.reduce((s, a) => s + (a.total_runs || 0), 0);
  const activeAgents = agents.filter((a) => a.is_enabled).length;
  const lastRun = agents.reduce((latest: string | null, a) => {
    if (!a.last_run_at) return latest;
    if (!latest) return a.last_run_at;
    return a.last_run_at > latest ? a.last_run_at : latest;
  }, null);

  const totalMessages = logs.reduce((s, l) => s + (l.messages_sent || 0), 0);

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            Auto-Pilot Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered background agents working 24/7 for your business
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["auto-pilot-config"] });
            queryClient.invalidateQueries({ queryKey: ["auto-pilot-logs"] });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{activeAgents}/{agents.length}</div>
            <p className="text-xs text-muted-foreground">Active Agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{totalRuns}</div>
            <p className="text-xs text-muted-foreground">Total Runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{totalMessages}</div>
            <p className="text-xs text-muted-foreground">Messages Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold text-sm">
              {lastRun ? new Date(lastRun).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : "Never"}
            </div>
            <p className="text-xs text-muted-foreground">Last Run</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">🤖 Agents</TabsTrigger>
          <TabsTrigger value="logs">📋 Run History</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className={`bg-gradient-to-r ${AGENT_COLORS[agent.agent_type] || "from-muted to-muted"} border`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{AGENT_ICONS[agent.agent_type] || "🤖"}</span>
                      <h3 className="font-semibold text-lg">{agent.agent_name}</h3>
                      <Badge variant={agent.is_enabled ? "default" : "secondary"} className="text-xs">
                        {agent.is_enabled ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{agent.description}</p>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {agent.schedule_description}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" /> {agent.total_runs} runs
                      </span>
                      {agent.last_run_at && (
                        <span className="flex items-center gap-1">
                          {agent.last_run_status === "success" ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          Last: {new Date(agent.last_run_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {agent.recipient_type === "founder" ? "→ Founder" : "→ Team"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={agent.is_enabled}
                      onCheckedChange={(checked) =>
                        toggleAgent.mutate({ agentType: agent.agent_type, enabled: checked })
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={runningAgent === agent.agent_type}
                      onClick={() => triggerAgent(agent.agent_type)}
                    >
                      {runningAgent === agent.agent_type ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      <span className="ml-1 hidden sm:inline">Run Now</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Execution History</CardTitle>
              <CardDescription>Last 50 agent runs</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No runs yet. Trigger an agent to see results here.</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-background/50"
                      >
                        <div className="text-xl mt-0.5">
                          {AGENT_ICONS[log.agent_type] || "🤖"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm capitalize">
                              {log.agent_type.replace(/_/g, " ")}
                            </span>
                            <Badge
                              variant={log.status === "success" ? "default" : log.status === "running" ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {log.status === "success" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {log.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                              {log.status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              {log.status}
                            </Badge>
                            {log.messages_sent > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                {log.messages_sent} sent
                              </Badge>
                            )}
                          </div>
                          {log.summary && (
                            <p className="text-sm text-muted-foreground">{log.summary}</p>
                          )}
                          {log.error_message && (
                            <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3" /> {log.error_message}
                            </p>
                          )}
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{new Date(log.started_at).toLocaleString("en-IN")}</span>
                            {log.execution_time_ms && <span>{(log.execution_time_ms / 1000).toFixed(1)}s</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutoPilotDashboard;
