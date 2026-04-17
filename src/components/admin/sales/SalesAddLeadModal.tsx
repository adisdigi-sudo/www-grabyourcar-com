import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const SOURCES = ["Meta", "Google Ads", "Referral", "Walk-in", "WhatsApp", "Website", "Admin Routed", "Manual", "CSV Import"];

interface SalesAddLeadModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}

export function SalesAddLeadModal({ open, onOpenChange, onSubmit, isPending }: SalesAddLeadModalProps) {
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    email: "",
    city: "",
    car_brand: "",
    car_model: "",
    car_variant: "",
    source: "Manual",
    inquiry_remarks: "",
    budget: "",
  });

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

  const resetForm = () => {
    setForm({
      customer_name: "",
      phone: "",
      email: "",
      city: "",
      car_brand: "",
      car_model: "",
      car_variant: "",
      source: "Manual",
      inquiry_remarks: "",
      budget: "",
    });
  };

  const handleSubmit = () => {
    if (!form.customer_name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    // `budget` is not a column on sales_pipeline — fold it into inquiry_remarks
    const { budget, inquiry_remarks, ...rest } = form;
    const mergedRemarks = budget?.trim()
      ? `${inquiry_remarks ? inquiry_remarks + " | " : ""}Budget: ${budget.trim()}`
      : inquiry_remarks;
    onSubmit({ ...rest, inquiry_remarks: mergedRemarks });
    resetForm();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close add lead modal"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold leading-none tracking-tight">Add New Sales Lead</h2>
          <p className="text-sm text-muted-foreground">Create a fresh sales inquiry manually.</p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.customer_name}
                onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Brand</Label>
              <Input
                value={form.car_brand}
                onChange={(e) => setForm((p) => ({ ...p, car_brand: e.target.value }))}
                placeholder="e.g. Maruti"
              />
            </div>
            <div>
              <Label>Model</Label>
              <Input
                value={form.car_model}
                onChange={(e) => setForm((p) => ({ ...p, car_model: e.target.value }))}
                placeholder="e.g. Brezza"
              />
            </div>
            <div>
              <Label>Variant</Label>
              <Input
                value={form.car_variant}
                onChange={(e) => setForm((p) => ({ ...p, car_variant: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lead Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budget</Label>
              <Input
                value={form.budget}
                onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                placeholder="e.g. 8-10 Lakhs"
              />
            </div>
          </div>
          <div>
            <Label>Inquiry Remarks</Label>
            <Textarea
              value={form.inquiry_remarks}
              onChange={(e) => setForm((p) => ({ ...p, inquiry_remarks: e.target.value }))}
              placeholder="What is the customer looking for?"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending} className="flex-1">
              {isPending ? "Adding..." : "Add Lead"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
