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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Users, UserPlus, Search, Edit2, Eye, LogOut, AlertTriangle, UserCog } from "lucide-react";

const ROLES = ["sales", "manager", "admin", "finance", "insurance", "operations"];
const VERTICALS = ["car_sales", "insurance", "car_loans", "hsrp", "rental", "accessories"];
const DEPARTMENTS = ["sales", "insurance", "rental", "hsrp", "marketing", "finance", "operations", "hr", "management"];

const initials = (name: string) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";

export const HREmployeeManagement = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [exitEmployee, setExitEmployee] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [exitForm, setExitForm] = useState<Record<string, any>>({});
  const [statusFilter, setStatusFilter] = useState("active");
  const [showManagerDialog, setShowManagerDialog] = useState(false);
  const [managerTarget, setManagerTarget] = useState<any>(null);
  const [newManagerId, setNewManagerId] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_team_directory").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (emp: any) => {
      const { error } = await (supabase.from("hr_team_directory") as any).upsert({
        ...emp,
        id: editing?.id || undefined,
      }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-employees"] });
      toast.success(editing ? "Employee updated" : "Employee added");
      setShowDialog(false);
      setEditing(null);
      setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Soft-exit: mark employee as inactive with exit details (NO DELETE)
  const exitMutation = useMutation({
    mutationFn: async ({ id, exit_date, exit_reason, employment_status }: any) => {
      const { error } = await supabase.from("hr_team_directory").update({
        is_active: false,
        exit_date,
        exit_reason,
        employment_status: employment_status || "exited",
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-employees"] });
      toast.success("Employee separated — record preserved with exit details ✅");
      setShowExitDialog(false);
      setExitEmployee(null);
      setExitForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Fetch team members for manager selection
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-for-mgr"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").eq("is_active", true).order("display_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch employee profiles for manager info
  const { data: empProfiles = [] } = useQuery({
    queryKey: ["hr-employee-profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employee_profiles") as any).select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Change Manager mutation
  const changeManagerMutation = useMutation({
    mutationFn: async ({ teamMemberId, newMgrUserId, newMgrName }: any) => {
      const { error: profErr } = await (supabase.from("employee_profiles") as any)
        .update({ manager_user_id: newMgrUserId, manager_name: newMgrName })
        .eq("team_member_id", teamMemberId);
      if (profErr) throw profErr;
      const mgrTeamMember = teamMembers.find((m: any) => m.user_id === newMgrUserId);
      if (mgrTeamMember) {
        const { error: tmErr } = await supabase.from("team_members")
          .update({ reporting_to: mgrTeamMember.id } as any)
          .eq("id", teamMemberId);
        if (tmErr) throw tmErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-employees"] });
      qc.invalidateQueries({ queryKey: ["hr-employee-profiles"] });
      toast.success("Manager changed successfully ✅");
      setShowManagerDialog(false);
      setManagerTarget(null);
      setNewManagerId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = employees.filter((e: any) => {
    const matchSearch = !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.department?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || 
      (statusFilter === "active" && e.is_active !== false) ||
      (statusFilter === "exited" && e.is_active === false);
    return matchSearch && matchStatus;
  });

  const activeCount = employees.filter((e: any) => e.is_active !== false).length;
  const exitedCount = employees.filter((e: any) => e.is_active === false).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Employee Management</h2>
          <p className="text-sm text-muted-foreground">{activeCount} active · {exitedCount} exited · {employees.length} total (data never deleted)</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({}); setShowDialog(true); }}>
          <UserPlus className="h-4 w-4 mr-2" /> Add Employee
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active ({activeCount})</SelectItem>
            <SelectItem value="exited">Exited ({exitedCount})</SelectItem>
            <SelectItem value="all">All ({employees.length})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((emp: any) => (
                <TableRow key={emp.id} className={emp.is_active === false ? "opacity-60 bg-muted/30" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10">{initials(emp.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.phone || emp.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{emp.designation || "—"}</Badge></TableCell>
                  <TableCell className="text-sm">{emp.department || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {(() => {
                      const prof = empProfiles.find((p: any) => p.team_member_id === emp.id);
                      return prof?.manager_name || "—";
                    })()}
                  </TableCell>
                  <TableCell>
                    {emp.is_active === false ? (
                      <div>
                        <Badge className="bg-red-100 text-red-800">Exited</Badge>
                        {emp.exit_date && <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(emp.exit_date), "dd MMM yyyy")}</p>}
                      </div>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{emp.date_of_joining ? format(new Date(emp.date_of_joining), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => {
                        setEditing(emp);
                        setForm({ ...emp });
                        setShowDialog(true);
                      }}><Edit2 className="h-4 w-4" /></Button>
                      {emp.is_active !== false && (
                        <Button size="icon" variant="ghost" className="text-destructive" title="Separate / Terminate Employee" onClick={() => {
                          setExitEmployee(emp);
                          setExitForm({ exit_date: new Date().toISOString().split("T")[0] });
                          setShowExitDialog(true);
                        }}><LogOut className="h-4 w-4" /></Button>
                      )}
                      {emp.is_active === false && emp.exit_reason && (
                        <Button size="icon" variant="ghost" title="View exit reason">
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No employees found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name *</Label><Input value={form.full_name || ""} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role/Designation</Label>
                <Select value={form.designation || ""} onValueChange={v => setForm(p => ({ ...p, designation: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select value={form.department || ""} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assigned Vertical</Label>
                <Select value={form.vertical_name || ""} onValueChange={v => setForm(p => ({ ...p, vertical_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Joining Date</Label><Input type="date" value={form.date_of_joining || ""} onChange={e => setForm(p => ({ ...p, date_of_joining: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate(form)} disabled={!form.full_name}>
              {editing ? "Update" : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit / Separation Dialog — NO DELETE, always soft exit */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Employee Separation
            </DialogTitle>
          </DialogHeader>
          {exitEmployee && (
            <div className="space-y-4">
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-3 text-sm text-yellow-800">
                  <p className="font-semibold">⚠️ Data kabhi delete nahi hoga</p>
                  <p className="text-xs mt-1">Employee ka poora record (KYC, salary, documents) permanently stored rahega — sirf status "Exited" mark hoga for compliance & audit trail.</p>
                </CardContent>
              </Card>

              <div className="p-3 rounded bg-muted/50">
                <p className="font-semibold">{exitEmployee.full_name}</p>
                <p className="text-sm text-muted-foreground">{exitEmployee.designation} · {exitEmployee.department}</p>
              </div>

              <div>
                <Label>Separation Type *</Label>
                <Select value={exitForm.exit_type || ""} onValueChange={v => setExitForm(p => ({ ...p, exit_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resignation">🙋 Resignation (Khud chhoda)</SelectItem>
                    <SelectItem value="termination">❌ Termination (Company ne nikala — performance/conduct)</SelectItem>
                    <SelectItem value="probation_exit">⏰ Probation Exit (Probation me confirm nahi hua)</SelectItem>
                    <SelectItem value="contract_end">📄 Contract End (Contract period khatam)</SelectItem>
                    <SelectItem value="absconding">🚫 Absconding (Bina bataye chala gaya)</SelectItem>
                    <SelectItem value="retirement">🏖️ Retirement</SelectItem>
                    <SelectItem value="mutual_separation">🤝 Mutual Separation (Dono ki marzi se)</SelectItem>
                    <SelectItem value="layoff">📉 Layoff (Company downsizing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Last Working Date *</Label>
                <Input type="date" value={exitForm.exit_date || ""} onChange={e => setExitForm(p => ({ ...p, exit_date: e.target.value }))} />
              </div>

              <div>
                <Label>Exit Reason / Notes *</Label>
                <Textarea 
                  value={exitForm.exit_reason || ""} 
                  onChange={e => setExitForm(p => ({ ...p, exit_reason: e.target.value }))} 
                  placeholder="e.g. Performance issues, better opportunity, personal reasons..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Notice Period Served?</Label>
                <Select value={exitForm.notice_served || ""} onValueChange={v => setExitForm(p => ({ ...p, notice_served: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">✅ Yes — Full notice served</SelectItem>
                    <SelectItem value="partial">⚠️ Partial — Early release</SelectItem>
                    <SelectItem value="no">❌ No — Immediate exit</SelectItem>
                    <SelectItem value="buyout">💰 Notice period bought out</SelectItem>
                    <SelectItem value="na">N/A — Not applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              disabled={!exitForm.exit_type || !exitForm.exit_date || !exitForm.exit_reason?.trim() || exitMutation.isPending}
              onClick={() => exitMutation.mutate({
                id: exitEmployee.id,
                exit_date: exitForm.exit_date,
                exit_reason: `[${exitForm.exit_type?.toUpperCase()}] ${exitForm.exit_reason} | Notice: ${exitForm.notice_served || "N/A"}`,
                employment_status: exitForm.exit_type,
              })}
            >
              {exitMutation.isPending ? "Processing..." : "Confirm Separation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HREmployeeManagement;
