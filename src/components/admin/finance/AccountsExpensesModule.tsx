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
import { Textarea } from "@/components/ui/textarea";
import { Receipt, Plus, Search, Edit2, Trash2, Download, FileDown } from "lucide-react";

const EXPENSE_TYPES = ["Office Rent", "Salaries", "Utilities", "Marketing", "Fuel", "Insurance Premium", "Travel", "Equipment", "Software", "Internet", "Phone", "Legal", "Maintenance", "Miscellaneous"];
const VERTICALS = ["Car Sales", "Insurance", "Car Loans", "HSRP", "Rental", "Accessories", "General", "Marketing", "HR", "Operations"];
const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const AccountsExpensesModule = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");

  const { data: expenses = [] } = useQuery({
    queryKey: ["acc-expenses-all"],
    queryFn: async () => { const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false }); if (error) throw error; return data; },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec };
      if (!editing) delete payload.id;
      const { error } = await (supabase.from("expenses") as any).upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["acc-expenses-all"] }); toast.success(editing ? "Updated" : "Expense recorded"); setShowDialog(false); setEditing(null); setForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("expenses").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["acc-expenses-all"] }); toast.success("Deleted"); },
  });

  const totalThisMonth = expenses.filter((e: any) => e.expense_date?.startsWith(format(new Date(), "yyyy-MM"))).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const totalAll = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const avgPerMonth = (() => {
    const months = new Set(expenses.map((e: any) => e.expense_date?.substring(0, 7)).filter(Boolean));
    return months.size > 0 ? totalAll / months.size : 0;
  })();

  const filtered = expenses.filter((e: any) => {
    const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase()) || e.expense_type?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || e.expense_type === filterType;
    const matchMonth = !filterMonth || e.expense_date?.startsWith(filterMonth);
    return matchSearch && matchType && matchMonth;
  });

  const exportCSV = () => {
    const headers = ["Date", "Type", "Description", "Vertical", "Amount", "Payment Mode"];
    const rows = filtered.map((e: any) => [
      e.expense_date || "", e.expense_type || "", (e.description || "").replace(/,/g, " "), e.vertical_name || "", e.amount || 0, e.payment_mode || ""
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold">{fmt(totalAll)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-bold text-red-600">{fmt(totalThisMonth)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg/Month</p><p className="text-2xl font-bold text-orange-600">{fmt(avgPerMonth)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Records</p><p className="text-2xl font-bold">{expenses.length}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 flex-wrap items-center">
          <div className="relative max-w-xs"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {EXPENSE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-[160px]" placeholder="Filter month" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-1.5"><FileDown className="h-4 w-4" /> Export CSV</Button>
          <Button onClick={() => { setEditing(null); setForm({ expense_date: format(new Date(), "yyyy-MM-dd") }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> Record Expense</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Vertical</TableHead><TableHead>Payment</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell><Badge variant="outline">{e.expense_type}</Badge></TableCell>
                <TableCell className="text-sm max-w-[250px] truncate">{e.description || "—"}</TableCell>
                <TableCell className="text-sm">{e.vertical_name || "—"}</TableCell>
                <TableCell className="text-sm">{e.payment_mode || "—"}</TableCell>
                <TableCell className="font-medium text-red-600">{fmt(e.amount)}</TableCell>
                <TableCell className="text-sm">{e.expense_date ? format(new Date(e.expense_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="text-right"><div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setForm({ ...e }); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(e.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No expenses found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Expense" : "Record Expense"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Expense Type *</Label><Select value={form.expense_type || ""} onValueChange={v => setForm(p => ({ ...p, expense_type: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{EXPENSE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Amount *</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.expense_date || ""} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} /></div>
              <div><Label>Vertical</Label><Select value={form.vertical_name || ""} onValueChange={v => setForm(p => ({ ...p, vertical_name: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Payment Mode</Label>
              <Select value={form.payment_mode || ""} onValueChange={v => setForm(p => ({ ...p, payment_mode: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "NEFT", "RTGS"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.expense_type || !form.amount}>{editing ? "Update" : "Record"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsExpensesModule;
