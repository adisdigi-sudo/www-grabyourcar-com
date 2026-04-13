import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2, Users, Phone, Target, CheckCircle2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function MyTeamDashboard() {
  const { user } = useAdminAuth();
  const [period, setPeriod] = useState("7");
  const fromDate = useMemo(() => format(subDays(new Date(), parseInt(period)), "yyyy-MM-dd"), [period]);

  const { data: myRecord } = useQuery({
    queryKey: ["my-team-member", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("team_members").select("id, role_tier, display_name").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: directReports = [], isLoading } = useQuery({
    queryKey: ["my-direct-reports", myRecord?.id],
    queryFn: async () => {
      if (!myRecord?.id) return [];
      const { data } = await supabase.from("team_members")
        .select("id, user_id, display_name, username, designation, department, role_tier, is_active, phone")
        .eq("reporting_to", myRecord.id)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!myRecord?.id,
  });

  const teamAgentIds = useMemo(() => directReports.map(r => r.user_id).filter(Boolean), [directReports]);
  
  const { data: callLogs = [] } = useQuery({
    queryKey: ["team-call-logs", teamAgentIds, fromDate],
    queryFn: async () => {
      if (teamAgentIds.length === 0) return [];
      const { data } = await supabase.from("call_logs").select("agent_id, duration_seconds, created_at")
        .in("agent_id", teamAgentIds)
        .gte("created_at", fromDate)
        .limit(1000);
      return data || [];
    },
    enabled: teamAgentIds.length > 0,
  });

  const teamNames = useMemo(() => directReports.map(r => r.display_name || r.username).filter(Boolean), [directReports]);
  
  const { data: teamLeads = [] } = useQuery({
    queryKey: ["team-leads", teamNames, fromDate],
    queryFn: async () => {
      if (teamNames.length === 0) return [];
      const { data } = await supabase.from("leads").select("id, status, assigned_to, created_at")
        .in("assigned_to", teamNames)
        .gte("created_at", fromDate)
        .limit(1000);
      return data || [];
    },
    enabled: teamNames.length > 0,
  });

  const memberStats = useMemo(() => {
    return directReports.map(member => {
      const name = member.display_name || member.username;
      const memberCalls = callLogs.filter(c => c.agent_id === member.user_id);
      const memberLeads = teamLeads.filter(l => l.assigned_to === name);
      const converted = memberLeads.filter(l => ["won", "converted", "completed"].includes(l.status?.toLowerCase() || ""));
      return {
        ...member,
        name,
        totalCalls: memberCalls.length,
        totalCallDuration: memberCalls.reduce((s, c) => s + (c.duration_seconds || 0), 0),
        totalLeads: memberLeads.length,
        convertedLeads: converted.length,
        conversionRate: memberLeads.length > 0 ? Math.round((converted.length / memberLeads.length) * 100) : 0,
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls);
  }, [directReports, callLogs, teamLeads]);

  const chartData = memberStats.map(m => ({
    name: (m.name || "").split(" ")[0],
    calls: m.totalCalls,
    leads: m.totalLeads,
    converted: m.convertedLeads,
  }));

  const totalCalls = memberStats.reduce((s, m) => s + m.totalCalls, 0);
  const totalLeads = memberStats.reduce((s, m) => s + m.totalLeads, 0);
  const totalConverted = memberStats.reduce((s, m) => s + m.convertedLeads, 0);

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            My Team Dashboard
          </h2>
          <p className="text-muted-foreground text-sm">
            {myRecord?.role_tier === "manager" ? "All Team Leaders & their teams" : "Your direct reports' performance"}
            {" · "}{directReports.length}/10 slots used
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Today</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <Users className="h-5 w-5 mx-auto text-primary mb-1" />
          <div className="text-2xl font-bold">{directReports.length}</div>
          <div className="text-xs text-muted-foreground">Team Members</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Phone className="h-5 w-5 mx-auto text-primary mb-1" />
          <div className="text-2xl font-bold">{totalCalls}</div>
          <div className="text-xs text-muted-foreground">Total Calls</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Target className="h-5 w-5 mx-auto text-primary mb-1" />
          <div className="text-2xl font-bold">{totalLeads}</div>
          <div className="text-xs text-muted-foreground">Leads Assigned</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-primary mb-1" />
          <div className="text-2xl font-bold">{totalConverted}</div>
          <div className="text-xs text-muted-foreground">Converted</div>
        </CardContent></Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Team Performance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="calls" fill="hsl(var(--primary))" name="Calls" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leads" fill="hsl(var(--chart-2))" name="Leads" radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" fill="hsl(var(--chart-3))" name="Converted" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Individual Performance</CardTitle></CardHeader>
        <CardContent>
          {memberStats.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No direct reports assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {memberStats.map(m => (
                <div key={m.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{m.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {m.role_tier === "team_leader" ? "Team Leader" : m.designation || "Executive"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{m.department || "—"}</div>
                  </div>
                  <div className="text-center px-3">
                    <div className="text-sm font-semibold">{m.totalCalls}</div>
                    <div className="text-[10px] text-muted-foreground">Calls</div>
                  </div>
                  <div className="text-center px-3">
                    <div className="text-sm font-semibold">{m.totalLeads}</div>
                    <div className="text-[10px] text-muted-foreground">Leads</div>
                  </div>
                  <div className="text-center px-3">
                    <div className="text-sm font-semibold text-primary">{m.convertedLeads}</div>
                    <div className="text-[10px] text-muted-foreground">Won</div>
                  </div>
                  <div className="w-24">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Conv.</span>
                      <span className="text-xs font-medium">{m.conversionRate}%</span>
                    </div>
                    <Progress value={m.conversionRate} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
