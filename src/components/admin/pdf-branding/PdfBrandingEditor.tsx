/**
 * PDF Branding Editor — Turn 4
 * Edit the global PDF branding row (pdf_global_branding table).
 * All saved changes apply automatically to every PDF across the platform
 * (Insurance, Sales, Loans, HSRP, Self-Drive, Accessories) via the
 * UnifiedPdfRenderer + brandingBridge.
 */

import { useEffect, useRef, useState } from "react";
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
import {
  Save,
  Upload,
  Loader2,
  Palette,
  Building2,
  Phone,
  Banknote,
  FileText,
  Eye,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { clearBrandingCache } from "@/lib/pdf";
import { PdfBrandingPreview } from "./PdfBrandingPreview";
import { PreviewViewport } from "./PreviewViewport";

const STORAGE_BUCKET = "pdf-branding-assets";

type GlobalBrandingForm = {
  id?: string;
  company_name: string;
  company_tagline: string;
  logo_url: string;
  watermark_url: string;
  signature_url: string;
  signature_name: string;
  brand_primary_color: string;
  brand_accent_color: string;
  brand_text_color: string;
  brand_muted_color: string;
  font_heading: string;
  font_body: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  alt_phone: string;
  email: string;
  website: string;
  gstin: string;
  pan: string;
  cin: string;
  irdai_license: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  bank_branch: string;
  upi_id: string;
  footer_text: string;
  default_terms: string;
  page_size: string;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  show_watermark: boolean;
  show_qr_footer: boolean;
};

const EMPTY_FORM: GlobalBrandingForm = {
  company_name: "Grabyourcar",
  company_tagline: "India's Trusted Auto Partner",
  logo_url: "",
  watermark_url: "",
  signature_url: "",
  signature_name: "Authorised Signatory",
  brand_primary_color: "#0F172A",
  brand_accent_color: "#3B82F6",
  brand_text_color: "#1F2937",
  brand_muted_color: "#6B7280",
  font_heading: "Helvetica-Bold",
  font_body: "Helvetica",
  address_line1: "",
  address_line2: "",
  city: "Chandigarh",
  state: "Punjab",
  pincode: "",
  phone: "+91 98559 24442",
  alt_phone: "",
  email: "support@grabyourcar.com",
  website: "www.grabyourcar.com",
  gstin: "",
  pan: "",
  cin: "",
  irdai_license: "",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  bank_ifsc: "",
  bank_branch: "",
  upi_id: "",
  footer_text: "Thank you for choosing Grabyourcar.",
  default_terms: "All transactions are subject to Grabyourcar terms & conditions. E&OE.",
  page_size: "a4",
  margin_top: 14,
  margin_bottom: 14,
  margin_left: 12,
  margin_right: 12,
  show_watermark: false,
  show_qr_footer: true,
};

export function PdfBrandingEditor() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GlobalBrandingForm>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState("identity");

  const { data, isLoading } = useQuery({
    queryKey: ["pdf-global-branding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdf_global_branding")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({ ...EMPTY_FORM, ...(data as any) });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      // Strip empty strings to nulls for nullable cols
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });

      if (form.id) {
        const { error } = await supabase
          .from("pdf_global_branding")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("pdf_global_branding")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setForm((f) => ({ ...f, id: inserted.id }));
      }
    },
    onSuccess: () => {
      clearBrandingCache();
      queryClient.invalidateQueries({ queryKey: ["pdf-global-branding"] });
      toast.success("PDF branding saved — all PDFs will use new branding");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = <K extends keyof GlobalBrandingForm>(key: K, value: GlobalBrandingForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

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
          <h1 className="text-2xl font-bold tracking-tight">PDF Branding Editor</h1>
          <p className="text-sm text-muted-foreground">
            One source of truth for every PDF across the platform — Insurance, Sales, Loans, HSRP, Self-Drive, Accessories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <RefreshCw className="h-3 w-3" /> Live across all verticals
          </Badge>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Branding
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.1fr_1fr]">
        {/* LEFT — Tabbed Editor */}
        <Card>
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="identity" className="gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Identity
                </TabsTrigger>
                <TabsTrigger value="visuals" className="gap-1.5">
                  <Palette className="h-3.5 w-3.5" /> Visuals
                </TabsTrigger>
                <TabsTrigger value="contact" className="gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Contact
                </TabsTrigger>
                <TabsTrigger value="bank" className="gap-1.5">
                  <Banknote className="h-3.5 w-3.5" /> Bank
                </TabsTrigger>
                <TabsTrigger value="footer" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Legal
                </TabsTrigger>
              </TabsList>

              {/* IDENTITY */}
              <TabsContent value="identity" className="space-y-4 pt-4">
                <SectionHeading title="Brand identity" desc="Company name + tagline shown at the top of every PDF." />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Company name">
                    <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
                  </Field>
                  <Field label="Tagline">
                    <Input value={form.company_tagline} onChange={(e) => update("company_tagline", e.target.value)} />
                  </Field>
                </div>

                <Separator />
                <SectionHeading title="Compliance numbers" desc="Shown under the header where applicable." />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="GSTIN">
                    <Input value={form.gstin} onChange={(e) => update("gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" />
                  </Field>
                  <Field label="PAN">
                    <Input value={form.pan} onChange={(e) => update("pan", e.target.value)} />
                  </Field>
                  <Field label="CIN">
                    <Input value={form.cin} onChange={(e) => update("cin", e.target.value)} />
                  </Field>
                  <Field label="IRDAI License (insurance only)">
                    <Input value={form.irdai_license} onChange={(e) => update("irdai_license", e.target.value)} />
                  </Field>
                </div>
              </TabsContent>

              {/* VISUALS */}
              <TabsContent value="visuals" className="space-y-4 pt-4">
                <SectionHeading title="Logo & assets" desc="Upload PNG/SVG. Recommended logo size: 320×120px." />
                <div className="grid gap-4 md:grid-cols-3">
                  <AssetUploader
                    label="Logo"
                    value={form.logo_url}
                    onChange={(url) => update("logo_url", url)}
                    pathPrefix="logos"
                  />
                  <AssetUploader
                    label="Signature"
                    value={form.signature_url}
                    onChange={(url) => update("signature_url", url)}
                    pathPrefix="signatures"
                  />
                  <AssetUploader
                    label="Watermark"
                    value={form.watermark_url}
                    onChange={(url) => update("watermark_url", url)}
                    pathPrefix="watermarks"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Signature name">
                    <Input value={form.signature_name} onChange={(e) => update("signature_name", e.target.value)} />
                  </Field>
                  <div className="flex items-end gap-4">
                    <ToggleField
                      label="Show watermark"
                      checked={form.show_watermark}
                      onChange={(v) => update("show_watermark", v)}
                    />
                    <ToggleField
                      label="QR in footer"
                      checked={form.show_qr_footer}
                      onChange={(v) => update("show_qr_footer", v)}
                    />
                  </div>
                </div>

                <Separator />
                <SectionHeading title="Brand colors" desc="Used in headers, accent bands and table titles." />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <ColorField label="Primary" value={form.brand_primary_color} onChange={(v) => update("brand_primary_color", v)} />
                  <ColorField label="Accent" value={form.brand_accent_color} onChange={(v) => update("brand_accent_color", v)} />
                  <ColorField label="Text" value={form.brand_text_color} onChange={(v) => update("brand_text_color", v)} />
                  <ColorField label="Muted" value={form.brand_muted_color} onChange={(v) => update("brand_muted_color", v)} />
                </div>

                <Separator />
                <SectionHeading title="Layout" desc="Page size and margins (mm)." />
                <div className="grid gap-4 md:grid-cols-5">
                  <Field label="Page size">
                    <select
                      value={form.page_size}
                      onChange={(e) => update("page_size", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="a4">A4</option>
                      <option value="letter">Letter</option>
                    </select>
                  </Field>
                  <Field label="Top">
                    <Input type="number" value={form.margin_top} onChange={(e) => update("margin_top", Number(e.target.value))} />
                  </Field>
                  <Field label="Bottom">
                    <Input type="number" value={form.margin_bottom} onChange={(e) => update("margin_bottom", Number(e.target.value))} />
                  </Field>
                  <Field label="Left">
                    <Input type="number" value={form.margin_left} onChange={(e) => update("margin_left", Number(e.target.value))} />
                  </Field>
                  <Field label="Right">
                    <Input type="number" value={form.margin_right} onChange={(e) => update("margin_right", Number(e.target.value))} />
                  </Field>
                </div>
              </TabsContent>

              {/* CONTACT */}
              <TabsContent value="contact" className="space-y-4 pt-4">
                <SectionHeading title="Office address" desc="Shown in PDF footer / header band." />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Address line 1">
                    <Input value={form.address_line1} onChange={(e) => update("address_line1", e.target.value)} />
                  </Field>
                  <Field label="Address line 2">
                    <Input value={form.address_line2} onChange={(e) => update("address_line2", e.target.value)} />
                  </Field>
                  <Field label="City">
                    <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
                  </Field>
                  <Field label="State">
                    <Input value={form.state} onChange={(e) => update("state", e.target.value)} />
                  </Field>
                  <Field label="Pincode">
                    <Input value={form.pincode} onChange={(e) => update("pincode", e.target.value)} />
                  </Field>
                </div>
                <Separator />
                <SectionHeading title="Reach us" desc="Phones, email and website displayed on every document." />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Primary phone">
                    <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                  </Field>
                  <Field label="Alternate phone">
                    <Input value={form.alt_phone} onChange={(e) => update("alt_phone", e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <Input value={form.email} onChange={(e) => update("email", e.target.value)} />
                  </Field>
                  <Field label="Website">
                    <Input value={form.website} onChange={(e) => update("website", e.target.value)} />
                  </Field>
                </div>
              </TabsContent>

              {/* BANK */}
              <TabsContent value="bank" className="space-y-4 pt-4">
                <SectionHeading title="Bank & payment details" desc="Shown only on PDFs where bank section is enabled." />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Bank name">
                    <Input value={form.bank_name} onChange={(e) => update("bank_name", e.target.value)} />
                  </Field>
                  <Field label="Account name">
                    <Input value={form.bank_account_name} onChange={(e) => update("bank_account_name", e.target.value)} />
                  </Field>
                  <Field label="Account number">
                    <Input value={form.bank_account_number} onChange={(e) => update("bank_account_number", e.target.value)} />
                  </Field>
                  <Field label="IFSC">
                    <Input value={form.bank_ifsc} onChange={(e) => update("bank_ifsc", e.target.value)} />
                  </Field>
                  <Field label="Branch">
                    <Input value={form.bank_branch} onChange={(e) => update("bank_branch", e.target.value)} />
                  </Field>
                  <Field label="UPI ID">
                    <Input value={form.upi_id} onChange={(e) => update("upi_id", e.target.value)} placeholder="grabyourcar@upi" />
                  </Field>
                </div>
              </TabsContent>

              {/* FOOTER / LEGAL */}
              <TabsContent value="footer" className="space-y-4 pt-4">
                <SectionHeading title="Footer & terms" desc="Shown at the bottom of every PDF." />
                <Field label="Footer text">
                  <Textarea value={form.footer_text} onChange={(e) => update("footer_text", e.target.value)} rows={2} />
                </Field>
                <Field label="Default terms & conditions">
                  <Textarea value={form.default_terms} onChange={(e) => update("default_terms", e.target.value)} rows={6} />
                </Field>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* RIGHT — Live Preview */}
        <div className="space-y-4">
          <Card className="lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-primary" />
                Live Preview
              </CardTitle>
              <CardDescription className="text-xs">
                Updates instantly as you edit. Use zoom controls to inspect logo, header & footer.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <PreviewViewport label={`${form.company_name || "Brand"} · A4`}>
                <PdfBrandingPreview branding={form} />
              </PreviewViewport>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ────────── helpers ────────── */

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

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <Label className="text-xs cursor-pointer">{label}</Label>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
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
          // eslint-disable-next-line @next/next/no-img-element
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? "Uploading..." : "Upload"}
      </Button>
    </div>
  );
}
