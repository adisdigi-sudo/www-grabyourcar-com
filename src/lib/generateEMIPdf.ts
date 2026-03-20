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
  primaryColor?: string;
  accentColor?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
  };
  termsAndConditions?: string[];
  validityDays?: number;
}

export interface DiscountDetails {
  amount: number;
  type: 'cash' | 'exchange' | 'accessory' | 'corporate' | 'festival' | 'custom';
  label?: string;
  remarks?: string;
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
  discount?: DiscountDetails;
}

const DEFAULT_COMPANY: EMIPDFConfig = {
  companyName: "GRABYOURCAR",
  tagline: "India's Smarter Way to Buy New Cars",
  website: "www.grabyourcar.com",
  phone: "+91 98559 24442",
  email: "hello@grabyourcar.com",
  address: "MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana - 122001",
  founder: "Anshdeep Singh",
  founderTitle: "Founder & CEO",
  partnerBanks: ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "IDFC First", "Yes Bank"],
  disclaimer: "This is an indicative estimate. Actual EMI may vary based on bank policies, credit score, and prevailing interest rates.",
  footerCTA: "Get the Best Car Loan - Lowest Interest Rates Guaranteed!",
  primaryColor: "#22c55e",
  accentColor: "#f59e0b",
  socialLinks: {
    instagram: "@grabyourcar",
    facebook: "grabyourcar",
    youtube: "GrabYourCar",
    twitter: "@grabyourcar",
    linkedin: "grabyourcar",
  },
  termsAndConditions: [
    "Quote is valid for 7 days from generation date.",
    "Prices are subject to change based on manufacturer price revisions or government regulations.",
    "Actual EMI may vary based on bank policies, credit score, and prevailing interest rates.",
    "Processing fees and other bank charges may apply as per financing institution.",
  ],
  validityDays: 7,
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [22, 163, 74];
};

const lightenColor = (rgb: [number, number, number], amount: number): [number, number, number] => [
  Math.min(255, rgb[0] + amount),
  Math.min(255, rgb[1] + amount),
  Math.min(255, rgb[2] + amount),
];

const darkenColor = (rgb: [number, number, number], amount: number): [number, number, number] => [
  Math.max(0, rgb[0] - amount),
  Math.max(0, rgb[1] - amount),
  Math.max(0, rgb[2] - amount),
];

const STATIC_COLORS = {
  darkText: [15, 23, 42] as [number, number, number],
  grayText: [71, 85, 105] as [number, number, number],
  lightGray: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  watermark: [229, 231, 235] as [number, number, number],
};

// Proper Indian number formatting: 1,23,45,678
const formatIndianNumber = (num: number): string => {
  const n = Math.round(num);
  const str = n.toString();
  if (str.length <= 3) return str;
  let lastThree = str.substring(str.length - 3);
  const remaining = str.substring(0, str.length - 3);
  if (remaining.length > 0) {
    lastThree = ',' + lastThree;
  }
  const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return formatted;
};

const formatCurrency = (amount: number) => `Rs. ${formatIndianNumber(amount)}`;

