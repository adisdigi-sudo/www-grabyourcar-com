import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, ArrowUpRight, Users, ChevronRight } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  self: "Assigned",
  team_leader: "Team Leader",
  manager: "Manager",
  hr: "HR",
  founder: "Founder",
};

const TIER_COLORS: Record<string, string> = {
  self: "bg-gray-100 text-gray-700",
  team_leader: "bg-blue-100 text-blue-700",
  manager: "bg-orange-100 text-orange-700",
  hr: "bg-purple-100 text-purple-700",
  founder: "bg-red-100 text-red-700",
};

interface TaskEscalationViewProps {
  userRole?: string;
  userName?: string;
}

export function TaskEscalationView({ userRole, userName }: TaskEscalationViewProps) {
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["escalated-tasks", filter],
    queryFn: async () => {
      let q = supabase
        .from("ai_cofounder_tasks")
        .select("*")
        .in("status", ["pending", "approved"])
        .eq("is_overdue", true)
        .order("escalation_level", { ascending: false })
        .order("due_date", { ascending: true })
        .limit(100);

      if (filter !== "all") {
        q = q.eq("visibility_tier", filter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_cofounder_tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalated-tasks"] });
      toast.success("Task completed ✅");
    },
  });

  const triggerEscalation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("task-escalation-engine", {
        body: { action: "check_escalations" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["escalated-tasks"] });
      toast.success(`Escalation check: ${data.summary}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const grouped = tasks.reduce((acc: Record<string, any[]>, t: any) => {
    const tier = t.visibility_tier || "self";
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="font-semibold text-lg">Task Escalations</h3>
          <Badge variant="destructive" className="text-xs">{tasks.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {Object.entries(TIER_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(userRole === "super_admin" || userRole === "admin") && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={() => triggerEscalation.mutate()}
              disabled={triggerEscalation.isPending}
            >
              <ArrowUpRight className="h-3 w-3" />
              Run Check
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No overdue tasks! Sab sahi chal raha hai ✅</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => {
            const tiers = Object.keys(TIER_LABELS);
            return tiers.indexOf(b) - tiers.indexOf(a);
          })
          .map(([tier, tierTasks]) => (
            <div key={tier} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={`${TIER_COLORS[tier] || ""} text-xs border-0`}>
                  {TIER_LABELS[tier] || tier}
                </Badge>
                <span className="text-xs text-muted-foreground">{tierTasks.length} tasks</span>
              </div>
              {tierTasks.map((task: any) => {
                const dueDate = task.due_date ? new Date(task.due_date) : null;
                const daysOverdue = dueDate ? Math.ceil((Date.now() - dueDate.getTime()) / 86400000) : 0;
                const chain = task.escalation_chain || [];

                return (
                  <Card key={task.id} className="border-destructive/30 hover:shadow-sm transition-all">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {task.team_member_name && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Users className="h-3 w-3" />
                                {task.team_member_name}
                              </span>
                            )}
                            {dueDate && (
                              <Badge variant="destructive" className="text-[9px] py-0">
                                {daysOverdue}d overdue
                              </Badge>
                            )}
                            {task.vertical && (
                              <Badge variant="outline" className="text-[9px] py-0">{task.vertical}</Badge>
                            )}
                            <Badge variant="outline" className="text-[9px] py-0 capitalize">{task.priority}</Badge>
                          </div>
                          {chain.length > 0 && (
                            <div className="flex items-center gap-0.5 mt-1.5 flex-wrap">
                              <span className="text-[9px] text-muted-foreground">Escalation:</span>
                              {chain.map((c: any, i: number) => (
                                <span key={i} className="flex items-center text-[9px]">
                                  {i > 0 && <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />}
                                  <span className="text-muted-foreground">{c.escalated_to}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] gap-1 ml-2 shrink-0"
                          onClick={() => completeTask.mutate(task.id)}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Done
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))
      )}
    </div>
  );
}
