import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload, FileText, ClipboardPaste, Table2,
  CheckCircle2, Loader2, X, Download, Database,
} from "lucide-react";

type ParsedProspect = {
  phone: string;
  customer_name: string;
  vehicle_number?: string;
  email?: string;
  insurer?: string;
  expiry_date?: string;
  premium_amount?: string;
  city?: string;
};

const DATA_SOURCES = [
  { value: "rollover_data", label: "Rollover Data" },
  { value: "purchased_database", label: "Purchased Database" },
  { value: "corporate_data", label: "Corporate Data" },
  { value: "marketing_campaign", label: "Marketing Campaign" },
  { value: "referral", label: "Referral" },
  { value: "website_lead", label: "Website Lead" },
  { value: "other", label: "Other" },
];

export function BulkProspectImportButton({ onImported }: { onImported?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> Import Data
      </Button>
      <BulkProspectImportDialog open={open} onClose={() => setOpen(false)} onImported={onImported} />
    </>
  );
}

function BulkProspectImportDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported?: () => void }) {
  const [tab, setTab] = useState("text");
  const [parsed, setParsed] = useState<ParsedProspect[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [dataSource, setDataSource] = useState("rollover_data");
  const queryClient = useQueryClient();

  const reset = () => { setParsed([]); setResult(null); setImporting(false); };
  const handleClose = () => { reset(); onClose(); };

  const doImport = async () => {
    if (!parsed.length) return;
    setImporting(true);
    let success = 0, failed = 0;

    const payload = parsed.map(c => ({
      phone: c.phone.replace(/\D/g, "").slice(-10) || `P_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      customer_name: c.customer_name || null,
      email: c.email || null,
      vehicle_number: c.vehicle_number || null,
      insurer: c.insurer || null,
      expiry_date: c.expiry_date || null,
      premium_amount: c.premium_amount ? Number(c.premium_amount) : null,
      city: c.city || null,
      data_source: dataSource,
      prospect_status: "new",
    }));

    const { error } = await supabase.from("insurance_prospects").insert(payload);
    if (error) {
      for (const row of payload) {
        const { error: e } = await supabase.from("insurance_prospects").insert(row);
        if (e) failed++; else success++;
      }
    } else {
      success = payload.length;
    }

    setResult({ success, failed });
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ["insurance-prospects"] });
    onImported?.();
    toast.success(`${success} prospects imported${failed ? `, ${failed} failed` : ""}`);
  };

  const downloadTemplate = () => {
    const csv = "Name,Phone,Vehicle Number,Email,Insurer,Expiry Date,Premium,City\nRahul Sharma,9876543210,DL01AB1234,rahul@email.com,ICICI Lombard,2026-06-15,12500,Delhi\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "prospect-import-template.csv"; a.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Import Prospect Data
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Import Complete!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="text-emerald-600 font-medium">{result.success} prospects</span> imported
                {result.failed > 0 && <>, <span className="text-destructive font-medium">{result.failed} failed</span></>}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleClose}>Done</Button>
              <Button variant="outline" onClick={reset}>Import More</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Data Source Selection */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
              <Label className="text-xs font-medium whitespace-nowrap">Data Source:</Label>
              <Select value={dataSource} onValueChange={setDataSource}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{DATA_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <Tabs value={tab} onValueChange={v => { setTab(v); setParsed([]); }}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="text" className="gap-1.5 text-xs"><ClipboardPaste className="h-3.5 w-3.5" /> Quick Text</TabsTrigger>
                <TabsTrigger value="csv" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> CSV Upload</TabsTrigger>
                <TabsTrigger value="sheet" className="gap-1.5 text-xs"><Table2 className="h-3.5 w-3.5" /> Spreadsheet</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4">
                <ProspectQuickText onParsed={setParsed} />
              </TabsContent>
              <TabsContent value="csv" className="mt-4">
                <ProspectCSV onParsed={setParsed} onDownloadTemplate={downloadTemplate} />
              </TabsContent>
              <TabsContent value="sheet" className="mt-4">
                <ProspectSheet onParsed={setParsed} />
              </TabsContent>

              {parsed.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {parsed.length} prospects ready
                    </h4>
                    <Button variant="ghost" size="sm" onClick={() => setParsed([])}><X className="h-3.5 w-3.5 mr-1" /> Clear</Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">#</th>
                          <th className="text-left px-3 py-2 font-medium">Name</th>
                          <th className="text-left px-3 py-2 font-medium">Phone</th>
                          <th className="text-left px-3 py-2 font-medium">Vehicle</th>
                          <th className="text-left px-3 py-2 font-medium">Insurer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.map((c, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-1.5 font-medium">{c.customer_name || "—"}</td>
                            <td className="px-3 py-1.5">{c.phone || "—"}</td>
                            <td className="px-3 py-1.5 font-mono">{c.vehicle_number || "—"}</td>
                            <td className="px-3 py-1.5">{c.insurer || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button onClick={doImport} disabled={importing} className="w-full gap-2">
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {importing ? "Importing..." : `Import ${parsed.length} Prospects`}
                  </Button>
                </div>
              )}
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProspectQuickText({ onParsed }: { onParsed: (c: ParsedProspect[]) => void }) {
  const [text, setText] = useState("");
  const parse = () => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const prospects: ParsedProspect[] = [];
    for (const line of lines) {
      const parts = line.split(/[\-\|,\t]+/).map(p => p.trim()).filter(Boolean);
      if (!parts.length) continue;
      const name = parts[0];
      const phone = parts[1]?.replace(/[^0-9+]/g, "") || "";
      const vehicle = parts[2] || "";
      const email = parts.find(p => p.includes("@")) || "";
      prospects.push({ customer_name: name, phone, vehicle_number: vehicle && !vehicle.includes("@") ? vehicle : "", email });
    }
    onParsed(prospects);
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-muted/30 border text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-sm">Paste prospect data — one per line</p>
        <code className="block bg-muted px-2 py-1 rounded">Name - Phone</code>
        <code className="block bg-muted px-2 py-1 rounded">Name - Phone - Vehicle Number</code>
      </div>
      <Textarea value={text} onChange={e => setText(e.target.value)}
        placeholder={`Rahul Sharma - 9876543210\nPriya Singh - 8765432109 - DL01AB1234`}
        className="min-h-[140px] font-mono text-sm" />
      <Button onClick={parse} disabled={!text.trim()} className="w-full">
        Parse {text.split("\n").filter(l => l.trim()).length} Lines
      </Button>
    </div>
  );
}

function ProspectCSV({ onParsed, onDownloadTemplate }: { onParsed: (c: ParsedProspect[]) => void; onDownloadTemplate: () => void }) {
  const [fileName, setFileName] = useState("");
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast.error("CSV needs header + data"); return; }
      const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
      const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("customer"));
      const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile"));
      const emailIdx = headers.findIndex(h => h.includes("email"));
      const vehicleIdx = headers.findIndex(h => h.includes("vehicle") || h.includes("reg"));
      const insurerIdx = headers.findIndex(h => h.includes("insurer") || h.includes("company"));
      const expiryIdx = headers.findIndex(h => h.includes("expiry") || h.includes("renewal"));
      const premiumIdx = headers.findIndex(h => h.includes("premium") || h.includes("amount"));
      const cityIdx = headers.findIndex(h => h.includes("city"));

      const prospects: ParsedProspect[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const name = nameIdx >= 0 ? cols[nameIdx]?.trim() : cols[0]?.trim();
        if (!name) continue;
        prospects.push({
          customer_name: name,
          phone: phoneIdx >= 0 ? (cols[phoneIdx]?.replace(/[^0-9+]/g, "") || "") : "",
          email: emailIdx >= 0 ? cols[emailIdx]?.trim() : "",
          vehicle_number: vehicleIdx >= 0 ? cols[vehicleIdx]?.trim() : "",
          insurer: insurerIdx >= 0 ? cols[insurerIdx]?.trim() : "",
          expiry_date: expiryIdx >= 0 ? cols[expiryIdx]?.trim() : "",
          premium_amount: premiumIdx >= 0 ? cols[premiumIdx]?.replace(/[^0-9.]/g, "") : "",
          city: cityIdx >= 0 ? cols[cityIdx]?.trim() : "",
        });
      }
      onParsed(prospects);
      toast.success(`Parsed ${prospects.length} prospects`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-muted/30 border text-xs text-muted-foreground">
        <p className="font-medium text-foreground text-sm mb-1">Upload CSV file</p>
        <p>Columns: Name, Phone, Vehicle, Email, Insurer, Expiry Date, Premium, City</p>
      </div>
      <Button variant="outline" size="sm" onClick={onDownloadTemplate} className="gap-1.5 text-xs">
        <Download className="h-3.5 w-3.5" /> Download Template
      </Button>
      <Label htmlFor="prospect-csv-upload" className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/20 transition-colors">
        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
        <span className="text-sm font-medium">{fileName || "Click to select CSV file"}</span>
        <Input id="prospect-csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </Label>
    </div>
  );
}

function ProspectSheet({ onParsed }: { onParsed: (c: ParsedProspect[]) => void }) {
  const [text, setText] = useState("");
  const parse = () => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const firstLine = lines[0].toLowerCase();
    const hasHeaders = firstLine.includes("name") || firstLine.includes("phone");
    const startIdx = hasHeaders ? 1 : 0;
    const separator = lines[startIdx]?.includes("\t") ? "\t" : ",";

    let nameIdx = 0, phoneIdx = 1, vehicleIdx = 2, emailIdx = -1;
    if (hasHeaders) {
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ""));
      nameIdx = Math.max(0, headers.findIndex(h => h.includes("name")));
      phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile"));
      vehicleIdx = headers.findIndex(h => h.includes("vehicle") || h.includes("reg"));
      emailIdx = headers.findIndex(h => h.includes("email"));
      if (phoneIdx === -1) phoneIdx = 1;
    }

    const prospects: ParsedProspect[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(separator).map(c => c.trim().replace(/"/g, ""));
      const name = cols[nameIdx]?.trim(); if (!name) continue;
      prospects.push({
        customer_name: name,
        phone: phoneIdx >= 0 && cols[phoneIdx] ? cols[phoneIdx].replace(/[^0-9+]/g, "") : "",
        vehicle_number: vehicleIdx >= 0 ? cols[vehicleIdx]?.trim() || "" : "",
        email: emailIdx >= 0 ? cols[emailIdx]?.trim() || "" : "",
      });
    }
    onParsed(prospects);
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-muted/30 border text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-sm">Paste from Excel / Google Sheets</p>
        <p>Copy rows and paste below. Tab & comma separated both work.</p>
      </div>
      <Textarea value={text} onChange={e => setText(e.target.value)}
        placeholder={`Name\tPhone\tVehicle\nRahul Sharma\t9876543210\tDL01AB1234`}
        className="min-h-[140px] font-mono text-sm" />
      <Button onClick={parse} disabled={!text.trim()} className="w-full">Parse Spreadsheet Data</Button>
    </div>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []; let current = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}
