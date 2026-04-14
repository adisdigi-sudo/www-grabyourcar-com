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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Home, Users, CalendarDays, Clock, Palmtree, BarChart3, FileText,
  Settings, MessageSquare, UserPlus, Search, ChevronRight, CheckCircle2,
  AlertTriangle, Megaphone, Briefcase, GraduationCap, Heart, Award,
  CreditCard, FolderOpen, Headphones, Package, Sun, Moon, Star,
  MoreHorizontal, Pin, Bell, MapPin, Phone, Mail, Building2, IndianRupee,
  CalendarCheck, Layers, BookOpen, Plane, ListTodo, Wallet, Building
} from "lucide-react";

// Lazy-load sub-modules
import { HRCoreModule } from "./HRCoreModule";
import { HRRecruitmentModule } from "./HRRecruitmentModule";
import { HRWorkforceModule } from "./HRWorkforceModule";
import { HRAttendanceModule } from "./HRAttendanceModule";
import { HRPayrollModule } from "./HRPayrollModule";
import { HRExpenseModule } from "./HRExpenseModule";
import { HRPerformanceModule } from "./HRPerformanceModule";
import { HREngagementModule } from "./HREngagementModule";
import { HRAssetModule } from "./HRAssetModule";
import { HRHelpdeskModule } from "./HRHelpdeskModule";
import { HROnboarding } from "./HROnboarding";
import { TicketApprovalCenter } from "./TicketApprovalCenter";
import { SalaryEngine } from "./SalaryEngine";
import { EmployeeDocumentHub } from "./EmployeeDocumentHub";
import { EmployeeProfileView } from "./EmployeeProfileView";
import { EmployeeTargetDashboard } from "./EmployeeTargetDashboard";
import { PerformanceEvaluationSystem } from "./PerformanceEvaluationSystem";

const initials = (name: string) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";

// Sidebar nav items (Zoho People style)
const SIDEBAR_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "onboarding", label: "Onboarding", icon: UserPlus },
  { id: "employee-directory", label: "Employee Directory", icon: Users },
  { id: "document-hub", label: "Document Hub", icon: FileText },
  { id: "targets", label: "Targets & Incentives", icon: Award },
  { id: "tickets", label: "Tickets & Approvals", icon: ListTodo },
  { id: "salary-engine", label: "Salary Engine", icon: IndianRupee },
  { id: "leave", label: "Leave Tracker", icon: Palmtree },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "time", label: "Time Tracker", icon: Clock },
  { id: "more", label: "More", icon: MoreHorizontal },
  { id: "operations", label: "Operations", icon: Settings },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

// "More Services" items
const MORE_SERVICES = [
  { id: "performance", label: "Performance", icon: Award },
  { id: "files", label: "Files & Documents", icon: FolderOpen },
  { id: "engagement", label: "Employee Engagement", icon: Heart },
  { id: "hr-letters", label: "HR Letters", icon: FileText },
  { id: "travel", label: "Travel & Expense", icon: Plane },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "compensation", label: "Compensation", icon: Wallet },
  { id: "assets", label: "Assets", icon: Package },
  { id: "helpdesk", label: "Helpdesk", icon: Headphones },
  { id: "recruitment", label: "Recruitment", icon: Briefcase },
  { id: "workforce", label: "Workforce Analytics", icon: BarChart3 },
  { id: "payroll", label: "Payroll", icon: IndianRupee },
];

// Top-level tabs
const TOP_TABS = ["My Space", "Team", "Organization"];

// My Space sub-tabs
const MYSPACE_TABS = ["Feeds", "Profile", "Approvals", "Leave", "Attendance"];

