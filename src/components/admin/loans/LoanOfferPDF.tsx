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

// ─── Helper: draw header ───
function drawHeader(doc: jsPDF, w: number) {
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, w, 48, "F");
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 44, w, 4, "F");
  // Left: brand
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("GrabYourCar", 15, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Your Trusted Auto Finance Partner", 15, 28);
  doc.text("www.grabyourcar.com | +91-98559-24442", 15, 36);
  // Right: doc type
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("CAR LOAN OFFER", w - 15, 20, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, w - 15, 28, { align: "right" });
}

// ─── Helper: draw footer ───
function drawFooter(doc: jsPDF, w: number, h: number) {
  const y = h - 20;
  doc.setDrawColor(200); doc.line(15, y, w - 15, y);
  doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(140, 140, 140);
  doc.text("* This is an indicative loan offer. Final terms subject to bank/NBFC approval. EMI calculated on reducing balance method.", 15, y + 6);
  doc.text("* Processing fees, GST, and other charges may apply as per the lending institution's policy.", 15, y + 10);
  doc.text(`GrabYourCar | ${format(new Date(), "dd MMM yyyy")} | Confidential`, w / 2, y + 16, { align: "center" });
}

// ─── Helper: row with label/value ───
function drawRow(doc: jsPDF, x: number, y: number, w: number, label: string, value: string, highlight = false) {
  if (highlight) {
    doc.setFillColor(240, 253, 244);
    doc.rect(x, y - 4.5, w, 11, "F");
  }
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  doc.text(label, x + 6, y + 2);
  doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text(value, x + w - 6, y + 2, { align: "right" });
}

