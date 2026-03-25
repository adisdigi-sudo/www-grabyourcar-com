import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { generateEmployeeDocumentPDF } from "@/lib/generateEmployeeDocumentPDF";
import {
  FileText, IndianRupee, Ticket, Palmtree, Calendar, Clock,
  Download, Plus, AlertCircle, CheckCircle2, HelpCircle, Send
} from "lucide-react";

const fmt = (v: number) => `Rs. ${Math.round(v || 0).toLocaleString("en-IN")}`;

const TICKET_TYPES = [
  { value: "leave", label: "Leave Request", icon: Palmtree },
  { value: "half_day", label: "Half Day", icon: Clock },
  { value: "salary_query", label: "Salary/Incentive Query", icon: IndianRupee },
  { value: "it_request", label: "IT/Access Request", icon: HelpCircle },
  { value: "grievance", label: "General Grievance", icon: AlertCircle },
];

const LEAVE_TYPES = ["casual", "sick", "earned", "unpaid"];

export const MyHRDashboard = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showTicket, setShowTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState<Record<string, any>>({});

  // Get employee profile
  const { data: profile } = useQuery({
    queryKey: ["my-employee-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employee_profiles") as any)
        .select("*").eq("user_id", user?.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get documents
  const { data: documents = [] } = useQuery({
    queryKey: ["my-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employee_documents") as any)
        .select("*").eq("employee_user_id", user?.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get salary records
  const { data: salaryRecords = [] } = useQuery({
    queryKey: ["my-salary-records", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employee_salary_records") as any)
        .select("*").eq("employee_user_id", user?.id).order("month_year", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get tickets
  const { data: tickets = [] } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employee_tickets") as any)
        .select("*").eq("employee_user_id", user?.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const teamMember = await supabase.from("team_members").select("display_name").eq("user_id", user?.id).maybeSingle();
      const payload: any = {
        employee_user_id: user?.id,
        employee_name: teamMember?.data?.display_name || profile?.full_name || user?.email || "Employee",
        ticket_type: ticketForm.ticket_type,
        subject: ticketForm.subject,
        description: ticketForm.description,
        priority: ticketForm.priority || "medium",
        manager_user_id: profile?.manager_user_id || null,
        manager_name: profile?.manager_name || null,
      };
      if (ticketForm.ticket_type === "leave" || ticketForm.ticket_type === "half_day") {
        payload.leave_type = ticketForm.leave_type || "casual";
        payload.leave_start_date = ticketForm.leave_start_date;
        payload.leave_end_date = ticketForm.leave_end_date || ticketForm.leave_start_date;
        if (ticketForm.ticket_type === "half_day") {
          payload.leave_days = 0.5;
        } else if (ticketForm.leave_start_date && ticketForm.leave_end_date) {
          const d1 = new Date(ticketForm.leave_start_date);
          const d2 = new Date(ticketForm.leave_end_date);
          payload.leave_days = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        }
      }
      const { error } = await (supabase.from("employee_tickets") as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      toast.success("Ticket raised successfully! Your manager will review it.");
      setShowTicket(false);
      setTicketForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusColor = (s: string) => {
    if (s === "resolved" || s === "hr_approved") return "bg-green-100 text-green-800";
    if (s === "manager_approved") return "bg-blue-100 text-blue-800";
    if (s === "rejected") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const docIcon = (type: string) => {
    if (type.includes("salary") || type.includes("incentive")) return IndianRupee;
    return FileText;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">My HR Dashboard</h2>
        <Button onClick={() => setShowTicket(true)}><Plus className="h-4 w-4 mr-2" /> Raise Ticket</Button>
      </div>

      {/* Profile Summary */}
      {profile && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground">Designation</span><p className="font-medium">{profile.designation || "—"}</p></div>
              <div><span className="text-muted-foreground">Department</span><p className="font-medium">{profile.vertical_name || profile.department || "—"}</p></div>
              <div><span className="text-muted-foreground">Manager</span><p className="font-medium">{profile.manager_name || "—"}</p></div>
              <div><span className="text-muted-foreground">Joined</span><p className="font-medium">{profile.joining_date ? format(new Date(profile.joining_date), "dd MMM yyyy") : "—"}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1" /> My Documents</TabsTrigger>
          <TabsTrigger value="salary"><IndianRupee className="h-3.5 w-3.5 mr-1" /> Salary Slips</TabsTrigger>
          <TabsTrigger value="tickets"><Ticket className="h-3.5 w-3.5 mr-1" /> My Tickets ({tickets.filter((t: any) => t.status !== "resolved").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          {documents.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No documents uploaded yet.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc: any) => {
                const Icon = docIcon(doc.document_type);
                return (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.document_name}</p>
                        <p className="text-xs text-muted-foreground">{doc.document_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "dd MMM yyyy")}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => generateEmployeeDocumentPDF(doc)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="salary" className="mt-4">
          {salaryRecords.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No salary records yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {salaryRecords.map((rec: any) => (
                <Card key={rec.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{rec.month_year}</h4>
                      <div className="flex items-center gap-2">
                        <Badge className={rec.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {rec.payment_status}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => generateEmployeeDocumentPDF({ document_type: "salary_slip", document_name: `Salary Slip - ${rec.month_year}`, generated_data: rec })}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-sm">
                      <div><span className="text-muted-foreground block">Gross</span>{fmt(rec.gross_salary)}</div>
                      <div><span className="text-muted-foreground block">Present</span>{rec.days_present}/{rec.total_working_days}</div>
                      <div><span className="text-muted-foreground block">Leave Ded.</span><span className="text-red-600">-{fmt(rec.leave_deduction)}</span></div>
                      <div><span className="text-muted-foreground block">Late Ded.</span><span className="text-red-600">-{fmt(rec.late_deduction)}</span></div>
                      <div><span className="text-muted-foreground block">Incentive</span><span className="text-green-600">+{fmt(rec.incentive_amount)}</span></div>
                      <div><span className="text-muted-foreground block font-semibold">Net Pay</span><span className="font-bold text-green-600">{fmt(rec.net_salary)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          {tickets.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No tickets raised yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {tickets.map((t: any) => (
                <Card key={t.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{t.ticket_type.replace("_", " ")}</Badge>
                        <span className="font-medium text-sm">{t.subject}</span>
                      </div>
                      <Badge className={statusColor(t.status)}>{t.status.replace("_", " ")}</Badge>
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                    {t.leave_start_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📅 {format(new Date(t.leave_start_date), "dd MMM")} — {format(new Date(t.leave_end_date || t.leave_start_date), "dd MMM")} ({t.leave_days} days)
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Raised: {format(new Date(t.created_at), "dd MMM yyyy")}</span>
                      {t.manager_action && <span>Manager: {t.manager_action} {t.manager_remarks ? `— "${t.manager_remarks}"` : ""}</span>}
                      {t.hr_action && <span>HR: {t.hr_action} {t.hr_remarks ? `— "${t.hr_remarks}"` : ""}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Raise Ticket Dialog */}
      <Dialog open={showTicket} onOpenChange={setShowTicket}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Raise a Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Ticket Type</Label>
              <Select value={ticketForm.ticket_type || ""} onValueChange={v => setTicketForm(prev => ({ ...prev, ticket_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {TICKET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {(ticketForm.ticket_type === "leave" || ticketForm.ticket_type === "half_day") && (
              <>
                <div>
                  <Label>Leave Type</Label>
                  <Select value={ticketForm.leave_type || "casual"} onValueChange={v => setTicketForm(prev => ({ ...prev, leave_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAVE_TYPES.map(l => <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Date</Label><Input type="date" value={ticketForm.leave_start_date || ""} onChange={e => setTicketForm(prev => ({ ...prev, leave_start_date: e.target.value }))} /></div>
                  <div><Label>End Date</Label><Input type="date" value={ticketForm.leave_end_date || ""} onChange={e => setTicketForm(prev => ({ ...prev, leave_end_date: e.target.value }))} /></div>
                </div>
              </>
            )}

            <div>
              <Label>Subject</Label>
              <Input value={ticketForm.subject || ""} onChange={e => setTicketForm(prev => ({ ...prev, subject: e.target.value }))} placeholder="Brief subject" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={ticketForm.description || ""} onChange={e => setTicketForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Details..." rows={3} />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={ticketForm.priority || "medium"} onValueChange={v => setTicketForm(prev => ({ ...prev, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicket(false)}>Cancel</Button>
            <Button disabled={!ticketForm.ticket_type || !ticketForm.subject || createTicket.isPending} onClick={() => createTicket.mutate()}>
              <Send className="h-4 w-4 mr-2" /> Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyHRDashboard;
