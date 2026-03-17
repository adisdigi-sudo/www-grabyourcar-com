import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Upload, FileSpreadsheet, Globe, Code2, Loader2, CheckCircle2,
  AlertCircle, Download, Copy, RefreshCw, Clock, ArrowRight,
} from "lucide-react";

const LEAD_FIELDS = [
  "customer_name", "phone", "email", "source", "lead_type",
  "car_brand", "car_model", "city", "budget_min", "budget_max",
  "buying_timeline", "notes",
];

interface LeadImportManagerProps {
  verticalCategory?: string;
  verticalId?: string;
}

export const LeadImportManager = ({ verticalCategory, verticalId }: LeadImportManagerProps = {}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importSource, setImportSource] = useState("csv_upload");
  const [jsonInput, setJsonInput] = useState("");

  // Fetch import history
  const { data: importHistory } = useQuery({
    queryKey: ["leadImportHistory"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lead_imports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
  });

  // CSV parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        toast.error("CSV must have at least a header and one data row");
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
      setCsvHeaders(headers);

      // Auto-map fields
      const autoMap: Record<string, string> = {};
      headers.forEach(h => {
        const lower = h.toLowerCase().replace(/[^a-z]/g, "");
        if (lower.includes("name") && !lower.includes("car")) autoMap.customer_name = h;
        if (lower.includes("phone") || lower.includes("mobile") || lower.includes("contact")) autoMap.phone = h;
        if (lower.includes("email") || lower.includes("mail")) autoMap.email = h;
        if (lower.includes("source")) autoMap.source = h;
        if (lower.includes("brand")) autoMap.car_brand = h;
        if (lower.includes("model") || lower.includes("car")) autoMap.car_model = h;
        if (lower.includes("city") || lower.includes("location")) autoMap.city = h;
        if (lower.includes("note") || lower.includes("remark")) autoMap.notes = h;
      });
      setFieldMapping(autoMap);

      const rows = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ""; });
        return row;
      });

      setCsvData(rows);
      toast.success(`Parsed ${rows.length} rows from CSV`);
    };
    reader.readAsText(file);
  };

  // CSV import mutation
  const csvImportMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("lead-import", {
        body: {
          action: "csv-import",
          leads: csvData,
          source: importSource,
          fieldMapping,
          verticalId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Imported ${data.imported} leads (${data.skipped} skipped, ${data.failed} failed)`);
      setCsvData([]);
      setCsvHeaders([]);
      queryClient.invalidateQueries({ queryKey: ["leadImportHistory"] });
    },
    onError: (err: any) => toast.error(err.message || "Import failed"),
  });

  // API/JSON import
  const apiImportMutation = useMutation({
    mutationFn: async () => {
      let leads;
      try {
        leads = JSON.parse(jsonInput);
        if (!Array.isArray(leads)) leads = [leads];
      } catch {
        throw new Error("Invalid JSON format");
      }

      const { data, error } = await supabase.functions.invoke("lead-import", {
        body: { action: "api-push", leads, source: importSource },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Imported ${data.imported} leads`);
      setJsonInput("");
      queryClient.invalidateQueries({ queryKey: ["leadImportHistory"] });
    },
    onError: (err: any) => toast.error(err.message || "Import failed"),
  });

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lead-import`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-6 w-6 text-primary" />
          Lead Import & Integration
        </h1>
        <p className="text-muted-foreground text-sm">
          Import leads from CSV, API, or external portals like InsureBook
        </p>
      </div>

      <Tabs defaultValue="csv" className="space-y-4">
        <TabsList>
          <TabsTrigger value="csv"><FileSpreadsheet className="h-4 w-4 mr-1" /> CSV Upload</TabsTrigger>
          <TabsTrigger value="api"><Code2 className="h-4 w-4 mr-1" /> API / JSON</TabsTrigger>
          <TabsTrigger value="webhook"><Globe className="h-4 w-4 mr-1" /> Webhook</TabsTrigger>
          <TabsTrigger value="history"><Clock className="h-4 w-4 mr-1" /> History</TabsTrigger>
        </TabsList>

        {/* CSV Upload */}
        <TabsContent value="csv">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload CSV File</CardTitle>
              <CardDescription>
                Upload a CSV with columns: Name, Phone, Email, Source, Car Brand, Car Model, City, Notes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" /> Choose CSV File
                </Button>
              </div>

              {csvHeaders.length > 0 && (
                <>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Field Mapping</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Map your CSV columns to lead fields. Auto-detected mappings shown below.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {LEAD_FIELDS.map(field => (
                        <div key={field} className="flex items-center gap-2">
                          <Label className="text-xs w-28 shrink-0">{field}</Label>
                          <Select
                            value={fieldMapping[field] || ""}
                            onValueChange={(v) => setFieldMapping(prev => ({ ...prev, [field]: v }))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">-- Skip --</SelectItem>
                              {csvHeaders.map(h => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm font-medium">{csvData.length} rows ready to import</span>
                    <Button
                      onClick={() => csvImportMutation.mutate()}
                      disabled={csvImportMutation.isPending}
                      className="gap-2"
                    >
                      {csvImportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      Import Leads
                    </Button>
                  </div>

                  {/* Preview */}
                  <div className="border rounded-lg overflow-x-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted">
                          {csvHeaders.slice(0, 6).map(h => (
                            <th key={h} className="p-2 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t">
                            {csvHeaders.slice(0, 6).map(h => (
                              <td key={h} className="p-2 truncate max-w-[150px]">{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API / JSON */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paste JSON Data</CardTitle>
              <CardDescription>
                Paste lead data as JSON array. Supports fields: name, phone, email, source, car_brand, car_model, city
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">Source Name</Label>
                <Input
                  value={importSource}
                  onChange={(e) => setImportSource(e.target.value)}
                  placeholder="e.g. insurebook, cardekho"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">JSON Data</Label>
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`[\n  { "name": "Rahul Sharma", "phone": "9876543210", "car_model": "Swift", "city": "Delhi" },\n  { "name": "Priya Patel", "phone": "9123456789", "source": "insurebook" }\n]`}
                  className="mt-1 font-mono text-xs h-40"
                />
              </div>
              <Button
                onClick={() => apiImportMutation.mutate()}
                disabled={apiImportMutation.isPending || !jsonInput.trim()}
                className="gap-2"
              >
                {apiImportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Import from JSON
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook */}
        <TabsContent value="webhook">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Webhook / API Endpoint
              </CardTitle>
              <CardDescription>
                Send leads from InsureBook or any portal via this webhook URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Webhook URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      toast.success("Copied!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted space-y-3">
                <p className="text-sm font-medium">How to integrate:</p>
                <div className="text-xs font-mono bg-background p-3 rounded border overflow-x-auto">
                  <pre>{`POST ${webhookUrl}
