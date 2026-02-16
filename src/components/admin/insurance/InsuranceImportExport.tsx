import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle,
  Filter, Users, Calendar, MapPin, Building, DollarSign
} from "lucide-react";

const EXPORT_PRESETS = [
  { id: "all", label: "All Clients", icon: Users, description: "Complete client database" },
  { id: "expiring_30", label: "Expiring in 30 Days", icon: Calendar, description: "Policies expiring within 30 days" },
  { id: "hot_leads", label: "Hot Leads", icon: AlertTriangle, description: "New & quoted status leads" },
  { id: "high_premium", label: "High Premium (₹50k+)", icon: DollarSign, description: "Clients with premium above ₹50,000" },
  { id: "expired", label: "Expired Policies", icon: Calendar, description: "Lapsed policies for recovery" },
];

const CSV_FIELD_MAP: Record<string, string> = {
  "name": "customer_name", "customer name": "customer_name", "full name": "customer_name",
  "phone": "phone", "mobile": "phone", "mobile number": "phone", "contact": "phone",
  "email": "email", "email id": "email",
  "vehicle number": "vehicle_number", "reg number": "vehicle_number", "registration": "vehicle_number",
  "car model": "vehicle_model", "model": "vehicle_model", "vehicle model": "vehicle_model",
  "car brand": "vehicle_make", "make": "vehicle_make", "brand": "vehicle_make",
  "insurer": "current_insurer", "insurance company": "current_insurer",
  "policy type": "current_policy_type", "type": "current_policy_type",
  "premium": "premium_amount", "premium amount": "premium_amount",
  "expiry": "expiry_date", "expiry date": "expiry_date", "renewal date": "expiry_date",
  "city": "city",
  "source": "lead_source",
  "notes": "notes",
};

export function InsuranceImportExport() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; updated: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) throw new Error("CSV must have header + at least 1 row");

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
      const mappedHeaders = headers.map(h => CSV_FIELD_MAP[h] || h);

      let added = 0, updated = 0, errors = 0;

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
          const row: Record<string, string> = {};
          mappedHeaders.forEach((h, idx) => { if (values[idx]) row[h] = values[idx]; });

          if (!row.phone && !row.customer_name) { errors++; continue; }

          const phone = (row.phone || "").replace(/\D/g, "");
          if (!phone) { errors++; continue; }

          // Check existing
          const { data: existing } = await supabase
            .from("insurance_clients")
            .select("id")
            .eq("phone", phone)
            .limit(1);

          if (existing && existing.length > 0) {
            await supabase.from("insurance_clients").update({
              customer_name: row.customer_name || undefined,
              email: row.email || undefined,
              vehicle_number: row.vehicle_number || undefined,
              vehicle_make: row.vehicle_make || undefined,
              vehicle_model: row.vehicle_model || undefined,
              current_insurer: row.current_insurer || undefined,
              city: row.city || undefined,
              notes: row.notes || undefined,
            }).eq("id", existing[0].id);
            updated++;
          } else {
            await supabase.from("insurance_clients").insert({
              phone,
              customer_name: row.customer_name || null,
              email: row.email || null,
              vehicle_number: row.vehicle_number || null,
              vehicle_make: row.vehicle_make || null,
              vehicle_model: row.vehicle_model || null,
              current_insurer: row.current_insurer || null,
              current_policy_type: row.current_policy_type || null,
              city: row.city || null,
              lead_source: row.lead_source || "csv_import",
              notes: row.notes || null,
            });
            added++;
          }
        } catch {
          errors++;
        }
      }

      setImportResult({ added, updated, errors });
      toast.success(`Import complete: ${added} added, ${updated} updated`);
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleExport = async (preset: string) => {
    setExporting(true);
    try {
      let query = supabase
        .from("insurance_clients")
        .select("*, insurance_policies(policy_number, insurer, premium_amount, expiry_date, status, policy_type)") as any;
      query = query.order("created_at", { ascending: false });

      const now = new Date();

      if (preset === "expiring_30") {
        const d30 = new Date(now); d30.setDate(d30.getDate() + 30);
        // We'll filter post-fetch based on policy data
      } else if (preset === "hot_leads") {
        query = query.in("status", ["new", "quoted"]);
      } else if (preset === "high_premium") {
        // Filter post-fetch
      } else if (preset === "expired") {
        // Filter post-fetch
      }

      const { data, error } = await query.limit(5000);
      if (error) throw error;

      let rows = data || [];

      // Post-fetch filtering
      if (preset === "expiring_30") {
        const d30Str = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];
        const todayStr = now.toISOString().split("T")[0];
        rows = rows.filter((r: any) =>
          r.insurance_policies?.some((p: any) => p.expiry_date >= todayStr && p.expiry_date <= d30Str)
        );
      } else if (preset === "high_premium") {
        rows = rows.filter((r: any) =>
          r.insurance_policies?.some((p: any) => (p.premium_amount || 0) >= 50000)
        );
      } else if (preset === "expired") {
        const todayStr = now.toISOString().split("T")[0];
        rows = rows.filter((r: any) =>
          r.insurance_policies?.some((p: any) => p.expiry_date < todayStr)
        );
      }

      // Build CSV
      const csvHeaders = [
        "Name", "Phone", "Email", "City", "Vehicle Number", "Car Brand", "Car Model",
        "Insurer", "Policy Type", "Policy Number", "Premium", "Expiry Date", "Status", "Lead Source", "Notes"
      ];

      const csvRows = rows.map((r: any) => {
        const latestPolicy = r.insurance_policies?.[0];
        return [
          r.customer_name || "", r.phone || "", r.email || "", r.city || "",
          r.vehicle_number || "", r.vehicle_make || "", r.vehicle_model || "",
          latestPolicy?.insurer || r.current_insurer || "",
          latestPolicy?.policy_type || r.current_policy_type || "",
          latestPolicy?.policy_number || "",
          latestPolicy?.premium_amount || "",
          latestPolicy?.expiry_date || "",
          r.status || "",
          r.lead_source || "",
          (r.notes || "").replace(/,/g, ";"),
        ].map(v => `"${v}"`).join(",");
      });

      const csv = [csvHeaders.join(","), ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `insurance_${preset}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${rows.length} records`);
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Import Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Bulk Import
          </CardTitle>
          <CardDescription>
            Upload CSV with columns: Name, Phone, Email, Vehicle Number, Car Model, Insurer, City, etc. Fields are auto-mapped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 text-center">
              <FileSpreadsheet className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <Input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleImport}
                disabled={importing}
                className="max-w-xs mx-auto"
              />
              {importing && (
                <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Importing...
                </div>
              )}
            </div>
          </div>
          {importResult && (
            <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="text-sm">
                <span className="font-medium text-green-700">{importResult.added} added</span>
                {" • "}
                <span className="font-medium text-blue-700">{importResult.updated} updated</span>
                {importResult.errors > 0 && (
                  <>{" • "}<span className="font-medium text-red-600">{importResult.errors} errors</span></>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            Smart Export
          </CardTitle>
          <CardDescription>
            Export filtered data for calling teams and marketing campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {EXPORT_PRESETS.map(preset => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleExport(preset.id)}
                  disabled={exporting}
                  className="flex items-start gap-3 p-3 rounded-xl border hover:bg-muted/50 hover:border-primary/30 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{preset.label}</p>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
