import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Save, Search, UserPlus, Upload, FileText, X } from "lucide-react";

export function InsuranceAddPolicyForm({ onSuccess }: { onSuccess?: () => void }) {
  const [saving, setSaving] = useState(false);
  const [clientMode, setClientMode] = useState<"existing" | "new">("new");

  // Existing client search
  const [searchPhone, setSearchPhone] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [searching, setSearching] = useState(false);

  // New client fields
  const [newClient, setNewClient] = useState({
    customer_name: "",
    phone: "",
    email: "",
    vehicle_number: "",
    vehicle_make: "",
    vehicle_model: "",
  });

  const [form, setForm] = useState({
    policy_number: "",
    policy_type: "comprehensive",
    insurer: "",
    premium_amount: "",
    idv: "",
    start_date: "",
    expiry_date: "",
    ncb_percentage: "",
    add_ons: "",
    status: "active",
  });

  // Document upload
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const updateNewClient = (key: string, value: string) => setNewClient(prev => ({ ...prev, [key]: value }));

  const searchClient = async () => {
    if (!searchPhone || searchPhone.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }
    setSearching(true);
    try {
      const cleanPhone = searchPhone.replace(/\D/g, "");
      const { data } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, email, vehicle_number, vehicle_make, vehicle_model, current_insurer, current_policy_type, current_premium, current_policy_number, policy_start_date, policy_expiry_date, ncb_percentage")
        .eq("phone", cleanPhone)
        .limit(1);

      if (data && data.length > 0) {
        const client = data[0];
        setClientId(client.id);
        setClientName(client.customer_name || client.phone);
        
        // Pre-fill form with existing client's previous policy data
        setForm(prev => ({
          ...prev,
          insurer: client.current_insurer || prev.insurer,
          policy_type: client.current_policy_type || prev.policy_type,
          premium_amount: client.current_premium ? String(client.current_premium) : prev.premium_amount,
          ncb_percentage: client.ncb_percentage ? String(client.ncb_percentage) : prev.ncb_percentage,
        }));
        
        toast.success(`Found client: ${client.customer_name || client.phone}. Previous policy data loaded.`);
      } else {
        toast.error("Client not found. Switch to 'New Client' tab to add.");
        setClientId(null);
        setClientName("");
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const uploadDocument = async (policyId: string): Promise<string | null> => {
    if (!docFile) return null;
    setUploading(true);
    try {
      const ext = docFile.name.split(".").pop() || "pdf";
      const filePath = `${policyId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("policy-documents")
        .upload(filePath, docFile, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("policy-documents")
        .getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (e: any) {
      console.error("Document upload failed:", e);
      toast.error("Document upload failed: " + (e.message || "Unknown error"));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.policy_number) {
      toast.error("Policy number is required");
      return;
    }

    setSaving(true);
    try {
      let finalClientId = clientId;

      // If new client mode, create client first
      if (clientMode === "new") {
        const phone = newClient.phone?.replace(/\D/g, "") || "";
        if (!phone || phone.length < 10) {
          toast.error("Enter a valid 10-digit phone number for new client");
          setSaving(false);
          return;
        }

        const { data: existing } = await supabase
          .from("insurance_clients")
          .select("id, customer_name")
          .eq("phone", phone)
          .limit(1);

        if (existing && existing.length > 0) {
          finalClientId = existing[0].id;
          await supabase.from("insurance_clients").update({
            customer_name: newClient.customer_name || undefined,
            email: newClient.email || undefined,
            vehicle_number: newClient.vehicle_number || undefined,
            vehicle_make: newClient.vehicle_make || undefined,
            vehicle_model: newClient.vehicle_model || undefined,
          }).eq("id", finalClientId);
          toast.info(`Client already exists: ${existing[0].customer_name || phone}. Updated details.`);
        } else {
          const { data: created, error: createErr } = await supabase.from("insurance_clients").insert({
            phone,
            customer_name: newClient.customer_name || null,
            email: newClient.email || null,
            vehicle_number: newClient.vehicle_number || null,
            vehicle_make: newClient.vehicle_make || null,
            vehicle_model: newClient.vehicle_model || null,
            lead_source: "manual_entry",
          }).select("id").single();
          if (createErr) throw new Error(`Failed to create client: ${createErr.message}`);
          finalClientId = created?.id || null;
        }
      }

      if (!finalClientId) {
        toast.error("Select or create a client first");
        setSaving(false);
        return;
      }

      // Auto-expire previous active policies
      const { data: previousPolicies } = await supabase
        .from("insurance_policies")
        .select("id, policy_number, insurer, expiry_date")
        .eq("client_id", finalClientId)
        .eq("status", "active");

      if (previousPolicies && previousPolicies.length > 0) {
        const prevIds = previousPolicies.map(p => p.id);
        await supabase
          .from("insurance_policies")
          .update({ status: "renewed" })
          .in("id", prevIds);

        for (const prev of previousPolicies) {
          await supabase.from("insurance_activity_log").insert({
            client_id: finalClientId,
            activity_type: "policy_renewed",
            title: "Previous policy replaced by renewal",
            description: `Old policy ${prev.policy_number || prev.id} (${prev.insurer || "Unknown"}) auto-marked as renewed. New policy: ${form.policy_number}`,
          });
        }
      }

      // Insert new policy
      const { data: newPolicy, error: policyErr } = await supabase.from("insurance_policies").insert({
        client_id: finalClientId,
        policy_number: form.policy_number,
        policy_type: form.policy_type,
        insurer: form.insurer || "Unknown",
        premium_amount: form.premium_amount ? Number(form.premium_amount) : null,
        idv: form.idv ? Number(form.idv) : null,
        start_date: form.start_date || new Date().toISOString().split("T")[0],
        expiry_date: form.expiry_date || null,
        ncb_discount: form.ncb_percentage ? Number(form.ncb_percentage) : null,
        addons: form.add_ons ? form.add_ons.split(",").map(s => s.trim()).filter(Boolean) : [],
        status: form.status,
      }).select("id").single();
      if (policyErr) throw policyErr;

      const bookingDate = form.start_date || new Date().toISOString().split("T")[0];

      await supabase
        .from("insurance_clients")
        .update({
          current_policy_number: form.policy_number,
          current_policy_type: form.policy_type,
          current_insurer: form.insurer || "Unknown",
          current_premium: form.premium_amount ? Number(form.premium_amount) : null,
          policy_start_date: form.start_date || bookingDate,
          policy_expiry_date: form.expiry_date || null,
          booking_date: bookingDate,
          lead_status: "won",
          pipeline_stage: "policy_issued",
          renewal_reminder_set: Boolean(form.expiry_date),
          renewal_reminder_date: form.expiry_date || null,
          incentive_eligible: true,
          journey_last_event: "policy_issued",
          journey_last_event_at: new Date().toISOString(),
        } as any)
        .eq("id", finalClientId);

      // Upload document if provided
      if (docFile && newPolicy) {
        const docUrl = await uploadDocument(newPolicy.id);
        if (docUrl) {
          await supabase.from("insurance_policies")
            .update({ policy_document_url: docUrl })
            .eq("id", newPolicy.id);
        }
      }

      await supabase.from("insurance_activity_log").insert({
        client_id: finalClientId,
        activity_type: "policy_uploaded",
        title: "Policy added manually",
        description: `${form.insurer || "Unknown"} policy ${form.policy_number} added${docFile ? " with document" : ""}`,
      });

      // Auto-send WhatsApp policy confirmation
      const clientPhone = clientMode === "existing" ? searchPhone : newClient.phone;
      const clientDisplayName = clientMode === "existing" ? clientName : newClient.customer_name;
      if (clientPhone) {
        try {
          const vehicleInfo = clientMode === "existing" ? "" : [newClient.vehicle_make, newClient.vehicle_model].filter(Boolean).join(" ");
          const policyMsg = `🎉 Congratulations ${clientDisplayName || "Customer"}!\n\nYour car insurance policy has been issued!\n\n📋 *Policy Details:*\n• Policy #: ${form.policy_number}\n• Insurer: ${form.insurer || "N/A"}\n• Premium: ₹${form.premium_amount || "N/A"}${vehicleInfo ? `\n• Vehicle: ${vehicleInfo}` : ""}\n• Valid: ${form.start_date || "N/A"} to ${form.expiry_date || "N/A"}\n\nYour policy document will be shared shortly.\n\nThank you for choosing GrabYourCar! 🚗`;

          await supabase.functions.invoke("whatsapp-send", {
            body: {
              to: clientPhone,
              message: policyMsg,
              messageType: "text",
              name: clientDisplayName || "Customer",
              logEvent: "policy_added_auto_send",
            },
          });
        } catch (waErr) {
          console.warn("Auto WhatsApp on policy add failed:", waErr);
        }
      }

      const replacedCount = previousPolicies?.length || 0;
      toast.success(replacedCount > 0 
        ? `✅ Policy added & WhatsApp sent! ${replacedCount} previous policy(s) auto-renewed.`
        : "✅ Policy added & WhatsApp sent!");
      
      // Reset form
      setForm({
        policy_number: "", policy_type: "comprehensive", insurer: "",
        premium_amount: "", idv: "", start_date: "", expiry_date: "",
        ncb_percentage: "", add_ons: "", status: "active",
      });
      setNewClient({ customer_name: "", phone: "", email: "", vehicle_number: "", vehicle_make: "", vehicle_model: "" });
      setClientId(null);
      setClientName("");
      setSearchPhone("");
      setDocFile(null);
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Add Policy Details
        </CardTitle>
        <CardDescription>Add a new client or link to existing, then add policy with document</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Client Selection Mode */}
        <Tabs value={clientMode} onValueChange={(v) => setClientMode(v as "existing" | "new")} className="mb-4">
          <TabsList className="grid grid-cols-2 w-full max-w-xs">
            <TabsTrigger value="new" className="gap-1 text-xs">
              <UserPlus className="h-3 w-3" /> New Client
            </TabsTrigger>
            <TabsTrigger value="existing" className="gap-1 text-xs">
              <Search className="h-3 w-3" /> Existing Client
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <div className="space-y-1">
                <Label className="text-xs">Customer Name</Label>
                <Input value={newClient.customer_name} onChange={e => updateNewClient("customer_name", e.target.value)} placeholder="Full name" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone Number *</Label>
                <Input value={newClient.phone} onChange={e => updateNewClient("phone", e.target.value)} placeholder="10-digit mobile" className="h-9 text-sm" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input value={newClient.email} onChange={e => updateNewClient("email", e.target.value)} placeholder="email@example.com" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vehicle Number</Label>
                <Input value={newClient.vehicle_number} onChange={e => updateNewClient("vehicle_number", e.target.value)} placeholder="MH02AB1234" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vehicle Make</Label>
                <Input value={newClient.vehicle_make} onChange={e => updateNewClient("vehicle_make", e.target.value)} placeholder="Maruti Suzuki" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vehicle Model</Label>
                <Input value={newClient.vehicle_model} onChange={e => updateNewClient("vehicle_model", e.target.value)} placeholder="Swift VXI" className="h-9 text-sm" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="existing" className="mt-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs mb-1 block">Find Client by Phone</Label>
                <div className="flex gap-2">
                  <Input
                    value={searchPhone}
                    onChange={e => setSearchPhone(e.target.value)}
                    placeholder="Enter client phone number"
                    className="h-9 text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={searchClient} disabled={searching} className="gap-1">
                    {searching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                    Search
                  </Button>
                </div>
              </div>
              {clientName && (
                <div className="flex items-end">
                  <span className="text-sm font-medium text-success pb-2">✅ {clientName}</span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Policy Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Policy Number *</Label>
              <Input value={form.policy_number} onChange={e => update("policy_number", e.target.value)} placeholder="POL-123456" className="h-9 text-sm" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Policy Type</Label>
              <Select value={form.policy_type} onValueChange={v => update("policy_type", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  <SelectItem value="third_party">Third Party</SelectItem>
                  <SelectItem value="own_damage">Own Damage</SelectItem>
                  <SelectItem value="standalone_od">Standalone OD</SelectItem>
                  <SelectItem value="bundled">Bundled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Insurer</Label>
              <Input value={form.insurer} onChange={e => update("insurer", e.target.value)} placeholder="ICICI Lombard" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Premium Amount (₹)</Label>
              <Input type="number" value={form.premium_amount} onChange={e => update("premium_amount", e.target.value)} placeholder="12000" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">IDV (₹)</Label>
              <Input type="number" value={form.idv} onChange={e => update("idv", e.target.value)} placeholder="450000" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">NCB %</Label>
              <Input type="number" value={form.ncb_percentage} onChange={e => update("ncb_percentage", e.target.value)} placeholder="50" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => update("start_date", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expiry Date</Label>
              <Input type="date" value={form.expiry_date} onChange={e => update("expiry_date", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => update("status", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Add-ons (comma separated)</Label>
            <Input value={form.add_ons} onChange={e => update("add_ons", e.target.value)} placeholder="Zero Dep, RSA, Engine Protect" className="h-9 text-sm" />
          </div>

          {/* Policy Document Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Policy Document (PDF/Image)</Label>
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-primary/5 text-center">
              {docFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium truncate max-w-[200px]">{docFile.name}</span>
                  <span className="text-xs text-muted-foreground">({(docFile.size / 1024).toFixed(0)} KB)</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDocFile(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Drop policy document here or click to browse</p>
                  <p className="text-xs text-muted-foreground">PDF, JPG, PNG up to 20MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 20 * 1024 * 1024) {
                      toast.error("File too large. Max 20MB.");
                      return;
                    }
                    setDocFile(file);
                  }
                }}
              />
              {!docFile && (
                <Button type="button" variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" /> Choose File
                </Button>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving || uploading || (clientMode === "existing" && !clientId)}
            className="gap-1.5 bg-success text-success-foreground hover:bg-success/90"
          >
            {saving || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {clientMode === "new" ? "Create Client & Save Policy" : "Save Policy"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