Content-Type: application/json
Authorization: Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.slice(0, 20)}...

{
  "action": "webhook",
  "source": "insurebook",
  "leads": [
    {
      "name": "Customer Name",
      "phone": "9876543210",
      "email": "email@example.com",
      "car_brand": "Maruti",
      "car_model": "Swift",
      "city": "Mumbai",
      "notes": "Referred from InsureBook"
    }
  ]
}`}</pre>
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Share this endpoint with your InsureBook admin to auto-push leads. Duplicates (same phone) are automatically skipped.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  InsureBook Integration
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  In your InsureBook dashboard, go to Settings → Webhooks/API and add this URL.
                  When a new insurance lead is created, it will automatically appear in GrabYourCar.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import History</CardTitle>
            </CardHeader>
            <CardContent>
              {!importHistory?.length ? (
                <p className="text-center text-muted-foreground py-8">No imports yet</p>
              ) : (
                <div className="space-y-2">
                  {importHistory.map((imp: any) => (
                    <div key={imp.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">{imp.import_type}</Badge>
                        <div>
                          <p className="text-sm font-medium">{imp.source_name || "Unknown Source"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(imp.created_at).toLocaleDateString()} • {imp.total_rows} rows
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {imp.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : imp.status === "failed" ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        <div className="text-xs text-right">
                          <span className="text-green-600">{imp.imported} imported</span>
                          {imp.skipped > 0 && <span className="text-yellow-600 ml-2">{imp.skipped} skipped</span>}
                          {imp.failed > 0 && <span className="text-red-600 ml-2">{imp.failed} failed</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
