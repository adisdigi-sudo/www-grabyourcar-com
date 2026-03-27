import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Copy, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { parseCSV as parseDelimitedCSV } from "@/lib/spreadsheetUtils";

interface LeadImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (leads: Record<string, string>[]) => Promise<void>;
  templateColumns: string[];
  title?: string;
  requirePhone?: boolean;
}

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^\ufeff/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export function LeadImportDialog({
  open,
  onOpenChange,
  onImport,
  templateColumns,
  title = "Import Leads",
  requirePhone = true,
}: LeadImportDialogProps) {
  const [csvText, setCsvText] = useState("");
  const [parsedLeads, setParsedLeads] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const rows = parseDelimitedCSV(text).filter((row) => row.some((cell) => cell.trim() !== ""));
    if (rows.length < 2) {
      setParsedLeads([]);
      setErrors(["Need at least a header row and one data row"]);
      return;
    }

    const headers = rows[0].map((header, index) => {
      const normalized = normalizeHeader(header);
      return normalized || `column_${index + 1}`;
    });

    const leads: Record<string, string>[] = [];
    const errs: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      const lead: Record<string, string> = {};

      headers.forEach((header, index) => {
        lead[header] = values[index]?.trim() || "";
      });

      const hasAnyValue = Object.values(lead).some((value) => value.trim() !== "");
      if (!hasAnyValue) continue;

      if (requirePhone && !lead.phone && !lead.mobile) {
        errs.push(`Row ${i + 1}: missing phone`);
        continue;
      }

      leads.push(lead);
    }

    setParsedLeads(leads);
    setErrors(errs);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handlePaste = () => {
    if (csvText.trim()) parseCSV(csvText);
  };

  const handleImport = async () => {
    if (parsedLeads.length === 0) return;
    setImporting(true);
    try {
      await onImport(parsedLeads);
      toast.success(`✅ ${parsedLeads.length} leads imported successfully!`);
      setCsvText("");
      setParsedLeads([]);
      setErrors([]);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = templateColumns.join(",") + "\nJohn Doe,9876543210,Delhi,Referral\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-20 flex-col gap-2 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5" onClick={() => fileRef.current?.click()}>
              <Upload className="h-5 w-5 text-primary" />
              <span className="text-xs">Upload CSV File</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5" onClick={downloadTemplate}>
              <Download className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs">Download Template</span>
            </Button>
          </div>

          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Or paste CSV data below:</p>
            <Textarea
              placeholder={`${templateColumns.join(",")}\nJohn Doe,9876543210,Delhi,Referral`}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              className="h-28 font-mono text-xs"
            />
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handlePaste}>
              <Copy className="h-3.5 w-3.5" /> Parse Pasted Data
            </Button>
          </div>

          {parsedLeads.length > 0 && (
            <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  {parsedLeads.length} leads ready to import
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {parsedLeads.slice(0, 5).map((lead, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-background/80 rounded px-2 py-1">
                    <Badge variant="outline" className="text-[9px]">#{i + 1}</Badge>
                    <span className="font-medium">{lead.name || lead.customer_name || lead.insured_name || "—"}</span>
                    <span className="text-muted-foreground font-mono">
                      {lead.phone || lead.mobile || lead.registration_number || lead.vehicle_number || lead.policy_no || "—"}
                    </span>
                  </div>
                ))}
                {parsedLeads.length > 5 && <p className="text-[10px] text-muted-foreground">...and {parsedLeads.length - 5} more</p>}
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20 p-3 space-y-1">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{errors.length} issues found</span>
              </div>
              {errors.slice(0, 3).map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={parsedLeads.length === 0 || importing} className="gap-1.5">
            {importing ? "Importing..." : `Import ${parsedLeads.length} Leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
