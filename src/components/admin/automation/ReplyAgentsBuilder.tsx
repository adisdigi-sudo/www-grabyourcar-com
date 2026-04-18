import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bot, Plus, Pencil, Trash2, Activity, MessageSquare, Mail } from "lucide-react";
import { toast } from "sonner";
import { ReplyAgentForm } from "./ReplyAgentForm";
import { ReplyAgentLogs } from "./ReplyAgentLogs";

export function ReplyAgentsBuilder() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [logsAgentId, setLogsAgentId] = useState<string | null>(null);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["reply-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reply_agents")
        .select("*, business_verticals(name, slug, color)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("reply_agents")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reply-agents"] });
      toast.success("Agent updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAgent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reply_agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reply-agents"] });
      toast.success("Agent deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (creating || editingId) {
    return (
      <ReplyAgentForm
        agentId={editingId}
        onClose={() => {
          setCreating(false);
          setEditingId(null);
          qc.invalidateQueries({ queryKey: ["reply-agents"] });
        }}
      />
    );
  }

  if (logsAgentId) {
    return (
      <ReplyAgentLogs
        agentId={logsAgentId}
        onBack={() => setLogsAgentId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Reply Agents
          </h2>
          <p className="text-sm text-muted-foreground">
            Build form-based AI agents that auto-reply on WhatsApp & Email — manage them yourself.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Agent
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent></Card>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold">No agents yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first AI reply agent to start automating customer conversations.
            </p>
            <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-2" />Create First Agent</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((a) => (
            <Card key={a.id} className={!a.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{a.name}</CardTitle>
                    {a.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                    )}
                  </div>
                  <Switch
                    checked={a.is_active}
                    onCheckedChange={(v) => toggleActive.mutate({ id: a.id, is_active: v })}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="secondary" className="gap-1">
                    {a.channel === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                    {a.channel}
                  </Badge>
                  {a.business_verticals?.name && (
                    <Badge variant="outline">{a.business_verticals.name}</Badge>
                  )}
                  <Badge variant={a.auto_send ? "default" : "outline"}>
                    {a.auto_send ? "Auto-send" : "Approval"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                  <div>
                    <div className="font-bold text-base">{a.total_runs ?? 0}</div>
                    <div className="text-muted-foreground">Runs</div>
                  </div>
                  <div>
                    <div className="font-bold text-base text-green-600">{a.total_replies_sent ?? 0}</div>
                    <div className="text-muted-foreground">Sent</div>
                  </div>
                  <div>
                    <div className="font-bold text-base text-orange-600">{a.total_approvals_pending ?? 0}</div>
                    <div className="text-muted-foreground">Pending</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingId(a.id)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setLogsAgentId(a.id)}>
                    <Activity className="h-3 w-3 mr-1" /> Logs
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete agent "${a.name}"?`)) deleteAgent.mutate(a.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}