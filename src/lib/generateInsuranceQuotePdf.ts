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
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 14;
  const contentW = pw - 2 * m;

  const branding = loadInsurancePdfBrandingCache();
  const insurerLogoUrl = data.insurerLogoUrl || resolveInsurerLogo(data.insuranceCompany, branding);
  const brandLogoUrl = branding.grabyourcarLogoUrl;

  // Color palette
  const green: [number, number, number] = [16, 185, 129];
  const darkGreen: [number, number, number] = [6, 95, 70];
  const lightGreen: [number, number, number] = [236, 253, 245];
  const mint: [number, number, number] = [209, 250, 229];
  const dark: [number, number, number] = [15, 23, 42];
  const gray: [number, number, number] = [100, 116, 139];
  const lightGray: [number, number, number] = [226, 232, 240];
  const white: [number, number, number] = [255, 255, 255];

  const footerH = 22;
  const footerY = ph - footerH;

  // Premium calculations
  const netOD = Math.max(0, data.basicOD - data.odDiscount - data.ncbDiscount);
  const netPremium = netOD + data.thirdParty + data.securePremium + data.addonPremium;
  const gst = Math.round(netPremium * 0.18);
  const totalPremium = netPremium + gst;

  let y = 0;

  // ── Page break helper ──
  const checkPageBreak = (needed: number) => {
    if (y + needed > footerY - 6) {
      drawFooter();
      doc.addPage();
      y = 16;
    }
  };

  // ── Draw helpers ──
  const drawSectionLabel = (label: string, top: number) => {
    checkPageBreak(12);
    doc.setFillColor(...lightGreen);
    doc.roundedRect(m, top, contentW, 8, 2, 2, "F");
    doc.setTextColor(...darkGreen);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label, m + 4, top + 5.4);
    return top + 10;
  };

  const drawInfoCard = (x: number, top: number, width: number, title: string, lines: string[], tone: [number, number, number]) => {
    const textLines = lines.flatMap((line) => doc.splitTextToSize(line, width - 10) as string[]);
    const height = Math.max(26, 12 + textLines.length * 4.8);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...lightGray);
    doc.roundedRect(x, top, width, height, 3, 3, "FD");
    // Title bar
    doc.setFillColor(...tone);
    doc.roundedRect(x, top, width, 6, 3, 3, "F");
    doc.rect(x, top + 3, width, 3, "F"); // fill bottom corners of title bar
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...white);
    doc.text(title, x + 4, top + 4.2);
    // Body text
    doc.setTextColor(...dark);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    textLines.forEach((line, index) => {
      doc.text(line, x + 4, top + 11 + index * 4.8);
    });
    return height;
  };

  const drawKeyValueTable = (rows: Array<[string, string, boolean?]>, top: number) => {
    let rowY = top;
    rows.forEach((row, index) => {
      const valueLines = doc.splitTextToSize(row[1] || "-", 78) as string[];
      const rowHeight = Math.max(8, 4.5 + valueLines.length * 4.2);
      checkPageBreak(rowHeight);
      const rowFill: [number, number, number] = row[2]
        ? mint
        : index % 2 === 0
          ? [255, 255, 255]
          : [248, 250, 252];
      doc.setFillColor(...rowFill);
      doc.rect(m, rowY, contentW, rowHeight, "F");
      doc.setDrawColor(...lightGray);
      doc.line(m, rowY + rowHeight, pw - m, rowY + rowHeight);
      doc.setFont("helvetica", row[2] ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...(row[2] ? darkGreen : gray));
      doc.text(row[0], m + 4, rowY + 5.2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      doc.text(valueLines, pw - m - 4, rowY + 5.2, { align: "right" });
      rowY += rowHeight;
    });
    return rowY;
  };

  const drawFooter = () => {
    const fy = ph - footerH;
    doc.setFillColor(...green);
    doc.rect(0, fy, pw, footerH, "F");
    doc.setFillColor(...darkGreen);
    doc.rect(0, fy, pw, 1.5, "F");

    if (brandLogoUrl) {
      try { doc.addImage(brandLogoUrl, "PNG", m, fy + 3, 13, 7); } catch {}
    }

    const fx = brandLogoUrl ? m + 17 : m;
    doc.setFontSize(8);
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.text("Grabyourcar Insurance Desk", fx, fy + 7.5);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Phone: +91 98559 24442  |  Email: hello@grabyourcar.com  |  Web: www.grabyourcar.com", fx, fy + 12.5);
    doc.setFontSize(6.5);
    doc.text("MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana - 122001", pw - m, fy + 18, { align: "right" });
  };

  // ══════════════════════════════════════════════
  // ── HEADER ──
  // ══════════════════════════════════════════════
  doc.setFillColor(...darkGreen);
  doc.rect(0, 0, pw, 38, "F");
  doc.setFillColor(...green);
  doc.rect(0, 30, pw, 8, "F");

  // Subtle decorative circles
  doc.setFillColor(255, 255, 255);
  doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
  doc.circle(pw - 18, 10, 16, "F");
  doc.circle(pw - 5, 26, 12, "F");
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  if (brandLogoUrl) {
    try { doc.addImage(brandLogoUrl, "PNG", m, 7, 24, 13); } catch {}
  }

  doc.setFontSize(18);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text(branding.brandName || "GRABYOURCAR", brandLogoUrl ? m + 28 : m, 15);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const tagline = doc.splitTextToSize(branding.brandTagline || "India's Smarter Way to Buy New Cars", 68) as string[];
  doc.text(tagline, brandLogoUrl ? m + 28 : m, 21);

  if (insurerLogoUrl) {
    try { doc.addImage(insurerLogoUrl, "PNG", pw - m - 20, 8, 20, 11); } catch {}
  }

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("www.grabyourcar.com", pw - m, 14, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const insurerLines = doc.splitTextToSize(data.insuranceCompany || "Insurance Desk", 65) as string[];
  doc.text(insurerLines, pw - m, 21, { align: "right" });

  y = 46;

  // ── Title ──
  doc.setFontSize(15);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text("Premium Motor Insurance Quote", m, y);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(`Prepared for ${data.customerName || "Valued Customer"}  --  ${format(new Date(), "dd MMM yyyy")}`, m, y + 5.5);
  doc.text(`Ref: GYC-INS-${Date.now().toString().slice(-6)}`, pw - m, y + 5.5, { align: "right" });
  y += 12;

  // ── Info Cards ──
  const cardW = (contentW - 4) / 2;
  const leftH = drawInfoCard(m, y, cardW, "CUSTOMER DETAILS", [
    data.customerName || "Valued Customer",
    data.phone,
    data.email || "No email provided",
    data.city || "City not captured",
  ], green);
  const rightH = drawInfoCard(m + cardW + 4, y, cardW, "VEHICLE DETAILS", [
    `${data.vehicleMake} ${data.vehicleModel}`,
    `Reg: ${(data.vehicleNumber || "-").toUpperCase()}`,
    `Year: ${data.vehicleYear || "-"}  |  Fuel: ${data.fuelType || "-"}`,
    `Policy: ${(data.policyType || "Comprehensive").replace(/_/g, " ").toUpperCase()}`,
  ], darkGreen);
  y += Math.max(leftH, rightH) + 6;

  // ── Vehicle & Policy Table ──
  y = drawSectionLabel("VEHICLE & POLICY DETAILS", y);
  const vehicleRows: [string, string, boolean?][] = [
    ["Insurance Provider", data.insuranceCompany || "-"],
    ["Vehicle", `${data.vehicleMake} ${data.vehicleModel}`.toUpperCase()],
    ["Registration Number", (data.vehicleNumber || "-").toUpperCase()],
    ["Insured Declared Value (IDV)", formatINR(data.idv)],
    ["Year of Manufacture", String(data.vehicleYear || "-")],
    ["Fuel Type", data.fuelType || "-"],
    ["Policy Type", (data.policyType || "Comprehensive").toUpperCase()],
  ];
  y = drawKeyValueTable(vehicleRows, y) + 5;

  // ── Add-on Coverage Chips ──
  if (data.addons.length > 0) {
    checkPageBreak(20);
    y = drawSectionLabel("COVERAGE HIGHLIGHTS", y);
    const chipGap = 3;
    const chipHeight = 7;
    let chipX = m;
    let chipY = y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    data.addons.forEach((addon) => {
      const chipWidth = Math.min(contentW, doc.getTextWidth(addon) + 10);
      if (chipX + chipWidth > pw - m) {
        chipX = m;
        chipY += chipHeight + chipGap;
      }
      checkPageBreak(chipHeight + chipGap);
      doc.setFillColor(...lightGreen);
      doc.setDrawColor(...mint);
      doc.roundedRect(chipX, chipY, chipWidth, chipHeight, 3.5, 3.5, "FD");
      doc.setTextColor(...darkGreen);
      doc.text(addon, chipX + 5, chipY + 4.8);
      chipX += chipWidth + chipGap;
    });
    y = chipY + chipHeight + 5;
  }

  // ── Premium Breakup ──
  checkPageBreak(80);
  y = drawSectionLabel("PREMIUM BREAKUP", y);

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
  y = drawKeyValueTable(premiumRows, y);

  // ── Total Premium Banner ──
  checkPageBreak(20);
  doc.setFillColor(...darkGreen);
  doc.roundedRect(m, y + 3, contentW, 13, 4, 4, "F");
  doc.setFontSize(9);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PREMIUM PAYABLE", m + 5, y + 10.8);
  doc.setFontSize(13);
  doc.text(formatINR(totalPremium), pw - m - 5, y + 10.8, { align: "right" });
  y += 21;

  // ── Notes Section ──
  checkPageBreak(24);
  doc.setFillColor(...lightGreen);
  doc.setDrawColor(...mint);
  const notes = [
    "This is an indicative quotation. Final premium may vary as per underwriting, inspection and claim history.",
    `Quote validity: 7 days from ${format(new Date(), "dd MMM yyyy")}.`,
    "Policy issuance is subject to insurer approval and receipt of complete documents/payment.",
  ];
  const noteText = notes.map((n) => `- ${n}`);
  const noteLines = noteText.flatMap((n) => doc.splitTextToSize(n, contentW - 10) as string[]);
  const noteBoxH = Math.max(16, 8 + noteLines.length * 3.6);
  doc.roundedRect(m, y, contentW, noteBoxH, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...darkGreen);
  doc.text("Important Notes", m + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  doc.setFontSize(7);
  doc.text(noteLines, m + 4, y + 9.5);

  // ── Footer ──
  drawFooter();

  // ── Save ──
  const fileName = `${(data.customerName || "Customer").replace(/\s+/g, "_")}_${data.vehicleMake || "Vehicle"}_Insurance_Quote.pdf`;
  doc.save(fileName);

  return { doc, fileName, totalPremium, netPremium, gst };
};
