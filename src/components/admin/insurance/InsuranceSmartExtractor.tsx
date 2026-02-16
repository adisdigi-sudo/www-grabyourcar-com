import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Sparkles, Loader2, CheckCircle2, AlertTriangle, Save, Eye, FileText } from "lucide-react";

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setExtracted(null);
    setConfidence({});
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

    try {
      // Upload file to storage first
      const ext = file.name.split(".").pop();
      const path = `policy-extractions/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("car-assets").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("car-assets").getPublicUrl(path);

      // Call extraction edge function
      const { data, error } = await supabase.functions.invoke("extract-policy-data", {
        body: { file_url: urlData.publicUrl, mime_type: file.type },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Extraction failed");

      setExtracted(data.extracted);
      setConfidence(data.confidence || {});
      setEditData(data.extracted);
      toast.success("Policy data extracted successfully!");
    } catch (e: any) {
      console.error("Extraction error:", e);
      toast.error(e.message || "Failed to extract data");
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);

    try {
      // 1. Upsert client
      const phone = editData.phone?.replace(/\D/g, "") || "";
      let clientId: string | null = null;

      if (phone) {
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
            lead_source: "policy_upload",
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
          lead_source: "policy_upload",
        }).select("id").single();
        clientId = newClient?.id || null;
      }

      if (!clientId) throw new Error("Failed to create/find client");

      // 2. Create policy
      await supabase.from("insurance_policies").insert({
        client_id: clientId,
        policy_number: editData.policy_number || null,
        policy_type: editData.policy_type || "comprehensive",
        insurer: editData.insurer || null,
        premium_amount: editData.premium_amount || null,
        idv: editData.idv || null,
        start_date: editData.start_date || null,
        expiry_date: editData.expiry_date || new Date().toISOString().split("T")[0],
        ncb_percentage: editData.ncb_percentage || null,
        add_ons: editData.add_ons || [],
        status: "active",
      });

      // 3. Log activity
      await supabase.from("insurance_activity_log").insert({
        client_id: clientId,
        activity_type: "policy_uploaded",
        title: "Policy uploaded via Smart Extractor",
        description: `${editData.insurer || "Unknown"} policy ${editData.policy_number || ""} extracted and saved`,
        metadata: { ...editData, extraction_confidence: confidence },
      });

      toast.success("Policy saved to CRM! Client profile updated.");
      setExtracted(null);
      setEditData({});
      setFile(null);
      setPreview(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceBadge = (key: string) => {
    const c = confidence[key];
    if (c === undefined || c === null) return null;
    if (c >= 0.8) return <Badge className="bg-green-100 text-green-700 border-0 text-[9px]"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />{Math.round(c * 100)}%</Badge>;
    if (c >= 0.5) return <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[9px]"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{Math.round(c * 100)}%</Badge>;
    return <Badge className="bg-red-100 text-red-700 border-0 text-[9px]"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{Math.round(c * 100)}%</Badge>;
  };

  const updateField = (key: string, value: any) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Policy Data Extractor
          </CardTitle>
          <CardDescription>
            Upload a policy PDF or image — AI will auto-extract all key fields
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
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <Button
                    onClick={handleExtract}
                    disabled={extracting}
                    className="gap-1.5 bg-success text-success-foreground hover:bg-success/90"
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

      {/* Extracted Data Editor */}
      {extracted && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Review & Edit Extracted Data
                </CardTitle>
                <CardDescription>
                  Verify and correct any fields before saving. Low-confidence fields are highlighted.
                </CardDescription>
              </div>
              <Button onClick={handleSave} disabled={saving} className="gap-1.5 bg-success text-success-foreground hover:bg-success/90">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save to CRM
              </Button>
            </div>
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
                      <Select value={value || ""} onValueChange={v => updateField(key, v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comprehensive">Comprehensive</SelectItem>
                          <SelectItem value="third_party">Third Party</SelectItem>
                          <SelectItem value="own_damage">Own Damage</SelectItem>
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
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
