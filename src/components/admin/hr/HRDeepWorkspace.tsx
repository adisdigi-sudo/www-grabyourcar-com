import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, UserPlus, CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle,
  Search, Plus, Phone, Mail, Building2, MapPin, CreditCard, FileText,
  Megaphone, Pin, Star, Briefcase, GraduationCap, Heart, Shield,
  CalendarCheck, CalendarX, CalendarMinus, Edit2, Eye, Trash2, Download,
  IndianRupee, Award, FolderOpen, Upload
} from "lucide-react";

const DEPARTMENTS = ["sales", "insurance", "rental", "hsrp", "marketing", "finance", "operations", "hr", "management"];
const LEAVE_TYPES = ["casual", "sick", "earned", "comp_off", "unpaid"];
const ATTENDANCE_STATUS = ["present", "absent", "half_day", "late", "work_from_home", "on_leave"];
const DOC_TYPES = ["aadhaar", "pan", "passport", "driving_license", "bank_details", "offer_letter", "contract", "salary_slip", "other"];
const REVIEW_TYPES = ["quarterly", "half_yearly", "annual", "probation", "pip"];

const fmt = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;
const initials = (name: string) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";

export const HRDeepWorkspace = ({ initialTab = "overview" }: { initialTab?: string }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState(initialTab);
  const [showDialog, setShowDialog] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const resetForm = () => setForm({});
  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = format(new Date(), "yyyy-MM");

  // ── Queries ──
  const { data: team = [] } = useQuery({
    queryKey: ["hr-directory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_team_directory").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["hr-attendance-today"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance_records").select("*").eq("attendance_date", today);
      if (error) throw error;
      return data;
    },
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["hr-leave-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_requests").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ["hr-payrolls", currentMonth],
    queryFn: async () => {
      const { data, error } = await (supabase.from("payroll_records") as any).select("*").eq("pay_period", currentMonth).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: empDocs = [] } = useQuery({
    queryKey: ["hr-emp-docs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employee_documents").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["hr-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("performance_reviews").select("*").order("review_date", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["hr-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_announcements").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  // ── Computed ──
  const activeMembers = team.filter((m: any) => m.is_active);
  const presentToday = todayAttendance.filter((a: any) => ["present", "late", "work_from_home"].includes(a.status));
  const pendingLeaves = leaveRequests.filter((l: any) => l.status === "pending");
  const totalPayroll = payrolls.reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
  const markedNames = new Set(todayAttendance.map((a: any) => a.team_member_name));

  const filteredTeam = useMemo(() => {
    if (!search) return activeMembers;
    const q = search.toLowerCase();
    return activeMembers.filter((m: any) => m.full_name?.toLowerCase().includes(q) || m.department?.toLowerCase().includes(q));
  }, [activeMembers, search]);

  // ── Mutations ──
  const addPayroll = useMutation({
    mutationFn: async (entry: any) => {
      const basic = Number(entry.basic_salary || 0);
      const hra = Number(entry.hra || 0);
      const da = Number(entry.da || 0);
      const special = Number(entry.special_allowance || 0);
      const bonus = Number(entry.bonus || 0);
      const deductions = Number(entry.deductions || 0);
      const tds = Number(entry.tds || 0);
      const pf = Number(entry.pf || 0);
      const gross = basic + hra + da + special + bonus;
      const totalDeductions = deductions + tds + pf;
      const net = gross - totalDeductions;

      const { error } = await supabase.from("payroll_records").insert({
        employee_name: entry.employee_name,
        employee_id: entry.employee_id || null,
        department: entry.department,
        pay_period: currentMonth,
        basic_salary: basic, hra, da, special_allowance: special, bonus,
        deductions, tds, pf, gross_salary: gross, net_salary: net,
        payment_mode: entry.payment_mode || "bank_transfer",
        status: "pending",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-payrolls"] }); setShowDialog(null); resetForm(); toast.success("Payroll entry added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addDocument = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase.from("employee_documents").insert({
        employee_name: entry.employee_name,
        document_name: entry.document_name || entry.document_type,
        document_type: entry.document_type,
        document_number: entry.document_number,
        expiry_date: entry.expiry_date || null,
        notes: entry.notes,
        verification_status: "pending",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-emp-docs"] }); setShowDialog(null); resetForm(); toast.success("Document added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addReview = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase.from("performance_reviews").insert({
        employee_name: entry.employee_name,
        reviewer_name: entry.reviewer_name || "Admin",
        review_type: entry.review_type || "quarterly",
        review_date: entry.review_date || today,
        overall_rating: Number(entry.overall_rating || 3),
        strengths: entry.strengths,
        areas_of_improvement: entry.improvements,
        goals_next_period: entry.goals,
        comments: entry.comments,
        status: "completed",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-reviews"] }); setShowDialog(null); resetForm(); toast.success("Review submitted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePayrollStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "paid") updates.paid_at = new Date().toISOString();
      const { error } = await supabase.from("payroll_records").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-payrolls"] }); toast.success("Status updated"); },
  });

  const updateLeaveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leave_requests").update({
        status, approved_at: status === "approved" ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-leave-requests"] }); toast.success("Leave updated"); },
  });

  const markAttendance = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase.from("attendance_records").insert({ ...entry, attendance_date: today });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-attendance-today"] }); toast.success("Attendance marked"); },
  });

  const deptColor = (d: string) => {
    const c: Record<string, string> = { sales: "bg-blue-100 text-blue-700", insurance: "bg-purple-100 text-purple-700", marketing: "bg-pink-100 text-pink-700", finance: "bg-emerald-100 text-emerald-700", hr: "bg-orange-100 text-orange-700", management: "bg-slate-100 text-slate-700" };
    return c[d] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white"><Users className="h-5 w-5" /></div>
            HR & Office Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Team • Attendance • Payroll • Documents • Performance</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search team..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[200px]" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Team Size", value: activeMembers.length, icon: Users, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Present", value: presentToday.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Pending Leaves", value: pendingLeaves.length, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Payroll", value: fmt(totalPayroll), icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Documents", value: empDocs.length, icon: FolderOpen, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Reviews", value: reviews.length, icon: Award, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
        ].map(kpi => (
          <Card key={kpi.label} className={`${kpi.bg} border-none shadow-sm`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-0.5"><kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} /><span className="text-[10px] font-medium text-muted-foreground">{kpi.label}</span></div>
              <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="overview" className="text-[10px]">📊 Overview</TabsTrigger>
          <TabsTrigger value="directory" className="text-[10px]">👥 Directory</TabsTrigger>
          <TabsTrigger value="attendance" className="text-[10px]">📋 Attendance</TabsTrigger>
          <TabsTrigger value="leaves" className="text-[10px]">🏖️ Leaves</TabsTrigger>
          <TabsTrigger value="payroll" className="text-[10px]">💰 Payroll</TabsTrigger>
          <TabsTrigger value="documents" className="text-[10px]">📁 Documents</TabsTrigger>
          <TabsTrigger value="performance" className="text-[10px]">⭐ Reviews</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {announcements.filter((a: any) => a.is_pinned).length > 0 && (
            <div className="space-y-2">
              {announcements.filter((a: any) => a.is_pinned).map((a: any) => (
                <Card key={a.id} className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardContent className="p-3 flex items-start gap-3">
                    <Pin className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div><p className="font-semibold text-sm">{a.title}</p><p className="text-xs text-muted-foreground mt-1">{a.content}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Today's Attendance</CardTitle></CardHeader>
              <CardContent>
                <Progress value={(presentToday.length / (activeMembers.length || 1)) * 100} className="h-3 mb-3" />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20"><p className="text-lg font-bold text-emerald-600">{presentToday.length}</p><p className="text-[10px]">Present</p></div>
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20"><p className="text-lg font-bold text-red-600">{todayAttendance.filter((a: any) => a.status === "absent").length}</p><p className="text-[10px]">Absent</p></div>
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20"><p className="text-lg font-bold text-amber-600">{activeMembers.length - markedNames.size}</p><p className="text-[10px]">Unmarked</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Pending Leaves</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[140px]">
                  {pendingLeaves.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">No pending requests</p>}
                  {pendingLeaves.slice(0, 5).map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div><p className="text-xs font-medium">{l.team_member_name}</p><p className="text-[10px] text-muted-foreground">{l.leave_type} • {l.total_days}d</p></div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] text-emerald-600" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "approved" })}>✓</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] text-red-600" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "rejected" })}>✗</Button>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* DIRECTORY */}
        <TabsContent value="directory" className="mt-4 space-y-3">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTeam.map((m: any) => (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10"><AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-bold">{initials(m.full_name)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">{m.designation || "—"}</p>
                      <div className="flex gap-1 mt-1">{m.department && <Badge className={`text-[10px] ${deptColor(m.department)}`}>{m.department}</Badge>}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {m.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>}
                    {m.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.city}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ATTENDANCE */}
        <TabsContent value="attendance" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">Mark Attendance — {format(new Date(), "dd MMM yyyy")}</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {activeMembers.map((m: any) => {
              const marked = markedNames.has(m.full_name);
              const record = todayAttendance.find((a: any) => a.team_member_name === m.full_name);
              return (
                <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border ${marked ? "bg-muted/30" : "hover:bg-muted/20"}`}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">{initials(m.full_name)}</AvatarFallback></Avatar>
                    <div><p className="text-xs font-medium">{m.full_name}</p><p className="text-[10px] text-muted-foreground">{m.department}</p></div>
                  </div>
                  {marked ? (
                    <Badge className={`text-[9px] ${record?.status === "present" ? "bg-emerald-100 text-emerald-700" : record?.status === "absent" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{record?.status}</Badge>
                  ) : (
                    <div className="flex gap-1">
                      {["present", "absent", "late", "half_day"].map(s => (
                        <Button key={s} size="sm" variant="outline" className="h-6 text-[9px] px-2"
                          onClick={() => markAttendance.mutate({ team_member_name: m.full_name, status: s, team_member_phone: m.phone })}>
                          {s === "present" ? "✓" : s === "absent" ? "✗" : s === "late" ? "⏰" : "½"}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* LEAVES */}
        <TabsContent value="leaves" className="mt-4 space-y-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">From</TableHead>
                    <TableHead className="text-xs">To</TableHead>
                    <TableHead className="text-xs">Days</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs font-medium">{l.team_member_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px]">{l.leave_type}</Badge></TableCell>
                      <TableCell className="text-xs">{format(new Date(l.start_date), "dd MMM")}</TableCell>
                      <TableCell className="text-xs">{format(new Date(l.end_date), "dd MMM")}</TableCell>
                      <TableCell className="text-xs font-medium">{l.total_days}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${l.status === "approved" ? "bg-emerald-100 text-emerald-700" : l.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{l.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {l.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-600" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "approved" })}>Approve</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-600" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "rejected" })}>Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYROLL */}
        <TabsContent value="payroll" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Payroll — {format(new Date(), "MMM yyyy")}</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowDialog("payroll"); }}><Plus className="h-4 w-4 mr-1" /> Add Payroll</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Dept</TableHead>
                    <TableHead className="text-xs text-right">Basic</TableHead>
                    <TableHead className="text-xs text-right">Gross</TableHead>
                    <TableHead className="text-xs text-right">Deductions</TableHead>
                    <TableHead className="text-xs text-right">Net Pay</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-medium">{p.employee_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px]">{p.department}</Badge></TableCell>
                      <TableCell className="text-xs text-right">{fmt(p.basic_salary)}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{fmt(p.gross_salary)}</TableCell>
                      <TableCell className="text-xs text-right text-red-600">{fmt(p.deductions + p.tds + p.pf)}</TableCell>
                      <TableCell className="text-xs text-right font-bold text-emerald-600">{fmt(p.net_salary)}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${p.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        {p.status !== "paid" && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-600" onClick={() => updatePayrollStatus.mutate({ id: p.id, status: "paid" })}>Paid</Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]"
                          onClick={() => {
                            import("@/lib/generatePayslipPDF").then(({ generatePayslipPDF }) => {
                              generatePayslipPDF({
                                id: p.id,
                                employee_name: p.employee_name,
                                employee_id: p.employee_id,
                                department: p.department,
                                designation: p.designation,
                                payroll_month: p.payroll_month || p.pay_period,
                                basic_salary: Number(p.basic_salary || 0),
                                hra: Number(p.hra || 0),
                                da: Number(p.da || 0),
                                special_allowance: Number(p.special_allowance || 0),
                                other_allowances: Number(p.other_allowances || 0),
                                gross_salary: Number(p.gross_salary || 0),
                                pf_deduction: Number(p.pf_deduction || 0),
                                esi_deduction: Number(p.esi_deduction || 0),
                                tds: Number(p.tds || 0),
                                professional_tax: Number(p.professional_tax || 0),
                                other_deductions: Number(p.other_deductions || 0),
                                total_deductions: Number(p.total_deductions || 0),
                                net_salary: Number(p.net_salary || 0),
                                payment_mode: p.payment_mode,
                                payment_date: p.payment_date,
                                bank_account: p.bank_account,
                              });
                            });
                          }}>
                          <Download className="h-3 w-3 mr-1" /> Payslip
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payrolls.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">No payroll records this month</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Employee Documents & KYC</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowDialog("document"); }}><Plus className="h-4 w-4 mr-1" /> Add Document</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Doc Number</TableHead>
                    <TableHead className="text-xs">Expiry</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empDocs.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs font-medium">{d.employee_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px] capitalize">{d.document_type?.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{d.document_number || "-"}</TableCell>
                      <TableCell className="text-xs">{d.expiry_date ? format(new Date(d.expiry_date), "dd MMM yy") : "N/A"}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${d.verification_status === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{d.verification_status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {empDocs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">No documents</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERFORMANCE */}
        <TabsContent value="performance" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Award className="h-4 w-4" /> Performance Reviews</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowDialog("review"); }}><Plus className="h-4 w-4 mr-1" /> Add Review</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {reviews.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{r.employee_name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.review_type} review • {format(new Date(r.review_date), "dd MMM yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < (r.overall_rating || 0) ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </div>
                  {r.strengths && <p className="text-[10px] text-emerald-600 mb-1">💪 {r.strengths}</p>}
                  {r.improvements && <p className="text-[10px] text-amber-600 mb-1">📈 {r.improvements}</p>}
                  {r.comments && <p className="text-[10px] text-muted-foreground">{r.comments}</p>}
                </CardContent>
              </Card>
            ))}
            {reviews.length === 0 && <p className="text-center text-xs text-muted-foreground py-8 col-span-full">No reviews yet</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── DIALOGS ── */}
      <Dialog open={showDialog === "payroll"} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><IndianRupee className="h-5 w-5 text-emerald-600" /> Add Payroll Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Employee Name *</Label><Input value={form.employee_name || ""} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} /></div>
              <div>
                <Label className="text-xs">Department</Label>
                <Select value={form.department || ""} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Basic Salary *</Label><Input type="number" value={form.basic_salary || ""} onChange={e => setForm(f => ({ ...f, basic_salary: e.target.value }))} /></div>
              <div><Label className="text-xs">HRA</Label><Input type="number" value={form.hra || ""} onChange={e => setForm(f => ({ ...f, hra: e.target.value }))} /></div>
              <div><Label className="text-xs">DA</Label><Input type="number" value={form.da || ""} onChange={e => setForm(f => ({ ...f, da: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Special Allow.</Label><Input type="number" value={form.special_allowance || ""} onChange={e => setForm(f => ({ ...f, special_allowance: e.target.value }))} /></div>
              <div><Label className="text-xs">Bonus</Label><Input type="number" value={form.bonus || ""} onChange={e => setForm(f => ({ ...f, bonus: e.target.value }))} /></div>
              <div><Label className="text-xs">Other Deductions</Label><Input type="number" value={form.deductions || ""} onChange={e => setForm(f => ({ ...f, deductions: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">TDS</Label><Input type="number" value={form.tds || ""} onChange={e => setForm(f => ({ ...f, tds: e.target.value }))} /></div>
              <div><Label className="text-xs">PF</Label><Input type="number" value={form.pf || ""} onChange={e => setForm(f => ({ ...f, pf: e.target.value }))} /></div>
            </div>
            <Button onClick={() => addPayroll.mutate(form)} disabled={!form.employee_name || !form.basic_salary || addPayroll.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {addPayroll.isPending ? "Saving..." : "Add Payroll Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog === "document"} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Employee Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Employee Name *</Label><Input value={form.employee_name || ""} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Document Type *</Label>
                <Select value={form.document_type || ""} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(d => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Document Number</Label><Input value={form.document_number || ""} onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Expiry Date</Label><Input type="date" value={form.expiry_date || ""} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
            <div><Label className="text-xs">Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <Button onClick={() => addDocument.mutate(form)} disabled={!form.employee_name || !form.document_type || addDocument.isPending} className="w-full">
              {addDocument.isPending ? "Saving..." : "Add Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog === "review"} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Performance Review</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Employee Name *</Label><Input value={form.employee_name || ""} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} /></div>
              <div>
                <Label className="text-xs">Review Type</Label>
                <Select value={form.review_type || "quarterly"} onValueChange={v => setForm(f => ({ ...f, review_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REVIEW_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Review Date</Label><Input type="date" value={form.review_date || today} onChange={e => setForm(f => ({ ...f, review_date: e.target.value }))} /></div>
              <div>
                <Label className="text-xs">Rating (1-5) *</Label>
                <Select value={form.overall_rating || "3"} onValueChange={v => setForm(f => ({ ...f, overall_rating: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5].map(r => <SelectItem key={r} value={String(r)}>{r} Star{r > 1 ? "s" : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Strengths</Label><Textarea value={form.strengths || ""} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} rows={2} /></div>
            <div><Label className="text-xs">Areas for Improvement</Label><Textarea value={form.improvements || ""} onChange={e => setForm(f => ({ ...f, improvements: e.target.value }))} rows={2} /></div>
            <div><Label className="text-xs">Goals for Next Period</Label><Textarea value={form.goals || ""} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} rows={2} /></div>
            <Button onClick={() => addReview.mutate(form)} disabled={!form.employee_name || addReview.isPending} className="w-full">
              {addReview.isPending ? "Saving..." : "Submit Review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
