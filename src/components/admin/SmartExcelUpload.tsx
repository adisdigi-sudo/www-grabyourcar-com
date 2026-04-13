import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle,
  X, Loader2, ArrowRight, Wand2, Eye, Trash2, RefreshCw, Shield,
  Users, Car, Package, Calendar, CreditCard, MapPin, FileText, Zap
} from "lucide-react";
import { parseCSV, toCSV, downloadCSVFile } from "@/lib/spreadsheetUtils";

// ─── Module definitions ───
const MODULES = [
  { id: "leads", label: "CRM Leads", icon: Users, table: "leads", description: "Import leads for any vertical", color: "text-blue-500" },
  { id: "insurance_clients", label: "Insurance Clients", icon: Shield, table: "insurance_clients", description: "Import insurance client data", color: "text-green-500" },
  { id: "insurance_prospects", label: "Insurance Prospects", icon: Shield, table: "insurance_prospects", description: "Bulk prospect database import", color: "text-emerald-500" },
  { id: "cars", label: "Car Catalog", icon: Car, table: "cars", description: "Import car models & metadata", color: "text-purple-500" },
  { id: "car_variants", label: "Car Variants", icon: CreditCard, table: "car_variants", description: "Import variant pricing", color: "text-indigo-500" },
  { id: "accessories", label: "Accessories", icon: Package, table: "accessories", description: "Import accessory inventory", color: "text-orange-500" },
  { id: "customers", label: "Customers", icon: Users, table: "customers", description: "Import customer database", color: "text-pink-500" },
  { id: "email_contacts", label: "Email Contacts", icon: FileText, table: "email_marketing_contacts", description: "Import email subscriber list", color: "text-cyan-500" },
];

// ─── Field mappings per module ───
const MODULE_FIELDS: Record<string, { required: string[]; optional: string[]; }> = {
  leads: {
    required: ["name", "phone"],
    optional: ["email", "source", "lead_type", "city", "car_brand", "car_model", "budget_min", "budget_max", "notes", "priority", "status"],
  },
  insurance_clients: {
    required: ["phone"],
    optional: ["customer_name", "email", "vehicle_number", "vehicle_make", "vehicle_model", "vehicle_year", "current_insurer", "current_policy_type", "policy_expiry_date", "lead_source", "lead_status", "priority", "assigned_executive", "notes", "ncb_percentage"],
  },
  insurance_prospects: {
    required: ["phone"],
    optional: ["customer_name", "email", "vehicle_number", "vehicle_make", "vehicle_model", "insurer", "expiry_date", "premium_amount", "city", "state"],
  },
  cars: {
    required: ["brand", "name"],
    optional: ["slug", "price_range", "body_type", "fuel_types", "transmission_types", "tagline", "overview", "is_bestseller", "is_new", "is_hot"],
  },
  car_variants: {
    required: ["car_id", "name", "fuel_type", "transmission"],
    optional: ["ex_showroom", "on_road_price", "features"],
  },
  accessories: {
    required: ["name", "price"],
    optional: ["category", "mrp", "brand", "compatibility", "stock_quantity", "description", "image_url", "is_featured"],
  },
  customers: {
    required: ["name", "phone"],
    optional: ["email", "city", "car_brand", "car_model", "source", "status", "notes"],
  },
  email_contacts: {
    required: ["email"],
    optional: ["name", "company", "phone", "tags", "subscription_status"],
  },
};

