import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { generateInsuranceQuotePdf, InsuranceQuoteData } from "@/lib/generateInsuranceQuotePdf";
import { generateRenewalReminderPdf, RenewalReminderData } from "@/lib/generateRenewalReminderPdf";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const QUOTE_CSV_TEMPLATE = `customer_name,phone,email,city,vehicle_make,vehicle_model,vehicle_number,vehicle_year,fuel_type,insurance_company,policy_type,idv,basic_od,od_discount,ncb_discount,third_party,secure_premium,addon_premium,addons
Rajesh Kumar,9876543210,rajesh@email.com,Delhi,Maruti,Swift,DL01AB1234,2022,Petrol,ICICI Lombard,Comprehensive,550000,12000,2000,3000,3500,800,1200,Zero Depreciation|Roadside Assistance
Priya Sharma,9876543211,priya@email.com,Mumbai,Hyundai,Creta,MH02CD5678,2023,Diesel,HDFC Ergo,Comprehensive,1200000,25000,4000,6000,4200,1200,2500,Engine Protection|Return to Invoice|NCB Protect`;

const RENEWAL_CSV_TEMPLATE = `customer_name,phone,email,city,vehicle_make,vehicle_model,vehicle_number,vehicle_year,current_insurer,policy_number,policy_type,policy_expiry,last_year_premium,ncb_percentage,idv,addons
Amit Singh,9876543210,amit@email.com,Delhi,Maruti,Swift,DL01AB1234,2022,ICICI Lombard,POL-123456,Comprehensive,2026-04-15,12500,25,550000,Zero Depreciation|Roadside Assistance
Neha Gupta,9876543211,neha@email.com,Gurugram,Hyundai,Creta,HR26DK9876,2023,HDFC Ergo,POL-789012,Comprehensive,2026-03-20,28000,35,1200000,Engine Protection|NCB Protect|Return to Invoice`;

interface ParsedQuoteRow {
  raw: Record<string, string>;
  valid: boolean;
  error?: string;
}

