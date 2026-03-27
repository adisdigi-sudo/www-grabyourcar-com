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

const splitRightText = (doc: jsPDF, text: string, maxWidth: number) =>
  doc.splitTextToSize(text || "—", maxWidth) as string[];

export const generateInsuranceQuotePdf = (data: InsuranceQuoteData) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 14;
  const contentW = pw - 2 * m;

  const branding = loadInsurancePdfBrandingCache();
  const insurerLogoUrl = data.insurerLogoUrl || resolveInsurerLogo(data.insuranceCompany, branding);
  const brandLogoUrl = branding.grabyourcarLogoUrl;

  const green: [number, number, number] = [16, 185, 129];
  const darkGreen: [number, number, number] = [6, 95, 70];
  const lightGreen: [number, number, number] = [236, 253, 245];
  const mint: [number, number, number] = [209, 250, 229];
  const dark: [number, number, number] = [15, 23, 42];
  const gray: [number, number, number] = [100, 116, 139];
  const lightGray: [number, number, number] = [226, 232, 240];
  const white: [number, number, number] = [255, 255, 255];

  const footerH = 24;
  const footerY = ph - footerH;

  // Calculations
  const netOD = Math.max(0, data.basicOD - data.odDiscount - data.ncbDiscount);
  const netPremium = netOD + data.thirdParty + data.securePremium + data.addonPremium;
  const gst = Math.round(netPremium * 0.18);
  const totalPremium = netPremium + gst;

  let y = 0;

  const drawSectionLabel = (label: string, top: number) => {
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
    const height = Math.max(24, 10 + textLines.length * 4.5);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...lightGray);
    doc.roundedRect(x, top, width, height, 3, 3, "FD");
    doc.setFillColor(...tone);
    doc.roundedRect(x, top, width, 5, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...white);
    doc.text(title, x + 4, top + 3.7);
    doc.setTextColor(...dark);
    doc.setFontSize(8.4);
    doc.setFont("helvetica", "normal");
    textLines.forEach((line, index) => {
      doc.text(line, x + 4, top + 10 + index * 4.5);
    });
    return height;
  };

  const drawKeyValueTable = (rows: Array<[string, string, boolean?]>, top: number) => {
    let rowY = top;
    rows.forEach((row, index) => {
      const valueLines = splitRightText(doc, row[1], 78);
      const rowHeight = Math.max(8, 4.5 + valueLines.length * 4.2);
      doc.setFillColor(...(row[2] ? mint : index % 2 === 0 ? [255, 255, 255] : [248, 250, 252]));
      doc.rect(m, rowY, contentW, rowHeight, "F");
      doc.setDrawColor(...lightGray);
      doc.line(m, rowY + rowHeight, pw - m, rowY + rowHeight);
      doc.setFont("helvetica", row[2] ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...(row[2] ? darkGreen : gray));
      doc.text(row[0], m + 4, rowY + 5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      doc.text(valueLines, pw - m - 4, rowY + 5, { align: "right" });
      rowY += rowHeight;
    });
    return rowY;
  };

  doc.setFillColor(...darkGreen);
  doc.rect(0, 0, pw, 40, "F");
  doc.setFillColor(...green);
  doc.rect(0, 32, pw, 8, "F");
  doc.setFillColor(255, 255, 255, 0.08 as unknown as number);
  doc.circle(pw - 20, 8, 18, "F");
  doc.circle(pw - 3, 24, 14, "F");

  if (brandLogoUrl) {
    try {
      doc.addImage(brandLogoUrl, "PNG", m, 7, 26, 14);
    } catch {}
  }

  doc.setFontSize(20);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text(branding.brandName || "GRABYOURCAR", brandLogoUrl ? m + 30 : m, 15);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const tagline = doc.splitTextToSize(branding.brandTagline || "India's Smarter Way to Buy New Cars", 70) as string[];
  doc.text(tagline, brandLogoUrl ? m + 30 : m, 21);

  if (insurerLogoUrl) {
    try {
      doc.addImage(insurerLogoUrl, "PNG", pw - m - 22, 8, 22, 12);
    } catch {}
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("www.grabyourcar.com", pw - m, 14, { align: "right" });
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const insurerLines = splitRightText(doc, data.insuranceCompany || "Insurance Desk", 70);
  doc.text(insurerLines, pw - m, 21, { align: "right" });

  y = 48;

  doc.setFontSize(16);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text("Premium Motor Insurance Quote", m, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(`Prepared for ${data.customerName || "Valued Customer"} • ${format(new Date(), "dd MMM yyyy")}`, m, y + 5);
  doc.text(`Ref: GYC-INS-${Date.now().toString().slice(-6)}`, pw - m, y + 5, { align: "right" });
  y += 11;

  const leftCardHeight = drawInfoCard(m, y, (contentW - 4) / 2, "CUSTOMER", [
    data.customerName || "Valued Customer",
    data.phone,
    data.email || "No email provided",
    data.city || "City not captured",
  ], green);
  const rightCardHeight = drawInfoCard(m + (contentW - 4) / 2 + 4, y, (contentW - 4) / 2, "VEHICLE", [
    `${data.vehicleMake} ${data.vehicleModel}`,
    `Reg: ${(data.vehicleNumber || "-").toUpperCase()}`,
    `Year: ${data.vehicleYear || "-"} • Fuel: ${data.fuelType || "-"}`,
    `Policy: ${(data.policyType || "Comprehensive").replace(/_/g, " ").toUpperCase()}`,
  ], darkGreen);
  y += Math.max(leftCardHeight, rightCardHeight) + 6;

  y = drawSectionLabel("VEHICLE & POLICY DETAILS", y);

  const vehicleRows = [
    ["Insurance Provider", data.insuranceCompany || "-"],
    ["Vehicle", `${data.vehicleMake} ${data.vehicleModel}`.toUpperCase()],
    ["Registration Number", (data.vehicleNumber || "-").toUpperCase()],
    ["Insured Declared Value (IDV)", formatINR(data.idv)],
    ["Year of Manufacture", String(data.vehicleYear || "-")],
    ["Fuel Type", data.fuelType || "-"],
    ["Policy Type", (data.policyType || "Comprehensive").toUpperCase()],
  ];

  y = drawKeyValueTable(vehicleRows, y) + 5;

  if (data.addons.length > 0) {
    y = drawSectionLabel("COVERAGE HIGHLIGHTS", y);
    const chipGap = 3;
    const chipHeight = 8;
    let chipX = m;
    let chipY = y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    data.addons.forEach((addon) => {
      const chipWidth = Math.min(contentW, doc.getTextWidth(addon) + 10);
      if (chipX + chipWidth > pw - m) {
        chipX = m;
        chipY += chipHeight + chipGap;
      }
      doc.setFillColor(...lightGreen);
      doc.setDrawColor(...mint);
      doc.roundedRect(chipX, chipY, chipWidth, chipHeight, 4, 4, "FD");
      doc.setTextColor(...darkGreen);
      doc.text(addon, chipX + 5, chipY + 5.2);
      chipX += chipWidth + chipGap;
    });
    y = chipY + chipHeight + 5;
  }

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

  doc.setFillColor(...darkGreen);
  doc.roundedRect(m, y + 3, contentW, 14, 4, 4, "F");
  doc.setFontSize(9);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PREMIUM PAYABLE", m + 5, y + 11.2);
  doc.setFontSize(14);
  doc.text(formatINR(totalPremium), pw - m - 5, y + 11.2, { align: "right" });
  y += 23;

  doc.setFillColor(...lightGreen);
  doc.setDrawColor(...mint);
  doc.roundedRect(m, y, contentW, 18, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkGreen);
  doc.text("Important Notes", m + 4, y + 5.3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  const notes = [
    "This is an indicative quotation. Final premium may vary as per underwriting, inspection and claim history.",
    `Quote validity: 7 days from ${format(new Date(), "dd MMM yyyy")}.`,
    "Policy issuance is subject to insurer approval and receipt of complete documents/payment.",
  ];
  const noteLines = notes.flatMap((note) => doc.splitTextToSize(`• ${note}`, contentW - 8) as string[]);
  doc.setFontSize(7.4);
  doc.text(noteLines, m + 4, y + 9.5);

  doc.setFillColor(...green);
  doc.rect(0, footerY, pw, footerH, "F");
  doc.setFillColor(...darkGreen);
  doc.rect(0, footerY, pw, 2, "F");

  if (brandLogoUrl) {
    try {
      doc.addImage(brandLogoUrl, "PNG", m, footerY + 4, 14, 8);
    } catch {}
  }

  doc.setFontSize(8.5);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("Grabyourcar Insurance Desk", brandLogoUrl ? m + 18 : m, footerY + 9);

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "normal");
  doc.text("Phone: +91 98559 24442  |  Email: hello@grabyourcar.com", brandLogoUrl ? m + 18 : m, footerY + 15);
  doc.text("Web: www.grabyourcar.com", brandLogoUrl ? m + 18 : m, footerY + 20);
  doc.setFontSize(7);
  doc.text("MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana - 122001", pw - m, footerY + 15, { align: "right" });

  // Save
  const fileName = `${(data.customerName || "Customer").replace(/\s+/g, "_")}_${data.vehicleMake || "Vehicle"}_Insurance_Quote.pdf`;
  doc.save(fileName);

  return { doc, fileName, totalPremium, netPremium, gst };
};
