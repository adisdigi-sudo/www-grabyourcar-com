/**
 * Premium Invoice Studio
 * Full-bleed invoice composer using the unified branding system.
 * - Live HTML preview that mirrors the branded PDF layout
 * - Auto-resolves vertical branding (logo, colors, terms, bank, signature)
 * - Generates the PDF via generateBrandedInvoice
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Download, Save, Sparkles, Eye, FileText } from "lucide-react";
import { generateBrandedInvoice, resolveBranding } from "@/lib/pdf";
import type { ResolvedBranding } from "@/lib/pdf";

const VERTICALS = [
  { label: "Car Sales", slug: "sales" },
  { label: "Insurance", slug: "insurance" },
  { label: "Car Loans", slug: "loans" },
  { label: "HSRP", slug: "hsrp" },
  { label: "Self Drive", slug: "self-drive" },
  { label: "Accessories", slug: "accessories" },
  { label: "Service", slug: "service" },
];

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

interface Item {
  description: string;
  hsn?: string;
  quantity: number;
  rate: number;
  amount: number;
}

const emptyItem = (): Item => ({ description: "", hsn: "", quantity: 1, rate: 0, amount: 0 });

export const PremiumInvoiceStudio = () => {
  const qc = useQueryClient();
  const [verticalLabel, setVerticalLabel] = useState("Car Sales");
  const [form, setForm] = useState<Record<string, any>>({
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    status: "draft",
    invoice_type: "tax_invoice",
    discount_amount: 0,
    amount_paid: 0,
    tax_rate: 18,
  });
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [branding, setBranding] = useState<ResolvedBranding | null>(null);

  const verticalSlug = useMemo(
    () => VERTICALS.find((v) => v.label === verticalLabel)?.slug || "general",
    [verticalLabel],
  );

  // Resolve branding for live preview whenever the vertical changes
  useEffect(() => {
    let cancelled = false;
    resolveBranding(verticalSlug)
      .then((b) => {
        if (!cancelled) setBranding(b);
      })
      .catch(() => {
        /* ignore — preview falls back to defaults */
      });
    return () => {
      cancelled = true;
    };
  }, [verticalSlug]);

  // Totals
  const subtotal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.rate || 0), 0);
  const taxRate = Number(form.tax_rate || 0);
  const tax = Math.round((subtotal * taxRate) / 100);
  const discount = Number(form.discount_amount || 0);
  const total = subtotal + tax - discount;
  const paid = Number(form.amount_paid || 0);
  const balance = Math.max(0, total - paid);

  const updateItem = (idx: number, patch: Partial<Item>) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    next[idx].amount = Number(next[idx].quantity || 0) * Number(next[idx].rate || 0);
    setItems(next);
  };

  const buildInvoicePayload = (overrideNumber?: string) => ({
    invoice_number:
      overrideNumber ||
      form.invoice_number ||
      `INV-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    invoice_date: form.invoice_date,
    due_date: form.due_date || null,
    client_name: form.client_name || "Customer",
    client_phone: form.client_phone || null,
    client_email: form.client_email || null,
    client_address: form.client_address || null,
    gstin: form.gstin || null,
    vertical_name: verticalLabel,
    invoice_type: form.invoice_type,
    status: form.status,
    items: items.map((i) => ({
      description: i.description,
      hsn: i.hsn,
      quantity: i.quantity,
      rate: i.rate,
      amount: i.amount,
    })),
    subtotal,
    tax_amount: tax,
    discount_amount: discount,
    total_amount: total,
    amount_paid: paid,
    balance_due: balance,
    notes: form.notes || null,
    terms: form.terms || null,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildInvoicePayload();
      const { error } = await (supabase.from("invoices") as any).insert({
        ...payload,
        items: payload.items as any,
      });
      if (error) throw error;
      return payload;
    },
    onSuccess: (payload) => {
      qc.invalidateQueries({ queryKey: ["acc-invoices-all"] });
      toast.success(`Invoice ${payload.invoice_number} saved`);
      setForm((p) => ({ ...p, invoice_number: payload.invoice_number }));
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const handleDownload = async () => {
    if (!form.client_name) {
      toast.error("Please enter a client name");
      return;
    }
    try {
      toast.loading("Generating branded invoice...");
      await generateBrandedInvoice(buildInvoicePayload());
      toast.dismiss();
      toast.success("Invoice downloaded");
    } catch (e: any) {
      toast.dismiss();
      toast.error(e?.message || "Failed to generate PDF");
    }
  };

  const handleSaveAndDownload = async () => {
    if (!form.client_name) {
      toast.error("Please enter a client name");
      return;
    }
    try {
      toast.loading("Saving and generating...");
      const saved = await saveMutation.mutateAsync();
      await generateBrandedInvoice(saved);
      toast.dismiss();
      toast.success("Saved & downloaded");
    } catch {
      /* handled */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Premium Invoice Studio
          </h2>
          <p className="text-sm text-muted-foreground">
            Generates fully branded invoices using your global + per-vertical PDF settings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button onClick={handleSaveAndDownload} className="gap-2">
            <Save className="h-4 w-4" /> Save & Download
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── EDITOR ── */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vertical</Label>
                <Select value={verticalLabel} onValueChange={setVerticalLabel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VERTICALS.map((v) => (
                      <SelectItem key={v.slug} value={v.label}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Invoice Type</Label>
                <Select
                  value={form.invoice_type || "tax_invoice"}
                  onValueChange={(v) => setForm((p) => ({ ...p, invoice_type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["tax_invoice", "proforma", "credit_note", "receipt"].map((t) => (
                      <SelectItem key={t} value={t}>{t.replace("_", " ").toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-semibold">Bill To</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={form.client_name || ""} onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.client_phone || ""} onChange={(e) => setForm((p) => ({ ...p, client_phone: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={form.client_email || ""} onChange={(e) => setForm((p) => ({ ...p, client_email: e.target.value }))} /></div>
                <div><Label>GSTIN</Label><Input value={form.gstin || ""} onChange={(e) => setForm((p) => ({ ...p, gstin: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Address</Label><Input value={form.client_address || ""} onChange={(e) => setForm((p) => ({ ...p, client_address: e.target.value }))} /></div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Invoice Date</Label><Input type="date" value={form.invoice_date} onChange={(e) => setForm((p) => ({ ...p, invoice_date: e.target.value }))} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date || ""} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} /></div>
              <div><Label>GST Rate (%)</Label><Input type="number" value={form.tax_rate} onChange={(e) => setForm((p) => ({ ...p, tax_rate: Number(e.target.value) }))} /></div>
            </div>

            <div className="flex flex-wrap items-center gap-2 -mt-1">
              <span className="text-[11px] text-muted-foreground font-medium">Quick GST:</span>
              {[
                { label: "18% (Standard)", v: 18 },
                { label: "12%", v: 12 },
                { label: "5%", v: 5 },
                { label: "0% (Exempt)", v: 0 },
              ].map((g) => (
                <Button
                  key={g.v}
                  type="button"
                  size="sm"
                  variant={Number(form.tax_rate) === g.v ? "default" : "outline"}
                  className="h-7 text-[11px] px-2"
                  onClick={() => setForm((p) => ({ ...p, tax_rate: g.v }))}
                >
                  {g.label}
                </Button>
              ))}
              <span className="text-[10px] text-muted-foreground ml-auto">Auto-applied to subtotal in totals & PDF</span>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items</Label>
                <Button size="sm" variant="outline" onClick={() => setItems([...items, emptyItem()])}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-5" placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                    <Input className="col-span-2" placeholder="HSN" value={item.hsn} onChange={(e) => updateItem(idx, { hsn: e.target.value })} />
                    <Input className="col-span-1" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                    <Input className="col-span-2" type="number" placeholder="Rate" value={item.rate} onChange={(e) => updateItem(idx, { rate: Number(e.target.value) })} />
                    <span className="col-span-1 text-xs font-medium text-right">{fmt(item.amount)}</span>
                    <Button size="icon" variant="ghost" className="col-span-1 text-destructive h-8 w-8" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Discount</Label><Input type="number" value={form.discount_amount || 0} onChange={(e) => setForm((p) => ({ ...p, discount_amount: Number(e.target.value) }))} /></div>
              <div><Label>Amount Paid</Label><Input type="number" value={form.amount_paid || 0} onChange={(e) => setForm((p) => ({ ...p, amount_paid: Number(e.target.value) }))} /></div>
            </div>

            <div><Label>Notes</Label><Textarea rows={2} value={form.notes || ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
            <div><Label>Terms (overrides vertical default)</Label><Textarea rows={2} value={form.terms || ""} placeholder={branding?.default_terms || "Vertical default terms will be used"} onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))} /></div>
          </CardContent>
        </Card>

        {/* ── LIVE PREVIEW ── */}
        <Card className="lg:sticky lg:top-4 self-start">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-3 border-b bg-muted/40">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Eye className="h-4 w-4" /> Live Preview
              </div>
              {branding && (
                <Badge variant="outline" className="text-xs">
                  {branding.vertical_label || branding.vertical_slug}
                </Badge>
              )}
            </div>
            <ScrollArea className="h-[680px]">
              <InvoicePreview
                branding={branding}
                form={form}
                items={items}
                subtotal={subtotal}
                tax={tax}
                taxRate={taxRate}
                discount={discount}
                total={total}
                paid={paid}
                balance={balance}
                verticalLabel={verticalLabel}
              />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─────────────── Live HTML preview that mirrors the branded PDF
const InvoicePreview = ({
  branding,
  form,
  items,
  subtotal,
  tax,
  taxRate,
  discount,
  total,
  paid,
  balance,
  verticalLabel,
}: {
  branding: ResolvedBranding | null;
  form: Record<string, any>;
  items: Item[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
  verticalLabel: string;
}) => {
  const primary = branding?.brand_primary_color || "#0F172A";
  const accent = branding?.brand_accent_color || "#3B82F6";

  return (
    <div className="bg-white text-slate-900 p-6 text-[11px] leading-snug shadow-sm m-3 rounded-md min-h-[640px]">
      {/* Header band */}
      <div className="flex items-center justify-between px-4 py-3 -mx-6 -mt-6 mb-4" style={{ background: primary, color: "#fff" }}>
        <div className="flex items-center gap-3">
          {branding?.logo_url && <img src={branding.logo_url} alt="logo" className="h-10 w-10 object-contain bg-white rounded p-0.5" />}
          <div>
            <div className="font-bold text-lg leading-tight">{branding?.company_name || "Grabyourcar"}</div>
            {branding?.company_tagline && <div className="text-[9px] opacity-80">{branding.company_tagline}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-base">TAX INVOICE</div>
          <div className="text-[9px] opacity-90">{form.invoice_number || "INV-PREVIEW"}</div>
        </div>
      </div>
      <div style={{ background: accent, height: 3 }} className="-mx-6 mb-4" />

      {/* Doc meta */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div><div className="text-[9px] uppercase text-slate-500">Date</div><div className="font-semibold">{form.invoice_date}</div></div>
        {form.due_date && <div><div className="text-[9px] uppercase text-slate-500">Due Date</div><div className="font-semibold">{form.due_date}</div></div>}
        <div><div className="text-[9px] uppercase text-slate-500">Vertical</div><div className="font-semibold">{verticalLabel}</div></div>
      </div>

      {/* Bill To */}
      <div className="mb-4 p-3 rounded border" style={{ borderColor: `${accent}40` }}>
        <div className="text-[9px] uppercase text-slate-500 mb-1">Bill To</div>
        <div className="font-bold text-[12px]">{form.client_name || "—"}</div>
        {form.client_address && <div className="text-slate-600">{form.client_address}</div>}
        {form.client_phone && <div className="text-slate-600">📞 {form.client_phone}</div>}
        {form.client_email && <div className="text-slate-600">✉ {form.client_email}</div>}
        {form.gstin && <div className="text-slate-600">GSTIN: {form.gstin}</div>}
      </div>

      {/* Items */}
      <table className="w-full text-[10px] mb-4">
        <thead>
          <tr style={{ background: primary, color: "#fff" }}>
            <th className="text-left p-1.5">#</th>
            <th className="text-left p-1.5">Description</th>
            <th className="text-left p-1.5">HSN</th>
            <th className="text-right p-1.5">Qty</th>
            <th className="text-right p-1.5">Rate</th>
            <th className="text-right p-1.5">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-b border-slate-200">
              <td className="p-1.5">{i + 1}</td>
              <td className="p-1.5">{it.description || "—"}</td>
              <td className="p-1.5">{it.hsn || "—"}</td>
              <td className="text-right p-1.5">{it.quantity}</td>
              <td className="text-right p-1.5">{fmt(it.rate)}</td>
              <td className="text-right p-1.5 font-medium">{fmt(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="ml-auto w-1/2 space-y-1">
        <Row label="Subtotal" value={fmt(subtotal)} />
        {discount > 0 && <Row label="Discount" value={`- ${fmt(discount)}`} />}
        {tax > 0 && <Row label={`GST (${taxRate}%)`} value={fmt(tax)} />}
        <div className="flex justify-between items-center px-3 py-2 rounded text-white font-bold" style={{ background: primary }}>
          <span>TOTAL</span>
          <span>{fmt(total)}</span>
        </div>
        {paid > 0 && (
          <>
            <Row label="Paid" value={fmt(paid)} />
            <Row label="Balance Due" value={fmt(balance)} bold />
          </>
        )}
      </div>

      {/* Notes / Terms */}
      {(form.notes || form.terms || branding?.default_terms) && (
        <div className="mt-5 space-y-2">
          {form.notes && (
            <div>
              <div className="text-[9px] uppercase text-slate-500">Notes</div>
              <div className="text-slate-700 whitespace-pre-wrap">{form.notes}</div>
            </div>
          )}
          {(form.terms || branding?.default_terms) && (
            <div>
              <div className="text-[9px] uppercase text-slate-500">Terms & Conditions</div>
              <div className="text-slate-700 whitespace-pre-wrap text-[9.5px]">{form.terms || branding?.default_terms}</div>
            </div>
          )}
        </div>
      )}

      {/* Bank */}
      {branding?.bank?.account_number && (
        <div className="mt-5 p-3 rounded text-[9.5px]" style={{ background: `${accent}10` }}>
          <div className="text-[9px] uppercase text-slate-500 mb-1">Payment Details</div>
          <div>Bank: {branding.bank.name} | A/c: {branding.bank.account_number} | IFSC: {branding.bank.ifsc}</div>
          {branding.bank.upi_id && <div>UPI: {branding.bank.upi_id}</div>}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-3 border-t text-center text-slate-500 text-[9px]">
        {branding?.footer_text || "Thank you for your business."}
        <div className="mt-1">
          {branding?.phone} {branding?.email && `• ${branding.email}`} {branding?.website && `• ${branding.website}`}
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className={`flex justify-between text-[10.5px] px-3 ${bold ? "font-bold" : ""}`}>
    <span className="text-slate-600">{label}</span>
    <span>{value}</span>
  </div>
);

export default PremiumInvoiceStudio;
