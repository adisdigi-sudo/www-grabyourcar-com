import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, endOfMonth } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { IndianRupee, Calculator, CheckCircle2, Search, Eye, Activity, Clock, Coffee } from "lucide-react";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
const hrsFromSec = (s: number) => (s / 3600).toFixed(1);

export const SalaryEngine = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [search, setSearch] = useState("");
  const [detailView, setDetailView] = useState<any>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ["emp-profiles-salary"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employee_profiles") as any).select("*").eq("is_active", true).order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: salaryRecords = [] } = useQuery({
    queryKey: ["salary-records", month],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employee_salary_records") as any).select("*").eq("month_year", month).order("employee_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: attendanceData = [] } = useQuery({
    queryKey: ["attendance-for-salary", month],
    queryFn: async () => {
      const [year, m] = month.split("-");
      const startDate = `${year}-${m}-01`;
      const end = endOfMonth(new Date(Number(year), Number(m) - 1));
      const endDate = format(end, "yyyy-MM-dd");
      const { data, error } = await supabase.from("attendance_records").select("*")
        .gte("attendance_date", startDate).lte("attendance_date", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions-for-salary", month],
    queryFn: async () => {
      const [year, m] = month.split("-");
      const startDate = `${year}-${m}-01T00:00:00`;
      const end = endOfMonth(new Date(Number(year), Number(m) - 1));
      const endDate = format(end, "yyyy-MM-dd") + "T23:59:59";
      const { data, error } = await (supabase.from("employee_sessions") as any).select("*")
        .gte("login_at", startDate).lte("login_at", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: approvedLeaves = [] } = useQuery({
    queryKey: ["approved-leaves-salary", month],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employee_tickets") as any).select("*")
        .in("ticket_type", ["leave", "half_day"])
        .in("status", ["resolved", "hr_approved", "manager_approved"]);
      if (error) throw error;
      return data || [];
    },
  });

  // Smart session-based attendance aggregation
  const getSessionStats = (profile: any) => {
    const empSessions = sessions.filter((s: any) =>
      s.user_id === profile.user_id || s.user_email === profile.email
    );
    const uniqueDays = new Set(empSessions.map((s: any) => s.session_date)).size;
    const totalActive = empSessions.reduce((sum: number, s: any) => sum + (s.total_active_seconds || 0), 0);
    const totalIdle = empSessions.reduce((sum: number, s: any) => sum + (s.total_idle_seconds || 0), 0);
    const totalBreak = empSessions.reduce((sum: number, s: any) => sum + (s.total_break_seconds || 0), 0);

    const shiftHours = Number(profile.shift_start && profile.shift_end
      ? ((new Date(`2000-01-01T${profile.shift_end}`).getTime() - new Date(`2000-01-01T${profile.shift_start}`).getTime()) / 3600000)
      : 9);
    const shiftSeconds = shiftHours * 3600;

    // Late detection: login after shift_start + grace
    const graceMin = profile.grace_minutes || 15;
    let lateCount = 0;
    let halfDayCount = 0;

    const dayMap = new Map<string, any[]>();
    empSessions.forEach((s: any) => {
      const d = s.session_date;
      if (!dayMap.has(d)) dayMap.set(d, []);
      dayMap.get(d)!.push(s);
    });

    dayMap.forEach((daySessions) => {
      const firstLogin = daySessions.sort((a: any, b: any) => new Date(a.login_at).getTime() - new Date(b.login_at).getTime())[0];
      if (firstLogin?.login_at && profile.shift_start) {
        const loginTime = new Date(firstLogin.login_at);
        const shiftTime = new Date(loginTime.toISOString().split("T")[0] + "T" + profile.shift_start);
        const diffMin = (loginTime.getTime() - shiftTime.getTime()) / 60000;
        if (diffMin > graceMin) lateCount++;
      }
      const dayActive = daySessions.reduce((s: number, sess: any) => s + (sess.total_active_seconds || 0), 0);
      if (dayActive < (shiftSeconds * 0.5) && dayActive > 0) halfDayCount++;
    });

    return { uniqueDays, totalActive, totalIdle, totalBreak, lateCount, halfDayCount, shiftHours };
  };

  // Calculate salary with deep session integration
  const calculateSalary = (profile: any) => {
    const ctc = Number(profile.monthly_ctc || 0);
    if (ctc === 0) return null;

    const workingDays = profile.working_days_per_month || 26;
    const perDay = ctc / workingDays;
    const basic = Math.round(ctc * 0.4);
    const hra = Math.round(ctc * 0.2);
    const da = Math.round(ctc * 0.1);
    const special = Math.round(ctc * 0.3);

    // Session-based smart attendance
    const sessionStats = getSessionStats(profile);

    // Manual attendance as fallback/override
    const empAttendance = attendanceData.filter((a: any) =>
      a.team_member_name?.toLowerCase() === profile.full_name?.toLowerCase() || a.user_id === profile.user_id
    );
    const manualPresent = empAttendance.filter((a: any) => ["present", "work_from_home"].includes(a.status)).length;
    const manualHalfDays = empAttendance.filter((a: any) => a.status === "half_day").length;
    const manualLate = empAttendance.filter((a: any) => a.status === "late").length;

    // Use session data if available, fallback to manual
    const hasSessionData = sessionStats.uniqueDays > 0;
    const presentDays = hasSessionData ? sessionStats.uniqueDays : manualPresent;
    const halfDays = hasSessionData ? sessionStats.halfDayCount : manualHalfDays;
    const lateDays = hasSessionData ? sessionStats.lateCount : manualLate;

    const empLeaves = approvedLeaves.filter((l: any) => l.employee_user_id === profile.user_id);
    const approvedLeaveDays = empLeaves.reduce((sum: number, l: any) => sum + Number(l.leave_days || 0), 0);

    const lateDeductionDays = Math.floor(lateDays / 3);
    const lateDeduction = Math.round(lateDeductionDays * perDay);

    const effectivePresent = presentDays - halfDays * 0.5;
    const totalAbsent = Math.max(0, workingDays - effectivePresent - approvedLeaveDays);
    const leaveDeduction = Math.round(totalAbsent * perDay);

    const pf = Number(profile.pf_deduction || Math.round(basic * 0.12));
    const esi = Number(profile.esi_deduction || 0);
    const pt = Number(profile.professional_tax || 200);
    const tds = Number(profile.tds || 0);
    const totalDeductions = pf + esi + pt + tds + lateDeduction + leaveDeduction;
    const gross = basic + hra + da + special;
    const net = gross - totalDeductions;

    return {
      employee_user_id: profile.user_id,
      employee_name: profile.full_name,
      month_year: month,
      monthly_ctc: ctc,
      basic_salary: basic,
      hra, da,
      special_allowance: special,
      gross_salary: gross,
      total_working_days: workingDays,
      days_present: Math.round(effectivePresent),
      days_absent: Math.round(totalAbsent),
      half_days: halfDays,
      late_count: lateDays,
      late_deduction: lateDeduction,
      leave_deduction: leaveDeduction,
      pf_deduction: pf,
      esi_deduction: esi,
      professional_tax: pt,
      tds,
      other_deductions: 0,
      total_deductions: totalDeductions,
      incentive_amount: 0,
      bonus_amount: 0,
      net_salary: net,
      payment_status: "pending",
      calculation_notes: hasSessionData
        ? `Auto: ${sessionStats.uniqueDays} login days, ${hrsFromSec(sessionStats.totalActive)}h active, ${hrsFromSec(sessionStats.totalIdle)}h idle, ${hrsFromSec(sessionStats.totalBreak)}h break`
        : "Manual attendance data used",
      // Store session stats for detail view
      _sessionStats: sessionStats,
    };
  };

  const generateAll = useMutation({
    mutationFn: async () => {
      const records = profiles
        .map(calculateSalary)
        .filter(Boolean)
        .filter((r: any) => !salaryRecords.some((s: any) => s.employee_user_id === r.employee_user_id));

      if (records.length === 0) {
        toast.info("All salary records already exist for this month");
        return;
      }
      // Strip internal fields before insert
      const clean = records.map((r: any) => { const { _sessionStats, ...rest } = r; return rest; });
      const { error } = await (supabase.from("employee_salary_records") as any).insert(clean);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-records"] });
      toast.success("Salary records generated with session tracking!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveRecord = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { payment_status: status, updated_at: new Date().toISOString() };
      if (status === "approved") { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString(); }
      if (status === "paid") { updates.paid_at = new Date().toISOString(); }
      const { error } = await (supabase.from("employee_salary_records") as any).update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-records"] });
      toast.success("Updated!");
    },
  });

  const totalGross = salaryRecords.reduce((s: number, r: any) => s + Number(r.gross_salary || 0), 0);
  const totalNet = salaryRecords.reduce((s: number, r: any) => s + Number(r.net_salary || 0), 0);
  const totalDeductions = salaryRecords.reduce((s: number, r: any) => s + Number(r.total_deductions || 0), 0);
  const paidCount = salaryRecords.filter((r: any) => r.payment_status === "paid").length;

  // Session summary for the month
  const totalSessionDays = new Set(sessions.map((s: any) => s.user_id + s.session_date)).size;
  const totalActiveHrs = sessions.reduce((s: number, sess: any) => s + (sess.total_active_seconds || 0), 0) / 3600;
  const totalIdleHrs = sessions.reduce((s: number, sess: any) => s + (sess.total_idle_seconds || 0), 0) / 3600;
  const totalBreakHrs = sessions.reduce((s: number, sess: any) => s + (sess.total_break_seconds || 0), 0) / 3600;

  const filtered = salaryRecords.filter((r: any) => !search || r.employee_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Salary Calculation Engine</h2>
        <div className="flex items-center gap-2">
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40" />
          <Button onClick={() => generateAll.mutate()} disabled={generateAll.isPending}>
            <Calculator className="h-4 w-4 mr-2" /> Auto-Calculate All
          </Button>
        </div>
      </div>

      {/* Session Tracker Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-primary/20">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1"><Activity className="h-3 w-3 text-green-500" /><p className="text-xs text-muted-foreground">Active Hours</p></div>
            <p className="text-lg font-bold text-green-600">{totalActiveHrs.toFixed(0)}h</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1"><Clock className="h-3 w-3 text-yellow-500" /><p className="text-xs text-muted-foreground">Idle Hours</p></div>
            <p className="text-lg font-bold text-yellow-600">{totalIdleHrs.toFixed(0)}h</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1"><Coffee className="h-3 w-3 text-red-500" /><p className="text-xs text-muted-foreground">Break Hours</p></div>
            <p className="text-lg font-bold text-red-600">{totalBreakHrs.toFixed(0)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Session Days</p>
            <p className="text-lg font-bold">{totalSessionDays}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Gross</p>
          <p className="text-lg font-bold">{fmt(totalGross)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Deductions</p>
          <p className="text-lg font-bold text-red-600">{fmt(totalDeductions)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Net</p>
          <p className="text-lg font-bold text-green-600">{fmt(totalNet)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-lg font-bold">{paidCount}/{salaryRecords.length}</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>CTC</TableHead>
              <TableHead>Present</TableHead>
              <TableHead>Absent</TableHead>
              <TableHead>Late</TableHead>
              <TableHead>Tracker</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Net Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r: any) => {
              // Find session data for this employee
              const empSess = sessions.filter((s: any) => s.user_id === r.employee_user_id);
              const activeH = empSess.reduce((sum: number, s: any) => sum + (s.total_active_seconds || 0), 0) / 3600;
              const idleH = empSess.reduce((sum: number, s: any) => sum + (s.total_idle_seconds || 0), 0) / 3600;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employee_name}</TableCell>
                  <TableCell>{fmt(r.monthly_ctc)}</TableCell>
                  <TableCell>{r.days_present}/{r.total_working_days}</TableCell>
                  <TableCell className="text-red-600">{r.days_absent}</TableCell>
                  <TableCell>{r.late_count}</TableCell>
                  <TableCell>
                    <div className="text-xs space-y-0.5">
                      <span className="text-green-600">{activeH.toFixed(0)}h active</span>
                      {idleH > 0 && <span className="text-yellow-600 block">{idleH.toFixed(0)}h idle</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-red-600">{fmt(r.total_deductions)}</TableCell>
                  <TableCell className="font-bold text-green-600">{fmt(r.net_salary)}</TableCell>
                  <TableCell>
                    <Badge className={r.payment_status === "paid" ? "bg-green-100 text-green-800" : r.payment_status === "approved" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}>
                      {r.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setDetailView(r)}><Eye className="h-4 w-4" /></Button>
                      {r.payment_status === "pending" && (
                        <Button variant="ghost" size="icon" onClick={() => approveRecord.mutate({ id: r.id, status: "approved" })}>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {r.payment_status === "approved" && (
                        <Button variant="ghost" size="icon" onClick={() => approveRecord.mutate({ id: r.id, status: "paid" })}>
                          <IndianRupee className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                {salaryRecords.length === 0 ? "No salary records for this month. Click 'Auto-Calculate All' to generate." : "No results."}
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail View */}
      <Dialog open={!!detailView} onOpenChange={() => setDetailView(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Salary Breakdown — {detailView?.employee_name}</DialogTitle></DialogHeader>
          {detailView && (() => {
            const empSess = sessions.filter((s: any) => s.user_id === detailView.employee_user_id);
            const activeH = empSess.reduce((sum: number, s: any) => sum + (s.total_active_seconds || 0), 0) / 3600;
            const idleH = empSess.reduce((sum: number, s: any) => sum + (s.total_idle_seconds || 0), 0) / 3600;
            const breakH = empSess.reduce((sum: number, s: any) => sum + (s.total_break_seconds || 0), 0) / 3600;
            const loginDays = new Set(empSess.map((s: any) => s.session_date)).size;
            return (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-medium text-muted-foreground">Month</div><div>{detailView.month_year}</div>
                  <div className="font-medium text-muted-foreground">Monthly CTC</div><div>{fmt(detailView.monthly_ctc)}</div>
                </div>

                {/* Session Tracker Data */}
                <div className="border-t pt-2">
                  <p className="font-semibold mb-1 flex items-center gap-1"><Activity className="h-3 w-3" /> Live Session Tracker</p>
                  <div className="grid grid-cols-2 gap-1 bg-muted/50 p-2 rounded">
                    <span>Login Days</span><span className="font-medium">{loginDays}</span>
                    <span>Active Hours</span><span className="font-medium text-green-600">{activeH.toFixed(1)}h</span>
                    <span>Idle Hours</span><span className="font-medium text-yellow-600">{idleH.toFixed(1)}h</span>
                    <span>Break Hours</span><span className="font-medium text-red-600">{breakH.toFixed(1)}h</span>
                    <span>Productivity</span>
                    <span className="font-medium">{activeH + idleH > 0 ? Math.round((activeH / (activeH + idleH)) * 100) : 0}%</span>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <p className="font-semibold mb-1">Earnings</p>
                  <div className="grid grid-cols-2 gap-1">
                    <span>Basic</span><span>{fmt(detailView.basic_salary)}</span>
                    <span>HRA</span><span>{fmt(detailView.hra)}</span>
                    <span>DA</span><span>{fmt(detailView.da)}</span>
                    <span>Special Allowance</span><span>{fmt(detailView.special_allowance)}</span>
                    <span className="font-bold">Gross</span><span className="font-bold">{fmt(detailView.gross_salary)}</span>
                  </div>
                </div>
                <div className="border-t pt-2">
                  <p className="font-semibold mb-1">Attendance</p>
                  <div className="grid grid-cols-2 gap-1">
                    <span>Days Present</span><span>{detailView.days_present}/{detailView.total_working_days}</span>
                    <span>Days Absent</span><span className="text-red-600">{detailView.days_absent}</span>
                    <span>Half Days</span><span>{detailView.half_days}</span>
                    <span>Late Count</span><span>{detailView.late_count}</span>
                  </div>
                </div>
                <div className="border-t pt-2">
                  <p className="font-semibold mb-1 text-red-600">Deductions</p>
                  <div className="grid grid-cols-2 gap-1">
                    <span>PF</span><span>-{fmt(detailView.pf_deduction)}</span>
                    <span>ESI</span><span>-{fmt(detailView.esi_deduction)}</span>
                    <span>Prof. Tax</span><span>-{fmt(detailView.professional_tax)}</span>
                    <span>TDS</span><span>-{fmt(detailView.tds)}</span>
                    <span>Leave Deduction</span><span>-{fmt(detailView.leave_deduction)}</span>
                    <span>Late Deduction</span><span>-{fmt(detailView.late_deduction)}</span>
                    <span className="font-bold">Total Deductions</span><span className="font-bold text-red-600">-{fmt(detailView.total_deductions)}</span>
                  </div>
                </div>
                <div className="border-t pt-2">
                  <div className="grid grid-cols-2 gap-1">
                    <span>Incentive</span><span className="text-green-600">+{fmt(detailView.incentive_amount)}</span>
                    <span>Bonus</span><span className="text-green-600">+{fmt(detailView.bonus_amount)}</span>
                  </div>
                </div>
                {detailView.calculation_notes && (
                  <div className="border-t pt-2">
                    <p className="text-xs text-muted-foreground italic">📊 {detailView.calculation_notes}</p>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="text-lg font-bold">Net Salary</span>
                  <span className="text-lg font-bold text-green-600">{fmt(detailView.net_salary)}</span>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailView(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryEngine;
