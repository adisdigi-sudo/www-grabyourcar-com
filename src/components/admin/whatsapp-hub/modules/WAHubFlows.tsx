import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Workflow, Play, BarChart3, Clock, CheckCheck, AlertCircle, Zap, Activity } from "lucide-react";
import { WaFlowBuilder } from "../../inbox/WaFlowBuilder";
import { formatDistanceToNow } from "date-fns";

// ─── Flow Stats Dashboard ───
function FlowStats() {
  const { data } = useQuery({
    queryKey: ["flow-pro-stats"],
    queryFn: async () => {
      const { data: flows } = await supabase.from("wa_flows").select("id, is_active, total_runs, total_completions, total_failures");
      const f = flows || [];
      return {
        total: f.length,
        active: f.filter((x: any) => x.is_active).length,
        totalRuns: f.reduce((s: number, x: any) => s + (x.total_runs || 0), 0),
        completions: f.reduce((s: number, x: any) => s + (x.total_completions || 0), 0),
        failures: f.reduce((s: number, x: any) => s + (x.total_failures || 0), 0),
        successRate: (() => {
          const runs = f.reduce((s: number, x: any) => s + (x.total_runs || 0), 0);
          const comps = f.reduce((s: number, x: any) => s + (x.total_completions || 0), 0);
          return runs > 0 ? Math.round((comps / runs) * 100) : 0;
        })(),
      };
    },
    refetchInterval: 15000,
  });

  const items = [
    { label: "Total Flows", value: data?.total || 0, icon: Workflow, color: "text-primary" },
    { label: "Active", value: data?.active || 0, icon: Zap, color: "text-amber-500" },
    { label: "Total Runs", value: data?.totalRuns || 0, icon: Play, color: "text-blue-500" },
    { label: "Completed", value: data?.completions || 0, icon: CheckCheck, color: "text-green-500" },
    { label: "Failed", value: data?.failures || 0, icon: AlertCircle, color: "text-destructive" },
    { label: "Success Rate", value: `${data?.successRate || 0}%`, icon: Activity, color: "text-violet-500" },
  ];

  return (
    <div className="grid grid-cols-6 gap-2">
      {items.map((i) => (
        <Card key={i.label} className="p-3">
          <div className="flex items-center gap-2">
            <i.icon className={`h-4 w-4 ${i.color}`} />
            <div>
              <p className="text-[11px] text-muted-foreground">{i.label}</p>
              <p className="text-lg font-bold">{typeof i.value === "number" ? i.value.toLocaleString() : i.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Flow Run Logs ───
function FlowRunLogs() {
  const { data: flows } = useQuery({
    queryKey: ["flow-run-log-flows"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_flows")
        .select("id, name, is_active, trigger_type, total_runs, total_completions, total_failures, last_run_at, nodes, created_at")
        .order("last_run_at", { ascending: false, nullsFirst: false });
      return data || [];
    },
  });

  const getHealthBadge = (runs: number, failures: number) => {
    if (runs === 0) return <Badge variant="secondary" className="text-[10px]">No Runs</Badge>;
    const rate = Math.round(((runs - failures) / runs) * 100);
    if (rate >= 90) return <Badge className="bg-green-500/10 text-green-600 text-[10px]">Healthy {rate}%</Badge>;
    if (rate >= 70) return <Badge className="bg-amber-500/10 text-amber-600 text-[10px]">Warning {rate}%</Badge>;
    return <Badge className="bg-destructive/10 text-destructive text-[10px]">Critical {rate}%</Badge>;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-[55vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flow</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Nodes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead className="text-right">✓ Done</TableHead>
                <TableHead className="text-right">✗ Failed</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Last Run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(flows || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No flows created yet</TableCell>
                </TableRow>
              ) : (flows || []).map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${f.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                      <span className="font-medium text-sm">{f.name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{f.trigger_type}</Badge></TableCell>
                  <TableCell className="text-sm">{(f.nodes as any[])?.length || 0}</TableCell>
                  <TableCell>
                    <Badge variant={f.is_active ? "default" : "secondary"} className="text-[10px]">
                      {f.is_active ? "Active" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{(f.total_runs || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-green-600">{(f.total_completions || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-destructive">{(f.total_failures || 0).toLocaleString()}</TableCell>
                  <TableCell>{getHealthBadge(f.total_runs || 0, f.total_failures || 0)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {f.last_run_at ? formatDistanceToNow(new Date(f.last_run_at), { addSuffix: true }) : "Never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ─── Main Hub Flows Pro ───
export function WAHubFlows() {
  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <FlowStats />

      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="builder" className="gap-1.5 text-xs">
            <Workflow className="h-3.5 w-3.5" /> Flow Builder
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Run Logs & Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <WaFlowBuilder />
        </TabsContent>

        <TabsContent value="logs">
          <FlowRunLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
