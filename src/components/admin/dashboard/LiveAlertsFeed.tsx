import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  AlertTriangle,
  TrendingDown,
  Target,
  Zap,
  Check,
  RefreshCw,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useRealtimeTable } from "@/hooks/useRealtimeSync";

const ICONS: Record<string, typeof Bell> = {
  spend_spike: TrendingDown,
  low_roi: AlertTriangle,
  target_miss: Target,
  kpi_threshold: Zap,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
  low: "bg-blue-100 text-blue-700 border-blue-300",
};

export function LiveAlertsFeed() {
  const queryClient = useQueryClient();

  useRealtimeTable("kpi_alert_events", ["kpi-alerts-feed"]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["kpi-alerts-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_alert_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data || [];
    },
  });

  const unack = useMemo(() => events.filter((e: any) => !e.acknowledged), [events]);

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("kpi_alert_events")
        .update({ acknowledged: true, acknowledged_by: u.user?.id, acknowledged_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kpi-alerts-feed"] }),
  });

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("kpi-alerts-evaluator", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(`Evaluated. ${d?.created || 0} new alerts.`);
      queryClient.invalidateQueries({ queryKey: ["kpi-alerts-feed"] });
    },
    onError: (e: any) => toast.error(e.message || "Evaluation failed"),
  });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Live Alerts
            {unack.length > 0 && (
              <Badge className="bg-red-500 text-white">{unack.length}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => evaluateMutation.mutate()}
              disabled={evaluateMutation.isPending}
            >
              <PlayCircle className={`h-3.5 w-3.5 mr-1 ${evaluateMutation.isPending ? "animate-pulse" : ""}`} />
              Run Now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["kpi-alerts-feed"] })}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
        ) : events.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No alerts triggered yet</p>
            <p className="text-xs text-muted-foreground">
              Spend spikes, low ROI, and target misses will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {events.map((e: any) => {
              const Icon = ICONS[e.alert_type] || Bell;
              return (
                <div
                  key={e.id}
                  className={`border rounded-lg p-3 transition-colors ${
                    e.acknowledged ? "opacity-60" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 ${SEVERITY_COLORS[e.severity] || ""}`}
                        >
                          <Icon className="h-2.5 w-2.5 mr-1" />
                          {e.alert_type.replace(/_/g, " ")}
                        </Badge>
                        {e.vertical_name && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            {e.vertical_name}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{e.title}</p>
                      {e.message && (
                        <p className="text-xs text-muted-foreground mt-0.5">{e.message}</p>
                      )}
                      {(e.metric_value !== null || e.threshold_value !== null) && (
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                          {e.metric_value !== null && (
                            <span>
                              Actual:{" "}
                              <span className="font-semibold text-foreground">
                                {Number(e.metric_value).toLocaleString("en-IN")}
                              </span>
                            </span>
                          )}
                          {e.threshold_value !== null && (
                            <span>
                              Threshold:{" "}
                              <span className="font-semibold text-foreground">
                                {Number(e.threshold_value).toLocaleString("en-IN")}
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                      {Array.isArray(e.notify_roles) && e.notify_roles.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">Notifies:</span>
                          {e.notify_roles.map((r: string) => (
                            <Badge key={r} variant="secondary" className="text-[9px] py-0 px-1.5">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {!e.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 shrink-0"
                        onClick={() => ackMutation.mutate(e.id)}
                      >
                        <Check className="h-3 w-3 mr-1" /> Ack
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LiveAlertsFeed;