export const ZohoHRWorkspace = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sidebarActive, setSidebarActive] = useState("home");
  const [topTab, setTopTab] = useState("My Space");
  const [mySpaceTab, setMySpaceTab] = useState("Feeds");
  const [showMoreServices, setShowMoreServices] = useState(false);
  const [search, setSearch] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");
  const greeting = new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 17 ? "Good Afternoon" : "Good Evening";

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

  const { data: announcements = [] } = useQuery({
    queryKey: ["hr-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_announcements").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const activeMembers = team.filter((m: any) => m.is_active);
  const presentToday = todayAttendance.filter((a: any) => ["present", "late", "work_from_home"].includes(a.status));
  const pendingLeaves = leaveRequests.filter((l: any) => l.status === "pending");
  const markedNames = new Set(todayAttendance.map((a: any) => a.team_member_name));

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

  // Handle sidebar navigation → switch to module views
  const handleSidebarClick = (id: string) => {
    setSidebarActive(id);
    setShowMoreServices(id === "more");
  };

  // Render module content based on sidebar or "more services" selection
  const renderModuleContent = () => {
    switch (sidebarActive) {
      case "onboarding": return <HROnboarding />;
      case "employee-directory": return <EmployeeProfileView />;
      case "document-hub": return <EmployeeDocumentHub />;
      case "targets": return <EmployeeTargetDashboard />;
      case "tickets": return <TicketApprovalCenter />;
      case "salary-engine": return <SalaryEngine />;
      case "leave": return renderLeaveTracker();
      case "attendance": return <HRAttendanceModule />;
      case "time": return <HRAttendanceModule />;
      case "operations": return <HRCoreModule />;
      case "reports": return <HRWorkforceModule />;
      case "performance": return <PerformanceEvaluationSystem />;
      case "files": return renderDocuments();
      case "performance-eval": return <PerformanceEvaluationSystem />;
      case "engagement": return <HREngagementModule />;
      case "travel": return <HRExpenseModule />;
      case "tasks": return <HRHelpdeskModule />;
      case "compensation": return <HRPayrollModule />;
      case "assets": return <HRAssetModule />;
      case "helpdesk": return <HRHelpdeskModule />;
      case "recruitment": return <HRRecruitmentModule />;
      case "workforce": return <HRWorkforceModule />;
      case "payroll": return <HRPayrollModule />;
      case "hr-letters": return <EmployeeDocumentHub />;
      case "home":
      default:
        return renderHome();
    }
  };

  const renderHome = () => (
    <div className="flex-1 overflow-auto">
      {/* Top tabs */}
      <div className="border-b bg-card">
        <div className="flex items-center gap-0">
          {TOP_TABS.map(t => (
            <button key={t} onClick={() => setTopTab(t)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative ${topTab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
              {topTab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>
      </div>

      {topTab === "My Space" && renderMySpace()}
      {topTab === "Team" && renderTeamView()}
      {topTab === "Organization" && renderOrgView()}
    </div>
  );

  const renderMySpace = () => (
    <div className="flex-1">
      {/* Banner */}
      <div className="relative h-32 bg-gradient-to-r from-emerald-800 via-green-700 to-teal-600 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-30" />
      </div>

      {/* Sub tabs */}
      <div className="border-b bg-card px-6">
        <div className="flex items-center gap-0">
          {MYSPACE_TABS.map(t => (
            <button key={t} onClick={() => setMySpaceTab(t)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${mySpaceTab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
              {mySpaceTab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
          <button className="px-3 py-3 text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {mySpaceTab === "Feeds" && renderFeeds()}
        {mySpaceTab === "Profile" && renderProfile()}
        {mySpaceTab === "Approvals" && renderApprovals()}
        {mySpaceTab === "Leave" && renderLeaveTracker()}
        {mySpaceTab === "Attendance" && renderAttendanceView()}
      </div>
    </div>
  );

  const renderFeeds = () => (
    <div className="space-y-4 max-w-3xl">
      {/* Greeting Card */}
      <Card className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-200 dark:border-violet-800">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{greeting} 👋</h2>
            <p className="text-sm text-muted-foreground mt-1">Have a productive day!</p>
          </div>
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 opacity-60" />
        </CardContent>
      </Card>

      {/* Check-in Reminder */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Check-in reminder</p>
              <p className="text-xs text-muted-foreground">Your shift has already started</p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="text-xs">General</Badge>
            <p className="text-xs text-muted-foreground mt-1">9:00 AM-6:00 PM</p>
          </div>
        </CardContent>
      </Card>

      {/* Work Schedule */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold text-sm">Work Schedule</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(), "dd-MMM-yyyy")} — {format(new Date(Date.now() + 4 * 86400000), "dd-MMM-yyyy")}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">General</Badge>
            <span className="text-xs text-muted-foreground">9:00 AM - 6:00 PM</span>
          </div>
        </CardContent>
      </Card>

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-600">{presentToday.length}</p>
            <p className="text-xs text-muted-foreground">Present Today</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-600">{pendingLeaves.length}</p>
            <p className="text-xs text-muted-foreground">Pending Leaves</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">{activeMembers.length}</p>
            <p className="text-xs text-muted-foreground">Total Team</p>
          </CardContent>
        </Card>
      </div>

      {/* Announcements Feed */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Recent Announcements
          </h3>
          {announcements.slice(0, 5).map((a: any) => (
            <Card key={a.id} className={a.is_pinned ? "border-l-4 border-l-amber-500" : ""}>
              <CardContent className="p-3 flex items-start gap-3">
                {a.is_pinned && <Pin className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />}
                <div className="flex-1">
                  <p className="font-semibold text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-2">{format(new Date(a.created_at), "dd MMM yyyy, hh:mm a")}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold">
                {user?.email?.[0]?.toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user?.email?.split("@")[0] || "Admin"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge className="mt-2 bg-primary/10 text-primary">Administrator</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      <HRCoreModule />
    </div>
  );

  const renderApprovals = () => (
    <div className="max-w-3xl space-y-4">
      <h3 className="text-lg font-semibold">Pending Approvals</h3>
      {pendingLeaves.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No pending approvals</CardContent></Card>
      )}
      {pendingLeaves.map((l: any) => (
        <Card key={l.id} className="border-l-4 border-l-amber-400">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs bg-violet-100 text-violet-700">{initials(l.team_member_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{l.team_member_name}</p>
                <p className="text-xs text-muted-foreground">
                  {l.leave_type} leave • {l.total_days} day(s) • {format(new Date(l.start_date), "dd MMM")} - {format(new Date(l.end_date), "dd MMM")}
                </p>
                {l.reason && <p className="text-xs text-muted-foreground mt-1 italic">"{l.reason}"</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "approved" })}>
                Approve
              </Button>
              <Button size="sm" variant="outline" className="text-destructive h-8" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "rejected" })}>
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderLeaveTracker = () => (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Palmtree className="h-5 w-5 text-emerald-600" /> Leave Tracker</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{leaveRequests.filter((l: any) => l.status === "approved").length}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingLeaves.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{leaveRequests.filter((l: any) => l.status === "rejected").length}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Employee</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Period</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Days</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((l: any) => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 flex items-center gap-2">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">{initials(l.team_member_name)}</AvatarFallback></Avatar>
                      <span className="font-medium text-xs">{l.team_member_name}</span>
                    </td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px] capitalize">{l.leave_type}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{format(new Date(l.start_date), "dd MMM")} – {format(new Date(l.end_date), "dd MMM")}</td>
                    <td className="p-3 text-xs font-medium">{l.total_days}</td>
                    <td className="p-3">
                      <Badge className={`text-[10px] ${l.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : l.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                        {l.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {l.status === "pending" && (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-600" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "approved" })}>✓ Approve</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-600" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "rejected" })}>✗ Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {leaveRequests.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">No leave requests</td></tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  const renderAttendanceView = () => (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-blue-600" /> Today's Attendance — {format(new Date(), "dd MMM yyyy")}</h3>
      </div>
      <Progress value={(presentToday.length / (activeMembers.length || 1)) * 100} className="h-3" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
        {activeMembers.map((m: any) => {
          const marked = markedNames.has(m.full_name);
          const record = todayAttendance.find((a: any) => a.team_member_name === m.full_name);
          return (
            <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${marked ? "bg-muted/30" : "hover:bg-muted/20"}`}>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">{initials(m.full_name)}</AvatarFallback></Avatar>
                <div><p className="text-xs font-medium">{m.full_name}</p><p className="text-[10px] text-muted-foreground capitalize">{m.department}</p></div>
              </div>
              {marked ? (
                <Badge className={`text-[9px] capitalize ${record?.status === "present" ? "bg-emerald-100 text-emerald-700" : record?.status === "absent" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{record?.status}</Badge>
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
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><FolderOpen className="h-5 w-5" /> Files & Documents</h3>
      <HRCoreModule />
    </div>
  );

  const renderTeamView = () => (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Team Directory ({activeMembers.length})</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search team..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[240px]" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeMembers.filter((m: any) => !search || m.full_name?.toLowerCase().includes(search.toLowerCase())).map((m: any) => (
          <Card key={m.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-bold">{initials(m.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{m.full_name}</p>
                  <p className="text-xs text-muted-foreground">{m.designation || "—"}</p>
                  {m.department && <Badge variant="outline" className="text-[10px] mt-1 capitalize">{m.department}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                {m.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>}
                {m.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{m.email}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderOrgView = () => {
    const departments = [...new Set(team.map((m: any) => m.department).filter(Boolean))];
    return (
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Building2 className="h-5 w-5" /> Organization Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{activeMembers.length}</p><p className="text-xs text-muted-foreground">Total Employees</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{departments.length}</p><p className="text-xs text-muted-foreground">Departments</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{activeMembers.length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{team.length - activeMembers.length}</p><p className="text-xs text-muted-foreground">Inactive</p></CardContent></Card>
        </div>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Department Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {departments.sort().map(dept => {
                const count = activeMembers.filter((m: any) => m.department === dept).length;
                const pct = (count / activeMembers.length) * 100;
                return (
                  <div key={dept} className="flex items-center gap-3">
                    <span className="text-xs w-24 capitalize font-medium">{dept}</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <HRWorkforceModule />
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100vh-64px)] bg-background overflow-hidden -m-6">
        {/* Left Sidebar — Zoho People style */}
        <div className="w-16 bg-card border-r flex flex-col items-center py-3 gap-1 shrink-0">
          {/* Logo */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-3">
            <Users className="h-5 w-5 text-white" />
          </div>

          {SIDEBAR_ITEMS.slice(0, 5).map(item => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleSidebarClick(item.id)}
                  className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors text-[9px] font-medium
                    ${sidebarActive === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="leading-none">{item.label.split(" ")[0]}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}

          <Separator className="my-1 w-8" />

          {SIDEBAR_ITEMS.slice(5).map(item => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleSidebarClick(item.id)}
                  className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors text-[9px] font-medium
                    ${sidebarActive === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="leading-none">{item.label.split(" ")[0]}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}

          <div className="flex-1" />

          {/* Bottom sidebar icons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-[9px]">
                <MessageSquare className="h-5 w-5" />
                <span className="leading-none">Chats</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Smart Chat</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-[9px]">
                <Users className="h-5 w-5" />
                <span className="leading-none">Contacts</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Contacts</TooltipContent>
          </Tooltip>
        </div>

        {/* More Services Panel (slides in when "More" is clicked) */}
        {showMoreServices && sidebarActive === "more" && (
          <div className="w-72 border-r bg-card overflow-y-auto shrink-0">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">More Services</h3>
                <Button variant="link" size="sm" className="text-xs text-primary p-0 h-auto">
                  <Settings className="h-3 w-3 mr-1" /> Preferences
                </Button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search Services" className="pl-8 h-9 text-sm" />
              </div>
              <div className="space-y-1">
                {MORE_SERVICES.map(service => (
                  <button
                    key={service.id}
                    onClick={() => { setSidebarActive(service.id); setShowMoreServices(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <service.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{service.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {renderModuleContent()}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ZohoHRWorkspace;
