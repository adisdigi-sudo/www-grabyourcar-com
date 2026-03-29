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
  claimTaken?: boolean;
}

const formatINR = (amount: number): string =>
  `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;

export const generateInsuranceQuotePdf = (data: InsuranceQuoteData, options?: { skipDownload?: boolean }) => {
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

  const footerH = 18;
  const footerY = ph - footerH;

  // Premium calculations
  const netOD = Math.max(0, data.basicOD - data.odDiscount - data.ncbDiscount);
  const netPremium = netOD + data.thirdParty + data.securePremium + data.addonPremium;
  const gst = Math.round(netPremium * 0.18);
  const totalPremium = netPremium + gst;

  let y = 0;

  // ── Page break helper ──
  const checkPageBreak = (needed: number) => {
    if (y + needed > footerY - 4) {
      drawFooter();
      doc.addPage();
      drawWatermark();
      y = 12;
    }
  };

  // ── Draw helpers ──
  const drawSectionLabel = (label: string, top: number) => {
    checkPageBreak(10);
    doc.setFillColor(...lightGreen);
    doc.roundedRect(m, top, contentW, 7, 1.5, 1.5, "F");
    doc.setTextColor(...darkGreen);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, m + 3, top + 4.8);
    return top + 8;
  };

  const drawKeyValueRow = (label: string, value: string, rowY: number, isHighlight: boolean, isEven: boolean) => {
    const rowH = 6.5;
    checkPageBreak(rowH);
    const rowFill: [number, number, number] = isHighlight ? mint : isEven ? [248, 250, 252] : [255, 255, 255];
    doc.setFillColor(...rowFill);
    doc.rect(m, rowY, contentW, rowH, "F");
    doc.setDrawColor(...lightGray);
    doc.line(m, rowY + rowH, pw - m, rowY + rowH);
    doc.setFont("helvetica", isHighlight ? "bold" : "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...(isHighlight ? darkGreen : gray));
    doc.text(label, m + 3, rowY + 4.3);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(value, pw - m - 3, rowY + 4.3, { align: "right" });
    return rowY + rowH;
  };

  const drawFooter = () => {
    const fy = ph - footerH;
    doc.setFillColor(...green);
    doc.rect(0, fy, pw, footerH, "F");
    doc.setFillColor(...darkGreen);
    doc.rect(0, fy, pw, 1, "F");
    if (brandLogoUrl) {
      try { doc.addImage(brandLogoUrl, "PNG", m, fy + 2.5, 11, 6); } catch {}
    }
    const fx = brandLogoUrl ? m + 14 : m;
    doc.setFontSize(7);
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.text("Grabyourcar Insurance Desk", fx, fy + 6);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("Phone: +91 98559 24442  |  Email: hello@grabyourcar.com  |  Web: www.grabyourcar.com", fx, fy + 10.5);
    doc.setFontSize(5.5);
    doc.text("MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana - 122001", pw - m, fy + 15, { align: "right" });
  };

  // ── Diagonal watermark ──
  const drawWatermark = () => {
    try {
      const GState = (doc as any).GState;
      if (GState) {
        doc.saveGraphicsState();
        doc.setGState(new GState({ opacity: 0.04 }));
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(60);
        doc.setFont("helvetica", "bold");
        doc.text("GRABYOURCAR", pw / 2, ph / 2, { align: "center", angle: 35 });
        doc.setGState(new GState({ opacity: 1 }));
        doc.restoreGraphicsState();
      }
    } catch {}
  };

  // ══════════════════════════════════════════════
  // ── HEADER (compact) ──
  // ══════════════════════════════════════════════
  drawWatermark();

  doc.setFillColor(...darkGreen);
  doc.rect(0, 0, pw, 32, "F");
  doc.setFillColor(...green);
  doc.rect(0, 25, pw, 7, "F");

  try {
    doc.setFillColor(255, 255, 255);
    const GState = (doc as any).GState;
    if (GState) {
      doc.setGState(new GState({ opacity: 0.04 }));
      doc.circle(pw - 18, 10, 14, "F");
      doc.setGState(new GState({ opacity: 1 }));
    }
  } catch {}

  if (brandLogoUrl) {
    try { doc.addImage(brandLogoUrl, "PNG", m, 6, 20, 11); } catch {}
  }

  doc.setFontSize(16);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text(branding.brandName || "GRABYOURCAR", brandLogoUrl ? m + 23 : m, 13);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(branding.brandTagline || "India's Smarter Way to Buy New Cars", brandLogoUrl ? m + 23 : m, 18);

  if (insurerLogoUrl) {
    try { doc.addImage(insurerLogoUrl, "PNG", pw - m - 18, 6, 18, 10); } catch {}
  }

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("www.grabyourcar.com", pw - m, 12, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(data.insuranceCompany || "Insurance Desk", pw - m, 18, { align: "right" });

  y = 38;

  // ── Title ──
  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text("Premium Motor Insurance Quote", m, y);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(`Prepared for ${data.customerName || "Valued Customer"}  •  ${format(new Date(), "dd MMM yyyy")}`, m, y + 5);
  doc.text(`Ref: GYC-INS-${Date.now().toString().slice(-6)}`, pw - m, y + 5, { align: "right" });
  y += 10;

  // ── Compact Details Row (replaces info cards + vehicle table) ──
  y = drawSectionLabel("CUSTOMER & VEHICLE DETAILS", y);

  const detailRows: [string, string, boolean][] = [
    ["Customer", `${data.customerName || "Valued Customer"}  |  ${data.phone}`, false],
    ["Vehicle", `${data.vehicleMake} ${data.vehicleModel}  |  ${(data.vehicleNumber || "-").toUpperCase()}  |  ${data.vehicleYear}  |  ${data.fuelType}`, false],
    ["Insurance", `${data.insuranceCompany || "-"}  |  ${(data.policyType || "Comprehensive").toUpperCase()}  |  IDV: ${formatINR(data.idv)}`, false],
  ];
  detailRows.forEach((row, i) => {
    y = drawKeyValueRow(row[0], row[1], y, row[2], i % 2 === 0);
  });
  y += 4;

  // ── Add-on Coverage Chips (compact) ──
  if (data.addons.length > 0) {
    checkPageBreak(14);
    y = drawSectionLabel("COVERAGE ADD-ONS", y);
    const chipH = 5.5;
    const chipGap = 2;
    let chipX = m;
    let chipY = y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    data.addons.forEach((addon) => {
      const chipW = Math.min(contentW, doc.getTextWidth(addon) + 8);
      if (chipX + chipW > pw - m) { chipX = m; chipY += chipH + chipGap; }
      checkPageBreak(chipH + chipGap);
      doc.setFillColor(...lightGreen);
      doc.setDrawColor(...mint);
      doc.roundedRect(chipX, chipY, chipW, chipH, 2.5, 2.5, "FD");
      doc.setTextColor(...darkGreen);
      doc.text(addon, chipX + 4, chipY + 3.8);
      chipX += chipW + chipGap;
    });
    y = chipY + chipH + 4;
  }

  // ── Premium Breakup ──
  checkPageBreak(60);
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
  premiumRows.forEach((row, i) => {
    y = drawKeyValueRow(row[0], row[1], y, row[2], i % 2 === 0);
  });

  // ── Total Premium Banner ──
  checkPageBreak(14);
  doc.setFillColor(...darkGreen);
  doc.roundedRect(m, y + 2, contentW, 11, 3, 3, "F");
  doc.setFontSize(8);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PREMIUM PAYABLE", m + 4, y + 8.5);
  doc.setFontSize(12);
  doc.text(formatINR(totalPremium), pw - m - 4, y + 8.5, { align: "right" });
  y += 16;

  // ── Combined Warning Box (Expiry + NCB in one compact box) ──
  checkPageBreak(28);
  const red: [number, number, number] = [220, 38, 38];
  const lightRed: [number, number, number] = [254, 242, 242];

  doc.setFillColor(...lightRed);
  doc.setDrawColor(...red);
  doc.setLineWidth(0.4);
  doc.roundedRect(m, y, contentW, 24, 2, 2, "FD");
  doc.setLineWidth(0.2);

  doc.setFillColor(...red);
  doc.roundedRect(m, y, 6, 24, 2, 0, "F");
  doc.rect(m + 3, y, 3, 24, "F");
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("!", m + 2.5, y + 13);

  doc.setTextColor(...red);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("IMPORTANT WARNINGS", m + 10, y + 5);
  doc.setFontSize(5.8);
  doc.setFont("helvetica", "normal");
  const warnings = doc.splitTextToSize(
    "1. Driving without valid insurance is punishable under Motor Vehicles Act, 1988 (Fine upto Rs.25,000 and/or imprisonment upto 3 months). " +
    "2. NCB discount is based on customer's self-declaration. If found false, insurer may cancel NCB, reject claims, or cancel policy. " +
    (data.claimTaken ? "3. CLAIM DECLARED: NCB discount is NOT applicable. " : "") +
    "Grabyourcar shall not be liable for consequences of incorrect declarations.",
    contentW - 14
  ) as string[];
  doc.text(warnings, m + 10, y + 9);
  y += 27;

  // ── Terms & Conditions (condensed) ──
  checkPageBreak(30);
  y = drawSectionLabel("TERMS & CONDITIONS", y);
  const tcItems = [
    "This is an indicative quotation by Grabyourcar (Adis Makethemoney Services Pvt Ltd), a licensed Insurance Broker. Final premium subject to insurer underwriting & verification.",
    "Quote valid for 7 days. Policy issuance subject to KYC, vehicle inspection (if applicable), and full premium payment. GST @18% applicable.",
    "NCB subject to claims history verification. Add-on covers optional at additional cost. For grievances: +91 98559 24442 / hello@grabyourcar.com.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...gray);
  tcItems.forEach((item, i) => {
    const tcLine = `${i + 1}. ${item}`;
    const wrapped = doc.splitTextToSize(tcLine, contentW - 6) as string[];
    const lineH = wrapped.length * 2.8 + 0.5;
    checkPageBreak(lineH);
    doc.text(wrapped, m + 3, y);
    y += lineH;
  });
  y += 2;

  // ── Notes ──
  checkPageBreak(14);
  doc.setFillColor(...lightGreen);
  doc.setDrawColor(...mint);
  doc.roundedRect(m, y, contentW, 10, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...darkGreen);
  doc.text("Important Notes", m + 3, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  doc.setFontSize(5.5);
  doc.text(`Grabyourcar is a registered Insurance Broker  •  Quote valid: 7 days from ${format(new Date(), "dd MMM yyyy")}  •  All premiums inclusive of taxes`, m + 3, y + 7.5);

  // ── Footer ──
  drawFooter();

  // ── Save ──
  const fileName = `${(data.customerName || "Customer").replace(/\s+/g, "_")}_${data.vehicleMake || "Vehicle"}_Insurance_Quote.pdf`;
  if (!options?.skipDownload) {
    doc.save(fileName);
  }

  return { doc, fileName, totalPremium, netPremium, gst };
};
