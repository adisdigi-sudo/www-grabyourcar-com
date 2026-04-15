import jsPDF from "jspdf";

interface SalesOfferParams {
  customerName: string;
  phone: string;
  carModel: string;
  city?: string;
  bankName?: string;
  variant?: string;
  color?: string;
  dealValue?: number;
  exShowroomPrice?: number;
  rto?: number;
  insurance?: number;
  others?: number;
  rtoAgentFees?: number;
  accessories?: number;
  warranty?: number;
  premium?: number;
  onRoadPrice?: number;
  specialTerms?: string;
  dealership?: string;
  // Deduction fields
  bookingAmount?: number;
  processingFees?: number;
  otherExpenses?: number;
  otherExpensesLabel?: string;
  // Loan breakdown fields
  grossLoanAmount?: number;
  loanProtectionAmount?: number;
  advancePaid?: number;
  // EMI fields
  interestRate?: number;
  tenureMonths?: number;
  discountAmount?: number;
  discountLabel?: string;
  discountRemarks?: string;
}

/** Always show full INR — never abbreviate to L/Cr */
const formatINR = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;

function calcEMI(principal: number, ratePA: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const r = ratePA / 12 / 100;
  if (r === 0) return Math.round(principal / months);
  return Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
}

export function generateSalesOfferPDF(params: SalesOfferParams): { doc: jsPDF; fileName: string } {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const colLabel = 15;
  const colValue = w - 15;
  const rowH = 5.5;
  let y = 20;
  const discountAmount = Math.max(params.discountAmount || 0, 0);
  const rawTotalPrice = params.onRoadPrice || params.dealValue || 0;
  const totalPrice = Math.max(rawTotalPrice - discountAmount, 0);

  // ── Compact Header ──
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, w, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CAR DEAL OFFER", 15, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Grabyourcar | www.grabyourcar.com | +91 98559 24442", 15, 22);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, w - 15, 14, { align: "right" });

  y = 36;
  doc.setTextColor(30, 41, 59);

  // ── Customer + Vehicle (compact inline) ──
  doc.setFillColor(248, 250, 252);
  doc.rect(colLabel - 2, y - 3, w - 26, 14, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("CUSTOMER & VEHICLE", colLabel, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const custLine = `${params.customerName} | ${params.phone}`;
  const carLine = [params.carModel, params.variant, params.color, params.city].filter(Boolean).join(" | ");
  doc.text(custLine, colLabel, y);
  y += 4;
  doc.text(carLine, colLabel, y);
  y += 6;

  // ── Price Breakup Table (car components) ──
  const lineItems: { label: string; value: number }[] = [];
  if (params.exShowroomPrice) lineItems.push({ label: "Ex-Showroom Price", value: params.exShowroomPrice });
  if (params.rto) lineItems.push({ label: "RTO (Road Tax)", value: params.rto });
  if (params.rtoAgentFees) lineItems.push({ label: "RTO Agent / Processing Fees", value: params.rtoAgentFees });
  if (params.insurance) lineItems.push({ label: "Insurance (1 Year)", value: params.insurance });
  if (params.others) lineItems.push({ label: "Others (TCS, FASTag, Reg.)", value: params.others });
  if (params.accessories) lineItems.push({ label: "Accessories", value: params.accessories });
  if (params.warranty) lineItems.push({ label: "Extended Warranty", value: params.warranty });
  if (params.premium) lineItems.push({ label: "Premium / Additional Charges", value: params.premium });

  if (lineItems.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("SECTION A: Price Breakup", colLabel, y);
    y += 5;

    doc.setFillColor(241, 245, 249);
    doc.rect(colLabel - 2, y - 3, w - 26, rowH, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Description", colLabel, y);
    doc.text("Amount", colValue, y, { align: "right" });
    y += rowH;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    let runningTotal = 0;
    for (const item of lineItems) {
      doc.text(item.label, colLabel, y);
      doc.text(formatINR(item.value), colValue, y, { align: "right" });
      runningTotal += item.value;
      y += rowH;
    }

    y += 1;
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.line(colLabel - 2, y, w - 13, y);
    y += 4;

    const basePrice = rawTotalPrice > 0 ? rawTotalPrice : runningTotal;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("Sub Total On-Road", colLabel, y);
    doc.text(formatINR(basePrice), colValue, y, { align: "right" });
    y += rowH;

    if (discountAmount > 0) {
      doc.setTextColor(16, 124, 65);
      doc.setFontSize(8);
      doc.text(`Less: ${params.discountLabel || "Special Discount"}`, colLabel, y);
      doc.text(`- ${formatINR(discountAmount)}`, colValue, y, { align: "right" });
      y += rowH;

      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.4);
      doc.line(colLabel - 2, y - 1, w - 13, y - 1);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Offer Price After Discount", colLabel, y + 2);
      doc.text(formatINR(totalPrice), colValue, y + 2, { align: "right" });
      y += 7;

      if (params.discountRemarks) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(90, 90, 90);
        const discountLines = doc.splitTextToSize(params.discountRemarks, w - 30);
        doc.text(discountLines, colLabel, y);
        y += discountLines.length * 3 + 1;
      }

      doc.setTextColor(30, 41, 59);
    }

    // Total Car Price highlight
    if (totalPrice > 0) {
      doc.setFillColor(236, 253, 245);
      doc.rect(colLabel - 2, y - 3, w - 26, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(16, 124, 65);
      doc.text("Total Car Price (On-Road)", colLabel, y + 1);
      doc.text(formatINR(totalPrice), colValue, y + 1, { align: "right" });
      y += 10;
      doc.setTextColor(30, 41, 59);
    }
  }

  // ── SECTION B: Bank Loan Breakdown ──
  const gross = params.grossLoanAmount || 0;
  const procFees = params.processingFees || 0;
  const loanProt = params.loanProtectionAmount || 0;
  const otherBankCharges = params.otherExpenses || 0;
  const hasLoanBreakdown = gross > 0;

  if (hasLoanBreakdown) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("SECTION B: Bank Loan Breakdown", colLabel, y);
    if (params.bankName) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`(${params.bankName})`, colLabel + 56, y);
    }
    y += 5;

    doc.setFillColor(239, 246, 255);
    doc.rect(colLabel - 2, y - 3, w - 26, rowH, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Particulars", colLabel, y);
    doc.text("Amount", colValue, y, { align: "right" });
    y += rowH;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Gross Loan Amount (Sanctioned)", colLabel, y);
    doc.text(formatINR(gross), colValue, y, { align: "right" });
    y += rowH;

    if (procFees > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text("Less: Processing Fees", colLabel, y);
      doc.text(`- ${formatINR(procFees)}`, colValue, y, { align: "right" });
      y += rowH;
    }
    if (loanProt > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text("Less: Loan Suraksha / Insurance", colLabel, y);
      doc.text(`- ${formatINR(loanProt)}`, colValue, y, { align: "right" });
      y += rowH;
    }
    if (otherBankCharges > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(`Less: ${params.otherExpensesLabel || "Other Bank Charges"}`, colLabel, y);
      doc.text(`- ${formatINR(otherBankCharges)}`, colValue, y, { align: "right" });
      y += rowH;
    }

    doc.setTextColor(30, 41, 59);
    y += 1;
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.6);
    doc.line(colLabel - 2, y, w - 13, y);
    y += 5;

    const bankNetDisbursal = Math.max(gross - procFees - loanProt - otherBankCharges, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text("Bank Net Disbursal", colLabel, y);
    doc.text(formatINR(bankNetDisbursal), colValue, y, { align: "right" });
    y += 8;
    doc.setTextColor(30, 41, 59);

    // ── SECTION C: Customer Payment Breakdown ──
    if (totalPrice > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("SECTION C: Customer Payment Breakdown", colLabel, y);
      y += 5;

      doc.setFillColor(255, 247, 237);
      doc.rect(colLabel - 2, y - 3, w - 26, rowH, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Particulars", colLabel, y);
      doc.text("Amount", colValue, y, { align: "right" });
      y += rowH;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const downPayment = Math.max(totalPrice - bankNetDisbursal, 0);
      doc.text("Down Payment (Car Price - Net Disbursal)", colLabel, y);
      doc.text(formatINR(downPayment), colValue, y, { align: "right" });
      y += rowH;

      const booking = params.bookingAmount || 0;
      const advance = params.advancePaid || 0;

      if (booking > 0) {
        doc.setTextColor(16, 124, 65);
        doc.text("Less: Booking / Token Paid", colLabel, y);
        doc.text(`- ${formatINR(booking)}`, colValue, y, { align: "right" });
        y += rowH;
      }
      if (advance > 0) {
        doc.setTextColor(16, 124, 65);
        doc.text("Less: Advance Paid", colLabel, y);
        doc.text(`- ${formatINR(advance)}`, colValue, y, { align: "right" });
        y += rowH;
      }

      doc.setTextColor(30, 41, 59);
      y += 1;
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.8);
      doc.line(colLabel - 2, y, w - 13, y);
      y += 5;

      const balance = Math.max(downPayment - booking - advance, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(16, 124, 65);
      doc.text(">> Final Balance Payable", colLabel, y);
      doc.text(formatINR(balance), colValue, y, { align: "right" });
      y += 8;
      doc.setTextColor(30, 41, 59);
    }

    // ── SECTION D: EMI Details ──
    const rate = params.interestRate || 0;
    const tenure = params.tenureMonths || 0;
    const emi = calcEMI(gross, rate, tenure);

    if (emi > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("SECTION D: EMI Details (on Gross Loan)", colLabel, y);
      y += 5;

      doc.setFillColor(236, 253, 245);
      doc.roundedRect(colLabel - 2, y - 2, w - 26, 20, 3, 3, "F");
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.4);
      doc.roundedRect(colLabel - 2, y - 2, w - 26, 20, 3, 3, "S");
      doc.setLineWidth(0.2);

      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text(formatINR(emi) + " /month", w / 2, y + 7, { align: "center" });
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`Loan: ${formatINR(gross)} @ ${rate}% p.a. for ${tenure} months (${(tenure / 12).toFixed(1)} yrs)`, w / 2, y + 14, { align: "center" });
      y += 24;

      const totalPayable = emi * tenure;
      const totalInterest = totalPayable - gross;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Interest: ${formatINR(totalInterest)} | Total Payable: ${formatINR(totalPayable)}`, w / 2, y, { align: "center" });
      y += 6;
    }
  } else {
    // ── Old-style simple deductions (no loan breakdown) ──
    const hasDeductions = (params.bookingAmount && params.bookingAmount > 0) ||
      (params.processingFees && params.processingFees > 0) ||
      (params.otherExpenses && params.otherExpenses > 0);

    if (hasDeductions && totalPrice > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Payment Summary", colLabel, y);
      y += 5;

      doc.setFillColor(255, 247, 237);
      doc.rect(colLabel - 2, y - 3, w - 26, rowH, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Particulars", colLabel, y);
      doc.text("Amount", colValue, y, { align: "right" });
      y += rowH;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Total Car Price (On-Road)", colLabel, y);
      doc.text(formatINR(totalPrice), colValue, y, { align: "right" });
      y += rowH;

      let totalDeductions = 0;
      if (params.bookingAmount && params.bookingAmount > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text("Less: Booking Amount Received", colLabel, y);
        doc.text(`- ${formatINR(params.bookingAmount)}`, colValue, y, { align: "right" });
        totalDeductions += params.bookingAmount;
        y += rowH;
      }
      if (params.processingFees && params.processingFees > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text("Less: Processing Fees", colLabel, y);
        doc.text(`- ${formatINR(params.processingFees)}`, colValue, y, { align: "right" });
        totalDeductions += params.processingFees;
        y += rowH;
      }
      if (params.otherExpenses && params.otherExpenses > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`Less: ${params.otherExpensesLabel || "Other Expenses"}`, colLabel, y);
        doc.text(`- ${formatINR(params.otherExpenses)}`, colValue, y, { align: "right" });
        totalDeductions += params.otherExpenses;
        y += rowH;
      }

      doc.setTextColor(30, 41, 59);
      y += 1;
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.6);
      doc.line(colLabel - 2, y, w - 13, y);
      y += 5;

      const netPayable = totalPrice - totalDeductions;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(16, 124, 65);
      doc.text("Balance Payable", colLabel, y);
      doc.text(formatINR(netPayable), colValue, y, { align: "right" });
      y += 8;
      doc.setTextColor(30, 41, 59);
    }
  }

  // Deal Value (if different)
  if (params.dealValue && !hasLoanBreakdown && params.dealValue !== totalPrice) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 124, 65);
    doc.text(`Deal Value: ${formatINR(params.dealValue)}`, colLabel, y);
    y += 7;
    doc.setTextColor(30, 41, 59);
  }

  if (params.dealership) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Dealership: ${params.dealership}`, 15, y);
    y += 5;
  }

  if (params.specialTerms) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Special Terms & Offers", 15, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(params.specialTerms, w - 30);
    doc.text(lines, 15, y);
    y += lines.length * 3.5 + 3;
  }

  // Disclaimer (compact)
  y += 2;
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text("* Offer valid 7 days. Prices subject to change. EMI on Gross Loan (before deductions). Insurance & financing by Grabyourcar.", 15, y);
  y += 3;
  doc.text("* Processing fees, GST, and other charges may apply as per lending institution policy.", 15, y);

  // Footer at bottom
  const footerY = doc.internal.pageSize.getHeight() - 8;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, footerY - 3, w - 15, footerY - 3);
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text("Grabyourcar | +91 98559 24442 | www.grabyourcar.com | This is a quotation only.", w / 2, footerY, { align: "center" });

  const safeCustomer = params.customerName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "") || "Customer";
  const safeCar = params.carModel.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "") || "Car";
  const fileName = `Car_Offer_${safeCustomer}_${safeCar}_${Date.now()}.pdf`;
  return { doc, fileName };
}
