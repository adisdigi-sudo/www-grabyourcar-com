import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Upload, Sparkles, Loader2, CheckCircle2, AlertTriangle, Save, Eye, FileText,
  UserPlus, Calendar, Bell, Filter, Search, Phone, Mail, Car, Shield,
  Download, RefreshCw, Clock
} from "lucide-react";

interface ExtractedData {
  customer_name?: string | null;
  phone?: string | null;
  email?: string | null;
  vehicle_number?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  insurer?: string | null;
  policy_number?: string | null;
  policy_type?: string | null;
  idv?: number | null;
  premium_amount?: number | null;
  add_ons?: string[] | null;
  start_date?: string | null;
  expiry_date?: string | null;
  ncb_percentage?: number | null;
  engine_number?: string | null;
  chassis_number?: string | null;
  previous_insurer?: string | null;
  claim_history?: string | null;
}

interface Confidence {
  [key: string]: number;
}

interface SavedPolicy {
  id: string;
  client_id: string;
  policy_number: string | null;
  insurer: string | null;
  policy_type: string | null;
  premium_amount: number | null;
  expiry_date: string | null;
  start_date: string | null;
  status: string | null;
  created_at: string;
  insurance_clients?: {
    customer_name: string | null;
    phone: string;
    vehicle_number: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
  };
}

const FIELD_LABELS: Record<string, string> = {
  customer_name: "Customer Name",
  phone: "Phone",
  email: "Email",
  vehicle_number: "Vehicle Number",
  vehicle_make: "Car Brand",
  vehicle_model: "Car Model",
  vehicle_year: "Year",
  insurer: "Insurer",
  policy_number: "Policy Number",
  policy_type: "Policy Type",
  idv: "IDV (₹)",
  premium_amount: "Premium (₹)",
  add_ons: "Add-ons",
  start_date: "Start Date",
  expiry_date: "Expiry Date",
  ncb_percentage: "NCB %",
  engine_number: "Engine No.",
  chassis_number: "Chassis No.",
  previous_insurer: "Previous Insurer",
  claim_history: "Claim History",
};

