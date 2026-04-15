import jsPDF from "jspdf";
import { format } from "date-fns";

interface LoanOfferData {
  customerName: string;
  phone: string;
  carModel?: string;
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
  bankName?: string;
  downPayment?: number;
  processingFee?: number;
  specialOffer?: string;
  bankLogo?: string;
}

interface BankComparison {
  bankName: string;
  interestRate: number;
  processingFee: number;
  emi: number;
  totalPayable: number;
  specialOffer?: string;
}

const fmt = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;
const fmtL = (v: number) => v >= 100000 ? `Rs. ${(v / 100000).toFixed(2)}L` : fmt(v);

// Brand colors
const BRAND = {
  navy: [15, 23, 42] as [number, number, number],       // #0F172A
  emerald: [16, 185, 129] as [number, number, number],   // #10B981
  emeraldDark: [5, 150, 105] as [number, number, number], // #059669
  gold: [245, 158, 11] as [number, number, number],      // #F59E0B
  slate: [100, 116, 139] as [number, number, number],    // #64748B
  slateLight: [241, 245, 249] as [number, number, number],// #F1F5F9
  white: [255, 255, 255] as [number, number, number],
  dark: [30, 41, 59] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  greenLight: [236, 253, 245] as [number, number, number],
};

function calcEMI(principal: number, ratePA: number, months: number) {
  const r = ratePA / 12 / 100;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function generateAmortization(principal: number, ratePA: number, months: number) {
  const r = ratePA / 12 / 100;
  const emi = calcEMI(principal, ratePA, months);
  const rows: { month: number; emi: number; principal: number; interest: number; balance: number }[] = [];
  let bal = principal;
  for (let m = 1; m <= months; m++) {
    const interest = bal * r;
    const princ = emi - interest;
    bal = Math.max(bal - princ, 0);
    rows.push({ month: m, emi, principal: princ, interest, balance: bal });
  }
  return rows;
}

// ─── Premium Header with brand identity ───
function drawPremiumHeader(doc: jsPDF, w: number) {
  // Full-width navy header
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, w, 42, "F");

  // Emerald accent bar at bottom of header
  doc.setFillColor(...BRAND.emerald);
  doc.rect(0, 42, w, 2.5, "F");

  // Gold thin line
  doc.setFillColor(...BRAND.gold);
  doc.rect(0, 44.5, w, 0.5, "F");

  // Brand name (left)
  doc.setTextColor(...BRAND.white);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("GrabYourCar", 15, 17);

  // Tagline
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 220);
  doc.text("Your Trusted Auto Finance Partner", 15, 24);

  // Contact details with separator dots
  doc.setFontSize(7.5);
  doc.setTextColor(150, 170, 190);
  doc.text("www.grabyourcar.com  \u2022  +91 98559 24442  \u2022  info@grabyourcar.com", 15, 32);

  // Right side - Document type badge
  doc.setFillColor(...BRAND.emerald);
  doc.roundedRect(w - 68, 8, 53, 18, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.white);
  doc.text("CAR LOAN", w - 41.5, 16, { align: "center" });
  doc.setFontSize(7);
  doc.text("OFFER", w - 41.5, 22, { align: "center" });

  // Date below badge
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 170, 190);
  doc.text(format(new Date(), "dd MMM yyyy, hh:mm a"), w - 15, 35, { align: "right" });
}

// ─── Premium Footer ───
function drawPremiumFooter(doc: jsPDF, w: number, h: number) {
  const fy = h - 28;

  // Separator
  doc.setDrawColor(...BRAND.emerald);
  doc.setLineWidth(0.4);
  doc.line(15, fy, w - 15, fy);

  // Disclaimer text
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 160);
  doc.text("* This is an indicative loan offer. Final terms subject to bank/NBFC approval. EMI calculated on reducing balance method.", 15, fy + 5);
  doc.text("* Processing fees, GST, and other charges may apply as per the lending institution's policy.", 15, fy + 9);
  doc.text("* Offer validity: 7 days from date of generation. Prices and rates subject to change without notice.", 15, fy + 13);

  // Bottom bar
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, h - 10, w, 10, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.emerald);
  doc.text("GrabYourCar", 15, h - 4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 220);
  doc.text(`\u2022  ${format(new Date(), "dd MMM yyyy")}  \u2022  Confidential & Personalized Offer`, 48, h - 4);
  doc.text("Page 1", w - 15, h - 4, { align: "right" });
}

