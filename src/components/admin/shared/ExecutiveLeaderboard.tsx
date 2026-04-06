import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, TrendingUp, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ExecutiveStats {
  name: string;
  totalLeads: number;
  wonDeals: number;
  lostDeals: number;
  revenue: number;
  conversionRate: number;
}

interface TargetData {
  team_member_name: string;
  target_count: number;
  target_revenue: number;
  achieved_count: number;
  achieved_revenue: number;
  achievement_pct: number;
}

interface ExecutiveLeaderboardProps {
  /** Vertical name for fetching targets (e.g. "Insurance", "Loans") */
  verticalName: string;
  /** Current month in YYYY-MM format */
  monthYear?: string;
  /** Pre-computed executive stats from the parent dashboard */
  executiveStats: ExecutiveStats[];
}

const RANK_STYLES = [
  { icon: Trophy, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/30" },
  { icon: Medal, color: "text-slate-400", bg: "bg-slate-50 dark:bg-slate-500/10", border: "border-slate-200 dark:border-slate-500/30" },
  { icon: Award, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/30" },
];

const formatINR = (amt: number) => {
  if (!amt) return "₹0";
  if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)}Cr`;
  if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
  if (amt >= 1000) return `₹${(amt / 1000).toFixed(0)}K`;
  return `₹${amt.toLocaleString("en-IN")}`;
};

export function ExecutiveLeaderboard({ verticalName, monthYear, executiveStats }: ExecutiveLeaderboardProps) {
  const currentMonth = monthYear || format(new Date(), "yyyy-MM");

  // Fetch targets from team_targets table
  const { data: targets = [] } = useQuery({
    queryKey: ["team-targets", verticalName, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_targets")
        .select("*")
        .eq("vertical_name", verticalName)
        .eq("month_year", currentMonth);
      if (error) throw error;
      return (data || []) as TargetData[];
    },
  });

  // Merge stats with targets
  const leaderboard = useMemo(() => {
    const targetMap = new Map(targets.map(t => [t.team_member_name, t]));

    return executiveStats
      .map(exec => {
        const target = targetMap.get(exec.name);
        return {
          ...exec,
          targetCount: target?.target_count || 0,
          targetRevenue: target?.target_revenue || 0,
          achievementPct: target?.target_revenue
            ? Math.min(Math.round((exec.revenue / target.target_revenue) * 100), 999)
            : 0,
          dealAchievementPct: target?.target_count
            ? Math.min(Math.round((exec.wonDeals / target.target_count) * 100), 999)
            : 0,
          hasTarget: !!target,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [executiveStats, targets]);

  if (leaderboard.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Executive Leaderboard — {verticalName}
          </span>
          <Badge variant="outline" className="text-[10px] font-normal">{currentMonth}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Top 3 Podium */}
        {leaderboard.length >= 2 && (
          <div className="grid grid-cols-3 gap-2 px-4 pb-4">
            {leaderboard.slice(0, 3).map((exec, i) => {
              const style = RANK_STYLES[i] || RANK_STYLES[2];
              const RankIcon = style.icon;
              return (
                <div key={exec.name} className={cn("rounded-lg border p-3 text-center", style.bg, style.border)}>
                  <RankIcon className={cn("h-5 w-5 mx-auto mb-1", style.color)} />
                  <p className="text-xs font-semibold truncate" title={exec.name}>{exec.name}</p>
                  <p className="text-lg font-bold mt-1">{formatINR(exec.revenue)}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Badge className="text-[9px] h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                      {exec.wonDeals} won
                    </Badge>
                  </div>
                  {exec.hasTarget && (
                    <div className="mt-2">
                      <Progress value={Math.min(exec.achievementPct, 100)} className="h-1.5" />
                      <p className="text-[9px] text-muted-foreground mt-0.5">{exec.achievementPct}% of target</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Full Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] w-8">#</TableHead>
              <TableHead className="text-[11px]">Executive</TableHead>
              <TableHead className="text-[11px] text-center">Leads</TableHead>
              <TableHead className="text-[11px] text-center">Won</TableHead>
              <TableHead className="text-[11px] text-center">Lost</TableHead>
              <TableHead className="text-[11px] text-center">Conv %</TableHead>
              <TableHead className="text-[11px] text-right">Revenue</TableHead>
              <TableHead className="text-[11px] text-right">Target</TableHead>
              <TableHead className="text-[11px] text-center w-28">Achievement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((exec, i) => (
              <TableRow key={exec.name} className={i < 3 ? "bg-muted/20" : ""}>
                <TableCell className="text-xs font-bold text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    {i === 0 && <Trophy className="h-3 w-3 text-amber-500" />}
                    {exec.name}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-center">{exec.totalLeads}</TableCell>
                <TableCell className="text-xs text-center">
                  <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">{exec.wonDeals}</Badge>
                </TableCell>
                <TableCell className="text-xs text-center">
                  <Badge variant="destructive" className="text-[10px]">{exec.lostDeals}</Badge>
                </TableCell>
                <TableCell className="text-xs text-center font-medium">{exec.conversionRate.toFixed(1)}%</TableCell>
                <TableCell className="text-xs text-right font-semibold">{formatINR(exec.revenue)}</TableCell>
                <TableCell className="text-xs text-right text-muted-foreground">
                  {exec.hasTarget ? formatINR(exec.targetRevenue) : "—"}
                </TableCell>
                <TableCell className="text-xs text-center">
                  {exec.hasTarget ? (
                    <div className="flex items-center gap-1.5">
                      <Progress value={Math.min(exec.achievementPct, 100)} className="h-1.5 flex-1" />
                      <span className={cn(
                        "text-[10px] font-bold min-w-[32px]",
                        exec.achievementPct >= 100 ? "text-emerald-600" :
                        exec.achievementPct >= 70 ? "text-amber-600" : "text-red-500"
                      )}>
                        {exec.achievementPct}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">No target</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
