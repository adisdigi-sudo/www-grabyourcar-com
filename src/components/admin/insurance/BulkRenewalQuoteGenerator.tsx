import { useState, useRef, useMemo } from "react";
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
  Send, MessageCircle, Filter, Clock, CheckSquare, Mail, Search, X, FileSpreadsheet
} from "lucide-react";
import { generateBulkQuoteExcel, parseQuoteExcel } from "@/lib/generateBulkQuoteExcel";
import { generateInsuranceQuotePdf, InsuranceQuoteData } from "@/lib/generateInsuranceQuotePdf";
import {
  useBulkRenewalQuotes,
  useAddBulkQuotes,
  useUpdateBulkQuote,
  useDeleteBulkQuote,
  BulkRenewalQuote,
  BulkQuoteInsert,
} from "@/hooks/useBulkRenewalQuotes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { INSURANCE_COMPANIES, getShortName } from "@/lib/insuranceCompanies";

const POLICY_TYPES = ["Comprehensive", "Third Party", "Own Damage", "Standalone OD"];
const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"];

// ── Inline Excel Row for adding quotes ──
interface InlineRow {
  customer_name: string;
  phone: string;
  email: string;
  city: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_number: string;
  vehicle_year: number;
  fuel_type: string;
  insurance_company: string;
  policy_type: string;
  idv: number;
  basic_od: number;
  od_discount: number;
  ncb_discount: number;
  third_party: number;
  secure_premium: number;
  addon_premium: number;
  addons: string;
  batch_label: string;
}

const emptyRow = (): InlineRow => ({
  customer_name: "", phone: "", email: "", city: "",
  vehicle_make: "", vehicle_model: "", vehicle_number: "",
  vehicle_year: new Date().getFullYear(), fuel_type: "Petrol",
  insurance_company: "", policy_type: "Comprehensive",
  idv: 0, basic_od: 0, od_discount: 0, ncb_discount: 0,
  third_party: 0, secure_premium: 0, addon_premium: 0,
  addons: "", batch_label: "",
});

