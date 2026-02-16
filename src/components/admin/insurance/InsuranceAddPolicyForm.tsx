import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Save, Search } from "lucide-react";

export function InsuranceAddPolicyForm({ onSuccess }: { onSuccess?: () => void }) {
  const [saving, setSaving] = useState(false);
  const [searchPhone, setSearchPhone] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [searching, setSearching] = useState(false);

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

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const searchClient = async () => {
    if (!searchPhone || searchPhone.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }
    setSearching(true);
    try {
      const { data } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone")
        .eq("phone", searchPhone.replace(/\D/g, ""))
        .limit(1);

      if (data && data.length > 0) {
        setClientId(data[0].id);
        setClientName(data[0].customer_name || data[0].phone);
        toast.success(`Found client: ${data[0].customer_name || data[0].phone}`);
      } else {
        toast.error("Client not found. Add as lead first.");
        setClientId(null);
        setClientName("");
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error("Search and select a client first");
      return;
    }
    if (!form.policy_number) {
      toast.error("Policy number is required");
      return;
    }
    setSaving(true);
    try {
      await supabase.from("insurance_policies").insert({
        client_id: clientId,
        policy_number: form.policy_number,
        policy_type: form.policy_type,
        insurer: form.insurer || null,
        premium_amount: form.premium_amount ? Number(form.premium_amount) : null,
        idv: form.idv ? Number(form.idv) : null,
        start_date: form.start_date || null,
        expiry_date: form.expiry_date || null,
        ncb_percentage: form.ncb_percentage ? Number(form.ncb_percentage) : null,
        add_ons: form.add_ons ? form.add_ons.split(",").map(s => s.trim()).filter(Boolean) : [],
        status: form.status,
      });

      await supabase.from("insurance_activity_log").insert({
        client_id: clientId,
        activity_type: "policy_uploaded",
        title: "Policy added manually",
        description: `${form.insurer || "Unknown"} policy ${form.policy_number} added`,
      });

      toast.success("Policy added successfully!");
      setForm({
        policy_number: "", policy_type: "comprehensive", insurer: "",
        premium_amount: "", idv: "", start_date: "", expiry_date: "",
        ncb_percentage: "", add_ons: "", status: "active",
      });
      setClientId(null);
      setClientName("");
      setSearchPhone("");
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
        <CardDescription>Link a policy to an existing insurance client</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Client search */}
        <div className="flex gap-2 mb-4">
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
              <span className="text-sm font-medium text-green-600 pb-2">✅ {clientName}</span>
            </div>
          )}
        </div>

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
          <Button type="submit" disabled={saving || !clientId} className="gap-1.5 bg-success text-success-foreground hover:bg-success/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Policy
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
