import jsPDF from "jspdf";
import { format } from "date-fns";

export interface OnRoadPriceBreakup {
  exShowroom: number;
  rto: number;
  insurance: number;
  tcs: number;
  fastag: number;
  registration: number;
  handling: number;
  onRoadPrice: number;
}

export interface EMIData {
  loanAmount: number;
  downPayment: number;
  loanPrincipal: number;
  interestRate: number;
  tenure: number;
  emi: number;
  totalPayment: number;
  totalInterest: number;
  carName?: string;
  variantName?: string;
  onRoadPrice?: OnRoadPriceBreakup;
  selectedColor?: string;
  selectedCity?: string;
}

export const generateEMIPdf = (data: EMIData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 0;

  // Brand Colors - Grabyourcar Green Theme
  const brandGreen: [number, number, number] = [34, 197, 94];
  const darkGreen: [number, number, number] = [22, 163, 74];
  const darkText: [number, number, number] = [15, 23, 42];
  const grayText: [number, number, number] = [100, 116, 139];
  const lightGray: [number, number, number] = [241, 245, 249];
  const white: [number, number, number] = [255, 255, 255];
  const amber: [number, number, number] = [245, 158, 11];
  const successGreen: [number, number, number] = [16, 185, 129];

  // Helper functions
  const addText = (text: string, x: number, y: number, options?: { 
    fontSize?: number; 
    color?: [number, number, number]; 
    fontStyle?: "normal" | "bold" | "italic" | "bolditalic";
    align?: "left" | "center" | "right";
    maxWidth?: number;
  }) => {
    const { fontSize = 10, color = darkText, fontStyle = "normal", align = "left", maxWidth } = options || {};
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.setFont("helvetica", fontStyle);
    
    let xPos = x;
    if (align === "center") xPos = pageWidth / 2;
    if (align === "right") xPos = pageWidth - margin;
    
    if (maxWidth) {
      doc.text(text, xPos, y, { align, maxWidth });
    } else {
      doc.text(text, xPos, y, { align });
    }
  };

  const drawLine = (y: number, color: [number, number, number] = lightGray, width: number = 0.5) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(margin, y, pageWidth - margin, y);
  };

  const drawDashedLine = (y: number, color: [number, number, number] = lightGray) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    for (let i = margin; i < pageWidth - margin; i += 4) {
      doc.line(i, y, i + 2, y);
    }
  };

  const formatCurrency = (amount: number, compact = false) => {
    if (compact) {
      if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
      if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  // ============ HEADER SECTION ============
  // Green header bar
  doc.setFillColor(...brandGreen);
  doc.rect(0, 0, pageWidth, 55, "F");
  
  // Decorative accent stripe
  doc.setFillColor(...darkGreen);
  doc.rect(0, 52, pageWidth, 3, "F");

  // Logo text (simulated)
  addText("GRABYOURCAR", margin, 18, { fontSize: 26, color: white, fontStyle: "bold" });
  addText("India's Smarter Way to Buy New Cars", margin, 28, { fontSize: 10, color: white });
  
  // Contact info in header
  addText("📞 +91 98559 24442", pageWidth - margin, 18, { fontSize: 9, color: white, align: "right" });
  addText("🌐 www.grabyourcar.com", pageWidth - margin, 26, { fontSize: 9, color: white, align: "right" });

  // Document title badge
  doc.setFillColor(...white);
  doc.roundedRect(pageWidth - margin - 55, 34, 55, 15, 2, 2, "F");
  addText("EMI ESTIMATE", pageWidth - margin - 27.5, 44, { fontSize: 10, color: brandGreen, fontStyle: "bold", align: "center" });

  yPos = 68;

  // ============ VEHICLE INFORMATION SECTION ============
  if (data.carName) {
    // Vehicle card
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, data.onRoadPrice ? 45 : 28, 4, 4, "F");
    
    // Green accent bar
    doc.setFillColor(...brandGreen);
    doc.roundedRect(margin, yPos, 5, data.onRoadPrice ? 45 : 28, 4, 0, "F");
    doc.rect(margin + 3, yPos, 2, data.onRoadPrice ? 45 : 28, "F");
    
    addText("Vehicle Details", margin + 15, yPos + 8, { fontSize: 8, color: grayText, fontStyle: "bold" });
    addText(data.carName.toUpperCase(), margin + 15, yPos + 18, { fontSize: 14, color: darkText, fontStyle: "bold" });
    
    if (data.variantName) {
      addText(`Variant: ${data.variantName}`, margin + 15, yPos + 26, { fontSize: 9, color: grayText });
    }

    // Right side: Color and City
    if (data.selectedColor) {
      addText(`Color: ${data.selectedColor}`, pageWidth - margin - 5, yPos + 12, { fontSize: 9, color: grayText, align: "right" });
    }
    if (data.selectedCity) {
      addText(`City: ${data.selectedCity}`, pageWidth - margin - 5, yPos + 20, { fontSize: 9, color: grayText, align: "right" });
    }

    // On-road price highlight if available
    if (data.onRoadPrice) {
      addText("On-Road Price", pageWidth - margin - 5, yPos + 32, { fontSize: 8, color: grayText, align: "right" });
      addText(formatCurrency(data.onRoadPrice.onRoadPrice), pageWidth - margin - 5, yPos + 41, { fontSize: 14, color: brandGreen, fontStyle: "bold", align: "right" });
    }
    
    yPos += data.onRoadPrice ? 55 : 38;
  }

  // ============ ON-ROAD PRICE BREAKUP SECTION ============
  if (data.onRoadPrice) {
    yPos += 5;
    
    // Section header with icon
    doc.setFillColor(...brandGreen);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 1, 0.5, 0.5, "F");
    yPos += 8;
    
    addText("🚗 ON-ROAD PRICE BREAKUP", margin, yPos, { fontSize: 11, color: brandGreen, fontStyle: "bold" });
    yPos += 12;
    
    // Price breakup table
    const priceItems = [
      { label: "Ex-Showroom Price", value: data.onRoadPrice.exShowroom, highlight: false },
      { label: "RTO & Registration", value: data.onRoadPrice.rto, highlight: false },
      { label: "Insurance (1 Year Comprehensive)", value: data.onRoadPrice.insurance, highlight: false },
      { label: "TCS (if applicable)", value: data.onRoadPrice.tcs, highlight: false },
      { label: "FASTag", value: data.onRoadPrice.fastag, highlight: false },
      { label: "Registration Charges", value: data.onRoadPrice.registration, highlight: false },
      { label: "Handling & Logistics", value: data.onRoadPrice.handling, highlight: false },
    ];

    const col1 = margin + 5;
    const col2 = pageWidth - margin - 5;

    priceItems.forEach((item) => {
      if (item.value > 0) {
        addText(item.label, col1, yPos, { fontSize: 9, color: grayText });
        addText(formatCurrency(item.value), col2, yPos, { fontSize: 9, color: darkText, fontStyle: "bold", align: "right" });
        yPos += 8;
      }
    });

    // Total on-road price
    yPos += 3;
    doc.setFillColor(...brandGreen);
    doc.roundedRect(margin, yPos - 5, pageWidth - margin * 2, 14, 2, 2, "F");
    addText("Total On-Road Price", col1, yPos + 3, { fontSize: 10, color: white, fontStyle: "bold" });
    addText(formatCurrency(data.onRoadPrice.onRoadPrice), col2, yPos + 3, { fontSize: 12, color: white, fontStyle: "bold", align: "right" });
    yPos += 18;
  }

  // ============ LOAN PARAMETERS SECTION ============
  yPos += 5;
  addText("💰 LOAN PARAMETERS", margin, yPos, { fontSize: 11, color: brandGreen, fontStyle: "bold" });
  yPos += 3;
  drawLine(yPos, brandGreen, 1);
  yPos += 12;

  // Grid layout for parameters
  const leftCol = margin + 5;
  const rightCol = pageWidth / 2 + 10;
  
  // Row 1
  addText("Car Price / Loan Base", leftCol, yPos, { fontSize: 8, color: grayText });
  addText(formatCurrency(data.loanAmount), leftCol, yPos + 8, { fontSize: 12, color: darkText, fontStyle: "bold" });
  
  addText("Down Payment", rightCol, yPos, { fontSize: 8, color: grayText });
  addText(formatCurrency(data.downPayment), rightCol, yPos + 8, { fontSize: 12, color: successGreen, fontStyle: "bold" });
  yPos += 20;
  
  // Row 2
  addText("Loan Amount (Financed)", leftCol, yPos, { fontSize: 8, color: grayText });
  addText(formatCurrency(data.loanPrincipal), leftCol, yPos + 8, { fontSize: 12, color: brandGreen, fontStyle: "bold" });
  
  addText("Interest Rate", rightCol, yPos, { fontSize: 8, color: grayText });
  addText(`${data.interestRate}% per annum`, rightCol, yPos + 8, { fontSize: 12, color: amber, fontStyle: "bold" });
  yPos += 20;

  // Row 3
  const years = Math.floor(data.tenure / 12);
  const months = data.tenure % 12;
  const tenureText = `${data.tenure} months (${years} yr${months > 0 ? ` ${months} mo` : ""})`;
  
  addText("Loan Tenure", leftCol, yPos, { fontSize: 8, color: grayText });
  addText(tenureText, leftCol, yPos + 8, { fontSize: 12, color: darkText, fontStyle: "bold" });
  
  addText("Down Payment %", rightCol, yPos, { fontSize: 8, color: grayText });
  const dpPercent = data.loanAmount > 0 ? Math.round((data.downPayment / data.loanAmount) * 100) : 0;
  addText(`${dpPercent}% of Car Price`, rightCol, yPos + 8, { fontSize: 12, color: darkText, fontStyle: "bold" });
  yPos += 25;

  // ============ EMI HERO SECTION ============
  // Large EMI display card
  doc.setFillColor(...brandGreen);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 45, 6, 6, "F");
  
  // Decorative circles
  doc.setFillColor(255, 255, 255, 0.1);
  doc.circle(margin + 25, yPos + 22, 30, "F");
  doc.circle(pageWidth - margin - 25, yPos + 22, 25, "F");
  
  addText("Your Monthly EMI", pageWidth / 2, yPos + 12, { fontSize: 11, color: white, align: "center" });
  addText(`₹${data.emi.toLocaleString("en-IN")}`, pageWidth / 2, yPos + 32, { fontSize: 28, color: white, fontStyle: "bold", align: "center" });
  addText(`payable for ${data.tenure} months`, pageWidth / 2, yPos + 41, { fontSize: 9, color: white, align: "center" });
  yPos += 55;

  // ============ PAYMENT BREAKDOWN SECTION ============
  addText("📊 PAYMENT BREAKDOWN", margin, yPos, { fontSize: 11, color: brandGreen, fontStyle: "bold" });
  yPos += 3;
  drawLine(yPos, brandGreen, 1);
  yPos += 12;

  // Visual bar chart
  const barWidth = pageWidth - margin * 2 - 10;
  const principalPercent = data.totalPayment > 0 ? (data.loanPrincipal / data.totalPayment) * 100 : 100;
  const interestPercent = 100 - principalPercent;
  
  // Background bar
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(margin + 5, yPos, barWidth, 12, 3, 3, "F");
  
  // Principal portion
  doc.setFillColor(...brandGreen);
  doc.roundedRect(margin + 5, yPos, barWidth * principalPercent / 100, 12, 3, 3, "F");
  
  // Interest portion overlay
  doc.setFillColor(...amber);
  if (interestPercent > 0) {
    doc.roundedRect(margin + 5 + barWidth * principalPercent / 100 - 3, yPos, barWidth * interestPercent / 100 + 3, 12, 3, 3, "F");
  }
  yPos += 20;

  // Legend with amounts
  // Principal
  doc.setFillColor(...brandGreen);
  doc.circle(margin + 10, yPos, 4, "F");
  addText("Principal Amount", margin + 18, yPos + 2, { fontSize: 9, color: grayText });
  addText(formatCurrency(data.loanPrincipal), margin + 75, yPos + 2, { fontSize: 10, color: darkText, fontStyle: "bold" });
  addText(`(${principalPercent.toFixed(1)}%)`, margin + 130, yPos + 2, { fontSize: 8, color: grayText });
  
  // Interest
  doc.setFillColor(...amber);
  doc.circle(rightCol, yPos, 4, "F");
  addText("Total Interest", rightCol + 8, yPos + 2, { fontSize: 9, color: grayText });
  addText(formatCurrency(data.totalInterest), rightCol + 55, yPos + 2, { fontSize: 10, color: darkText, fontStyle: "bold" });
  addText(`(${interestPercent.toFixed(1)}%)`, rightCol + 105, yPos + 2, { fontSize: 8, color: grayText });
  yPos += 15;

  // Total Payable Card
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 18, 3, 3, "F");
  addText("Total Amount Payable (Principal + Interest)", margin + 10, yPos + 11, { fontSize: 10, color: darkText, fontStyle: "bold" });
  addText(formatCurrency(data.totalPayment), pageWidth - margin - 10, yPos + 11, { fontSize: 14, color: brandGreen, fontStyle: "bold", align: "right" });
  yPos += 28;

  // ============ PARTNER BANKS SECTION ============
  addText("🏦 PARTNERED FINANCE BANKS", margin, yPos, { fontSize: 11, color: brandGreen, fontStyle: "bold" });
  yPos += 3;
  drawLine(yPos, brandGreen, 1);
  yPos += 10;
  
  const banks = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "IDFC First", "Yes Bank", "Bank of Baroda"];
  addText(banks.join("  •  "), pageWidth / 2, yPos, { fontSize: 8, color: grayText, align: "center" });
  yPos += 15;

  // ============ DISCLAIMER SECTION ============
  doc.setFillColor(254, 243, 199); // Light amber
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 22, 3, 3, "F");
  
  // Amber left accent
  doc.setFillColor(...amber);
  doc.roundedRect(margin, yPos, 4, 22, 2, 0, "F");
  doc.rect(margin + 2, yPos, 2, 22, "F");
  
  addText("⚠️ Important Note", margin + 10, yPos + 7, { fontSize: 8, color: amber, fontStyle: "bold" });
  addText("This is an indicative estimate. Actual EMI may vary based on bank policies, credit score, and prevailing", margin + 10, yPos + 14, { fontSize: 7, color: grayText });
  addText("interest rates. Processing fee, pre-payment charges may apply. Contact us for a personalized loan quote.", margin + 10, yPos + 20, { fontSize: 7, color: grayText });

  // ============ FOOTER SECTION ============
  const footerY = pageHeight - 25;
  
  // Footer line
  drawLine(footerY - 5, brandGreen, 1);
  
  // Footer content
  doc.setFillColor(...brandGreen);
  doc.roundedRect(margin, footerY, pageWidth - margin * 2, 20, 0, 0, "F");
  
  addText("Get the Best Car Loan - Lowest Interest Rates Guaranteed!", pageWidth / 2, footerY + 7, { fontSize: 10, color: white, fontStyle: "bold", align: "center" });
  addText("📞 +91 98559 24442  |  📧 finance@grabyourcar.com  |  🌐 www.grabyourcar.com", pageWidth / 2, footerY + 15, { fontSize: 8, color: white, align: "center" });

  // Timestamp watermark
  addText(`Generated on ${format(new Date(), "dd MMM yyyy 'at' hh:mm a")}`, pageWidth / 2, footerY - 10, { fontSize: 7, color: grayText, align: "center" });

  // ============ SAVE PDF ============
  const carSuffix = data.carName ? `_${data.carName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}` : "";
  const fileName = `Grabyourcar_EMI_Estimate${carSuffix}_${format(new Date(), "ddMMMyyyy")}.pdf`;
  doc.save(fileName);
};

