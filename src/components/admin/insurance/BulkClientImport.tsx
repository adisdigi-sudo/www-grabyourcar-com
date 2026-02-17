import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, ClipboardPaste, Table2, ChevronDown,
  CheckCircle2, AlertCircle, Loader2, X, Download,
} from "lucide-react";

type ParsedClient = {
  customer_name: string;
  phone: string;
  email?: string;
  vehicle_number?: string;
  advisor_name?: string;
};

export function BulkImportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="h-4 w-4" /> Bulk Import <ChevronDown className="h-3 w-3 ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setOpen(true)} className="gap-2">
            <FileText className="h-4 w-4" /> CSV File Upload
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)} className="gap-2">
            <ClipboardPaste className="h-4 w-4" /> Quick Text Paste
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)} className="gap-2">
            <Table2 className="h-4 w-4" /> Spreadsheet Paste
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BulkImportDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function BulkImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState("text");
  const [parsed, setParsed] = useState<ParsedClient[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const queryClient = useQueryClient();

  const reset = () => {
    setParsed([]);
    setResult(null);
    setImporting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const doImport = async () => {
    if (!parsed.length) return;
    setImporting(true);
    let success = 0;
    let failed = 0;

    // Batch insert
    const payload = parsed.map(c => ({
      customer_name: c.customer_name,
      phone: c.phone || `IB_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email: c.email || null,
      vehicle_number: c.vehicle_number || null,
      advisor_name: c.advisor_name || null,
    }));

    const { error } = await supabase.from("insurance_clients").insert(payload);
    if (error) {
      // Try one-by-one fallback
      for (const row of payload) {
        const { error: e } = await supabase.from("insurance_clients").insert(row);
        if (e) failed++;
        else success++;
      }
    } else {
      success = payload.length;
    }

    setResult({ success, failed });
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ["ins-clients"] });
    toast.success(`${success} clients imported${failed ? `, ${failed} failed` : ""}`);
  };

  const downloadTemplate = () => {
    const csv = "Customer Name,Phone,Email,Vehicle Number,Agent\nJohn Doe,9876543210,john@email.com,DL01AB1234,Agent Name\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "client-import-template.csv";
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk Import Clients
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <ImportResult result={result} onDone={handleClose} onMore={reset} />
        ) : (
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setParsed([]); }}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="text" className="gap-1.5 text-xs">
                <ClipboardPaste className="h-3.5 w-3.5" /> Quick Text
              </TabsTrigger>
              <TabsTrigger value="csv" className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" /> CSV Upload
              </TabsTrigger>
              <TabsTrigger value="sheet" className="gap-1.5 text-xs">
                <Table2 className="h-3.5 w-3.5" /> Spreadsheet
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-4">
              <QuickTextImport onParsed={setParsed} />
            </TabsContent>
            <TabsContent value="csv" className="mt-4">
              <CSVImport onParsed={setParsed} onDownloadTemplate={downloadTemplate} />
            </TabsContent>
            <TabsContent value="sheet" className="mt-4">
              <SpreadsheetImport onParsed={setParsed} />
            </TabsContent>

            {parsed.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {parsed.length} clients ready to import
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => setParsed([])}>
                    <X className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">#</th>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Phone</th>
                        <th className="text-left px-3 py-2 font-medium">Vehicle</th>
                        <th className="text-left px-3 py-2 font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((c, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-1.5 font-medium">{c.customer_name}</td>
                          <td className="px-3 py-1.5">{c.phone || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-1.5 font-mono">{c.vehicle_number || "—"}</td>
                          <td className="px-3 py-1.5">{c.email || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button onClick={doImport} disabled={importing} className="w-full gap-2">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importing ? "Importing..." : `Import ${parsed.length} Clients`}
                </Button>
              </div>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Quick Text Paste ──
function QuickTextImport({ onParsed }: { onParsed: (c: ParsedClient[]) => void }) {
  const [text, setText] = useState("");

  const parse = () => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const clients: ParsedClient[] = [];
    for (const line of lines) {
      // Support formats:
      // "Name - Phone" or "Name, Phone" or "Name | Phone" or "Name \t Phone"
      // "Name - Phone - Vehicle" etc.
      const parts = line.split(/[\-\|,\t]+/).map(p => p.trim()).filter(Boolean);
      if (parts.length === 0) continue;

      const name = parts[0];
      const phone = parts[1]?.replace(/[^0-9+]/g, "") || "";
      const vehicle = parts[2] || "";
      const email = parts.find(p => p.includes("@")) || "";

      clients.push({
        customer_name: name,
        phone,
        vehicle_number: vehicle && !vehicle.includes("@") ? vehicle : "",
        email: email,
      });
    }
    onParsed(clients);
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-muted/30 border text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-sm">Paste client data — one per line</p>
        <p>Supported formats:</p>
        <code className="block bg-muted px-2 py-1 rounded">Name - Phone</code>
        <code className="block bg-muted px-2 py-1 rounded">Name - Phone - Vehicle Number</code>
        <code className="block bg-muted px-2 py-1 rounded">Name, Phone, Email</code>
      </div>
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Rahul Sharma - 9876543210\nPriya Singh - 8765432109 - DL01AB1234\nAmit Kumar, 7654321098, amit@email.com`}
        className="min-h-[140px] font-mono text-sm"
      />
      <Button onClick={parse} disabled={!text.trim()} className="w-full">
        Parse {text.split("\n").filter(l => l.trim()).length} Lines
      </Button>
    </div>
  );
}

// ── CSV Upload ──
function CSVImport({ onParsed, onDownloadTemplate }: { onParsed: (c: ParsedClient[]) => void; onDownloadTemplate: () => void }) {
  const [fileName, setFileName] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast.error("CSV needs at least a header + 1 row"); return; }

      const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
      const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("customer"));
      const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile") || h.includes("number"));
      const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("mail"));
      const vehicleIdx = headers.findIndex(h => h.includes("vehicle") || h.includes("reg"));
      const agentIdx = headers.findIndex(h => h.includes("agent") || h.includes("advisor"));

      if (nameIdx === -1) { toast.error("Could not find a 'Name' column in CSV"); return; }

      const clients: ParsedClient[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const name = cols[nameIdx]?.trim();
        if (!name) continue;
        clients.push({
          customer_name: name,
          phone: (phoneIdx >= 0 ? cols[phoneIdx]?.replace(/[^0-9+]/g, "") : "") || "",
          email: emailIdx >= 0 ? cols[emailIdx]?.trim() : "",
          vehicle_number: vehicleIdx >= 0 ? cols[vehicleIdx]?.trim() : "",
          advisor_name: agentIdx >= 0 ? cols[agentIdx]?.trim() : "",
        });
      }
      onParsed(clients);
      toast.success(`Parsed ${clients.length} clients from CSV`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-muted/30 border text-xs text-muted-foreground">
        <p className="font-medium text-foreground text-sm mb-1">Upload a CSV file</p>
        <p>Required column: <Badge variant="secondary" className="text-[10px]">Customer Name</Badge></p>
        <p className="mt-1">Optional: Phone, Email, Vehicle Number, Agent</p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onDownloadTemplate} className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" /> Download Template
        </Button>
      </div>

      <Label
        htmlFor="csv-upload"
        className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/20 transition-colors"
      >
        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
        <span className="text-sm font-medium">{fileName || "Click to select CSV file"}</span>
        <span className="text-xs text-muted-foreground mt-1">Supports .csv files</span>
        <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </Label>
    </div>
  );
}

