import jsPDF from "jspdf";
import { format, addDays } from "date-fns";

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

export interface EMIPDFConfig {
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  address?: string;
  founder?: string;
  founderTitle?: string;
  partnerBanks?: string[];
  disclaimer?: string;
  footerCTA?: string;
  logoBase64?: string;
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

// Default company details
const DEFAULT_COMPANY: EMIPDFConfig = {
  companyName: "GRABYOURCAR",
  tagline: "India's Smarter Way to Buy New Cars",
  website: "www.grabyourcar.com",
  phone: "+91 95772 00023",
  email: "hello@grabyourcar.com",
  address: "Mumbai, Maharashtra, India",
  founder: "Anshdeep Singh",
  founderTitle: "Founder & CEO",
  partnerBanks: ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "IDFC First", "Yes Bank"],
  disclaimer: "This is an indicative estimate. Actual EMI may vary based on bank policies, credit score, and prevailing interest rates.",
  footerCTA: "Get the Best Car Loan - Lowest Interest Rates Guaranteed!",
};

// Premium Brand Colors
const COLORS = {
  primary: [22, 163, 74] as [number, number, number],        // Green
  primaryLight: [34, 197, 94] as [number, number, number],   // Light Green
  primaryDark: [21, 128, 61] as [number, number, number],    // Dark Green
  accent: [14, 165, 233] as [number, number, number],        // Sky Blue
  gold: [234, 179, 8] as [number, number, number],           // Gold
  darkText: [15, 23, 42] as [number, number, number],        // Slate 900
  grayText: [71, 85, 105] as [number, number, number],       // Slate 600
  lightGray: [241, 245, 249] as [number, number, number],    // Slate 100
  white: [255, 255, 255] as [number, number, number],
  watermark: [229, 231, 235] as [number, number, number],    // Gray 200
};

