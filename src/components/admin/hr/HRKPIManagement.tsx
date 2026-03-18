import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, Plus, TrendingUp, Award, BarChart3 } from "lucide-react";

const VERTICALS = [
  { value: "car_sales", label: "Car Sales" },
  { value: "insurance", label: "Insurance" },
  { value: "car_loans", label: "Car Loans" },
];

const fmt = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

export const HRKPIManagement = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currentMonth = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-kpi"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_team_directory").select("*").eq("employment_status", "active").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ["kpi-targets", selectedMonth],
    queryFn: async () => {
      const { data, error } = await (supabase.from("kpi_targets") as any).select("*").eq("month_year", selectedMonth).order("employee_name");
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (kpi: any) => {
      const { error } = await (supabase.from("kpi_targets") as any).upsert({
        user_id: kpi.user_id,
        employee_name: kpi.employee_name,
        vertical_name: kpi.vertical_name,
        month_year: selectedMonth,
        target_deals: Number(kpi.target_deals) || 0,
        target_revenue: Number(kpi.target_revenue) || 0,
        achieved_deals: Number(kpi.achieved_deals) || 0,
        achieved_revenue: Number(kpi.achieved_revenue) || 0,
        kpi_score: kpi.target_deals > 0 ? Math.round((Number(kpi.achieved_deals) / Number(kpi.target_deals)) * 100) : 0,
      }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi-targets"] });
      toast.success("KPI target saved");
      setShowDialog(false);
      setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalTarget = kpis.reduce((s: number, k: any) => s + Number(k.target_deals || 0), 0);
  const totalAchieved = kpis.reduce((s: number, k: any) => s + Number(k.achieved_deals || 0), 0);
  const avgScore = kpis.length > 0 ? Math.round(kpis.reduce((s: number, k: any) => s + Number(k.kpi_score || 0), 0) / kpis.length) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">KPI & Target Management</h2>
          <p className="text-sm text-muted-foreground">Monthly performance tracking</p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-40" />
          <Button onClick={() => { setForm({}); setShowDialog(true); }}><Plus className="h-4 w-4 mr-2" /> Set Target</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Target className="h-4 w-4" /> Team Targets</div>
          <p className="text-2xl font-bold mt-1">{totalTarget} deals</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4" /> Achieved</div>
          <p className="text-2xl font-bold mt-1">{totalAchieved} deals</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Award className="h-4 w-4" /> Avg KPI Score</div>
          <p className="text-2xl font-bold mt-1">{avgScore}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><BarChart3 className="h-4 w-4" /> Employees Tracked</div>
          <p className="text-2xl font-bold mt-1">{kpis.length}</p>
        </CardContent></Card>
      </div>

      {/* KPI Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Vertical</TableHead>
                <TableHead>Target Deals</TableHead>
                <TableHead>Achieved</TableHead>
                <TableHead>Target Revenue</TableHead>
                <TableHead>Achieved Rev.</TableHead>
                <TableHead>KPI Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis.map((k: any) => {
                const pct = Number(k.kpi_score || 0);
                return (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.employee_name}</TableCell>
                    <TableCell><Badge variant="outline">{k.vertical_name}</Badge></TableCell>
                    <TableCell>{k.target_deals}</TableCell>
                    <TableCell>{k.achieved_deals}</TableCell>
                    <TableCell>{fmt(k.target_revenue)}</TableCell>
                    <TableCell>{fmt(k.achieved_revenue)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(pct, 100)} className="w-16 h-2" />
                        <Badge className={pct >= 100 ? "bg-green-100 text-green-800" : pct >= 70 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                          {pct}%
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {kpis.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No KPI targets set for {selectedMonth}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Set Target Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Monthly KPI Target</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee</Label>
              <Select value={form.user_id || ""} onValueChange={v => {
                const emp = employees.find((e: any) => e.id === v);
                setForm(p => ({ ...p, user_id: v, employee_name: emp?.full_name || "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vertical</Label>
              <Select value={form.vertical_name || ""} onValueChange={v => setForm(p => ({ ...p, vertical_name: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{VERTICALS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Target Deals</Label><Input type="number" value={form.target_deals || ""} onChange={e => setForm(p => ({ ...p, target_deals: e.target.value }))} /></div>
              <div><Label>Target Revenue (₹)</Label><Input type="number" value={form.target_revenue || ""} onChange={e => setForm(p => ({ ...p, target_revenue: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.user_id || !form.vertical_name}>Save Target</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRKPIManagement;
