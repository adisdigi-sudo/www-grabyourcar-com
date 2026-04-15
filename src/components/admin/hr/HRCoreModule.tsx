import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Search, Edit2, Trash2, Eye, Phone, Mail, MapPin, Building2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const DEPARTMENTS = ["Sales", "Insurance", "Rental", "HSRP", "Marketing", "Finance", "Operations", "HR", "Management", "IT"];
const DESIGNATIONS = ["Sales Executive", "Manager", "Team Lead", "Admin", "Finance Officer", "Insurance Agent", "Operations Head", "HR Manager", "CEO", "CTO"];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern", "consultant"];

const initials = (n: string) => n?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";

export const HRCoreModule = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [tab, setTab] = useState("all");

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-core-employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_team_directory").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (emp: any) => {
      const payload = { ...emp };
      if (!editing) delete payload.id;
      const { error } = await (supabase.from("hr_team_directory") as any).upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-core-employees"] });
      toast.success(editing ? "Employee updated" : "Employee added");
      setShowDialog(false); setEditing(null); setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_team_directory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-core-employees"] }); toast.success("Employee removed"); },
  });

  const filtered = employees.filter((e: any) => {
    const matchSearch = !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.department?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || (tab === "active" && e.is_active !== false) || (tab === "inactive" && e.is_active === false);
    return matchSearch && matchTab;
  });

  const activeCount = employees.filter((e: any) => e.is_active !== false).length;
  const departmentCounts = employees.reduce((acc: any, e: any) => { acc[e.department || "Unassigned"] = (acc[e.department || "Unassigned"] || 0) + 1; return acc; }, {});

  const openAdd = () => { setEditing(null); setForm({ is_active: true, employment_type: "full_time" }); setShowDialog(true); };
  const openEdit = (emp: any) => { setEditing(emp); setForm({ ...emp }); setShowDialog(true); };
  const openView = (emp: any) => { setViewing(emp); setShowViewDialog(true); };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Employees</p><p className="text-2xl font-bold">{employees.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-600">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Inactive / Exited</p><p className="text-2xl font-bold text-red-600">{employees.length - activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Departments</p><p className="text-2xl font-bold">{Object.keys(departmentCounts).length}</p></CardContent></Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={openAdd} className="gap-2"><UserPlus className="h-4 w-4" /> Add Employee</Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({employees.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({employees.length - activeCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((emp: any) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(emp.full_name)}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-medium text-sm">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.phone || emp.email || "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{emp.department || "—"}</Badge></TableCell>
                  <TableCell className="text-sm">{emp.designation || "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{emp.employment_type || "full_time"}</Badge></TableCell>
                  <TableCell>
                    <Badge className={emp.is_active !== false ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}>
                      {emp.is_active !== false ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{emp.date_of_joining ? format(new Date(emp.date_of_joining), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => openView(emp)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(emp)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(emp.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No employees found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Employee Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16"><AvatarFallback className="text-xl bg-primary/10 text-primary">{initials(viewing.full_name)}</AvatarFallback></Avatar>
                <div>
                  <h3 className="text-lg font-bold">{viewing.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{viewing.designation} • {viewing.department}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Phone", viewing.phone], ["Email", viewing.email], ["City", viewing.city],
                  ["Employment Type", viewing.employment_type], ["DOJ", viewing.date_of_joining ? format(new Date(viewing.date_of_joining), "dd MMM yyyy") : "—"],
                  ["DOB", viewing.date_of_birth ? format(new Date(viewing.date_of_birth), "dd MMM yyyy") : "—"],
                  ["Blood Group", viewing.blood_group], ["PAN", viewing.pan_number], ["Aadhar", viewing.aadhar_number],
                  ["Bank", viewing.bank_name], ["A/C", viewing.bank_account_number], ["IFSC", viewing.ifsc_code],
                  ["CTC", viewing.salary_ctc ? `₹${Number(viewing.salary_ctc).toLocaleString("en-IN")}` : "—"],
                  ["Emergency Contact", viewing.emergency_contact_name], ["Emergency Phone", viewing.emergency_contact_phone],
                ].map(([label, val]) => (
                  <div key={label as string}><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{val || "—"}</p></div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Employee" : "Add New Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Full Name *</Label><Input value={form.full_name || ""} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} /></div>
              <div><Label>Phone *</Label><Input value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>City</Label><Input value={form.city || ""} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Department</Label>
                <Select value={form.department || ""} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Designation</Label>
                <Select value={form.designation || ""} onValueChange={v => setForm(p => ({ ...p, designation: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Employment Type</Label>
                <Select value={form.employment_type || "full_time"} onValueChange={v => setForm(p => ({ ...p, employment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date of Joining</Label><Input type="date" value={form.date_of_joining || ""} onChange={e => setForm(p => ({ ...p, date_of_joining: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth || ""} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} /></div>
              <div><Label>Blood Group</Label><Input value={form.blood_group || ""} onChange={e => setForm(p => ({ ...p, blood_group: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>PAN</Label><Input value={form.pan_number || ""} onChange={e => setForm(p => ({ ...p, pan_number: e.target.value }))} /></div>
              <div><Label>Aadhar</Label><Input value={form.aadhar_number || ""} onChange={e => setForm(p => ({ ...p, aadhar_number: e.target.value }))} /></div>
              <div><Label>Salary CTC</Label><Input type="number" value={form.salary_ctc || ""} onChange={e => setForm(p => ({ ...p, salary_ctc: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Bank Name</Label><Input value={form.bank_name || ""} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} /></div>
              <div><Label>Account Number</Label><Input value={form.bank_account_number || ""} onChange={e => setForm(p => ({ ...p, bank_account_number: e.target.value }))} /></div>
              <div><Label>IFSC Code</Label><Input value={form.ifsc_code || ""} onChange={e => setForm(p => ({ ...p, ifsc_code: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Emergency Contact</Label><Input value={form.emergency_contact_name || ""} onChange={e => setForm(p => ({ ...p, emergency_contact_name: e.target.value }))} /></div>
              <div><Label>Emergency Phone</Label><Input value={form.emergency_contact_phone || ""} onChange={e => setForm(p => ({ ...p, emergency_contact_phone: e.target.value }))} /></div>
            </div>
            <div><Label>Address</Label><Textarea value={form.address || ""} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.full_name || !form.phone}>
              {editing ? "Update" : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRCoreModule;
