import jsPDF from "jspdf";

interface SalesOfferParams {
  customerName: string;
  phone: string;
  carModel: string;
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
  // New deduction fields
  bookingAmount?: number;
  processingFees?: number;
  otherExpenses?: number;
  otherExpensesLabel?: string;
}

/** Always show full INR — never abbreviate to L/Cr */
const formatINR = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;

export function generateSalesOfferPDF(params: SalesOfferParams): { doc: jsPDF; fileName: string } {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
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

  // Customer Details
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Customer Details", 15, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${params.customerName}`, 15, y); y += 6;
  doc.text(`Phone: ${params.phone}`, 15, y); y += 10;

  // Vehicle Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Vehicle Details", 15, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Model: ${params.carModel}`, 15, y); y += 6;
  if (params.variant) { doc.text(`Variant: ${params.variant}`, 15, y); y += 6; }
  if (params.color) { doc.text(`Color: ${params.color}`, 15, y); y += 6; }
  y += 4;

  // Pricing Breakup Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Price Breakup", 15, y);
  y += 8;

  const lineItems: { label: string; value: number }[] = [];

  if (params.exShowroomPrice) lineItems.push({ label: "Ex-Showroom Price", value: params.exShowroomPrice });
  if (params.rto) lineItems.push({ label: "RTO (Road Tax)", value: params.rto });
  if (params.rtoAgentFees) lineItems.push({ label: "RTO Agent / Processing Fees", value: params.rtoAgentFees });
  if (params.insurance) lineItems.push({ label: "Insurance (1 Year)", value: params.insurance });
  if (params.others) lineItems.push({ label: "Others (TCS, FASTag, Reg.)", value: params.others });
  if (params.accessories) lineItems.push({ label: "Accessories", value: params.accessories });
  if (params.warranty) lineItems.push({ label: "Extended Warranty", value: params.warranty });
  if (params.premium) lineItems.push({ label: "Premium / Additional Charges", value: params.premium });

  // Draw table
  const colLabel = 15;
  const colValue = w - 60;
  const rowH = 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(colLabel - 2, y - 4, w - 26, rowH, "F");
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

  // Separator
  y += 2;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(colLabel - 2, y, w - 13, y);
  y += 6;

  // On-Road / Total
  const totalPrice = params.onRoadPrice || runningTotal;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(16, 124, 65);
  doc.text("On-Road Price (Total)", colLabel, y);
  doc.text(formatINR(totalPrice), colValue, y, { align: "right" });
  y += 10;
  doc.setTextColor(30, 41, 59);

  // ── Deductions Section ──
  const hasDeductions = (params.bookingAmount && params.bookingAmount > 0) ||
    (params.processingFees && params.processingFees > 0) ||
    (params.otherExpenses && params.otherExpenses > 0);

  if (hasDeductions) {
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Payment Summary", colLabel, y);
    y += 8;

    // Sub-table header
    doc.setFillColor(255, 247, 237);
    doc.rect(colLabel - 2, y - 4, w - 26, rowH, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Particulars", colLabel, y);
    doc.text("Amount", colValue, y, { align: "right" });
    y += rowH;

    doc.setFont("helvetica", "normal");

    // Total car price row
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

    // Separator
    y += 2;
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.8);
    doc.line(colLabel - 2, y, w - 13, y);
    y += 7;

    // Net Payable
    const netPayable = totalPrice - totalDeductions;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(16, 124, 65);
    doc.text("Balance Payable", colLabel, y);
    doc.text(formatINR(netPayable), colValue, y, { align: "right" });
    y += 10;
    doc.setTextColor(30, 41, 59);
  }

  // Deal Value (if different from total)
  if (params.dealValue && params.dealValue !== totalPrice) {
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

  const fileName = `Car_Offer_${params.customerName.replace(/\s/g, "_")}_${params.carModel.replace(/\s/g, "_")}.pdf`;
  return { doc, fileName };
}
