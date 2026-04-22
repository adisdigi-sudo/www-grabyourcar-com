/**
 * Founder report PDF helpers.
 *
 *  - All downloadable PDFs are produced via the **UnifiedPdfRenderer** (jsPDF
 *    + jspdf-autotable + resolved branding). Logo, watermark, brand colors,
 *    fonts, and footer are applied automatically — no html2canvas, no print
 *    dialog, no popup blockers.
 *  - HTML / CSV builders remain for email payloads and screen previews.
 */

import { inr } from "./payoutEngine";
import { createRenderer } from "@/lib/pdf/UnifiedPdfRenderer";
import autoTable from "jspdf-autotable";
import { hexToRgb } from "@/lib/pdf/colorUtils";

const esc = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const css = `
  @page { size: A4; margin: 14mm; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color:#0f172a; font-size:12px; }
  h1 { font-size:20px; margin:0 0 4px; font-family: Georgia, serif; color:#0f172a;}
  h2 { font-size:14px; margin:18px 0 6px; padding-bottom:4px; border-bottom:1px solid #e2e8f0; color:#1e293b; font-family:Georgia,serif;}
  .muted { color:#64748b; font-size:11px;}
  .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;}
  table{width:100%;border-collapse:collapse;margin-top:6px;}
  th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top;}
  th{background:#f1f5f9;font-size:10px;text-transform:uppercase;letter-spacing:0.04em;color:#475569;}
  td.num{text-align:right;font-variant-numeric:tabular-nums;}
  .totals td{background:#f8fafc;font-weight:700;}
  .stamp{margin-top:24px;padding:10px 12px;border:1px dashed #cbd5e1;border-radius:6px;background:#f8fafc;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;}
  .box{border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;background:#fff;}
  .lbl{font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.04em;}
  .val{font-size:13px;font-weight:600;margin-top:2px;}
`;

