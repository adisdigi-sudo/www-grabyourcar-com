import jsPDF from "jspdf";
import { format } from "date-fns";

export interface InsurerQuote {
  insurerName: string;
  policyType: string;
  idv?: number;
  basicOD?: number;
  odDiscount?: number;
  ncbDiscount?: number;
  netOD?: number;
  thirdParty: number;
  securePremium?: number;
  addonPremium?: number;
  addons?: string[];
  subtotal: number;
  gst: number;
  total: number;
}

export interface ComparisonPdfData {
  customerName: string;
  phone: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleNumber: string;
  vehicleYear: number | string;
  fuelType: string;
  cc: number;
  city?: string;
  quotes: InsurerQuote[];
}

const fmtINR = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;

export function generateInsuranceComparisonPdf(data: ComparisonPdfData): { doc: jsPDF; fileName: string } {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 12;
  const cw = pw - 2 * m;

  const darkGreen: [number, number, number] = [6, 95, 70];
  const green: [number, number, number] = [16, 185, 129];
  const lightGreen: [number, number, number] = [236, 253, 245];
  const mint: [number, number, number] = [209, 250, 229];
  const dark: [number, number, number] = [15, 23, 42];
  const gray: [number, number, number] = [100, 116, 139];
  const lightGray: [number, number, number] = [241, 245, 249];
  const white: [number, number, number] = [255, 255, 255];
  const blue: [number, number, number] = [37, 99, 235];
  const orange: [number, number, number] = [234, 88, 12];

  const cardColors: [number, number, number][] = [green, blue, orange];
  const quotes = data.quotes.slice(0, 3);
  const bestIdx = quotes.reduce((best, q, i) => (q.total < quotes[best].total ? i : best), 0);
  const isTP = quotes.every(q => q.policyType?.toLowerCase().includes("third"));

  let y = 0;
  const footerH = 16;

  const drawFooter = () => {
    const fy = ph - footerH;
    doc.setFillColor(...green);
    doc.rect(0, fy, pw, footerH, "F");
    doc.setFillColor(...darkGreen);
    doc.rect(0, fy, pw, 1, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.text("Grabyourcar Insurance Desk  |  +91 98559 24442  |  hello@grabyourcar.com  |  www.grabyourcar.com", pw / 2, fy + 6, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.text("MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana - 122001", pw / 2, fy + 11, { align: "center" });
  };

  // ── Watermark ──
  try {
    const GState = (doc as any).GState;
    if (GState) {
      doc.saveGraphicsState();
      doc.setGState(new GState({ opacity: 0.04 }));
      doc.setTextColor(...green);
      doc.setFontSize(55);
      doc.setFont("helvetica", "bold");
      doc.text("GRABYOURCAR", pw / 2, ph / 2, { align: "center", angle: 35 });
      doc.setGState(new GState({ opacity: 1 }));
      doc.restoreGraphicsState();
    }
  } catch {}

  // ── Header ──
  doc.setFillColor(...darkGreen);
  doc.rect(0, 0, pw, 30, "F");
  doc.setFillColor(...green);
  doc.rect(0, 24, pw, 6, "F");

  doc.setFontSize(16);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", m, 12);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("India's Smarter Way to Buy New Cars", m, 17);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("www.grabyourcar.com", pw - m, 11, { align: "right" });
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, pw - m, 17, { align: "right" });

  y = 36;

  // ── Title ──
  doc.setFontSize(14);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text("Insurance Comparison Report", m, y);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  const quoteRef = `GYC-CMP-${Date.now().toString().slice(-6)}`;
  doc.text(`Ref: ${quoteRef}  |  ${format(new Date(), "dd MMM yyyy")}`, pw - m, y, { align: "right" });
  y += 7;

  // ── Customer & Vehicle Box ──
  doc.setFillColor(...lightGray);
  doc.roundedRect(m, y, cw, 18, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(m, y, cw, 18, 2, 2, "S");

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gray);
  doc.text("PREPARED FOR", m + 4, y + 4.5);
  doc.setFontSize(8.5);
  doc.setTextColor(...dark);
  doc.text(`${data.customerName || "Customer"}  |  ${data.phone || ""}`, m + 4, y + 10);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(`${data.vehicleMake} ${data.vehicleModel}  |  ${(data.vehicleNumber || "N/A").toUpperCase()}  |  ${data.vehicleYear}  |  ${data.fuelType}  |  ${data.cc}cc${data.city ? `  |  ${data.city}` : ""}`, m + 4, y + 15);
  y += 24;

  // ── Comparison Cards ──
  const cardW = (cw - (quotes.length - 1) * 4) / quotes.length;

  quotes.forEach((q, i) => {
    const x = m + i * (cardW + 4);
    const isBest = i === bestIdx && quotes.length > 1;
    const color = cardColors[i] || green;
    const cardY = y;

    // Card outline
    if (isBest) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(...green);
      doc.setLineWidth(0.6);
    } else {
      doc.setFillColor(...white);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
    }
    const cardH = isTP ? 80 : 130;
    doc.roundedRect(x, cardY, cardW, cardH, 3, 3, "FD");

    // Header
    doc.setFillColor(...color);
    doc.roundedRect(x, cardY, cardW, 14, 3, 3, "F");
    doc.rect(x, cardY + 8, cardW, 6, "F");

    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const insurerShort = q.insurerName.length > 22 ? q.insurerName.slice(0, 20) + ".." : q.insurerName;
    doc.text(insurerShort, x + cardW / 2, cardY + 8, { align: "center" });

    if (isBest) {
      doc.setFontSize(6);
      doc.text("BEST PRICE", x + cardW / 2, cardY + 13, { align: "center" });
    }

    let cy = cardY + 20;

    // Total Premium highlight
    doc.setFillColor(isBest ? 220 : 241, isBest ? 252 : 245, isBest ? 231 : 249);
    doc.roundedRect(x + 3, cy, cardW - 6, 18, 2, 2, "F");
    doc.setTextColor(...gray);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("Total Premium", x + cardW / 2, cy + 5.5, { align: "center" });
    doc.setTextColor(isBest ? green[0] : dark[0], isBest ? green[1] : dark[1], isBest ? green[2] : dark[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(fmtINR(q.total), x + cardW / 2, cy + 14, { align: "center" });
    cy += 22;

    // Detail rows
    const rows: [string, string][] = [];
    rows.push(["Policy Type", (q.policyType || "Comprehensive").replace(/_/g, " ")]);
    if (!isTP) {
      if (q.idv) rows.push(["IDV", fmtINR(q.idv)]);
      if (q.netOD !== undefined) rows.push(["Net OD", fmtINR(q.netOD)]);
    }
    rows.push(["Third Party", fmtINR(q.thirdParty)]);
    if (!isTP && q.addonPremium && q.addonPremium > 0) rows.push(["Add-ons", fmtINR(q.addonPremium)]);
    rows.push(["GST (18%)", fmtINR(q.gst)]);

    rows.forEach(([label, value], ri) => {
      if (ri % 2 === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(x + 2, cy - 0.5, cardW - 4, 8, "F");
      }
      doc.setTextColor(...gray);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.text(label, x + 5, cy + 4.5);
      doc.setTextColor(...dark);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(value, x + cardW - 5, cy + 4.5, { align: "right" });
      cy += 8;
    });

    // Add-on chips (if not TP)
    if (!isTP && q.addons && q.addons.length > 0) {
      cy += 2;
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkGreen);
      let chipX = x + 3;
      q.addons.forEach(addon => {
        const chipW = Math.min(cardW - 6, doc.getTextWidth(addon) + 6);
        if (chipX + chipW > x + cardW - 3) { chipX = x + 3; cy += 6; }
        doc.setFillColor(...lightGreen);
        doc.roundedRect(chipX, cy, chipW, 5, 2, 2, "F");
        doc.text(addon, chipX + 3, cy + 3.5);
        chipX += chipW + 2;
      });
    }
  });

  y += isTP ? 86 : 136;

  // ── Savings Banner ──
  if (quotes.length > 1) {
    const worstTotal = Math.max(...quotes.map(q => q.total));
    const bestTotal = quotes[bestIdx].total;
    const savings = worstTotal - bestTotal;

    if (savings > 0) {
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(m, y, cw, 14, 3, 3, "F");
      doc.setFontSize(9);
      doc.setTextColor(22, 101, 52);
      doc.setFont("helvetica", "bold");
      doc.text(
        `You save ${fmtINR(savings)} by choosing ${quotes[bestIdx].insurerName}!`,
        pw / 2, y + 9, { align: "center" }
      );
      y += 18;
    }
  }

  // ── Terms ──
  doc.setDrawColor(...green);
  doc.setLineWidth(0.4);
  doc.line(m, y, pw - m, y);
  y += 5;

  doc.setFontSize(5.5);
  doc.setTextColor(...gray);
  doc.setFont("helvetica", "normal");
  const disclaimers = [
    "This is an indicative comparison by Grabyourcar (Adis Makethemoney Services Pvt Ltd). Final premiums subject to insurer underwriting & verification.",
    "Quote valid for 7 days. All premiums inclusive of GST @18%. NCB subject to claims verification. Add-ons optional at additional cost.",
    "For queries: +91 98559 24442 / hello@grabyourcar.com. Grabyourcar is a registered Insurance Broker.",
  ];
  disclaimers.forEach(line => {
    const wrapped = doc.splitTextToSize(line, cw - 4) as string[];
    doc.text(wrapped, m + 2, y);
    y += wrapped.length * 3 + 1;
  });

  // ── Footer ──
  drawFooter();

  const fileName = `Insurance_Comparison_${(data.customerName || "Customer").replace(/\s+/g, "_")}_${format(new Date(), "ddMMyyyy_HHmm")}.pdf`;
  return { doc, fileName };
}
