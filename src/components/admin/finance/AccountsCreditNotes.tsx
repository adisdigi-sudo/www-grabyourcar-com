import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

// Local state since no dedicated table yet
const AccountsCreditNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  const addNote = () => {
    const cn = {
      id: crypto.randomUUID(),
      credit_note_number: `CN-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      customer_name: form.customer_name,
      reason: form.reason,
      amount: Number(form.amount || 0),
      date: form.date || format(new Date(), "yyyy-MM-dd"),
      invoice_number: form.invoice_number,
      status: "open",
    };
    setNotes(prev => [cn, ...prev]);
    toast.success("Credit note created");
    setShowDialog(false);
    setForm({});
  };

  const filtered = notes.filter(n => !search || n.customer_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Credit Notes</p><p className="text-2xl font-bold">{notes.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Amount</p><p className="text-2xl font-bold text-orange-600">{fmt(notes.reduce((s, n) => s + n.amount, 0))}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open</p><p className="text-2xl font-bold text-blue-600">{notes.filter(n => n.status === "open").length}</p></CardContent></Card>
      </div>

      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search credit notes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setForm({ date: format(new Date(), "yyyy-MM-dd") }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Credit Note</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>CN #</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(n => (
              <TableRow key={n.id}>
                <TableCell className="font-mono text-sm">{n.credit_note_number}</TableCell>
                <TableCell className="font-medium text-sm">{n.customer_name}</TableCell>
                <TableCell className="text-sm">{format(new Date(n.date), "dd MMM yyyy")}</TableCell>
                <TableCell className="font-mono text-sm">{n.invoice_number || "—"}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{n.reason || "—"}</TableCell>
                <TableCell className="text-right font-semibold text-orange-600">{fmt(n.amount)}</TableCell>
                <TableCell><Badge variant="outline">{n.status}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No credit notes yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Credit Note</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Customer Name *</Label><Input value={form.customer_name || ""} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
              <div><Label>Amount *</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.date || ""} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div><Label>Against Invoice #</Label><Input value={form.invoice_number || ""} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} /></div>
            </div>
            <div><Label>Reason</Label><Textarea value={form.reason || ""} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={addNote} disabled={!form.customer_name || !form.amount}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsCreditNotes;
