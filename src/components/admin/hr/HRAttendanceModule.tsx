import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, differenceInMinutes, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, Plus, Search, CheckCircle2, XCircle, Clock, AlertTriangle, Download } from "lucide-react";

const ATTENDANCE_STATUS = ["present", "absent", "half_day", "late", "leave", "holiday", "work_from_home"];

const statusIcon: Record<string, any> = {
  present: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  absent: <XCircle className="h-4 w-4 text-red-500" />,
  half_day: <Clock className="h-4 w-4 text-yellow-500" />,
  late: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  leave: <CalendarDays className="h-4 w-4 text-blue-500" />,
  work_from_home: <CheckCircle2 className="h-4 w-4 text-purple-500" />,
};

const calcWorkHours = (checkIn?: string | null, checkOut?: string | null): string => {
  if (!checkIn || !checkOut) return "—";
  try {
    const mins = differenceInMinutes(parseISO(checkOut), parseISO(checkIn));
    if (mins <= 0) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  } catch { return "—"; }
};

export const HRAttendanceModule = () => {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("daily");

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-attendance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_team_directory").select("id, full_name, phone, department").eq("is_active", true).order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const monthStart = format(startOfMonth(new Date(selectedDate)), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date(selectedDate)), "yyyy-MM-dd");

  const { data: attendance = [] } = useQuery({
    queryKey: ["hr-attendance", monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance_records").select("*").gte("attendance_date", monthStart).lte("attendance_date", monthEnd).order("attendance_date");
      if (error) throw error;
      return data;
    },
  });

  const markMutation = useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec };
      // Auto-calc work hours
      if (payload.check_in && payload.check_out) {
        const ciStr = payload.check_in.includes("T") ? payload.check_in : `${payload.attendance_date}T${payload.check_in}:00`;
        const coStr = payload.check_out.includes("T") ? payload.check_out : `${payload.attendance_date}T${payload.check_out}:00`;
        const mins = differenceInMinutes(parseISO(coStr), parseISO(ciStr));
        payload.work_hours = Math.max(0, Number((mins / 60).toFixed(1)));
        payload.check_in = ciStr;
        payload.check_out = coStr;
      } else {
        if (payload.check_in && !payload.check_in.includes("T")) payload.check_in = `${payload.attendance_date}T${payload.check_in}:00`;
        if (payload.check_out && !payload.check_out.includes("T")) payload.check_out = `${payload.attendance_date}T${payload.check_out}:00`;
      }
      
      const { error } = await (supabase.from("attendance_records") as any).upsert({
        team_member_name: payload.team_member_name,
        team_member_phone: payload.team_member_phone,
        attendance_date: payload.attendance_date,
        status: payload.status,
        check_in: payload.check_in || null,
        check_out: payload.check_out || null,
        work_hours: payload.work_hours || null,
        notes: payload.notes || null,
        location: payload.location || null,
      }, { onConflict: "team_member_name,attendance_date", ignoreDuplicates: false });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-attendance"] }); toast.success("Attendance marked"); setShowDialog(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkMarkMutation = useMutation({
    mutationFn: async () => {
      const existing = attendance.filter((a: any) => a.attendance_date === selectedDate).map((a: any) => a.team_member_name);
      const unmarked = employees.filter(e => !existing.includes(e.full_name));
      if (unmarked.length === 0) { toast.info("All already marked"); return; }
      const records = unmarked.map(e => ({
        team_member_name: e.full_name,
        team_member_phone: e.phone,
        attendance_date: selectedDate,
        status: "present",
      }));
      const { error } = await (supabase.from("attendance_records") as any).insert(records);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-attendance"] }); toast.success("Bulk attendance marked"); },
    onError: (e: any) => toast.error(e.message),
  });

  const todayAttendance = attendance.filter((a: any) => a.attendance_date === selectedDate);
  const presentCount = todayAttendance.filter((a: any) => a.status === "present" || a.status === "work_from_home").length;
  const absentCount = todayAttendance.filter((a: any) => a.status === "absent").length;
  const leaveCount = todayAttendance.filter((a: any) => a.status === "leave").length;
  const lateCount = todayAttendance.filter((a: any) => a.status === "late").length;

  const filteredEmployees = employees.filter((e: any) => !search || e.full_name.toLowerCase().includes(search.toLowerCase()));

  // Monthly summary per employee
  const monthlySummary = useMemo(() => {
    const map = new Map<string, { present: number; absent: number; late: number; halfDay: number; leave: number; wfh: number; totalHours: number }>();
    employees.forEach(e => map.set(e.full_name, { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, wfh: 0, totalHours: 0 }));
    attendance.forEach((a: any) => {
      const entry = map.get(a.team_member_name);
      if (!entry) return;
      if (a.status === "present") entry.present++;
      else if (a.status === "absent") entry.absent++;
      else if (a.status === "late") { entry.late++; entry.present++; }
      else if (a.status === "half_day") entry.halfDay++;
      else if (a.status === "leave") entry.leave++;
      else if (a.status === "work_from_home") { entry.wfh++; entry.present++; }
      entry.totalHours += Number(a.work_hours || 0);
    });
    return map;
  }, [employees, attendance]);

  const exportCSV = () => {
    const headers = ["Employee", "Department", "Present", "Absent", "Late", "Half Day", "Leave", "WFH", "Total Hours"];
    const rows = Array.from(monthlySummary.entries()).map(([name, s]) => {
      const emp = employees.find(e => e.full_name === name);
      return [name, emp?.department || "", s.present, s.absent, s.late, s.halfDay, s.leave, s.wfh, s.totalHours.toFixed(1)];
    });
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `attendance-${monthStart}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Staff</p><p className="text-2xl font-bold">{employees.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Present</p><p className="text-2xl font-bold text-green-600">{presentCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Absent</p><p className="text-2xl font-bold text-red-600">{absentCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Late</p><p className="text-2xl font-bold text-orange-600">{lateCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">On Leave</p><p className="text-2xl font-bold text-blue-600">{leaveCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unmarked</p><p className="text-2xl font-bold text-orange-600">{employees.length - todayAttendance.length}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center">
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44" />
          <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <Button variant="outline" onClick={() => bulkMarkMutation.mutate()}>Mark All Present</Button>
          <Button onClick={() => { setForm({ attendance_date: selectedDate, status: "present" }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> Mark Attendance</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <Card><CardContent className="p-0">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Hours</TableHead><TableHead>Notes</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp: any) => {
                    const record = todayAttendance.find((a: any) => a.team_member_name === emp.full_name);
                    const workHrs = record ? calcWorkHours(record.check_in, record.check_out) : "—";
                    return (
                      <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                        setForm({ team_member_name: emp.full_name, team_member_phone: emp.phone, attendance_date: selectedDate, status: record?.status || "present", check_in: record?.check_in ? format(new Date(record.check_in), "HH:mm") : "", check_out: record?.check_out ? format(new Date(record.check_out), "HH:mm") : "", notes: record?.notes || "" });
                        setShowDialog(true);
                      }}>
                        <TableCell className="font-medium text-sm">{emp.full_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{emp.department || "—"}</Badge></TableCell>
                        <TableCell>{record ? <div className="flex items-center gap-1.5">{statusIcon[record.status]}<span className="text-sm capitalize">{record.status?.replace("_", " ")}</span></div> : <span className="text-xs text-muted-foreground">Not marked</span>}</TableCell>
                        <TableCell className="text-sm">{record?.check_in ? format(new Date(record.check_in), "hh:mm a") : "—"}</TableCell>
                        <TableCell className="text-sm">{record?.check_out ? format(new Date(record.check_out), "hh:mm a") : "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{record?.work_hours ? `${record.work_hours}h` : workHrs}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{record?.notes || ""}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <Card><CardContent className="p-0">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Present</TableHead><TableHead>Absent</TableHead><TableHead>Late</TableHead><TableHead>Half Day</TableHead><TableHead>Leave</TableHead><TableHead>WFH</TableHead><TableHead>Total Hours</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp: any) => {
                    const s = monthlySummary.get(emp.full_name);
                    if (!s) return null;
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium text-sm">{emp.full_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{emp.department || "—"}</Badge></TableCell>
                        <TableCell className="text-sm text-green-600 font-medium">{s.present}</TableCell>
                        <TableCell className="text-sm text-red-600 font-medium">{s.absent}</TableCell>
                        <TableCell className="text-sm text-orange-600">{s.late}</TableCell>
                        <TableCell className="text-sm text-yellow-600">{s.halfDay}</TableCell>
                        <TableCell className="text-sm text-blue-600">{s.leave}</TableCell>
                        <TableCell className="text-sm text-purple-600">{s.wfh}</TableCell>
                        <TableCell className="text-sm font-medium">{s.totalHours.toFixed(1)}h</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Attendance</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Employee</Label>
              <Select value={form.team_member_name || ""} onValueChange={v => { const emp = employees.find((e: any) => e.full_name === v); setForm(p => ({ ...p, team_member_name: v, team_member_phone: emp?.phone || "" })); }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.attendance_date || ""} onChange={e => setForm(p => ({ ...p, attendance_date: e.target.value }))} /></div>
              <div><Label>Status</Label><Select value={form.status || "present"} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ATTENDANCE_STATUS.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Check In</Label><Input type="time" value={form.check_in || ""} onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))} /></div>
              <div><Label>Check Out</Label><Input type="time" value={form.check_out || ""} onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))} /></div>
            </div>
            {form.check_in && form.check_out && (
              <p className="text-sm text-muted-foreground">
                Calculated: <strong>{(() => {
                  const ci = new Date(`2000-01-01T${form.check_in}`);
                  const co = new Date(`2000-01-01T${form.check_out}`);
                  const mins = (co.getTime() - ci.getTime()) / 60000;
                  return mins > 0 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : "—";
                })()}</strong>
              </p>
            )}
            <div><Label>Notes</Label><Input value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => markMutation.mutate(form)} disabled={!form.team_member_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRAttendanceModule;