export const InsuranceBulkQuoteImport = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"quote" | "renewal">("quote");
  const [parsedRows, setParsedRows] = useState<ParsedQuoteRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const downloadTemplate = (type: "quote" | "renewal") => {
    const csv = type === "quote" ? QUOTE_CSV_TEMPLATE : RENEWAL_CSV_TEMPLATE;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = type === "quote" ? "insurance_quote_template.csv" : "renewal_reminder_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return { rows: [] as ParsedQuoteRow[], errors: ["File must have header + at least 1 data row"] };
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));

    const required = tab === "quote"
      ? ["customer_name", "phone", "vehicle_make", "vehicle_model"]
      : ["customer_name", "phone", "vehicle_make", "vehicle_model", "policy_expiry"];

    const missing = required.filter(f => !headers.includes(f));
    if (missing.length > 0) return { rows: [] as ParsedQuoteRow[], errors: [`Missing required columns: ${missing.join(", ")}`] };

    const rows: ParsedQuoteRow[] = [];
    const errs: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      // Handle CSV values that may contain commas within quotes
      const values = lines[i].split(",").map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ""; });

      if (!row.customer_name) { errs.push(`Row ${i}: Missing customer_name`); rows.push({ raw: row, valid: false, error: "Missing name" }); continue; }
      if (!row.phone || row.phone.replace(/\D/g, "").length < 10) { errs.push(`Row ${i}: Invalid phone`); rows.push({ raw: row, valid: false, error: "Invalid phone" }); continue; }
      rows.push({ raw: row, valid: true });
    }
    return { rows, errors: errs };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, errors: parseErrors } = parseCSV(text);
      setParsedRows(rows);
      setErrors(parseErrors);
    };
    reader.readAsText(file);
  };

  const generateBulkPDFs = async () => {
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) { toast.error("No valid rows to generate"); return; }

    setGenerating(true);
    setProgress(0);
    let count = 0;

    for (const row of validRows) {
      try {
        const r = row.raw;
        if (tab === "quote") {
          const quoteData: InsuranceQuoteData = {
            customerName: r.customer_name,
            phone: r.phone,
            email: r.email || undefined,
            city: r.city || undefined,
            vehicleMake: r.vehicle_make || "N/A",
            vehicleModel: r.vehicle_model || "N/A",
            vehicleNumber: r.vehicle_number || "N/A",
            vehicleYear: r.vehicle_year ? Number(r.vehicle_year) : new Date().getFullYear(),
            fuelType: r.fuel_type || "Petrol",
            insuranceCompany: r.insurance_company || "N/A",
            policyType: r.policy_type || "Comprehensive",
            idv: Number(r.idv) || 0,
            basicOD: Number(r.basic_od) || 0,
            odDiscount: Number(r.od_discount) || 0,
            ncbDiscount: Number(r.ncb_discount) || 0,
            thirdParty: Number(r.third_party) || 0,
            securePremium: Number(r.secure_premium) || 0,
            addonPremium: Number(r.addon_premium) || 0,
            addons: r.addons ? r.addons.split("|").map(a => a.trim()).filter(Boolean) : [],
          };
          generateInsuranceQuotePdf(quoteData);
        } else {
          const renewalData: RenewalReminderData = {
            customerName: r.customer_name,
            phone: r.phone,
            email: r.email || undefined,
            city: r.city || undefined,
            vehicleMake: r.vehicle_make || "N/A",
            vehicleModel: r.vehicle_model || "N/A",
            vehicleNumber: r.vehicle_number || "N/A",
            vehicleYear: r.vehicle_year ? Number(r.vehicle_year) : new Date().getFullYear(),
            currentInsurer: r.current_insurer || "N/A",
            policyNumber: r.policy_number || undefined,
            policyType: r.policy_type || "Comprehensive",
            policyExpiry: r.policy_expiry || new Date().toISOString(),
            currentPremium: Number(r.last_year_premium) || 0,
            ncbPercentage: Number(r.ncb_percentage) || 0,
            idv: r.idv ? Number(r.idv) : undefined,
            addons: r.addons ? r.addons.split("|").map(a => a.trim()).filter(Boolean) : undefined,
          };
          generateRenewalReminderPdf(renewalData);
        }
        count++;
      } catch (e) {
        console.error(`Failed PDF for row:`, e);
      }
      setProgress(Math.round(((count) / validRows.length) * 100));
      await new Promise(r => setTimeout(r, 400)); // Stagger to avoid browser block
    }

    setGenerating(false);
    toast.success(`Generated ${count} ${tab === "quote" ? "Quote" : "Renewal"} PDFs!`);
  };

  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setParsedRows([]); setErrors([]); setProgress(0); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Bulk Quote / Renewal PDFs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Bulk PDF Generator
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => { setTab(v as "quote" | "renewal"); setParsedRows([]); setErrors([]); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quote">Insurance Quotes</TabsTrigger>
            <TabsTrigger value="renewal">Renewal Reminders</TabsTrigger>
          </TabsList>

          <TabsContent value="quote" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV with customer and premium details to generate branded Insurance Quote PDFs in bulk.
            </p>
            <Button variant="outline" onClick={() => downloadTemplate("quote")} className="w-full gap-2">
              <Download className="h-4 w-4" /> Download Quote CSV Template
            </Button>
          </TabsContent>

          <TabsContent value="renewal" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV with customer policy details to generate branded Renewal Reminder PDFs in bulk.
            </p>
            <Button variant="outline" onClick={() => downloadTemplate("renewal")} className="w-full gap-2">
              <Download className="h-4 w-4" /> Download Renewal CSV Template
            </Button>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 mt-2">
          {/* Upload area */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload CSV file</p>
            <p className="text-xs text-muted-foreground mt-1">
              {tab === "quote" ? "Required: customer_name, phone, vehicle_make, vehicle_model" : "Required: customer_name, phone, vehicle_make, vehicle_model, policy_expiry"}
            </p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} key={tab} />
          </div>

          {/* Parse results */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{validCount} valid rows</span>
                </div>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{invalidCount} errors</Badge>
                )}
              </div>

              {errors.length > 0 && (
                <div className="max-h-24 overflow-y-auto space-y-1 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs">
                  {errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-1 text-red-600">
                      <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      {e}
                    </div>
                  ))}
                </div>
              )}

              {/* Preview first 3 rows */}
              <div className="text-xs space-y-1">
                <p className="font-medium text-muted-foreground">Preview (first 3):</p>
                {parsedRows.filter(r => r.valid).slice(0, 3).map((r, i) => (
                  <div key={i} className="flex gap-3 bg-muted/30 rounded px-2 py-1">
                    <span className="font-medium">{r.raw.customer_name}</span>
                    <span className="text-muted-foreground">{r.raw.phone}</span>
                    <span className="text-muted-foreground">{r.raw.vehicle_make} {r.raw.vehicle_model}</span>
                    {tab === "renewal" && r.raw.policy_expiry && (
                      <span className="text-amber-600">Exp: {r.raw.policy_expiry}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Progress */}
              {generating && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground text-center">Generating PDFs... {progress}%</p>
                </div>
              )}

              {/* Generate button */}
              <Button onClick={generateBulkPDFs} disabled={generating || validCount === 0} className="w-full gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                {generating ? "Generating..." : `Generate ${validCount} ${tab === "quote" ? "Quote" : "Renewal"} PDFs`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
