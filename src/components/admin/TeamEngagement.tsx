import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Trophy, Medal, Target, TrendingUp, Phone, Users, Star, Award, Flame, Zap } from "lucide-react";
import { useVerticalAccess } from "@/hooks/useVerticalAccess";

const PERIODS = [
  { value: "7", label: "Last 7 Days" },
  { value: "14", label: "Last 14 Days" },
  { value: "30", label: "Last 30 Days" },
];

export const TeamEngagement = () => {
  const [period, setPeriod] = useState("7");
  const { activeVertical } = useVerticalAccess();
  const daysAgo = new Date(Date.now() - parseInt(period) * 86400000).toISOString();

  // Fetch call logs for leaderboard
  const { data: callLogs } = useQuery({
    queryKey: ["team-calls", period, activeVertical?.id],
    queryFn: async () => {
      let q = supabase
        .from("call_logs")
        .select("agent_id, disposition, duration_seconds")
        .gte("created_at", daysAgo);
      if (activeVertical?.id) q = q.eq("vertical_id", activeVertical.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch team members
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Build leaderboard
  const leaderboard = (() => {
    if (!callLogs || !teamMembers) return [];
    const map: Record<string, { calls: number; connected: number; duration: number; conversions: number }> = {};
    callLogs.forEach((log) => {
      if (!map[log.agent_id]) map[log.agent_id] = { calls: 0, connected: 0, duration: 0, conversions: 0 };
      map[log.agent_id].calls++;
      if (log.disposition === "connected") map[log.agent_id].connected++;
      if (log.disposition === "callback_requested") map[log.agent_id].conversions++;
      map[log.agent_id].duration += log.duration_seconds || 0;
    });

    return Object.entries(map)
      .map(([agentId, stats]) => {
        const member = teamMembers.find((m) => m.user_id === agentId);
        return {
          agentId,
          name: member?.display_name || "Unknown Agent",
          designation: member?.designation || "Agent",
          ...stats,
          avgDuration: stats.calls > 0 ? Math.round(stats.duration / stats.calls) : 0,
          score: stats.calls * 1 + stats.connected * 3 + stats.conversions * 10,
        };
      })
      .sort((a, b) => b.score - a.score);
  })();

  const topAgent = leaderboard[0];
  const totalCalls = leaderboard.reduce((s, a) => s + a.calls, 0);
  const totalConnected = leaderboard.reduce((s, a) => s + a.connected, 0);
  const totalConversions = leaderboard.reduce((s, a) => s + a.conversions, 0);

  const getRankIcon = (i: number) => {
    if (i === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (i === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (i === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">#{i + 1}</span>;
  };

  const getRankBadge = (i: number) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-yellow-500" />
            Team Engagement
          </h1>
          <p className="text-muted-foreground mt-1">Leaderboards, targets & performance tracking</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Phone className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{totalCalls}</p>
              <p className="text-xs text-muted-foreground">Total Calls</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Zap className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{totalConnected}</p>
              <p className="text-xs text-muted-foreground">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalConversions}</p>
              <p className="text-xs text-muted-foreground">Conversions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{leaderboard.length}</p>
              <p className="text-xs text-muted-foreground">Active Agents</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performer Spotlight */}
      {topAgent && (
        <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Trophy className="h-7 w-7 text-yellow-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">{topAgent.name}</h3>
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">🏆 Top Performer</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{topAgent.designation}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span><strong>{topAgent.calls}</strong> calls</span>
                  <span><strong>{topAgent.connected}</strong> connected</span>
                  <span><strong>{topAgent.conversions}</strong> conversions</span>
                  <span><strong>{topAgent.score}</strong> pts</span>
                </div>
              </div>
              <Flame className="h-10 w-10 text-orange-400 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="leaderboard">
        <TabsList>
          <TabsTrigger value="leaderboard">🏆 Leaderboard</TabsTrigger>
          <TabsTrigger value="targets">🎯 Targets</TabsTrigger>
          <TabsTrigger value="achievements">⭐ Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Agent Rankings</CardTitle></CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No call data for this period</p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((agent, i) => (
                    <div key={agent.agentId} className={`flex items-center gap-3 p-3 rounded-lg border ${i < 3 ? "bg-accent/30" : ""}`}>
                      <div className="shrink-0">{getRankIcon(i)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{agent.name} {getRankBadge(i)}</p>
                          <Badge variant="outline" className="text-[10px]">{agent.designation}</Badge>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{agent.calls} calls</span>
                          <span>{agent.connected} connected</span>
                          <span>{agent.conversions} conv.</span>
                          <span>{Math.floor(agent.avgDuration / 60)}m {agent.avgDuration % 60}s avg</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-primary">{agent.score}</p>
                        <p className="text-[10px] text-muted-foreground">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Daily Targets</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Calls Made", current: totalCalls, target: leaderboard.length * 30, icon: Phone },
                { label: "Connected", current: totalConnected, target: leaderboard.length * 15, icon: Zap },
                { label: "Conversions", current: totalConversions, target: leaderboard.length * 3, icon: Target },
              ].map((t) => {
                const pct = t.target > 0 ? Math.min(100, Math.round((t.current / t.target) * 100)) : 0;
                return (
                  <div key={t.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <t.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{t.label}</span>
                      </div>
                      <span className="text-sm">
                        <strong>{t.current}</strong> / {t.target}
                        <Badge variant={pct >= 100 ? "default" : "outline"} className="ml-2 text-[10px]">{pct}%</Badge>
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { title: "First Call", desc: "Made first call in the system", icon: Phone, earned: totalCalls > 0 },
              { title: "Call Warrior", desc: "50+ calls in a period", icon: Flame, earned: totalCalls >= 50 },
              { title: "Conversion King", desc: "10+ conversions", icon: Trophy, earned: totalConversions >= 10 },
              { title: "Perfect Connect", desc: "80%+ connect rate", icon: Zap, earned: totalCalls > 0 && (totalConnected / totalCalls) > 0.8 },
              { title: "Team Player", desc: "5+ active agents", icon: Users, earned: leaderboard.length >= 5 },
              { title: "Revenue Driver", desc: "Generated ₹1L+ value", icon: Star, earned: false },
            ].map((ach) => (
              <Card key={ach.title} className={`${ach.earned ? "border-primary/30 bg-primary/5" : "opacity-50"}`}>
                <CardContent className="p-4 text-center">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${ach.earned ? "bg-primary/10" : "bg-muted"}`}>
                    <ach.icon className={`h-6 w-6 ${ach.earned ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <p className="font-semibold text-sm">{ach.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{ach.desc}</p>
                  {ach.earned && <Badge className="mt-2 bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">✅ Earned</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamEngagement;
