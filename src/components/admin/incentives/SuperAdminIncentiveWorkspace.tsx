import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Trophy, Check, CheckCheck, DollarSign, Users, TrendingUp, Calculator, Send, Eye, Settings, RefreshCw } from "lucide-react";

const VERTICALS = [
  { value: "car_sales", label: "Car Sales" },
  { value: "insurance", label: "Insurance" },
  { value: "car_loans", label: "Car Loans" },
];

const STATUS_COLORS: Record<string, string> = {
  calculated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  sent_to_accounts: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const SuperAdminIncentiveWorkspace = () => {
  const qc = useQueryClient();
  const currentMonth = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedVertical, setSelectedVertical] = useState("all");
  const [showRules, setShowRules] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  // ── Queries ──
  const { data: summaries = [] } = useQuery({
    queryKey: ["admin-incentive-summaries", selectedMonth, selectedVertical],
    queryFn: async () => {
      let q = (supabase.from("incentive_monthly_summary") as any).select("*").eq("month_year", selectedMonth).order("total_incentive", { ascending: false });
      if (selectedVertical !== "all") q = q.eq("vertical_name", selectedVertical);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: managerBonuses = [] } = useQuery({
    queryKey: ["admin-manager-bonuses", selectedMonth],
    queryFn: async () => {
      const { data, error } = await (supabase.from("manager_bonus_tracking") as any).select("*").eq("month_year", selectedMonth);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["incentive-rules-all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("incentive_rules") as any).select("*").order("vertical_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["incentive-entries-detail", showDetail?.user_id, showDetail?.vertical_name, selectedMonth],
    queryFn: async () => {
      if (!showDetail) return [];
      const { data, error } = await (supabase.from("incentive_entries") as any)
        .select("*").eq("user_id", showDetail.user_id).eq("vertical_name", showDetail.vertical_name).eq("month_year", selectedMonth);
      if (error) throw error;
      return data || [];
    },
    enabled: !!showDetail,
  });

  // ── Computed ──
  const grandTotal = summaries.reduce((s: number, e: any) => s + Number(e.total_incentive || 0), 0);
  const mgrTotal = managerBonuses.reduce((s: number, e: any) => s + Number(e.bonus_amount || 0), 0);
  const pendingApproval = summaries.filter((s: any) => s.status === "calculated" || s.status === "pending").length;
  const approvedCount = summaries.filter((s: any) => s.status === "approved").length;

  // ── Mutations ──
  const recalculate = async () => {
    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-incentives", {
        body: { month_year: selectedMonth, vertical_name: selectedVertical === "all" ? null : selectedVertical },
      });
      if (error) throw error;
      toast.success(`Calculated ${data.calculated || 0} incentive entries`);
      qc.invalidateQueries({ queryKey: ["admin-incentive-summaries"] });
      qc.invalidateQueries({ queryKey: ["admin-manager-bonuses"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCalculating(false);
    }
  };

  const bulkApprove = useMutation({
    mutationFn: async () => {
      const pending = summaries.filter((s: any) => s.status === "calculated" || s.status === "pending");
      for (const s of pending) {
        await (supabase.from("incentive_monthly_summary") as any)
          .update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", s.id);
      }
      // Also approve individual entries
      for (const s of pending) {
        await (supabase.from("incentive_entries") as any)
          .update({ status: "approved", approved_at: new Date().toISOString() })
          .eq("user_id", s.user_id).eq("vertical_name", s.vertical_name).eq("month_year", selectedMonth);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-incentive-summaries"] }); toast.success("All incentives approved!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const sendToAccounts = useMutation({
    mutationFn: async () => {
      const approved = summaries.filter((s: any) => s.status === "approved");
      for (const s of approved) {
        await (supabase.from("incentive_monthly_summary") as any)
          .update({ status: "sent_to_accounts", sent_to_accounts_at: new Date().toISOString() }).eq("id", s.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-incentive-summaries"] }); toast.success("Sent to Accounts for payout!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const approveOne = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from("incentive_monthly_summary") as any)
        .update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-incentive-summaries"] }); toast.success("Approved"); },
  });

  const rejectOne = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from("incentive_monthly_summary") as any)
        .update({ status: "rejected" }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-incentive-summaries"] }); toast.success("Rejected"); },
  });

  // Month options
  const months = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      arr.push(format(d, "yyyy-MM"));
    }
    return arr;
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-amber-500" />
          <h2 className="text-2xl font-bold text-foreground">Incentive Management</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m} value={m}>{format(new Date(m + "-01"), "MMM yyyy")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedVertical} onValueChange={setSelectedVertical}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verticals</SelectItem>
              {VERTICALS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowRules(true)}>
            <Settings className="h-4 w-4 mr-1" /> Rules
          </Button>
          <Button size="sm" onClick={recalculate} disabled={calculating}>
            <RefreshCw className={`h-4 w-4 mr-1 ${calculating ? "animate-spin" : ""}`} />
            {calculating ? "Calculating..." : "Re-Calculate"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">₹{grandTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Team Incentives</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">₹{mgrTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Manager Bonuses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{summaries.length}</p>
            <p className="text-xs text-muted-foreground">Team Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calculator className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{pendingApproval}</p>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCheck className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {pendingApproval > 0 && (
        <div className="flex gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <Button onClick={() => bulkApprove.mutate()} className="bg-green-600 hover:bg-green-700">
            <CheckCheck className="h-4 w-4 mr-1" /> Approve All ({pendingApproval})
          </Button>
          <span className="text-sm text-muted-foreground self-center">₹{summaries.filter((s: any) => s.status === "calculated" || s.status === "pending").reduce((s: number, e: any) => s + Number(e.total_incentive || 0), 0).toLocaleString()} pending approval</span>
        </div>
      )}
      {approvedCount > 0 && (
        <div className="flex gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
          <Button onClick={() => sendToAccounts.mutate()} className="bg-purple-600 hover:bg-purple-700">
            <Send className="h-4 w-4 mr-1" /> Send to Accounts ({approvedCount})
          </Button>
          <span className="text-sm text-muted-foreground self-center">Release ₹{summaries.filter((s: any) => s.status === "approved").reduce((s: number, e: any) => s + Number(e.total_incentive || 0), 0).toLocaleString()} for payout</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Team Incentives</TabsTrigger>
          <TabsTrigger value="managers">Manager Bonuses</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Vertical</TableHead>
                    <TableHead className="text-center">Deals</TableHead>
                    <TableHead className="text-right">Deal Value</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Slab Bonus</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No incentive data. Click "Re-Calculate" to generate.</TableCell></TableRow>
                  ) : summaries.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.employee_name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{s.vertical_name?.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-center">{s.total_deals}</TableCell>
                      <TableCell className="text-right">₹{Number(s.total_deal_value || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{Number(s.base_incentive || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{Number(s.slab_bonus || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-amber-600">₹{Number(s.total_incentive || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[s.status] || ""}>{s.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setShowDetail(s)}><Eye className="h-3.5 w-3.5" /></Button>
                          {(s.status === "calculated" || s.status === "pending") && (
                            <>
                              <Button size="sm" variant="ghost" className="text-green-600" onClick={() => approveOne.mutate(s.id)}><Check className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => rejectOne.mutate(s.id)}>✕</Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="managers">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manager</TableHead>
                    <TableHead>Vertical</TableHead>
                    <TableHead className="text-center">Team Deals</TableHead>
                    <TableHead className="text-center">Target</TableHead>
                    <TableHead className="text-center">Achievement</TableHead>
                    <TableHead className="text-right font-bold">Bonus</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managerBonuses.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No manager bonuses calculated yet.</TableCell></TableRow>
                  ) : managerBonuses.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.manager_name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{b.vertical_name?.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-center">{b.team_total_deals}</TableCell>
                      <TableCell className="text-center">{b.team_target}</TableCell>
                      <TableCell className="text-center font-medium">{b.team_achievement_pct}%</TableCell>
                      <TableCell className="text-right font-bold text-amber-600">₹{Number(b.bonus_amount || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[b.status] || ""}>{b.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              {showDetail?.employee_name} — {showDetail?.vertical_name?.replace("_", " ")} Incentive Detail
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {entries.map((e: any) => (
              <div key={e.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{e.deal_description}</p>
                  <p className="text-xs text-muted-foreground">Ref: {e.deal_reference?.slice(0, 8)}... | Value: ₹{Number(e.deal_value || 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-600">₹{Number(e.incentive_amount || 0).toLocaleString()}</p>
                  <Badge className={`text-xs ${STATUS_COLORS[e.status] || ""}`}>{e.status}</Badge>
                </div>
              </div>
            ))}
            {entries.length === 0 && <p className="text-center text-muted-foreground py-4">No individual entries found.</p>}
          </div>
          <DialogFooter>
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-bold text-foreground">₹{entries.reduce((s: number, e: any) => s + Number(e.incentive_amount || 0), 0).toLocaleString()}</span>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Incentive Rules Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {rules.map((r: any) => (
              <div key={r.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{r.rule_name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">{r.vertical_name?.replace("_", " ")}</Badge>
                      <Badge variant="secondary">{r.rule_type}</Badge>
                      <Badge variant="secondary">{r.role_applicable}</Badge>
                    </div>
                  </div>
                  <Badge className={r.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {r.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {r.rule_type === "fixed" && <p className="text-sm mt-2 text-muted-foreground">₹{r.fixed_amount} per deal</p>}
                {r.rule_type === "slab" && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {(r.slab_config || []).map((s: any, i: number) => (
                      <span key={i}>{s.min}-{s.max}: ₹{s.amount} | </span>
                    ))}
                  </div>
                )}
                {r.rule_type === "bank_wise" && (
                  <div className="mt-2 text-sm text-muted-foreground flex flex-wrap gap-1">
                    {(r.bank_wise_config || []).map((b: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{b.bank}: ₹{b.amount}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminIncentiveWorkspace;
