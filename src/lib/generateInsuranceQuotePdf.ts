import jsPDF from "jspdf";
import { format } from "date-fns";
import { loadInsurancePdfBrandingCache, resolveInsurerLogo } from "@/lib/insurancePdfBranding";

export interface InsuranceQuoteData {
  customerName: string;
  phone: string;
  email?: string;
  city?: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleNumber: string;
  vehicleYear: number | string;
  fuelType: string;
  insuranceCompany: string;
  policyType: string;
  idv: number;
  basicOD: number;
  odDiscount: number;
  ncbDiscount: number;
  thirdParty: number;
  securePremium: number;
  addonPremium: number;
  addons: string[];
  insurerLogoUrl?: string;
}

const formatINR = (amount: number): string =>
  `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;

export const generateInsuranceQuotePdf = (data: InsuranceQuoteData) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 15;
  const contentW = pw - 2 * m;

  const branding = loadInsurancePdfBrandingCache();
  const insurerLogoUrl = data.insurerLogoUrl || resolveInsurerLogo(data.insuranceCompany, branding);
  const brandLogoUrl = branding.grabyourcarLogoUrl;

  const green: [number, number, number] = [34, 197, 94];
  const darkGreen: [number, number, number] = [22, 163, 74];
  const lightGreen: [number, number, number] = [220, 252, 231];
  const dark: [number, number, number] = [15, 23, 42];
  const gray: [number, number, number] = [100, 116, 139];
  const white: [number, number, number] = [255, 255, 255];

  const footerH = 24;
  const footerY = ph - footerH;

  // Calculations
  const netOD = Math.max(0, data.basicOD - data.odDiscount - data.ncbDiscount);
  const netPremium = netOD + data.thirdParty + data.securePremium + data.addonPremium;
  const gst = Math.round(netPremium * 0.18);
  const totalPremium = netPremium + gst;

  let y = 0;

  // ── Helper: draw table section header ──
  const drawSectionHeader = (label: string, yStart: number): number => {
    doc.setFillColor(...green);
    doc.roundedRect(m, yStart, contentW, 9, 1.5, 1.5, "F");
    doc.setFontSize(9.5);
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.text(label, m + 5, yStart + 6.2);
    return yStart + 9;
  };

  // ── Helper: draw a data row ──
  const drawRow = (label: string, value: string, rY: number, i: number, highlight = false) => {
    const rowH = 7;
    if (highlight) {
      doc.setFillColor(220, 252, 231);
    } else {
      doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    }
    doc.rect(m, rY, contentW, rowH, "F");
    doc.setDrawColor(230, 230, 230);
    doc.line(m, rY + rowH, pw - m, rY + rowH);

    doc.setFontSize(8.5);
    doc.setTextColor(...(highlight ? darkGreen : gray));
    doc.setFont("helvetica", highlight ? "bold" : "normal");
    doc.text(label, m + 5, rY + 5);

    doc.setTextColor(...(highlight ? darkGreen : dark));
    doc.setFont("helvetica", "bold");
    doc.text(value, pw - m - 5, rY + 5, { align: "right" });
  };

  // ── DECORATIVE CORNER ACCENTS ──
  const cLen = 22, cW = 2.5;
  doc.setDrawColor(...green);
  doc.setLineWidth(cW);
  doc.line(0, cW / 2, cLen, cW / 2);
  doc.line(cW / 2, 0, cW / 2, cLen);
  doc.line(pw - cLen, cW / 2, pw, cW / 2);
  doc.line(pw - cW / 2, 0, pw - cW / 2, cLen);
  doc.line(0, ph - cW / 2, cLen, ph - cW / 2);
  doc.line(cW / 2, ph - cLen, cW / 2, ph);
  doc.line(pw - cLen, ph - cW / 2, pw, ph - cW / 2);
  doc.line(pw - cW / 2, ph - cLen, pw - cW / 2, ph);

  // ── WATERMARK ──
  doc.setFontSize(50);
  doc.setTextColor(245, 245, 245);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", pw / 2, ph / 2.5, { align: "center", angle: 35 });
  doc.text("INSURANCE", pw / 2, ph / 1.4, { align: "center", angle: 35 });

  // ── HEADER BANNER ──
  doc.setFillColor(...green);
  doc.rect(0, 0, pw, 34, "F");
  doc.setFillColor(...darkGreen);
  doc.rect(0, 31, pw, 3, "F");

  // Brand
  doc.setFontSize(22);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", m, 16);

  // Tagline
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("India's Smarter Way to Buy New Cars", m, 24);

  // Website & badge
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("www.grabyourcar.com", pw - m, 16, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Insurance Desk", pw - m, 24, { align: "right" });

  y = 42;

  // ── TITLE ──
  doc.setFontSize(14);
  doc.setTextColor(...darkGreen);
  doc.setFont("helvetica", "bold");
  doc.text("PREMIUM MOTOR INSURANCE QUOTATION", pw / 2, y, { align: "center" });
  y += 4;
  doc.setFillColor(...green);
  doc.rect((pw - 120) / 2, y, 120, 1.2, "F");
  y += 7;

  // ── GREETING ──
  doc.setFontSize(9.5);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "normal");
  doc.text(`Dear ${data.customerName || "Valued Customer"},`, m, y);
  y += 5;
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);
  doc.text("Thank you for choosing Grabyourcar Insurance Desk. Please find your personalized motor insurance quotation below.", m, y, { maxWidth: contentW });
  y += 8;

  // ── DATE & REF ──
  doc.setFontSize(7.5);
  doc.setTextColor(...gray);
  doc.text(`Date: ${format(new Date(), "dd MMM yyyy")}`, m, y);
  doc.text(`Ref: GYC-INS-${Date.now().toString().slice(-6)}`, pw - m, y, { align: "right" });
  y += 6;

  // ── VEHICLE & POLICY TABLE ──
  y = drawSectionHeader("VEHICLE & POLICY DETAILS", y);

  const vehicleRows = [
    ["Insurance Provider", data.insuranceCompany || "-"],
    ["Vehicle", `${data.vehicleMake} ${data.vehicleModel}`.toUpperCase()],
    ["Registration Number", (data.vehicleNumber || "-").toUpperCase()],
    ["Insured Declared Value (IDV)", formatINR(data.idv)],
    ["Year of Manufacture", String(data.vehicleYear || "-")],
    ["Fuel Type", data.fuelType || "-"],
    ["Policy Type", (data.policyType || "Comprehensive").toUpperCase()],
  ];

  vehicleRows.forEach((row, i) => {
    drawRow(row[0], row[1], y + i * 7, i);
  });
  y += vehicleRows.length * 7 + 4;

  // ── COVERAGE HIGHLIGHTS ──
  if (data.addons.length > 0) {
    y = drawSectionHeader("COVERAGE HIGHLIGHTS", y);
    y += 3;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");

    const cols = 2;
    const colW = (contentW - 10) / cols;
    data.addons.forEach((addon, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const xPos = m + 5 + col * colW;
      const yPos = y + row * 5.5;

      doc.setFillColor(...green);
      doc.circle(xPos + 1.5, yPos - 1, 1, "F");
      doc.setTextColor(...dark);
      doc.text(addon, xPos + 5, yPos);
    });

    y += Math.ceil(data.addons.length / cols) * 5.5 + 3;
  }

  // ── PREMIUM BREAKUP TABLE ──
  y = drawSectionHeader("PREMIUM BREAKUP", y);

  const premiumRows: [string, string, boolean][] = [
    ["Basic OD Premium", formatINR(data.basicOD), false],
    ["OD Discount", `- ${formatINR(data.odDiscount)}`, false],
    ["NCB Discount", `- ${formatINR(data.ncbDiscount)}`, false],
    ["Net OD Premium", formatINR(netOD), true],
    ["Third Party Premium", formatINR(data.thirdParty), false],
    ["Secure Premium", formatINR(data.securePremium), false],
    ["Add-on Premium", formatINR(data.addonPremium), false],
    ["Net Premium", formatINR(netPremium), true],
    ["GST (18%)", formatINR(gst), false],
  ];

  premiumRows.forEach((row, i) => {
    drawRow(row[0], row[1], y + i * 7, i, row[2]);
  });
  y += premiumRows.length * 7;

  // ── TOTAL PREMIUM BOX ──
  doc.setFillColor(...darkGreen);
  doc.roundedRect(m, y, contentW, 11, 2, 2, "F");
  doc.setFontSize(10.5);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PREMIUM PAYABLE", m + 5, y + 7.5);
  doc.setFontSize(12);
  doc.text(formatINR(totalPremium), pw - m - 5, y + 7.5, { align: "right" });
  y += 15;

  // ── QUOTE SUMMARY BOX & TERMS (only if space available) ──
  const spaceNeeded = 30;
  if (y + spaceNeeded < footerY) {
    doc.setFillColor(...lightGreen);
    doc.roundedRect(m, y, contentW, 12, 2, 2, "F");
    doc.setDrawColor(...green);
    doc.setLineWidth(0.4);
    doc.roundedRect(m, y, contentW, 12, 2, 2, "S");
    doc.setFontSize(8);
    doc.setTextColor(...darkGreen);
    doc.setFont("helvetica", "bold");
    doc.text("Quote Summary", m + 5, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    doc.text(`Net Premium: ${formatINR(netPremium)}  |  GST: ${formatINR(gst)}  |  Total: ${formatINR(totalPremium)}`, m + 5, y + 10);
    y += 15;
  }

  if (y + 8 < footerY) {
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.setFont("helvetica", "italic");
    doc.text("* This is an indicative quotation. Actual premium may vary based on insurer underwriting guidelines.", m, y);
    y += 3.5;
    if (y + 4 < footerY) {
      doc.text(`* Quote valid for 7 days from ${format(new Date(), "dd MMM yyyy")}.`, m, y);
    }
  }

  // ── FOOTER ──
  doc.setFillColor(...green);
  doc.rect(0, footerY, pw, footerH, "F");
  doc.setFillColor(...darkGreen);
  doc.rect(0, footerY, pw, 2, "F");

  doc.setFontSize(9);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("Grabyourcar Insurance Desk", m, footerY + 9);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Phone: +91 98559 24442  |  Email: hello@grabyourcar.com", m, footerY + 15);
  doc.text("Web: www.grabyourcar.com", m, footerY + 20);
  doc.setFontSize(7);
  doc.text("MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana - 122001", pw - m, footerY + 15, { align: "right" });

  // Save
  const fileName = `${(data.customerName || "Customer").replace(/\s+/g, "_")}_${data.vehicleMake || "Vehicle"}_Insurance_Quote.pdf`;
  doc.save(fileName);

  return { doc, fileName, totalPremium, netPremium, gst };
};