// ─── Section heading with emerald underline ───
function drawSectionHeading(doc: jsPDF, x: number, y: number, title: string, subtitle?: string): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.navy);
  doc.text(title, x, y);
  
  const titleWidth = doc.getTextWidth(title);
  doc.setDrawColor(...BRAND.emerald);
  doc.setLineWidth(0.8);
  doc.line(x, y + 1.5, x + titleWidth + 4, y + 1.5);
  doc.setLineWidth(0.2);

  if (subtitle) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.slate);
    doc.text(subtitle, x + titleWidth + 8, y);
  }
  return y + 7;
}

// ─── Row with label/value + alternating bg ───
function drawLabelRow(doc: jsPDF, x: number, y: number, w: number, label: string, value: string, opts?: { highlight?: boolean; deduct?: boolean; bold?: boolean }) {
  if (opts?.highlight) {
    doc.setFillColor(...BRAND.greenLight);
    doc.rect(x, y - 4, w, 9, "F");
  }
  doc.setFontSize(8.5);
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.setTextColor(opts?.deduct ? ...BRAND.red : 80, opts?.deduct ? 38 : 80, opts?.deduct ? 38 : 80);
  doc.text(label, x + 4, y + 1);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + w - 4, y + 1, { align: "right" });
}

// ─── Single Offer PDF ───
export function generateLoanOfferPDF(data: LoanOfferData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const mx = 15;
  const bw = w - 2 * mx;

  drawPremiumHeader(doc, w);

  let y = 54;

  // ── Customer Info Card ──
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(mx, y, bw, 20, 3, 3, "F");
  doc.setDrawColor(200, 210, 225);
  doc.roundedRect(mx, y, bw, 20, 3, 3, "S");

  // Green left accent
  doc.setFillColor(...BRAND.emerald);
  doc.rect(mx, y, 3, 20, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.slate);
  doc.text("CUSTOMER DETAILS", mx + 8, y + 5.5);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.navy);
  doc.text(data.customerName, mx + 8, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.slate);
  doc.text(data.phone, mx + 80, y + 12);
  if (data.carModel) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.emeraldDark);
    doc.text(data.carModel, mx + 130, y + 12);
  }
  y += 28;

  // ── EMI Highlight Card ──
  const emi = calcEMI(data.loanAmount, data.interestRate, data.tenureMonths);
  const totalPayable = emi * data.tenureMonths;
  const totalInterest = totalPayable - data.loanAmount;

  // Navy EMI card
  doc.setFillColor(...BRAND.navy);
  doc.roundedRect(mx, y, bw, 38, 4, 4, "F");

  // Emerald glow accent
  doc.setFillColor(...BRAND.emerald);
  doc.roundedRect(mx + 2, y + 2, 4, 34, 2, 2, "F");

  // EMI amount
  doc.setTextColor(...BRAND.emerald);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(fmt(emi), w / 2, y + 16, { align: "center" });

  // "/month" label
  doc.setFontSize(10);
  doc.setTextColor(200, 230, 220);
  doc.text("/month", w / 2 + doc.getTextWidth(fmt(emi)) / 2 + 3, y + 16);

  // Details line
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 220);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.tenureMonths} months (${(data.tenureMonths / 12).toFixed(1)} years) @ ${data.interestRate}% p.a.`, w / 2, y + 25, { align: "center" });

  // Bank name badge
  if (data.bankName) {
    doc.setFillColor(...BRAND.emerald);
    const bankText = `via ${data.bankName}`;
    const bankW = doc.getTextWidth(bankText) + 12;
    doc.roundedRect(w / 2 - bankW / 2, y + 28, bankW, 6, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.white);
    doc.setFont("helvetica", "bold");
    doc.text(bankText, w / 2, y + 32.5, { align: "center" });
  }
  y += 46;

  // ── Loan Details Table ──
  y = drawSectionHeading(doc, mx, y, "LOAN DETAILS");

  const rows: [string, string][] = [
    ["Loan Amount", fmt(data.loanAmount)],
    ["Interest Rate (p.a.)", `${data.interestRate}%`],
    ["Tenure", `${data.tenureMonths} months (${(data.tenureMonths / 12).toFixed(1)} years)`],
    ["Monthly EMI", fmt(emi)],
    ["Total Interest Payable", fmt(totalInterest)],
    ["Total Amount Payable", fmt(totalPayable)],
  ];
  if (data.downPayment) rows.splice(1, 0, ["Down Payment", fmt(data.downPayment)]);
  if (data.processingFee) rows.push(["Processing Fee (approx)", fmt(data.processingFee)]);

  // Table header
  doc.setFillColor(...BRAND.navy);
  doc.rect(mx, y, bw, 7, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.white);
  doc.text("Particulars", mx + 4, y + 5);
  doc.text("Amount", mx + bw - 4, y + 5, { align: "right" });
  y += 9;

  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(mx, y - 4, bw, 9, "F");
    }
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(label, mx + 4, y + 1);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.navy);
    doc.text(value, mx + bw - 4, y + 1, { align: "right" });
    y += 9;
  });

  // Total separator
  doc.setDrawColor(...BRAND.emerald);
  doc.setLineWidth(0.6);
  doc.line(mx, y - 2, mx + bw, y - 2);
  doc.setLineWidth(0.2);
  y += 3;

  // ── Special Offer Box ──
  if (data.specialOffer) {
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(mx, y, bw, 14, 3, 3, "F");
    doc.setDrawColor(...BRAND.gold);
    doc.setLineWidth(0.4);
    doc.roundedRect(mx, y, bw, 14, 3, 3, "S");
    doc.setLineWidth(0.2);

    // Gold left accent
    doc.setFillColor(...BRAND.gold);
    doc.rect(mx, y, 3, 14, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.gold);
    doc.text("\u2B50 SPECIAL OFFER", mx + 8, y + 5);
    doc.setFontSize(8);
    doc.setTextColor(120, 80, 10);
    doc.setFont("helvetica", "normal");
    doc.text(data.specialOffer, mx + 8, y + 10);
    y += 20;
  }

  // ── Amortization Schedule ──
  if (y < h - 90) {
    y = drawSectionHeading(doc, mx, y, "AMORTIZATION SCHEDULE", "(First 6 + Last 3 months)");

    const amort = generateAmortization(data.loanAmount, data.interestRate, data.tenureMonths);
    const showRows = [
      ...amort.slice(0, 6),
      ...(data.tenureMonths > 12 ? amort.slice(-3) : []),
    ];

    // Table header
    const cols = [mx, mx + 18, mx + 52, mx + 88, mx + 124];
    doc.setFillColor(...BRAND.navy);
    doc.rect(mx, y, bw, 7.5, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.white);
    ["Month", "EMI (Rs.)", "Principal (Rs.)", "Interest (Rs.)", "Balance (Rs.)"].forEach((h, i) => {
      doc.text(h, cols[i] + 4, y + 5.5);
    });
    y += 9;

    showRows.forEach((row, idx) => {
      if (idx === 6 && data.tenureMonths > 12) {
        doc.setFontSize(7);
        doc.setTextColor(...BRAND.slate);
        doc.setFont("helvetica", "italic");
        doc.text(`... months 7 to ${data.tenureMonths - 3} ...`, w / 2, y + 3, { align: "center" });
        y += 7;
      }
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(mx, y - 1, bw, 7, "F");
      }
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(`${row.month}`, cols[0] + 4, y + 4);
      doc.text(Math.round(row.emi).toLocaleString("en-IN"), cols[1] + 4, y + 4);
      doc.setTextColor(...BRAND.emeraldDark);
      doc.text(Math.round(row.principal).toLocaleString("en-IN"), cols[2] + 4, y + 4);
      doc.setTextColor(234, 88, 12);
      doc.text(Math.round(row.interest).toLocaleString("en-IN"), cols[3] + 4, y + 4);
      doc.setTextColor(60, 60, 60);
      doc.text(Math.round(row.balance).toLocaleString("en-IN"), cols[4] + 4, y + 4);
      y += 7;
    });
  }

  // ── Quick Summary Cards (3-column) ──
  y += 4;
  if (y < h - 60) {
    const cardW = (bw - 8) / 3;
    const cards = [
      { label: "Loan Amount", value: fmtL(data.loanAmount), color: BRAND.emerald },
      { label: "Total Interest", value: fmt(totalInterest), color: BRAND.gold },
      { label: "Total Payable", value: fmt(totalPayable), color: BRAND.navy },
    ];

    cards.forEach((card, i) => {
      const cx = mx + i * (cardW + 4);
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.roundedRect(cx, y, cardW, 18, 3, 3, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(255, 255, 255, 180);
      doc.text(card.label, cx + cardW / 2, y + 6, { align: "center" });
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(card.value, cx + cardW / 2, y + 14, { align: "center" });
    });
  }

  drawPremiumFooter(doc, w, h);
  return doc;
}

// ─── Bank Comparison PDF ───
export function generateBankComparisonPDF(
  customer: { name: string; phone: string; carModel?: string },
  comparisons: BankComparison[],
  loanAmount: number,
  tenureMonths: number
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Navy header for landscape
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, w, 36, "F");
  doc.setFillColor(...BRAND.emerald);
  doc.rect(0, 36, w, 2, "F");
  doc.setFillColor(...BRAND.gold);
  doc.rect(0, 38, w, 0.5, "F");

  doc.setTextColor(...BRAND.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("GrabYourCar", 15, 16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 220);
  doc.text("Your Trusted Auto Finance Partner | www.grabyourcar.com | +91 98559 24442", 15, 24);

  doc.setFillColor(...BRAND.emerald);
  doc.roundedRect(w - 70, 8, 55, 16, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.white);
  doc.text("BANK COMPARISON", w - 42.5, 18, { align: "center" });

  doc.setFontSize(7);
  doc.setTextColor(150, 170, 190);
  doc.text(format(new Date(), "dd MMM yyyy, hh:mm a"), w - 15, 30, { align: "right" });

  let y = 46;

  // Customer info card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, w - 30, 14, 3, 3, "F");
  doc.setFillColor(...BRAND.emerald);
  doc.rect(15, y, 3, 14, "F");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.navy);
  doc.text(`Customer: ${customer.name}  \u2022  Phone: ${customer.phone}  \u2022  Vehicle: ${customer.carModel || "N/A"}  \u2022  Loan: ${fmtL(loanAmount)}  \u2022  Tenure: ${tenureMonths}m`, 24, y + 9);
  y += 22;

  y = drawSectionHeading(doc, 15, y, "BANK-WISE RATE COMPARISON");

  // Table header
  const colW = [60, 30, 38, 42, 44, 50];
  const colX = [15];
  for (let i = 1; i < colW.length; i++) colX.push(colX[i - 1] + colW[i - 1]);
  const headers = ["Bank / NBFC", "Rate (%)", "Proc. Fee", "Monthly EMI", "Total Payable", "Special Offer"];

  doc.setFillColor(...BRAND.navy);
  doc.rect(15, y, w - 30, 8, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.white);
  headers.forEach((h, i) => doc.text(h, colX[i] + 4, y + 5.5));
  y += 10;

  const sorted = [...comparisons].sort((a, b) => a.interestRate - b.interestRate);
  sorted.forEach((bank, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 1, w - 30, 9, "F");
    }
    const isLowest = idx === 0;
    doc.setFontSize(8);
    doc.setFont("helvetica", isLowest ? "bold" : "normal");
    doc.setTextColor(isLowest ? ...BRAND.emeraldDark : 60, isLowest ? 150 : 60, isLowest ? 105 : 60);
    doc.text(bank.bankName, colX[0] + 4, y + 5);
    doc.text(`${bank.interestRate}%`, colX[1] + 4, y + 5);
    doc.text(fmt(bank.processingFee), colX[2] + 4, y + 5);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(bank.emi), colX[3] + 4, y + 5);
    doc.text(fmt(bank.totalPayable), colX[4] + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(bank.specialOffer || "-", colX[5] + 4, y + 5);
    if (isLowest) {
      doc.setFillColor(...BRAND.emerald);
      doc.roundedRect(colX[0] + colW[0] - 22, y - 0.5, 20, 6, 1, 1, "F");
      doc.setFontSize(5.5);
      doc.setTextColor(...BRAND.white);
      doc.setFont("helvetica", "bold");
      doc.text("BEST RATE", colX[0] + colW[0] - 12, y + 3.5, { align: "center" });
    }
    y += 10;
  });

  // Footer
  const fy = h - 18;
  doc.setDrawColor(...BRAND.emerald);
  doc.setLineWidth(0.4);
  doc.line(15, fy, w - 15, fy);
  doc.setFontSize(6.5);
  doc.setTextColor(160, 160, 160);
  doc.text("* Indicative offer. Final terms subject to bank/NBFC approval. EMI on reducing balance.", 15, fy + 5);

  doc.setFillColor(...BRAND.navy);
  doc.rect(0, h - 8, w, 8, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.emerald);
  doc.text("GrabYourCar", 15, h - 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 220);
  doc.text(`\u2022  ${format(new Date(), "dd MMM yyyy")}  \u2022  Confidential`, 48, h - 3);

  return doc;
}

// ─── Bulk Offer Generation ───
export function generateBulkOfferPDFs(
  offers: LoanOfferData[]
): { name: string; doc: jsPDF }[] {
  return offers.map(offer => ({
    name: `Loan_Offer_${offer.customerName.replace(/\s+/g, '_')}_${format(new Date(), "yyyyMMdd")}.pdf`,
    doc: generateLoanOfferPDF(offer),
  }));
}