// ─── Smart auto-mapping ───
function autoMapColumns(headers: string[], moduleId: string): Record<string, string> {
  const fields = MODULE_FIELDS[moduleId];
  if (!fields) return {};
  const allFields = [...fields.required, ...fields.optional];
  const mapping: Record<string, string> = {};

  const aliases: Record<string, string[]> = {
    phone: ["phone", "mobile", "contact", "telephone", "cell", "phone_number", "mobile_number", "contact_number"],
    customer_name: ["customer_name", "name", "full_name", "client_name", "customer", "owner_name"],
    email: ["email", "email_address", "mail", "e_mail"],
    vehicle_number: ["vehicle_number", "registration", "reg_no", "vehicle_no", "registration_number", "reg_number"],
    vehicle_make: ["vehicle_make", "make", "manufacturer", "brand", "car_brand", "oem"],
    vehicle_model: ["vehicle_model", "model", "car_model", "car_name"],
    vehicle_year: ["vehicle_year", "year", "mfg_year", "manufacturing_year"],
    city: ["city", "location", "town"],
    state: ["state", "province", "region"],
    insurer: ["insurer", "current_insurer", "insurance_company", "ic"],
    expiry_date: ["expiry_date", "expiry", "policy_expiry", "renewal_date", "due_date"],
    premium_amount: ["premium_amount", "premium", "amount", "price"],
    source: ["source", "lead_source", "origin", "channel"],
    notes: ["notes", "remarks", "comments", "note", "remark"],
    priority: ["priority", "urgency"],
    status: ["status", "lead_status", "stage"],
    name: ["name", "full_name", "customer_name", "client_name", "owner_name"],
    brand: ["brand", "make", "manufacturer", "oem"],
    price: ["price", "amount", "mrp", "cost"],
    category: ["category", "type", "group"],
    tags: ["tags", "labels", "groups"],
    company: ["company", "organization", "firm", "business"],
    slug: ["slug", "url_slug"],
    price_range: ["price_range", "price"],
    body_type: ["body_type", "type", "segment"],
    car_brand: ["car_brand", "brand"],
    car_model: ["car_model", "model"],
    subscription_status: ["subscription_status", "subscribed", "status"],
    ncb_percentage: ["ncb_percentage", "ncb", "no_claim_bonus"],
    current_policy_type: ["current_policy_type", "policy_type", "type"],
    policy_expiry_date: ["policy_expiry_date", "expiry", "expiry_date", "renewal_date"],
    assigned_executive: ["assigned_executive", "executive", "agent", "rm"],
    lead_source: ["lead_source", "source", "origin"],
    lead_status: ["lead_status", "status"],
    stock_quantity: ["stock_quantity", "stock", "quantity", "qty"],
    compatibility: ["compatibility", "fits", "compatible_cars"],
    is_featured: ["is_featured", "featured"],
  };

  headers.forEach(header => {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    for (const field of allFields) {
      if (mapping[field]) continue;
      const fieldAliases = aliases[field] || [field];
      if (fieldAliases.some(a => normalized === a || normalized.includes(a) || a.includes(normalized))) {
        mapping[field] = header;
        break;
      }
    }
  });

  return mapping;
}

// ─── Validation ───
interface ValidationError { row: number; field: string; message: string; }

function validateRows(rows: Record<string, string>[], moduleId: string, mapping: Record<string, string>): ValidationError[] {
  const errors: ValidationError[] = [];
  const fields = MODULE_FIELDS[moduleId];
  if (!fields) return errors;

  const phonesSeen = new Set<string>();

  rows.forEach((row, i) => {
    // Required field checks
    fields.required.forEach(field => {
      const col = mapping[field];
      if (!col || !row[col]?.trim()) {
        errors.push({ row: i + 1, field, message: `Missing required: ${field}` });
      }
    });

    // Phone validation
    const phoneCol = mapping["phone"];
    if (phoneCol && row[phoneCol]) {
      const phone = row[phoneCol].replace(/\D/g, "").slice(-10);
      if (phone.length !== 10) {
        errors.push({ row: i + 1, field: "phone", message: `Invalid phone: ${row[phoneCol]}` });
      } else if (phonesSeen.has(phone)) {
        errors.push({ row: i + 1, field: "phone", message: `Duplicate phone: ${phone}` });
      }
      phonesSeen.add(phone);
    }

    // Email validation
    const emailCol = mapping["email"];
    if (emailCol && row[emailCol]?.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row[emailCol].trim())) {
        errors.push({ row: i + 1, field: "email", message: `Invalid email: ${row[emailCol]}` });
      }
    }
  });

  return errors;
}