// Generate shareable WhatsApp message
export const generateEMIWhatsAppMessage = (data: EMIData): string => {
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  let message = `🚗 *EMI Estimate from Grabyourcar*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (data.carName) {
    message += `🚙 *${data.carName.toUpperCase()}*\n`;
    if (data.variantName) message += `   Variant: ${data.variantName}\n`;
    if (data.selectedColor) message += `   Color: ${data.selectedColor}\n`;
    if (data.selectedCity) message += `   City: ${data.selectedCity}\n`;
    message += `\n`;
  }

  // On-Road Price Breakup
  if (data.onRoadPrice) {
    message += `📋 *On-Road Price Breakup*\n`;
    message += `• Ex-Showroom: ${formatCurrency(data.onRoadPrice.exShowroom)}\n`;
    message += `• RTO: ${formatCurrency(data.onRoadPrice.rto)}\n`;
    message += `• Insurance: ${formatCurrency(data.onRoadPrice.insurance)}\n`;
    if (data.onRoadPrice.tcs > 0) message += `• TCS: ${formatCurrency(data.onRoadPrice.tcs)}\n`;
    message += `• Other Charges: ${formatCurrency(data.onRoadPrice.fastag + data.onRoadPrice.registration + data.onRoadPrice.handling)}\n`;
    message += `*On-Road Price: ${formatCurrency(data.onRoadPrice.onRoadPrice)}*\n\n`;
  }
  
  message += `💰 *Loan Details*\n`;
  message += `• Car Price: ${formatCurrency(data.loanAmount)}\n`;
  message += `• Down Payment: ${formatCurrency(data.downPayment)}\n`;
  message += `• Loan Amount: ${formatCurrency(data.loanPrincipal)}\n`;
  message += `• Interest Rate: ${data.interestRate}% p.a.\n`;
  message += `• Tenure: ${data.tenure} months\n\n`;
  
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `📅 *Monthly EMI: ₹${data.emi.toLocaleString("en-IN")}*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  message += `📊 *Payment Summary*\n`;
  message += `• Total Payable: ${formatCurrency(data.totalPayment)}\n`;
  message += `• Total Interest: ${formatCurrency(data.totalInterest)}\n\n`;
  
  message += `🏦 *Partner Banks:* SBI, HDFC, ICICI, Axis, Kotak\n\n`;
  
  message += `───────────────────\n`;
  message += `*Get the Best Car Loan!*\n`;
  message += `📞 +91 98559 24442\n`;
  message += `🌐 www.grabyourcar.com\n`;
  message += `───────────────────`;
  
  return message;
};
