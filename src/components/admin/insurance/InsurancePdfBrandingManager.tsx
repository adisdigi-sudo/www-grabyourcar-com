import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_INSURANCE_PDF_BRANDING,
  type InsurancePdfBrandingSettings,
  saveInsurancePdfBrandingCache,
} from "@/lib/insurancePdfBranding";

type LogoRow = {
  id: string;
  company: string;
  logoUrl: string;
};

const makeRow = (company = "", logoUrl = ""): LogoRow => ({
  id: crypto.randomUUID(),
  company,
  logoUrl,
});

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function InsurancePdfBrandingManager() {
  const queryClient = useQueryClient();
  const brandLogoRef = useRef<HTMLInputElement>(null);
  const [brandName, setBrandName] = useState(DEFAULT_INSURANCE_PDF_BRANDING.brandName);
  const [brandTagline, setBrandTagline] = useState(DEFAULT_INSURANCE_PDF_BRANDING.brandTagline);
  const [grabyourcarLogoUrl, setGrabyourcarLogoUrl] = useState("");
  const [rows, setRows] = useState<LogoRow[]>([]);

  const { data } = useQuery({
    queryKey: ["insurance-pdf-branding"],
    queryFn: async () => {
      const { data: settings, error } = await supabase
        .from("admin_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["insurance_pdf_branding", "branding_settings"]);

      if (error) throw error;
      return settings || [];
    },
  });

  useEffect(() => {
    const pdfBranding = data?.find((item) => item.setting_key === "insurance_pdf_branding")?.setting_value as Partial<InsurancePdfBrandingSettings> | undefined;
    const siteBranding = data?.find((item) => item.setting_key === "branding_settings")?.setting_value as Record<string, string> | undefined;

    const nextSettings: InsurancePdfBrandingSettings = {
      brandName: pdfBranding?.brandName || DEFAULT_INSURANCE_PDF_BRANDING.brandName,
      brandTagline: pdfBranding?.brandTagline || DEFAULT_INSURANCE_PDF_BRANDING.brandTagline,
      grabyourcarLogoUrl: pdfBranding?.grabyourcarLogoUrl || siteBranding?.logo_url || "",
      insurerLogos: pdfBranding?.insurerLogos || {},
    };

    setBrandName(nextSettings.brandName);
    setBrandTagline(nextSettings.brandTagline);
    setGrabyourcarLogoUrl(nextSettings.grabyourcarLogoUrl);
    setRows(
      Object.entries(nextSettings.insurerLogos).map(([company, logoUrl]) => makeRow(company, logoUrl))
    );
    saveInsurancePdfBrandingCache(nextSettings);
  }, [data]);

  const settingsPayload = useMemo<InsurancePdfBrandingSettings>(() => ({
    brandName: brandName.trim() || DEFAULT_INSURANCE_PDF_BRANDING.brandName,
    brandTagline: brandTagline.trim() || DEFAULT_INSURANCE_PDF_BRANDING.brandTagline,
    grabyourcarLogoUrl: grabyourcarLogoUrl.trim(),
    insurerLogos: rows.reduce<Record<string, string>>((acc, row) => {
      if (row.company.trim() && row.logoUrl.trim()) {
        acc[row.company.trim()] = row.logoUrl.trim();
      }
      return acc;
    }, {}),
  }), [brandName, brandTagline, grabyourcarLogoUrl, rows]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admin_settings").upsert({
        setting_key: "insurance_pdf_branding",
        setting_value: settingsPayload as any,
        description: "Insurance PDF brand logo and insurer logo mapping",
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      saveInsurancePdfBrandingCache(settingsPayload);
      queryClient.invalidateQueries({ queryKey: ["insurance-pdf-branding"] });
      toast.success("Insurance PDF branding saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateRow = (id: string, patch: Partial<LogoRow>) => {
    setRows((prev) => prev.map((row) => row.id === id ? { ...row, ...patch } : row));
  };

  const uploadBrandLogo = async (file?: File | null) => {
    if (!file) return;
    setGrabyourcarLogoUrl(await fileToDataUrl(file));
    toast.success("Brand logo ready. Save to apply everywhere.");
  };

  const uploadInsurerLogo = async (id: string, file?: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    updateRow(id, { logoUrl: dataUrl });
    toast.success("Insurer logo ready. Save to apply everywhere.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insurance PDF Branding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Brand name in PDF</Label>
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="GRABYOURCAR" />
          </div>
          <div className="space-y-2">
            <Label>Brand tagline</Label>
            <Input value={brandTagline} onChange={(e) => setBrandTagline(e.target.value)} placeholder="India's Smarter Way to Buy New Cars" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Grabyourcar logo</Label>
          <div className="flex flex-col gap-2 md:flex-row">
            <Input value={grabyourcarLogoUrl} onChange={(e) => setGrabyourcarLogoUrl(e.target.value)} placeholder="Paste image URL or upload logo" />
            <input
              ref={brandLogoRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => uploadBrandLogo(e.target.files?.[0])}
            />
            <Button type="button" variant="outline" className="gap-2" onClick={() => brandLogoRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Insurance company logos</Label>
              <p className="text-xs text-muted-foreground">These logos will appear in every quote PDF based on insurer name.</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setRows((prev) => [...prev, makeRow()])}>
              <Plus className="h-4 w-4" /> Add insurer logo
            </Button>
          </div>

          <div className="space-y-3">
            {rows.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No insurer logos added yet.
              </div>
            )}

            {rows.map((row) => (
              <InsurerLogoRow
                key={row.id}
                row={row}
                onChange={updateRow}
                onDelete={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                onUpload={uploadInsurerLogo}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            <Save className="h-4 w-4" /> Save PDF branding
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InsurerLogoRow({
  row,
  onChange,
  onDelete,
  onUpload,
}: {
  row: LogoRow;
  onChange: (id: string, patch: Partial<LogoRow>) => void;
  onDelete: () => void;
  onUpload: (id: string, file?: File | null) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border p-3 space-y-3">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-2">
          <Label>Insurance company</Label>
          <Input value={row.company} onChange={(e) => onChange(row.id, { company: e.target.value })} placeholder="Future Generali General Insurance Ltd" />
        </div>
        <div className="space-y-2">
          <Label>Logo URL / uploaded data</Label>
          <Input value={row.logoUrl} onChange={(e) => onChange(row.id, { logoUrl: e.target.value })} placeholder="Paste insurer logo URL or upload image" />
        </div>
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onUpload(row.id, e.target.files?.[0])}
          />
          <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
