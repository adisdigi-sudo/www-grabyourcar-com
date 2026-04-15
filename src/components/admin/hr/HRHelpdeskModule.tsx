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
import { Headphones, Plus, Search, Edit2, Trash2, CheckCircle2 } from "lucide-react";

const CATEGORIES = ["IT Support", "HR Query", "Payroll Issue", "Leave Query", "Policy Clarification", "Facility", "Access Request", "Complaint", "Other"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["open", "in_progress", "resolved", "closed"];

const statusColor: Record<string, string> = {
  open: "bg-blue-100 text-blue-800", in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800", closed: "bg-gray-100 text-gray-800",
};
const priorityColor: Record<string, string> = {
  low: "bg-gray-100 text-gray-800", medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800", urgent: "bg-red-100 text-red-800",
};

export const HRHelpdeskModule = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [tab, setTab] = useState("all");

  const { data: tickets = [] } = useQuery({
    queryKey: ["hr-helpdesk"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("hr_helpdesk") as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const p = { ...rec };
      if (!editing) { delete p.id; p.ticket_number = `TKT-${Date.now().toString(36).toUpperCase()}`; }
      const { error } = await (supabase.from("hr_helpdesk") as any).upsert(p, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-helpdesk"] }); toast.success(editing ? "Updated" : "Ticket created"); setShowDialog(false); setEditing(null); setForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from("hr_helpdesk") as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-helpdesk"] }); toast.success("Deleted"); },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("hr_helpdesk") as any).update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-helpdesk"] }); toast.success("Ticket resolved"); },
  });

  const openCount = tickets.filter((t: any) => t.status === "open").length;
  const filtered = tickets.filter((t: any) => {
    const matchSearch = !search || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.employee_name?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || t.status === tab;
    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Tickets</p><p className="text-2xl font-bold">{tickets.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open</p><p className="text-2xl font-bold text-blue-600">{openCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-2xl font-bold text-yellow-600">{tickets.filter((t: any) => t.status === "in_progress").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Resolved</p><p className="text-2xl font-bold text-green-600">{tickets.filter((t: any) => t.status === "resolved" || t.status === "closed").length}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["all", ...STATUSES].map(s => (
            <Button key={s} variant={tab === s ? "default" : "outline"} size="sm" onClick={() => setTab(s)} className="capitalize">{s.replace("_", " ")}</Button>
          ))}
        </div>
        <Button onClick={() => { setEditing(null); setForm({ status: "open", priority: "medium" }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Ticket</Button>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Ticket #</TableHead><TableHead>Employee</TableHead><TableHead>Subject</TableHead><TableHead>Category</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="text-sm font-mono">{t.ticket_number || "—"}</TableCell>
                <TableCell className="text-sm font-medium">{t.employee_name}</TableCell>
                <TableCell><div className="max-w-[200px]"><p className="text-sm truncate">{t.subject}</p></div></TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{t.category}</Badge></TableCell>
                <TableCell><Badge className={`text-xs ${priorityColor[t.priority]}`}>{t.priority}</Badge></TableCell>
                <TableCell><Badge className={statusColor[t.status]}>{t.status?.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-sm">{format(new Date(t.created_at), "dd MMM")}</TableCell>
                <TableCell className="text-right"><div className="flex gap-1 justify-end">
                  {t.status !== "resolved" && t.status !== "closed" && <Button size="icon" variant="ghost" className="text-green-600" onClick={() => resolveMutation.mutate(t.id)}><CheckCircle2 className="h-4 w-4" /></Button>}
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setForm({ ...t }); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(t.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No tickets found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Ticket" : "New Helpdesk Ticket"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Employee Name *</Label><Input value={form.employee_name || ""} onChange={e => setForm(p => ({ ...p, employee_name: e.target.value }))} /></div>
              <div><Label>Category *</Label><Select value={form.category || ""} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Subject *</Label><Input value={form.subject || ""} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Priority</Label><Select value={form.priority || "medium"} onValueChange={v => setForm(p => ({ ...p, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Status</Label><Select value={form.status || "open"} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Assigned To</Label><Input value={form.assigned_to || ""} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
            </div>
            <div><Label>Resolution</Label><Textarea value={form.resolution || ""} onChange={e => setForm(p => ({ ...p, resolution: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.employee_name || !form.subject || !form.category}>{editing ? "Update" : "Create Ticket"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRHelpdeskModule;
