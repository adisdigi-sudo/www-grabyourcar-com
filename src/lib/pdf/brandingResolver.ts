/**
 * Branding Resolver
 * Merges global branding + per-vertical overrides into a single ResolvedBranding object.
 * The renderer never reads the raw tables directly — only resolved branding.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  PdfGlobalBranding,
  PdfVerticalSettings,
  PdfTemplateSection,
  ResolvedBranding,
  PdfSocialLinks,
} from "./types";

// In-memory cache (5-minute TTL). Reset via clearBrandingCache() after edits.
const CACHE_TTL_MS = 5 * 60 * 1000;
let globalCache: { data: PdfGlobalBranding; ts: number } | null = null;
const verticalCache = new Map<string, { data: PdfVerticalSettings | null; ts: number }>();

export function clearBrandingCache() {
  globalCache = null;
  verticalCache.clear();
}

const FALLBACK_GLOBAL: PdfGlobalBranding = {
  id: "fallback",
  company_name: "Grabyourcar",
  company_tagline: "India's Trusted Auto Partner",
  logo_url: null,
  watermark_url: null,
  signature_url: null,
  signature_name: "Authorised Signatory",
  brand_primary_color: "#0F172A",
  brand_accent_color: "#3B82F6",
  brand_text_color: "#1F2937",
  brand_muted_color: "#6B7280",
  font_heading: "Helvetica-Bold",
  font_body: "Helvetica",
  address_line1: null,
  address_line2: null,
  city: "Chandigarh",
  state: "Punjab",
  pincode: null,
  phone: "+91 98559 24442",
  alt_phone: null,
  email: "support@grabyourcar.com",
  website: "www.grabyourcar.com",
  gstin: null,
  pan: null,
  cin: null,
  irdai_license: null,
  bank_name: null,
  bank_account_name: null,
  bank_account_number: null,
  bank_ifsc: null,
  bank_branch: null,
  upi_id: null,
  footer_text: "Thank you for choosing Grabyourcar.",
  default_terms: "All transactions are subject to Grabyourcar terms & conditions. E&OE.",
  social_links: {},
  page_size: "a4",
  margin_top: 14,
  margin_bottom: 14,
  margin_left: 12,
  margin_right: 12,
  show_watermark: false,
  show_qr_footer: true,
  is_active: true,
  updated_at: new Date().toISOString(),
};

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

async function fetchGlobalBranding(): Promise<PdfGlobalBranding> {
  if (globalCache && Date.now() - globalCache.ts < CACHE_TTL_MS) {
    return globalCache.data;
  }
  try {
    const { data, error } = await supabase
      .from("pdf_global_branding")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return FALLBACK_GLOBAL;
    }
    const normalised: PdfGlobalBranding = {
      ...(data as any),
      social_links: (data as any).social_links ?? {},
    };
    globalCache = { data: normalised, ts: Date.now() };
    return normalised;
  } catch {
    return FALLBACK_GLOBAL;
  }
}

async function fetchVerticalSettings(slug: string): Promise<PdfVerticalSettings | null> {
  const cached = verticalCache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }
  try {
    const { data, error } = await supabase
      .from("pdf_vertical_settings")
      .select("*")
      .eq("vertical_slug", slug)
      .maybeSingle();

    if (error || !data) {
      verticalCache.set(slug, { data: null, ts: Date.now() });
      return null;
    }
    const normalised: PdfVerticalSettings = {
      ...(data as any),
      document_types: (data as any).document_types ?? [],
      template_sections: (data as any).template_sections ?? DEFAULT_SECTIONS,
      custom_fields: (data as any).custom_fields ?? [],
    };
    verticalCache.set(slug, { data: normalised, ts: Date.now() });
    return normalised;
  } catch {
    return null;
  }
}

function nonEmpty(v: string | null | undefined, fallback = ""): string {
  return v && v.trim().length > 0 ? v : fallback;
}

function buildAddressLines(g: PdfGlobalBranding): string[] {
  const lines: string[] = [];
  if (g.address_line1) lines.push(g.address_line1);
  if (g.address_line2) lines.push(g.address_line2);
  const cityLine = [g.city, g.state, g.pincode].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);
  return lines;
}

/**
 * Resolve branding for a given vertical.
 * Falls back to global-only when no vertical settings row exists.
 */
export async function resolveBranding(verticalSlug: string): Promise<ResolvedBranding> {
  const [global, vertical] = await Promise.all([
    fetchGlobalBranding(),
    fetchVerticalSettings(verticalSlug),
  ]);

  const sections = (vertical?.template_sections?.length ? vertical.template_sections : DEFAULT_SECTIONS)
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const social: PdfSocialLinks = global.social_links ?? {};

  return {
    vertical_slug: verticalSlug,
    vertical_label: vertical?.vertical_label ?? verticalSlug,

    company_name: nonEmpty(global.company_name, "Grabyourcar"),
    company_tagline: nonEmpty(global.company_tagline, ""),
    logo_url: vertical?.override_logo_url || global.logo_url,
    watermark_url: global.watermark_url,
    signature_url: vertical?.override_signature_url || global.signature_url,
    signature_name: nonEmpty(
      vertical?.override_signature_name ?? global.signature_name,
      "Authorised Signatory"
    ),

    brand_primary_color: nonEmpty(vertical?.override_brand_color ?? global.brand_primary_color, "#0F172A"),
    brand_accent_color: nonEmpty(vertical?.override_accent_color ?? global.brand_accent_color, "#3B82F6"),
    brand_text_color: nonEmpty(global.brand_text_color, "#1F2937"),
    brand_muted_color: nonEmpty(global.brand_muted_color, "#6B7280"),
    font_heading: nonEmpty(global.font_heading, "Helvetica-Bold"),
    font_body: nonEmpty(global.font_body, "Helvetica"),

    address_lines: buildAddressLines(global),
    phone: nonEmpty(global.phone),
    alt_phone: nonEmpty(global.alt_phone),
    email: nonEmpty(global.email),
    website: nonEmpty(global.website, "www.grabyourcar.com"),

    gstin: nonEmpty(global.gstin),
    pan: nonEmpty(global.pan),
    cin: nonEmpty(global.cin),
    irdai_license: nonEmpty(global.irdai_license),

    bank: {
      name: nonEmpty(global.bank_name),
      account_name: nonEmpty(global.bank_account_name),
      account_number: nonEmpty(global.bank_account_number),
      ifsc: nonEmpty(global.bank_ifsc),
      branch: nonEmpty(global.bank_branch),
      upi_id: nonEmpty(global.upi_id),
    },

    footer_text: nonEmpty(
      vertical?.override_footer_text ?? global.footer_text,
      "Thank you for choosing Grabyourcar."
    ),
    default_terms: nonEmpty(vertical?.override_terms ?? global.default_terms, ""),
    social_links: social,

    page_size: global.page_size || "a4",
    margins: {
      top: global.margin_top ?? 14,
      bottom: global.margin_bottom ?? 14,
      left: global.margin_left ?? 12,
      right: global.margin_right ?? 12,
    },
    show_watermark: global.show_watermark ?? false,
    show_qr_footer: global.show_qr_footer ?? true,

    sections,
    custom_fields: vertical?.custom_fields ?? [],
  };
}