// ─── Component ───
export const SmartExcelUpload = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"select" | "upload" | "map" | "validate" | "import" | "done">("select");
  const [selectedModule, setSelectedModule] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; skipped: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const moduleConfig = MODULES.find(m => m.id === selectedModule);
  const fields = MODULE_FIELDS[selectedModule] || { required: [], optional: [] };
  const allFields = [...fields.required, ...fields.optional];

  // ─── File handling ───
  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    toast.loading("Parsing file...");

    try {
      let rows: string[][] = [];

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const ExcelJS = await import("exceljs");
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());
        const ws = wb.worksheets[0];
        if (!ws) throw new Error("No worksheet found");
        ws.eachRow((row, idx) => {
          const vals = (row.values as any[]).slice(1).map(v => String(v ?? ""));
          rows.push(vals);
        });
      } else {
        const text = await file.text();
        rows = parseCSV(text);
      }

      if (rows.length < 2) {
        toast.dismiss();
        toast.error("File must have header + at least 1 data row");
        return;
      }

      const hdrs = rows[0].map(h => h.trim());
      setHeaders(hdrs);

      const dataRows = rows.slice(1).filter(r => r.some(c => c.trim())).map(r => {
        const obj: Record<string, string> = {};
        hdrs.forEach((h, i) => { obj[h] = r[i] ?? ""; });
        return obj;
      });

      setRawRows(dataRows);

      // Auto-map
      const autoMap = autoMapColumns(hdrs, selectedModule);
      setMapping(autoMap);

      toast.dismiss();
      toast.success(`Parsed ${dataRows.length} rows • ${Object.keys(autoMap).length} fields auto-mapped`);
      setStep("map");
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed to parse file");
    }
  }, [selectedModule]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ─── Validate ───
  const runValidation = () => {
    const errs = validateRows(rawRows, selectedModule, mapping);
    setErrors(errs);
    setStep("validate");
    if (errs.length === 0) {
      toast.success("All rows valid! Ready to import.");
    } else {
      toast.warning(`${errs.length} issues found in ${new Set(errs.map(e => e.row)).size} rows`);
    }
  };

  // ─── Import ───
  const runImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    setStep("import");

    const validRows = rawRows.filter((_, i) => {
      const rowErrors = errors.filter(e => e.row === i + 1);
      return rowErrors.length === 0;
    });

    let success = 0, failed = 0, skipped = 0;
    const batchSize = 100;

    try {
      // Special handling for insurance_prospects — use edge function
      if (selectedModule === "insurance_prospects") {
        const prospects = validRows.map(row => {
          const mapped: Record<string, any> = {};
          Object.entries(mapping).forEach(([field, col]) => {
            if (col && row[col]?.trim()) mapped[field] = row[col].trim();
          });
          return mapped;
        });

        const { data, error } = await supabase.functions.invoke("bulk-import-prospects", {
          body: { prospects, data_source: "smart_excel_upload", source_file: fileName },
        });

        if (error) throw error;
        success = data?.success || 0;
        failed = data?.failed || 0;
        setImportProgress(100);
      } else {
        // Generic batch insert
        for (let i = 0; i < validRows.length; i += batchSize) {
          const batch = validRows.slice(i, i + batchSize).map(row => {
            const obj: Record<string, any> = {};
            Object.entries(mapping).forEach(([field, col]) => {
              if (col && row[col]?.trim()) {
                let val: any = row[col].trim();
                // Type conversions
                if (["budget_min", "budget_max", "premium_amount", "price", "mrp", "ex_showroom", "on_road_price", "stock_quantity", "ncb_percentage"].includes(field)) {
                  val = parseFloat(val) || null;
                }
                if (["is_bestseller", "is_new", "is_hot", "is_featured"].includes(field)) {
                  val = val === "true" || val === "1" || val === "yes";
                }
                obj[field] = val;
              }
            });
            return obj;
          });

          const table = moduleConfig?.table || selectedModule;
          const { error } = await (supabase as any).from(table).insert(batch);
          if (error) {
            // Try one by one
            for (const row of batch) {
              const { error: e } = await (supabase as any).from(table).insert(row);
              if (e) failed++;
              else success++;
            }
          } else {
            success += batch.length;
          }

          setImportProgress(Math.round(((i + batchSize) / validRows.length) * 100));
        }
      }

      skipped = rawRows.length - validRows.length;
      setImportResult({ success, failed, skipped });
      setStep("done");
      toast.success(`Import complete: ${success} added, ${failed} failed, ${skipped} skipped`);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
      setImportResult({ success, failed: failed + (validRows.length - success), skipped: rawRows.length - validRows.length });
      setStep("done");
    } finally {
      setIsImporting(false);
    }
  };

  // ─── Reset ───
  const reset = () => {
    setStep("select");
    setSelectedModule("");
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setErrors([]);
    setImportResult(null);
    setImportProgress(0);
  };

  // ─── Download template ───
  const downloadTemplate = () => {
    const fields = MODULE_FIELDS[selectedModule];
    if (!fields) return;
    const allCols = [...fields.required, ...fields.optional];
    downloadCSVFile([allCols], `${selectedModule}_template.csv`);
    toast.success("Template downloaded!");
  };

  // ─── Render ───
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Smart Excel Upload
          </h1>
          <p className="text-sm text-muted-foreground">AI-powered bulk import with auto-mapping, validation & duplicate detection</p>
        </div>
        {step !== "select" && (
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />Start Over
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        {["select", "upload", "map", "validate", "import", "done"].map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === s ? "bg-primary text-primary-foreground" :
              ["select", "upload", "map", "validate", "import", "done"].indexOf(step) > i ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}>{i + 1}</div>
            <span className="hidden sm:inline capitalize">{s === "map" ? "Column Map" : s}</span>
            {i < 5 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select module */}
      {step === "select" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MODULES.map(mod => (
            <Card
              key={mod.id}
              className={`cursor-pointer transition-all hover:shadow-md border-2 ${selectedModule === mod.id ? "border-primary bg-primary/5" : "border-transparent"}`}
              onClick={() => { setSelectedModule(mod.id); setStep("upload"); }}
            >
              <CardContent className="p-4 text-center">
                <mod.icon className={`h-8 w-8 mx-auto mb-2 ${mod.color}`} />
                <p className="font-semibold text-sm">{mod.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{mod.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload {moduleConfig?.label} Data
            </CardTitle>
            <CardDescription>Supports CSV & Excel (.xlsx) • Drag & drop or browse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-primary/30 rounded-xl p-12 text-center hover:border-primary/60 transition-colors cursor-pointer"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-primary/50" />
              <p className="text-lg font-semibold text-foreground">Drop your file here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse • CSV, XLSX</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />Download Template
              </Button>
              <Button variant="ghost" onClick={() => setStep("select")}>Back</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Column Mapping */}
      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Column Mapping — {fileName}
              <Badge variant="secondary">{rawRows.length} rows</Badge>
            </CardTitle>
            <CardDescription>AI auto-mapped {Object.keys(mapping).length}/{allFields.length} fields. Adjust if needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allFields.map(field => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    {fields.required.includes(field) && <span className="text-destructive">*</span>}
                    {field.replace(/_/g, " ")}
                    {mapping[field] && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  </Label>
                  <Select value={mapping[field] || ""} onValueChange={v => setMapping(prev => ({ ...prev, [field]: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="— Not mapped —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Not mapped —</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                <Eye className="h-4 w-4 mr-1" />{showPreview ? "Hide" : "Show"} Preview
              </Button>
            </div>

            {showPreview && (
              <ScrollArea className="max-h-48 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-12">#</TableHead>
                      {headers.map(h => (
                        <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawRows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{i + 1}</TableCell>
                        {headers.map(h => (
                          <TableCell key={h} className="text-xs max-w-[120px] truncate">{row[h]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={skipDuplicates} onCheckedChange={setSkipDuplicates} />
                <Label className="text-sm">Skip duplicate phone numbers</Label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={runValidation}>
                <Shield className="h-4 w-4 mr-2" />Validate Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Validation */}
      {step === "validate" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {errors.length === 0 ? (
                <><CheckCircle2 className="h-5 w-5 text-green-500" />All Rows Valid</>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-yellow-500" />{errors.length} Issues Found</>
              )}
            </CardTitle>
            <CardDescription>
              {rawRows.length} total rows • {rawRows.length - new Set(errors.map(e => e.row)).size} valid • {new Set(errors.map(e => e.row)).size} with issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.length > 0 && (
              <ScrollArea className="max-h-48 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Row</TableHead>
                      <TableHead className="text-xs">Field</TableHead>
                      <TableHead className="text-xs">Issue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.slice(0, 50).map((err, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{err.row}</TableCell>
                        <TableCell className="text-xs"><Badge variant="outline">{err.field}</Badge></TableCell>
                        <TableCell className="text-xs text-destructive">{err.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setStep("map")}>Back to Mapping</Button>
              <Button onClick={runImport} disabled={rawRows.length - new Set(errors.map(e => e.row)).size === 0}>
                <Upload className="h-4 w-4 mr-2" />
                Import {rawRows.length - new Set(errors.map(e => e.row)).size} Valid Rows
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Importing */}
      {step === "import" && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <p className="text-lg font-semibold">Importing data...</p>
            <Progress value={importProgress} className="max-w-md mx-auto" />
            <p className="text-sm text-muted-foreground">{importProgress}% complete</p>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Done */}
      {step === "done" && importResult && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
            <h2 className="text-2xl font-bold">Import Complete!</h2>
            <div className="flex gap-6 justify-center text-sm">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{importResult.success}</p>
                <p className="text-muted-foreground">Added</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-500">{importResult.failed}</p>
                <p className="text-muted-foreground">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-500">{importResult.skipped}</p>
                <p className="text-muted-foreground">Skipped</p>
              </div>
            </div>
            <Button onClick={reset} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />Import More
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartExcelUpload;