export const generateEMIPdf = async (data: EMIData, config?: Partial<EMIPDFConfig>) => {
  const COMPANY = { ...DEFAULT_COMPANY, ...config };
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 0;

  // Helper function for currency formatting
  const formatCurrency = (amount: number) => {
    const formatted = Math.round(amount).toLocaleString('en-IN');
    return `Rs. ${formatted}`;
  };

  // ============ WATERMARK ============
  // Draw subtle diagonal watermarks using light color
  doc.setFontSize(50);
  doc.setTextColor(240, 240, 240);
  doc.setFont("helvetica", "bold");
  
  // Save current state and rotate for watermarks
  doc.saveGraphicsState();
  
  // Watermark text across the page
  const watermarkText = "GRABYOURCAR";
  doc.text(watermarkText, pageWidth / 2 - 30, pageHeight / 3, { 
    align: "center",
    angle: 45
  });
  doc.text(watermarkText, pageWidth / 2 - 30, pageHeight * 0.65, { 
    align: "center",
    angle: 45
  });
  
  doc.restoreGraphicsState();

  // ============ PREMIUM HEADER ============
  // Header gradient background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 38, "F");
  
  // Accent stripe
  doc.setFillColor(...COLORS.primaryDark);
  doc.rect(0, 35, pageWidth, 3, "F");
  
  // Decorative corner elements
  doc.setFillColor(...COLORS.primaryLight);
  doc.circle(0, 0, 20, "F");
  doc.setFillColor(...COLORS.primaryDark);
  doc.circle(pageWidth, 38, 15, "F");

  // Logo/Brand Section
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.companyName, margin, 18);
  
  // Tagline with premium styling
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.tagline, margin, 26);
  
  // Contact Info - Right side
  doc.setFontSize(8);
  const rightX = pageWidth - margin;
  doc.text(COMPANY.phone, rightX, 14, { align: "right" });
  doc.text(COMPANY.website, rightX, 21, { align: "right" });
  doc.text(COMPANY.email, rightX, 28, { align: "right" });

  // Document Type Badge
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(margin, 32, 55, 10, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "bold");
  doc.text("PRICE ESTIMATE", margin + 27.5, 38.5, { align: "center" });

  yPos = 50;

  // ============ VEHICLE INFORMATION CARD ============
  if (data.carName) {
    const cleanCarName = data.carName.replace(/(\w+)\s+\1/gi, '$1');
    
    // Premium card with shadow effect
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin + 1, yPos + 1, pageWidth - margin * 2, 38, 4, 4, "F");
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 38, 4, 4, "F");
    
    // Left accent bar
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, 5, 38, 4, 0, "F");
    doc.rect(margin + 3, yPos, 2, 38, "F");
    
    // Vehicle badge
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(margin + 12, yPos + 4, 45, 6, 1, 1, "F");
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.grayText);
    doc.setFont("helvetica", "bold");
    doc.text("VEHICLE DETAILS", margin + 14, yPos + 8.5);
    
    // Car name - premium typography
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.darkText);
    doc.setFont("helvetica", "bold");
    doc.text(cleanCarName.toUpperCase(), margin + 12, yPos + 20);
    
    // Variant & details
    let detailY = yPos + 28;
    if (data.variantName) {
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.grayText);
      doc.setFont("helvetica", "normal");
      doc.text(`Variant: ${data.variantName}`, margin + 12, detailY);
      detailY += 7;
    }

    // Right side - Color, City, and On-Road Price
    const infoX = pageWidth - margin - 8;
    let infoY = yPos + 10;
    
    if (data.selectedColor) {
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.grayText);
      doc.text(`Color: ${data.selectedColor}`, infoX, infoY, { align: "right" });
      infoY += 7;
    }
    if (data.selectedCity) {
      doc.text(`City: ${data.selectedCity}`, infoX, infoY, { align: "right" });
      infoY += 7;
    }
    
    // On-road price highlight
    if (data.onRoadPrice) {
      doc.setFontSize(7);
      doc.text("On-Road Price", infoX, infoY, { align: "right" });
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.primary);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(data.onRoadPrice.onRoadPrice), infoX, infoY + 7, { align: "right" });
    }
    
    yPos += 46;
  }

  // ============ ON-ROAD PRICE BREAKUP ============
  if (data.onRoadPrice) {
    // Section header
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 8, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.text("ON-ROAD PRICE BREAKUP", margin + 5, yPos + 5.5);
    yPos += 14;
    
    // Price items in two columns
    const priceItems = [
      { label: "Ex-Showroom Price", value: data.onRoadPrice.exShowroom },
      { label: "RTO & Registration", value: data.onRoadPrice.rto },
      { label: "Insurance (1 Year)", value: data.onRoadPrice.insurance },
      { label: "TCS", value: data.onRoadPrice.tcs },
      { label: "FASTag", value: data.onRoadPrice.fastag },
      { label: "Registration", value: data.onRoadPrice.registration },
      { label: "Handling Charges", value: data.onRoadPrice.handling },
    ].filter(item => item.value > 0);

    doc.setFont("helvetica", "normal");
    priceItems.forEach((item, index) => {
      // Alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(...COLORS.lightGray);
        doc.rect(margin, yPos - 3, pageWidth - margin * 2, 8, "F");
      }
      
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.grayText);
      doc.text(item.label, margin + 4, yPos);
      
      doc.setTextColor(...COLORS.darkText);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(item.value), pageWidth - margin - 4, yPos, { align: "right" });
      doc.setFont("helvetica", "normal");
      yPos += 8;
    });

    // Total row with premium styling
    yPos += 3;
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos - 4, pageWidth - margin * 2, 12, 2, 2, "F");
    
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.text("Total On-Road Price", margin + 6, yPos + 3);
    doc.setFontSize(11);
    doc.text(formatCurrency(data.onRoadPrice.onRoadPrice), pageWidth - margin - 6, yPos + 3, { align: "right" });
    
    yPos += 18;
  }

  // ============ EMI HERO SECTION ============
  // Large EMI display with premium styling
  doc.setFillColor(...COLORS.primaryLight);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 42, 5, 5, "F");
  
  // Inner gradient effect
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin + 2, yPos + 2, pageWidth - margin * 2 - 4, 38, 4, 4, "F");
  
  // EMI Label
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "normal");
  doc.text("Your Monthly EMI", pageWidth / 2, yPos + 12, { align: "center" });
  
  // EMI Amount - Large and Bold
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.emi), pageWidth / 2, yPos + 28, { align: "center" });
  
  // Tenure info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`for ${data.tenure} months @ ${data.interestRate}% p.a.`, pageWidth / 2, yPos + 37, { align: "center" });
  
  yPos += 50;

  // ============ LOAN DETAILS GRID ============
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 32, 3, 3, "F");
  
  const colWidth = (pageWidth - margin * 2) / 4;
  const loanDetails = [
    { label: "Car Price", value: formatCurrency(data.loanAmount) },
    { label: "Down Payment", value: formatCurrency(data.downPayment) },
    { label: "Loan Amount", value: formatCurrency(data.loanPrincipal) },
    { label: "Total Payable", value: formatCurrency(data.totalPayment) },
  ];
  
  loanDetails.forEach((item, index) => {
    const x = margin + (index * colWidth) + colWidth / 2;
    
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.grayText);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, x, yPos + 10, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.darkText);
    doc.setFont("helvetica", "bold");
    doc.text(item.value, x, yPos + 20, { align: "center" });
    
    // Separator lines
    if (index < 3) {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin + (index + 1) * colWidth, yPos + 5, margin + (index + 1) * colWidth, yPos + 27);
    }
  });
  
  yPos += 38;

  // ============ PAYMENT BREAKDOWN BAR ============
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT BREAKDOWN", margin, yPos);
  yPos += 8;
  
  const barWidth = pageWidth - margin * 2;
  const principalPercent = data.totalPayment > 0 ? (data.loanPrincipal / data.totalPayment) * 100 : 100;
  
  // Bar background
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(margin, yPos, barWidth, 10, 2, 2, "F");
  
  // Principal portion (Green)
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, yPos, barWidth * principalPercent / 100, 10, 2, 2, "F");
  
  // Interest portion indicator
  doc.setFillColor(...COLORS.gold);
  if (principalPercent < 100) {
    doc.roundedRect(margin + barWidth * principalPercent / 100, yPos, barWidth * (100 - principalPercent) / 100, 10, 0, 2, "F");
  }
  
  yPos += 16;
  
  // Legend
  doc.setFillColor(...COLORS.primary);
  doc.circle(margin + 5, yPos, 3, "F");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.grayText);
  doc.setFont("helvetica", "normal");
  doc.text(`Principal: ${formatCurrency(data.loanPrincipal)} (${Math.round(principalPercent)}%)`, margin + 12, yPos + 2);
  
  doc.setFillColor(...COLORS.gold);
  doc.circle(pageWidth / 2 + 5, yPos, 3, "F");
  doc.text(`Interest: ${formatCurrency(data.totalInterest)} (${Math.round(100 - principalPercent)}%)`, pageWidth / 2 + 12, yPos + 2);
  
  yPos += 12;

  // ============ PARTNER BANKS ============
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.text("PARTNERED FINANCE BANKS", margin, yPos);
  yPos += 6;
  
  const banks = COMPANY.partnerBanks || ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "IDFC First", "Yes Bank"];
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.grayText);
  doc.setFont("helvetica", "normal");
  doc.text(banks.join("  |  "), pageWidth / 2, yPos, { align: "center" });
  
  yPos += 10;

  // ============ TERMS & CONDITIONS ============
  const validUntil = format(addDays(new Date(), 7), "dd MMM yyyy");
  
  doc.setFillColor(254, 249, 195); // Yellow-50
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 28, 2, 2, "F");
  
  // Left accent bar
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(margin, yPos, 4, 28, 2, 0, "F");
  
  doc.setFontSize(8);
  doc.setTextColor(161, 98, 7); // Yellow-700
  doc.setFont("helvetica", "bold");
  doc.text("Terms & Conditions:", margin + 8, yPos + 6);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(113, 63, 18); // Yellow-800
  const terms = [
    `1. This quote is valid until ${validUntil} (7 days from generation).`,
    "2. Prices are subject to change based on manufacturer price revisions or government regulations.",
    "3. Actual EMI may vary based on bank policies, credit score, and prevailing interest rates.",
    "4. Processing fees and other bank charges may apply as per financing institution.",
  ];
  terms.forEach((term, index) => {
    doc.text(term, margin + 8, yPos + 12 + (index * 4));
  });
  
  yPos += 32;

  // ============ DISCLAIMER ============
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.grayText);
  doc.setFont("helvetica", "italic");
  doc.text(
    COMPANY.disclaimer || "This is an indicative estimate for reference purposes only.",
    pageWidth / 2, 
    yPos, 
    { align: "center", maxWidth: pageWidth - margin * 2 }
  );

  // ============ PREMIUM FOOTER ============
  const footerY = pageHeight - 22;
  
  // Footer background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, footerY - 5, pageWidth, 27, "F");
  
  // Decorative top border
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, footerY - 5, pageWidth, 2, "F");
  
  // CTA
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.footerCTA || "Get the Best Car Loan - Lowest Interest Rates Guaranteed!", pageWidth / 2, footerY + 4, { align: "center" });
  
  // Contact info
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY.phone}  |  ${COMPANY.email}  |  ${COMPANY.website}`, pageWidth / 2, footerY + 11, { align: "center" });
  
  // Founder info
  if (COMPANY.founder) {
    doc.setFontSize(7);
    doc.text(`${COMPANY.founder}, ${COMPANY.founderTitle}  |  ${COMPANY.address}`, pageWidth / 2, footerY + 17, { align: "center" });
  }

  // Generated timestamp (above footer)
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.grayText);
  doc.text(`Generated on ${format(new Date(), "dd MMM yyyy 'at' hh:mm a")} | Quote ID: GYC-${Date.now().toString().slice(-8)}`, pageWidth / 2, footerY - 10, { align: "center" });

  // ============ SAVE PDF ============
  const carSuffix = data.carName ? `_${data.carName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}` : "";
  const fileName = `Grabyourcar_Quote${carSuffix}_${format(new Date(), "ddMMMyyyy")}.pdf`;
  doc.save(fileName);
};

// Generate shareable WhatsApp message
export const generateEMIWhatsAppMessage = (data: EMIData, config?: Partial<EMIPDFConfig>): string => {
  const COMPANY = { ...DEFAULT_COMPANY, ...config };
  const validUntil = format(addDays(new Date(), 7), "dd MMM yyyy");
  
  const formatCurrency = (amount: number) => {
    const rounded = Math.round(amount);
    if (rounded >= 10000000) return `Rs. ${(rounded / 10000000).toFixed(2)} Cr`;
    if (rounded >= 100000) return `Rs. ${(rounded / 100000).toFixed(2)} L`;
    return `Rs. ${rounded.toLocaleString("en-IN")}`;
  };

  const cleanCarName = data.carName?.replace(/(\w+)\s+\1/gi, '$1') || '';

  let message = `🚗 *Price Estimate from ${COMPANY.companyName}*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (cleanCarName) {
    message += `🚙 *${cleanCarName.toUpperCase()}*\n`;
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
  message += `📅 *Monthly EMI: Rs. ${data.emi.toLocaleString("en-IN")}*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  message += `📊 *Payment Summary*\n`;
  message += `• Total Payable: ${formatCurrency(data.totalPayment)}\n`;
  message += `• Total Interest: ${formatCurrency(data.totalInterest)}\n\n`;
  
  const banks = COMPANY.partnerBanks?.slice(0, 5).join(', ') || 'SBI, HDFC, ICICI, Axis, Kotak';
  message += `🏦 *Partner Banks:* ${banks}\n\n`;
  
  message += `⚠️ *Terms:*\n`;
  message += `• Valid until ${validUntil}\n`;
  message += `• Subject to price/policy changes\n\n`;
  
  message += `───────────────────\n`;
  message += `*${COMPANY.companyName}*\n`;
  message += `${COMPANY.tagline}\n`;
  message += `📞 ${COMPANY.phone}\n`;
  message += `🌐 ${COMPANY.website}\n`;
  if (COMPANY.founder) {
    message += `👤 ${COMPANY.founder}, ${COMPANY.founderTitle}\n`;
  }
  message += `───────────────────`;
  
  return message;
};
