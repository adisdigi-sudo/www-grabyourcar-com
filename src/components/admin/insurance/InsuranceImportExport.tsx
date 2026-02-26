import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import {
  Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle,
  Users, Calendar, DollarSign, ShieldCheck, Eye, Mail, Lock, X, FileDown,
  UserPlus, FileText, ArrowRight, Info,
} from "lucide-react";

// ─── IMPORT TYPES ───
type ImportType = "client" | "insurance" | "client_insurance";

const IMPORT_TYPES: { id: ImportType; label: string; icon: any; desc: string }[] = [
  { id: "client", label: "Client Import", icon: UserPlus, desc: "Import client data from Excel/CSV" },
  { id: "insurance", label: "Insurance Import", icon: ShieldCheck, desc: "Import insurance/policy data from Excel" },
  { id: "client_insurance", label: "Client & Insurance Import", icon: FileText, desc: "Import combined client + insurance data" },
];

const CLIENT_TYPES = ["Individual", "Corporate"];
const POLICY_TYPES = ["Comprehensive", "Third Party", "Own Damage", "Standalone OD", "Bundled"];

// ─── Sample CSV Templates ───
const CLIENT_TEMPLATE_HEADERS = "customer_name,phone,email,city,state,vehicle_number,chassis_number,engine_number,vehicle_make,vehicle_model,vehicle_year,vehicle_fuel_type,date_of_birth,gender,pincode,notes";
const CLIENT_TEMPLATE_SAMPLE = '"John Doe","9876543210","john@email.com","Delhi","Delhi","DL01AB1234","CH123456","EN654321","Maruti","Swift","2022","Petrol","1990-05-15","Male","110001","New customer"';

const INSURANCE_TEMPLATE_HEADERS = "phone,policy_number,insurer,policy_type,premium_amount,net_premium,start_date,expiry_date,idv,ncb_discount,addon_premium,gst_amount,payment_mode,status";
const INSURANCE_TEMPLATE_SAMPLE = '"9876543210","POL-2024-001","ICICI Lombard","Comprehensive","15000","12500","2024-01-01","2025-01-01","450000","25","2000","2700","Online","active"';

const COMBINED_TEMPLATE_HEADERS = "customer_name,phone,email,city,vehicle_number,chassis_number,vehicle_make,vehicle_model,vehicle_year,policy_number,insurer,policy_type,premium_amount,start_date,expiry_date,idv,status";
const COMBINED_TEMPLATE_SAMPLE = '"John Doe","9876543210","john@email.com","Delhi","DL01AB1234","CH123456","Maruti","Swift","2022","POL-2024-001","ICICI Lombard","Comprehensive","15000","2024-01-01","2025-01-01","450000","active"';

// ─── EXPORT PRESETS ───
const EXPORT_PRESETS = [
  { id: "all", label: "All Clients", icon: Users, description: "Complete client database with policies", team: "All Teams" },
  { id: "expiring_30", label: "Expiring in 30 Days", icon: Calendar, description: "Urgent renewals for calling team", team: "Calling Team" },
  { id: "expiring_7", label: "Expiring in 7 Days", icon: AlertTriangle, description: "Critical renewals — immediate action", team: "Sales Support" },
  { id: "hot_leads", label: "Hot Leads", icon: AlertTriangle, description: "New & quoted leads for sales", team: "Sales Team" },
  { id: "high_premium", label: "High Premium (₹50K+)", icon: DollarSign, description: "VIP clients for relationship managers", team: "Sales Team" },
  { id: "expired", label: "Expired Policies", icon: Calendar, description: "Lapsed policies for recovery team", team: "Calling Team" },
  { id: "policies_only", label: "All Policies", icon: ShieldCheck, description: "Complete policy database export", team: "Operations" },
];

