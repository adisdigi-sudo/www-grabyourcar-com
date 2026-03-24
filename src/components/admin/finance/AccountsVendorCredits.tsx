import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

const AccountsVendorCredits = () => {
  const [credits, setCredits] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  const addCredit = () => {
    const vc = {
      id: crypto.randomUUID(),
      credit_number: `VC-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      vendor_name: form.vendor_name,
      amount: Number(form.amount || 0),
      date: form.date || format(new Date(), "yyyy-MM-dd"),
      bill_number: form.bill_number,
      reason: form.reason,
      status: "open",
    };
    setCredits(prev => [vc, ...prev]);
    toast.success("Vendor credit created");
    setShowDialog(false); setForm({});
  };

  const filtered = credits.filter(c => !search || c.vendor_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Credits</p><p className="text-2xl font-bold">{credits.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Amount</p><p className="text-2xl font-bold text-green-600">{fmt(credits.reduce((s, c) => s + c.amount, 0))}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open</p><p className="text-2xl font-bold text-blue-600">{credits.filter(c => c.status === "open").length}</p></CardContent></Card>
      </div>

      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setForm({ date: format(new Date(), "yyyy-MM-dd") }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Vendor Credit</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Credit #</TableHead><TableHead>Vendor</TableHead><TableHead>Date</TableHead><TableHead>Bill #</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.credit_number}</TableCell>
                <TableCell className="font-medium text-sm">{c.vendor_name}</TableCell>
                <TableCell className="text-sm">{format(new Date(c.date), "dd MMM yyyy")}</TableCell>
                <TableCell className="text-sm">{c.bill_number || "—"}</TableCell>
                <TableCell className="text-right font-semibold text-green-600">{fmt(c.amount)}</TableCell>
                <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No vendor credits yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Vendor Credit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vendor Name *</Label><Input value={form.vendor_name || ""} onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} /></div>
              <div><Label>Amount *</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.date || ""} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div><Label>Against Bill #</Label><Input value={form.bill_number || ""} onChange={e => setForm(p => ({ ...p, bill_number: e.target.value }))} /></div>
            </div>
            <div><Label>Reason</Label><Textarea value={form.reason || ""} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={addCredit} disabled={!form.vendor_name || !form.amount}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsVendorCredits;
