import jsPDF from "jspdf";
import { format, differenceInDays, addDays } from "date-fns";

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
  currentPremium: number;
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

  // Warm amber/orange palette for renewal
  const amber: [number, number, number] = [245, 158, 11];
  const darkAmber: [number, number, number] = [217, 119, 6];
  const lightAmber: [number, number, number] = [255, 251, 235];
  const dark: [number, number, number] = [15, 23, 42];
  const gray: [number, number, number] = [100, 116, 139];
  const white: [number, number, number] = [255, 255, 255];
  const red: [number, number, number] = [220, 38, 38];
  const green: [number, number, number] = [34, 197, 94];

  const expiryDate = new Date(data.policyExpiry);
  const daysLeft = differenceInDays(expiryDate, new Date());
  const isExpired = daysLeft < 0;
  const isUrgent = daysLeft <= 7;

  let y = 0;

  // ── DECORATIVE CORNER BORDERS (amber) ──
  const cLen = 25, cW = 3;
  doc.setDrawColor(...amber);
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
  doc.setFontSize(46);
  doc.setTextColor(252, 248, 240);
  doc.setFont("helvetica", "bold");
  doc.text("RENEWAL", pw / 2, ph / 2.5, { align: "center", angle: 35 });
  doc.text("REMINDER", pw / 2, ph / 1.5, { align: "center", angle: 35 });

  // ── HEADER ──
  doc.setFillColor(...amber);
  doc.rect(0, 0, pw, 36, "F");
  doc.setFillColor(...darkAmber);
  doc.rect(0, 33, pw, 3, "F");

  doc.setFontSize(24);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", m, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Insurance Renewal Desk", m, 27);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("www.grabyourcar.com", pw - m, 18, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("+91 98559 24442", pw - m, 27, { align: "right" });

  y = 46;

  // ── TITLE ──
  doc.setFontSize(16);
  doc.setTextColor(...darkAmber);
  doc.setFont("helvetica", "bold");
  doc.text("INSURANCE RENEWAL REMINDER", pw / 2, y, { align: "center" });
  y += 5;
  doc.setFillColor(...amber);
  doc.rect((pw - 120) / 2, y, 120, 1.5, "F");
  y += 10;

  // ── URGENCY BADGE ──
  const badgeColor: [number, number, number] = isExpired ? red : isUrgent ? red : amber;
  const badgeText = isExpired
    ? `POLICY EXPIRED ${Math.abs(daysLeft)} DAYS AGO`
    : isUrgent
      ? `URGENT: ${daysLeft} DAYS LEFT TO RENEW`
      : `${daysLeft} DAYS LEFT TO RENEW`;

  doc.setFillColor(...badgeColor);
  const badgeW = 130;
  doc.roundedRect((pw - badgeW) / 2, y, badgeW, 10, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text(badgeText, pw / 2, y + 7, { align: "center" });
  y += 16;

  // ── GREETING ──
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "normal");
  doc.text(`Dear ${data.customerName || "Valued Customer"},`, m, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  const greetMsg = isExpired
    ? "Your motor insurance policy has expired. Please renew immediately to ensure continuous coverage and protect your No Claim Bonus."
    : `Your motor insurance policy is expiring on ${format(expiryDate, "dd MMMM yyyy")}. We recommend renewing early to maintain your NCB benefit and uninterrupted coverage.`;
  doc.text(greetMsg, m, y, { maxWidth: pw - 2 * m });
  y += greetMsg.length > 100 ? 14 : 10;

  // ── Date & Ref ──
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(`Date: ${format(new Date(), "dd MMM yyyy")}`, m, y);
  doc.text(`Ref: GYC-RNW-${Date.now().toString().slice(-6)}`, pw - m, y, { align: "right" });
  y += 8;

  // ── Helper: table header ──
  const drawHeader = (label: string, yStart: number, color: [number, number, number] = amber): number => {
    doc.setFillColor(...color);
    doc.rect(m, yStart, pw - 2 * m, 8, "F");
    doc.setFontSize(9);
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.text(label, m + 4, yStart + 5.5);
    return yStart + 8;
  };

  // ── CURRENT POLICY DETAILS ──
  y = drawHeader("CURRENT POLICY DETAILS", y);
  const policyRows = [
    ["Policy Holder", (data.customerName || "—").toUpperCase()],
    ["Insurance Company", data.currentInsurer || "—"],
    ["Policy Number", data.policyNumber || "—"],
    ["Vehicle", `${data.vehicleMake} ${data.vehicleModel}`.toUpperCase()],
    ["Registration No.", (data.vehicleNumber || "—").toUpperCase()],
    ["Year of Manufacture", String(data.vehicleYear || "—")],
    ["Policy Type", (data.policyType || "Comprehensive").toUpperCase()],
    ["Policy Expiry", data.policyExpiry ? format(expiryDate, "dd MMMM yyyy") : "—"],
    ["Current Premium", data.currentPremium ? formatINR(data.currentPremium) : "—"],
    ["NCB Percentage", `${data.ncbPercentage || 0}%`],
  ];
  if (data.idv) policyRows.push(["IDV", formatINR(data.idv)]);

  policyRows.forEach((row, i) => {
    const rY = y + i * 7;
    doc.setFillColor(i % 2 === 0 ? 255 : 254, i % 2 === 0 ? 255 : 252, i % 2 === 0 ? 255 : 247);
    doc.rect(m, rY, pw - 2 * m, 7, "F");
    doc.setDrawColor(235, 235, 235);
    doc.line(m, rY + 7, pw - m, rY + 7);
    doc.setFontSize(8.5);
    doc.setTextColor(...gray);
    doc.setFont("helvetica", "normal");
    doc.text(row[0], m + 4, rY + 5);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], pw - m - 4, rY + 5, { align: "right" });
  });
  y += policyRows.length * 7 + 6;

  // ── EXISTING COVERAGE ──
  if (data.addons && data.addons.length > 0) {
    y = drawHeader("EXISTING COVERAGE ADD-ONS", y);
    y += 3;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const cols = 2;
    const colW = (pw - 2 * m - 10) / cols;
    data.addons.forEach((addon, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const xPos = m + 4 + col * colW;
      const yPos = y + row * 6;
      doc.setFillColor(...amber);
      doc.circle(xPos + 1.5, yPos - 1, 1.2, "F");
      doc.setTextColor(...dark);
      doc.text(addon, xPos + 5, yPos);
    });
    y += Math.ceil(data.addons.length / cols) * 6 + 4;
  }

  // ── WHY RENEW WITH US ──
  y = drawHeader("WHY RENEW WITH GRABYOURCAR?", y, [34, 197, 94]);
  y += 3;
  const benefits = [
    ">> Best Premium Rates - We compare 15+ insurers for you",
    ">> Protect Your NCB - Don't lose years of No Claim Bonus",
    ">> Hassle-Free Claims - Dedicated support for claim settlement",
    ">> Zero Paperwork - Digital policy issuance in minutes",
    ">> Free Add-on Advisory - Expert guidance on coverage needs",
  ];
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  benefits.forEach((b, i) => {
    doc.text(b, m + 4, y + i * 6);
  });
  y += benefits.length * 6 + 4;

  // ── NCB SAVINGS CALLOUT ──
  doc.setFillColor(...lightAmber);
  doc.roundedRect(m, y, pw - 2 * m, 16, 3, 3, "F");
  doc.setDrawColor(...amber);
  doc.setLineWidth(0.5);
  doc.roundedRect(m, y, pw - 2 * m, 16, 3, 3, "S");
  doc.setFontSize(9);
  doc.setTextColor(...darkAmber);
  doc.setFont("helvetica", "bold");
  doc.text(`Your NCB: ${data.ncbPercentage || 0}%`, m + 5, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...dark);
  doc.text("Renew on time to retain your No Claim Bonus and save on next year's premium!", m + 5, y + 12);
  y += 22;

  // ── TERMS ──
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.setFont("helvetica", "italic");
  doc.text("* Renewal quote may vary based on current IDV, NCB, claims history, and insurer guidelines.", m, y);
  y += 4;
  doc.text("* Contact us for a detailed renewal quotation with the best available rates.", m, y);

  // ── FOOTER ──
  const fY = ph - 22;
  doc.setFillColor(...amber);
  doc.rect(0, fY, pw, 22, "F");
  doc.setFillColor(...darkAmber);
  doc.rect(0, fY, pw, 2, "F");

  doc.setFontSize(9);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("Grabyourcar Insurance Renewal Desk", m, fY + 8);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Phone: +91 98559 24442  |  Email: hello@grabyourcar.com  |  Web: www.grabyourcar.com", m, fY + 14);
  doc.setFontSize(7);
  doc.text("MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana - 122001", pw - m, fY + 14, { align: "right" });

  const fileName = `${(data.customerName || "Customer").replace(/\s+/g, "_")}_Renewal_Reminder.pdf`;
  doc.save(fileName);
  return { doc, fileName };
};
