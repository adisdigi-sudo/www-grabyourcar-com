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
import { Truck, Plus, Search, Edit2, Trash2, Download, FileText } from "lucide-react";
import jsPDF from "jspdf";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
const STATUSES = ["draft", "generated", "active", "expired", "cancelled"];
const TRANSPORT_MODES = ["Road", "Rail", "Air", "Ship"];
const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800", generated: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800", expired: "bg-red-100 text-red-800", cancelled: "bg-gray-100 text-gray-500",
};

const AccountsEWayBill = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: bills = [] } = useQuery({
    queryKey: ["eway-bills"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("eway_bills") as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const p = { ...rec };
      if (!editing) {
        delete p.id;
        p.eway_bill_number = `EWB-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        p.status = "generated";
      }
      p.total_value = Number(p.goods_value || 0) + Number(p.tax_amount || 0);
      if (!p.validity_date && p.document_date) {
        const validDays = Number(p.distance_km || 0) <= 100 ? 1 : Math.ceil(Number(p.distance_km) / 100);
        const d = new Date(p.document_date);
        d.setDate(d.getDate() + validDays);
        p.validity_date = format(d, "yyyy-MM-dd");
      }
      const { error } = await (supabase.from("eway_bills") as any).upsert(p, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eway-bills"] });
      toast.success(editing ? "Updated" : "E-Way Bill generated");
      setShowDialog(false); setEditing(null); setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from("eway_bills") as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["eway-bills"] }); toast.success("Deleted"); },
  });

  const generatePDF = (b: any) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const m = 40;
    let y = 0;

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pw, 70, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("E-WAY BILL", m, 35);
    doc.setFontSize(11);
    doc.text(b.eway_bill_number || "", pw - m, 30, { align: "right" });
    doc.setFontSize(9);
    doc.text(`Generated: ${b.document_date ? format(new Date(b.document_date), "dd MMM yyyy") : ""}`, pw - m, 48, { align: "right" });
    doc.text(`Valid Till: ${b.validity_date ? format(new Date(b.validity_date), "dd MMM yyyy") : ""}`, pw - m, 60, { align: "right" });

    y = 100;
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);

    const row = (label: string, val: string, x = m) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, x, y);
      doc.setFont("helvetica", "normal");
      doc.text(val || "—", x + 130, y);
      y += 20;
    };

    row("Invoice Number:", b.invoice_number || "");
    row("Transporter:", b.transporter_name || "");
    row("Transporter GSTIN:", b.transporter_gstin || "");
    row("Vehicle Number:", b.vehicle_number || "");
    row("Transport Mode:", b.transport_mode || "");
    y += 5;
    doc.setDrawColor(226, 232, 240); doc.line(m, y, pw - m, y); y += 20;

    row("From:", `${b.from_place || ""}, ${b.from_state || ""}`);
    row("To:", `${b.to_place || ""}, ${b.to_state || ""}`);
    row("Distance:", `${b.distance_km || 0} km`);
    y += 5;
    doc.setDrawColor(226, 232, 240); doc.line(m, y, pw - m, y); y += 20;

    row("HSN Code:", b.hsn_code || "");
    row("Goods Value:", fmt(b.goods_value));
    row("Tax Amount:", fmt(b.tax_amount));

    y += 10;
    doc.setFillColor(37, 99, 235);
    doc.rect(m, y - 5, pw - m * 2, 25, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total Value:", m + 10, y + 10);
    doc.text(fmt(b.total_value), pw - m - 10, y + 10, { align: "right" });

    y += 50;
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text("This is a system-generated E-Way Bill. Carry this document during transit.", pw / 2, y, { align: "center" });

    doc.save(`EWayBill_${b.eway_bill_number}.pdf`);
    toast.success("E-Way Bill PDF downloaded");
  };

  const filtered = bills.filter((b: any) => !search || b.eway_bill_number?.toLowerCase().includes(search.toLowerCase()) || b.transporter_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Truck className="h-5 w-5" /> E-Way Bills</h2>
          <p className="text-sm text-muted-foreground">Generate e-way bills for goods transport (₹50,000+ value)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Bills</p><p className="text-2xl font-bold">{bills.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-600">{bills.filter((b: any) => b.status === "active" || b.status === "generated").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-2xl font-bold">{fmt(bills.reduce((s: number, b: any) => s + Number(b.total_value || 0), 0))}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Expired</p><p className="text-2xl font-bold text-red-600">{bills.filter((b: any) => b.status === "expired").length}</p></CardContent></Card>
      </div>

      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search e-way bills..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ document_date: format(new Date(), "yyyy-MM-dd"), transport_mode: "Road" }); setShowDialog(true); }} className="gap-1.5"><Plus className="h-4 w-4" /> Generate E-Way Bill</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">EWB #</TableHead><TableHead className="text-xs">Invoice</TableHead><TableHead className="text-xs">Transporter</TableHead><TableHead className="text-xs">From → To</TableHead><TableHead className="text-xs">Vehicle</TableHead><TableHead className="text-xs text-right">Value</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.eway_bill_number}</TableCell>
                <TableCell className="text-xs">{b.invoice_number || "—"}</TableCell>
                <TableCell className="text-xs">{b.transporter_name || "—"}</TableCell>
                <TableCell className="text-xs">{b.from_place || ""} → {b.to_place || ""}</TableCell>
                <TableCell className="font-mono text-xs">{b.vehicle_number || "—"}</TableCell>
                <TableCell className="text-xs text-right font-medium">{fmt(b.total_value)}</TableCell>
                <TableCell><Badge className={statusColor[b.status] || ""}>{b.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => generatePDF(b)}><Download className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(b); setForm({ ...b }); setShowDialog(true); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(b.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No e-way bills</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit E-Way Bill" : "Generate E-Way Bill"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Invoice Number</Label><Input value={form.invoice_number || ""} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} /></div>
              <div><Label>Document Date</Label><Input type="date" value={form.document_date || ""} onChange={e => setForm(p => ({ ...p, document_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Transporter Name *</Label><Input value={form.transporter_name || ""} onChange={e => setForm(p => ({ ...p, transporter_name: e.target.value }))} /></div>
              <div><Label>Transporter GSTIN</Label><Input value={form.transporter_gstin || ""} onChange={e => setForm(p => ({ ...p, transporter_gstin: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Vehicle Number</Label><Input placeholder="UP14XX1234" value={form.vehicle_number || ""} onChange={e => setForm(p => ({ ...p, vehicle_number: e.target.value.toUpperCase() }))} /></div>
              <div><Label>Transport Mode</Label><Select value={form.transport_mode || "Road"} onValueChange={v => setForm(p => ({ ...p, transport_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TRANSPORT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Distance (km)</Label><Input type="number" value={form.distance_km || ""} onChange={e => setForm(p => ({ ...p, distance_km: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From Place</Label><Input value={form.from_place || ""} onChange={e => setForm(p => ({ ...p, from_place: e.target.value }))} /></div>
              <div><Label>From State</Label><Select value={form.from_state || ""} onValueChange={v => setForm(p => ({ ...p, from_state: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>To Place</Label><Input value={form.to_place || ""} onChange={e => setForm(p => ({ ...p, to_place: e.target.value }))} /></div>
              <div><Label>To State</Label><Select value={form.to_state || ""} onValueChange={v => setForm(p => ({ ...p, to_state: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>HSN Code</Label><Input value={form.hsn_code || ""} onChange={e => setForm(p => ({ ...p, hsn_code: e.target.value }))} /></div>
              <div><Label>Goods Value *</Label><Input type="number" value={form.goods_value || ""} onChange={e => setForm(p => ({ ...p, goods_value: Number(e.target.value) }))} /></div>
              <div><Label>Tax Amount</Label><Input type="number" value={form.tax_amount || ""} onChange={e => setForm(p => ({ ...p, tax_amount: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.transporter_name || !form.goods_value}>{editing ? "Update" : "Generate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsEWayBill;