// ─── Flexible CSV Field Mapping (auto-detect any format) ───
const CSV_FIELD_MAP: Record<string, string> = {
  // Customer name variations
  "name": "customer_name", "customer name": "customer_name", "full name": "customer_name",
  "customer_name": "customer_name", "insured name": "customer_name", "insured_name": "customer_name",
  "proposer name": "customer_name", "proposer": "customer_name", "client name": "customer_name",
  "holder name": "customer_name", "policy holder": "customer_name", "policyholder": "customer_name",
  "owner name": "customer_name", "owner": "customer_name", "party name": "customer_name",
  // Phone
  "phone": "phone", "mobile": "phone", "mobile number": "phone", "contact": "phone",
  "contact number": "phone", "phone number": "phone", "mobile no": "phone", "mob": "phone",
  "cell": "phone", "telephone": "phone", "whatsapp": "phone", "contact no": "phone",
  // Email
  "email": "email", "email id": "email", "email address": "email", "e-mail": "email",
  // Vehicle
  "vehicle number": "vehicle_number", "reg number": "vehicle_number", "registration": "vehicle_number",
  "vehicle_number": "vehicle_number", "registration number": "vehicle_number", "reg no": "vehicle_number",
  "vehicle reg": "vehicle_number", "vehicle registration": "vehicle_number", "rto number": "vehicle_number",
  // Vehicle details
  "car model": "vehicle_model", "model": "vehicle_model", "vehicle model": "vehicle_model",
  "vehicle_model": "vehicle_model", "car name": "vehicle_model",
  "car brand": "vehicle_make", "make": "vehicle_make", "brand": "vehicle_make",
  "vehicle_make": "vehicle_make", "vehicle make": "vehicle_make", "manufacturer": "vehicle_make",
  "oem": "vehicle_make", "company": "vehicle_make",
  "vehicle_year": "vehicle_year", "year": "vehicle_year", "vehicle year": "vehicle_year",
  "year of manufacture": "vehicle_year", "mfg year": "vehicle_year", "manufacturing year": "vehicle_year",
  "vehicle_fuel_type": "vehicle_fuel_type", "fuel type": "vehicle_fuel_type", "fuel": "vehicle_fuel_type",
  // Product/type
  "product": "notes", "product type": "notes", "vehicle type": "notes",
  "category": "notes", "segment": "notes",
  // Insurer
  "insurer": "insurer", "insurance company": "insurer", "insurer name": "insurer",
  "ic name": "insurer", "ic": "insurer", "underwriter": "insurer", "company name": "insurer",
  // Policy
  "policy type": "policy_type", "type": "policy_type", "policy_type": "policy_type",
  "plan name": "policy_type", "plan": "policy_type", "cover type": "policy_type",
  "plan type": "policy_type", "coverage type": "policy_type", "product name": "policy_type",
  // Premium
  "premium": "premium_amount", "premium amount": "premium_amount", "premium_amount": "premium_amount",
  "total premium": "premium_amount", "gross premium": "premium_amount",
  "net premium": "net_premium", "net_premium": "net_premium", "od premium": "net_premium",
  // Sum insured / IDV
  "sum insured": "idv", "sum_insured": "idv", "idv": "idv", "idv amount": "idv",
  "insured value": "idv", "si": "idv", "cover amount": "idv",
  // Dates
  "expiry": "expiry_date", "expiry date": "expiry_date", "renewal date": "expiry_date",
  "expiry_date": "expiry_date", "policy end date": "expiry_date", "end date": "expiry_date",
  "valid till": "expiry_date", "valid upto": "expiry_date", "due date": "expiry_date",
  "start date": "start_date", "start_date": "start_date", "policy start date": "start_date",
  "inception date": "start_date", "commencement date": "start_date", "risk start date": "start_date",
  "booking date": "start_date", "booking_date": "start_date", "issue date": "start_date",
  "issuance date": "start_date", "policy date": "start_date",
  // Policy number
  "policy number": "policy_number", "policy_number": "policy_number", "policy no": "policy_number",
  "certificate number": "policy_number", "certificate no": "policy_number", "covernote number": "policy_number",
  "covernote no": "policy_number",
  // Lead ID
  "lead id": "external_lead_id", "lead_id": "external_lead_id", "leadid": "external_lead_id",
  "reference id": "external_lead_id", "ref id": "external_lead_id", "reference number": "external_lead_id",
  "proposal number": "external_lead_id", "proposal no": "external_lead_id",
  // NCB
  "ncb": "ncb_discount", "ncb_discount": "ncb_discount", "ncb discount": "ncb_discount",
  "ncb percentage": "ncb_discount", "ncb%": "ncb_discount", "no claim bonus": "ncb_discount",
  // Addon
  "addon premium": "addon_premium", "addon_premium": "addon_premium", "add on premium": "addon_premium",
  // GST
  "gst": "gst_amount", "gst_amount": "gst_amount", "gst amount": "gst_amount", "tax": "gst_amount",
  // Payment
  "payment mode": "payment_mode", "payment_mode": "payment_mode", "mode of payment": "payment_mode",
  // Location
  "city": "city", "state": "state", "pincode": "pincode", "pin code": "pincode", "zip": "pincode",
  "area": "city", "location": "city",
  // Chassis/Engine
  "chassis number": "chassis_number", "chassis_number": "chassis_number", "chassis": "chassis_number",
  "chassis no": "chassis_number",
  "engine number": "engine_number", "engine_number": "engine_number", "engine no": "engine_number",
  // DOB
  "date of birth": "date_of_birth", "date_of_birth": "date_of_birth", "dob": "date_of_birth",
  "birth date": "date_of_birth",
  // Gender
  "gender": "gender", "sex": "gender",
  // Source
  "source": "lead_source", "lead_source": "lead_source", "lead source": "lead_source",
  "channel": "lead_source", "medium": "lead_source",
  // Notes & status
  "notes": "notes", "remarks": "notes", "comment": "notes", "comments": "notes",
  "status": "status", "policy status": "status", "lead status": "status",
  // Commission
  "commission": "commission", "commission amount": "commission", "payout": "commission",
  "brokerage": "commission",
  // TP premium
  "tp premium": "tp_premium", "tp_premium": "tp_premium", "third party premium": "tp_premium",
};

