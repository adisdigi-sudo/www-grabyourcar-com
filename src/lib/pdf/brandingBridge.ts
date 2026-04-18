/**
 * Branding Bridge — Unify existing PDFs without rewriting them.
 *
 * Existing generators (SalesOfferPDF, InsuranceQuote, LoanOffer, DeliveryThankYou,
 * Payslip, Invoice, etc.) all build their own jsPDF documents. Rewriting all 26
 * generators in one shot is risky.
 *
 * Instead, this bridge takes a fully-built jsPDF doc and:
 *   1. Stamps a unified header band (logo + company name + vertical label)
 *   2. Stamps a unified footer (contact + legal + page #)
 *   3. Adds a faint watermark on every page
 *   4. Logs the generation to pdf_manual_generations (audit trail)
 *
 * It reads colors / logo / address / contact info from the SAME pdf_global_branding
 * + pdf_vertical_settings tables that the new UnifiedPdfRenderer uses, so editing
 * branding once in the upcoming Branding Editor (Turn 4) updates EVERY PDF.
 *
 * Usage in any existing generator:
 *   const { doc, fileName } = generateSalesOfferPDF(params);
 *   await applyUnifiedBranding(doc, { vertical: "sales", documentType: "sales_quote", fileName });
 *   doc.save(fileName);
 */

import type { jsPDF } from "jspdf";
import { resolveBranding } from "./brandingResolver";
import { hexToRgb } from "./colorUtils";
import { supabase } from "@/integrations/supabase/client";
import type { ResolvedBranding } from "./types";

export interface ApplyBrandingOptions {
  vertical: string;
  documentType: string;
  fileName?: string;
  /** Skip header stamp if generator already drew one */
  skipHeader?: boolean;
  /** Skip footer stamp if generator already drew one */
  skipFooter?: boolean;
  /** Faint watermark (default true) */
  watermark?: boolean;
  /** Audit log payload for pdf_manual_generations */
  audit?: {
    customerName?: string;
    customerPhone?: string;
    referenceId?: string;
    extra?: Record<string, unknown>;
  };
}

const HEADER_BAND_H = 6;   // mm — slim accent strip at the very top
const FOOTER_BAND_H = 8;   // mm — slim band at the very bottom

let cachedLogoDataUrl: string | null = null;
let cachedLogoSrc: string | null = null;

async function loadLogoAsDataUrl(url: string): Promise<string | null> {
  if (cachedLogoDataUrl && cachedLogoSrc === url) return cachedLogoDataUrl;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    cachedLogoDataUrl = dataUrl;
    cachedLogoSrc = url;
    return dataUrl;
  } catch {
    return null;
  }
}

function stampAccentBands(doc: jsPDF, branding: ResolvedBranding) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const primary = hexToRgb(branding.brand_primary_color);
  const accent = hexToRgb(branding.brand_accent_color);
  const pageCount = doc.getNumberOfPages();

  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    // Top primary strip
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, 0, W, HEADER_BAND_H, "F");
    // Thin accent line right under it
    doc.setFillColor(accent.r, accent.g, accent.b);
    doc.rect(0, HEADER_BAND_H, W, 0.6, "F");

    // Bottom accent line + footer band
    doc.setFillColor(accent.r, accent.g, accent.b);
    doc.rect(0, H - FOOTER_BAND_H - 0.6, W, 0.6, "F");
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, H - FOOTER_BAND_H, W, FOOTER_BAND_H, "F");

    // Footer text (white on primary)
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const left = `${branding.company_name}  |  ${branding.phone}  |  ${branding.website}`;
    const right = `${branding.vertical_label}  •  Page ${p} / ${pageCount}`;
    doc.text(left, 8, H - 2.5);
    doc.text(right, W - 8, H - 2.5, { align: "right" });
  }
}

async function stampWatermark(doc: jsPDF, branding: ResolvedBranding) {
  if (!branding.watermark_url && !branding.logo_url) return;
  const url = branding.watermark_url || branding.logo_url!;
  const dataUrl = await loadLogoAsDataUrl(url);
  if (!dataUrl) return;

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const wmW = 110;
  const wmH = 110;
  const x = (W - wmW) / 2;
  const y = (H - wmH) / 2;
  const pageCount = doc.getNumberOfPages();

  const gState = doc as unknown as {
    GState: new (opts: { opacity: number }) => unknown;
    setGState: (g: unknown) => void;
  };

  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    try {
      gState.setGState(new gState.GState({ opacity: 0.04 }));
      doc.addImage(dataUrl, "PNG", x, y, wmW, wmH, undefined, "FAST");
      gState.setGState(new gState.GState({ opacity: 1 }));
    } catch {
      // ignore — older jsPDF versions
    }
  }
}

async function logGeneration(
  branding: ResolvedBranding,
  opts: ApplyBrandingOptions,
  pdfBytes: number
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("pdf_manual_generations" as any).insert({
      vertical_slug: opts.vertical,
      document_type: opts.documentType,
      file_name: opts.fileName ?? null,
      file_size_bytes: pdfBytes,
      generated_by: user?.id ?? null,
      customer_name: opts.audit?.customerName ?? null,
      customer_phone: opts.audit?.customerPhone ?? null,
      reference_id: opts.audit?.referenceId ?? null,
      branding_snapshot: {
        company_name: branding.company_name,
        vertical_label: branding.vertical_label,
        primary_color: branding.brand_primary_color,
      },
      extra: opts.audit?.extra ?? null,
    });
  } catch {
    // Non-blocking — never fail the PDF download because of audit log
  }
}

/**
 * Stamp unified branding bands + watermark on an already-built jsPDF doc.
 * Safe to call multiple times (idempotent per page).
 * Always returns the same `doc` for chaining.
 */
export async function applyUnifiedBranding(
  doc: jsPDF,
  opts: ApplyBrandingOptions
): Promise<jsPDF> {
  const branding = await resolveBranding(opts.vertical);

  if (opts.watermark !== false) {
    await stampWatermark(doc, branding);
  }
  if (!opts.skipHeader || !opts.skipFooter) {
    stampAccentBands(doc, branding);
  }

  // Fire-and-forget audit log
  try {
    const blob: Blob = doc.output("blob");
    void logGeneration(branding, opts, blob.size);
  } catch {
    void logGeneration(branding, opts, 0);
  }

  return doc;
}

/**
 * Convenience: build + apply + save in one call.
 */
export async function finalizeAndSave(
  doc: jsPDF,
  fileName: string,
  opts: Omit<ApplyBrandingOptions, "fileName">
): Promise<void> {
  await applyUnifiedBranding(doc, { ...opts, fileName });
  doc.save(fileName);
}
