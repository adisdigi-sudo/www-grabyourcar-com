import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, User, FileText, IndianRupee, Calendar, Briefcase,
  Phone, Mail, Building2, MapPin, Award, Target, Clock,
  Download, ChevronRight
} from "lucide-react";
import { generateEmployeeDocumentPDF } from "@/lib/generateEmployeeDocumentPDF";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
const initials = (n: string) => n?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";

export const EmployeeProfileView = () => {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["emp-profiles-all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employee_profiles") as any).select("*").order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const selected = employees.find((e: any) => e.id === selectedId);

  const { data: documents = [] } = useQuery({
    queryKey: ["emp-profile-docs", selected?.user_id, selected?.full_name],
    queryFn: async () => {
      if (!selected) return [];
      const q = supabase.from("employee_documents").select("*").order("created_at", { ascending: false });
      if (selected.user_id) {
        const { data } = await q.eq("employee_user_id", selected.user_id);
        if (data?.length) return data;
      }
      const { data } = await q.eq("employee_name", selected.full_name);
      return data || [];
    },
    enabled: !!selected,
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ["emp-payroll-history", selected?.full_name],
    queryFn: async () => {
      if (!selected) return [];
      const { data } = await (supabase.from("payroll_records") as any)
        .select("*").eq("employee_name", selected.full_name).order("payroll_month", { ascending: false }).limit(12);
      return data || [];
    },
    enabled: !!selected,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["emp-attendance", selected?.full_name],
    queryFn: async () => {
      if (!selected) return [];
      const { data } = await supabase.from("attendance_records")
        .select("*").eq("team_member_name", selected.full_name)
        .order("attendance_date", { ascending: false }).limit(30);
      return data || [];
    },
    enabled: !!selected,
  });

  const { data: incentives = [] } = useQuery({
    queryKey: ["emp-incentives", selected?.user_id],
    queryFn: async () => {
      if (!selected?.user_id) return [];
      const { data } = await (supabase.from("incentive_monthly_summary") as any)
        .select("*").eq("user_id", selected.user_id).order("month_year", { ascending: false }).limit(12);
      return data || [];
    },
    enabled: !!selected?.user_id,
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["emp-targets", selected?.full_name],
    queryFn: async () => {
      if (!selected) return [];
      const { data } = await (supabase.from("team_targets") as any)
        .select("*").eq("team_member_name", selected.full_name).order("month_year", { ascending: false }).limit(12);
      return data || [];
    },
    enabled: !!selected,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["emp-tickets", selected?.user_id],
    queryFn: async () => {
      if (!selected?.user_id) return [];
      const { data } = await (supabase.from("hr_helpdesk") as any)
        .select("*").eq("submitted_by", selected.user_id).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!selected?.user_id,
  });

  const filtered = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter((e: any) =>
      e.full_name?.toLowerCase().includes(q) ||
      e.team_member_id?.toLowerCase().includes(q) ||
      e.designation?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const presentDays = attendance.filter((a: any) => ["present", "late", "work_from_home"].includes(a.status)).length;

  if (!selected) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, ID, designation, department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp: any) => (
            <Card key={emp.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(emp.id)}>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials(emp.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{emp.full_name}</p>
                  <p className="text-xs text-muted-foreground">{emp.designation || "—"} • {emp.department || "—"}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{emp.employment_type?.replace(/_/g, " ")}</Badge>
                    {emp.vertical_name && <Badge variant="secondary" className="text-[10px]">{emp.vertical_name}</Badge>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No employees found</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>← Back to Directory</Button>

      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6 flex items-start gap-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{initials(selected.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{selected.full_name}</h2>
            <p className="text-muted-foreground">{selected.designation} • {selected.department}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              {selected.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selected.email}</span>}
              {selected.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selected.phone}</span>}
              {selected.vertical_name && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{selected.vertical_name}</span>}
              {selected.joining_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Joined: {format(new Date(selected.joining_date), "dd MMM yyyy")}</span>}
            </div>
            <div className="flex gap-2 mt-3">
              <Badge>{selected.role}</Badge>
              <Badge variant="outline">{selected.employment_type?.replace(/_/g, " ")}</Badge>
              <Badge variant="secondary">CTC: {fmt(selected.monthly_ctc)}/mo</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="salary">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="salary"><IndianRupee className="h-3.5 w-3.5 mr-1" />Salary</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="attendance"><Clock className="h-3.5 w-3.5 mr-1" />Attendance</TabsTrigger>
          <TabsTrigger value="targets"><Target className="h-3.5 w-3.5 mr-1" />Targets</TabsTrigger>
          <TabsTrigger value="incentives"><Award className="h-3.5 w-3.5 mr-1" />Incentives</TabsTrigger>
          <TabsTrigger value="tickets"><Briefcase className="h-3.5 w-3.5 mr-1" />Tickets</TabsTrigger>
        </TabsList>

        {/* Salary */}
        <TabsContent value="salary" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Current Salary Structure</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Monthly CTC</p>
                  <p className="text-lg font-bold text-green-600">{fmt(selected.monthly_ctc)}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Basic Salary</p>
                  <p className="font-semibold">{fmt(selected.basic_salary)}</p>
                </div>
                <div className="rounded-lg p-3 bg-muted/50"><p className="text-xs text-muted-foreground">HRA</p><p className="font-semibold">{fmt(selected.hra)}</p></div>
                <div className="rounded-lg p-3 bg-muted/50"><p className="text-xs text-muted-foreground">DA</p><p className="font-semibold">{fmt(selected.da)}</p></div>
                <div className="rounded-lg p-3 bg-muted/50"><p className="text-xs text-muted-foreground">Special Allowance</p><p className="font-semibold">{fmt(selected.special_allowance)}</p></div>
                <div className="rounded-lg p-3 bg-red-50 dark:bg-red-950/20"><p className="text-xs text-muted-foreground">PF Deduction</p><p className="font-semibold text-red-600">-{fmt(selected.pf_deduction)}</p></div>
                <div className="rounded-lg p-3 bg-red-50 dark:bg-red-950/20"><p className="text-xs text-muted-foreground">ESI</p><p className="font-semibold text-red-600">-{fmt(selected.esi_deduction)}</p></div>
                <div className="rounded-lg p-3 bg-red-50 dark:bg-red-950/20"><p className="text-xs text-muted-foreground">Prof. Tax</p><p className="font-semibold text-red-600">-{fmt(selected.professional_tax)}</p></div>
              </div>
            </CardContent>
          </Card>

          {payrolls.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Salary History</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrolls.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.payroll_month}</TableCell>
                        <TableCell>{fmt(p.gross_salary)}</TableCell>
                        <TableCell className="text-red-600">-{fmt(p.total_deductions)}</TableCell>
                        <TableCell className="font-bold text-green-600">{fmt(p.net_salary)}</TableCell>
                        <TableCell><Badge variant={p.payment_status === "paid" ? "default" : "secondary"}>{p.payment_status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader><CardTitle className="text-sm">Employee Documents ({documents.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.document_name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{doc.document_type?.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-xs">{doc.created_at ? format(new Date(doc.created_at), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell>{doc.is_verified ? "✅" : "⏳"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => generateEmployeeDocumentPDF(doc)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {documents.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No documents</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance */}
        <TabsContent value="attendance">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{presentDays}</p><p className="text-xs text-muted-foreground">Present (Last 30)</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{attendance.filter((a: any) => a.status === "absent").length}</p><p className="text-xs text-muted-foreground">Absent</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{attendance.filter((a: any) => a.status === "late").length}</p><p className="text-xs text-muted-foreground">Late</p></CardContent></Card>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Hours</TableHead></TableRow></TableHeader>
                <TableBody>
                  {attendance.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.attendance_date}</TableCell>
                      <TableCell><Badge variant={a.status === "present" ? "default" : a.status === "absent" ? "destructive" : "secondary"} className="capitalize">{a.status}</Badge></TableCell>
                      <TableCell>{a.check_in || "—"}</TableCell>
                      <TableCell>{a.check_out || "—"}</TableCell>
                      <TableCell>{a.work_hours || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Targets */}
        <TabsContent value="targets">
          {targets.length > 0 ? (
            <div className="space-y-3">
              {targets.map((t: any) => {
                const achieved = Number(t.achieved_count || 0);
                const target = Number(t.target_count || 1);
                const pct = Math.min(Math.round((achieved / target) * 100), 100);
                return (
                  <Card key={t.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">{t.month_year} — {t.vertical_name}</p>
                          <p className="text-xs text-muted-foreground">Target: {target} deals | Achieved: {achieved}</p>
                        </div>
                        <Badge variant={pct >= 100 ? "default" : pct >= 70 ? "secondary" : "destructive"}>
                          {pct}%
                        </Badge>
                      </div>
                      <Progress value={pct} className="h-3" />
                      <p className="text-xs mt-2 text-muted-foreground">
                        {pct >= 100 ? "🎉 Target achieved! Outstanding!" : pct >= 70 ? "💪 Almost there, keep pushing!" : pct >= 40 ? "📈 Good progress, accelerate!" : "🚀 Let's pick up the pace!"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No targets set yet</CardContent></Card>
          )}
        </TabsContent>

        {/* Incentives */}
        <TabsContent value="incentives">
          {incentives.length > 0 ? (
            <div className="space-y-3">
              {incentives.map((inc: any) => (
                <Card key={inc.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{inc.month_year} — {inc.vertical_name}</p>
                      <p className="text-xs text-muted-foreground">{inc.total_deals} deals | Value: {fmt(inc.total_deal_value)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{fmt(inc.total_incentive)}</p>
                      <Badge variant={inc.status === "paid" ? "default" : "secondary"}>{inc.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No incentive data</CardContent></Card>
          )}
        </TabsContent>

        {/* Tickets */}
        <TabsContent value="tickets">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {tickets.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.subject || t.title}</TableCell>
                      <TableCell><Badge variant="outline">{t.category || "General"}</Badge></TableCell>
                      <TableCell><Badge variant={t.status === "resolved" ? "default" : "secondary"}>{t.status}</Badge></TableCell>
                      <TableCell className="text-xs">{t.created_at ? format(new Date(t.created_at), "dd MMM yyyy") : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {tickets.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No tickets raised</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeProfileView;