// ── CSV Import ──
function CSVImportButton({ onImport }: { onImport: (quotes: BulkQuoteInsert[]) => void | Promise<void> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const parseCSVText = (text: string): BulkQuoteInsert[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) { toast.error("CSV must have header + data rows"); return []; }
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
    return quotes;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        // Parse Excel
        const rows = await parseQuoteExcel(file);
        if (!rows.length) { toast.error("No valid rows in Excel"); setImporting(false); return; }
        const quotes: BulkQuoteInsert[] = rows.map(row => {
          // Handle NCB/OD that may be decimals (percentages) or formula results
          const ncbPct = Number(row.ncb_ || row.ncb_percent || row.ncb_discount || 0);
          const odPct = Number(row.od_discount_ || row.od_discount_percent || row.od_discount || 0);
          const basicOd = Number(row.basic_od || 0);
          // If NCB looks like a percentage decimal (0.25), convert to absolute
          const ncbDiscount = ncbPct < 1 ? Math.round(basicOd * ncbPct) : Number(ncbPct);
          const odDiscount = odPct < 1 ? Math.round(basicOd * odPct) : Number(odPct);
          
          return {
            customer_name: String(row.customer_name || ""),
            phone: String(row.phone || ""),
            email: row.email ? String(row.email) : null,
            city: row.city ? String(row.city) : null,
            vehicle_make: String(row.vehicle_make || "N/A"),
            vehicle_model: String(row.vehicle_model || "N/A"),
            vehicle_number: String(row.vehicle_number || ""),
            vehicle_year: Number(row.vehicle_year) || new Date().getFullYear(),
            fuel_type: String(row.fuel_type || "Petrol"),
            insurance_company: String(row.insurance_company || "N/A"),
            policy_type: String(row.policy_type || "Comprehensive"),
            idv: Number(row.idv) || 0,
            basic_od: basicOd,
            od_discount: odDiscount,
            ncb_discount: ncbDiscount,
            third_party: Number(row.third_party) || 0,
            secure_premium: Number(row.secure_premium) || 0,
            addon_premium: Number(row.addon_premium) || 0,
            addons: row.addons ? String(row.addons).split("|").map((a: string) => a.trim()).filter(Boolean) : [],
            status: "pending",
            notes: null,
            batch_label: row.batch_label ? String(row.batch_label) : null,
          };
        });
        await onImport(quotes);
        toast.success(`📊 Imported ${quotes.length} quotes from Excel!`);
      } else {
        // CSV
        const text = await file.text();
        const quotes = parseCSVText(text);
        if (!quotes.length) { toast.error("No valid rows found"); setImporting(false); return; }
        await onImport(quotes);
        toast.success(`📄 Imported ${quotes.length} quotes from CSV!`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse file");
    }
    setImporting(false);
    e.target.value = "";
  };

  const downloadCSVTemplate = () => {
    const csv = `customer_name,phone,email,city,vehicle_make,vehicle_model,vehicle_number,vehicle_year,fuel_type,insurance_company,policy_type,idv,basic_od,od_discount,ncb_discount,third_party,secure_premium,addon_premium,addons,batch_label
Rajesh Kumar,9876543210,rajesh@email.com,Delhi,Maruti,Swift,DL01AB1234,2022,Petrol,ICICI Lombard,Comprehensive,550000,12000,2000,3000,3500,800,1200,Zero Depreciation|Roadside Assistance,March 2026`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "bulk_renewal_quotes_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = async () => {
    try {
      await generateBulkQuoteExcel();
      toast.success("📊 Excel template with auto-calc formulas downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Excel template");
    }
  };

  return (
    <div className="flex gap-1.5 flex-wrap">
      <Button size="sm" variant="outline" onClick={downloadExcelTemplate} className="gap-1.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40">
        <FileSpreadsheet className="h-3.5 w-3.5" /> Excel Template ⚡
      </Button>
      <Button size="sm" variant="outline" onClick={downloadCSVTemplate} className="gap-1.5 text-xs">
        <Download className="h-3.5 w-3.5" /> CSV Template
      </Button>
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={importing} className="gap-1.5 text-xs">
        {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Import CSV/Excel
      </Button>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Insurance Company Combobox ──
function InsuranceCompanySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [customCompany, setCustomCompany] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="flex gap-1">
      {showCustom ? (
        <div className="flex gap-1 flex-1">
          <Input
            value={customCompany}
            onChange={e => setCustomCompany(e.target.value)}
            placeholder="Enter company name"
            className="h-7 text-[11px] flex-1"
            onKeyDown={e => { if (e.key === "Enter" && customCompany.trim()) { onChange(customCompany.trim()); setShowCustom(false); } }}
          />
          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { if (customCompany.trim()) onChange(customCompany.trim()); setShowCustom(false); }}>
            <CheckCircle2 className="h-3 w-3" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowCustom(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-1 flex-1">
          <Select value={INSURANCE_COMPANIES.includes(value) ? value : "custom"} onValueChange={v => { if (v === "__add_new__") { setShowCustom(true); setCustomCompany(""); } else { onChange(v); } }}>
            <SelectTrigger className="h-7 text-[11px] flex-1"><SelectValue placeholder="Select insurer" /></SelectTrigger>
            <SelectContent>
              {INSURANCE_COMPANIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              <SelectItem value="__add_new__">+ Add New Company</SelectItem>
            </SelectContent>
          </Select>
          {value && !INSURANCE_COMPANIES.includes(value) && (
            <Badge variant="secondary" className="text-[9px] shrink-0">{value}</Badge>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──
export function BulkRenewalQuoteGenerator({ onClose }: { onClose: () => void }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: quotes = [], isLoading } = useBulkRenewalQuotes(statusFilter);
  const addQuotes = useAddBulkQuotes();
  const updateQuote = useUpdateBulkQuote();
  const deleteQuote = useDeleteBulkQuote();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState(false);
  const [showAddRows, setShowAddRows] = useState(false);
  const [inlineRows, setInlineRows] = useState<InlineRow[]>([emptyRow()]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };
  const selectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(filteredQuotes.map(q => q.id)) : new Set());
  };

  const filteredQuotes = useMemo(() => {
    if (!searchTerm.trim()) return quotes;
    const s = searchTerm.toLowerCase();
    return quotes.filter(q =>
      q.customer_name.toLowerCase().includes(s) ||
      q.phone?.includes(s) ||
      q.vehicle_number?.toLowerCase().includes(s) ||
      q.insurance_company?.toLowerCase().includes(s)
    );
  }, [quotes, searchTerm]);

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

  const handleSendEmail = async (q: BulkRenewalQuote) => {
    if (!q.email) { toast.error("No email address"); return; }
    try {
      const netOD = Math.max(0, q.basic_od - q.od_discount - q.ncb_discount);
      const netPremium = netOD + q.third_party + q.secure_premium + q.addon_premium;
      const gst = Math.round(netPremium * 0.18);
      const total = netPremium + gst;
      window.open(`mailto:${q.email}?subject=Insurance Renewal Quote - ${q.vehicle_make} ${q.vehicle_model}&body=${encodeURIComponent(`Dear ${q.customer_name},\n\nHere is your insurance renewal quote:\n\nVehicle: ${q.vehicle_make} ${q.vehicle_model} (${q.vehicle_number})\nInsurer: ${q.insurance_company}\nTotal Premium: Rs. ${total.toLocaleString("en-IN")}\n\nPlease contact us for more details.\n\nTeam GrabYourCar\n+91 98559 24442`)}`, "_blank");
      toast.success("Email opened");
    } catch { toast.error("Failed"); }
  };

  // ── Bulk Actions ──
  const handleBulkGeneratePDFs = async () => {
    const selected = filteredQuotes.filter(q => selectedIds.has(q.id));
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
    const selected = filteredQuotes.filter(q => selectedIds.has(q.id) && q.phone);
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
            event: "insurance_renewal_bulk", phone: full,
            customerName: q.customer_name, vehicleNumber: q.vehicle_number,
            vehicleMake: q.vehicle_make, vehicleModel: q.vehicle_model,
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
    const selected = filteredQuotes.filter(q => selectedIds.has(q.id));
    if (!selected.length) return;
    for (const q of selected) {
      await updateQuote.mutateAsync({ id: q.id, status: "done" } as any);
    }
    toast.success(`${selected.length} quotes marked done`);
    setSelectedIds(new Set());
  };

  // ── Inline Add Rows ──
  const updateInlineRow = (idx: number, field: keyof InlineRow, value: any) => {
    setInlineRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addInlineRow = () => setInlineRows(prev => [...prev, emptyRow()]);
  const removeInlineRow = (idx: number) => setInlineRows(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx));

  const saveInlineRows = () => {
    const valid = inlineRows.filter(r => r.customer_name.trim() && r.vehicle_make.trim());
    if (!valid.length) { toast.error("Fill at least customer name and vehicle make"); return; }
    const inserts: BulkQuoteInsert[] = valid.map(r => ({
      customer_name: r.customer_name.trim(),
      phone: r.phone.trim(),
      email: r.email.trim() || null,
      city: r.city.trim() || null,
      vehicle_make: r.vehicle_make.trim(),
      vehicle_model: r.vehicle_model.trim(),
      vehicle_number: r.vehicle_number.trim(),
      vehicle_year: r.vehicle_year,
      fuel_type: r.fuel_type,
      insurance_company: r.insurance_company || "N/A",
      policy_type: r.policy_type,
      idv: r.idv,
      basic_od: r.basic_od,
      od_discount: r.od_discount,
      ncb_discount: r.ncb_discount,
      third_party: r.third_party,
      secure_premium: r.secure_premium,
      addon_premium: r.addon_premium,
      addons: r.addons ? r.addons.split("|").map(a => a.trim()).filter(Boolean) : [],
      status: "pending",
      notes: null,
      batch_label: r.batch_label || null,
    }));
    addQuotes.mutate(inserts);
    setInlineRows([emptyRow()]);
    setShowAddRows(false);
  };

  const pendingCount = quotes.filter(q => q.status === "pending").length;
  const sentCount = quotes.filter(q => q.status === "sent").length;
  const doneCount = quotes.filter(q => q.status === "done").length;

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const calcTotal = (q: BulkRenewalQuote) => {
    const netOD = Math.max(0, q.basic_od - q.od_discount - q.ncb_discount);
    const netPremium = netOD + q.third_party + q.secure_premium + q.addon_premium;
    return netPremium + Math.round(netPremium * 0.18);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Bulk Renewal Quotes
            <Badge variant="secondary" className="text-xs">{quotes.length} total</Badge>
          </h3>
          <div className="flex gap-3 text-[11px] mt-1">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> {pendingCount} pending</span>
            <span className="flex items-center gap-1"><Send className="h-3 w-3 text-blue-500" /> {sentCount} sent</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {doneCount} done</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant={showAddRows ? "default" : "outline"} className="gap-1.5 text-xs" onClick={() => setShowAddRows(!showAddRows)}>
            <Plus className="h-3.5 w-3.5" /> {showAddRows ? "Close Entry" : "Add Quotes"}
          </Button>
          <CSVImportButton onImport={async (q) => {
            const data = await addQuotes.mutateAsync(q);
            if (data?.length) {
              toast.info(`🔄 Auto-generating ${data.length} PDFs...`);
              let pdfCount = 0;
              for (const row of data) {
                try {
                  const quoteData: InsuranceQuoteData = {
                    customerName: row.customer_name,
                    phone: row.phone || "",
                    email: row.email || undefined,
                    city: row.city || undefined,
                    vehicleMake: row.vehicle_make,
                    vehicleModel: row.vehicle_model,
                    vehicleNumber: row.vehicle_number || "",
                    vehicleYear: row.vehicle_year,
                    fuelType: row.fuel_type,
                    insuranceCompany: row.insurance_company,
                    policyType: row.policy_type,
                    idv: row.idv,
                    basicOD: row.basic_od,
                    odDiscount: row.od_discount,
                    ncbDiscount: row.ncb_discount,
                    thirdParty: row.third_party,
                    securePremium: row.secure_premium,
                    addonPremium: row.addon_premium,
                    addons: row.addons || [],
                  };
                  const { doc, fileName } = generateInsuranceQuotePdf(quoteData);
                  // Upload PDF to storage
                  const pdfBlob = doc.output("blob");
                  const storagePath = `bulk/${row.id}/${fileName}`;
                  await supabase.storage.from("quote-pdfs").upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });
                  await supabase.from("bulk_renewal_quotes").update({ pdf_generated: true, pdf_generated_at: new Date().toISOString() } as any).eq("id", row.id);
                  pdfCount++;
                } catch (e) { console.error("PDF gen error:", e); }
              }
              toast.success(`✅ ${pdfCount}/${data.length} PDFs auto-generated!`);
            }
          }} />
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs">Close</Button>
        </div>
      </div>

      {/* ── Excel-Style Add Rows ── */}
      {showAddRows && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Quotes (Excel Style)
              <Button size="sm" variant="ghost" className="ml-auto text-xs gap-1" onClick={addInlineRow}><Plus className="h-3 w-3" /> Add Row</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[9px] font-bold uppercase w-8">#</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[120px]">Name *</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[100px]">Phone</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[100px]">Vehicle Make *</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[100px]">Vehicle Model</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[100px]">Vehicle No.</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[60px]">Year</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[140px]">Insurance Company</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[80px]">Policy Type</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[70px]">IDV</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[70px]">Basic OD</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[70px]">OD Disc</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[70px]">NCB Disc</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[70px]">TP</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[70px]">Addon</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase min-w-[120px]">Addons (pipe sep)</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inlineRows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-[10px] text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell><Input value={row.customer_name} onChange={e => updateInlineRow(idx, "customer_name", e.target.value)} className="h-7 text-[11px]" placeholder="Name" /></TableCell>
                      <TableCell><Input value={row.phone} onChange={e => updateInlineRow(idx, "phone", e.target.value)} className="h-7 text-[11px]" placeholder="Phone" /></TableCell>
                      <TableCell><Input value={row.vehicle_make} onChange={e => updateInlineRow(idx, "vehicle_make", e.target.value)} className="h-7 text-[11px]" placeholder="Make" /></TableCell>
                      <TableCell><Input value={row.vehicle_model} onChange={e => updateInlineRow(idx, "vehicle_model", e.target.value)} className="h-7 text-[11px]" placeholder="Model" /></TableCell>
                      <TableCell><Input value={row.vehicle_number} onChange={e => updateInlineRow(idx, "vehicle_number", e.target.value)} className="h-7 text-[11px]" placeholder="PB10XX1234" /></TableCell>
                      <TableCell><Input type="number" value={row.vehicle_year} onChange={e => updateInlineRow(idx, "vehicle_year", Number(e.target.value))} className="h-7 text-[11px] w-16" /></TableCell>
                      <TableCell><InsuranceCompanySelect value={row.insurance_company} onChange={v => updateInlineRow(idx, "insurance_company", v)} /></TableCell>
                      <TableCell>
                        <Select value={row.policy_type} onValueChange={v => updateInlineRow(idx, "policy_type", v)}>
                          <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{POLICY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" value={row.idv || ""} onChange={e => updateInlineRow(idx, "idv", Number(e.target.value))} className="h-7 text-[11px] w-16" placeholder="0" /></TableCell>
                      <TableCell><Input type="number" value={row.basic_od || ""} onChange={e => updateInlineRow(idx, "basic_od", Number(e.target.value))} className="h-7 text-[11px] w-16" placeholder="0" /></TableCell>
                      <TableCell><Input type="number" value={row.od_discount || ""} onChange={e => updateInlineRow(idx, "od_discount", Number(e.target.value))} className="h-7 text-[11px] w-16" placeholder="0" /></TableCell>
                      <TableCell><Input type="number" value={row.ncb_discount || ""} onChange={e => updateInlineRow(idx, "ncb_discount", Number(e.target.value))} className="h-7 text-[11px] w-16" placeholder="0" /></TableCell>
                      <TableCell><Input type="number" value={row.third_party || ""} onChange={e => updateInlineRow(idx, "third_party", Number(e.target.value))} className="h-7 text-[11px] w-16" placeholder="0" /></TableCell>
                      <TableCell><Input type="number" value={row.addon_premium || ""} onChange={e => updateInlineRow(idx, "addon_premium", Number(e.target.value))} className="h-7 text-[11px] w-16" placeholder="0" /></TableCell>
                      <TableCell><Input value={row.addons} onChange={e => updateInlineRow(idx, "addons", e.target.value)} className="h-7 text-[11px]" placeholder="Zero Dep|RSA" /></TableCell>
                      <TableCell>
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeInlineRow(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2 p-3 border-t">
              <Button size="sm" onClick={saveInlineRows} disabled={addQuotes.isPending} className="gap-1.5 text-xs">
                {addQuotes.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Save {inlineRows.filter(r => r.customer_name.trim()).length} Quote(s)
              </Button>
              <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={addInlineRow}><Plus className="h-3 w-3" /> Add Row</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, vehicle..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-8 text-xs" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({quotes.length})</SelectItem>
              <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
              <SelectItem value="sent">Sent ({sentCount})</SelectItem>
              <SelectItem value="done">Done ({doneCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border flex-wrap">
          <span className="text-xs font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={handleBulkGeneratePDFs} disabled={bulkAction} className="gap-1 text-xs h-7">
            <Download className="h-3 w-3" /> Download All PDFs
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkSendWhatsApp} disabled={bulkAction} className="gap-1 text-xs h-7">
            <MessageCircle className="h-3 w-3" /> Bulk WhatsApp API
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkMarkDone} disabled={bulkAction} className="gap-1 text-xs h-7">
            <CheckSquare className="h-3 w-3" /> Mark All Done
          </Button>
          {bulkAction && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      )}

      {/* Quotes Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-8">
                    <Checkbox checked={selectedIds.size === filteredQuotes.length && filteredQuotes.length > 0} onCheckedChange={selectAll} />
                  </TableHead>
                  <TableHead className="text-[9px] font-bold uppercase w-8">#</TableHead>
                  <TableHead className="text-[9px] font-bold uppercase">Customer</TableHead>
                  <TableHead className="text-[9px] font-bold uppercase">Phone</TableHead>
                  <TableHead className="text-[9px] font-bold uppercase">Vehicle</TableHead>
                  <TableHead className="text-[9px] font-bold uppercase">Insurer</TableHead>
                  <TableHead className="text-[9px] font-bold uppercase">Type</TableHead>
                  <TableHead className="text-[9px] font-bold uppercase">Total</TableHead>
                  <TableHead className="text-[9px] font-bold uppercase">Status</TableHead>
                  <TableHead className="text-[9px] font-bold uppercase w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : filteredQuotes.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground text-sm">No quotes found. Add quotes or import CSV.</TableCell></TableRow>
                ) : filteredQuotes.map((q, idx) => {
                  const total = calcTotal(q);
                  const statusColor = q.status === "done" ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : q.status === "sent" ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-amber-100 text-amber-800 border-amber-200";
                  return (
                    <TableRow key={q.id} className="text-xs hover:bg-muted/30">
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(q.id)} onCheckedChange={c => toggleSelect(q.id, !!c)} />
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-xs">{q.customer_name}</p>
                          {q.batch_label && <p className="text-[9px] text-muted-foreground">{q.batch_label}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{q.phone || "—"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono text-xs">{q.vehicle_number || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{q.vehicle_make} {q.vehicle_model} • {q.vehicle_year}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{q.insurance_company}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px]">{q.policy_type}</Badge></TableCell>
                      <TableCell className="font-bold text-xs text-primary">{fmt(total)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[9px] ${statusColor}`}>
                          {q.status.toUpperCase()}
                          {q.pdf_generated && " ✓PDF"}
                          {q.whatsapp_sent && " ✓WA"}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex gap-0.5 flex-wrap">
                          <Button size="sm" variant={q.pdf_generated ? "outline" : "default"} onClick={() => handleGenerate(q)} disabled={generatingId === q.id} className="gap-0.5 text-[10px] h-6 px-1.5">
                            {generatingId === q.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Download className="h-2.5 w-2.5" />} PDF
                          </Button>
                          {q.phone && (
                            <Button size="sm" variant="outline" onClick={() => handleSendWhatsApp(q)} disabled={sendingId === q.id} className="gap-0.5 text-[10px] h-6 px-1.5">
                              {sendingId === q.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <MessageCircle className="h-2.5 w-2.5" />} WA
                            </Button>
                          )}
                          {q.email && (
                            <Button size="sm" variant="outline" onClick={() => handleSendEmail(q)} className="gap-0.5 text-[10px] h-6 px-1.5">
                              <Mail className="h-2.5 w-2.5" /> Email
                            </Button>
                          )}
                          {q.status !== "done" && (
                            <Button size="sm" variant="ghost" onClick={() => updateQuote.mutateAsync({ id: q.id, status: "done" } as any).then(() => toast.success("Done"))} className="gap-0.5 text-[10px] h-6 px-1.5 text-emerald-600">
                              <CheckSquare className="h-2.5 w-2.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => deleteQuote.mutate(q.id)} className="gap-0.5 text-[10px] h-6 px-1.5 text-destructive">
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredQuotes.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground bg-muted/20">
              <span>Showing {filteredQuotes.length} quotes</span>
              <span>{pendingCount} pending • {sentCount} sent • {doneCount} done</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
