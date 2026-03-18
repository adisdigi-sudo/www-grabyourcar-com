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
import { Users, UserPlus, Search, Phone, Mail, Edit2, Trash2, Eye, CheckCircle2, XCircle } from "lucide-react";

const ROLES = ["sales", "manager", "admin", "finance", "insurance", "operations"];
const VERTICALS = ["car_sales", "insurance", "car_loans", "hsrp", "rental", "accessories"];
const DEPARTMENTS = ["sales", "insurance", "rental", "hsrp", "marketing", "finance", "operations", "hr", "management"];

const initials = (name: string) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";

export const HREmployeeManagement = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_team_directory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-employees"] });
      toast.success("Employee removed");
    },
  });

  const filtered = employees.filter((e: any) =>
    !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = employees.filter((e: any) => e.employment_status === "active").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Employee Management</h2>
          <p className="text-sm text-muted-foreground">{activeCount} active / {employees.length} total</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({}); setShowDialog(true); }}>
          <UserPlus className="h-4 w-4 mr-2" /> Add Employee
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Vertical</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((emp: any) => (
                <TableRow key={emp.id}>
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
                  <TableCell className="text-sm">{emp.vertical || "—"}</TableCell>
                  <TableCell>
                    <Badge className={emp.employment_status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {emp.employment_status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{emp.joining_date ? format(new Date(emp.joining_date), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => {
                        setEditing(emp);
                        setForm({ ...emp });
                        setShowDialog(true);
                      }}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                        if (confirm("Delete this employee?")) deleteMutation.mutate(emp.id);
                      }}><Trash2 className="h-4 w-4" /></Button>
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
                <Select value={form.vertical || ""} onValueChange={v => setForm(p => ({ ...p, vertical: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Joining Date</Label><Input type="date" value={form.joining_date || ""} onChange={e => setForm(p => ({ ...p, joining_date: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.employment_status || "active"} onValueChange={v => setForm(p => ({ ...p, employment_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_notice">On Notice</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
};

export default HREmployeeManagement;
