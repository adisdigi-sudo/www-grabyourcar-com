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
  const colValue = w - 25;
  const rowH = 7;
  let y = 20;
  const discountAmount = Math.max(params.discountAmount || 0, 0);
  const rawTotalPrice = params.onRoadPrice || params.dealValue || 0;
  const totalPrice = Math.max(rawTotalPrice - discountAmount, 0);

  // ── Header ──
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, w, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("CAR DEAL OFFER", w / 2, 18, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Grabyourcar — Your Trusted Car Partner", w / 2, 28, { align: "center" });
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, w / 2, 36, { align: "center" });

  y = 52;
  doc.setTextColor(30, 41, 59);

  // ── Customer Details ──
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Customer Details", 15, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${params.customerName}`, 15, y); y += 6;
  doc.text(`Phone: ${params.phone}`, 15, y); y += 10;

  // ── Vehicle Details ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Vehicle Details", 15, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Model: ${params.carModel}`, 15, y); y += 6;
  if (params.variant) { doc.text(`Variant: ${params.variant}`, 15, y); y += 6; }
  if (params.color) { doc.text(`Color: ${params.color}`, 15, y); y += 6; }
  if (params.city) { doc.text(`City: ${params.city}`, 15, y); y += 6; }
  y += 4;

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
    doc.setFontSize(12);
    doc.text("Price Breakup", 15, y);
    y += 8;

    doc.setFillColor(241, 245, 249);
    doc.rect(colLabel - 2, y - 4, w - 26, rowH, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Description", colLabel, y);
    doc.text("Amount", colValue, y, { align: "right" });
    y += rowH;

    doc.setFont("helvetica", "normal");
    let runningTotal = 0;
    for (const item of lineItems) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.text(item.label, colLabel, y);
      doc.text(formatINR(item.value), colValue, y, { align: "right" });
      runningTotal += item.value;
      y += rowH;
    }

    y += 2;
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.line(colLabel - 2, y, w - 13, y);
    y += 6;

    const basePrice = rawTotalPrice > 0 ? rawTotalPrice : runningTotal;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("Sub Total On-Road", colLabel, y);
    doc.text(formatINR(basePrice), colValue, y, { align: "right" });
    y += rowH;

    if (discountAmount > 0) {
      doc.setTextColor(16, 124, 65);
      doc.text(`Less: ${params.discountLabel || "Special Discount"}`, colLabel, y);
      doc.text(`- ${formatINR(discountAmount)}`, colValue, y, { align: "right" });
      y += rowH;

      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.5);
      doc.line(colLabel - 2, y - 2, w - 13, y - 2);
      doc.setFont("helvetica", "bold");
      doc.text("Offer Price After Discount", colLabel, y + 3);
      doc.text(formatINR(totalPrice), colValue, y + 3, { align: "right" });
      y += 9;

      if (params.discountRemarks) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        const discountLines = doc.splitTextToSize(params.discountRemarks, w - 30);
        doc.text(discountLines, colLabel, y);
        y += discountLines.length * 4 + 2;
      }

      doc.setTextColor(30, 41, 59);
    }
  }

  // ── SECTION A: Total Car Price ──
  if (totalPrice > 0) {
    doc.setFillColor(236, 253, 245);
    doc.rect(colLabel - 2, y - 4, w - 26, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(16, 124, 65);
    doc.text("SECTION A: Total Car Price (On-Road)", colLabel, y + 2);
    doc.text(formatINR(totalPrice), colValue, y + 2, { align: "right" });
    y += 14;
    doc.setTextColor(30, 41, 59);
  }

  // ── SECTION B: Bank Loan Breakdown ──
  const gross = params.grossLoanAmount || 0;
  const procFees = params.processingFees || 0;
  const loanProt = params.loanProtectionAmount || 0;
  const otherBankCharges = params.otherExpenses || 0;
  const hasLoanBreakdown = gross > 0;

  if (hasLoanBreakdown) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("SECTION B: Bank Loan Breakdown", colLabel, y);
    y += 8;

    if (params.bankName) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Bank / NBFC: ${params.bankName}`, colLabel, y);
      y += 6;
    }

    // Sub-table header
    doc.setFillColor(239, 246, 255);
    doc.rect(colLabel - 2, y - 4, w - 26, rowH, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Particulars", colLabel, y);
    doc.text("Amount", colValue, y, { align: "right" });
    y += rowH;

    doc.setFont("helvetica", "normal");
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
    y += 2;
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.8);
    doc.line(colLabel - 2, y, w - 13, y);
    y += 7;

    const bankNetDisbursal = Math.max(gross - procFees - loanProt - otherBankCharges, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text("Bank Net Disbursal", colLabel, y);
    doc.text(formatINR(bankNetDisbursal), colValue, y, { align: "right" });
    y += 12;
    doc.setTextColor(30, 41, 59);

    // ── SECTION C: Customer Payment Breakdown ──
    if (totalPrice > 0) {
      if (y > 220) { doc.addPage(); y = 20; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("SECTION C: Customer Payment Breakdown", colLabel, y);
      y += 8;

      doc.setFillColor(255, 247, 237);
      doc.rect(colLabel - 2, y - 4, w - 26, rowH, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Particulars", colLabel, y);
      doc.text("Amount", colValue, y, { align: "right" });
      y += rowH;

      doc.setFont("helvetica", "normal");
      const downPayment = Math.max(totalPrice - bankNetDisbursal, 0);
      doc.text("Down Payment (Car Price − Net Disbursal)", colLabel, y);
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
      y += 2;
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(1);
      doc.line(colLabel - 2, y, w - 13, y);
      y += 8;

      const balance = Math.max(downPayment - booking - advance, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(16, 124, 65);
      doc.text("💰 Final Balance Payable", colLabel, y);
      doc.text(formatINR(balance), colValue, y, { align: "right" });
      y += 12;
      doc.setTextColor(30, 41, 59);
    }

    // ── SECTION D: EMI Details ──
    const rate = params.interestRate || 0;
    const tenure = params.tenureMonths || 0;
    const emi = calcEMI(gross, rate, tenure);

    if (emi > 0) {
      if (y > 220) { doc.addPage(); y = 20; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("SECTION D: EMI Details (on Gross Loan)", colLabel, y);
      y += 8;

      doc.setFillColor(236, 253, 245);
      doc.roundedRect(colLabel - 2, y - 2, w - 26, 28, 3, 3, "F");
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.roundedRect(colLabel - 2, y - 2, w - 26, 28, 3, 3, "S");
      doc.setLineWidth(0.2);

      doc.setFontSize(18);
      doc.setTextColor(16, 185, 129);
      doc.text(formatINR(emi) + " /month", w / 2, y + 10, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`Loan: ${formatINR(gross)} @ ${rate}% p.a. for ${tenure} months (${(tenure / 12).toFixed(1)} yrs)`, w / 2, y + 19, { align: "center" });
      y += 34;

      const totalPayable = emi * tenure;
      const totalInterest = totalPayable - gross;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Interest: ${formatINR(totalInterest)} | Total Payable: ${formatINR(totalPayable)}`, w / 2, y, { align: "center" });
      y += 10;
    }
  } else {
    // ── Old-style simple deductions (no loan breakdown) ──
    const hasDeductions = (params.bookingAmount && params.bookingAmount > 0) ||
      (params.processingFees && params.processingFees > 0) ||
      (params.otherExpenses && params.otherExpenses > 0);

    if (hasDeductions && totalPrice > 0) {
      if (y > 230) { doc.addPage(); y = 20; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Payment Summary", colLabel, y);
      y += 8;

      doc.setFillColor(255, 247, 237);
      doc.rect(colLabel - 2, y - 4, w - 26, rowH, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Particulars", colLabel, y);
      doc.text("Amount", colValue, y, { align: "right" });
      y += rowH;

      doc.setFont("helvetica", "normal");
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
      y += 2;
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.8);
      doc.line(colLabel - 2, y, w - 13, y);
      y += 7;

      const netPayable = totalPrice - totalDeductions;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(16, 124, 65);
      doc.text("Balance Payable", colLabel, y);
      doc.text(formatINR(netPayable), colValue, y, { align: "right" });
      y += 10;
      doc.setTextColor(30, 41, 59);
    }
  }

  // Deal Value (if different)
  if (params.dealValue && !hasLoanBreakdown && params.dealValue !== totalPrice) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 124, 65);
    doc.text(`Deal Value: ${formatINR(params.dealValue)}`, colLabel, y);
    y += 10;
    doc.setTextColor(30, 41, 59);
  }

  if (params.dealership) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Dealership: ${params.dealership}`, 15, y);
    y += 8;
  }

  if (params.specialTerms) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Special Terms & Offers", 15, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(params.specialTerms, w - 30);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 6;
  }

  // Disclaimer
  y += 4;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const disclaimer = [
    "• This offer is valid for 7 days from the date of issue.",
    "• Ex-showroom prices are subject to change before billing per manufacturer revisions.",
    "• Insurance and financing are processed in-house by Grabyourcar.",
    "• EMI is calculated on the Gross Loan Amount (before bank deductions).",
  ];
  for (const line of disclaimer) {
    doc.text(line, 15, y); y += 4;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, footerY - 5, w - 15, footerY - 5);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Grabyourcar | Phone: +91 98559 24442 | www.grabyourcar.com", w / 2, footerY, { align: "center" });
  doc.text("This is a quotation only. Final pricing subject to change.", w / 2, footerY + 5, { align: "center" });

  const safeCustomer = params.customerName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "") || "Customer";
  const safeCar = params.carModel.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "") || "Car";
  const fileName = `Car_Offer_${safeCustomer}_${safeCar}_${Date.now()}.pdf`;
  return { doc, fileName };
}
