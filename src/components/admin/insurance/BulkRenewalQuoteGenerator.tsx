import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, Download, CheckCircle2, Loader2, Plus, Trash2, Upload,
  Send, MessageCircle, Filter, Clock, CheckSquare
} from "lucide-react";
import { generateInsuranceQuotePdf, InsuranceQuoteData } from "@/lib/generateInsuranceQuotePdf";
import {
  useBulkRenewalQuotes,
  useAddBulkQuotes,
  useUpdateBulkQuote,
  useDeleteBulkQuote,
  BulkRenewalQuote,
  BulkQuoteInsert,
} from "@/hooks/useBulkRenewalQuotes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// ── Add Quote Form ──
function AddQuoteDialog({ onAdd }: { onAdd: (quotes: BulkQuoteInsert[]) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", phone: "", vehicle_make: "", vehicle_model: "",
    vehicle_number: "", vehicle_year: new Date().getFullYear(),
    fuel_type: "Petrol", insurance_company: "", policy_type: "Comprehensive",
    idv: 0, basic_od: 0, od_discount: 0, ncb_discount: 0,
    third_party: 0, secure_premium: 0, addon_premium: 0,
    addons: [] as string[], status: "pending", notes: null as string | null,
    batch_label: null as string | null, email: null as string | null, city: null as string | null,
  });
  const [addonsText, setAddonsText] = useState("");

  const handleSubmit = () => {
    if (!form.customer_name || !form.vehicle_make) {
      toast.error("Customer name and vehicle make are required");
      return;
    }
    const quote: BulkQuoteInsert = {
      ...form,
      addons: addonsText.split("|").map(a => a.trim()).filter(Boolean),
    };
    onAdd([quote]);
    setOpen(false);
    setForm({
      customer_name: "", phone: "", vehicle_make: "", vehicle_model: "",
      vehicle_number: "", vehicle_year: new Date().getFullYear(),
      fuel_type: "Petrol", insurance_company: "", policy_type: "Comprehensive",
      idv: 0, basic_od: 0, od_discount: 0, ncb_discount: 0,
      third_party: 0, secure_premium: 0, addon_premium: 0,
      addons: [], status: "pending", notes: null, batch_label: null, email: null, city: null,
    });
    setAddonsText("");
  };

  const Field = ({ label, field, type = "text" }: { label: string; field: string; type?: string }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={(form as any)[field] ?? ""}
        onChange={e => setForm(f => ({ ...f, [field]: type === "number" ? Number(e.target.value) : e.target.value }))}
        className="h-8 text-xs"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Renewal Quote</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Customer Name *" field="customer_name" />
          <Field label="Phone" field="phone" />
          <Field label="Vehicle Make *" field="vehicle_make" />
          <Field label="Vehicle Model" field="vehicle_model" />
          <Field label="Vehicle Number" field="vehicle_number" />
          <Field label="Vehicle Year" field="vehicle_year" type="number" />
          <Field label="Fuel Type" field="fuel_type" />
          <Field label="Insurance Company" field="insurance_company" />
          <Field label="IDV" field="idv" type="number" />
          <Field label="Basic OD" field="basic_od" type="number" />
          <Field label="OD Discount" field="od_discount" type="number" />
          <Field label="NCB Discount" field="ncb_discount" type="number" />
          <Field label="Third Party" field="third_party" type="number" />
          <Field label="Addon Premium" field="addon_premium" type="number" />
          <Field label="Batch Label" field="batch_label" />
          <div className="col-span-2">
            <Label className="text-xs">Addons (pipe separated)</Label>
            <Input value={addonsText} onChange={e => setAddonsText(e.target.value)} placeholder="Zero Dep|RSA|Engine Protect" className="h-8 text-xs" />
          </div>
        </div>
        <Button onClick={handleSubmit} className="w-full mt-2 gap-1.5"><Plus className="h-4 w-4" /> Add Quote</Button>
      </DialogContent>
    </Dialog>
  );
}