export const generateEMIPdf = async (data: EMIData, config?: Partial<EMIPDFConfig>) => {
  const COMPANY = { ...DEFAULT_COMPANY, ...config };
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const primaryRgb = hexToRgb(COMPANY.primaryColor || "#22c55e");
  const accentRgb = hexToRgb(COMPANY.accentColor || "#f59e0b");

  const C = {
    primary: primaryRgb,
    primaryLight: lightenColor(primaryRgb, 30),
    primaryDark: darkenColor(primaryRgb, 20),
    accent: accentRgb,
    ...STATIC_COLORS,
  };

  // Footer height reserved
  const footerH = 28;
  const footerStartY = pageHeight - footerH;
  // Max content area
  const maxY = footerStartY - 8;

  // Determine sections present to calculate spacing
  const hasDiscount = data.discount && data.discount.amount > 0;
  const hasEMI = data.emi > 0 && data.tenure > 0;
  const hasOnRoad = !!data.onRoadPrice;
  const priceItems = hasOnRoad ? [
    { label: "Ex-Showroom Price", value: data.onRoadPrice!.exShowroom },
    { label: "RTO & Road Tax", value: data.onRoadPrice!.rto },
    { label: "Insurance (1 Year)", value: data.onRoadPrice!.insurance },
    { label: "TCS", value: data.onRoadPrice!.tcs },
    { label: "FASTag", value: data.onRoadPrice!.fastag },
    { label: "Registration", value: data.onRoadPrice!.registration },
    { label: "Handling Charges", value: data.onRoadPrice!.handling },
  ].filter(item => item.value > 0) : [];

  // ============ WATERMARK ============
  doc.setFontSize(48);
  doc.setTextColor(244, 244, 244);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", pageWidth / 2 - 25, pageHeight / 3, { angle: 45 });
  doc.text("GRABYOURCAR", pageWidth / 2 - 25, pageHeight * 0.65, { angle: 45 });

  // ============ HEADER ============
  const headerH = 32;
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageWidth, headerH, "F");
  doc.setFillColor(...C.primaryDark);
  doc.rect(0, headerH - 2, pageWidth, 2, "F");

  // Brand
  doc.setFontSize(18);
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.companyName, margin, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.tagline, margin, 21);

  // Contact right
  doc.setFontSize(7);
  const rX = pageWidth - margin;
  doc.text(COMPANY.phone, rX, 11, { align: "right" });
  doc.text(COMPANY.website, rX, 17, { align: "right" });
  doc.text(COMPANY.email, rX, 23, { align: "right" });

  // Badge
  doc.setFillColor(...C.accent);
  doc.roundedRect(margin, headerH - 6, 42, 8, 2, 2, "F");
  doc.setFontSize(7);
  doc.setTextColor(...C.darkText);
  doc.setFont("helvetica", "bold");
  doc.text("PRICE ESTIMATE", margin + 21, headerH - 1, { align: "center" });

  y = headerH + 8;

  // ============ VEHICLE INFO ============
  if (data.carName) {
    const cleanName = data.carName.replace(/(\w+)\s+\1/gi, '$1');
    const cardH = 30;

    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin + 1, y + 1, contentWidth, cardH, 3, 3, "F");
    doc.setFillColor(...C.white);
    doc.roundedRect(margin, y, contentWidth, cardH, 3, 3, "F");
    doc.setFillColor(...C.primary);
    doc.roundedRect(margin, y, 4, cardH, 3, 0, "F");
    doc.rect(margin + 2, y, 2, cardH, "F");

    // Label
    doc.setFontSize(6);
    doc.setTextColor(...C.grayText);
    doc.setFont("helvetica", "bold");
    doc.text("VEHICLE DETAILS", margin + 10, y + 6);

    // Car name
    doc.setFontSize(13);
    doc.setTextColor(...C.darkText);
    doc.setFont("helvetica", "bold");
    doc.text(cleanName.toUpperCase(), margin + 10, y + 15);

    // Variant
    if (data.variantName) {
      doc.setFontSize(8);
      doc.setTextColor(...C.grayText);
      doc.setFont("helvetica", "normal");
      doc.text(`Variant: ${data.variantName}`, margin + 10, y + 22);
    }

    // Right side details
    const infoX = pageWidth - margin - 6;
    let infoY = y + 8;
    doc.setFontSize(7);
    doc.setTextColor(...C.grayText);
    doc.setFont("helvetica", "normal");
    if (data.selectedColor) {
      doc.text(`Color: ${data.selectedColor}`, infoX, infoY, { align: "right" });
      infoY += 6;
    }
    if (data.selectedCity) {
      doc.text(`City: ${data.selectedCity}`, infoX, infoY, { align: "right" });
      infoY += 6;
    }
    if (hasOnRoad) {
      doc.setFontSize(6);
      doc.text("On-Road Price", infoX, infoY, { align: "right" });
      doc.setFontSize(10);
      doc.setTextColor(...C.primary);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(data.onRoadPrice!.onRoadPrice), infoX, infoY + 6, { align: "right" });
    }

    y += cardH + 6;
  }

  // ============ ON-ROAD PRICE BREAKUP ============
  if (hasOnRoad) {
    // Section header
    doc.setFillColor(...C.primary);
    doc.roundedRect(margin, y, contentWidth, 7, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.text("ON-ROAD PRICE BREAKUP", margin + 4, y + 5);
    y += 10;

    const rowH = 7;
    priceItems.forEach((item, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(...C.lightGray);
        doc.rect(margin, y - 2.5, contentWidth, rowH, "F");
      }
      doc.setFontSize(8);
      doc.setTextColor(...C.grayText);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, margin + 4, y + 1.5);
      doc.setTextColor(...C.darkText);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(item.value), pageWidth - margin - 4, y + 1.5, { align: "right" });
      y += rowH;
    });

    // Total row
    y += 2;
    doc.setFillColor(...C.primary);
    doc.roundedRect(margin, y - 2, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.text("Total On-Road Price", margin + 5, y + 4);
    doc.setFontSize(10);
    doc.text(formatCurrency(data.onRoadPrice!.onRoadPrice), pageWidth - margin - 5, y + 4, { align: "right" });
    y += 14;

    // ============ DISCOUNT ============
    if (hasDiscount) {
      const discountLabels: Record<string, string> = {
        cash: "Cash Discount", exchange: "Exchange Bonus", accessory: "Accessory Discount",
        corporate: "Corporate Discount", festival: "Festival Offer",
        custom: data.discount!.label || "Special Discount",
      };

      doc.setFillColor(255, 251, 235);
      doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "F");
      doc.setFillColor(...C.accent);
      doc.roundedRect(margin, y, 4, 22, 3, 0, "F");
      doc.rect(margin + 2, y, 2, 22, "F");

      // Badge
      doc.setFillColor(...C.accent);
      doc.roundedRect(margin + 10, y + 2, 42, 5, 1, 1, "F");
      doc.setFontSize(5.5);
      doc.setTextColor(...C.darkText);
      doc.setFont("helvetica", "bold");
      doc.text("EXCLUSIVE OFFER", margin + 31, y + 5.5, { align: "center" });

      doc.setFontSize(9);
      doc.setTextColor(...C.darkText);
      doc.setFont("helvetica", "bold");
      doc.text(discountLabels[data.discount!.type], margin + 10, y + 14);

      doc.setFontSize(12);
      doc.setTextColor(...C.primary);
      doc.text(`- ${formatCurrency(data.discount!.amount)}`, pageWidth - margin - 6, y + 14, { align: "right" });

      if (data.discount!.remarks) {
        doc.setFontSize(6);
        doc.setTextColor(...C.grayText);
        doc.setFont("helvetica", "italic");
        doc.text(data.discount!.remarks, margin + 10, y + 19);
      }
      y += 26;

      // Final price
      const finalPrice = data.onRoadPrice!.onRoadPrice - data.discount!.amount;
      doc.setFillColor(...C.primaryDark);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");
      doc.setFontSize(9);
      doc.setTextColor(...C.white);
      doc.setFont("helvetica", "bold");
      doc.text("YOUR FINAL PRICE (After Discount)", margin + 5, y + 6.5);
      doc.setFontSize(10);
      doc.text(formatCurrency(finalPrice), pageWidth - margin - 5, y + 6.5, { align: "right" });
      y += 14;
    }
  }

  // ============ EMI SECTION ============
  if (hasEMI) {
    // EMI hero box
    const emiBoxH = 30;
    doc.setFillColor(...C.primaryLight);
    doc.roundedRect(margin, y, contentWidth, emiBoxH, 4, 4, "F");
    doc.setFillColor(...C.primary);
    doc.roundedRect(margin + 2, y + 2, contentWidth - 4, emiBoxH - 4, 3, 3, "F");

    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "normal");
    doc.text("Your Monthly EMI", pageWidth / 2, y + 9, { align: "center" });

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(data.emi), pageWidth / 2, y + 21, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`for ${data.tenure} months @ ${data.interestRate}% p.a.`, pageWidth / 2, y + 27, { align: "center" });

    y += emiBoxH + 5;

    // Loan details grid
    const gridH = 24;
    doc.setFillColor(...C.lightGray);
    doc.roundedRect(margin, y, contentWidth, gridH, 2, 2, "F");

    const colW = contentWidth / 4;
    const loanItems = [
      { label: "Car Price", value: formatCurrency(data.loanAmount) },
      { label: "Down Payment", value: formatCurrency(data.downPayment) },
      { label: "Loan Amount", value: formatCurrency(data.loanPrincipal) },
      { label: "Total Payable", value: formatCurrency(data.totalPayment) },
    ];

    loanItems.forEach((item, i) => {
      const cx = margin + i * colW + colW / 2;
      doc.setFontSize(6);
      doc.setTextColor(...C.grayText);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, cx, y + 8, { align: "center" });
      doc.setFontSize(8);
      doc.setTextColor(...C.darkText);
      doc.setFont("helvetica", "bold");
      doc.text(item.value, cx, y + 16, { align: "center" });
      if (i < 3) {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin + (i + 1) * colW, y + 3, margin + (i + 1) * colW, y + gridH - 3);
      }
    });

    y += gridH + 4;

    // Payment breakdown bar
    doc.setFontSize(7);
    doc.setTextColor(...C.primary);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT BREAKDOWN", margin, y);
    y += 5;

    const principalPct = data.totalPayment > 0 ? (data.loanPrincipal / data.totalPayment) * 100 : 100;
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(margin, y, contentWidth, 7, 2, 2, "F");
    doc.setFillColor(...C.primary);
    doc.roundedRect(margin, y, contentWidth * principalPct / 100, 7, 2, 2, "F");
    if (principalPct < 100) {
      doc.setFillColor(...C.accent);
      doc.roundedRect(margin + contentWidth * principalPct / 100, y, contentWidth * (100 - principalPct) / 100, 7, 0, 2, "F");
    }
    y += 10;

    // Legend
    doc.setFillColor(...C.primary);
    doc.circle(margin + 4, y, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...C.grayText);
    doc.setFont("helvetica", "normal");
    doc.text(`Principal: ${formatCurrency(data.loanPrincipal)} (${Math.round(principalPct)}%)`, margin + 9, y + 1.5);
    doc.setFillColor(...C.accent);
    doc.circle(pageWidth / 2 + 4, y, 2, "F");
    doc.text(`Interest: ${formatCurrency(data.totalInterest)} (${Math.round(100 - principalPct)}%)`, pageWidth / 2 + 9, y + 1.5);
    y += 7;

    // Partner banks
    doc.setFontSize(7);
    doc.setTextColor(...C.primary);
    doc.setFont("helvetica", "bold");
    doc.text("PARTNERED FINANCE BANKS", margin, y);
    y += 4;
    const banks = COMPANY.partnerBanks || ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "IDFC First", "Yes Bank"];
    doc.setFontSize(6);
    doc.setTextColor(...C.grayText);
    doc.setFont("helvetica", "normal");
    doc.text(banks.join("  |  "), pageWidth / 2, y, { align: "center" });
    y += 7;
  }

  // ============ TERMS & CONDITIONS ============
  const validUntil = format(addDays(new Date(), COMPANY.validityDays || 7), "dd MMM yyyy");

  // Check if terms fit, compress if needed
  const termsH = 22;
  if (y + termsH < maxY) {
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(margin, y, contentWidth, termsH, 2, 2, "F");
    doc.setFillColor(...C.accent);
    doc.roundedRect(margin, y, 3, termsH, 2, 0, "F");

    doc.setFontSize(7);
    doc.setTextColor(161, 98, 7);
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions:", margin + 6, y + 5);

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(113, 63, 18);
    const terms = [
      `1. Quote valid until ${validUntil} (${COMPANY.validityDays || 7} days).`,
      "2. Prices subject to manufacturer/government revisions.",
      "3. Actual EMI may vary based on bank policies & credit score.",
      "4. Processing fees may apply per financing institution.",
    ];
    terms.forEach((t, i) => {
      doc.text(t, margin + 6, y + 10 + i * 3);
    });
    y += termsH + 3;
  }

  // Disclaimer
  if (y + 6 < maxY) {
    doc.setFontSize(5.5);
    doc.setTextColor(...C.grayText);
    doc.setFont("helvetica", "italic");
    doc.text(
      COMPANY.disclaimer || "This is an indicative estimate for reference purposes only.",
      pageWidth / 2, y, { align: "center", maxWidth: contentWidth }
    );
    y += 6;
  }

  // Generated timestamp
  doc.setFontSize(5.5);
  doc.setTextColor(...C.grayText);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated on ${format(new Date(), "dd MMM yyyy 'at' hh:mm a")} | Quote ID: GYC-${Date.now().toString().slice(-8)}`,
    pageWidth / 2, maxY, { align: "center" }
  );

  // ============ FOOTER ============
  doc.setFillColor(...C.primary);
  doc.rect(0, footerStartY, pageWidth, footerH, "F");
  doc.setFillColor(...C.accent);
  doc.rect(0, footerStartY, pageWidth, 1.5, "F");

  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.footerCTA || "Get the Best Car Loan - Lowest Interest Rates Guaranteed!", pageWidth / 2, footerStartY + 7, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY.phone}  |  ${COMPANY.email}  |  ${COMPANY.website}`, pageWidth / 2, footerStartY + 12, { align: "center" });

  if (COMPANY.socialLinks) {
    const socials: string[] = [];
    if (COMPANY.socialLinks.instagram) socials.push(`IG: ${COMPANY.socialLinks.instagram}`);
    if (COMPANY.socialLinks.facebook) socials.push(`FB: ${COMPANY.socialLinks.facebook}`);
    if (COMPANY.socialLinks.youtube) socials.push(`YT: ${COMPANY.socialLinks.youtube}`);
    if (COMPANY.socialLinks.twitter) socials.push(`X: ${COMPANY.socialLinks.twitter}`);
    if (COMPANY.socialLinks.linkedin) socials.push(`LI: ${COMPANY.socialLinks.linkedin}`);
    if (socials.length > 0) {
      doc.setFontSize(6);
      doc.text(socials.join("   |   "), pageWidth / 2, footerStartY + 17, { align: "center" });
    }
  }

  if (COMPANY.founder) {
    doc.setFontSize(6);
    doc.setTextColor(...C.darkText);
    doc.text(`${COMPANY.founder}, ${COMPANY.founderTitle}  |  ${COMPANY.address}`, pageWidth / 2, footerStartY + 22, { align: "center" });
  }

  // ============ SAVE ============
  const carSuffix = data.carName ? `_${data.carName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}` : "";
  const fileName = `Grabyourcar_Quote${carSuffix}_${format(new Date(), "ddMMMyyyy")}.pdf`;
  doc.save(fileName);
};

