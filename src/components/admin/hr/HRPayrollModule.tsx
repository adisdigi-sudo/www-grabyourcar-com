import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Plus, Search, Download, FileText, Edit2, Trash2 } from "lucide-react";
import { generatePayslipPDF } from "@/lib/generatePayslipPDF";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const HRPayrollModule = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [monthFilter, setMonthFilter] = useState(format(new Date(), "yyyy-MM"));

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-payroll-employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_team_directory").select("full_name, phone, department, designation, salary_ctc, bank_account_number").eq("is_active", true).order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ["hr-payroll", monthFilter],
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_records").select("*").eq("payroll_month", monthFilter).order("employee_name");
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec };
      if (!editing) delete payload.id;
      // Auto-calc
      payload.gross_salary = Number(payload.basic_salary || 0) + Number(payload.hra || 0) + Number(payload.da || 0) + Number(payload.special_allowance || 0) + Number(payload.other_allowances || 0) + Number(payload.bonus || 0);
      payload.total_deductions = Number(payload.pf_deduction || 0) + Number(payload.esi_deduction || 0) + Number(payload.tds || 0) + Number(payload.professional_tax || 0) + Number(payload.other_deductions || 0);
      payload.net_salary = payload.gross_salary - payload.total_deductions;
      const { error } = await (supabase.from("payroll_records") as any).upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-payroll"] }); toast.success(editing ? "Updated" : "Payroll created"); setShowDialog(false); setEditing(null); setForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("payroll_records").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-payroll"] }); toast.success("Deleted"); },
  });

  const totalGross = payrolls.reduce((s: number, p: any) => s + Number(p.gross_salary || 0), 0);
  const totalNet = payrolls.reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
  const totalDeductions = payrolls.reduce((s: number, p: any) => s + Number(p.total_deductions || 0), 0);
  const paidCount = payrolls.filter((p: any) => p.payment_status === "paid").length;

  const filtered = payrolls.filter((p: any) => !search || p.employee_name?.toLowerCase().includes(search.toLowerCase()));

  const autoGenerateForEmployee = (emp: any) => {
    const ctc = Number(emp.salary_ctc || 0);
    const monthly = ctc / 12;
    const basic = Math.round(monthly * 0.4);
    const hra = Math.round(monthly * 0.2);
    const da = Math.round(monthly * 0.1);
    const special = Math.round(monthly * 0.3);
    const pf = Math.round(basic * 0.12);
    const esi = monthly <= 21000 ? Math.round(monthly * 0.0075) : 0;
    const pt = 200;
    const tds = Math.round(monthly * 0.05);
    setForm({
      employee_name: emp.full_name,
      department: emp.department,
      designation: emp.designation,
      payroll_month: monthFilter,
      basic_salary: basic, hra, da, special_allowance: special, other_allowances: 0, bonus: 0,
      pf_deduction: pf, esi_deduction: esi, tds, professional_tax: pt, other_deductions: 0,
      payment_status: "pending", payment_mode: "bank_transfer",
      bank_account: emp.bank_account_number || "",
    });
    setEditing(null);
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Payroll Records</p><p className="text-2xl font-bold">{payrolls.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Gross</p><p className="text-2xl font-bold">{fmt(totalGross)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Deductions</p><p className="text-2xl font-bold text-red-600">{fmt(totalDeductions)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Net Payable</p><p className="text-2xl font-bold text-green-600">{fmt(totalNet)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Paid</p><p className="text-2xl font-bold text-blue-600">{paidCount}/{payrolls.length}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center">
          <Input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-44" />
          <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        </div>
        <div className="flex gap-2">
          <Select onValueChange={v => { const emp = employees.find((e: any) => e.full_name === v); if (emp) autoGenerateForEmployee(emp); }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Generate for..." /></SelectTrigger>
            <SelectContent>{employees.map((e: any) => <SelectItem key={e.full_name} value={e.full_name}>{e.full_name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => { setEditing(null); setForm({ payroll_month: monthFilter, payment_status: "pending" }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> Manual Entry</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Gross</TableHead><TableHead>Deductions</TableHead><TableHead>Net Pay</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell><div><p className="font-medium text-sm">{p.employee_name}</p><p className="text-xs text-muted-foreground">{p.designation || ""}</p></div></TableCell>
                <TableCell className="text-sm">{p.department || "—"}</TableCell>
                <TableCell className="text-sm font-medium">{fmt(p.gross_salary)}</TableCell>
                <TableCell className="text-sm text-red-600">{fmt(p.total_deductions)}</TableCell>
                <TableCell className="text-sm font-bold text-green-700">{fmt(p.net_salary)}</TableCell>
                <TableCell>
                  <Badge className={p.payment_status === "paid" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"}>
                    {p.payment_status || "pending"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right"><div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" title="Download Payslip" onClick={() => generatePayslipPDF(p)}><Download className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setForm({ ...p }); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No payroll records for {monthFilter}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Payroll" : "New Payroll Entry"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Employee Name *</Label><Input value={form.employee_name || ""} onChange={e => setForm(p => ({ ...p, employee_name: e.target.value }))} /></div>
              <div><Label>Department</Label><Input value={form.department || ""} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></div>
              <div><Label>Month</Label><Input type="month" value={form.payroll_month || monthFilter} onChange={e => setForm(p => ({ ...p, payroll_month: e.target.value }))} /></div>
            </div>
            <p className="text-sm font-semibold text-green-700 mt-2">Earnings</p>
            <div className="grid grid-cols-3 gap-3">
              {["basic_salary", "hra", "da", "special_allowance", "other_allowances", "bonus"].map(f => (
                <div key={f}><Label>{f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Label><Input type="number" value={form[f] || ""} onChange={e => setForm(p => ({ ...p, [f]: Number(e.target.value) }))} /></div>
              ))}
            </div>
            <p className="text-sm font-semibold text-red-700 mt-2">Deductions</p>
            <div className="grid grid-cols-3 gap-3">
              {["pf_deduction", "esi_deduction", "tds", "professional_tax", "other_deductions"].map(f => (
                <div key={f}><Label>{f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Label><Input type="number" value={form[f] || ""} onChange={e => setForm(p => ({ ...p, [f]: Number(e.target.value) }))} /></div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Payment Status</Label><Select value={form.payment_status || "pending"} onValueChange={v => setForm(p => ({ ...p, payment_status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="hold">On Hold</SelectItem></SelectContent></Select></div>
              <div><Label>Payment Mode</Label><Select value={form.payment_mode || "bank_transfer"} onValueChange={v => setForm(p => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="upi">UPI</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Remarks</Label><Input value={form.remarks || ""} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.employee_name}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRPayrollModule;
