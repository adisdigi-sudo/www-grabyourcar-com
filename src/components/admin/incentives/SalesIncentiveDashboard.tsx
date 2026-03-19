import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import {
  Trophy, Target, TrendingUp, IndianRupee, Zap, Star, Gift, Award,
  ArrowUp, Flame, Crown, Medal
} from "lucide-react";

const fmt = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

const MOTIVATIONAL_MESSAGES = [
  { min: 0, max: 30, icon: Flame, msg: "Keep pushing! Every deal counts 🔥", color: "text-orange-500" },
  { min: 31, max: 60, icon: TrendingUp, msg: "You're building momentum! 📈", color: "text-blue-500" },
  { min: 61, max: 80, icon: Star, msg: "Almost there! Push for the bonus! ⭐", color: "text-yellow-500" },
  { min: 81, max: 100, icon: Trophy, msg: "Target achieved! Go for the extra! 🏆", color: "text-green-500" },
  { min: 101, max: 999, icon: Crown, msg: "You're a SUPERSTAR! 👑", color: "text-purple-500" },
];

export const SalesIncentiveDashboard = () => {
  const { user } = useAuth();
  const currentMonth = format(new Date(), "yyyy-MM");

  const { data: summaries = [] } = useQuery({
    queryKey: ["my-incentives", user?.id, currentMonth],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase.from("incentive_monthly_summary") as any)
        .select("*").eq("user_id", user.id).eq("month_year", currentMonth);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["my-incentive-entries", user?.id, currentMonth],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase.from("incentive_entries") as any)
        .select("*").eq("user_id", user.id).eq("month_year", currentMonth).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: kpiTarget } = useQuery({
    queryKey: ["my-kpi", user?.id, currentMonth],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase.from("kpi_targets") as any)
        .select("*").eq("user_id", user.id).eq("month_year", currentMonth).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["incentive-rules-user"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("incentive_rules") as any)
        .select("*").eq("is_active", true).neq("role_applicable", "manager");
      if (error) throw error;
      return data || [];
    },
  });

  // Leaderboard — all summaries for current month
  const { data: allSummaries = [] } = useQuery({
    queryKey: ["leaderboard", currentMonth],
    queryFn: async () => {
      const { data, error } = await (supabase.from("incentive_monthly_summary") as any)
        .select("user_id, total_incentive, total_deals").eq("month_year", currentMonth);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-names"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("user_id, name");
      if (error) throw error;
      return data || [];
    },
  });

  const totalEarned = summaries.reduce((s: number, su: any) => s + Number(su.total_incentive || 0), 0);
  const totalDeals = summaries.reduce((s: number, su: any) => s + Number(su.total_deals || 0), 0);
  const targetDeals = kpiTarget?.target_deals || 0;
  const achievementPct = targetDeals > 0 ? Math.round((totalDeals / targetDeals) * 100) : 0;

  const motivation = MOTIVATIONAL_MESSAGES.find(m => achievementPct >= m.min && achievementPct <= m.max) || MOTIVATIONAL_MESSAGES[0];
  const MotivIcon = motivation.icon;

  // Projected payout: approved + pending entries
  const projectedPayout = useMemo(() => {
    return entries.reduce((s: number, e: any) => s + Number(e.incentive_amount || 0), 0);
  }, [entries]);

  // Leaderboard ranking
  const leaderboard = useMemo(() => {
    const memberMap: Record<string, string> = {};
    teamMembers.forEach((m: any) => { if (m.user_id) memberMap[m.user_id] = m.name; });

    const grouped: Record<string, { deals: number; earned: number }> = {};
    allSummaries.forEach((s: any) => {
      if (!grouped[s.user_id]) grouped[s.user_id] = { deals: 0, earned: 0 };
      grouped[s.user_id].deals += Number(s.total_deals || 0);
      grouped[s.user_id].earned += Number(s.total_incentive || 0);
    });

    return Object.entries(grouped)
      .map(([uid, stats]) => ({ uid, name: memberMap[uid] || uid.slice(0, 8), ...stats }))
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 10);
  }, [allSummaries, teamMembers]);

  const myRank = leaderboard.findIndex(l => l.uid === user?.id) + 1;

  const getNextSlabHint = () => {
    for (const rule of rules) {
      if (rule.rule_type === "slab" && rule.slab_config) {
        const slabs = rule.slab_config as any[];
        for (const slab of slabs) {
          if (totalDeals < slab.min) {
            const dealsNeeded = slab.min - totalDeals;
            return `Close ${dealsNeeded} more deal${dealsNeeded > 1 ? "s" : ""} to earn ${fmt(slab.amount)}/deal bonus! 🎯`;
          }
        }
      }
    }
    return null;
  };

  const nextSlabHint = getNextSlabHint();

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/90 to-primary/60 p-6 text-primary-foreground"
      >
        <div className="absolute right-4 top-4 opacity-20">
          <Trophy className="h-24 w-24" />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-1">My Incentives — {format(new Date(), "MMMM yyyy")}</h1>
          <div className="flex items-center gap-2 text-lg">
            <MotivIcon className={`h-5 w-5 ${motivation.color}`} />
            <span>{motivation.msg}</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-5">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><IndianRupee className="h-4 w-4" /> Total Earned</div>
              <p className="text-3xl font-bold text-green-600 mt-1">{fmt(totalEarned)}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowUp className="h-4 w-4" /> Projected Payout</div>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(projectedPayout)}</p>
              <p className="text-[10px] text-muted-foreground">incl. pending approval</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Target className="h-4 w-4" /> Deals Closed</div>
              <p className="text-3xl font-bold mt-1">{totalDeals}</p>
              {targetDeals > 0 && <p className="text-xs text-muted-foreground">of {targetDeals} target</p>}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Award className="h-4 w-4" /> Achievement</div>
              <p className="text-3xl font-bold mt-1">{achievementPct}%</p>
              <Progress value={Math.min(achievementPct, 100)} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Medal className="h-4 w-4" /> Leaderboard Rank</div>
              <p className="text-3xl font-bold mt-1">{myRank > 0 ? `#${myRank}` : "—"}</p>
              <p className="text-[10px] text-muted-foreground">of {leaderboard.length} team members</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Next Slab Motivation Banner */}
      {nextSlabHint && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center gap-3"
        >
          <Gift className="h-6 w-6 text-yellow-600 flex-shrink-0" />
          <p className="font-medium text-yellow-800 dark:text-yellow-200">{nextSlabHint}</p>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vertical-wise Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          {summaries.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {summaries.map((s: any, i: number) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>{s.vertical_name?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                        <Badge className="bg-green-100 text-green-800">{fmt(s.total_incentive)}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Deals:</span> <strong>{s.total_deals}</strong></div>
                        <div><span className="text-muted-foreground">Value:</span> <strong>{fmt(s.total_deal_value)}</strong></div>
                        <div><span className="text-muted-foreground">Base:</span> <strong>{fmt(s.base_incentive)}</strong></div>
                        <div><span className="text-muted-foreground">Bonus:</span> <strong>{fmt(s.slab_bonus)}</strong></div>
                      </div>
                      <Badge variant="outline" className="mt-2">{s.status}</Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Deal-wise Incentive Log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal-wise Incentive Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Vertical</TableHead>
                    <TableHead>Deal Value</TableHead>
                    <TableHead>Incentive</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-sm">{e.deal_description}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{e.vertical_name}</Badge></TableCell>
                      <TableCell>{fmt(e.deal_value)}</TableCell>
                      <TableCell className="font-bold text-green-600">{fmt(e.incentive_amount)}</TableCell>
                      <TableCell>
                        <Badge className={e.status === "approved" ? "bg-green-100 text-green-800" : e.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-yellow-100 text-yellow-800"}>
                          {e.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {entries.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No incentive entries yet this month</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Team Leaderboard */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" /> Team Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {leaderboard.map((l, i) => (
                <div
                  key={l.uid}
                  className={`flex items-center gap-3 p-2 rounded-lg ${l.uid === user?.id ? "bg-primary/10 ring-1 ring-primary/20" : ""}`}
                >
                  <span className={`text-lg font-bold w-7 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.deals} deals</p>
                  </div>
                  <span className="text-sm font-bold text-green-600">{fmt(l.earned)}</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SalesIncentiveDashboard;
