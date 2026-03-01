import jsPDF from "jspdf";
import { format } from "date-fns";

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
  // Premium breakup
  basicOD: number;
  odDiscount: number;
  ncbDiscount: number;
  thirdParty: number;
  securePremium: number;
  addonPremium: number;
  // Coverage add-ons
  addons: string[];
}

const formatINR = (amount: number): string => {
  return `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [34, 197, 94];
};

export const generateInsuranceQuotePdf = (data: InsuranceQuoteData) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 15; // margin
  const green: [number, number, number] = [34, 197, 94];
  const darkGreen: [number, number, number] = [22, 163, 74];
  const lightGreen: [number, number, number] = [220, 252, 231];
  const dark: [number, number, number] = [15, 23, 42];
  const gray: [number, number, number] = [100, 116, 139];
  const white: [number, number, number] = [255, 255, 255];
  const tableGray: [number, number, number] = [248, 250, 252];

  // Calculations
  const netOD = Math.max(0, data.basicOD - data.odDiscount - data.ncbDiscount);
  const netPremium = netOD + data.thirdParty + data.securePremium + data.addonPremium;
  const gst = Math.round(netPremium * 0.18);
  const totalPremium = netPremium + gst;

  let y = 0;

  // ── DECORATIVE CORNER BORDERS ──
  const drawCorners = () => {
    const cLen = 25;
    const cW = 3;
    doc.setDrawColor(...green);
    doc.setLineWidth(cW);
    // Top-left
    doc.line(0, cW / 2, cLen, cW / 2);
    doc.line(cW / 2, 0, cW / 2, cLen);
    // Top-right
    doc.line(pw - cLen, cW / 2, pw, cW / 2);
    doc.line(pw - cW / 2, 0, pw - cW / 2, cLen);
    // Bottom-left
    doc.line(0, ph - cW / 2, cLen, ph - cW / 2);
    doc.line(cW / 2, ph - cLen, cW / 2, ph);
    // Bottom-right
    doc.line(pw - cLen, ph - cW / 2, pw, ph - cW / 2);
    doc.line(pw - cW / 2, ph - cLen, pw - cW / 2, ph);
  };
  drawCorners();

  // ── WATERMARK ──
  doc.setFontSize(48);
  doc.setTextColor(245, 245, 245);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", pw / 2, ph / 2.5, { align: "center", angle: 35 });
  doc.text("INSURANCE", pw / 2, ph / 1.4, { align: "center", angle: 35 });

  // ── HEADER BANNER ──
  doc.setFillColor(...green);
  doc.rect(0, 0, pw, 36, "F");
  doc.setFillColor(...darkGreen);
  doc.rect(0, 33, pw, 3, "F");

  // Brand name
  doc.setFontSize(24);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", m, 18);

  // Tagline
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("India's Smarter Way to Buy New Cars", m, 27);

  // Website
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("www.grabyourcar.com", pw - m, 18, { align: "right" });

  // Insurance desk badge
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Insurance Desk", pw - m, 27, { align: "right" });

  y = 46;

  // ── TITLE ──
  doc.setFontSize(16);
  doc.setTextColor(...darkGreen);
  doc.setFont("helvetica", "bold");
  doc.text("PREMIUM MOTOR INSURANCE QUOTATION", pw / 2, y, { align: "center" });

  y += 5;
  // Green underline
  const titleW = 130;
  doc.setFillColor(...green);
  doc.rect((pw - titleW) / 2, y, titleW, 1.5, "F");

  y += 10;

  // ── GREETING ──
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "normal");
  doc.text(`Dear ${data.customerName || "Valued Customer"},`, m, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text("Thank you for choosing Grabyourcar Insurance Desk. Please find your personalized motor insurance quotation below.", m, y, { maxWidth: pw - 2 * m });
  y += 10;

  // ── DATE & QUOTE REF ──
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(`Date: ${format(new Date(), "dd MMM yyyy")}`, m, y);
  doc.text(`Ref: GYC-INS-${Date.now().toString().slice(-6)}`, pw - m, y, { align: "right" });
  y += 8;

  // ── VEHICLE & POLICY TABLE ──
  const drawTableHeader = (label: string, yStart: number): number => {
    doc.setFillColor(...green);
    doc.rect(m, yStart, pw - 2 * m, 8, "F");
    doc.setFontSize(9);
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.text(label, m + 4, yStart + 5.5);
    return yStart + 8;
  };

  y = drawTableHeader("VEHICLE & POLICY DETAILS", y);

  const vehicleRows = [
    ["Insurance Provider", data.insuranceCompany || "—"],
    ["Vehicle", `${data.vehicleMake} ${data.vehicleModel}`.toUpperCase()],
    ["Registration Number", (data.vehicleNumber || "—").toUpperCase()],
    ["Insured Declared Value (IDV)", formatINR(data.idv)],
    ["Year of Manufacture", String(data.vehicleYear || "—")],
    ["Fuel Type", data.fuelType || "—"],
    ["Policy Type", (data.policyType || "Comprehensive").toUpperCase()],
  ];

  vehicleRows.forEach((row, i) => {
    const rY = y + i * 7;
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(m, rY, pw - 2 * m, 7, "F");
    doc.setDrawColor(230, 230, 230);
    doc.line(m, rY + 7, pw - m, rY + 7);

    doc.setFontSize(8.5);
    doc.setTextColor(...gray);
    doc.setFont("helvetica", "normal");
    doc.text(row[0], m + 4, rY + 5);

    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], pw - m - 4, rY + 5, { align: "right" });
  });

  y += vehicleRows.length * 7 + 6;

  // ── COVERAGE HIGHLIGHTS ──
  if (data.addons.length > 0) {
    y = drawTableHeader("COVERAGE HIGHLIGHTS", y);
    y += 3;

    doc.setFontSize(8.5);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "normal");

    const cols = 2;
    const colW = (pw - 2 * m - 10) / cols;
    data.addons.forEach((addon, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const xPos = m + 4 + col * colW;
      const yPos = y + row * 6;

      doc.setFillColor(...green);
      doc.circle(xPos + 1.5, yPos - 1, 1.2, "F");
      doc.setTextColor(...dark);
      doc.text(addon, xPos + 5, yPos);
    });

    y += Math.ceil(data.addons.length / cols) * 6 + 4;
  }

  // ── PREMIUM BREAKUP TABLE ──
  y = drawTableHeader("PREMIUM BREAKUP", y);

  const premiumRows: [string, string, boolean?][] = [
    ["Basic OD Premium", formatINR(data.basicOD)],
    ["OD Discount", `- ${formatINR(data.odDiscount)}`],
    ["NCB Discount", `- ${formatINR(data.ncbDiscount)}`],
    ["Net OD Premium", formatINR(netOD), true],
    ["Third Party Premium", formatINR(data.thirdParty)],
    ["Secure Premium", formatINR(data.securePremium)],
    ["Add-on Premium", formatINR(data.addonPremium)],
    ["Net Premium", formatINR(netPremium), true],
    ["GST (18%)", formatINR(gst)],
  ];

  premiumRows.forEach((row, i) => {
    const rY = y + i * 7;
    const isBold = row[2];
    doc.setFillColor(isBold ? 240 : i % 2 === 0 ? 255 : 248, isBold ? 253 : i % 2 === 0 ? 255 : 250, isBold ? 244 : i % 2 === 0 ? 255 : 252);
    doc.rect(m, rY, pw - 2 * m, 7, "F");
    doc.setDrawColor(230, 230, 230);
    doc.line(m, rY + 7, pw - m, rY + 7);

    doc.setFontSize(8.5);
    doc.setTextColor(...(isBold ? darkGreen : gray));
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(row[0], m + 4, rY + 5);

    doc.setTextColor(...(isBold ? darkGreen : dark));
    doc.setFont("helvetica", isBold ? "bold" : "bold");
    doc.text(row[1], pw - m - 4, rY + 5, { align: "right" });
  });

  y += premiumRows.length * 7;

  // ── TOTAL PREMIUM BOX ──
  doc.setFillColor(...darkGreen);
  doc.rect(m, y, pw - 2 * m, 12, "F");
  doc.setFontSize(11);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PREMIUM PAYABLE", m + 4, y + 8);
  doc.setFontSize(13);
  doc.text(formatINR(totalPremium), pw - m - 4, y + 8, { align: "right" });

  y += 18;

  // ── SUMMARY BOX ──
  doc.setFillColor(...lightGreen);
  doc.roundedRect(m, y, pw - 2 * m, 18, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...darkGreen);
  doc.setFont("helvetica", "bold");
  doc.text("Quote Summary", m + 5, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...dark);
  doc.text(`Net Premium: ${formatINR(netPremium)}  |  GST: ${formatINR(gst)}  |  Total: ${formatINR(totalPremium)}`, m + 5, y + 13);

  y += 24;

  // ── TERMS ──
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.setFont("helvetica", "italic");
  doc.text("* This is an indicative quotation. Actual premium may vary based on insurer underwriting guidelines.", m, y);
  y += 4;
  doc.text(`* Quote valid for 7 days from ${format(new Date(), "dd MMM yyyy")}.`, m, y);

  // ── FOOTER ──
  const fY = ph - 22;
  doc.setFillColor(...green);
  doc.rect(0, fY, pw, 22, "F");
  doc.setFillColor(...darkGreen);
  doc.rect(0, fY, pw, 2, "F");

  doc.setFontSize(9);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("Grabyourcar Insurance Desk", m, fY + 8);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Phone: +91 98559 24442  |  Email: hello@grabyourcar.com  |  Web: www.grabyourcar.com", m, fY + 14);

  doc.setFontSize(7);
  doc.text("MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana - 122001", pw - m, fY + 14, { align: "right" });

  // Save
  const fileName = `${(data.customerName || "Customer").replace(/\s+/g, "_")}_${data.vehicleMake || "Vehicle"}_Insurance_Quote.pdf`;
  doc.save(fileName);

  return { doc, fileName, totalPremium, netPremium, gst };
};
