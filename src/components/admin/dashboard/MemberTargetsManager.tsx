import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users2,
  Plus,
  Target,
  IndianRupee,
  TrendingUp,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
} from "date-fns";

type Period = "week" | "month" | "quarter";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

function periodKeyFor(period: Period, ref = new Date()) {
  if (period === "week") {
    const start = startOfWeek(ref, { weekStartsOn: 1 });
    return { key: `W-${format(start, "yyyy-'W'II")}`, from: start, to: endOfWeek(ref, { weekStartsOn: 1 }), label: `Week of ${format(start, "dd MMM")}` };
  }
  if (period === "quarter") {
    const start = startOfQuarter(ref);
    const q = Math.floor(ref.getMonth() / 3) + 1;
    return { key: `Q${q}-${format(start, "yyyy")}`, from: start, to: endOfQuarter(ref), label: `Q${q} ${format(start, "yyyy")}` };
  }
  const start = startOfMonth(ref);
  return { key: format(start, "yyyy-MM"), from: start, to: endOfMonth(ref), label: format(start, "MMMM yyyy") };
}

interface Member {
  user_id: string;
  name: string;
  vertical_name: string | null;
}

export function MemberTargetsManager() {
  const [period, setPeriod] = useState<Period>("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const queryClient = useQueryClient();
  const meta = useMemo(() => periodKeyFor(period), [period]);

  const { data: members = [] } = useQuery({
    queryKey: ["targets-members"],
    queryFn: async (): Promise<Member[]> => {
      const { data } = await supabase
        .from("crm_users")
        .select("auth_user_id,name,vertical_slug,is_active")
        .eq("is_active", true)
        .not("auth_user_id", "is", null)
        .order("name");
      return (data || []).map((u: any) => ({
        user_id: u.auth_user_id,
        name: u.name,
        vertical_name: u.vertical_slug,
      }));
    },
  });

  const { data: targets = [], refetch } = useQuery({
    queryKey: ["member-targets", period, meta.key],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_targets")
        .select("*")
        .eq("period_type", period)
        .eq("period_key", meta.key)
        .neq("team_member_name", "Vertical Target")
        .order("team_member_name");
      return data || [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["member-deals", meta.from.toISOString(), meta.to.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("assigned_to,deal_value,payment_received_amount,closed_at")
        .gte("closed_at", meta.from.toISOString())
        .lte("closed_at", meta.to.toISOString());
      return data || [];
    },
  });

  const memberStats = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    deals.forEach((d: any) => {
      const k = d.assigned_to || "_";
      const v = map.get(k) || { count: 0, revenue: 0 };
      v.count += 1;
      v.revenue += Number(d.payment_received_amount || d.deal_value || 0);
      map.set(k, v);
    });
    return targets.map((t: any) => {
      const stats = map.get(t.user_id) || { count: 0, revenue: 0 };
      const pct = Number(t.target_revenue) > 0 ? Math.round((stats.revenue / Number(t.target_revenue)) * 100) : 0;
      return { ...t, achieved_revenue_live: stats.revenue, achieved_count_live: stats.count, achievement_pct: pct };
    });
  }, [targets, deals]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_targets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Target removed");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["member-targets"] });
    },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
  });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users2 className="h-4 w-4 text-primary" />
            Per-Member Targets
            <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
                <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                <TabsTrigger value="quarter" className="text-xs">Quarter</TabsTrigger>
              </TabsList>
            </Tabs>
            <SetMemberTargetDialog
              open={dialogOpen}
              onOpenChange={(o) => {
                setDialogOpen(o);
                if (!o) setEditing(null);
              }}
              members={members}
              period={period}
              periodKey={meta.key}
              periodLabel={meta.label}
              editing={editing}
              onSaved={() => {
                refetch();
                queryClient.invalidateQueries({ queryKey: ["member-targets"] });
              }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {memberStats.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
            <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No member targets for {meta.label}</p>
            <p className="text-xs text-muted-foreground mb-3">
              Set individual {period}ly targets to track per-person achievement
            </p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Set First Target
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {memberStats.map((t: any) => (
              <div
                key={t.id}
                className="border rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{t.team_member_name}</span>
                    {t.vertical_name && (
                      <Badge variant="outline" className="text-[9px] py-0">
                        {t.vertical_name}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[9px] py-0 ${
                        t.achievement_pct >= 100
                          ? "bg-green-100 text-green-700 border-green-300"
                          : t.achievement_pct >= 70
                          ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                          : "bg-red-100 text-red-700 border-red-300"
                      }`}
                    >
                      {t.achievement_pct}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>
                      {formatINR(t.achieved_revenue_live)}{" "}
                      <span className="opacity-60">/ {formatINR(Number(t.target_revenue))}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setEditing(t);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (confirm(`Delete target for ${t.team_member_name}?`))
                          deleteMutation.mutate(t.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Progress value={Math.min(t.achievement_pct, 100)} className="h-1.5" />
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span>
                    {t.achieved_count_live} / {t.target_count || "—"} deals
                  </span>
                  {t.notes && <span className="italic truncate">{t.notes}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SetMemberTargetDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  members: Member[];
  period: Period;
  periodKey: string;
  periodLabel: string;
  editing: any;
  onSaved: () => void;
}

function SetMemberTargetDialog({
  open,
  onOpenChange,
  members,
  period,
  periodKey,
  periodLabel,
  editing,
  onSaved,
}: SetMemberTargetDialogProps) {
  const [memberId, setMemberId] = useState<string>(editing?.user_id || "");
  const [revenue, setRevenue] = useState<string>(editing?.target_revenue?.toString() || "");
  const [count, setCount] = useState<string>(editing?.target_count?.toString() || "");
  const [notes, setNotes] = useState<string>(editing?.notes || "");

  useMemo(() => {
    if (editing) {
      setMemberId(editing.user_id);
      setRevenue(editing.target_revenue?.toString() || "");
      setCount(editing.target_count?.toString() || "");
      setNotes(editing.notes || "");
    } else {
      setMemberId("");
      setRevenue("");
      setCount("");
      setNotes("");
    }
  }, [editing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const member = members.find((m) => m.user_id === memberId);
      if (!member) throw new Error("Pick a team member");

      const payload: any = {
        user_id: memberId,
        team_member_name: member.name,
        vertical_name: member.vertical_name || "general",
        period_type: period,
        period_key: periodKey,
        month_year: periodKey,
        target_type: "deals",
        target_count: Number(count) || 0,
        target_revenue: Number(revenue) || 0,
        set_by: "founder",
        notes: notes || null,
        status: "active",
      };

      const { error } = await supabase
        .from("team_targets")
        .upsert(payload, { onConflict: "user_id,vertical_name,period_type,period_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Target saved for ${periodLabel}`);
      onSaved();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8" onClick={() => onOpenChange(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Set Member Target
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" /> {editing ? "Edit" : "Set"} Member Target — {periodLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Team Member</Label>
            <Select value={memberId} onValueChange={setMemberId} disabled={!!editing}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.name} {m.vertical_name ? `· ${m.vertical_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <IndianRupee className="h-3 w-3" /> Target Revenue
              </Label>
              <Input
                type="number"
                placeholder="200000"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Target Deals
              </Label>
              <Input
                type="number"
                placeholder="10"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              placeholder="e.g. Focus on EVs"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !memberId}
          >
            {saveMutation.isPending ? "Saving..." : "Save Target"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MemberTargetsManager;
