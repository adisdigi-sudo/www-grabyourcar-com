import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInCalendarDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palmtree, Plus, Search, CheckCircle2, XCircle, Clock, Download, CalendarDays } from "lucide-react";

const LEAVE_TYPES = ["casual", "sick", "earned", "comp_off", "unpaid", "maternity", "paternity"];

const leaveTypeMap: Record<string, string> = {
  casual: "Casual Leave", sick: "Sick Leave", earned: "Earned Leave",
  comp_off: "Comp Off", unpaid: "Unpaid Leave", maternity: "Maternity", paternity: "Paternity",
};

export const HRLeaveManagement = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [tab, setTab] = useState("requests");
  const currentYear = new Date().getFullYear();

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-emp-leave"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_team_directory").select("id, full_name, phone, department").eq("is_active", true).order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["hr-leave-requests-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_requests").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["hr-leave-balances", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_balances").select("*").eq("year", currentYear);
      if (error) throw error;
      return data;
    },
  });

  // Auto-init balances for employees who don't have one
  const initBalances = useMutation({
    mutationFn: async () => {
      const existing = new Set(balances.map((b: any) => b.team_member_name));
      const missing = employees.filter(e => !existing.has(e.full_name));
      if (missing.length === 0) { toast.info("All balances already initialized"); return; }
      const records = missing.map(e => ({
        team_member_name: e.full_name,
        team_member_phone: e.phone,
        year: currentYear,
        casual_leave_total: 12, casual_leave_used: 0,
        sick_leave_total: 6, sick_leave_used: 0,
        earned_leave_total: 15, earned_leave_used: 0,
        comp_off_total: 0, comp_off_used: 0,
      }));
      const { error } = await (supabase.from("leave_balances") as any).insert(records);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-leave-balances"] }); toast.success(`Balances initialized for ${currentYear}`); },
    onError: (e: any) => toast.error(e.message),
  });

  const applyLeave = useMutation({
    mutationFn: async (payload: any) => {
      const totalDays = differenceInCalendarDays(new Date(payload.end_date), new Date(payload.start_date)) + 1;
      const { error } = await supabase.from("leave_requests").insert({
        team_member_name: payload.team_member_name,
        team_member_phone: payload.team_member_phone,
        leave_type: payload.leave_type,
        start_date: payload.start_date,
        end_date: payload.end_date,
        total_days: totalDays,
        reason: payload.reason,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-leave-requests-full"] }); toast.success("Leave applied"); setShowApply(false); setForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, name, type, days }: any) => {
      const { error } = await supabase.from("leave_requests").update({
        status, approved_at: status === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;

      // Update balance if approved
      if (status === "approved" && name && type && days) {
        const balanceField = type === "casual" ? "casual_leave_used" : type === "sick" ? "sick_leave_used" : type === "earned" ? "earned_leave_used" : type === "comp_off" ? "comp_off_used" : null;
        if (balanceField) {
          const bal = balances.find((b: any) => b.team_member_name === name);
          if (bal) {
            const newUsed = Number(bal[balanceField] || 0) + Number(days);
            await supabase.from("leave_balances").update({ [balanceField]: newUsed, updated_at: new Date().toISOString() }).eq("id", bal.id);
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-leave-requests-full"] });
      qc.invalidateQueries({ queryKey: ["hr-leave-balances"] });
      toast.success("Leave updated");
    },
  });

  const pendingCount = leaveRequests.filter((l: any) => l.status === "pending").length;
  const approvedCount = leaveRequests.filter((l: any) => l.status === "approved").length;
  const rejectedCount = leaveRequests.filter((l: any) => l.status === "rejected").length;

  const filtered = leaveRequests.filter((l: any) => !search || l.team_member_name?.toLowerCase().includes(search.toLowerCase()));

  const exportCSV = () => {
    const headers = ["Employee", "Type", "Start", "End", "Days", "Status", "Reason"];
    const rows = leaveRequests.map((l: any) => [l.team_member_name, l.leave_type, l.start_date, l.end_date, l.total_days, l.status, l.reason?.replace(/,/g, ";")]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `leave-report-${currentYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg"><Clock className="h-5 w-5 text-amber-500" /></div>
          <div><p className="text-2xl font-bold">{pendingCount}</p><p className="text-xs text-muted-foreground">Pending</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
          <div><p className="text-2xl font-bold">{approvedCount}</p><p className="text-xs text-muted-foreground">Approved</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-lg"><XCircle className="h-5 w-5 text-red-500" /></div>
          <div><p className="text-2xl font-bold">{rejectedCount}</p><p className="text-xs text-muted-foreground">Rejected</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg"><CalendarDays className="h-5 w-5 text-blue-500" /></div>
          <div><p className="text-2xl font-bold">{leaveRequests.length}</p><p className="text-xs text-muted-foreground">Total Requests</p></div>
        </CardContent></Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
          <Button variant="outline" onClick={() => initBalances.mutate()}>Init Balances {currentYear}</Button>
          <Button onClick={() => { setForm({ leave_type: "casual", start_date: format(new Date(), "yyyy-MM-dd"), end_date: format(new Date(), "yyyy-MM-dd") }); setShowApply(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Apply Leave
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="requests">Leave Requests</TabsTrigger>
          <TabsTrigger value="balances">Leave Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <Card><CardContent className="p-0">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Period</TableHead><TableHead>Days</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium text-sm">{l.team_member_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{leaveTypeMap[l.leave_type] || l.leave_type}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(l.start_date), "dd MMM")} – {format(new Date(l.end_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-sm font-medium">{l.total_days}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{l.reason}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${l.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : l.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {l.status === "pending" && (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() => updateStatus.mutate({ id: l.id, status: "approved", name: l.team_member_name, type: l.leave_type, days: l.total_days })}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => updateStatus.mutate({ id: l.id, status: "rejected", name: l.team_member_name, type: l.leave_type, days: 0 })}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No leave requests</TableCell></TableRow>}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
          <Card><CardContent className="p-0">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Casual (Used/Total)</TableHead>
                  <TableHead>Sick (Used/Total)</TableHead>
                  <TableHead>Earned (Used/Total)</TableHead>
                  <TableHead>Comp Off (Used/Total)</TableHead>
                  <TableHead>Total Available</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {balances.map((b: any) => {
                    const casualAvail = (b.casual_leave_total || 0) - (b.casual_leave_used || 0);
                    const sickAvail = (b.sick_leave_total || 0) - (b.sick_leave_used || 0);
                    const earnedAvail = (b.earned_leave_total || 0) - (b.earned_leave_used || 0);
                    const compAvail = (b.comp_off_total || 0) - (b.comp_off_used || 0);
                    const totalAvail = casualAvail + sickAvail + earnedAvail + compAvail;
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium text-sm">{b.team_member_name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className="text-sm">{b.casual_leave_used || 0}/{b.casual_leave_total || 0}</span>
                            <Progress value={((b.casual_leave_used || 0) / (b.casual_leave_total || 1)) * 100} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className="text-sm">{b.sick_leave_used || 0}/{b.sick_leave_total || 0}</span>
                            <Progress value={((b.sick_leave_used || 0) / (b.sick_leave_total || 1)) * 100} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className="text-sm">{b.earned_leave_used || 0}/{b.earned_leave_total || 0}</span>
                            <Progress value={((b.earned_leave_used || 0) / (b.earned_leave_total || 1)) * 100} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className="text-sm">{b.comp_off_used || 0}/{b.comp_off_total || 0}</span>
                            <Progress value={((b.comp_off_used || 0) / (b.comp_off_total || 1)) * 100} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={totalAvail > 10 ? "bg-green-100 text-green-700" : totalAvail > 3 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                            {totalAvail} days
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {balances.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No balances. Click "Init Balances" to create for all employees.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Apply Leave Dialog */}
      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Apply Leave</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee *</Label>
              <Select value={form.team_member_name || ""} onValueChange={v => {
                const emp = employees.find(e => e.full_name === v);
                setForm(p => ({ ...p, team_member_name: v, team_member_phone: emp?.phone || "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type *</Label>
              <Select value={form.leave_type || "casual"} onValueChange={v => setForm(p => ({ ...p, leave_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAVE_TYPES.map(t => <SelectItem key={t} value={t}>{leaveTypeMap[t] || t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.team_member_name && (
              <div className="bg-muted/50 p-3 rounded-lg text-xs">
                {(() => {
                  const bal = balances.find((b: any) => b.team_member_name === form.team_member_name);
                  if (!bal) return <span className="text-muted-foreground">No balance record. Initialize first.</span>;
                  const field = form.leave_type === "casual" ? "casual" : form.leave_type === "sick" ? "sick" : form.leave_type === "earned" ? "earned" : form.leave_type === "comp_off" ? "comp_off" : null;
                  if (!field) return <span className="text-muted-foreground">Unpaid/Special leave - no balance tracking</span>;
                  const total = bal[`${field}_leave_total`] || 0;
                  const used = bal[`${field}_leave_used`] || 0;
                  return <span>Available: <strong className="text-green-600">{total - used}</strong> / {total} {leaveTypeMap[form.leave_type]}</span>;
                })()}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date *</Label><Input type="date" value={form.start_date || ""} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div><Label>End Date *</Label><Input type="date" value={form.end_date || ""} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            {form.start_date && form.end_date && (
              <p className="text-sm text-muted-foreground">
                Total: <strong>{differenceInCalendarDays(new Date(form.end_date), new Date(form.start_date)) + 1}</strong> day(s)
              </p>
            )}
            <div><Label>Reason *</Label><Textarea value={form.reason || ""} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Reason for leave..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApply(false)}>Cancel</Button>
            <Button onClick={() => applyLeave.mutate(form)} disabled={!form.team_member_name || !form.reason}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRLeaveManagement;