// ─── Single Offer PDF ───
export function generateLoanOfferPDF(data: LoanOfferData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const mx = 15;
  const bw = w - 2 * mx;

  drawHeader(doc, w);

  let y = 58;

  // ── Customer Info Box ──
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(mx, y, bw, 22, 3, 3, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(mx, y, bw, 22, 3, 3, "S");
  doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(71, 85, 105);
  doc.text("CUSTOMER DETAILS", mx + 6, y + 6);
  doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
  doc.text(`Name: ${data.customerName}`, mx + 6, y + 13);
  doc.text(`Phone: ${data.phone}`, mx + 80, y + 13);
  if (data.carModel) doc.text(`Vehicle: ${data.carModel}`, mx + 140, y + 13);
  y += 30;

  // ── EMI Highlight Box ──
  const emi = calcEMI(data.loanAmount, data.interestRate, data.tenureMonths);
  const totalPayable = emi * data.tenureMonths;
  const totalInterest = totalPayable - data.loanAmount;

  doc.setFillColor(236, 253, 245);
  doc.roundedRect(mx, y, bw, 36, 4, 4, "F");
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.roundedRect(mx, y, bw, 36, 4, 4, "S");
  doc.setLineWidth(0.2);

  doc.setTextColor(16, 185, 129);
  doc.setFontSize(26); doc.setFont("helvetica", "bold");
  doc.text(fmt(emi), w / 2, y + 16, { align: "center" });
  doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal");
  doc.text(`Monthly EMI for ${data.tenureMonths} months (${(data.tenureMonths / 12).toFixed(1)} years)`, w / 2, y + 24, { align: "center" });
  if (data.bankName) {
    doc.setFontSize(8); doc.setTextColor(16, 185, 129); doc.setFont("helvetica", "bold");
    doc.text(`via ${data.bankName}`, w / 2, y + 31, { align: "center" });
  }
  y += 44;

  // ── Loan Details Table ──
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("LOAN DETAILS", mx + 2, y);
  doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.6); doc.line(mx, y + 2, mx + 40, y + 2);
  doc.setLineWidth(0.2); y += 8;

  const rows = [
    ["Loan Amount", fmt(data.loanAmount)],
    ["Interest Rate (p.a.)", `${data.interestRate}%`],
    ["Tenure", `${data.tenureMonths} months (${(data.tenureMonths / 12).toFixed(1)} years)`],
    ["Monthly EMI", fmt(emi)],
    ["Total Interest Payable", fmt(totalInterest)],
    ["Total Amount Payable", fmt(totalPayable)],
  ];
  if (data.downPayment) rows.splice(1, 0, ["Down Payment", fmt(data.downPayment)]);
  if (data.processingFee) rows.push(["Processing Fee (approx)", fmt(data.processingFee)]);

  rows.forEach(([label, value], i) => {
    drawRow(doc, mx, y + i * 11, bw, label, value, i % 2 === 0);
  });
  y += rows.length * 11 + 8;

  // ── Special Offer Box ──
  if (data.specialOffer) {
    doc.setFillColor(254, 252, 232);
    doc.roundedRect(mx, y, bw, 14, 3, 3, "F");
    doc.setDrawColor(234, 179, 8);
    doc.roundedRect(mx, y, bw, 14, 3, 3, "S");
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(161, 98, 7);
    doc.text(`SPECIAL OFFER: ${data.specialOffer}`, mx + 6, y + 9);
    y += 20;
  }

  // ── Amortization Schedule (first 6 + last 3) ──
  if (y < h - 80) {
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("AMORTIZATION SCHEDULE", mx + 2, y);
    doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.6); doc.line(mx, y + 2, mx + 52, y + 2);
    doc.setLineWidth(0.2); y += 6;

    const amort = generateAmortization(data.loanAmount, data.interestRate, data.tenureMonths);
    const showRows = [
      ...amort.slice(0, 6),
      ...(data.tenureMonths > 12 ? amort.slice(-3) : []),
    ];

    // Table header
    const cols = [mx + 2, mx + 22, mx + 60, mx + 98, mx + 136];
    doc.setFillColor(16, 185, 129);
    doc.rect(mx, y, bw, 8, "F");
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    ["Month", "EMI (Rs.)", "Principal (Rs.)", "Interest (Rs.)", "Balance (Rs.)"].forEach((h, i) => {
      doc.text(h, cols[i], y + 5.5);
    });
    y += 10;

    showRows.forEach((row, idx) => {
      if (idx === 6 && data.tenureMonths > 12) {
        doc.setFontSize(7); doc.setTextColor(150); doc.setFont("helvetica", "italic");
        doc.text(`... months 7 to ${data.tenureMonths - 3} ...`, w / 2, y + 3.5, { align: "center" });
        y += 7;
      }
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252); doc.rect(mx, y - 1, bw, 7, "F");
      }
      doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
      doc.text(`${row.month}`, cols[0], y + 4);
      doc.text(Math.round(row.emi).toLocaleString("en-IN"), cols[1], y + 4);
      doc.setTextColor(16, 185, 129);
      doc.text(Math.round(row.principal).toLocaleString("en-IN"), cols[2], y + 4);
      doc.setTextColor(234, 88, 12);
      doc.text(Math.round(row.interest).toLocaleString("en-IN"), cols[3], y + 4);
      doc.setTextColor(60, 60, 60);
      doc.text(Math.round(row.balance).toLocaleString("en-IN"), cols[4], y + 4);
      y += 7;
    });
  }

  drawFooter(doc, w, h);
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

  drawHeader(doc, w);

  let y = 56;
  // Customer info
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, w - 30, 16, 3, 3, "F");
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
  doc.text(`Customer: ${customer.name} | Phone: ${customer.phone} | Vehicle: ${customer.carModel || "N/A"} | Loan: ${fmtL(loanAmount)} | Tenure: ${tenureMonths}m`, 21, y + 10);
  y += 24;

  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
  doc.text("BANK-WISE RATE COMPARISON", 15, y);
  doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.6); doc.line(15, y + 2, 80, y + 2);
  doc.setLineWidth(0.2); y += 8;

  // Table header
  const colW = [60, 30, 35, 40, 40, 60];
  const colX = [15];
  for (let i = 1; i < colW.length; i++) colX.push(colX[i - 1] + colW[i - 1]);
  const headers = ["Bank / NBFC", "Rate (%)", "Proc. Fee", "Monthly EMI", "Total Payable", "Special Offer"];

  doc.setFillColor(16, 185, 129);
  doc.rect(15, y, w - 30, 9, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  headers.forEach((h, i) => doc.text(h, colX[i] + 3, y + 6.5));
  y += 11;

  // Sort by rate
  const sorted = [...comparisons].sort((a, b) => a.interestRate - b.interestRate);
  sorted.forEach((bank, idx) => {
    if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 1, w - 30, 9, "F"); }
    const isLowest = idx === 0;
    doc.setFontSize(8); doc.setFont("helvetica", isLowest ? "bold" : "normal");
    doc.setTextColor(isLowest ? 16 : 60, isLowest ? 185 : 60, isLowest ? 129 : 60);
    doc.text(bank.bankName, colX[0] + 3, y + 5);
    doc.text(`${bank.interestRate}%`, colX[1] + 3, y + 5);
    doc.text(fmt(bank.processingFee), colX[2] + 3, y + 5);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(bank.emi), colX[3] + 3, y + 5);
    doc.text(fmt(bank.totalPayable), colX[4] + 3, y + 5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(100);
    doc.text(bank.specialOffer || "-", colX[5] + 3, y + 5);
    if (isLowest) {
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(colX[0] + colW[0] - 22, y - 0.5, 20, 6, 1, 1, "F");
      doc.setFontSize(5.5); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
      doc.text("BEST RATE", colX[0] + colW[0] - 12, y + 3.5, { align: "center" });
    }
    y += 10;
  });

  drawFooter(doc, w, h);
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