export function InsuranceSmartExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [confidence, setConfidence] = useState<Confidence>({});
  const [editData, setEditData] = useState<ExtractedData>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("extract");

  // Saved policies list with filtering
  const [policies, setPolicies] = useState<SavedPolicy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [filterExpiry, setFilterExpiry] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setExtracted(null);
    setConfidence({});
    setSavedSuccess(false);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setSavedSuccess(false);

    try {
      // Convert file to base64 directly (avoid storage upload issues)
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const end = Math.min(i + chunkSize, bytes.length);
        for (let j = i; j < end; j++) {
          binary += String.fromCharCode(bytes[j]);
        }
      }
      const base64 = btoa(binary);

      // Call extraction edge function with base64 directly
      const { data, error } = await supabase.functions.invoke("extract-policy-data", {
        body: { file_base64: base64, mime_type: file.type },
      });

      if (error) throw new Error(error.message || "Extraction failed");
      if (!data?.success) throw new Error(data?.error || "Extraction failed");

      setExtracted(data.extracted);
      setConfidence(data.confidence || {});
      setEditData(data.extracted);
      toast.success("✅ Policy data extracted successfully! Review & save below.");
    } catch (e: any) {
      console.error("Extraction error:", e);
      toast.error(e.message || "Failed to extract data. Try a clearer image/PDF.");
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveAsLead = async () => {
    if (!editData) return;
    setSaving(true);

    try {
      const phone = editData.phone?.replace(/\D/g, "") || "";
      let clientId: string | null = null;

      if (phone && phone.length >= 10) {
        const { data: existing } = await supabase
          .from("insurance_clients")
          .select("id")
          .eq("phone", phone)
          .limit(1);

        if (existing && existing.length > 0) {
          clientId = existing[0].id;
          await supabase.from("insurance_clients").update({
            customer_name: editData.customer_name || undefined,
            email: editData.email || undefined,
            vehicle_number: editData.vehicle_number || undefined,
            vehicle_make: editData.vehicle_make || undefined,
            vehicle_model: editData.vehicle_model || undefined,
            current_insurer: editData.insurer || undefined,
            current_policy_type: editData.policy_type || undefined,
          }).eq("id", clientId);
        } else {
          const { data: newClient } = await supabase.from("insurance_clients").insert({
            phone,
            customer_name: editData.customer_name || null,
            email: editData.email || null,
            vehicle_number: editData.vehicle_number || null,
            vehicle_make: editData.vehicle_make || null,
            vehicle_model: editData.vehicle_model || null,
            current_insurer: editData.insurer || null,
            current_policy_type: editData.policy_type || null,
            lead_source: "ai_extractor",
          }).select("id").single();
          clientId = newClient?.id || null;
        }
      } else {
        const { data: newClient } = await supabase.from("insurance_clients").insert({
          phone: `unknown_${Date.now()}`,
          customer_name: editData.customer_name || "Unknown",
          vehicle_number: editData.vehicle_number || null,
          vehicle_make: editData.vehicle_make || null,
          vehicle_model: editData.vehicle_model || null,
          current_insurer: editData.insurer || null,
          lead_source: "ai_extractor",
        }).select("id").single();
        clientId = newClient?.id || null;
      }

      if (!clientId) throw new Error("Failed to create/find client");

      // Create policy record
      await supabase.from("insurance_policies").insert({
        client_id: clientId,
        policy_number: editData.policy_number || null,
        policy_type: editData.policy_type || "comprehensive",
        insurer: editData.insurer || null,
        premium_amount: editData.premium_amount ? Number(editData.premium_amount) : null,
        idv: editData.idv ? Number(editData.idv) : null,
        start_date: editData.start_date || null,
        expiry_date: editData.expiry_date || new Date().toISOString().split("T")[0],
        ncb_percentage: editData.ncb_percentage ? Number(editData.ncb_percentage) : null,
        add_ons: editData.add_ons || [],
        status: "active",
      });

      // Log activity
      await supabase.from("insurance_activity_log").insert({
        client_id: clientId,
        activity_type: "policy_uploaded",
        title: "Policy uploaded via AI Extractor",
        description: `${editData.insurer || "Unknown"} policy ${editData.policy_number || ""} extracted and saved`,
        metadata: { ...editData, extraction_confidence: confidence } as any,
      });

      // Also insert into legacy insurance_leads for backward compatibility
      if (phone && phone.length >= 10) {
        try {
          await supabase.from("insurance_leads").insert({
            phone,
            customer_name: editData.customer_name || null,
            email: editData.email || null,
            vehicle_number: editData.vehicle_number || null,
            vehicle_make: editData.vehicle_make || null,
            vehicle_model: editData.vehicle_model || null,
            policy_type: editData.policy_type || "comprehensive",
            source: "ai_extractor",
            notes: `Policy: ${editData.policy_number || "N/A"} | Insurer: ${editData.insurer || "N/A"} | Expiry: ${editData.expiry_date || "N/A"}`,
          });
        } catch { /* legacy table insert is best-effort */ }
      }

      setSavedSuccess(true);
      toast.success("✅ Lead created + Policy saved + Activity logged!");
      loadPolicies(); // Refresh the list
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const loadPolicies = async () => {
    setLoadingPolicies(true);
    try {
      let query = supabase
        .from("insurance_policies")
        .select("*, insurance_clients(customer_name, phone, vehicle_number, vehicle_make, vehicle_model)")
        .order("created_at", { ascending: false })
        .limit(100);

      // Apply expiry filter
      const today = new Date().toISOString().split("T")[0];
      if (filterExpiry === "7days") {
        const d = new Date(); d.setDate(d.getDate() + 7);
        query = query.lte("expiry_date", d.toISOString().split("T")[0]).gte("expiry_date", today);
      } else if (filterExpiry === "30days") {
        const d = new Date(); d.setDate(d.getDate() + 30);
        query = query.lte("expiry_date", d.toISOString().split("T")[0]).gte("expiry_date", today);
      } else if (filterExpiry === "60days") {
        const d = new Date(); d.setDate(d.getDate() + 60);
        query = query.lte("expiry_date", d.toISOString().split("T")[0]).gte("expiry_date", today);
      } else if (filterExpiry === "expired") {
        query = query.lt("expiry_date", today);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (filterSearch) {
        const s = filterSearch.toLowerCase();
        filtered = filtered.filter((p: any) =>
          p.policy_number?.toLowerCase().includes(s) ||
          p.insurer?.toLowerCase().includes(s) ||
          p.insurance_clients?.customer_name?.toLowerCase().includes(s) ||
          p.insurance_clients?.phone?.includes(s) ||
          p.insurance_clients?.vehicle_number?.toLowerCase().includes(s)
        );
      }
      setPolicies(filtered as SavedPolicy[]);
    } catch (e: any) {
      toast.error("Failed to load policies");
    } finally {
      setLoadingPolicies(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "database") loadPolicies();
  }, [activeSubTab, filterExpiry]);

  const getConfidenceBadge = (key: string) => {
    const c = confidence[key];
    if (c === undefined || c === null) return null;
    if (c >= 0.8) return <Badge className="bg-green-100 text-green-800 border-0 text-[9px]"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />{Math.round(c * 100)}%</Badge>;
    if (c >= 0.5) return <Badge className="bg-yellow-100 text-yellow-800 border-0 text-[9px]"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{Math.round(c * 100)}%</Badge>;
    return <Badge className="bg-red-100 text-red-800 border-0 text-[9px]"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{Math.round(c * 100)}%</Badge>;
  };

  const updateField = (key: string, value: any) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  };

  const getDaysToExpiry = (expiry: string | null) => {
    if (!expiry) return null;
    const diff = Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getExpiryBadge = (expiry: string | null) => {
    const days = getDaysToExpiry(expiry);
    if (days === null) return <Badge variant="outline">No date</Badge>;
    if (days < 0) return <Badge className="bg-red-500 text-white">Expired {Math.abs(days)}d ago</Badge>;
    if (days <= 7) return <Badge className="bg-red-500 text-white">🔴 {days}d left</Badge>;
    if (days <= 30) return <Badge className="bg-orange-500 text-white">🟠 {days}d left</Badge>;
    if (days <= 60) return <Badge className="bg-yellow-500 text-white">🟡 {days}d left</Badge>;
    return <Badge className="bg-green-500 text-white">✅ {days}d left</Badge>;
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="extract" className="gap-1 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> AI Extract
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-1 text-xs">
            <Shield className="h-3.5 w-3.5" /> Policy Database
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-1 text-xs">
            <Bell className="h-3.5 w-3.5" /> Reminders
          </TabsTrigger>
        </TabsList>

        {/* === AI EXTRACTION TAB === */}
        <TabsContent value="extract" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Policy Data Extractor
              </CardTitle>
              <CardDescription>
                Upload a policy PDF or image → AI extracts all fields → Auto-creates lead + policy in database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 text-center hover:border-primary/40 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Drop policy PDF or image here
                    </p>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileSelect}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                  {file && (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <Button
                        onClick={handleExtract}
                        disabled={extracting}
                        className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
                      >
                        {extracting ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Extracting...</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> Extract Data</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                {preview && (
                  <div className="w-48 flex-shrink-0">
                    <img src={preview} alt="Preview" className="rounded-lg border shadow-sm max-h-48 object-contain" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Extraction Results */}
          {extracted && (
            <Card className={savedSuccess ? "border-green-500 border-2" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      {savedSuccess ? "✅ Saved Successfully!" : "Review Extracted Data"}
                    </CardTitle>
                    <CardDescription>
                      {savedSuccess
                        ? "Lead created, policy stored, and activity logged. Upload another document."
                        : "Verify fields below. Low-confidence fields are highlighted. Click Save to create lead + policy."}
                    </CardDescription>
                  </div>
                  {!savedSuccess && (
                    <Button onClick={handleSaveAsLead} disabled={saving} className="gap-1.5 bg-green-600 text-white hover:bg-green-700">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Lead + Policy
                    </Button>
                  )}
                </div>

                {/* Quick summary cards */}
                {extracted && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase">Customer</p>
                      <p className="text-sm font-semibold truncate">{editData.customer_name || "—"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase">Vehicle</p>
                      <p className="text-sm font-semibold truncate">{editData.vehicle_number || "—"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase">Insurer</p>
                      <p className="text-sm font-semibold truncate">{editData.insurer || "—"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase">Expiry</p>
                      <p className="text-sm font-semibold">{editData.expiry_date || "—"}</p>
                      {editData.expiry_date && <div className="mt-0.5">{getExpiryBadge(editData.expiry_date)}</div>}
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(FIELD_LABELS).map(([key, label]) => {
                    const value = (editData as any)[key];
                    const conf = confidence[key];
                    const isLow = conf !== undefined && conf < 0.6;

                    if (key === "add_ons") {
                      return (
                        <div key={key} className={`space-y-1 md:col-span-2 ${isLow ? "ring-1 ring-yellow-400 rounded-lg p-2" : ""}`}>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs font-medium">{label}</Label>
                            {getConfidenceBadge(key)}
                          </div>
                          <Input
                            value={Array.isArray(value) ? value.join(", ") : value || ""}
                            onChange={e => updateField(key, e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                            placeholder="Zero Dep, Engine Protect, RSA"
                            className="text-sm h-9"
                            disabled={savedSuccess}
                          />
                        </div>
                      );
                    }

                    if (key === "policy_type") {
                      return (
                        <div key={key} className={`space-y-1 ${isLow ? "ring-1 ring-yellow-400 rounded-lg p-2" : ""}`}>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs font-medium">{label}</Label>
                            {getConfidenceBadge(key)}
                          </div>
                          <Select value={value || ""} onValueChange={v => updateField(key, v)} disabled={savedSuccess}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="comprehensive">Comprehensive</SelectItem>
                              <SelectItem value="third_party">Third Party</SelectItem>
                              <SelectItem value="own_damage">Own Damage</SelectItem>
                              <SelectItem value="standalone_od">Standalone OD</SelectItem>
                              <SelectItem value="bundled">Bundled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }

                    return (
                      <div key={key} className={`space-y-1 ${isLow ? "ring-1 ring-yellow-400 rounded-lg p-2" : ""}`}>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-medium">{label}</Label>
                          {getConfidenceBadge(key)}
                        </div>
                        <Input
                          value={value ?? ""}
                          onChange={e => updateField(key, e.target.value)}
                          className="text-sm h-9"
                          placeholder={`Enter ${label.toLowerCase()}`}
                          disabled={savedSuccess}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* === POLICY DATABASE TAB === */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Policy Database
                  </CardTitle>
                  <CardDescription>All extracted & saved policies with filtering</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadPolicies} disabled={loadingPolicies} className="gap-1">
                  <RefreshCw className={`h-3 w-3 ${loadingPolicies ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mt-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search name, phone, vehicle, policy..."
                      value={filterSearch}
                      onChange={e => setFilterSearch(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && loadPolicies()}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                </div>
                <Select value={filterExpiry} onValueChange={v => setFilterExpiry(v)}>
                  <SelectTrigger className="w-[180px] h-9 text-sm">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    <SelectValue placeholder="Filter by expiry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Policies</SelectItem>
                    <SelectItem value="7days">Expiring in 7 days</SelectItem>
                    <SelectItem value="30days">Expiring in 30 days</SelectItem>
                    <SelectItem value="60days">Expiring in 60 days</SelectItem>
                    <SelectItem value="expired">Already Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={loadPolicies} className="gap-1 h-9 bg-green-600 text-white hover:bg-green-700">
                  <Search className="h-3 w-3" /> Search
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPolicies ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : policies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No policies found. Extract a policy to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs">Phone</TableHead>
                        <TableHead className="text-xs">Vehicle</TableHead>
                        <TableHead className="text-xs">Policy #</TableHead>
                        <TableHead className="text-xs">Insurer</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Premium</TableHead>
                        <TableHead className="text-xs">Expiry</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policies.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs font-medium">{p.insurance_clients?.customer_name || "—"}</TableCell>
                          <TableCell className="text-xs">
                            <a href={`tel:${p.insurance_clients?.phone}`} className="text-primary hover:underline flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {p.insurance_clients?.phone || "—"}
                            </a>
                          </TableCell>
                          <TableCell className="text-xs">{p.insurance_clients?.vehicle_number || "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{p.policy_number || "—"}</TableCell>
                          <TableCell className="text-xs">{p.insurer || "—"}</TableCell>
                          <TableCell className="text-xs capitalize">{p.policy_type?.replace("_", " ") || "—"}</TableCell>
                          <TableCell className="text-xs">₹{p.premium_amount?.toLocaleString() || "—"}</TableCell>
                          <TableCell className="text-xs">{getExpiryBadge(p.expiry_date)}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px]">
                              {p.status || "active"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === REMINDERS TAB === */}
        <TabsContent value="reminders" className="space-y-4">
          <RenewalReminders />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Renewal Reminders sub-component */
function RenewalReminders() {
  const [reminders, setReminders] = useState<SavedPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState("30");

  const load = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(window));

      const { data, error } = await supabase
        .from("insurance_policies")
        .select("*, insurance_clients(customer_name, phone, vehicle_number, vehicle_make, vehicle_model)")
        .gte("expiry_date", today)
        .lte("expiry_date", futureDate.toISOString().split("T")[0])
        .order("expiry_date", { ascending: true });

      if (error) throw error;
      setReminders((data || []) as SavedPolicy[]);
    } catch {
      toast.error("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [window]);

  const getDaysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500" />
              Renewal Reminders
            </CardTitle>
            <CardDescription>Policies expiring soon — call these customers for renewal</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={window} onValueChange={setWindow}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <Clock className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="15">Next 15 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
                <SelectItem value="60">Next 60 days</SelectItem>
                <SelectItem value="90">Next 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} className="gap-1 h-9">
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-red-600">{reminders.filter(r => getDaysLeft(r.expiry_date!) <= 7).length}</p>
            <p className="text-[10px] text-red-500 uppercase">7 Days</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-orange-600">{reminders.filter(r => getDaysLeft(r.expiry_date!) <= 15).length}</p>
            <p className="text-[10px] text-orange-500 uppercase">15 Days</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-yellow-600">{reminders.filter(r => getDaysLeft(r.expiry_date!) <= 30).length}</p>
            <p className="text-[10px] text-yellow-500 uppercase">30 Days</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-green-600">{reminders.length}</p>
            <p className="text-[10px] text-green-500 uppercase">Total in Window</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
            <p className="text-sm">No renewals due in the next {window} days 🎉</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Days Left</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Vehicle</TableHead>
                  <TableHead className="text-xs">Policy #</TableHead>
                  <TableHead className="text-xs">Insurer</TableHead>
                  <TableHead className="text-xs">Premium</TableHead>
                  <TableHead className="text-xs">Expiry Date</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map(r => {
                  const days = getDaysLeft(r.expiry_date!);
                  return (
                    <TableRow key={r.id} className={days <= 7 ? "bg-red-50/50" : days <= 15 ? "bg-orange-50/50" : ""}>
                      <TableCell>
                        <Badge className={days <= 7 ? "bg-red-500 text-white" : days <= 15 ? "bg-orange-500 text-white" : "bg-yellow-500 text-white"}>
                          {days}d
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{r.insurance_clients?.customer_name || "—"}</TableCell>
                      <TableCell className="text-xs">
                        <a href={`tel:${r.insurance_clients?.phone}`} className="text-primary hover:underline flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {r.insurance_clients?.phone}
                        </a>
                      </TableCell>
                      <TableCell className="text-xs">{r.insurance_clients?.vehicle_number || "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{r.policy_number || "—"}</TableCell>
                      <TableCell className="text-xs">{r.insurer || "—"}</TableCell>
                      <TableCell className="text-xs">₹{r.premium_amount?.toLocaleString() || "—"}</TableCell>
                      <TableCell className="text-xs">{r.expiry_date}</TableCell>
                      <TableCell>
                        <a href={`tel:${r.insurance_clients?.phone}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <Phone className="h-3 w-3" /> Call
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
