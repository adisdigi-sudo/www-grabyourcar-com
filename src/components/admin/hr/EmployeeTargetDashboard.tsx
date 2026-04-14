import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Target, Trophy, TrendingUp, Star, Flame, Award, Plus, IndianRupee,
  BarChart3, Gift, Rocket, Zap, Crown, Medal
} from "lucide-react";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
const initials = (n: string) => n?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";
const cm = format(new Date(), "yyyy-MM");

const ENCOURAGEMENTS = [
  { min: 100, icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10", msg: "🏆 Champion! Target crushed!" },
  { min: 80, icon: Trophy, color: "text-green-600", bg: "bg-green-500/10", msg: "🔥 On fire! Almost there!" },
  { min: 60, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-500/10", msg: "💪 Great momentum, keep going!" },
  { min: 40, icon: Rocket, color: "text-purple-600", bg: "bg-purple-500/10", msg: "🚀 Picking up speed!" },
  { min: 20, icon: Zap, color: "text-amber-600", bg: "bg-amber-500/10", msg: "⚡ Good start, time to accelerate!" },
  { min: 0, icon: Flame, color: "text-red-600", bg: "bg-red-500/10", msg: "🎯 Let's get started! Every deal counts!" },
];

const getEncouragement = (pct: number) => ENCOURAGEMENTS.find(e => pct >= e.min) || ENCOURAGEMENTS[ENCOURAGEMENTS.length - 1];

export const EmployeeTargetDashboard = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showSetTarget, setShowSetTarget] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [period, setPeriod] = useState("monthly");
  const [monthYear, setMonthYear] = useState(cm);

  const { data: employees = [] } = useQuery({
    queryKey: ["emp-profiles-targets"],
    queryFn: async () => {
      const { data } = await (supabase.from("employee_profiles") as any).select("*").eq("is_active", true).order("full_name");
      return data || [];
    },
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["all-targets", monthYear],
    queryFn: async () => {
      const { data } = await (supabase.from("team_targets") as any).select("*").eq("month_year", monthYear).order("team_member_name");
      return data || [];
    },
  });

  const { data: incentiveSummaries = [] } = useQuery({
    queryKey: ["incentive-summaries", monthYear],
    queryFn: async () => {
      const { data } = await (supabase.from("incentive_monthly_summary") as any).select("*").eq("month_year", monthYear).order("employee_name");
      return data || [];
    },
  });

  const { data: incentiveRules = [] } = useQuery({
    queryKey: ["incentive-rules-active"],
    queryFn: async () => {
      const { data } = await (supabase.from("incentive_rules") as any).select("*").eq("is_active", true).order("vertical_name");
      return data || [];
    },
  });

  const setTarget = useMutation({
    mutationFn: async () => {
      if (!form.team_member_name || !form.target_count) throw new Error("Fill all required fields");
      const { error } = await (supabase.from("team_targets") as any).upsert({
        team_member_name: form.team_member_name,
        vertical_name: form.vertical_name || "all",
        month_year: form.month_year || monthYear,
        target_count: Number(form.target_count),
        target_revenue: Number(form.target_revenue || 0),
      }, { onConflict: "team_member_name,vertical_name,month_year" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-targets"] });
      setShowSetTarget(false);
      setForm({});
      toast.success("Target set! 🎯");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Combine targets with incentive data
  const enrichedTargets = useMemo(() => {
    return targets.map((t: any) => {
      const inc = incentiveSummaries.find((i: any) =>
        i.employee_name === t.team_member_name && i.vertical_name === t.vertical_name
      );
      const achieved = Number(inc?.total_deals || t.achieved_count || 0);
      const target = Number(t.target_count || 1);
      const pct = Math.min(Math.round((achieved / target) * 100), 200);
      return { ...t, achieved, pct, incentive: inc?.total_incentive || 0, status: inc?.status };
    });
  }, [targets, incentiveSummaries]);

  const totalTargetDeals = targets.reduce((s: number, t: any) => s + Number(t.target_count || 0), 0);
  const totalAchieved = enrichedTargets.reduce((s: number, t: any) => s + t.achieved, 0);
  const totalIncentive = enrichedTargets.reduce((s: number, t: any) => s + Number(t.incentive || 0), 0);
  const overallPct = totalTargetDeals > 0 ? Math.round((totalAchieved / totalTargetDeals) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Input type="month" value={monthYear} onChange={e => setMonthYear(e.target.value)} className="w-44" />
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList className="h-9">
              <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
              <TabsTrigger value="quarterly" className="text-xs">Quarterly</TabsTrigger>
              <TabsTrigger value="yearly" className="text-xs">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button onClick={() => setShowSetTarget(true)}><Plus className="h-4 w-4 mr-2" /> Set Target</Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Target className="h-5 w-5 text-primary" /><span className="text-xs text-muted-foreground">Total Target</span></div>
            <p className="text-2xl font-bold">{totalTargetDeals} deals</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Trophy className="h-5 w-5 text-green-600" /><span className="text-xs text-muted-foreground">Achieved</span></div>
            <p className="text-2xl font-bold text-green-600">{totalAchieved} deals</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><BarChart3 className="h-5 w-5 text-amber-600" /><span className="text-xs text-muted-foreground">Achievement</span></div>
            <p className="text-2xl font-bold text-amber-600">{overallPct}%</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500/5 to-violet-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><IndianRupee className="h-5 w-5 text-violet-600" /><span className="text-xs text-muted-foreground">Total Incentive</span></div>
            <p className="text-2xl font-bold text-violet-600">{fmt(totalIncentive)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Incentive Schemes */}
      {incentiveRules.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Gift className="h-4 w-4" /> Active Incentive Schemes</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {incentiveRules.map((rule: any) => (
                <div key={rule.id} className="border rounded-lg p-3 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{rule.rule_name}</p>
                    <Badge variant="outline" className="text-[10px]">{rule.vertical_name}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{rule.rule_type} — {rule.role_applicable || "all"}</p>
                  {rule.rule_type === "fixed" && <p className="text-sm font-bold text-green-600 mt-1">{fmt(rule.fixed_amount)} per deal</p>}
                  {rule.rule_type === "percentage" && <p className="text-sm font-bold text-green-600 mt-1">{rule.percentage}% of deal value</p>}
                  {rule.rule_type === "slab" && rule.slab_config?.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {rule.slab_config.slice(0, 3).map((s: any, i: number) => (
                        <p key={i} className="text-xs">{s.min}-{s.max} deals → {fmt(s.amount)}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Progress */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Employee Progress — {monthYear}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {enrichedTargets.length > 0 ? enrichedTargets.map((t: any) => {
            const enc = getEncouragement(t.pct);
            const Icon = enc.icon;
            return (
              <div key={t.id} className={`border rounded-xl p-4 ${enc.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(t.team_member_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{t.team_member_name}</p>
                      <p className="text-xs text-muted-foreground">{t.vertical_name} • {t.achieved}/{t.target_count} deals</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className={`text-xl font-bold ${enc.color}`}>{t.pct}%</p>
                      {t.incentive > 0 && <p className="text-xs text-green-600 font-medium">{fmt(t.incentive)} earned</p>}
                    </div>
                    <Icon className={`h-8 w-8 ${enc.color}`} />
                  </div>
                </div>
                <Progress value={Math.min(t.pct, 100)} className="h-3 mb-2" />
                <p className="text-sm font-medium">{enc.msg}</p>
                {t.pct < 100 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.target_count - t.achieved} more deals to go! Revenue target: {fmt(t.target_revenue || 0)}
                  </p>
                )}
              </div>
            );
          }) : (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No targets set for {monthYear}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowSetTarget(true)}>
                Set First Target
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Set Target Dialog */}
      <Dialog open={showSetTarget} onOpenChange={setShowSetTarget}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Set Employee Target</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select onValueChange={v => setForm(p => ({ ...p, team_member_name: v }))} value={form.team_member_name || ""}>
                <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.full_name}>{e.full_name} — {e.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vertical</Label>
              <Select onValueChange={v => setForm(p => ({ ...p, vertical_name: v }))} value={form.vertical_name || ""}>
                <SelectTrigger><SelectValue placeholder="Select vertical..." /></SelectTrigger>
                <SelectContent>
                  {["car_sales", "insurance", "car_loans", "self_drive", "hsrp", "accessories"].map(v => (
                    <SelectItem key={v} value={v}>{v.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Month</Label><Input type="month" value={form.month_year || monthYear} onChange={e => setForm(p => ({ ...p, month_year: e.target.value }))} /></div>
              <div><Label>Target Deals</Label><Input type="number" placeholder="e.g. 10" value={form.target_count || ""} onChange={e => setForm(p => ({ ...p, target_count: e.target.value }))} /></div>
            </div>
            <div><Label>Target Revenue (₹)</Label><Input type="number" placeholder="e.g. 500000" value={form.target_revenue || ""} onChange={e => setForm(p => ({ ...p, target_revenue: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSetTarget(false); setForm({}); }}>Cancel</Button>
            <Button onClick={() => setTarget.mutate()} disabled={setTarget.isPending}>
              <Target className="h-4 w-4 mr-2" /> Set Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeTargetDashboard;
