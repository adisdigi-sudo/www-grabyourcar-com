/**
 * Per-Vertical PDF Settings Editor — Turn 5
 *
 * Side-by-side editor with:
 *  • Vertical picker (Insurance, Sales, Loans, HSRP, Self-Drive, Accessories, etc.)
 *  • Override: brand color, accent, logo, signature, footer, terms
 *  • Document types this vertical generates (quote, invoice, proposal, etc.)
 *  • Section toggles + drag-reorder (header → footer)
 *  • Custom fields editor
 *  • Live preview that reflects vertical overrides on top of global branding
 *  • Save / Reset / Delete per vertical
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Save,
  Upload,
  Loader2,
  Palette,
  FileText,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  GripVertical,
  Plus,
  Trash2,
  RotateCcw,
  Building2,
  Settings,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { clearBrandingCache } from "@/lib/pdf";
import { PdfBrandingPreview } from "./PdfBrandingPreview";
import { PreviewViewport } from "./PreviewViewport";
import type { PdfTemplateSection, PdfCustomField } from "@/lib/pdf/types";

const STORAGE_BUCKET = "pdf-branding-assets";

const DEFAULT_SECTIONS: PdfTemplateSection[] = [
  { id: "header", type: "header", label: "Brand Header", enabled: true, order: 1 },
  { id: "doc_meta", type: "doc_meta", label: "Document Number & Date", enabled: true, order: 2 },
  { id: "customer", type: "customer", label: "Customer Details", enabled: true, order: 3 },
  { id: "vehicle", type: "vehicle", label: "Vehicle / Item Details", enabled: true, order: 4 },
  { id: "items", type: "items", label: "Line Items / Pricing Table", enabled: true, order: 5 },
  { id: "totals", type: "totals", label: "Totals & Tax", enabled: true, order: 6 },
  { id: "notes", type: "notes", label: "Notes", enabled: true, order: 7 },
  { id: "terms", type: "terms", label: "Terms & Conditions", enabled: true, order: 8 },
  { id: "bank", type: "bank", label: "Bank / Payment Details", enabled: false, order: 9 },
  { id: "signature", type: "signature", label: "Signature Block", enabled: true, order: 10 },
  { id: "footer", type: "footer", label: "Footer & Social", enabled: true, order: 11 },
];

const DOC_TYPE_LIBRARY: Record<string, string[]> = {
  insurance: ["quote", "policy", "renewal_reminder", "claim_acknowledgement", "endorsement"],
  sales: ["quote", "proforma_invoice", "booking_confirmation", "delivery_note", "tax_invoice"],
  loans: ["loan_quote", "comparison_sheet", "sanction_letter", "disbursal_voucher"],
  hsrp: ["booking_receipt", "service_invoice", "fitment_certificate"],
  rental: ["rental_quote", "agreement", "invoice", "damage_report"],
  accessories: ["quote", "tax_invoice", "shipping_label", "warranty_card"],
  marketing: ["proposal", "report"],
  "car-database": ["spec_sheet", "comparison"],
  "dealer-network": ["partner_invoice", "commission_statement"],
  accounts: ["invoice", "receipt", "credit_note", "debit_note"],
  hr: ["offer_letter", "salary_slip", "experience_letter", "appointment_letter"],
};

interface VerticalRecord {
  id: string;
  slug: string;
  name: string;
  color?: string | null;
}

interface VerticalSettingsForm {
  id?: string;
  vertical_slug: string;
  vertical_label: string;
  document_types: string[];
  override_brand_color: string;
  override_accent_color: string;
  override_logo_url: string;
  override_signature_url: string;
  override_signature_name: string;
  override_footer_text: string;
  override_terms: string;
  template_sections: PdfTemplateSection[];
  custom_fields: PdfCustomField[];
  is_active: boolean;
}

const emptyForm = (slug: string, label: string): VerticalSettingsForm => ({
  vertical_slug: slug,
  vertical_label: label,
  document_types: DOC_TYPE_LIBRARY[slug] ?? ["quote", "invoice"],
  override_brand_color: "",
  override_accent_color: "",
  override_logo_url: "",
  override_signature_url: "",
  override_signature_name: "",
  override_footer_text: "",
  override_terms: "",
  template_sections: DEFAULT_SECTIONS,
  custom_fields: [],
  is_active: true,
});

export function PdfVerticalSettingsEditor() {
  const queryClient = useQueryClient();
  const [selectedSlug, setSelectedSlug] = useState<string>("insurance");
  const [activeTab, setActiveTab] = useState("overrides");
  const [form, setForm] = useState<VerticalSettingsForm>(emptyForm("insurance", "Insurance"));

  // Load active verticals
  const { data: verticals = [] } = useQuery({
    queryKey: ["business-verticals-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_verticals")
        .select("id, slug, name, color")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as VerticalRecord[];
    },
  });

  // Load global branding (for preview merging)
  const { data: globalBranding } = useQuery({
    queryKey: ["pdf-global-branding"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pdf_global_branding")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  // Load this vertical's settings
  const { data: verticalSettings, isLoading } = useQuery({
    queryKey: ["pdf-vertical-settings", selectedSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdf_vertical_settings")
        .select("*")
        .eq("vertical_slug", selectedSlug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSlug,
  });

  // Sync form whenever the selected vertical changes / loads
  useEffect(() => {
    const v = verticals.find((v) => v.slug === selectedSlug);
    const label = v?.name ?? selectedSlug;
    if (verticalSettings) {
      setForm({
        id: (verticalSettings as any).id,
        vertical_slug: (verticalSettings as any).vertical_slug,
        vertical_label: (verticalSettings as any).vertical_label || label,
        document_types: (verticalSettings as any).document_types ?? DOC_TYPE_LIBRARY[selectedSlug] ?? [],
        override_brand_color: (verticalSettings as any).override_brand_color ?? "",
        override_accent_color: (verticalSettings as any).override_accent_color ?? "",
        override_logo_url: (verticalSettings as any).override_logo_url ?? "",
        override_signature_url: (verticalSettings as any).override_signature_url ?? "",
        override_signature_name: (verticalSettings as any).override_signature_name ?? "",
        override_footer_text: (verticalSettings as any).override_footer_text ?? "",
        override_terms: (verticalSettings as any).override_terms ?? "",
        template_sections:
          ((verticalSettings as any).template_sections as PdfTemplateSection[]) ?? DEFAULT_SECTIONS,
        custom_fields:
          ((verticalSettings as any).custom_fields as PdfCustomField[]) ?? [],
        is_active: (verticalSettings as any).is_active ?? true,
      });
    } else {
      setForm(emptyForm(selectedSlug, label));
    }
  }, [verticalSettings, selectedSlug, verticals]);

  // Save mutation (upsert)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        vertical_slug: form.vertical_slug,
        vertical_label: form.vertical_label,
        document_types: form.document_types,
        override_brand_color: form.override_brand_color || null,
        override_accent_color: form.override_accent_color || null,
        override_logo_url: form.override_logo_url || null,
        override_signature_url: form.override_signature_url || null,
        override_signature_name: form.override_signature_name || null,
        override_footer_text: form.override_footer_text || null,
        override_terms: form.override_terms || null,
        template_sections: form.template_sections,
        custom_fields: form.custom_fields,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };
      if (form.id) {
        const { error } = await supabase
          .from("pdf_vertical_settings")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("pdf_vertical_settings")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setForm((f) => ({ ...f, id: inserted.id }));
      }
    },
    onSuccess: () => {
      clearBrandingCache();
      queryClient.invalidateQueries({ queryKey: ["pdf-vertical-settings", selectedSlug] });
      toast.success(`${form.vertical_label} PDF settings saved — applied immediately`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!form.id) return;
      const { error } = await supabase.from("pdf_vertical_settings").delete().eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      clearBrandingCache();
      queryClient.invalidateQueries({ queryKey: ["pdf-vertical-settings", selectedSlug] });
      const v = verticals.find((v) => v.slug === selectedSlug);
      setForm(emptyForm(selectedSlug, v?.name ?? selectedSlug));
      toast.success("Reset to global defaults");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = <K extends keyof VerticalSettingsForm>(key: K, value: VerticalSettingsForm[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  // Section reorder helpers
  const moveSection = (index: number, dir: -1 | 1) => {
    const next = [...form.template_sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((s, i) => (s.order = i + 1));
    update("template_sections", next);
  };

  const toggleSection = (id: string, enabled: boolean) => {
    const next = form.template_sections.map((s) => (s.id === id ? { ...s, enabled } : s));
    update("template_sections", next);
  };

  const toggleDocType = (type: string) => {
    const has = form.document_types.includes(type);
    update("document_types", has ? form.document_types.filter((t) => t !== type) : [...form.document_types, type]);
  };

  // Build merged preview branding (vertical overrides → global → defaults)
  const previewBranding = useMemo(() => {
    const g = globalBranding ?? {};
    return {
      company_name: g.company_name || "Grabyourcar",
      company_tagline: g.company_tagline || "India's Trusted Auto Partner",
      logo_url: form.override_logo_url || g.logo_url || "",
      signature_url: form.override_signature_url || g.signature_url || "",
      signature_name: form.override_signature_name || g.signature_name || "Authorised Signatory",
      brand_primary_color: form.override_brand_color || g.brand_primary_color || "#0F172A",
      brand_accent_color: form.override_accent_color || g.brand_accent_color || "#3B82F6",
      brand_text_color: g.brand_text_color || "#1F2937",
      brand_muted_color: g.brand_muted_color || "#6B7280",
      address_line1: g.address_line1 || "",
      address_line2: g.address_line2 || "",
      city: g.city || "Chandigarh",
      state: g.state || "Punjab",
      pincode: g.pincode || "",
      phone: g.phone || "+91 98559 24442",
      email: g.email || "support@grabyourcar.com",
      website: g.website || "www.grabyourcar.com",
      gstin: g.gstin || "",
      footer_text: form.override_footer_text || g.footer_text || "Thank you for choosing Grabyourcar.",
    };
  }, [form, globalBranding]);

  const docTypeLib = DOC_TYPE_LIBRARY[selectedSlug] ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Per-Vertical PDF Settings</h1>
          <p className="text-sm text-muted-foreground">
            Customise PDFs for each business vertical. Overrides are layered on top of global branding.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {form.id && (
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Reset to global defaults? This deletes vertical overrides.")) {
                  resetMutation.mutate();
                }
              }}
              disabled={resetMutation.isPending}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save {form.vertical_label} Settings
          </Button>
        </div>
      </div>

      {/* Vertical Switcher */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="mr-2 flex items-center gap-1 text-sm font-semibold">
              <Building2 className="h-4 w-4" /> Vertical:
            </Label>
            {verticals.map((v) => (
              <Button
                key={v.slug}
                size="sm"
                variant={selectedSlug === v.slug ? "default" : "outline"}
                onClick={() => setSelectedSlug(v.slug)}
                className="gap-1.5"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: v.color || "#3B82F6" }}
                />
                {v.name}
                {form.id && form.vertical_slug === v.slug && (
                  <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px]">
                    Custom
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Side-by-side editor + preview */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.1fr_1fr]">
        {/* LEFT — Editor */}
        <Card>
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overrides" className="gap-1.5">
                  <Palette className="h-3.5 w-3.5" /> Overrides
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Documents
                </TabsTrigger>
                <TabsTrigger value="sections" className="gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Sections
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Custom Fields
                </TabsTrigger>
              </TabsList>

              {/* OVERRIDES */}
              <TabsContent value="overrides" className="space-y-4 pt-4">
                <SectionHeading
                  title="Brand overrides"
                  desc="Leave blank to inherit from global branding. Filled values win."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <ColorField
                    label="Primary color override"
                    value={form.override_brand_color}
                    onChange={(v) => update("override_brand_color", v)}
                    placeholder={globalBranding?.brand_primary_color}
                  />
                  <ColorField
                    label="Accent color override"
                    value={form.override_accent_color}
                    onChange={(v) => update("override_accent_color", v)}
                    placeholder={globalBranding?.brand_accent_color}
                  />
                </div>

                <Separator />
                <SectionHeading title="Vertical-specific assets" desc="Override logo or signature for this vertical only." />
                <div className="grid gap-4 md:grid-cols-2">
                  <AssetUploader
                    label="Logo override"
                    value={form.override_logo_url}
                    onChange={(url) => update("override_logo_url", url)}
                    pathPrefix={`vertical-${selectedSlug}/logos`}
                  />
                  <AssetUploader
                    label="Signature override"
                    value={form.override_signature_url}
                    onChange={(url) => update("override_signature_url", url)}
                    pathPrefix={`vertical-${selectedSlug}/signatures`}
                  />
                </div>
                <Field label="Signature name override (e.g. Insurance Manager)">
                  <Input
                    value={form.override_signature_name}
                    onChange={(e) => update("override_signature_name", e.target.value)}
                    placeholder={globalBranding?.signature_name || "Authorised Signatory"}
                  />
                </Field>

                <Separator />
                <SectionHeading title="Footer & terms overrides" desc="Vertical-specific compliance language." />
                <Field label="Footer text override">
                  <Textarea
                    value={form.override_footer_text}
                    onChange={(e) => update("override_footer_text", e.target.value)}
                    rows={2}
                    placeholder={globalBranding?.footer_text || ""}
                  />
                </Field>
                <Field label="Terms & conditions override">
                  <Textarea
                    value={form.override_terms}
                    onChange={(e) => update("override_terms", e.target.value)}
                    rows={6}
                    placeholder={globalBranding?.default_terms || ""}
                  />
                </Field>
              </TabsContent>

              {/* DOCUMENTS */}
              <TabsContent value="documents" className="space-y-4 pt-4">
                <SectionHeading
                  title="Document types"
                  desc="Toggle which PDF document types this vertical generates."
                />
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {[...new Set([...docTypeLib, ...form.document_types])].map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3 hover:bg-muted/40 cursor-pointer"
                    >
                      <Switch
                        checked={form.document_types.includes(type)}
                        onCheckedChange={() => toggleDocType(type)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium capitalize">
                          {type.replace(/_/g, " ")}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{type}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <Separator />
                <SectionHeading title="Add custom document type" />
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. warranty_extension"
                    id="new-doctype"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = (e.target as HTMLInputElement).value.trim().toLowerCase().replace(/\s+/g, "_");
                        if (v && !form.document_types.includes(v)) {
                          update("document_types", [...form.document_types, v]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const el = document.getElementById("new-doctype") as HTMLInputElement | null;
                      const v = el?.value.trim().toLowerCase().replace(/\s+/g, "_");
                      if (v && !form.document_types.includes(v)) {
                        update("document_types", [...form.document_types, v]);
                        if (el) el.value = "";
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* SECTIONS */}
              <TabsContent value="sections" className="space-y-3 pt-4">
                <SectionHeading
                  title="PDF sections (drag to reorder)"
                  desc="Toggle visibility and reorder how each section appears in the PDF."
                />
                <div className="space-y-2">
                  {form.template_sections
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((section, idx) => (
                      <div
                        key={section.id}
                        className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3"
                      >
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveSection(idx, -1)}
                            disabled={idx === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            title="Move up"
                          >
                            ▲
                          </button>
                          <GripVertical className="h-3 w-3 text-muted-foreground" />
                          <button
                            type="button"
                            onClick={() => moveSection(idx, +1)}
                            disabled={idx === form.template_sections.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            title="Move down"
                          >
                            ▼
                          </button>
                        </div>
                        <Badge variant="outline" className="font-mono">
                          {section.order}
                        </Badge>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{section.label}</div>
                          <div className="text-[11px] text-muted-foreground">{section.type}</div>
                        </div>
                        <Switch
                          checked={section.enabled}
                          onCheckedChange={(v) => toggleSection(section.id, v)}
                        />
                      </div>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => update("template_sections", DEFAULT_SECTIONS)}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset sections to default order
                </Button>
              </TabsContent>

              {/* CUSTOM FIELDS */}
              <TabsContent value="custom" className="space-y-4 pt-4">
                <SectionHeading
                  title="Custom fields"
                  desc="Inject key/value pairs into the PDF (e.g. Policy Number, RTO Code, Loan Reference)."
                />
                <div className="space-y-2">
                  {form.custom_fields.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No custom fields. Add one below.</p>
                  )}
                  {form.custom_fields.map((field, idx) => (
                    <div key={idx} className="grid gap-2 rounded-lg border bg-muted/20 p-3 md:grid-cols-[1fr_1fr_180px_auto]">
                      <Input
                        placeholder="Key (e.g. policy_number)"
                        value={field.key}
                        onChange={(e) => {
                          const next = [...form.custom_fields];
                          next[idx] = { ...field, key: e.target.value.toLowerCase().replace(/\s+/g, "_") };
                          update("custom_fields", next);
                        }}
                      />
                      <Input
                        placeholder="Label (e.g. Policy Number)"
                        value={field.label}
                        onChange={(e) => {
                          const next = [...form.custom_fields];
                          next[idx] = { ...field, label: e.target.value };
                          update("custom_fields", next);
                        }}
                      />
                      <Select
                        value={field.position || "after_customer"}
                        onValueChange={(v) => {
                          const next = [...form.custom_fields];
                          next[idx] = { ...field, position: v as any };
                          update("custom_fields", next);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">In Header</SelectItem>
                          <SelectItem value="after_customer">After Customer</SelectItem>
                          <SelectItem value="after_items">After Items</SelectItem>
                          <SelectItem value="footer">In Footer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          update(
                            "custom_fields",
                            form.custom_fields.filter((_, i) => i !== idx)
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() =>
                    update("custom_fields", [
                      ...form.custom_fields,
                      { key: "", label: "", position: "after_customer" },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" /> Add Custom Field
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* RIGHT — Live Preview */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-primary" /> Live Preview
              </CardTitle>
              <CardDescription className="text-xs">
                Reflects {form.vertical_label} overrides on top of global branding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-3">
              <PreviewViewport label={`${form.vertical_label} · A4`}>
                <PdfBrandingPreview branding={previewBranding} />
              </PreviewViewport>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Document types:</span>
                  <Badge variant="secondary">{form.document_types.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active sections:</span>
                  <Badge variant="secondary">
                    {form.template_sections.filter((s) => s.enabled).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Custom fields:</span>
                  <Badge variant="secondary">{form.custom_fields.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ───── helpers ───── */

function SectionHeading({ title, desc }: { title: string; desc?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || placeholder || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ? `Inherit: ${placeholder}` : ""}
          className="font-mono text-xs"
        />
        {value && (
          <Button variant="ghost" size="icon" onClick={() => onChange("")} title="Clear override">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function AssetUploader({
  label,
  value,
  onChange,
  pathPrefix,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  pathPrefix: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success(`${label} uploaded`);
    } catch (e: any) {
      toast.error(`${label} upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex h-24 items-center justify-center rounded-md border border-dashed bg-background">
        {value ? (
          <img src={value} alt={label} className="max-h-20 max-w-full object-contain" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste URL or upload"
        className="text-xs"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files?.[0])}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        {value && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange("")}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