// ── CSV Import ──
function CSVImportButton({ onImport }: { onImport: (quotes: BulkQuoteInsert[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n");
      if (lines.length < 2) { toast.error("CSV must have header + data rows"); return; }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const quotes: BulkQuoteInsert[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = lines[i].split(",").map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
        if (!row.customer_name) continue;
        quotes.push({
          customer_name: row.customer_name,
          phone: row.phone || "",
          email: row.email || null,
          city: row.city || null,
          vehicle_make: row.vehicle_make || "N/A",
          vehicle_model: row.vehicle_model || "N/A",
          vehicle_number: row.vehicle_number || "",
          vehicle_year: Number(row.vehicle_year) || new Date().getFullYear(),
          fuel_type: row.fuel_type || "Petrol",
          insurance_company: row.insurance_company || "N/A",
          policy_type: row.policy_type || "Comprehensive",
          idv: Number(row.idv) || 0,
          basic_od: Number(row.basic_od) || 0,
          od_discount: Number(row.od_discount) || 0,
          ncb_discount: Number(row.ncb_discount) || 0,
          third_party: Number(row.third_party) || 0,
          secure_premium: Number(row.secure_premium) || 0,
          addon_premium: Number(row.addon_premium) || 0,
          addons: row.addons ? row.addons.split("|").map(a => a.trim()).filter(Boolean) : [],
          status: "pending",
          notes: null,
          batch_label: row.batch_label || null,
        });
      }
      if (quotes.length === 0) { toast.error("No valid rows found"); return; }
      onImport(quotes);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const csv = `customer_name,phone,email,city,vehicle_make,vehicle_model,vehicle_number,vehicle_year,fuel_type,insurance_company,policy_type,idv,basic_od,od_discount,ncb_discount,third_party,secure_premium,addon_premium,addons,batch_label
Rajesh Kumar,9876543210,rajesh@email.com,Delhi,Maruti,Swift,DL01AB1234,2022,Petrol,ICICI Lombard,Comprehensive,550000,12000,2000,3000,3500,800,1200,Zero Depreciation|Roadside Assistance,March 2026`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "bulk_renewal_quotes_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-1.5 text-xs">
        <Download className="h-3.5 w-3.5" /> Template
      </Button>
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="gap-1.5 text-xs">
        <Upload className="h-3.5 w-3.5" /> Import CSV
      </Button>
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Quote Row ──
function QuoteRow({
  q, selected, onSelect, onGenerate, onMarkDone, onDelete, onSendWhatsApp,
  isGenerating, isSending,
}: {
  q: BulkRenewalQuote;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onGenerate: () => void;
  onMarkDone: () => void;
  onDelete: () => void;
  onSendWhatsApp: () => void;
  isGenerating: boolean;
  isSending: boolean;
}) {
  const netOD = Math.max(0, q.basic_od - q.od_discount - q.ncb_discount);
  const netPremium = netOD + q.third_party + q.secure_premium + q.addon_premium;
  const gst = Math.round(netPremium * 0.18);
  const total = netPremium + gst;
  const fmt = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;

  const statusColor = q.status === "done" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
    : q.status === "sent" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";

  return (
    <div className={`border rounded-lg p-3 transition-all ${q.status === "done" ? "border-emerald-300/50 bg-emerald-50/30 dark:bg-emerald-950/10" : "border-border"}`}>
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={onSelect} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-sm">{q.customer_name}</span>
            <Badge variant="outline" className="text-[10px]">{q.insurance_company}</Badge>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor}`}>
              {q.status.toUpperCase()}
            </span>
            {q.pdf_generated && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            {q.whatsapp_sent && <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {q.vehicle_make} {q.vehicle_model} &bull; {q.vehicle_number || "No Plate"} &bull; {q.vehicle_year} &bull; {q.fuel_type}
            {q.phone && <> &bull; {q.phone}</>}
          </p>
          <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5 text-[11px]">
            <div><span className="text-muted-foreground">Basic OD:</span> <span className="font-medium">{fmt(q.basic_od)}</span></div>
            <div><span className="text-muted-foreground">OD Disc:</span> <span className="font-medium text-destructive">-{fmt(q.od_discount)}</span></div>
            <div><span className="text-muted-foreground">NCB:</span> <span className="font-medium text-destructive">-{fmt(q.ncb_discount)}</span></div>
            <div><span className="text-muted-foreground">Net OD:</span> <span className="font-bold">{fmt(netOD)}</span></div>
            <div><span className="text-muted-foreground">TP:</span> <span className="font-medium">{fmt(q.third_party)}</span></div>
            <div><span className="text-muted-foreground">Addons:</span> <span className="font-medium">{fmt(q.addon_premium)}</span></div>
            <div><span className="text-muted-foreground">GST:</span> <span className="font-medium">{fmt(gst)}</span></div>
            <div><span className="text-muted-foreground font-bold">Total:</span> <span className="font-bold text-primary">{fmt(total)}</span></div>
          </div>
          {q.addons && q.addons.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {q.addons.map(a => <Badge key={a} variant="secondary" className="text-[10px] px-1.5 py-0">{a}</Badge>)}
            </div>
          )}
          {q.batch_label && <span className="text-[10px] text-muted-foreground mt-1 block">Batch: {q.batch_label}</span>}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button size="sm" variant={q.pdf_generated ? "outline" : "default"} onClick={onGenerate} disabled={isGenerating} className="gap-1 text-xs h-7">
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            PDF
          </Button>
          {q.phone && (
            <Button size="sm" variant="outline" onClick={onSendWhatsApp} disabled={isSending || !q.phone} className="gap-1 text-xs h-7">
              {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              WA
            </Button>
          )}
          {q.status !== "done" && (
            <Button size="sm" variant="ghost" onClick={onMarkDone} className="gap-1 text-xs h-7 text-emerald-600">
              <CheckSquare className="h-3 w-3" /> Done
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDelete} className="gap-1 text-xs h-7 text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export function BulkRenewalQuoteGenerator({ onClose }: { onClose: () => void }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: quotes = [], isLoading } = useBulkRenewalQuotes(statusFilter);
  const addQuotes = useAddBulkQuotes();
  const updateQuote = useUpdateBulkQuote();
  const deleteQuote = useDeleteBulkQuote();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState(false);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const selectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(quotes.map(q => q.id)) : new Set());
  };

  const toQuoteData = (q: BulkRenewalQuote): InsuranceQuoteData => ({
    customerName: q.customer_name,
    phone: q.phone,
    email: q.email || undefined,
    city: q.city || undefined,
    vehicleMake: q.vehicle_make,
    vehicleModel: q.vehicle_model,
    vehicleNumber: q.vehicle_number,
    vehicleYear: q.vehicle_year,
    fuelType: q.fuel_type,
    insuranceCompany: q.insurance_company,
    policyType: q.policy_type,
    idv: q.idv,
    basicOD: q.basic_od,
    odDiscount: q.od_discount,
    ncbDiscount: q.ncb_discount,
    thirdParty: q.third_party,
    securePremium: q.secure_premium,
    addonPremium: q.addon_premium,
    addons: q.addons || [],
  });

  const handleGenerate = async (q: BulkRenewalQuote) => {
    setGeneratingId(q.id);
    try {
      generateInsuranceQuotePdf(toQuoteData(q));
      await updateQuote.mutateAsync({ id: q.id, pdf_generated: true, pdf_generated_at: new Date().toISOString() } as any);
      toast.success(`PDF generated for ${q.customer_name}`);
    } catch { toast.error("Failed to generate PDF"); }
    setGeneratingId(null);
  };

  const handleSendWhatsApp = async (q: BulkRenewalQuote) => {
    if (!q.phone) { toast.error("No phone number"); return; }
    setSendingId(q.id);
    try {
      const phone = q.phone.replace(/\D/g, "");
      const full = phone.startsWith("91") ? phone : `91${phone}`;
      const netOD = Math.max(0, q.basic_od - q.od_discount - q.ncb_discount);
      const netPremium = netOD + q.third_party + q.secure_premium + q.addon_premium;
      const gst = Math.round(netPremium * 0.18);
      const total = netPremium + gst;

      await supabase.functions.invoke("wa-automation-trigger", {
        body: {
          event: "insurance_renewal_bulk",
          phone: full,
          customerName: q.customer_name,
          vehicleNumber: q.vehicle_number,
          vehicleMake: q.vehicle_make,
          vehicleModel: q.vehicle_model,
          insuranceCompany: q.insurance_company,
          totalPremium: `Rs. ${total.toLocaleString("en-IN")}`,
        },
      });
      await updateQuote.mutateAsync({ id: q.id, whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString(), status: "sent" } as any);
      toast.success(`WhatsApp sent to ${q.customer_name}`);
    } catch { toast.error("Failed to send WhatsApp"); }
    setSendingId(null);
  };

  const handleMarkDone = async (q: BulkRenewalQuote) => {
    await updateQuote.mutateAsync({ id: q.id, status: "done" } as any);
    toast.success(`${q.customer_name} marked as done`);
  };

  // ── Bulk Actions ──
  const handleBulkGeneratePDFs = async () => {
    const selected = quotes.filter(q => selectedIds.has(q.id));
    if (!selected.length) { toast.error("Select quotes first"); return; }
    setBulkAction(true);
    for (const q of selected) {
      try {
        generateInsuranceQuotePdf(toQuoteData(q));
        await updateQuote.mutateAsync({ id: q.id, pdf_generated: true, pdf_generated_at: new Date().toISOString() } as any);
      } catch (e) { console.error(e); }
      await new Promise(r => setTimeout(r, 400));
    }
    toast.success(`Generated ${selected.length} PDFs`);
    setBulkAction(false);
  };

  const handleBulkSendWhatsApp = async () => {
    const selected = quotes.filter(q => selectedIds.has(q.id) && q.phone);
    if (!selected.length) { toast.error("Select quotes with phone numbers"); return; }
    setBulkAction(true);
    let sent = 0;
    for (const q of selected) {
      try {
        const phone = q.phone.replace(/\D/g, "");
        const full = phone.startsWith("91") ? phone : `91${phone}`;
        const netOD = Math.max(0, q.basic_od - q.od_discount - q.ncb_discount);
        const netPremium = netOD + q.third_party + q.secure_premium + q.addon_premium;
        const gst = Math.round(netPremium * 0.18);
        const total = netPremium + gst;

        await supabase.functions.invoke("wa-automation-trigger", {
          body: {
            event: "insurance_renewal_bulk",
            phone: full,
            customerName: q.customer_name,
            vehicleNumber: q.vehicle_number,
            vehicleMake: q.vehicle_make,
            vehicleModel: q.vehicle_model,
            insuranceCompany: q.insurance_company,
            totalPremium: `Rs. ${total.toLocaleString("en-IN")}`,
          },
        });
        await updateQuote.mutateAsync({ id: q.id, whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString(), status: "sent" } as any);
        sent++;
      } catch (e) { console.error(e); }
      await new Promise(r => setTimeout(r, 1500));
    }
    toast.success(`WhatsApp sent to ${sent}/${selected.length} customers`);
    setBulkAction(false);
  };

  const handleBulkMarkDone = async () => {
    const selected = quotes.filter(q => selectedIds.has(q.id));
    if (!selected.length) return;
    for (const q of selected) {
      await updateQuote.mutateAsync({ id: q.id, status: "done" } as any);
    }
    toast.success(`${selected.length} quotes marked done`);
    setSelectedIds(new Set());
  };

  const pendingCount = quotes.filter(q => q.status === "pending").length;
  const sentCount = quotes.filter(q => q.status === "sent").length;
  const doneCount = quotes.filter(q => q.status === "done").length;

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Bulk Renewal Quotes
            <Badge variant="secondary" className="text-xs">{quotes.length} total</Badge>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <AddQuoteDialog onAdd={q => addQuotes.mutate(q)} />
            <CSVImportButton onImport={q => addQuotes.mutate(q)} />
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>

        {/* Status Filter + Stats */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({quotes.length})</SelectItem>
                <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
                <SelectItem value="sent">Sent ({sentCount})</SelectItem>
                <SelectItem value="done">Done ({doneCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 text-[11px]">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> {pendingCount} pending</span>
            <span className="flex items-center gap-1"><Send className="h-3 w-3 text-blue-500" /> {sentCount} sent</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {doneCount} done</span>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-lg">
            <span className="text-xs font-medium">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" onClick={handleBulkGeneratePDFs} disabled={bulkAction} className="gap-1 text-xs h-7">
              <Download className="h-3 w-3" /> Download All PDFs
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkSendWhatsApp} disabled={bulkAction} className="gap-1 text-xs h-7">
              <MessageCircle className="h-3 w-3" /> Send All WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkMarkDone} disabled={bulkAction} className="gap-1 text-xs h-7">
              <CheckSquare className="h-3 w-3" /> Mark All Done
            </Button>
            {bulkAction && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Select All */}
        {quotes.length > 0 && (
          <div className="flex items-center gap-2 pb-1">
            <Checkbox
              checked={selectedIds.size === quotes.length && quotes.length > 0}
              onCheckedChange={selectAll}
            />
            <span className="text-xs text-muted-foreground">Select all</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No quotes found. Add quotes manually or import via CSV.
          </div>
        ) : (
          quotes.map(q => (
            <QuoteRow
              key={q.id}
              q={q}
              selected={selectedIds.has(q.id)}
              onSelect={c => toggleSelect(q.id, !!c)}
              onGenerate={() => handleGenerate(q)}
              onMarkDone={() => handleMarkDone(q)}
              onDelete={() => deleteQuote.mutate(q.id)}
              onSendWhatsApp={() => handleSendWhatsApp(q)}
              isGenerating={generatingId === q.id}
              isSending={sendingId === q.id}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
