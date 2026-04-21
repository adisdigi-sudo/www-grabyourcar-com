import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Crown, Target, TrendingUp, Trophy, Plus, IndianRupee, Calendar, Download, MessageSquare, Settings2, Send } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, startOfQuarter, startOfWeek, endOfMonth, endOfQuarter, endOfWeek } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { downloadFounderReportPDF } from "@/lib/founderReportPDF";

type Period = "week" | "month" | "quarter";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

interface Vertical {
  id: string;
  name: string;
  slug: string;
}

export function FounderCommandCenter() {
  const [period, setPeriod] = useState<Period>("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const periodMeta = useMemo(() => {
    const now = new Date();
    if (period === "week") {
      const from = startOfWeek(now, { weekStartsOn: 1 });
      return { from, to: endOfWeek(now, { weekStartsOn: 1 }), label: "This Week", monthYear: format(from, "yyyy-MM") };
    }
    if (period === "quarter") {
      const from = startOfQuarter(now);
      return { from, to: endOfQuarter(now), label: "This Quarter", monthYear: format(from, "yyyy-MM") };
    }
    const from = startOfMonth(now);
    return { from, to: endOfMonth(now), label: format(now, "MMMM yyyy"), monthYear: format(now, "yyyy-MM") };
  }, [period]);

  const { data: verticals = [] } = useQuery({
    queryKey: ["founder-verticals"],
    queryFn: async (): Promise<Vertical[]> => {
      const { data } = await supabase
        .from("business_verticals")
        .select("id,name,slug")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: targets = [], refetch: refetchTargets } = useQuery({
    queryKey: ["team-targets", periodMeta.monthYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_targets")
        .select("*")
        .eq("month_year", periodMeta.monthYear)
        .order("vertical_name");
      return data || [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["founder-deals", periodMeta.from.toISOString(), periodMeta.to.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("vertical_name,deal_value,payment_received_amount,payment_status,closed_at,assigned_to")
        .gte("closed_at", periodMeta.from.toISOString())
        .lte("closed_at", periodMeta.to.toISOString());
      return data || [];
    },
  });

  const { data: incentiveSummary = [] } = useQuery({
    queryKey: ["incentive-summary", periodMeta.monthYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("incentive_monthly_summary")
        .select("*")
        .eq("month_year", periodMeta.monthYear)
        .order("total_incentive", { ascending: false });
      return data || [];
    },
  });

  // Compute per-vertical achievements from deals
  const verticalStats = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    deals.forEach((d: any) => {
      const v = d.vertical_name || "Unknown";
      const existing = map.get(v) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += Number(d.payment_received_amount || d.deal_value || 0);
      map.set(v, existing);
    });
    return verticals.map((v) => {
      const target = targets.find((t: any) => t.vertical_name === v.name || t.vertical_name === v.slug);
      const stats = map.get(v.name) || map.get(v.slug) || { count: 0, revenue: 0 };
      const targetRev = Number(target?.target_revenue || 0);
      const targetCount = Number(target?.target_count || 0);
      const pctRev = targetRev > 0 ? Math.round((stats.revenue / targetRev) * 100) : 0;
      const pctCount = targetCount > 0 ? Math.round((stats.count / targetCount) * 100) : 0;
      return {
        vertical: v,
        target,
        achievedCount: stats.count,
        achievedRevenue: stats.revenue,
        targetCount,
        targetRevenue: targetRev,
        pctRev,
        pctCount,
        achievement: targetRev > 0 ? pctRev : pctCount,
      };
    });
  }, [verticals, deals, targets]);

  const totals = useMemo(() => {
    return verticalStats.reduce(
      (acc, v) => ({
        targetRev: acc.targetRev + v.targetRevenue,
        achievedRev: acc.achievedRev + v.achievedRevenue,
        targetCount: acc.targetCount + v.targetCount,
        achievedCount: acc.achievedCount + v.achievedCount,
      }),
      { targetRev: 0, achievedRev: 0, targetCount: 0, achievedCount: 0 },
    );
  }, [verticalStats]);

  const overallPct = totals.targetRev > 0 ? Math.round((totals.achievedRev / totals.targetRev) * 100) : 0;

  const topPerformers = useMemo(() => {
    return [...incentiveSummary]
      .sort((a: any, b: any) => Number(b.total_incentive || 0) - Number(a.total_incentive || 0))
      .slice(0, 5);
  }, [incentiveSummary]);

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-primary" />
            Founder Command Center
            <Badge variant="outline" className="ml-2 text-xs">{periodMeta.label}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs">Weekly</TabsTrigger>
                <TabsTrigger value="month" className="text-xs">Monthly</TabsTrigger>
                <TabsTrigger value="quarter" className="text-xs">Quarterly</TabsTrigger>
              </TabsList>
            </Tabs>
            <SetTargetDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              verticals={verticals}
              monthYear={periodMeta.monthYear}
              periodLabel={periodMeta.label}
              onSaved={() => {
                refetchTargets();
                queryClient.invalidateQueries({ queryKey: ["team-targets"] });
              }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Top KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-primary/30">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Target Revenue</p>
              <p className="text-lg font-bold text-primary">{formatINR(totals.targetRev)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Achieved</p>
              <p className="text-lg font-bold">{formatINR(totals.achievedRev)}</p>
            </CardContent>
          </Card>
          <Card className={overallPct >= 100 ? "bg-green-500/10 border-green-500/30" : overallPct >= 70 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-red-500/10 border-red-500/30"}>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Achievement</p>
              <p className={`text-lg font-bold ${overallPct >= 100 ? "text-green-700" : overallPct >= 70 ? "text-yellow-700" : "text-red-700"}`}>
                {overallPct}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Deals Closed</p>
              <p className="text-lg font-bold">
                {totals.achievedCount}<span className="text-sm text-muted-foreground">/{totals.targetCount || "—"}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Per-vertical breakdown */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-1">
              <Target className="h-3.5 w-3.5" /> Per-Vertical Performance
            </h4>
            <span className="text-[10px] text-muted-foreground">{verticalStats.filter(v => v.targetRevenue > 0).length} of 11 verticals have targets</span>
          </div>
          <div className="space-y-2">
            {verticalStats.map((v) => (
              <div key={v.vertical.id} className="border rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{v.vertical.name}</span>
                    {v.targetRevenue > 0 ? (
                      <Badge
                        variant="outline"
                        className={`text-[9px] py-0 ${
                          v.achievement >= 100 ? "bg-green-100 text-green-700 border-green-300"
                          : v.achievement >= 70 ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                          : "bg-red-100 text-red-700 border-red-300"
                        }`}
                      >
                        {v.achievement}%
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] py-0 text-muted-foreground">No target set</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{formatINR(v.achievedRevenue)} <span className="opacity-60">/ {v.targetRevenue > 0 ? formatINR(v.targetRevenue) : "—"}</span></span>
                    <span>{v.achievedCount} <span className="opacity-60">/ {v.targetCount || "—"} deals</span></span>
                  </div>
                </div>
                <Progress value={Math.min(v.achievement, 100)} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
              <Trophy className="h-3.5 w-3.5 text-yellow-500" /> Top Performers ({periodMeta.label})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {topPerformers.map((p: any, idx: number) => (
                <div key={p.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? "bg-yellow-500/20 text-yellow-700"
                      : idx === 1 ? "bg-muted text-foreground"
                      : idx === 2 ? "bg-orange-500/20 text-orange-700"
                      : "bg-muted text-muted-foreground"
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.employee_name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.vertical_name} · {p.total_deals} deals</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">{formatINR(Number(p.total_incentive || 0))}</p>
                    <p className="text-[10px] text-muted-foreground">incentive</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {targets.length === 0 && (
          <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
            <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No targets set for {periodMeta.label}</p>
            <p className="text-xs text-muted-foreground mb-3">Set per-vertical revenue and deal targets to track team performance</p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Set First Target
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SetTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verticals: Vertical[];
  monthYear: string;
  periodLabel: string;
  onSaved: () => void;
}

function SetTargetDialog({ open, onOpenChange, verticals, monthYear, periodLabel, onSaved }: SetTargetDialogProps) {
  const [verticalName, setVerticalName] = useState<string>("");
  const [targetRevenue, setTargetRevenue] = useState<string>("");
  const [targetCount, setTargetCount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!verticalName) throw new Error("Select a vertical");
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const payload = {
        user_id: userId,
        team_member_name: "Vertical Target",
        vertical_name: verticalName,
        month_year: monthYear,
        target_type: "deals",
        target_count: Number(targetCount) || 0,
        target_revenue: Number(targetRevenue) || 0,
        set_by: "super_admin",
        notes: notes || null,
        status: "active",
      };

      const { error } = await supabase
        .from("team_targets")
        .upsert(payload, { onConflict: "user_id,vertical_name,month_year" });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Target set for ${verticalName} (${periodLabel})`);
      setVerticalName("");
      setTargetRevenue("");
      setTargetCount("");
      setNotes("");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save target"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> Set Target
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" /> Set Vertical Target — {periodLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Vertical</Label>
            <Select value={verticalName} onValueChange={setVerticalName}>
              <SelectTrigger><SelectValue placeholder="Select vertical" /></SelectTrigger>
              <SelectContent>
                {verticals.map((v) => (
                  <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Target Revenue</Label>
              <Input type="number" placeholder="500000" value={targetRevenue} onChange={(e) => setTargetRevenue(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Target Deals</Label>
              <Input type="number" placeholder="50" value={targetCount} onChange={(e) => setTargetCount(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Input placeholder="e.g. Focus on EV insurance" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Period: {monthYear}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !verticalName}>
            {saveMutation.isPending ? "Saving..." : "Save Target"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
