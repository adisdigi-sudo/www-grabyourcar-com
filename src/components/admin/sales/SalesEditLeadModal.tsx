import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const SOURCES = ["Meta", "Google Ads", "Referral", "Walk-in", "WhatsApp", "Website", "Admin Routed", "Manual", "CSV Import"];
const BUYING_INTENTS = ["Immediate (This Week)", "Within 15 Days", "Within 1 Month", "Exploring Options", "Not Sure"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

interface SalesEditLeadModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: any;
  onSubmit: (updates: any) => void;
  isPending: boolean;
}

const initFromLead = (lead: any) => ({
  customer_name: lead?.customer_name || "",
  phone: lead?.phone || "",
  email: lead?.email || "",
  city: lead?.city || "",
  car_brand: lead?.car_brand || "",
  car_model: lead?.car_model || "",
  car_variant: lead?.car_variant || "",
  car_color: lead?.car_color || "",
  source: lead?.source || "Manual",
  buying_intent: lead?.buying_intent || "",
  priority: lead?.priority || "medium",
  follow_up_date: lead?.follow_up_date || "",
  follow_up_time: lead?.follow_up_time || "",
  on_road_price: lead?.on_road_price || "",
  ex_showroom_price: lead?.ex_showroom_price || "",
  inquiry_remarks: lead?.inquiry_remarks || "",
  assigned_executive: lead?.assigned_executive || "",
});

export function SalesEditLeadModal({ open, onOpenChange, lead, onSubmit, isPending }: SalesEditLeadModalProps) {
  const [form, setForm] = useState(() => initFromLead(lead));

  useEffect(() => {
    if (open) setForm(initFromLead(lead));
  }, [open, lead]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  const handleSubmit = () => {
    if (!form.customer_name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    const cleaned: any = { ...form };
    // numeric coerce
    cleaned.on_road_price = form.on_road_price === "" ? null : Number(form.on_road_price);
    cleaned.ex_showroom_price = form.ex_showroom_price === "" ? null : Number(form.ex_showroom_price);
    cleaned.follow_up_date = form.follow_up_date || null;
    cleaned.follow_up_time = form.follow_up_time || null;
    onSubmit(cleaned);
  };

  if (!open || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close edit lead modal"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold leading-none tracking-tight">Edit Lead Details</h2>
          <p className="text-sm text-muted-foreground">
            Update customer & vehicle info. Changes save to the sales pipeline immediately.
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.customer_name}
                onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label>Brand</Label>
              <Input value={form.car_brand} onChange={(e) => setForm((p) => ({ ...p, car_brand: e.target.value }))} />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={form.car_model} onChange={(e) => setForm((p) => ({ ...p, car_model: e.target.value }))} />
            </div>
            <div>
              <Label>Variant</Label>
              <Input value={form.car_variant} onChange={(e) => setForm((p) => ({ ...p, car_variant: e.target.value }))} />
            </div>
            <div>
              <Label>Color</Label>
              <Input value={form.car_color} onChange={(e) => setForm((p) => ({ ...p, car_color: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ex-Showroom Price (₹)</Label>
              <Input
                type="number"
                value={form.ex_showroom_price}
                onChange={(e) => setForm((p) => ({ ...p, ex_showroom_price: e.target.value }))}
              />
            </div>
            <div>
              <Label>On-Road Price (₹)</Label>
              <Input
                type="number"
                value={form.on_road_price}
                onChange={(e) => setForm((p) => ({ ...p, on_road_price: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Buying Intent</Label>
              <Select
                value={form.buying_intent || undefined}
                onValueChange={(v) => setForm((p) => ({ ...p, buying_intent: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BUYING_INTENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={form.follow_up_date || ""}
                onChange={(e) => setForm((p) => ({ ...p, follow_up_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Follow-up Time</Label>
              <Input
                type="time"
                value={form.follow_up_time || ""}
                onChange={(e) => setForm((p) => ({ ...p, follow_up_time: e.target.value }))}
              />
            </div>
            <div>
              <Label>Assigned Executive</Label>
              <Input
                value={form.assigned_executive}
                onChange={(e) => setForm((p) => ({ ...p, assigned_executive: e.target.value }))}
                placeholder="Name / phone"
              />
            </div>
          </div>

          <div>
            <Label>Inquiry Remarks</Label>
            <Textarea
              value={form.inquiry_remarks}
              onChange={(e) => setForm((p) => ({ ...p, inquiry_remarks: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending} className="flex-1">
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
