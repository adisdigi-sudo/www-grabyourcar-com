import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserPlus, Loader2, Save } from "lucide-react";
import { normalizePhoneNumber, normalizeVehicleRegistration } from "@/lib/insuranceIdentity";

export function InsuranceAddLeadForm({ onSuccess }: { onSuccess?: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    email: "",
    vehicle_number: "",
    vehicle_make: "",
    vehicle_model: "",
    current_policy_type: "comprehensive",
    current_insurer: "",
    lead_source: "manual",
    notes: "",
  });

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone || form.phone.replace(/\D/g, "").length < 10) {
      toast.error("Valid phone number is required");
      return;
    }
    setSaving(true);
    try {
      const phone = normalizePhoneNumber(form.phone);
      const cleanVehicle = normalizeVehicleRegistration(form.vehicle_number) || null;

      // Check for existing client by phone or vehicle number
      let matchQuery = supabase.from("insurance_clients").select("id, customer_name, vehicle_number, duplicate_count");
      if (cleanVehicle) {
        matchQuery = matchQuery.or(`phone.eq.${phone},vehicle_number.eq.${cleanVehicle}`);
      } else {
        matchQuery = matchQuery.eq("phone", phone);
      }
      const { data: existing } = await matchQuery.limit(1);

      if (existing && existing.length > 0) {
        const dup = existing[0];
        const newDupCount = (dup.duplicate_count || 0) + 1;

        // Update existing with new info
        await supabase.from("insurance_clients").update({
          duplicate_count: newDupCount,
          is_duplicate: true,
          customer_name: form.customer_name || dup.customer_name || undefined,
          email: form.email || undefined,
          vehicle_number: cleanVehicle || dup.vehicle_number || undefined,
          vehicle_make: form.vehicle_make || undefined,
          vehicle_model: form.vehicle_model || undefined,
          current_policy_type: form.current_policy_type || undefined,
          current_insurer: form.current_insurer || undefined,
          notes: form.notes || undefined,
        }).eq("id", dup.id);

        await supabase.from("insurance_activity_log").insert({
          client_id: dup.id,
          activity_type: "duplicate_lead",
          title: `Duplicate entry #${newDupCount + 1}`,
          description: `Duplicate lead detected via manual entry. Vehicle: ${cleanVehicle || 'N/A'}, Phone: ${phone}`,
        });

        toast.info(`⚠️ Duplicate lead (Entry #${newDupCount + 1}) — record updated`, {
          description: `${dup.customer_name} • ${dup.vehicle_number || phone}`,
        });
      } else {
        // Create new
        const { data: newClient } = await supabase.from("insurance_clients").insert({
          phone,
          customer_name: form.customer_name || null,
          email: form.email || null,
          vehicle_number: cleanVehicle,
          vehicle_make: form.vehicle_make || null,
          vehicle_model: form.vehicle_model || null,
          current_policy_type: form.current_policy_type || null,
          current_insurer: form.current_insurer || null,
          lead_source: form.lead_source,
          notes: form.notes || null,
        }).select("id").single();

        if (newClient) {
          await supabase.from("insurance_activity_log").insert({
            client_id: newClient.id,
            activity_type: "lead_created",
            title: "New lead added manually",
            description: `New insurance lead from ${form.lead_source}`,
          });
        }
        toast.success("New insurance lead added!");
      }

      setForm({
        customer_name: "", phone: "", email: "", vehicle_number: "",
        vehicle_make: "", vehicle_model: "", current_policy_type: "comprehensive",
        current_insurer: "", lead_source: "manual", notes: "",
      });
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to save lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" /> Add Insurance Lead
        </CardTitle>
        <CardDescription>Manually add a new lead to the insurance CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Customer Name *</Label>
              <Input value={form.customer_name} onChange={e => update("customer_name", e.target.value)} placeholder="Full name" className="h-9 text-sm" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone *</Label>
              <Input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="10-digit mobile" className="h-9 text-sm" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="email@example.com" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vehicle Number</Label>
              <Input value={form.vehicle_number} onChange={e => update("vehicle_number", e.target.value.toUpperCase())} placeholder="MH02AB1234" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vehicle Make</Label>
              <Input value={form.vehicle_make} onChange={e => update("vehicle_make", e.target.value)} placeholder="Maruti Suzuki" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vehicle Model</Label>
              <Input value={form.vehicle_model} onChange={e => update("vehicle_model", e.target.value)} placeholder="Swift VXI" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Policy Type</Label>
              <Select value={form.current_policy_type} onValueChange={v => update("current_policy_type", v)}>
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
              <Label className="text-xs">Current Insurer</Label>
              <Input value={form.current_insurer} onChange={e => update("current_insurer", e.target.value)} placeholder="ICICI Lombard" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lead Source</Label>
              <Select value={form.lead_source} onValueChange={v => update("lead_source", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Any additional info..." className="text-sm min-h-[60px]" />
          </div>
          <Button type="submit" disabled={saving} className="gap-1.5 bg-success text-success-foreground hover:bg-success/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Lead
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