// Generate shareable WhatsApp message
export const generateEMIWhatsAppMessage = (data: EMIData, config?: Partial<EMIPDFConfig>): string => {
  const COMPANY = { ...DEFAULT_COMPANY, ...config };
  const validUntil = format(addDays(new Date(), 7), "dd MMM yyyy");

  let message = `🚗 *Price Estimate from ${COMPANY.companyName}*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;

  const cleanCarName = data.carName?.replace(/(\w+)\s+\1/gi, '$1') || '';
  if (cleanCarName) {
    message += `🚙 *${cleanCarName.toUpperCase()}*\n`;
    if (data.variantName) message += `   Variant: ${data.variantName}\n`;
    if (data.selectedColor) message += `   Color: ${data.selectedColor}\n`;
    if (data.selectedCity) message += `   City: ${data.selectedCity}\n`;
    message += `\n`;
  }

  if (data.onRoadPrice) {
    message += `📋 *On-Road Price Breakup*\n`;
    message += `• Ex-Showroom: ${formatCurrency(data.onRoadPrice.exShowroom)}\n`;
    message += `• RTO: ${formatCurrency(data.onRoadPrice.rto)}\n`;
    message += `• Insurance: ${formatCurrency(data.onRoadPrice.insurance)}\n`;
    if (data.onRoadPrice.tcs > 0) message += `• TCS: ${formatCurrency(data.onRoadPrice.tcs)}\n`;
    message += `• Other Charges: ${formatCurrency(data.onRoadPrice.fastag + data.onRoadPrice.registration + data.onRoadPrice.handling)}\n`;
    message += `*On-Road Price: ${formatCurrency(data.onRoadPrice.onRoadPrice)}*\n\n`;

    if (data.discount && data.discount.amount > 0) {
      const discountLabels: Record<string, string> = {
        cash: "Cash Discount", exchange: "Exchange Bonus", accessory: "Accessory Discount",
        corporate: "Corporate Discount", festival: "Festival Offer",
        custom: data.discount.label || "Special Discount",
      };
      message += `🎁 *${discountLabels[data.discount.type]}*\n`;
      message += `   *- ${formatCurrency(data.discount.amount)}*\n`;
      if (data.discount.remarks) message += `   _${data.discount.remarks}_\n`;
      const finalPrice = data.onRoadPrice.onRoadPrice - data.discount.amount;
      message += `\n✅ *FINAL PRICE: ${formatCurrency(finalPrice)}*\n\n`;
    }
  }

  if (data.emi > 0) {
    message += `💰 *Loan Details*\n`;
    message += `• Car Price: ${formatCurrency(data.loanAmount)}\n`;
    message += `• Down Payment: ${formatCurrency(data.downPayment)}\n`;
    message += `• Loan Amount: ${formatCurrency(data.loanPrincipal)}\n`;
    message += `• Interest Rate: ${data.interestRate}% p.a.\n`;
    message += `• Tenure: ${data.tenure} months\n\n`;

    message += `━━━━━━━━━━━━━━━━━━\n`;
    message += `📅 *Monthly EMI: ${formatCurrency(data.emi)}*\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;

    message += `📊 *Payment Summary*\n`;
    message += `• Total Payable: ${formatCurrency(data.totalPayment)}\n`;
    message += `• Total Interest: ${formatCurrency(data.totalInterest)}\n\n`;

    const banks = COMPANY.partnerBanks?.slice(0, 5).join(', ') || 'SBI, HDFC, ICICI, Axis, Kotak';
    message += `🏦 *Partner Banks:* ${banks}\n\n`;
  }

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

  if (COMPANY.socialLinks) {
    message += `\n📱 *Follow Us:*\n`;
    if (COMPANY.socialLinks.instagram) message += `IG: ${COMPANY.socialLinks.instagram} | `;
    if (COMPANY.socialLinks.facebook) message += `FB: ${COMPANY.socialLinks.facebook} | `;
    if (COMPANY.socialLinks.youtube) message += `YT: ${COMPANY.socialLinks.youtube}\n`;
  }
  message += `───────────────────`;

  return message;
};
