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
  disclaimer: "This is an indicative estimate. Actual EMI may vary based on bank policies, credit score, and prevailing interest rates. Processing fee and pre-payment charges may apply.",
  footerCTA: "Get the Best Car Loan - Lowest Interest Rates Guaranteed!",
};

export const generateEMIPdf = (data: EMIData, config?: Partial<EMIPDFConfig>) => {
  const COMPANY = { ...DEFAULT_COMPANY, ...config };
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = 0;

  // Brand Colors
  const brandGreen: [number, number, number] = [34, 197, 94];
  const darkGreen: [number, number, number] = [22, 163, 74];
  const darkText: [number, number, number] = [30, 41, 59];
  const grayText: [number, number, number] = [100, 116, 139];
  const lightGray: [number, number, number] = [241, 245, 249];
  const white: [number, number, number] = [255, 255, 255];

  // Helper function for currency formatting - clean INR format
  const formatCurrency = (amount: number) => {
    const formatted = Math.round(amount).toLocaleString('en-IN');
    return `Rs. ${formatted}`;
  };

  // ============ HEADER SECTION ============
  // Green header background
  doc.setFillColor(...brandGreen);
  doc.rect(0, 0, pageWidth, 45, "F");
  
  // Gradient effect with darker stripe
  doc.setFillColor(...darkGreen);
  doc.rect(0, 42, pageWidth, 3, "F");

  // Company Name - Left aligned
  doc.setFontSize(24);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.companyName, margin, 20);
  
  // Tagline
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.tagline, margin, 30);

  // Contact Info - Right aligned
  doc.setFontSize(9);
  doc.text(COMPANY.phone, pageWidth - margin, 16, { align: "right" });
  doc.text(COMPANY.website, pageWidth - margin, 24, { align: "right" });
  doc.text(COMPANY.email, pageWidth - margin, 32, { align: "right" });

  // Document Title Badge
  doc.setFillColor(...white);
  doc.roundedRect(margin, 38, 70, 14, 2, 2, "F");
  doc.setFontSize(10);
  doc.setTextColor(...brandGreen);
  doc.setFont("helvetica", "bold");
  doc.text("EMI ESTIMATE", margin + 35, 47, { align: "center" });

  yPos = 60;

  // ============ VEHICLE INFORMATION SECTION ============
  if (data.carName) {
    // Clean up car name (remove duplicate brand if present)
    const cleanCarName = data.carName.replace(/(\w+)\s+\1/gi, '$1');
    
    // Vehicle details card
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 40, 3, 3, "F");
    
    // Green left accent
    doc.setFillColor(...brandGreen);
    doc.roundedRect(margin, yPos, 4, 40, 2, 0, "F");
    doc.rect(margin + 2, yPos, 2, 40, "F");
    
    // Vehicle label
    doc.setFontSize(9);
    doc.setTextColor(...grayText);
    doc.setFont("helvetica", "bold");
    doc.text("VEHICLE DETAILS", margin + 12, yPos + 10);
    
    // Car name
    doc.setFontSize(16);
    doc.setTextColor(...darkText);
    doc.setFont("helvetica", "bold");
    doc.text(cleanCarName.toUpperCase(), margin + 12, yPos + 22);
    
    // Variant
    if (data.variantName) {
      doc.setFontSize(10);
      doc.setTextColor(...grayText);
      doc.setFont("helvetica", "normal");
      doc.text(`Variant: ${data.variantName}`, margin + 12, yPos + 32);
    }

    // Right side info
    const rightX = pageWidth - margin - 8;
    if (data.selectedColor) {
      doc.setFontSize(9);
      doc.setTextColor(...grayText);
      doc.text(`Color: ${data.selectedColor}`, rightX, yPos + 12, { align: "right" });
    }
    if (data.selectedCity) {
      doc.text(`City: ${data.selectedCity}`, rightX, yPos + 22, { align: "right" });
    }
    
    // On-road price
    if (data.onRoadPrice) {
      doc.setFontSize(8);
      doc.text("On-Road Price", rightX, yPos + 30, { align: "right" });
      doc.setFontSize(14);
      doc.setTextColor(...brandGreen);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(data.onRoadPrice.onRoadPrice), rightX, yPos + 38, { align: "right" });
    }
    
    yPos += 50;
  }

  // ============ ON-ROAD PRICE BREAKUP ============
  if (data.onRoadPrice) {
    // Section header
    doc.setFillColor(...brandGreen);
    doc.rect(margin, yPos, pageWidth - margin * 2, 1, "F");
    yPos += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(...brandGreen);
    doc.setFont("helvetica", "bold");
    doc.text("ON-ROAD PRICE BREAKUP", margin, yPos);
    yPos += 12;
    
    // Price items
    const priceItems = [
      { label: "Ex-Showroom Price", value: data.onRoadPrice.exShowroom },
      { label: "RTO & Registration", value: data.onRoadPrice.rto },
      { label: "Insurance (1 Year Comprehensive)", value: data.onRoadPrice.insurance },
      { label: "TCS (if applicable)", value: data.onRoadPrice.tcs },
      { label: "FASTag", value: data.onRoadPrice.fastag },
      { label: "Registration Charges", value: data.onRoadPrice.registration },
      { label: "Handling & Logistics", value: data.onRoadPrice.handling },
    ];

    doc.setFont("helvetica", "normal");
    priceItems.forEach((item) => {
      if (item.value > 0) {
        doc.setFontSize(10);
        doc.setTextColor(...grayText);
        doc.text(item.label, margin + 4, yPos);
        
        doc.setTextColor(...darkText);
        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(item.value), pageWidth - margin - 4, yPos, { align: "right" });
        doc.setFont("helvetica", "normal");
        yPos += 9;
      }
    });

    // Total line
    yPos += 4;
    doc.setFillColor(...brandGreen);
    doc.roundedRect(margin, yPos - 4, pageWidth - margin * 2, 14, 2, 2, "F");
    
    doc.setFontSize(10);
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.text("Total On-Road Price", margin + 8, yPos + 5);
    doc.setFontSize(12);
    doc.text(formatCurrency(data.onRoadPrice.onRoadPrice), pageWidth - margin - 8, yPos + 5, { align: "right" });
    
    yPos += 20;
  }

  // ============ LOAN PARAMETERS ============
  doc.setFontSize(11);
  doc.setTextColor(...brandGreen);
  doc.setFont("helvetica", "bold");
  doc.text("LOAN PARAMETERS", margin, yPos);
  
  doc.setFillColor(...brandGreen);
  doc.rect(margin, yPos + 2, pageWidth - margin * 2, 0.5, "F");
  yPos += 14;

  // Grid layout for parameters
  const colWidth = (pageWidth - margin * 2) / 2;
  const leftCol = margin + 4;
  const rightCol = margin + colWidth + 4;
  
  // Row 1
  doc.setFontSize(9);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text("Car Price / Loan Base", leftCol, yPos);
  doc.text("Down Payment", rightCol, yPos);
  
  yPos += 7;
  doc.setFontSize(13);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.loanAmount), leftCol, yPos);
  doc.setTextColor(...darkGreen);
  doc.text(formatCurrency(data.downPayment), rightCol, yPos);
  
  yPos += 14;
  
  // Row 2
  doc.setFontSize(9);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text("Loan Amount (Financed)", leftCol, yPos);
  doc.text("Interest Rate (p.a.)", rightCol, yPos);
  
  yPos += 7;
  doc.setFontSize(13);
  doc.setTextColor(...brandGreen);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.loanPrincipal), leftCol, yPos);
  doc.setTextColor(...darkText);
  doc.text(`${data.interestRate}%`, rightCol, yPos);
  
  yPos += 14;
  
  // Row 3
  const years = Math.floor(data.tenure / 12);
  const months = data.tenure % 12;
  const tenureText = `${data.tenure} months (${years}yr${months > 0 ? ` ${months}mo` : ""})`;
  const dpPercent = data.loanAmount > 0 ? Math.round((data.downPayment / data.loanAmount) * 100) : 0;
  
  doc.setFontSize(9);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text("Loan Tenure", leftCol, yPos);
  doc.text("Down Payment %", rightCol, yPos);
  
  yPos += 7;
  doc.setFontSize(13);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text(tenureText, leftCol, yPos);
  doc.text(`${dpPercent}%`, rightCol, yPos);
  
  yPos += 18;

  // ============ EMI HERO SECTION ============
  doc.setFillColor(...brandGreen);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 38, 4, 4, "F");
  
  doc.setFontSize(10);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "normal");
  doc.text("Your Monthly EMI", pageWidth / 2, yPos + 10, { align: "center" });
  
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.emi), pageWidth / 2, yPos + 28, { align: "center" });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`payable for ${data.tenure} months`, pageWidth / 2, yPos + 36, { align: "center" });
  
  yPos += 48;

  // ============ PAYMENT BREAKDOWN ============
  doc.setFontSize(11);
  doc.setTextColor(...brandGreen);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT BREAKDOWN", margin, yPos);
  
  doc.setFillColor(...brandGreen);
  doc.rect(margin, yPos + 2, pageWidth - margin * 2, 0.5, "F");
  yPos += 12;

  // Visual bar
  const barWidth = pageWidth - margin * 2 - 20;
  const principalPercent = data.totalPayment > 0 ? (data.loanPrincipal / data.totalPayment) * 100 : 100;
  const interestPercent = 100 - principalPercent;
  
  // Bar background
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(margin + 10, yPos, barWidth, 10, 2, 2, "F");
  
  // Principal portion
  doc.setFillColor(...brandGreen);
  doc.roundedRect(margin + 10, yPos, barWidth * principalPercent / 100, 10, 2, 2, "F");
  
  yPos += 16;
  
  // Legend
  doc.setFillColor(...brandGreen);
  doc.circle(margin + 14, yPos, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text("Principal", margin + 20, yPos + 2);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.loanPrincipal), margin + 55, yPos + 2);
  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text(`(${Math.round(principalPercent)}%)`, margin + 100, yPos + 2);
  
  // Interest legend
  doc.setFillColor(245, 158, 11);
  doc.circle(pageWidth / 2 + 10, yPos, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...grayText);
  doc.text("Interest", pageWidth / 2 + 16, yPos + 2);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.totalInterest), pageWidth / 2 + 48, yPos + 2);
  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text(`(${Math.round(interestPercent)}%)`, pageWidth / 2 + 88, yPos + 2);
  
  yPos += 12;
  
  // Total payable
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 14, 2, 2, "F");
  
  doc.setFontSize(10);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text("Total Amount Payable", margin + 8, yPos + 9);
  doc.setFontSize(12);
  doc.setTextColor(...brandGreen);
  doc.text(formatCurrency(data.totalPayment + data.downPayment), pageWidth - margin - 8, yPos + 9, { align: "right" });
  
  yPos += 22;

  // ============ PARTNER BANKS ============
  doc.setFontSize(10);
  doc.setTextColor(...brandGreen);
  doc.setFont("helvetica", "bold");
  doc.text("PARTNERED FINANCE BANKS", margin, yPos);
  yPos += 8;
  
  const banks = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "IDFC First", "Yes Bank"];
  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text(banks.join("   |   "), pageWidth / 2, yPos, { align: "center" });
  
  yPos += 12;

  // ============ DISCLAIMER ============
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 18, 2, 2, "F");
  
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(margin, yPos, 3, 18, 1, 0, "F");
  
  doc.setFontSize(8);
  doc.setTextColor(180, 130, 20);
  doc.setFont("helvetica", "bold");
  doc.text("Important Note:", margin + 8, yPos + 6);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayText);
  doc.text("This is an indicative estimate. Actual EMI may vary based on bank policies, credit score, and prevailing", margin + 8, yPos + 12);
  doc.text("interest rates. Processing fee and pre-payment charges may apply.", margin + 8, yPos + 17);

  // ============ FOOTER ============
  const footerY = pageHeight - 28;
  
  // Footer line
  doc.setFillColor(...brandGreen);
  doc.rect(0, footerY - 2, pageWidth, 30, "F");
  
  // Company info
  doc.setFontSize(10);
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.text("Get the Best Car Loan - Lowest Interest Rates Guaranteed!", pageWidth / 2, footerY + 6, { align: "center" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY.phone}  |  ${COMPANY.email}  |  ${COMPANY.website}`, pageWidth / 2, footerY + 14, { align: "center" });
  
  // Founder info
  doc.setFontSize(7);
  doc.text(`${COMPANY.founder}, ${COMPANY.founderTitle}  |  ${COMPANY.address}`, pageWidth / 2, footerY + 21, { align: "center" });

  // Generated timestamp (above footer)
  doc.setFontSize(7);
  doc.setTextColor(...grayText);
  doc.text(`Generated on ${format(new Date(), "dd MMM yyyy 'at' hh:mm a")}`, pageWidth / 2, footerY - 8, { align: "center" });

  // ============ SAVE PDF ============
  const carSuffix = data.carName ? `_${data.carName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}` : "";
  const fileName = `Grabyourcar_EMI_Estimate${carSuffix}_${format(new Date(), "ddMMMyyyy")}.pdf`;
  doc.save(fileName);
};

// Generate shareable WhatsApp message
export const generateEMIWhatsAppMessage = (data: EMIData, config?: Partial<EMIPDFConfig>): string => {
  const COMPANY = { ...DEFAULT_COMPANY, ...config };
  
  const formatCurrency = (amount: number) => {
    const rounded = Math.round(amount);
    if (rounded >= 10000000) return `Rs. ${(rounded / 10000000).toFixed(2)} Cr`;
    if (rounded >= 100000) return `Rs. ${(rounded / 100000).toFixed(2)} L`;
    return `Rs. ${rounded.toLocaleString("en-IN")}`;
  };

  // Clean car name
  const cleanCarName = data.carName?.replace(/(\w+)\s+\1/gi, '$1') || '';

  let message = `🚗 *EMI Estimate from ${COMPANY.companyName}*\n`;
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
