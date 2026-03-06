import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Users, UserPlus, CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle,
  Search, Plus, Phone, Mail, Building2, MapPin, CreditCard, FileText,
  Megaphone, Pin, Star, Briefcase, GraduationCap, Heart, Shield,
  CalendarCheck, CalendarX, CalendarMinus, Edit2, Eye, Trash2
} from "lucide-react";

const LEAVE_TYPES = ["casual", "sick", "earned", "comp_off", "unpaid"];
const ATTENDANCE_STATUS = ["present", "absent", "half_day", "late", "work_from_home", "on_leave"];
const DEPARTMENTS = ["sales", "insurance", "rental", "hsrp", "marketing", "finance", "operations", "hr", "management"];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"];

export const HRWorkspace = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [showDialog, setShowDialog] = useState<"member" | "attendance" | "leave" | "announcement" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const resetForm = () => setForm({});

  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = format(new Date(), "yyyy-MM");
  const currentYear = new Date().getFullYear();

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

  const { data: leaveBalances = [] } = useQuery({
    queryKey: ["hr-leave-balances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_balances").select("*").eq("year", currentYear);
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

  // ── Mutations ──
  const addMember = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase.from("hr_team_directory").insert(entry);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hr-directory"] }); setShowDialog(null); resetForm(); toast.success("Team member added"); },
  });

  const markAttendance = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase.from("attendance_records").insert({ ...entry, attendance_date: today });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hr-attendance-today"] }); toast.success("Attendance marked"); },
  });

  const bulkMarkAttendance = useMutation({
    mutationFn: async (entries: any[]) => {
      const { error } = await supabase.from("attendance_records").insert(entries);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hr-attendance-today"] }); toast.success("Bulk attendance marked"); },
  });

  const addLeaveRequest = useMutation({
    mutationFn: async (entry: any) => {
      const start = new Date(entry.start_date);
      const end = new Date(entry.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const { error } = await supabase.from("leave_requests").insert({ ...entry, total_days: days });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hr-leave-requests"] }); setShowDialog(null); resetForm(); toast.success("Leave request submitted"); },
  });

  const updateLeaveStatus = useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) => {
      const { error } = await supabase.from("leave_requests").update({
        status, rejection_reason, approved_at: status === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hr-leave-requests"] }); toast.success("Leave status updated"); },
  });

  const addAnnouncement = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase.from("hr_announcements").insert(entry);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hr-announcements"] }); setShowDialog(null); resetForm(); toast.success("Announcement posted"); },
  });

  // ── Computed ──
  const activeMembers = team.filter((m: any) => m.is_active);
  const presentToday = todayAttendance.filter((a: any) => a.status === "present" || a.status === "late" || a.status === "work_from_home");
  const absentToday = todayAttendance.filter((a: any) => a.status === "absent");
  const pendingLeaves = leaveRequests.filter((l: any) => l.status === "pending");
  const markedNames = new Set(todayAttendance.map((a: any) => a.team_member_name));

  const filteredTeam = useMemo(() => {
    if (!searchQuery) return activeMembers;
    const q = searchQuery.toLowerCase();
    return activeMembers.filter((m: any) => m.full_name?.toLowerCase().includes(q) || m.department?.toLowerCase().includes(q) || m.designation?.toLowerCase().includes(q));
  }, [activeMembers, searchQuery]);

  const initials = (name: string) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";
  const deptColor = (d: string) => {
    const colors: Record<string, string> = { sales: "bg-blue-100 text-blue-700", insurance: "bg-purple-100 text-purple-700", rental: "bg-teal-100 text-teal-700", marketing: "bg-pink-100 text-pink-700", finance: "bg-emerald-100 text-emerald-700", hr: "bg-orange-100 text-orange-700", management: "bg-slate-100 text-slate-700" };
    return colors[d] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white"><Users className="h-5 w-5" /></div>
            HR & Office Culture
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Team Directory • Attendance • Leaves • Announcements</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search team..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 w-[200px]" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Team", value: activeMembers.length, icon: Users, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Present Today", value: presentToday.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Absent Today", value: absentToday.length, icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Pending Leaves", value: pendingLeaves.length, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Announcements", value: announcements.length, icon: Megaphone, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
        ].map(kpi => (
          <Card key={kpi.label} className={`${kpi.bg} border-none shadow-sm`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="text-xs">📊 Overview</TabsTrigger>
          <TabsTrigger value="directory" className="text-xs">👥 Directory</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs">📋 Attendance</TabsTrigger>
          <TabsTrigger value="leaves" className="text-xs">🏖️ Leaves</TabsTrigger>
          <TabsTrigger value="culture" className="text-xs">📢 Culture</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Pinned Announcements */}
          {announcements.filter((a: any) => a.is_pinned).length > 0 && (
            <div className="space-y-2">
              {announcements.filter((a: any) => a.is_pinned).map((a: any) => (
                <Card key={a.id} className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardContent className="p-3 flex items-start gap-3">
                    <Pin className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{a.content}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Today's Attendance Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Today's Attendance
                  <Badge variant="outline">{format(new Date(), "dd MMM yyyy")}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <Progress value={(presentToday.length / (activeMembers.length || 1)) * 100} className="h-3" />
                  </div>
                  <span className="text-sm font-semibold">{presentToday.length}/{activeMembers.length}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20"><p className="text-lg font-bold text-emerald-600">{presentToday.length}</p><p className="text-[10px] text-muted-foreground">Present</p></div>
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20"><p className="text-lg font-bold text-red-600">{absentToday.length}</p><p className="text-[10px] text-muted-foreground">Absent</p></div>
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20"><p className="text-lg font-bold text-amber-600">{activeMembers.length - markedNames.size}</p><p className="text-[10px] text-muted-foreground">Unmarked</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Leave Requests */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Pending Leave Requests</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[160px]">
                  {pendingLeaves.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">No pending requests</p>}
                  {pendingLeaves.slice(0, 5).map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">{initials(l.team_member_name)}</AvatarFallback></Avatar>
                        <div>
                          <p className="text-xs font-medium">{l.team_member_name}</p>
                          <p className="text-[10px] text-muted-foreground">{l.leave_type} • {l.total_days}d</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] text-emerald-600" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "approved" })}>✓</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] text-red-600" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "rejected", rejection_reason: "Denied by admin" })}>✗</Button>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Department Breakdown */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Team by Department</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {DEPARTMENTS.map(d => {
                  const count = activeMembers.filter((m: any) => m.department === d).length;
                  return (
                    <div key={d} className="text-center p-3 rounded-lg border hover:shadow-sm transition-shadow">
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{d}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DIRECTORY */}
        <TabsContent value="directory" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Team Directory ({activeMembers.length})</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowDialog("member"); }}><UserPlus className="h-4 w-4 mr-1" /> Add Member</Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTeam.map((m: any) => (
              <Card key={m.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedMember(m)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-bold">
                        {initials(m.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">{m.designation || "—"}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {m.department && <Badge className={`text-[10px] ${deptColor(m.department)}`}>{m.department}</Badge>}
                        <Badge variant="outline" className="text-[10px]">{m.employment_type?.replace(/_/g, " ") || "Full Time"}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    {m.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {m.phone}</span>}
                    {m.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {m.city}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredTeam.length === 0 && <p className="text-center text-sm text-muted-foreground py-12 col-span-full">No team members found</p>}
          </div>
        </TabsContent>

        {/* ATTENDANCE */}
        <TabsContent value="attendance" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><CalendarCheck className="h-4 w-4" /> Today's Attendance — {format(new Date(), "dd MMM yyyy")}</h3>
            <Button size="sm" variant="outline" onClick={() => {
              const unmarked = activeMembers.filter((m: any) => !markedNames.has(m.full_name));
              if (unmarked.length === 0) { toast.info("All members already marked"); return; }
              const entries = unmarked.map((m: any) => ({ team_member_name: m.full_name, team_member_phone: m.phone, status: "present", attendance_date: today, check_in: new Date().toISOString() }));
              bulkMarkAttendance.mutate(entries);
            }}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Mark All Present
            </Button>
          </div>

          <div className="space-y-2">
            {activeMembers.map((m: any) => {
              const att = todayAttendance.find((a: any) => a.team_member_name === m.full_name);
              return (
                <Card key={m.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">{initials(m.full_name)}</AvatarFallback></Avatar>
                      <div>
                        <p className="text-sm font-medium">{m.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{m.designation || m.department || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {att ? (
                        <Badge variant={att.status === "present" || att.status === "work_from_home" ? "default" : att.status === "absent" ? "destructive" : "secondary"} className="text-xs">
                          {att.status === "present" ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Present</> :
                            att.status === "absent" ? <><XCircle className="h-3 w-3 mr-1" /> Absent</> :
                              att.status === "late" ? <><Clock className="h-3 w-3 mr-1" /> Late</> :
                                att.status === "work_from_home" ? "🏠 WFH" :
                                  att.status === "half_day" ? "½ Day" : att.status}
                        </Badge>
                      ) : (
                        <div className="flex gap-1">
                          {["present", "absent", "late", "half_day", "work_from_home"].map(s => (
                            <Button key={s} size="sm" variant="outline" className="h-7 text-[10px] px-2"
                              onClick={() => markAttendance.mutate({ team_member_name: m.full_name, team_member_phone: m.phone, status: s, check_in: s !== "absent" ? new Date().toISOString() : null })}>
                              {s === "present" ? "✓" : s === "absent" ? "✗" : s === "late" ? "⏰" : s === "half_day" ? "½" : "🏠"}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* LEAVES */}
        <TabsContent value="leaves" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><CalendarX className="h-4 w-4" /> Leave Management</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowDialog("leave"); }}><Plus className="h-4 w-4 mr-1" /> Apply Leave</Button>
          </div>

          <div className="space-y-2">
            {leaveRequests.map((l: any) => (
              <Card key={l.id} className={`hover:shadow-sm transition-shadow ${l.status === "pending" ? "border-l-4 border-l-amber-400" : ""}`}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">{initials(l.team_member_name)}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-sm font-medium">{l.team_member_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px]">{l.leave_type}</Badge>
                        <span className="text-[10px] text-muted-foreground">{l.start_date} → {l.end_date} ({l.total_days}d)</span>
                      </div>
                      {l.reason && <p className="text-[10px] text-muted-foreground mt-0.5 italic">"{l.reason}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={l.status === "approved" ? "default" : l.status === "rejected" ? "destructive" : "outline"}>
                      {l.status === "approved" ? <><CheckCircle2 className="h-3 w-3 mr-0.5" /> Approved</> :
                        l.status === "rejected" ? <><XCircle className="h-3 w-3 mr-0.5" /> Rejected</> :
                          <><Clock className="h-3 w-3 mr-0.5" /> Pending</>}
                    </Badge>
                    {l.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-emerald-600" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "approved" })}>Approve</Button>
                        <Button size="sm" variant="outline" className="h-6 text-red-600" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "rejected", rejection_reason: "Denied" })}>Reject</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {leaveRequests.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No leave requests</p>}
          </div>
        </TabsContent>

        {/* CULTURE / ANNOUNCEMENTS */}
        <TabsContent value="culture" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><Megaphone className="h-4 w-4" /> Announcements & Culture</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowDialog("announcement"); }}><Plus className="h-4 w-4 mr-1" /> Post</Button>
          </div>
          <div className="space-y-2">
            {announcements.map((a: any) => (
              <Card key={a.id} className={`hover:shadow-sm transition-shadow ${a.is_pinned ? "border-l-4 border-l-amber-500" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {a.is_pinned && <Pin className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{a.title}</p>
                          <Badge variant={a.priority === "urgent" ? "destructive" : a.priority === "important" ? "default" : "secondary"} className="text-[10px]">{a.priority}</Badge>
                          <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">{a.posted_by && `By ${a.posted_by} • `}{format(new Date(a.created_at), "dd MMM yyyy, HH:mm")}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {announcements.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No announcements yet</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ DIALOGS ═══ */}

      {/* Add Team Member */}
      <Dialog open={showDialog === "member"} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-violet-600" /> Add Team Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Full Name *" value={form.full_name || ""} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              <Input placeholder="Phone *" value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Email" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <Input placeholder="Designation" value={form.designation || ""} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.department || ""} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.employment_type || "full_time"} onValueChange={v => setForm(f => ({ ...f, employment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Vertical (e.g. sales, insurance)" value={form.vertical_name || ""} onChange={e => setForm(f => ({ ...f, vertical_name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Date of Joining</label><Input type="date" value={form.date_of_joining || ""} onChange={e => setForm(f => ({ ...f, date_of_joining: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Date of Birth</label><Input type="date" value={form.date_of_birth || ""} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="City" value={form.city || ""} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              <Input placeholder="Blood Group" value={form.blood_group || ""} onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))} />
            </div>
            <Input placeholder="Address" value={form.address || ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            <p className="text-xs font-semibold text-muted-foreground pt-2">Emergency Contact</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Emergency Name" value={form.emergency_contact_name || ""} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} />
              <Input placeholder="Emergency Phone" value={form.emergency_contact_phone || ""} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} />
            </div>
            <p className="text-xs font-semibold text-muted-foreground pt-2">Bank & ID Details</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Bank Name" value={form.bank_name || ""} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
              <Input placeholder="Account Number" value={form.bank_account_number || ""} onChange={e => setForm(f => ({ ...f, bank_account_number: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="IFSC" value={form.ifsc_code || ""} onChange={e => setForm(f => ({ ...f, ifsc_code: e.target.value }))} />
              <Input placeholder="PAN" value={form.pan_number || ""} onChange={e => setForm(f => ({ ...f, pan_number: e.target.value }))} />
              <Input placeholder="Aadhar" value={form.aadhar_number || ""} onChange={e => setForm(f => ({ ...f, aadhar_number: e.target.value }))} />
            </div>
            <Input type="number" placeholder="Salary CTC" value={form.salary_ctc || ""} onChange={e => setForm(f => ({ ...f, salary_ctc: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>Cancel</Button>
            <Button disabled={!form.full_name || !form.phone} onClick={() => addMember.mutate({ ...form, salary_ctc: Number(form.salary_ctc) || null })}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Leave */}
      <Dialog open={showDialog === "leave"} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CalendarX className="h-5 w-5 text-amber-600" /> Apply Leave</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.team_member_name || ""} onValueChange={v => setForm(f => ({ ...f, team_member_name: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Member *" /></SelectTrigger>
              <SelectContent>{activeMembers.map((m: any) => <SelectItem key={m.id} value={m.full_name}>{m.full_name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.leave_type || "casual"} onValueChange={v => setForm(f => ({ ...f, leave_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAVE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">From *</label><Input type="date" value={form.start_date || ""} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">To *</label><Input type="date" value={form.end_date || ""} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <Textarea placeholder="Reason *" value={form.reason || ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>Cancel</Button>
            <Button disabled={!form.team_member_name || !form.start_date || !form.end_date || !form.reason} onClick={() => addLeaveRequest.mutate(form)}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Announcement */}
      <Dialog open={showDialog === "announcement"} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-blue-600" /> Post Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title *" value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Content *" value={form.content || ""} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.category || "general"} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="celebration">🎉 Celebration</SelectItem>
                  <SelectItem value="policy">📜 Policy</SelectItem>
                  <SelectItem value="event">🎯 Event</SelectItem>
                  <SelectItem value="achievement">🏆 Achievement</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.priority || "normal"} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">⚠️ Important</SelectItem>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_pinned || false} onCheckedChange={v => setForm(f => ({ ...f, is_pinned: v }))} />
              <span className="text-sm">Pin to top</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>Cancel</Button>
            <Button disabled={!form.title || !form.content} onClick={() => addAnnouncement.mutate(form)}>Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Detail Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedMember && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12"><AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold">{initials(selectedMember.full_name)}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-lg">{selectedMember.full_name}</p>
                    <p className="text-sm text-muted-foreground font-normal">{selectedMember.designation} • {selectedMember.department}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Phone, label: "Phone", value: selectedMember.phone },
                    { icon: Mail, label: "Email", value: selectedMember.email },
                    { icon: MapPin, label: "City", value: selectedMember.city },
                    { icon: Briefcase, label: "Type", value: selectedMember.employment_type?.replace(/_/g, " ") },
                    { icon: CalendarDays, label: "Joined", value: selectedMember.date_of_joining },
                    { icon: Heart, label: "DOB", value: selectedMember.date_of_birth },
                    { icon: Shield, label: "Blood Group", value: selectedMember.blood_group },
                    { icon: Building2, label: "Vertical", value: selectedMember.vertical_name },
                  ].map(item => item.value && (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{item.label}:</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
                {selectedMember.emergency_contact_name && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                    <p className="text-xs font-semibold text-red-600 mb-1">Emergency Contact</p>
                    <p className="text-sm">{selectedMember.emergency_contact_name} — {selectedMember.emergency_contact_phone}</p>
                  </div>
                )}
                {(selectedMember.bank_name || selectedMember.pan_number) && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-semibold mb-1">Bank & ID</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {selectedMember.bank_name && <p>Bank: {selectedMember.bank_name}</p>}
                      {selectedMember.bank_account_number && <p>A/C: ****{selectedMember.bank_account_number.slice(-4)}</p>}
                      {selectedMember.pan_number && <p>PAN: {selectedMember.pan_number}</p>}
                      {selectedMember.salary_ctc && <p>CTC: ₹{Number(selectedMember.salary_ctc).toLocaleString("en-IN")}</p>}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