// ─── Quote-aware CSV line parser ───
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === "," || char === "\t" || char === ";") && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

// ─── Normalize header for matching ───
function normalizeHeader(h: string): string {
  return h.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

// ─── Detect delimiter ───
function detectDelimiter(lines: string[]): string {
  const sample = lines.slice(0, 5).join("\n");
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0 };
  for (const char of sample) {
    if (char in counts) counts[char]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ─── Parse localized number ───
function parseLocalizedNumber(value: string): number {
  if (!value) return 0;
  let str = String(value).trim().replace(/[₹$€£¥\s,]/g, "");
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

// ─── Parse flexible date ───
function parseFlexibleDate(value: any): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  
  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split("T")[0];
  
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  
  // YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Try Date constructor as fallback
  const d = new Date(str);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
    return d.toISOString().split("T")[0];
  }
  
  return null;
}

// ─── Main Component ───
export function InsuranceImportExport() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Import & Export Center
        </h3>
        <p className="text-xs text-muted-foreground">
          Bulk import clients & policies, export filtered data with admin approval
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList>
          <TabsTrigger value="import" className="gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" /> Import Data
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Export Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import"><ImportWizard /></TabsContent>
        <TabsContent value="export"><ExportWithApproval /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════
// IMPORT WIZARD — 3-Step Process
// ═══════════════════════════════════════
function ImportWizard() {
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [subType, setSubType] = useState(""); // e.g. Individual/Corporate or policy type
  const [step, setStep] = useState(1);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [mappedHeaders, setMappedHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; updated: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    let headers = "", sample = "", filename = "";
    if (importType === "client") {
      headers = CLIENT_TEMPLATE_HEADERS;
      sample = CLIENT_TEMPLATE_SAMPLE;
      filename = "client_import_template.csv";
    } else if (importType === "insurance") {
      headers = INSURANCE_TEMPLATE_HEADERS;
      sample = INSURANCE_TEMPLATE_SAMPLE;
      filename = "insurance_import_template.csv";
    } else {
      headers = COMBINED_TEMPLATE_HEADERS;
      sample = COMBINED_TEMPLATE_SAMPLE;
      filename = "client_insurance_import_template.csv";
    }
    const csv = `${headers}\n${sample}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error("File must have header + at least 1 data row");

      // Auto-detect delimiter
      const delimiter = detectDelimiter(lines);
      
      // Parse header row
      const rawHeaders = parseCSVLine(lines[0]);
      const normalizedHeaders = rawHeaders.map(normalizeHeader);
      
      // Map headers using flexible matching
      const mapped = normalizedHeaders.map(h => {
        // Exact match
        if (CSV_FIELD_MAP[h]) return CSV_FIELD_MAP[h];
        // Starts-with match
        for (const [key, val] of Object.entries(CSV_FIELD_MAP)) {
          if (h.startsWith(key) || key.startsWith(h)) return val;
        }
        // Contains match
        for (const [key, val] of Object.entries(CSV_FIELD_MAP)) {
          if (h.includes(key) || key.includes(h)) return val;
        }
        // Keep original (will be ignored during import but shown in preview)
        return h;
      });
      setMappedHeaders(mapped);

      // Parse data rows
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        mapped.forEach((h, idx) => {
          if (values[idx] && values[idx].trim()) row[h] = values[idx].trim();
        });
        // Also store raw headers for preview
        rawHeaders.forEach((h, idx) => {
          if (values[idx] && values[idx].trim()) row["__raw_" + h.trim()] = values[idx].trim();
        });
        if (Object.keys(row).filter(k => !k.startsWith("__raw_")).length > 0) {
          rows.push(row);
        }
      }
      
      setParsedRows(rows);
      setStep(3);
      toast.success(`Parsed ${rows.length} rows from ${rawHeaders.length} columns`);
    } catch (e: any) {
      toast.error(e.message || "Failed to parse file");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const executeImport = async () => {
    setImporting(true);
    setImportResult(null);
    let added = 0, updated = 0, errors = 0;

    // Auto-detect what data we have
    const hasClientFields = mappedHeaders.some(h => ["customer_name", "email", "vehicle_number", "vehicle_make", "vehicle_model"].includes(h));
    const hasPolicyFields = mappedHeaders.some(h => ["policy_number", "insurer", "policy_type", "premium_amount", "idv", "expiry_date"].includes(h));
    const detectedType = importType || (hasClientFields && hasPolicyFields ? "client_insurance" : hasClientFields ? "client" : hasPolicyFields ? "client_insurance" : "client_insurance");

    try {
      for (const row of parsedRows) {
        try {
          // Try to extract phone - look in phone field first
          let phone = (row.phone || "").replace(/\D/g, "");
          if (phone.length > 10) phone = phone.slice(-10);
          
          // If no phone found in mapped field, scan non-ID/financial fields for phone-like patterns
          if (!phone || phone.length < 10) {
            const skipFields = new Set([
              "external_lead_id", "policy_number", "idv", "premium_amount", "net_premium",
              "gst_amount", "addon_premium", "ncb_discount", "vehicle_year", "pincode",
              "commission", "tp_premium", "chassis_number", "engine_number", "customer_name",
              "insurer", "vehicle_number", "vehicle_model", "vehicle_make", "policy_type",
              "notes", "email", "status", "payment_mode", "lead_source", "city", "state",
              "gender", "date_of_birth", "start_date", "expiry_date",
            ]);
            for (const [key, val] of Object.entries(row)) {
              if (key.startsWith("__raw_") || skipFields.has(key)) continue;
              const strVal = String(val).replace(/\D/g, "");
              // Only match pure 10-digit numbers (not IDs that happen to be 10 digits)
              if (strVal.length === 10 && /^[6-9]\d{9}$/.test(strVal)) {
                phone = strVal;
                break;
              }
            }
          }

          // Create client name from available data
          const customerName = row.customer_name || "Unknown";

          if (detectedType === "client" || detectedType === "client_insurance") {
            // Try to find existing client
            let clientId: string | null = null;
            
            if (phone && phone.length >= 10) {
              const { data: existing } = await supabase
                .from("insurance_clients")
                .select("id")
                .eq("phone", phone)
                .limit(1);

              if (existing && existing.length > 0) {
                clientId = existing[0].id;
                const updateData: Record<string, any> = {};
                if (row.customer_name) updateData.customer_name = row.customer_name;
                if (row.email) updateData.email = row.email;
                if (row.vehicle_number) updateData.vehicle_number = row.vehicle_number;
                if (row.vehicle_make) updateData.vehicle_make = row.vehicle_make;
                if (row.vehicle_model) updateData.vehicle_model = row.vehicle_model;
                if (row.vehicle_year) updateData.vehicle_year = parseInt(row.vehicle_year);
                if (row.vehicle_fuel_type) updateData.vehicle_fuel_type = row.vehicle_fuel_type;
                // vehicle_category not in schema, skip
                if (row.chassis_number) updateData.chassis_number = row.chassis_number;
                if (row.engine_number) updateData.engine_number = row.engine_number;
                if (row.insurer) updateData.current_insurer = row.insurer;
                if (row.policy_type) updateData.current_policy_type = row.policy_type;
                if (row.city) updateData.city = row.city;
                if (row.state) updateData.state = row.state;
                if (row.pincode) updateData.pincode = row.pincode;
                if (row.date_of_birth) updateData.date_of_birth = parseFlexibleDate(row.date_of_birth);
                if (row.gender) updateData.gender = row.gender;
                if (row.notes) updateData.notes = row.notes;

                if (Object.keys(updateData).length > 0) {
                  await supabase.from("insurance_clients").update(updateData as any).eq("id", clientId);
                }
                updated++;
              }
            }

            if (!clientId) {
              // Create new client - phone is preferred but not strictly required
              const insertData: Record<string, any> = {
                customer_name: customerName,
                phone: phone && phone.length >= 10 ? phone : `NOPHONE_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                email: row.email || null,
                vehicle_number: row.vehicle_number || null,
                vehicle_make: row.vehicle_make || null,
                vehicle_model: row.vehicle_model || null,
                vehicle_year: row.vehicle_year ? parseInt(row.vehicle_year) : null,
                vehicle_fuel_type: row.vehicle_fuel_type || null,
                chassis_number: row.chassis_number || null,
                engine_number: row.engine_number || null,
                current_insurer: row.insurer || null,
                current_policy_type: row.policy_type || subType || null,
                city: row.city || null,
                state: row.state || null,
                pincode: row.pincode || null,
                date_of_birth: row.date_of_birth ? parseFlexibleDate(row.date_of_birth) : null,
                gender: row.gender || null,
                lead_source: row.lead_source || "csv_import",
                notes: row.notes || null,
              };

              const { data: newClient, error } = await supabase.from("insurance_clients")
                .insert(insertData as any).select("id").maybeSingle();
              if (error || !newClient) { errors++; continue; }
              clientId = newClient.id;
              added++;
            }

            // Create policy if we have policy data
            if (hasPolicyFields && clientId && (row.policy_number || row.insurer || row.premium_amount || row.idv)) {
              await supabase.from("insurance_policies").insert({
                client_id: clientId,
                policy_number: row.policy_number || null,
                insurer: row.insurer || "Unknown",
                policy_type: row.policy_type || subType || "Comprehensive",
                premium_amount: row.premium_amount ? parseLocalizedNumber(row.premium_amount) : null,
                net_premium: row.net_premium ? parseLocalizedNumber(row.net_premium) : null,
                start_date: row.start_date ? parseFlexibleDate(row.start_date) : new Date().toISOString().split("T")[0],
                expiry_date: row.expiry_date ? parseFlexibleDate(row.expiry_date) : null,
                idv: row.idv ? parseLocalizedNumber(row.idv) : null,
                ncb_discount: row.ncb_discount ? parseLocalizedNumber(row.ncb_discount) : null,
                addon_premium: row.addon_premium ? parseLocalizedNumber(row.addon_premium) : null,
                gst_amount: row.gst_amount ? parseLocalizedNumber(row.gst_amount) : null,
                payment_mode: row.payment_mode || null,
                status: row.status || "active",
              });
            }
          } else if (detectedType === "insurance") {
            if (!phone || phone.length < 10) { errors++; continue; }
            const { data: client } = await supabase
              .from("insurance_clients")
              .select("id")
              .eq("phone", phone)
              .limit(1);

            if (!client || !client.length) {
              // Auto-create client for insurance-only import
              const { data: newClient } = await supabase.from("insurance_clients")
                .insert({
                  phone,
                  customer_name: customerName,
                  current_insurer: row.insurer || null,
                  lead_source: "csv_import",
                }).select("id").maybeSingle();
              
              if (!newClient) { errors++; continue; }

              await supabase.from("insurance_policies").insert({
                client_id: newClient.id,
                policy_number: row.policy_number || null,
                insurer: row.insurer || "Unknown",
                policy_type: row.policy_type || subType || "Comprehensive",
                premium_amount: row.premium_amount ? parseLocalizedNumber(row.premium_amount) : null,
                net_premium: row.net_premium ? parseLocalizedNumber(row.net_premium) : null,
                start_date: row.start_date ? parseFlexibleDate(row.start_date) : new Date().toISOString().split("T")[0],
                expiry_date: row.expiry_date ? parseFlexibleDate(row.expiry_date) : null,
                idv: row.idv ? parseLocalizedNumber(row.idv) : null,
                ncb_discount: row.ncb_discount ? parseLocalizedNumber(row.ncb_discount) : null,
                status: row.status || "active",
              });
              added++;
            } else {
              await supabase.from("insurance_policies").insert({
                client_id: client[0].id,
                policy_number: row.policy_number || null,
                insurer: row.insurer || "Unknown",
                policy_type: row.policy_type || subType || "Comprehensive",
                premium_amount: row.premium_amount ? parseLocalizedNumber(row.premium_amount) : null,
                net_premium: row.net_premium ? parseLocalizedNumber(row.net_premium) : null,
                start_date: row.start_date ? parseFlexibleDate(row.start_date) : new Date().toISOString().split("T")[0],
                expiry_date: row.expiry_date ? parseFlexibleDate(row.expiry_date) : null,
                idv: row.idv ? parseLocalizedNumber(row.idv) : null,
                ncb_discount: row.ncb_discount ? parseLocalizedNumber(row.ncb_discount) : null,
                status: row.status || "active",
              });
              added++;
            }
          }
        } catch (rowErr: any) {
          console.error("Import row error:", rowErr?.message || rowErr, "Row data:", JSON.stringify(row).slice(0, 200));
          errors++;
        }
      }

      setImportResult({ added, updated, errors });
      if (added > 0 || updated > 0) {
        toast.success(`Import complete: ${added} added, ${updated} updated${errors > 0 ? `, ${errors} skipped` : ""}`);
      } else {
        toast.error(`Import had ${errors} errors — check data format`);
      }
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setImportType(null);
    setSubType("");
    setStep(1);
    setParsedRows([]);
    setMappedHeaders([]);
    setImportResult(null);
  };

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {[
          { n: 1, label: "Select Type" },
          { n: 2, label: "Upload File" },
          { n: 3, label: "Preview" },
        ].map((s, idx) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {s.n}
            </div>
            <span className={`text-xs font-medium ${step >= s.n ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            {idx < 2 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Type */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              Select Import Type & Download Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {IMPORT_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setImportType(t.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${importType === t.id ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30"}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {importType && (
              <div className="space-y-3 mt-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label className="text-xs font-medium">
                      {importType === "client" ? "Client Type (optional)" : "Policy Type (optional)"}
                    </Label>
                    <Select value={subType} onValueChange={setSubType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Auto-detect from file..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(importType === "client" ? CLIENT_TYPES : POLICY_TYPES).map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={downloadTemplate} variant="secondary" className="gap-1.5">
                    <FileDown className="h-4 w-4" /> Download Sample CSV
                  </Button>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
                  <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium">Smart Import</p>
                    <p className="text-xs text-muted-foreground">
                      Upload any CSV/Excel — columns are auto-detected regardless of header names. No fixed format required.
                    </p>
                  </div>
                </div>

                <Button onClick={() => setStep(2)} className="gap-1.5">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload File */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
              Upload Completed Excel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:bg-primary/5 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">Supported formats: .xlsx, .xls, .csv (Max 10MB)</p>
              <Button className="mt-3 gap-1.5">Choose File</Button>
              <Input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep(1)} size="sm">← Back</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview & Import */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              Preview & Import — {parsedRows.length} rows
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Detected columns summary */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs font-medium text-muted-foreground mr-1">Detected:</span>
              {mappedHeaders.filter(h => ["customer_name","phone","email","insurer","policy_type","premium_amount","idv","expiry_date","start_date","policy_number","vehicle_number","vehicle_make","vehicle_model","city","chassis_number","date_of_birth","ncb_discount"].includes(h)).map(h => (
                <Badge key={h} variant="secondary" className="text-[10px]">{h.replace(/_/g, " ")}</Badge>
              ))}
            </div>
            {/* Preview Table */}
            <div className="border rounded-lg overflow-auto max-h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 text-xs">#</TableHead>
                    {mappedHeaders.slice(0, 8).map((h) => (
                      <TableHead key={h} className="text-xs capitalize">{h.replace(/_/g, " ")}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      {mappedHeaders.slice(0, 8).map((h) => (
                        <TableCell key={h} className="text-xs">{row[h] || "—"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedRows.length > 10 && (
              <p className="text-xs text-muted-foreground">Showing 10 of {parsedRows.length} rows</p>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div className="text-sm">
                  <span className="font-medium text-green-700">{importResult.added} added</span>
                  {" • "}
                  <span className="font-medium text-blue-700">{importResult.updated} updated</span>
                  {importResult.errors > 0 && (
                    <>{" • "}<span className="font-medium text-destructive">{importResult.errors} errors</span></>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} size="sm">← Back</Button>
              <Button
                onClick={executeImport}
                disabled={importing || !!importResult}
                className="gap-1.5"
              >
                {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</> : <><Upload className="h-4 w-4" /> Import {parsedRows.length} Rows</>}
              </Button>
              {importResult && (
                <Button variant="outline" onClick={reset} size="sm">Import More</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// EXPORT WITH OTP APPROVAL
// ═══════════════════════════════════════
function ExportWithApproval() {
  const [exporting, setExporting] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [pendingExport, setPendingExport] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const requestExport = async (presetId: string) => {
    setPendingExport(presetId);
    setShowOTP(true);
    setOtp("");
    setOtpSent(false);

    // Send OTP via email to super admin
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("No email associated with your account");
        return;
      }

      // Generate OTP and store
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from("admin_otps").insert({
        user_id: user.id,
        email: user.email,
        otp_code: otpCode,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      // Send via email
      await supabase.functions.invoke("send-email", {
        body: {
          to: user.email,
          subject: "Export Approval OTP — GrabYourCar Insurance",
          html: `<div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:24px">
            <h2 style="color:#1e40af">🔐 Export Approval</h2>
            <p>Your OTP for data export is:</p>
            <div style="background:#f3f4f6;padding:16px;border-radius:8px;text-align:center;font-size:28px;font-weight:bold;letter-spacing:8px;color:#1e40af">${otpCode}</div>
            <p style="font-size:12px;color:#6b7280;margin-top:12px">Valid for 5 minutes. Do not share this code.</p>
          </div>`,
        },
      });

      setOtpSent(true);
      toast.success("OTP sent to your email");
    } catch (e: any) {
      toast.error("Failed to send OTP: " + (e.message || ""));
    }
  };

  const verifyAndExport = async () => {
    if (otp.length !== 6) { toast.error("Enter 6-digit OTP"); return; }
    setVerifying(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: otpRecord } = await supabase
        .from("admin_otps")
        .select("*")
        .eq("user_id", user.id)
        .eq("otp_code", otp)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (!otpRecord || otpRecord.length === 0) {
        toast.error("Invalid or expired OTP");
        setVerifying(false);
        return;
      }

      // Mark OTP as used
      await supabase.from("admin_otps").update({ verified: true }).eq("id", otpRecord[0].id);

      // Proceed with export
      await executeExport(pendingExport!);
      setShowOTP(false);
      setPendingExport(null);
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const executeExport = async (preset: string) => {
    setExporting(true);
    try {
      const now = new Date();

      if (preset === "policies_only") {
        const { data, error } = await supabase
          .from("insurance_policies")
          .select("*, insurance_clients(customer_name, phone, email, vehicle_number)")
          .order("created_at", { ascending: false })
          .limit(5000);
        if (error) throw error;

        const headers = ["Policy Number", "Insurer", "Type", "Premium", "Net Premium", "IDV", "Start Date", "Expiry Date", "Status", "Client Name", "Phone", "Email", "Vehicle"];
        const rows = (data || []).map((p: any) => [
          p.policy_number, p.insurer, p.policy_type, p.premium_amount, p.net_premium, p.idv,
          p.start_date, p.expiry_date, p.status,
          p.insurance_clients?.customer_name, p.insurance_clients?.phone, p.insurance_clients?.email, p.insurance_clients?.vehicle_number,
        ].map(v => `"${v || ""}"`).join(","));

        downloadCSV(headers.join(","), rows, `policies_export_${now.toISOString().split("T")[0]}`);
        toast.success(`Exported ${rows.length} policies`);
      } else {
        let query = supabase
          .from("insurance_clients")
          .select("*, insurance_policies(policy_number, insurer, premium_amount, expiry_date, status, policy_type)") as any;
        query = query.order("created_at", { ascending: false });

        if (preset === "hot_leads") {
          query = query.in("lead_status", ["new", "quoted", "contacted"]);
        }

        const { data, error } = await query.limit(5000);
        if (error) throw error;
        let rows = data || [];

        if (preset === "expiring_30" || preset === "expiring_7") {
          const days = preset === "expiring_7" ? 7 : 30;
          const target = new Date(now.getTime() + days * 86400000).toISOString().split("T")[0];
          const today = now.toISOString().split("T")[0];
          rows = rows.filter((r: any) =>
            r.insurance_policies?.some((p: any) => p.expiry_date >= today && p.expiry_date <= target)
          );
        } else if (preset === "high_premium") {
          rows = rows.filter((r: any) =>
            r.insurance_policies?.some((p: any) => (p.premium_amount || 0) >= 50000)
          );
        } else if (preset === "expired") {
          const today = now.toISOString().split("T")[0];
          rows = rows.filter((r: any) =>
            r.insurance_policies?.some((p: any) => p.expiry_date < today)
          );
        }

        const headers = ["Name", "Phone", "Email", "City", "Vehicle Number", "Vehicle Make", "Vehicle Model", "Insurer", "Policy Type", "Policy Number", "Premium", "Expiry Date", "Status", "Lead Source", "Notes"];
        const csvRows = rows.map((r: any) => {
          const lp = r.insurance_policies?.[0];
          return [
            r.customer_name, r.phone, r.email, r.city, r.vehicle_number, r.vehicle_make, r.vehicle_model,
            lp?.insurer || r.current_insurer, lp?.policy_type || r.current_policy_type,
            lp?.policy_number, lp?.premium_amount, lp?.expiry_date, r.lead_status || lp?.status,
            r.lead_source, (r.notes || "").replace(/,/g, ";"),
          ].map(v => `"${v || ""}"`).join(",");
        });

        downloadCSV(headers.join(","), csvRows, `insurance_${preset}_${now.toISOString().split("T")[0]}`);
        toast.success(`Exported ${csvRows.length} records`);
      }
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const downloadCSV = (headers: string, rows: string[], filename: string) => {
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <Lock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Admin Approval Required</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            All data exports require OTP verification sent to your registered email for security. This protects sensitive client and policy data.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {EXPORT_PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              onClick={() => requestExport(preset.id)}
              disabled={exporting}
              className="flex items-start gap-3 p-4 rounded-xl border hover:bg-muted/50 hover:border-primary/30 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{preset.label}</p>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
                <Badge variant="secondary" className="text-[9px] mt-1">{preset.team}</Badge>
              </div>
            </button>
          );
        })}
      </div>

      {/* OTP Dialog */}
      <Dialog open={showOTP} onOpenChange={setShowOTP}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Export Approval
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            {otpSent ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit OTP sent to your email
                </p>
                <div className="flex justify-center">
                  <InputOTP value={otp} onChange={setOtp} maxLength={6}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button onClick={verifyAndExport} disabled={verifying || otp.length !== 6} className="w-full gap-1.5">
                  {verifying ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><CheckCircle2 className="h-4 w-4" /> Verify & Export</>}
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">Sending OTP...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