export function openHtmlPrint(html: string, title = "Report") {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    alert("Please allow pop-ups to download / print the report.");
    return;
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title><style>${css}</style></head><body>${html}<script>window.addEventListener('load',()=>setTimeout(()=>{window.print();},250));</script></body></html>`);
  w.document.close();
}

/* =================================================================
   ============== BRANDED PDF ENGINE (UnifiedPdfRenderer) ===========
   ================================================================= */

/** Internal: section heading band (brand accent on white). */
function drawSectionHeading(doc: any, y: number, label: string, accent: [number, number, number], left: number, contentWidth: number): number {
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(left, y, 3, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(label.toUpperCase(), left + 6, y + 5);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(left, y + 8.5, left + contentWidth, y + 8.5);
  return y + 12;
}

/** Internal: KPI strip — 3 cards per row, brand-themed. */
function drawKpiStrip(doc: any, y: number, items: Array<{ label: string; value: string; accent?: boolean }>, accent: [number, number, number], left: number, contentWidth: number): number {
  const cardsPerRow = 3;
  const gap = 3;
  const cardW = (contentWidth - gap * (cardsPerRow - 1)) / cardsPerRow;
  const cardH = 18;
  let rowIdx = 0;
  for (let i = 0; i < items.length; i++) {
    const col = i % cardsPerRow;
    if (col === 0 && i > 0) rowIdx++;
    const x = left + col * (cardW + gap);
    const cy = y + rowIdx * (cardH + gap);
    const it = items[i];
    if (it.accent) {
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.roundedRect(x, cy, cardW, cardH, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, cy, cardW, cardH, 1.5, 1.5, "FD");
      doc.setTextColor(100, 116, 139);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.text(it.label.toUpperCase(), x + 3, cy + 5.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    if (!it.accent) doc.setTextColor(15, 23, 42);
    doc.text(it.value, x + 3, cy + 13);
  }
  return y + (rowIdx + 1) * (cardH + gap) + 2;
}

/** Render & save a branded PDF using UnifiedPdfRenderer. */
async function renderBrandedPdf(opts: {
  fileName: string;
  title: string;
  subtitle?: string;
  meta: Record<string, string>;
  build: (ctx: {
    doc: any;
    accent: [number, number, number];
    left: number;
    right: number;
    contentWidth: number;
    pageWidth: number;
    pageHeight: number;
    cursorY: number;
    setCursorY: (y: number) => void;
    section: (label: string) => void;
    addTable: (head: string[], body: any[][], opts?: { numCols?: number[]; foot?: any[][] }) => void;
    kpiStrip: (items: Array<{ label: string; value: string; accent?: boolean }>) => void;
    paragraph: (text: string) => void;
  }) => void;
}) {
  const renderer = await createRenderer({
    vertical: "founder-cockpit",
    documentType: "report",
    documentTitle: opts.title,
    documentSubtitle: opts.subtitle,
  });

  // Render branded header + watermark
  renderer.renderHeader();

  const doc: any = renderer.doc;
  const branding = renderer.branding;
  const accent = hexToRgb(branding.brand_accent_color);
  const left = branding.margins.left;
  const right = branding.margins.right;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - left - right;
  let cursorY = (renderer as any).cursorY ?? branding.margins.top + 30;

  // Doc-meta strip
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const metaParts = Object.entries(opts.meta).map(([k, v]) => `${k}: ${v}`);
  const wrapped = doc.splitTextToSize(metaParts.join("   ·   "), contentWidth);
  doc.text(wrapped, left, cursorY);
  cursorY += wrapped.length * 4 + 4;

  const ensureSpace = (need: number) => {
    if (cursorY + need > pageHeight - branding.margins.bottom - 14) {
      doc.addPage();
      cursorY = branding.margins.top + 4;
    }
  };

  const ctx = {
    doc,
    accent,
    left,
    right,
    contentWidth,
    pageWidth,
    pageHeight,
    cursorY,
    setCursorY: (y: number) => {
      cursorY = y;
    },
    section: (label: string) => {
      ensureSpace(16);
      cursorY = drawSectionHeading(doc, cursorY, label, accent, left, contentWidth);
      ctx.cursorY = cursorY;
    },
    addTable: (head: string[], body: any[][], tableOpts?: { numCols?: number[]; foot?: any[][] }) => {
      ensureSpace(22);
      const numCols = tableOpts?.numCols ?? [];
      const columnStyles: Record<number, any> = {};
      numCols.forEach((idx) => {
        columnStyles[idx] = { halign: "right", cellWidth: "auto" };
      });
      autoTable(doc, {
        startY: cursorY,
        head: [head],
        body,
        foot: tableOpts?.foot,
        theme: "grid",
        headStyles: { fillColor: accent, textColor: [255, 255, 255], fontSize: 8.5, fontStyle: "bold", halign: "left" },
        bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 8.5 },
        alternateRowStyles: { fillColor: [250, 251, 253] },
        columnStyles,
        margin: { left, right },
        styles: { cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.15 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 5;
      ctx.cursorY = cursorY;
    },
    kpiStrip: (items: Array<{ label: string; value: string; accent?: boolean }>) => {
      const rows = Math.ceil(items.length / 3);
      ensureSpace(rows * 21 + 4);
      cursorY = drawKpiStrip(doc, cursorY, items, accent, left, contentWidth);
      ctx.cursorY = cursorY;
    },
    paragraph: (text: string) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(text, contentWidth);
      ensureSpace(lines.length * 4 + 2);
      doc.text(lines, left, cursorY);
      cursorY += lines.length * 4.2 + 3;
      ctx.cursorY = cursorY;
    },
  };

  opts.build(ctx);

  // Confidentiality stamp
  ensureSpace(14);
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.setLineDashPattern([1, 1], 0);
  doc.roundedRect(left, cursorY, contentWidth, 9, 1, 1, "FD");
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "Confidential — auto-generated by GYC Finance Office. Figures derived from live system data.",
    pageWidth / 2,
    cursorY + 5.6,
    { align: "center" },
  );

  await renderer.save(opts.fileName);
}

/* ============== Per-record net-payout invoice ============== */

export function buildRowInvoice(opts: {
  module: "insurance" | "loan" | "deal";
  reference: string;
  customer: string;
  meta: Array<[string, string]>;
  base: { label: string; amount: number };
  pct: number;
  gross: number;
  tds: number;
  net: number;
  notes?: string;
}) {
  const { module, reference, customer, meta, base, pct, gross, tds, net, notes } = opts;
  const moduleLabel =
    module === "insurance" ? "Insurance Policy" : module === "loan" ? "Car Loan" : "Automotive Deal";

  void renderBrandedPdf({
    fileName: `Payout-${reference.replace(/[^A-Za-z0-9_-]+/g, "_")}.pdf`,
    title: "Net Payout Statement",
    subtitle: moduleLabel,
    meta: {
      Reference: reference,
      Customer: customer,
      Generated: new Date().toLocaleString("en-IN"),
    },
    build: (ctx) => {
      // Customer + meta as KPI strip
      ctx.kpiStrip([
        { label: "Customer", value: customer || "—" },
        ...meta.map(([k, v]) => ({ label: k, value: v })),
      ]);

      ctx.section("Payout Breakup");
      ctx.addTable(
        ["Component", "Basis", "Amount"],
        [
          [base.label, "Source value", inr(base.amount)],
          ["Gross Payout", `${pct}% of base`, inr(gross)],
          ["TDS @ 5%", "Statutory deduction", `- ${inr(tds)}`],
        ],
        {
          numCols: [2],
          foot: [["Net Payout (Receivable)", "", inr(net)]],
        },
      );

      if (notes) {
        ctx.section("Notes");
        ctx.paragraph(notes);
      }
    },
  }).catch((err) => {
    console.error("[buildRowInvoice] PDF render failed:", err);
    alert("Could not generate the PDF. Please try again.");
  });
}

/* ============== Monthly consolidated statement ============== */

export function buildMonthlyStatement(opts: {
  monthLabel: string;
  module: "insurance" | "loan" | "deal";
  rows: Array<{
    date: string;
    reference: string;
    customer: string;
    productOrType: string;
    base: number;
    pct: number;
    gross: number;
    tds: number;
    net: number;
  }>;
}) {
  const { monthLabel, module, rows } = opts;
  const moduleLabel =
    module === "insurance" ? "Insurance" : module === "loan" ? "Car Loans" : "Automotive Deals";
  const sum = rows.reduce(
    (a, r) => ({ base: a.base + r.base, gross: a.gross + r.gross, tds: a.tds + r.tds, net: a.net + r.net }),
    { base: 0, gross: 0, tds: 0, net: 0 },
  );

  void renderBrandedPdf({
    fileName: `${moduleLabel.replace(/\s+/g, "_")}-Statement-${monthLabel.replace(/\s+/g, "_")}.pdf`,
    title: `${moduleLabel} Monthly Statement`,
    subtitle: monthLabel,
    meta: {
      Period: monthLabel,
      Records: String(rows.length),
      Generated: new Date().toLocaleString("en-IN"),
    },
    build: (ctx) => {
      ctx.kpiStrip([
        { label: "Records", value: String(rows.length), accent: true },
        { label: "Total Base", value: inr(sum.base) },
        { label: "Gross Payout", value: inr(sum.gross) },
        { label: "TDS", value: inr(sum.tds) },
        { label: "Net Receivable", value: inr(sum.net), accent: true },
      ]);

      ctx.section(`${moduleLabel} Records`);
      ctx.addTable(
        ["#", "Date", "Reference", "Customer", "Type", "Base", "%", "Gross", "TDS", "Net"],
        rows.map((r, i) => [
          i + 1,
          r.date,
          r.reference,
          r.customer,
          r.productOrType,
          inr(r.base),
          `${r.pct.toFixed(2)}%`,
          inr(r.gross),
          inr(r.tds),
          inr(r.net),
        ]),
        {
          numCols: [5, 6, 7, 8, 9],
          foot: [["", "", "", "", "TOTAL", inr(sum.base), "—", inr(sum.gross), inr(sum.tds), inr(sum.net)]],
        },
      );
    },
  }).catch((err) => {
    console.error("[buildMonthlyStatement] PDF render failed:", err);
    alert("Could not generate the PDF. Please try again.");
  });
}

/* ============== Full Founder Dashboard Snapshot (PDF) ============== */

export interface FounderSnapshotInput {
  periodLabel: string;
  periodKind: string;
  periodStart: string;
  periodEnd: string;
  filters: { vertical: string; search: string };
  kpis: {
    revenue: number; receivables: number; payroll: number; expenses: number;
    incentives: number; profit: number;
  };
  counts: {
    policies: number; loans: number; loansDisbursed: number;
    deals: number; invoices: number; invoicesPaid: number;
  };
  policies: Array<{ ref: string; customer: string; type: string; base: number; pct: number; gross: number; tds: number; net: number; }>;
  loans: Array<{ ref: string; customer: string; bank: string; stage: string; base: number; pct: number; gross: number; tds: number; net: number; }>;
  deals: Array<{ ref: string; customer: string; vertical: string; value: number; margin: number; pct: number; net: number; received: number; pending: number; }>;
  reconciliation: Array<{ module: string; summaryNet: number; tableNet: number; diff: number; status: string }>;
  audit: Array<{ module: string; query: string; rows: number }>;
}

/** Internal: build the branded Founder Snapshot PDF, honouring optional column/section config. */
function renderFounderSnapshotPdf(s: FounderSnapshotInput, cfg: ExportColumnConfig = {}): Promise<void> {
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const polTotals = {
    base: sum(s.policies.map((p) => p.base)),
    gross: sum(s.policies.map((p) => p.gross)),
    tds: sum(s.policies.map((p) => p.tds)),
    net: sum(s.policies.map((p) => p.net)),
  };
  const loanTotals = {
    base: sum(s.loans.map((l) => l.base)),
    gross: sum(s.loans.map((l) => l.gross)),
    tds: sum(s.loans.map((l) => l.tds)),
    net: sum(s.loans.map((l) => l.net)),
  };
  const dealTotals = {
    value: sum(s.deals.map((d) => d.value)),
    margin: sum(s.deals.map((d) => d.margin)),
    net: sum(s.deals.map((d) => d.net)),
    received: sum(s.deals.map((d) => d.received)),
    pending: sum(s.deals.map((d) => d.pending)),
  };

  const includeKpis = cfg.includeKpis !== false;
  const includeCounts = cfg.includeCounts !== false;
  const includeRecon = cfg.includeReconciliation !== false;
  const includeAudit = cfg.includeAudit !== false;
  const policiesCols = cfg.policies?.length ? cfg.policies : DEFAULT_COLS.policies;
  const loansCols = cfg.loans?.length ? cfg.loans : DEFAULT_COLS.loans;
  const dealsCols = cfg.deals?.length ? cfg.deals : DEFAULT_COLS.deals;

  // Map column key -> renderer hint (header + cell renderer + numeric flag)
  const colRenderers: Record<string, { label: string; render: (row: any) => string; numeric: boolean }> = {
    ref: { label: "Reference", render: (r) => String(r.ref ?? "—"), numeric: false },
    customer: { label: "Customer", render: (r) => String(r.customer ?? "—"), numeric: false },
    type: { label: "Type", render: (r) => String(r.type ?? "—"), numeric: false },
    bank: { label: "Bank", render: (r) => String(r.bank ?? "—"), numeric: false },
    stage: { label: "Stage", render: (r) => String(r.stage ?? "—"), numeric: false },
    vertical: { label: "Vertical", render: (r) => String(r.vertical ?? "—"), numeric: false },
    base: { label: "Base", render: (r) => inr(r.base ?? 0), numeric: true },
    pct: { label: "%", render: (r) => `${Number(r.pct ?? 0).toFixed(2)}%`, numeric: true },
    gross: { label: "Gross", render: (r) => inr(r.gross ?? 0), numeric: true },
    tds: { label: "TDS", render: (r) => inr(r.tds ?? 0), numeric: true },
    net: { label: "Net", render: (r) => inr(r.net ?? 0), numeric: true },
    value: { label: "Value", render: (r) => inr(r.value ?? 0), numeric: true },
    margin: { label: "Margin", render: (r) => inr(r.margin ?? 0), numeric: true },
    received: { label: "Received", render: (r) => inr(r.received ?? 0), numeric: true },
    pending: { label: "Pending", render: (r) => inr(r.pending ?? 0), numeric: true },
  };

  const buildTableArgs = (cols: string[], rows: any[], totals: Record<string, number>) => {
    const head = ["#", ...cols.map((c) => colRenderers[c]?.label ?? c)];
    const body = rows.map((r, i) => [i + 1, ...cols.map((c) => (colRenderers[c] ? colRenderers[c].render(r) : String(r[c] ?? "")))]);
    const numCols = cols
      .map((c, idx) => (colRenderers[c]?.numeric ? idx + 1 : -1))
      .filter((i) => i >= 0);
    const footRow: any[] = ["", "TOTAL"];
    for (let i = 1; i < cols.length; i++) {
      const c = cols[i];
      if (totals[c] !== undefined) footRow.push(inr(totals[c]));
      else footRow.push("—");
    }
    return { head, body, numCols, foot: [footRow] };
  };

  return renderBrandedPdf({
    fileName: `Founder-Snapshot-${s.periodLabel.replace(/\s+/g, "_")}.pdf`,
    title: "Founder Master Report",
    subtitle: `Snapshot · ${s.periodKind}`,
    meta: {
      Period: `${s.periodLabel} (${s.periodStart} → ${s.periodEnd})`,
      Vertical: s.filters.vertical || "All",
      ...(s.filters.search ? { Search: s.filters.search } : {}),
      Generated: new Date().toLocaleString("en-IN"),
    },
    build: (ctx) => {
      if (includeKpis) {
        ctx.section("Headline KPIs");
        ctx.kpiStrip([
          { label: "Revenue (Paid)", value: inr(s.kpis.revenue) },
          { label: "Receivables", value: inr(s.kpis.receivables) },
          { label: "Payroll (Net)", value: inr(s.kpis.payroll) },
          { label: "Op. Expenses", value: inr(s.kpis.expenses) },
          { label: "Incentives Net", value: inr(s.kpis.incentives) },
          {
            label: s.kpis.profit >= 0 ? "Net Surplus" : "Net Deficit",
            value: `${s.kpis.profit >= 0 ? "" : "- "}${inr(Math.abs(s.kpis.profit))}`,
            accent: true,
          },
        ]);
      }

      if (includeCounts) {
        ctx.section("Live Vertical Counts");
        ctx.addTable(
          ["Vertical", "Records", "Detail"],
          [
            ["Policies Issued", String(s.counts.policies), `Net Payout: ${inr(polTotals.net)}`],
            ["Car Loan Cases", String(s.counts.loans), `${s.counts.loansDisbursed} disbursed · Net: ${inr(loanTotals.net)}`],
            ["Car Sales / Deals", String(s.counts.deals), `Net Margin: ${inr(dealTotals.net)}`],
            ["Invoices", String(s.counts.invoices), `${s.counts.invoicesPaid} paid`],
          ],
          { numCols: [1] },
        );
      }

      if (includeRecon && s.reconciliation.length) {
        ctx.section("Auto-Reconciliation");
        ctx.addTable(
          ["Module", "Summary Net", "Table Net", "Diff", "Status"],
          s.reconciliation.map((r) => [r.module, inr(r.summaryNet), inr(r.tableNet), inr(r.diff), r.status]),
          { numCols: [1, 2, 3] },
        );
      }

      if (includeAudit && s.audit.length) {
        ctx.section("Audit Trail · Date-range Queries");
        ctx.addTable(
          ["Module", "Query", "Rows"],
          s.audit.map((a) => [a.module, a.query, String(a.rows)]),
          { numCols: [2] },
        );
      }

      if (policiesCols.length && s.policies.length) {
        ctx.section(`Policies (${s.policies.length})`);
        const t = buildTableArgs(policiesCols, s.policies, polTotals as any);
        ctx.addTable(t.head, t.body, { numCols: t.numCols, foot: t.foot });
      }

      if (loansCols.length && s.loans.length) {
        ctx.section(`Car Loans (${s.loans.length})`);
        const t = buildTableArgs(loansCols, s.loans, loanTotals as any);
        ctx.addTable(t.head, t.body, { numCols: t.numCols, foot: t.foot });
      }

      if (dealsCols.length && s.deals.length) {
        ctx.section(`Car Deals (${s.deals.length})`);
        const t = buildTableArgs(dealsCols, s.deals, dealTotals as any);
        ctx.addTable(t.head, t.body, { numCols: t.numCols, foot: t.foot });
      }
    },
  });
}

export function buildFounderSnapshot(s: FounderSnapshotInput) {
  renderFounderSnapshotPdf(s).catch((err) => {
    console.error("[buildFounderSnapshot] PDF render failed:", err);
    alert("Could not generate the Founder snapshot PDF. Please try again.");
  });
}

/* ============== CSV Snapshot Export ============== */

export interface ExportColumnConfig {
  policies?: string[];   // subset of: ref,customer,type,base,pct,gross,tds,net
  loans?: string[];      // subset of: ref,customer,bank,stage,base,pct,gross,tds,net
  deals?: string[];      // subset of: ref,customer,vertical,value,margin,pct,net,received,pending
  includeReconciliation?: boolean;
  includeAudit?: boolean;
  includeKpis?: boolean;
  includeCounts?: boolean;
}

const DEFAULT_COLS: Required<Omit<ExportColumnConfig, "includeReconciliation" | "includeAudit" | "includeKpis" | "includeCounts">> = {
  policies: ["ref", "customer", "type", "base", "pct", "gross", "tds", "net"],
  loans: ["ref", "customer", "bank", "stage", "base", "pct", "gross", "tds", "net"],
  deals: ["ref", "customer", "vertical", "value", "margin", "pct", "net", "received", "pending"],
};

const COL_LABELS: Record<string, string> = {
  ref: "Reference", customer: "Customer", type: "Type", bank: "Bank", stage: "Stage",
  vertical: "Vertical", base: "Base", pct: "Pct", gross: "Gross", tds: "TDS", net: "Net",
  value: "Value", margin: "Margin", received: "Received", pending: "Pending",
};

export function buildFounderCSV(s: FounderSnapshotInput, cfg: ExportColumnConfig = {}) {
  const policiesCols = cfg.policies?.length ? cfg.policies : DEFAULT_COLS.policies;
  const loansCols = cfg.loans?.length ? cfg.loans : DEFAULT_COLS.loans;
  const dealsCols = cfg.deals?.length ? cfg.deals : DEFAULT_COLS.deals;
  const includeRecon = cfg.includeReconciliation !== false;
  const includeAudit = cfg.includeAudit !== false;
  const includeKpis = cfg.includeKpis !== false;
  const includeCounts = cfg.includeCounts !== false;

  const esc = (v: any) => {
    const str = String(v ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines: string[] = [];

  lines.push(`Founder Master Report Snapshot`);
  lines.push(`Period,${esc(s.periodLabel)},${esc(s.periodKind)},${s.periodStart},${s.periodEnd}`);
  lines.push(`Filters,vertical=${esc(s.filters.vertical)},search=${esc(s.filters.search)}`);
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push("");

  if (includeKpis) {
    lines.push("== KPIs ==");
    lines.push("Metric,Amount");
    lines.push(`Revenue (Paid),${s.kpis.revenue}`);
    lines.push(`Receivables,${s.kpis.receivables}`);
    lines.push(`Payroll,${s.kpis.payroll}`);
    lines.push(`Expenses,${s.kpis.expenses}`);
    lines.push(`Incentives Net,${s.kpis.incentives}`);
    lines.push(`Net Profit/Loss,${s.kpis.profit}`);
    lines.push("");
  }

  if (includeCounts) {
    lines.push("== Counts ==");
    lines.push(`Policies,${s.counts.policies}`);
    lines.push(`Loans Total,${s.counts.loans}`);
    lines.push(`Loans Disbursed,${s.counts.loansDisbursed}`);
    lines.push(`Deals,${s.counts.deals}`);
    lines.push(`Invoices Total,${s.counts.invoices}`);
    lines.push(`Invoices Paid,${s.counts.invoicesPaid}`);
    lines.push("");
  }

  if (includeRecon) {
    lines.push("== Reconciliation ==");
    lines.push("Module,Summary Net,Table Net,Diff,Status");
    s.reconciliation.forEach(r => lines.push(`${esc(r.module)},${r.summaryNet},${r.tableNet},${r.diff},${esc(r.status)}`));
    lines.push("");
  }

  if (includeAudit) {
    lines.push("== Audit Trail ==");
    lines.push("Module,Query,Rows");
    s.audit.forEach(a => lines.push(`${esc(a.module)},${esc(a.query)},${a.rows}`));
    lines.push("");
  }

  if (policiesCols.length) {
    lines.push(`== Policies (${s.policies.length}) ==`);
    lines.push(policiesCols.map(c => COL_LABELS[c] || c).join(","));
    s.policies.forEach(p => lines.push(policiesCols.map(c => esc((p as any)[c])).join(",")));
    lines.push("");
  }

  if (loansCols.length) {
    lines.push(`== Loans (${s.loans.length}) ==`);
    lines.push(loansCols.map(c => COL_LABELS[c] || c).join(","));
    s.loans.forEach(l => lines.push(loansCols.map(c => esc((l as any)[c])).join(",")));
    lines.push("");
  }

  if (dealsCols.length) {
    lines.push(`== Deals (${s.deals.length}) ==`);
    lines.push(dealsCols.map(c => COL_LABELS[c] || c).join(","));
    s.deals.forEach(d => lines.push(dealsCols.map(c => esc((d as any)[c])).join(",")));
  }

  const csv = lines.join("\n");
  return csv;
}

export function downloadFounderCSV(s: FounderSnapshotInput, cfg: ExportColumnConfig = {}) {
  const csv = buildFounderCSV(s, cfg);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Founder-Snapshot-${s.periodLabel.replace(/\s+/g, "_")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============== Founder Snapshot HTML (for PDF/Email body) ============== */

export function buildFounderSnapshotHTML(s: FounderSnapshotInput, cfg: ExportColumnConfig = {}): string {
  const policiesCols = cfg.policies?.length ? cfg.policies : DEFAULT_COLS.policies;
  const loansCols = cfg.loans?.length ? cfg.loans : DEFAULT_COLS.loans;
  const dealsCols = cfg.deals?.length ? cfg.deals : DEFAULT_COLS.deals;
  const includeRecon = cfg.includeReconciliation !== false;
  const includeAudit = cfg.includeAudit !== false;

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const polTotals = {
    base: sum(s.policies.map(p => p.base)), gross: sum(s.policies.map(p => p.gross)),
    tds: sum(s.policies.map(p => p.tds)), net: sum(s.policies.map(p => p.net)),
  };
  const loanTotals = {
    base: sum(s.loans.map(l => l.base)), gross: sum(s.loans.map(l => l.gross)),
    tds: sum(s.loans.map(l => l.tds)), net: sum(s.loans.map(l => l.net)),
  };
  const dealTotals = {
    value: sum(s.deals.map(d => d.value)), margin: sum(s.deals.map(d => d.margin)),
    net: sum(s.deals.map(d => d.net)), received: sum(s.deals.map(d => d.received)),
    pending: sum(s.deals.map(d => d.pending)),
  };

  const renderTable = (cols: string[], rows: any[], totals?: Record<string, number>) => `
    <table>
      <tr>${cols.map(c => `<th class="${["base","pct","gross","tds","net","value","margin","received","pending"].includes(c) ? "num" : ""}">${esc(COL_LABELS[c] || c)}</th>`).join("")}</tr>
      ${rows.map(r => `<tr>${cols.map(c => {
        const v = r[c];
        const isNum = typeof v === "number";
        return `<td class="${isNum ? "num" : ""}">${isNum ? (c === "pct" ? `${v}%` : inr(v)) : esc(v)}</td>`;
      }).join("")}</tr>`).join("")}
      ${totals ? `<tr class="totals">${cols.map(c => {
        if (totals[c] !== undefined) return `<td class="num">${inr(totals[c])}</td>`;
        return `<td>${c === cols[0] ? "TOTAL" : "—"}</td>`;
      }).join("")}</tr>` : ""}
    </table>`;

  return `
    <h1>Founder Master Report — Snapshot</h1>
    <p class="muted">
      Period: <b>${esc(s.periodLabel)}</b> (${esc(s.periodKind)}) · ${esc(s.periodStart)} → ${esc(s.periodEnd)}<br/>
      Filters: vertical=<b>${esc(s.filters.vertical)}</b>${s.filters.search ? ` · search="${esc(s.filters.search)}"` : ""}<br/>
      Generated ${new Date().toLocaleString("en-IN")}
    </p>

    <h2>Headline KPIs</h2>
    <table>
      <tr><th>Metric</th><th class="num">Amount</th></tr>
      <tr><td>Revenue (Paid)</td><td class="num">${inr(s.kpis.revenue)}</td></tr>
      <tr><td>Receivables</td><td class="num">${inr(s.kpis.receivables)}</td></tr>
      <tr><td>Payroll (Net)</td><td class="num">${inr(s.kpis.payroll)}</td></tr>
      <tr><td>Operational Expenses</td><td class="num">${inr(s.kpis.expenses)}</td></tr>
      <tr><td>Total Incentives</td><td class="num">${inr(s.kpis.incentives)}</td></tr>
      <tr class="totals"><td>Net Profit / Loss</td><td class="num">${s.kpis.profit >= 0 ? "" : "- "}${inr(Math.abs(s.kpis.profit))}</td></tr>
    </table>

    ${includeRecon ? `
    <h2>Auto-Reconciliation</h2>
    <table>
      <tr><th>Module</th><th class="num">Summary Net</th><th class="num">Table Net</th><th class="num">Diff</th><th>Status</th></tr>
      ${s.reconciliation.map(r => `<tr><td>${esc(r.module)}</td><td class="num">${inr(r.summaryNet)}</td><td class="num">${inr(r.tableNet)}</td><td class="num">${inr(r.diff)}</td><td>${esc(r.status)}</td></tr>`).join("")}
    </table>` : ""}

    ${includeAudit ? `
    <h2>Audit Trail — Date-range queries</h2>
    <table>
      <tr><th>Module</th><th>Query</th><th class="num">Rows</th></tr>
      ${s.audit.map(a => `<tr><td>${esc(a.module)}</td><td style="font-family:monospace;font-size:10px">${esc(a.query)}</td><td class="num">${a.rows}</td></tr>`).join("")}
    </table>` : ""}

    ${policiesCols.length ? `<h2>Policies (${s.policies.length})</h2>${renderTable(policiesCols, s.policies, polTotals as any)}` : ""}
    ${loansCols.length ? `<h2>Car Loans (${s.loans.length})</h2>${renderTable(loansCols, s.loans, loanTotals as any)}` : ""}
    ${dealsCols.length ? `<h2>Car Deals (${s.deals.length})</h2>${renderTable(dealsCols, s.deals, dealTotals as any)}` : ""}

    <div class="stamp">Founder Master Report Snapshot · GYC Finance Office · Confidential</div>
  `;
}

export function buildFounderSnapshotWithConfig(s: FounderSnapshotInput, cfg: ExportColumnConfig = {}) {
  renderFounderSnapshotPdf(s, cfg).catch((err) => {
    console.error("[buildFounderSnapshotWithConfig] PDF render failed:", err);
    alert("Could not generate the Founder snapshot PDF. Please try again.");
  });
}

export function getFounderSnapshotPrintableHTML(s: FounderSnapshotInput, cfg: ExportColumnConfig = {}): string {
  const body = buildFounderSnapshotHTML(s, cfg);
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Founder Snapshot</title><style>${css}</style></head><body>${body}</body></html>`;
}