// ── Spreadsheet Paste ──
function SpreadsheetImport({ onParsed }: { onParsed: (c: ParsedClient[]) => void }) {
  const [text, setText] = useState("");

  const parse = () => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    // Auto-detect: if first line looks like headers, skip it
    const firstLine = lines[0].toLowerCase();
    const hasHeaders = firstLine.includes("name") || firstLine.includes("phone") || firstLine.includes("customer");
    const startIdx = hasHeaders ? 1 : 0;

    // Detect tab-separated
    const separator = lines[startIdx]?.includes("\t") ? "\t" : ",";

    // Try to detect column positions from headers
    let nameIdx = 0, phoneIdx = 1, emailIdx = -1, vehicleIdx = -1, agentIdx = -1;
    if (hasHeaders) {
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ""));
      nameIdx = headers.findIndex(h => h.includes("name") || h.includes("customer"));
      phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile"));
      emailIdx = headers.findIndex(h => h.includes("email"));
      vehicleIdx = headers.findIndex(h => h.includes("vehicle") || h.includes("reg"));
      agentIdx = headers.findIndex(h => h.includes("agent") || h.includes("advisor"));
      if (nameIdx === -1) nameIdx = 0;
      if (phoneIdx === -1) phoneIdx = 1;
    }

    const clients: ParsedClient[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(separator).map(c => c.trim().replace(/"/g, ""));
      const name = cols[nameIdx]?.trim();
      if (!name) continue;
      clients.push({
        customer_name: name,
        phone: phoneIdx >= 0 && cols[phoneIdx] ? cols[phoneIdx].replace(/[^0-9+]/g, "") : "",
        email: emailIdx >= 0 ? cols[emailIdx]?.trim() || "" : "",
        vehicle_number: vehicleIdx >= 0 ? cols[vehicleIdx]?.trim() || "" : "",
        advisor_name: agentIdx >= 0 ? cols[agentIdx]?.trim() || "" : "",
      });
    }
    onParsed(clients);
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-muted/30 border text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-sm">Paste from Excel / Google Sheets</p>
        <p>Copy rows from your spreadsheet and paste below. Tab-separated & comma-separated both work.</p>
        <p>First row can be headers (auto-detected).</p>
      </div>
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Name\tPhone\tVehicle\nRahul Sharma\t9876543210\tDL01AB1234\nPriya Singh\t8765432109\tHR26AB5678`}
        className="min-h-[140px] font-mono text-sm"
      />
      <Button onClick={parse} disabled={!text.trim()} className="w-full">
        Parse Spreadsheet Data
      </Button>
    </div>
  );
}

// ── Import Result ──
function ImportResult({ result, onDone, onMore }: { result: { success: number; failed: number }; onDone: () => void; onMore: () => void }) {
  return (
    <div className="text-center py-6 space-y-4">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Import Complete!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="text-emerald-600 font-medium">{result.success} clients</span> imported successfully
          {result.failed > 0 && (
            <>, <span className="text-destructive font-medium">{result.failed} failed</span></>
          )}
        </p>
      </div>
      <div className="flex gap-2 justify-center">
        <Button onClick={onDone}>Done</Button>
        <Button variant="outline" onClick={onMore}>Import More</Button>
      </div>
    </div>
  );
}

// ── CSV Line Parser (handles quoted fields) ──
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}
