/**
 * Unified PDF Renderer
 *
 * The single rendering pipeline used by every CRM PDF (sales quotes, insurance, HSRP,
 * payslips, invoices, etc.). It pulls branding via the resolver, walks template sections,
 * and produces a consistent jsPDF document.
 *
 * Usage:
 *   const renderer = await createRenderer({ vertical: "insurance", documentType: "quote" });
 *   renderer.addSection("doc_meta", { docNumber: "INS-001", docDate: "18 Apr 2026" });
 *   renderer.addSection("customer", { name: "Rahul", phone: "98xxxxxx", ... });
 *   renderer.addSection("items", { rows: [...] });
 *   renderer.addSection("totals", { subtotal: 10000, tax: 1800, total: 11800 });
 *   renderer.save("insurance-quote.pdf");
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { resolveBranding } from "./brandingResolver";
import { hexToRgb, lighten, type RGB } from "./colorUtils";
import { substitute } from "./placeholders";
import type { ResolvedBranding, PdfPlaceholderContext, PdfTemplateSection } from "./types";

export interface RendererOptions {
  vertical: string;
  documentType: string;
  documentTitle?: string;
  documentSubtitle?: string;
  brandingOverride?: ResolvedBranding;
}

export interface CustomerBlock {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  gstin?: string;
}

export interface VehicleBlock {
  make?: string;
  model?: string;
  variant?: string;
  year?: string | number;
  fuel?: string;
  number?: string;
  extra?: Record<string, string | number>;
}

export interface ItemRow {
  description: string;
  hsn?: string;
  qty?: number | string;
  rate?: number | string;
  amount?: number | string;
  gst_rate?: number | string;
}

export interface ItemsBlock {
  columns?: string[];
  rows: ItemRow[];
  emptyText?: string;
}

export interface TotalsBlock {
  subtotal?: number;
  discount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  tax?: number;
  rounding?: number;
  total: number;
  amountInWords?: string;
}

export type SectionPayload =
  | { type: "doc_meta"; docNumber: string; docDate: string; subtitle?: string; extra?: Record<string, string> }
  | { type: "customer"; data: CustomerBlock; title?: string }
  | { type: "vehicle"; data: VehicleBlock; title?: string }
  | { type: "items"; data: ItemsBlock; title?: string }
  | { type: "totals"; data: TotalsBlock }
  | { type: "notes"; text: string; title?: string }
  | { type: "terms"; text?: string; title?: string }
  | { type: "bank"; title?: string }
  | { type: "signature"; label?: string }
  | { type: "footer" }
  | { type: "custom"; render: (doc: jsPDF, y: number, brand: ResolvedBranding) => number };

const PAGE_WIDTH_A4 = 210;
const PAGE_HEIGHT_A4 = 297;

// Cache loaded images so we don't refetch per render
const imageCache = new Map<string, { dataUrl: string; w: number; h: number; format: string } | null>();

async function loadImageAsDataUrl(
  url: string,
): Promise<{ dataUrl: string; w: number; h: number; format: string } | null> {
  if (imageCache.has(url)) return imageCache.get(url) ?? null;
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!res.ok) {
      imageCache.set(url, null);
      return null;
    }
    const blob = await res.blob();
    const ctype = blob.type || "image/png";
    const format = ctype.includes("jpeg") || ctype.includes("jpg") ? "JPEG" : "PNG";
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("read fail"));
      fr.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    const result = { dataUrl, w: dims.w, h: dims.h, format };
    imageCache.set(url, result);
    return result;
  } catch {
    imageCache.set(url, null);
    return null;
  }
}

export class UnifiedPdfRenderer {
  readonly doc: jsPDF;
  readonly branding: ResolvedBranding;
  readonly options: RendererOptions;
  private cursorY: number;
  private headerRendered = false;
  private placeholderCtx: PdfPlaceholderContext = {};
  private logoAsset: { dataUrl: string; w: number; h: number; format: string } | null = null;
  private watermarkAsset: { dataUrl: string; w: number; h: number; format: string } | null = null;
  private signatureAsset: { dataUrl: string; w: number; h: number; format: string } | null = null;

  constructor(branding: ResolvedBranding, options: RendererOptions) {
    this.branding = branding;
    this.options = options;
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: branding.page_size || "a4",
    });
    this.cursorY = branding.margins.top;
  }

  /** Preload remote brand assets so addImage receives data URLs (avoids silent failures). */
  async preloadAssets(): Promise<void> {
    const b = this.branding;
    const tasks: Promise<void>[] = [];
    if (b.logo_url) {
      tasks.push(
        loadImageAsDataUrl(b.logo_url).then((a) => {
          this.logoAsset = a;
        }),
      );
    }
    if (b.watermark_url && b.show_watermark) {
      tasks.push(
        loadImageAsDataUrl(b.watermark_url).then((a) => {
          this.watermarkAsset = a;
        }),
      );
    }
    if (b.signature_url) {
      tasks.push(
        loadImageAsDataUrl(b.signature_url).then((a) => {
          this.signatureAsset = a;
        }),
      );
    }
    await Promise.all(tasks);
  }

  setPlaceholderContext(ctx: PdfPlaceholderContext) {
    this.placeholderCtx = ctx;
  }

  private get pageWidth() {
    return this.doc.internal.pageSize.getWidth();
  }
  private get pageHeight() {
    return this.doc.internal.pageSize.getHeight();
  }
  private get contentWidth() {
    return this.pageWidth - this.branding.margins.left - this.branding.margins.right;
  }

  private ensureSpace(needed: number) {
    if (this.cursorY + needed > this.pageHeight - this.branding.margins.bottom - 12) {
      this.doc.addPage();
      this.cursorY = this.branding.margins.top;
      this.drawWatermark();
    }
  }

  private setFillRGB(rgb: RGB) {
    this.doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  }
  private setTextRGB(rgb: RGB) {
    this.doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  }
  private setDrawRGB(rgb: RGB) {
    this.doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  }

  private drawWatermark() {
    if (!this.branding.show_watermark) return;
    const asset = this.watermarkAsset;
    if (!asset) return;
    try {
      // Subtle, centered, aspect-ratio preserved watermark — sits BEHIND content
      const maxSize = 90; // mm
      const ratio = asset.w / asset.h || 1;
      const w = ratio >= 1 ? maxSize : maxSize * ratio;
      const h = ratio >= 1 ? maxSize / ratio : maxSize;
      const x = (this.pageWidth - w) / 2;
      const y = (this.pageHeight - h) / 2;
      const gState = (this.doc as any).GState
        ? new (this.doc as any).GState({ opacity: 0.06 })
        : null;
      if (gState) (this.doc as any).setGState(gState);
      this.doc.addImage(asset.dataUrl, asset.format, x, y, w, h, undefined, "FAST");
      if (gState) {
        const reset = new (this.doc as any).GState({ opacity: 1 });
        (this.doc as any).setGState(reset);
      }
    } catch {
      /* ignore */
    }
  }

  // ---------- Section: Header ----------
  renderHeader(): number {
    const b = this.branding;
    const primary = hexToRgb(b.brand_primary_color);
    const accent = hexToRgb(b.brand_accent_color);
    const x = b.margins.left;
    const headerH = 28;

    // Background band
    this.setFillRGB(primary);
    this.doc.rect(0, 0, this.pageWidth, headerH, "F");

    // Accent stripe
    this.setFillRGB(accent);
    this.doc.rect(0, headerH, this.pageWidth, 1.5, "F");

    // Logo (left) — aspect-ratio preserved, contained inside header band
    let logoOffset = 0;
    if (this.logoAsset) {
      try {
        const maxH = 18; // mm
        const maxW = 22;
        const ratio = this.logoAsset.w / this.logoAsset.h || 1;
        let lw = maxH * ratio;
        let lh = maxH;
        if (lw > maxW) {
          lw = maxW;
          lh = maxW / ratio;
        }
        const ly = (headerH - lh) / 2;
        this.doc.addImage(this.logoAsset.dataUrl, this.logoAsset.format, x, ly, lw, lh, undefined, "FAST");
        logoOffset = lw + 4;
      } catch {
        /* ignore broken logo */
      }
    }

    // Company name + tagline
    this.doc.setFont(b.font_heading, "bold");
    this.doc.setFontSize(18);
    this.setTextRGB([255, 255, 255]);
    this.doc.text(b.company_name, x + logoOffset, 14);

    if (b.company_tagline) {
      this.doc.setFont(b.font_body, "normal");
      this.doc.setFontSize(8.5);
      this.setTextRGB([220, 230, 245]);
      this.doc.text(b.company_tagline, x + logoOffset, 19);
    }

    // Document title (right side)
    if (this.options.documentTitle) {
      this.doc.setFont(b.font_heading, "bold");
      this.doc.setFontSize(14);
      this.setTextRGB([255, 255, 255]);
      this.doc.text(this.options.documentTitle.toUpperCase(), this.pageWidth - b.margins.right, 14, { align: "right" });
    }
    if (this.options.documentSubtitle) {
      this.doc.setFont(b.font_body, "normal");
      this.doc.setFontSize(8.5);
      this.setTextRGB([220, 230, 245]);
      this.doc.text(this.options.documentSubtitle, this.pageWidth - b.margins.right, 19, { align: "right" });
    }

    this.cursorY = headerH + 6;
    this.headerRendered = true;
    this.drawWatermark();
    return this.cursorY;
  }

  // ---------- Section: Doc Meta ----------
  renderDocMeta(payload: { docNumber: string; docDate: string; subtitle?: string; extra?: Record<string, string> }): number {
    const b = this.branding;
    const muted = hexToRgb(b.brand_muted_color);
    const text = hexToRgb(b.brand_text_color);
    this.ensureSpace(14);

    this.doc.setFont(b.font_body, "normal");
    this.doc.setFontSize(9);
    this.setTextRGB(muted);
    this.doc.text("Document #", b.margins.left, this.cursorY);
    this.doc.text("Date", this.pageWidth - b.margins.right - 40, this.cursorY);

    this.doc.setFont(b.font_heading, "bold");
    this.doc.setFontSize(11);
    this.setTextRGB(text);
    this.doc.text(payload.docNumber || "—", b.margins.left, this.cursorY + 5);
    this.doc.text(payload.docDate || "—", this.pageWidth - b.margins.right - 40, this.cursorY + 5);

    this.cursorY += 12;

    if (payload.extra) {
      this.doc.setFont(b.font_body, "normal");
      this.doc.setFontSize(9);
      for (const [k, v] of Object.entries(payload.extra)) {
        this.setTextRGB(muted);
        this.doc.text(`${k}:`, b.margins.left, this.cursorY);
        this.setTextRGB(text);
        this.doc.text(String(v), b.margins.left + 30, this.cursorY);
        this.cursorY += 5;
      }
      this.cursorY += 2;
    }

    return this.cursorY;
  }

  // ---------- Section: Customer ----------
  renderCustomer(data: CustomerBlock, title = "Bill To"): number {
    const b = this.branding;
    const muted = hexToRgb(b.brand_muted_color);
    const text = hexToRgb(b.brand_text_color);
    const accent = hexToRgb(b.brand_accent_color);
    this.ensureSpace(36);

    this.setFillRGB(lighten(accent, 0.92));
    this.doc.roundedRect(b.margins.left, this.cursorY, this.contentWidth, 30, 1.5, 1.5, "F");

    this.doc.setFont(b.font_heading, "bold");
    this.doc.setFontSize(9);
    this.setTextRGB(accent);
    this.doc.text(title.toUpperCase(), b.margins.left + 4, this.cursorY + 6);

    this.doc.setFont(b.font_heading, "bold");
    this.doc.setFontSize(11);
    this.setTextRGB(text);
    this.doc.text(data.name || "—", b.margins.left + 4, this.cursorY + 12);

    this.doc.setFont(b.font_body, "normal");
    this.doc.setFontSize(9);
    this.setTextRGB(muted);
    const lines: string[] = [];
    if (data.phone) lines.push(`Phone: ${data.phone}`);
    if (data.email) lines.push(`Email: ${data.email}`);
    const addr = [data.address, data.city, data.state].filter(Boolean).join(", ");
    if (addr) lines.push(addr);
    if (data.gstin) lines.push(`GSTIN: ${data.gstin}`);
    let y = this.cursorY + 18;
    for (const line of lines.slice(0, 3)) {
      this.doc.text(line, b.margins.left + 4, y);
      y += 4.5;
    }

    this.cursorY += 34;
    return this.cursorY;
  }

  // ---------- Section: Vehicle ----------
  renderVehicle(data: VehicleBlock, title = "Vehicle Details"): number {
    const b = this.branding;
    const muted = hexToRgb(b.brand_muted_color);
    const text = hexToRgb(b.brand_text_color);
    this.ensureSpace(24);

    this.doc.setFont(b.font_heading, "bold");
    this.doc.setFontSize(10);
    this.setTextRGB(text);
    this.doc.text(title, b.margins.left, this.cursorY);
    this.cursorY += 4;

    const rows: [string, string][] = [];
    if (data.make || data.model) rows.push(["Make / Model", [data.make, data.model].filter(Boolean).join(" ")]);
    if (data.variant) rows.push(["Variant", data.variant]);
    if (data.number) rows.push(["Reg. No.", data.number]);
    if (data.year) rows.push(["Year", String(data.year)]);
    if (data.fuel) rows.push(["Fuel", data.fuel]);
    if (data.extra) for (const [k, v] of Object.entries(data.extra)) rows.push([k, String(v)]);

    autoTable(this.doc, {
      startY: this.cursorY,
      body: rows,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 1.4, textColor: text },
      columnStyles: {
        0: { fontStyle: "bold", textColor: muted, cellWidth: 35 },
        1: { textColor: text },
      },
      margin: { left: b.margins.left, right: b.margins.right },
    });

    this.cursorY = (this.doc as any).lastAutoTable.finalY + 4;
    return this.cursorY;
  }

  // ---------- Section: Items ----------
  renderItems(data: ItemsBlock, title = "Items"): number {
    const b = this.branding;
    const accent = hexToRgb(b.brand_accent_color);
    const text = hexToRgb(b.brand_text_color);
    this.ensureSpace(20);

    this.doc.setFont(b.font_heading, "bold");
    this.doc.setFontSize(10);
    this.setTextRGB(text);
    this.doc.text(title, b.margins.left, this.cursorY);
    this.cursorY += 3;

    const cols = data.columns ?? ["Description", "HSN", "Qty", "Rate", "GST %", "Amount"];
    const body = data.rows.map((r) => [
      r.description,
      r.hsn ?? "",
      r.qty != null ? String(r.qty) : "",
      r.rate != null ? String(r.rate) : "",
      r.gst_rate != null ? `${r.gst_rate}%` : "",
      r.amount != null ? String(r.amount) : "",
    ]);

    autoTable(this.doc, {
      startY: this.cursorY,
      head: [cols],
      body: body.length ? body : [[data.emptyText ?? "No items", "", "", "", "", ""]],
      theme: "grid",
      headStyles: { fillColor: accent, textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: text },
      margin: { left: b.margins.left, right: b.margins.right },
    });
    this.cursorY = (this.doc as any).lastAutoTable.finalY + 4;
    return this.cursorY;
  }

  // ---------- Section: Totals ----------
  renderTotals(data: TotalsBlock): number {
    const b = this.branding;
    const muted = hexToRgb(b.brand_muted_color);
    const text = hexToRgb(b.brand_text_color);
    const accent = hexToRgb(b.brand_accent_color);
    this.ensureSpace(40);

    const boxW = 78;
    const boxX = this.pageWidth - b.margins.right - boxW;
    let y = this.cursorY;

    const fmt = (n?: number) => (n == null ? "" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);
    const rows: [string, string][] = [];
    if (data.subtotal != null) rows.push(["Subtotal", fmt(data.subtotal)]);
    if (data.discount) rows.push(["Discount", `- ${fmt(data.discount)}`]);
    if (data.cgst) rows.push(["CGST", fmt(data.cgst)]);
    if (data.sgst) rows.push(["SGST", fmt(data.sgst)]);
    if (data.igst) rows.push(["IGST", fmt(data.igst)]);
    if (!data.cgst && !data.sgst && !data.igst && data.tax) rows.push(["Tax", fmt(data.tax)]);
    if (data.rounding) rows.push(["Rounding", fmt(data.rounding)]);

    this.doc.setFont(b.font_body, "normal");
    this.doc.setFontSize(9);
    for (const [label, val] of rows) {
      this.setTextRGB(muted);
      this.doc.text(label, boxX, y);
      this.setTextRGB(text);
      this.doc.text(val, boxX + boxW, y, { align: "right" });
      y += 5;
    }

    // Grand total
    this.setFillRGB(accent);
    this.doc.rect(boxX - 2, y, boxW + 4, 8, "F");
    this.doc.setFont(b.font_heading, "bold");
    this.doc.setFontSize(11);
    this.setTextRGB([255, 255, 255]);
    this.doc.text("TOTAL", boxX, y + 5.5);
    this.doc.text(fmt(data.total), boxX + boxW, y + 5.5, { align: "right" });
    y += 12;

    if (data.amountInWords) {
      this.doc.setFont(b.font_body, "italic");
      this.doc.setFontSize(8.5);
      this.setTextRGB(muted);
      this.doc.text(`Amount in words: ${data.amountInWords}`, b.margins.left, y);
      y += 5;
    }

    this.cursorY = y + 2;
    return this.cursorY;
  }

  // ---------- Section: Notes / Terms ----------
  renderTextBlock(text: string, title: string): number {
    const b = this.branding;
    const muted = hexToRgb(b.brand_muted_color);
    const textCol = hexToRgb(b.brand_text_color);
    if (!text) return this.cursorY;
    this.ensureSpace(20);

    this.doc.setFont(b.font_heading, "bold");
    this.doc.setFontSize(9.5);
    this.setTextRGB(textCol);
    this.doc.text(title, b.margins.left, this.cursorY);
    this.cursorY += 4;

    this.doc.setFont(b.font_body, "normal");
    this.doc.setFontSize(8.5);
    this.setTextRGB(muted);
    const wrapped = this.doc.splitTextToSize(substitute(text, this.placeholderCtx), this.contentWidth);
    this.doc.text(wrapped, b.margins.left, this.cursorY);
    this.cursorY += wrapped.length * 4 + 3;
    return this.cursorY;
  }

  // ---------- Section: Bank ----------
  renderBank(title = "Bank Details"): number {
    const b = this.branding;
    const muted = hexToRgb(b.brand_muted_color);
    const text = hexToRgb(b.brand_text_color);
    if (!b.bank.account_number && !b.bank.upi_id) return this.cursorY;
    this.ensureSpace(24);

    this.doc.setFont(b.font_heading, "bold");
    this.doc.setFontSize(9.5);
    this.setTextRGB(text);
    this.doc.text(title, b.margins.left, this.cursorY);
    this.cursorY += 4;

    const rows: [string, string][] = [];
    if (b.bank.account_name) rows.push(["A/c Name", b.bank.account_name]);
    if (b.bank.name) rows.push(["Bank", b.bank.name]);
    if (b.bank.account_number) rows.push(["A/c No.", b.bank.account_number]);
    if (b.bank.ifsc) rows.push(["IFSC", b.bank.ifsc]);
    if (b.bank.branch) rows.push(["Branch", b.bank.branch]);
    if (b.bank.upi_id) rows.push(["UPI", b.bank.upi_id]);

    autoTable(this.doc, {
      startY: this.cursorY,
      body: rows,
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 1.2 },
      columnStyles: {
        0: { fontStyle: "bold", textColor: muted, cellWidth: 28 },
        1: { textColor: text },
      },
      margin: { left: b.margins.left, right: b.margins.right },
    });
    this.cursorY = (this.doc as any).lastAutoTable.finalY + 4;
    return this.cursorY;
  }

  // ---------- Section: Signature ----------
  renderSignature(label?: string): number {
    const b = this.branding;
    const muted = hexToRgb(b.brand_muted_color);
    const text = hexToRgb(b.brand_text_color);
    this.ensureSpace(28);

    const x = this.pageWidth - b.margins.right - 60;
    const y = this.cursorY + 4;

    if (this.signatureAsset) {
      try {
        const ratio = this.signatureAsset.w / this.signatureAsset.h || 1;
        const sw = Math.min(50, 14 * ratio);
        const sh = sw / ratio;
        this.doc.addImage(this.signatureAsset.dataUrl, this.signatureAsset.format, x, y, sw, sh, undefined, "FAST");
      } catch {
        /* ignore */
      }
    }
    this.setDrawRGB(muted);
    this.doc.line(x, y + 16, x + 50, y + 16);
    this.doc.setFont(b.font_body, "normal");
    this.doc.setFontSize(8.5);
    this.setTextRGB(text);
    this.doc.text(label || b.signature_name, x + 25, y + 20, { align: "center" });
    this.doc.setFont(b.font_body, "normal");
    this.doc.setFontSize(7.5);
    this.setTextRGB(muted);
    this.doc.text(`for ${b.company_name}`, x + 25, y + 24, { align: "center" });

    this.cursorY += 30;
    return this.cursorY;
  }

  // ---------- Section: Footer ----------
  renderFooter(): number {
    const b = this.branding;
    const muted = hexToRgb(b.brand_muted_color);
    const accent = hexToRgb(b.brand_accent_color);
    const pageCount = this.doc.getNumberOfPages();

    for (let p = 1; p <= pageCount; p++) {
      this.doc.setPage(p);
      const y = this.pageHeight - 10;

      this.setDrawRGB(accent);
      this.doc.setLineWidth(0.4);
      this.doc.line(b.margins.left, y - 6, this.pageWidth - b.margins.right, y - 6);

      this.doc.setFont(b.font_body, "normal");
      this.doc.setFontSize(7.8);
      this.setTextRGB(muted);

      const contactBits: string[] = [];
      if (b.phone) contactBits.push(b.phone);
      if (b.email) contactBits.push(b.email);
      if (b.website) contactBits.push(b.website);
      this.doc.text(contactBits.join("  •  "), b.margins.left, y - 1);

      this.doc.text(`Page ${p} of ${pageCount}`, this.pageWidth - b.margins.right, y - 1, { align: "right" });

      if (b.footer_text) {
        this.doc.setFontSize(7);
        this.doc.text(
          substitute(b.footer_text, this.placeholderCtx),
          this.pageWidth / 2,
          y + 3,
          { align: "center", maxWidth: this.contentWidth }
        );
      }
    }
    return this.cursorY;
  }

  // ---------- High-level: render in section order ----------
  /**
   * Render in the order configured by the vertical's template_sections.
   * Caller passes a payload map; only sections present in both the template
   * AND the payload are rendered. Header & footer are always rendered.
   */
  renderTemplate(payloads: Partial<Record<PdfTemplateSection["type"], any>>) {
    if (!this.headerRendered) this.renderHeader();

    for (const section of this.branding.sections) {
      const payload = payloads[section.type];
      switch (section.type) {
        case "header":
          // already rendered
          break;
        case "doc_meta":
          if (payload) this.renderDocMeta(payload);
          break;
        case "customer":
          if (payload) this.renderCustomer(payload.data || payload, payload.title);
          break;
        case "vehicle":
          if (payload) this.renderVehicle(payload.data || payload, payload.title);
          break;
        case "items":
          if (payload) this.renderItems(payload.data || payload, payload.title);
          break;
        case "totals":
          if (payload) this.renderTotals(payload.data || payload);
          break;
        case "notes":
          if (payload?.text) this.renderTextBlock(payload.text, payload.title || "Notes");
          break;
        case "terms": {
          const txt = payload?.text || this.branding.default_terms;
          if (txt) this.renderTextBlock(txt, payload?.title || "Terms & Conditions");
          break;
        }
        case "bank":
          this.renderBank(payload?.title);
          break;
        case "signature":
          this.renderSignature(payload?.label);
          break;
        case "footer":
          // rendered at save()
          break;
        case "custom":
          if (typeof payload?.render === "function") {
            this.cursorY = payload.render(this.doc, this.cursorY, this.branding);
          }
          break;
      }
    }
  }

  // ---------- Output ----------
  async save(filename: string) {
    this.renderFooter();
    this.doc.save(filename);
  }

  async toBlob(): Promise<Blob> {
    this.renderFooter();
    return this.doc.output("blob");
  }

  async toDataUri(): Promise<string> {
    this.renderFooter();
    return this.doc.output("datauristring");
  }
}

/**
 * Convenience factory — resolves branding then constructs the renderer.
 */
export async function createRenderer(opts: RendererOptions): Promise<UnifiedPdfRenderer> {
  const branding = opts.brandingOverride ?? (await resolveBranding(opts.vertical));
  const renderer = new UnifiedPdfRenderer(branding, opts);
  await renderer.preloadAssets();
  return renderer;
}

// Re-export for downstream use
export { resolveBranding } from "./brandingResolver";
export { substitute, buildPlaceholderContext } from "./placeholders";
export type { ResolvedBranding } from "./types";
