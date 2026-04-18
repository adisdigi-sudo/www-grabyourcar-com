import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ReplyAgentLogs({ agentId, onBack }: { agentId: string; onBack: () => void }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["reply-agent-logs", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reply_agent_logs")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Agents
      </Button>
      <Card>
        <CardHeader><CardTitle>Activity Logs (last 100)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            logs.map((l: any) => (
              <div key={l.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={
                    l.status === "sent" ? "default" :
                    l.status === "queued_for_approval" ? "secondary" :
                    l.status === "failed" ? "destructive" : "outline"
                  }>{l.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                    {l.duration_ms ? ` · ${l.duration_ms}ms` : ""}
                  </span>
                </div>
                <div className="text-xs">
                  <p className="text-muted-foreground">From: {l.customer_phone || l.customer_email || "test"}</p>
                  <p className="mt-1"><span className="font-medium">In:</span> {l.inbound_message}</p>
                  {l.ai_reply && <p className="mt-1"><span className="font-medium">Out:</span> {l.ai_reply}</p>}
                  {l.error_message && <p className="mt-1 text-destructive">Error: {l.error_message}</p>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}