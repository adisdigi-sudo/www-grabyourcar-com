import jsPDF from "jspdf";
import { format, differenceInDays } from "date-fns";

export interface RenewalReminderData {
  customerName: string;
  phone: string;
  email?: string;
  city?: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleNumber: string;
  vehicleYear: number | string;
  currentInsurer: string;
  policyNumber?: string;
  policyType: string;
  policyExpiry: string; // ISO date
  currentPremium: number; // Last year premium paid
  ncbPercentage: number;
  idv?: number;
  addons?: string[];
}

const formatINR = (amount: number): string =>
  `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;

export const generateRenewalReminderPdf = (data: RenewalReminderData) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 15;
  const contentW = pw - 2 * m;

  // Same green palette as quote PDF
  const green: [number, number, number] = [34, 197, 94];
  const darkGreen: [number, number, number] = [22, 163, 74];
  const lightGreen: [number, number, number] = [220, 252, 231];
  const dark: [number, number, number] = [15, 23, 42];
  const gray: [number, number, number] = [100, 116, 139];
  const white: [number, number, number] = [255, 255, 255];
  const red: [number, number, number] = [220, 38, 38];

  const expiryDate = new Date(data.policyExpiry);
  const daysLeft = differenceInDays(expiryDate, new Date());
  const isExpired = daysLeft < 0;
  const isUrgent = daysLeft <= 7;

  // Footer height reserved (same as quote PDF)
  const footerH = 24;
  const footerY = ph - footerH;

  // ── Helper: draw table section header (matches quote PDF) ──
  const drawSectionHeader = (label: string, yStart: number): number => {
    doc.setFillColor(...green);
    doc.roundedRect(m, yStart, contentW, 9, 1.5, 1.5, "F");
    doc.setFontSize(9.5);
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.text(label, m + 5, yStart + 6.2);
    return yStart + 9;
  };

  // ── Helper: draw a data row (matches quote PDF) ──
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

  let y = 0;

  // ── DECORATIVE CORNER ACCENTS (same as quote PDF) ──
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
  doc.text("RENEWAL", pw / 2, ph / 1.4, { align: "center", angle: 35 });

  // ── HEADER BANNER (same as quote PDF) ──
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
  doc.text("Insurance Renewal Desk", m, 24);

  // Website & badge
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("www.grabyourcar.com", pw - m, 16, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("+91 98559 24442", pw - m, 24, { align: "right" });

  y = 42;

  // ── TITLE ──
  doc.setFontSize(14);
  doc.setTextColor(...darkGreen);
  doc.setFont("helvetica", "bold");
  doc.text("INSURANCE RENEWAL REMINDER", pw / 2, y, { align: "center" });
  y += 4;
  doc.setFillColor(...green);
  doc.rect((pw - 120) / 2, y, 120, 1.2, "F");
  y += 7;

  // ── URGENCY BADGE ──
  const badgeColor: [number, number, number] = isExpired ? red : isUrgent ? red : darkGreen;
  const badgeText = isExpired
    ? `POLICY EXPIRED ${Math.abs(daysLeft)} DAYS AGO - RENEW NOW`
    : isUrgent
      ? `URGENT: ONLY ${daysLeft} DAYS LEFT TO RENEW`
      : `${daysLeft} DAYS LEFT TO RENEW YOUR POLICY`;

  doc.setFillColor(...badgeColor);
  const badgeW = 140;
  doc.roundedRect((pw - badgeW) / 2, y, badgeW, 10, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text(badgeText, pw / 2, y + 7, { align: "center" });
  y += 14;

  // ── GREETING ──
  doc.setFontSize(9.5);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "normal");
  doc.text(`Dear ${data.customerName || "Valued Customer"},`, m, y);
  y += 5;
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);
  const greetMsg = isExpired
    ? "Your motor insurance policy has expired. Please renew immediately to ensure continuous coverage and protect your No Claim Bonus."
    : `Your motor insurance policy is expiring on ${format(expiryDate, "dd MMMM yyyy")}. We recommend renewing early to maintain your NCB benefit and uninterrupted coverage.`;
  doc.text(greetMsg, m, y, { maxWidth: contentW });
  y += greetMsg.length > 100 ? 12 : 8;

  // ── DATE & REF ──
  doc.setFontSize(7.5);
  doc.setTextColor(...gray);
  doc.text(`Date: ${format(new Date(), "dd MMM yyyy")}`, m, y);
  doc.text(`Ref: GYC-RNW-${Date.now().toString().slice(-6)}`, pw - m, y, { align: "right" });
  y += 6;

  // ── CUSTOMER & VEHICLE DETAILS ──
  y = drawSectionHeader("CUSTOMER & VEHICLE DETAILS", y);

  const detailRows = [
    ["Policy Holder", (data.customerName || "-").toUpperCase()],
    ["Contact Number", data.phone || "-"],
    ["City", (data.city || "-").toUpperCase()],
    ["Vehicle", `${data.vehicleMake} ${data.vehicleModel}`.toUpperCase()],
    ["Registration Number", (data.vehicleNumber || "-").toUpperCase()],
    ["Year of Manufacture", String(data.vehicleYear || "-")],
  ];

  detailRows.forEach((row, i) => {
    drawRow(row[0], row[1], y + i * 7, i);
  });
  y += detailRows.length * 7 + 4;

  // ── CURRENT POLICY DETAILS ──
  y = drawSectionHeader("CURRENT POLICY DETAILS", y);

  const policyRows: [string, string, boolean][] = [
    ["Insurance Company", data.currentInsurer || "-", false],
    ["Policy Number", data.policyNumber || "-", false],
    ["Policy Type", (data.policyType || "Comprehensive").toUpperCase(), false],
    ["Policy Expiry Date", data.policyExpiry ? format(expiryDate, "dd MMMM yyyy") : "-", true],
    ["Last Year Premium Paid", data.currentPremium ? formatINR(data.currentPremium) : "-", false],
    ["No Claim Bonus (NCB)", `${data.ncbPercentage || 0}%`, false],
  ];
  if (data.idv) policyRows.push(["Insured Declared Value (IDV)", formatINR(data.idv), false]);

  policyRows.forEach((row, i) => {
    drawRow(row[0], row[1], y + i * 7, i, row[2]);
  });
  y += policyRows.length * 7 + 4;

  // ── EXISTING COVERAGE ADD-ONS ──
  if (data.addons && data.addons.length > 0) {
    y = drawSectionHeader("EXISTING COVERAGE ADD-ONS", y);
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

  // ── WHY RENEW WITH US ──
  y = drawSectionHeader("WHY RENEW WITH GRABYOURCAR?", y);
  y += 3;
  const benefits = [
    "Best Premium Rates - We compare 15+ insurers for you",
    "Protect Your NCB - Don't lose years of No Claim Bonus",
    "Hassle-Free Claims - Dedicated support for claim settlement",
    "Zero Paperwork - Digital policy issuance in minutes",
    "Free Add-on Advisory - Expert guidance on coverage needs",
  ];
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  benefits.forEach((b, i) => {
    doc.setFillColor(...green);
    doc.circle(m + 6, y + i * 6 - 1, 1, "F");
    doc.text(b, m + 10, y + i * 6);
  });
  y += benefits.length * 6 + 4;

  // ── NCB SAVINGS CALLOUT ──
  doc.setFillColor(...lightGreen);
  doc.roundedRect(m, y, contentW, 14, 2, 2, "F");
  doc.setDrawColor(...green);
  doc.setLineWidth(0.4);
  doc.roundedRect(m, y, contentW, 14, 2, 2, "S");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkGreen);
  doc.setFont("helvetica", "bold");
  doc.text(`Your Current NCB: ${data.ncbPercentage || 0}%`, m + 5, y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...dark);
  doc.text("Renew on time to retain your No Claim Bonus and save on next year's premium!", m + 5, y + 11);
  y += 18;

  // ── TERMS ──
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.setFont("helvetica", "italic");
  doc.text("* Renewal quote may vary based on current IDV, NCB, claims history, and insurer guidelines.", m, y);
  y += 3.5;
  doc.text("* Contact us for a detailed renewal quotation with the best available rates.", m, y);

  // ── FOOTER (same as quote PDF) ──
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

  const fileName = `${(data.customerName || "Customer").replace(/\s+/g, "_")}_Renewal_Reminder.pdf`;
  doc.save(fileName);
  return { doc, fileName };
};
