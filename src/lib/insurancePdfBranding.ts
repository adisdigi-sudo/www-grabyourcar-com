export interface InsurancePdfBrandingSettings {
  brandName: string;
  brandTagline: string;
  grabyourcarLogoUrl: string;
  insurerLogos: Record<string, string>;
}

export const INSURANCE_PDF_BRANDING_STORAGE_KEY = "insurance_pdf_branding_cache";

export const DEFAULT_INSURANCE_PDF_BRANDING: InsurancePdfBrandingSettings = {
  brandName: "GRABYOURCAR",
  brandTagline: "India's Smarter Way to Buy New Cars",
  grabyourcarLogoUrl: "",
  insurerLogos: {},
};

export const normalizeInsuranceCompanyName = (value: string) =>
  (value || "")
    .toLowerCase()
    .replace(/\b(general|insurance|co|company|ltd|limited|and|allied|motor)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

export function saveInsurancePdfBrandingCache(settings: InsurancePdfBrandingSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INSURANCE_PDF_BRANDING_STORAGE_KEY, JSON.stringify(settings));
}

export function loadInsurancePdfBrandingCache(): InsurancePdfBrandingSettings {
  if (typeof window === "undefined") return DEFAULT_INSURANCE_PDF_BRANDING;

  try {
    const raw = window.localStorage.getItem(INSURANCE_PDF_BRANDING_STORAGE_KEY);
    if (!raw) return DEFAULT_INSURANCE_PDF_BRANDING;

    const parsed = JSON.parse(raw) as Partial<InsurancePdfBrandingSettings>;
    return {
      brandName: parsed.brandName || DEFAULT_INSURANCE_PDF_BRANDING.brandName,
      brandTagline: parsed.brandTagline || DEFAULT_INSURANCE_PDF_BRANDING.brandTagline,
      grabyourcarLogoUrl: parsed.grabyourcarLogoUrl || "",
      insurerLogos: parsed.insurerLogos || {},
    };
  } catch {
    return DEFAULT_INSURANCE_PDF_BRANDING;
  }
}

export function resolveInsurerLogo(
  insurerName: string,
  settings: InsurancePdfBrandingSettings,
): string {
  const exact = settings.insurerLogos[insurerName];
  if (exact) return exact;

  const normalizedTarget = normalizeInsuranceCompanyName(insurerName);
  if (!normalizedTarget) return "";

  const matchedEntry = Object.entries(settings.insurerLogos).find(([name]) => {
    const normalizedName = normalizeInsuranceCompanyName(name);
    return normalizedName === normalizedTarget
      || normalizedName.includes(normalizedTarget)
      || normalizedTarget.includes(normalizedName);
  });

  return matchedEntry?.[1] || "";
}
