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
  accessories?: number;
  extendedWarranty?: number;
  otherCharges?: number;
  otherChargesLabel?: string;
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
  disclaimer: "This offer is valid for 7 days from the date of quotation. Ex-Showroom price is subject to change before billing as per manufacturer revision. Insurance and financing are arranged in-house by Grabyourcar.",
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
    "This offer is valid for 7 days from the date of quotation.",
    "Ex-Showroom price is subject to change before billing as per manufacturer revision.",
    "Insurance and financing are arranged in-house by Grabyourcar.",
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

type RGB = [number, number, number];

interface ColorPalette {
  primary: RGB;
  primaryLight: RGB;
  primaryDark: RGB;
  darkText: RGB;
  grayText: RGB;
  lightGray: RGB;
  white: RGB;
  watermark: RGB;
  accent?: RGB;
}

const STATIC_COLORS = {
  darkText: [15, 23, 42] as RGB,
  grayText: [71, 85, 105] as RGB,
  lightGray: [241, 245, 249] as RGB,
  white: [255, 255, 255] as RGB,
  watermark: [229, 231, 235] as RGB,
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
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const primaryRgb = hexToRgb(COMPANY.primaryColor || "#22c55e");

  const C = {
    primary: primaryRgb,
    primaryLight: lightenColor(primaryRgb, 30),
    primaryDark: darkenColor(primaryRgb, 20),
    ...STATIC_COLORS,
  };

  // Determine if this is a standalone EMI calc or car-specific quote
  const isStandaloneEMI = !data.carName && !data.onRoadPrice;

  if (isStandaloneEMI) {
    // ============ STANDALONE EMI PDF (Clean reference design) ============
    generateStandaloneEMIPdf(doc, data, COMPANY, C, pageWidth, pageHeight, margin, contentWidth);
  } else {
    // ============ CAR-SPECIFIC QUOTE PDF (Existing complex design) ============
    generateCarQuotePdf(doc, data, COMPANY, C, pageWidth, pageHeight, margin, contentWidth);
  }

  // ============ SAVE ============
  const carSuffix = data.carName ? `_${data.carName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}` : "";
  const emiSuffix = data.emi > 0 ? `_Rs${Math.round(data.loanPrincipal / 100000)}L_${data.tenure}m` : "";
  const fileName = isStandaloneEMI
    ? `EMI_Plan${emiSuffix}_${format(new Date(), "ddMMMyyyy")}.pdf`
    : `Grabyourcar_Quote${carSuffix}_${format(new Date(), "ddMMMyyyy")}.pdf`;
  doc.save(fileName);
};

// ═══════════════════════════════════════════════════════════
// STANDALONE EMI PDF — Clean, professional single-page design
// ═══════════════════════════════════════════════════════════
function generateStandaloneEMIPdf(
  doc: jsPDF, data: EMIData, COMPANY: EMIPDFConfig,
  C: ColorPalette, pageWidth: number, pageHeight: number, margin: number, contentWidth: number
) {
  let y = 0;

  // ── HEADER ──
  const headerH = 44;
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageWidth, headerH, "F");

  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.text("Car Loan EMI Plan", margin, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Professional estimate for customer discussion", margin, 32);

  doc.setFontSize(9);
  doc.text(`GrabYourCar | ${COMPANY.website}`, pageWidth - margin, 26, { align: "right" });

  y = headerH + 16;

  // ── EMI HERO BOX ──
  const heroH = 56;
  const heroX = margin + 16;
  const heroW = contentWidth - 32;

  // Rounded border box
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(1.5);
  doc.roundedRect(heroX, y, heroW, heroH, 8, 8, "S");

  // Large EMI amount
  doc.setFontSize(36);
  doc.setTextColor(...C.primary);
  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${formatIndianNumber(data.emi)}`, pageWidth / 2, y + 28, { align: "center" });

  // Subtitle
  doc.setFontSize(12);
  doc.setTextColor(...C.grayText);
  doc.setFont("helvetica", "normal");
  doc.text("Estimated Monthly EMI", pageWidth / 2, y + 42, { align: "center" });

  y += heroH + 18;

  // ── LOAN DETAILS TABLE ──
  const rows = [
    { label: "Loan Amount", value: `Rs. ${formatIndianNumber(data.loanAmount)}` },
    { label: "Interest Rate (per annum)", value: `${data.interestRate}%` },
    { label: "Tenure", value: `${data.tenure} months (${(data.tenure / 12).toFixed(1)} years)` },
    { label: "Estimated Monthly EMI", value: `Rs. ${formatIndianNumber(data.emi)}` },
    { label: "Total Interest Payable", value: `Rs. ${formatIndianNumber(data.totalInterest)}` },
    { label: "Total Amount Payable", value: `Rs. ${formatIndianNumber(data.totalPayment)}` },
  ];

  const rowH = 14;
  rows.forEach((row, i) => {
    const rowY = y + i * rowH;

    // Alternating background
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, rowY, contentWidth, rowH, "F");
    }

    // Left green accent bar
    doc.setFillColor(...C.primary);
    doc.rect(margin, rowY, 3, rowH, "F");

    // Label
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.text(row.label, margin + 10, rowY + 9);

    // Value
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(row.value, pageWidth - margin - 6, rowY + 9, { align: "right" });
  });

  y += rows.length * rowH + 18;

  // ── DOCUMENTS REQUIRED ──
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text("Documents Required", margin, y);
  y += 8;

  const colW = (contentWidth - 8) / 2;
  const docBoxH = 100;

  // Individual Applicant box
  const leftX = margin;
  doc.setFillColor(...C.primary);
  doc.roundedRect(leftX, y, colW, 14, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.text("Individual Applicant", leftX + 8, y + 9);

  // Individual items
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftX, y, colW, docBoxH, 3, 3, "S");

  const individualDocs = [
    "PAN Card",
    "Aadhaar Card",
    "Driving Licence or Passport",
    "3 months bank statement",
    "3 salary slips or ITR",
    "Recent passport-size photo",
  ];

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  individualDocs.forEach((item, i) => {
    const itemY = y + 22 + i * 12;
    // Circle bullet
    doc.setDrawColor(...C.primary);
    doc.setLineWidth(0.5);
    doc.circle(leftX + 10, itemY, 2, "S");
    doc.text(item, leftX + 16, itemY + 2.5);
  });

  // Corporate Applicant box
  const rightX = margin + colW + 8;
  doc.setFillColor(...C.primary);
  doc.roundedRect(rightX, y, colW, 14, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.text("Corporate Applicant", rightX + 8, y + 9);

  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightX, y, colW, docBoxH, 3, 3, "S");

  const corporateDocs = [
    "Company PAN",
    "GST Certificate or Incorporation proof",
    "Authorized signatory KYC",
    "6 months company bank statement",
    "Latest ITR and financials",
    "Address proof of company",
  ];

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  corporateDocs.forEach((item, i) => {
    const itemY = y + 22 + i * 12;
    doc.setDrawColor(...C.primary);
    doc.setLineWidth(0.5);
    doc.circle(rightX + 10, itemY, 2, "S");
    doc.text(item, rightX + 16, itemY + 2.5);
  });

  y += docBoxH + 16;

  // ── DISCLAIMER ──
  doc.setDrawColor(200, 205, 210);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text(
    "This is an indicative EMI estimate. Final loan terms, approval, and EMI may vary by lender policy, profile, and documentation.",
    margin, y, { maxWidth: contentWidth }
  );

  // ── FOOTER ──
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")} | GrabYourCar`,
    margin, pageHeight - 12
  );
}

// ═══════════════════════════════════════════════════════════
// CAR-SPECIFIC QUOTE PDF — Full detailed design with breakups
// ═══════════════════════════════════════════════════════════
function generateCarQuotePdf(
  doc: jsPDF, data: EMIData, COMPANY: EMIPDFConfig,
  C: ColorPalette, pageWidth: number, pageHeight: number, margin: number, contentWidth: number
) {
  let y = 0;
  const accentRgb: RGB = hexToRgb(COMPANY.accentColor || "#f59e0b");
  const CA: ColorPalette & { accent: RGB } = { ...C, accent: accentRgb };

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
    { label: "Accessories", value: data.onRoadPrice!.accessories || 0 },
    { label: "Extended Warranty", value: data.onRoadPrice!.extendedWarranty || 0 },
    { label: data.onRoadPrice!.otherChargesLabel || "Other Charges", value: data.onRoadPrice!.otherCharges || 0 },
  ].filter(item => item.value > 0) : [];

  // Calculate the actual final car price after discount
  const carFinalPrice = hasOnRoad
    ? (hasDiscount ? data.onRoadPrice!.onRoadPrice - data.discount!.amount : data.onRoadPrice!.onRoadPrice)
    : (hasDiscount ? data.loanAmount - data.discount!.amount : data.loanAmount);

  const footerH = 28;
  const footerStartY = pageHeight - footerH;
  const maxContentY = footerStartY - 8;

  // Helper: check if we need a new page, and if so add one with header
  const checkPageBreak = (neededSpace: number) => {
    if (y + neededSpace > maxContentY) {
      // Draw footer on current page
      drawQuoteFooter(doc, COMPANY, CA, pageWidth, footerStartY, footerH);
      doc.addPage();
      // Mini header on continuation page
      doc.setFillColor(...CA.primary);
      doc.rect(0, 0, pageWidth, 16, "F");
      doc.setFontSize(10);
      doc.setTextColor(...CA.white);
      doc.setFont("helvetica", "bold");
      doc.text(`${COMPANY.companyName} — Price Estimate (cont.)`, margin, 11);
      y = 24;
    }
  };

  // WATERMARK
  doc.setFontSize(48);
  doc.setTextColor(244, 244, 244);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", pageWidth / 2 - 25, pageHeight / 3, { angle: 45 });
  doc.text("GRABYOURCAR", pageWidth / 2 - 25, pageHeight * 0.65, { angle: 45 });

  // HEADER
  const headerH = 32;
  doc.setFillColor(...CA.primary);
  doc.rect(0, 0, pageWidth, headerH, "F");
  doc.setFillColor(...CA.primaryDark);
  doc.rect(0, headerH - 2, pageWidth, 2, "F");

  doc.setFontSize(18);
  doc.setTextColor(...CA.white);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.companyName, margin, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.tagline, margin, 21);

  const rX = pageWidth - margin;
  doc.setFontSize(7);
  doc.text(COMPANY.phone, rX, 11, { align: "right" });
  doc.text(COMPANY.website, rX, 17, { align: "right" });
  doc.text(COMPANY.email, rX, 23, { align: "right" });

  doc.setFillColor(...CA.accent);
  doc.roundedRect(margin, headerH - 6, 42, 8, 2, 2, "F");
  doc.setFontSize(7);
  doc.setTextColor(...CA.darkText);
  doc.setFont("helvetica", "bold");
  doc.text("PRICE ESTIMATE", margin + 21, headerH - 1, { align: "center" });

  y = headerH + 8;

  // VEHICLE INFO
  if (data.carName) {
    const cleanName = data.carName.replace(/(\w+)\s+\1/gi, '$1');
    const cardH = 30;
    checkPageBreak(cardH + 6);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin + 1, y + 1, contentWidth, cardH, 3, 3, "F");
    doc.setFillColor(...CA.white);
    doc.roundedRect(margin, y, contentWidth, cardH, 3, 3, "F");
    doc.setFillColor(...CA.primary);
    doc.roundedRect(margin, y, 4, cardH, 3, 0, "F");
    doc.rect(margin + 2, y, 2, cardH, "F");

    doc.setFontSize(6);
    doc.setTextColor(...CA.grayText);
    doc.setFont("helvetica", "bold");
    doc.text("VEHICLE DETAILS", margin + 10, y + 6);

    doc.setFontSize(13);
    doc.setTextColor(...CA.darkText);
    doc.setFont("helvetica", "bold");
    doc.text(cleanName.toUpperCase(), margin + 10, y + 15);

    if (data.variantName) {
      doc.setFontSize(8);
      doc.setTextColor(...CA.grayText);
      doc.setFont("helvetica", "normal");
      doc.text(`Variant: ${data.variantName}`, margin + 10, y + 22);
    }

    const infoX = pageWidth - margin - 6;
    let infoY = y + 8;
    doc.setFontSize(7);
    doc.setTextColor(...CA.grayText);
    doc.setFont("helvetica", "normal");
    if (data.selectedColor) { doc.text(`Color: ${data.selectedColor}`, infoX, infoY, { align: "right" }); infoY += 6; }
    if (data.selectedCity) { doc.text(`City: ${data.selectedCity}`, infoX, infoY, { align: "right" }); infoY += 6; }
    if (hasOnRoad) {
      doc.setFontSize(6);
      doc.text("Final Price", infoX, infoY, { align: "right" });
      doc.setFontSize(10);
      doc.setTextColor(...CA.primary);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(carFinalPrice), infoX, infoY + 6, { align: "right" });
    }
    y += cardH + 6;
  }

  // ON-ROAD PRICE BREAKUP
  if (hasOnRoad) {
    const breakupH = 10 + priceItems.length * 7 + 14;
    checkPageBreak(breakupH);

    doc.setFillColor(...CA.primary);
    doc.roundedRect(margin, y, contentWidth, 7, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(...CA.white);
    doc.setFont("helvetica", "bold");
    doc.text("ON-ROAD PRICE BREAKUP", margin + 4, y + 5);
    y += 10;

    const rowH = 7;
    priceItems.forEach((item, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(...CA.lightGray);
        doc.rect(margin, y - 2.5, contentWidth, rowH, "F");
      }
      doc.setFontSize(8);
      doc.setTextColor(...CA.grayText);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, margin + 4, y + 1.5);
      doc.setTextColor(...CA.darkText);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(item.value), pageWidth - margin - 4, y + 1.5, { align: "right" });
      y += rowH;
    });

    y += 2;
    doc.setFillColor(...CA.primary);
    doc.roundedRect(margin, y - 2, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(...CA.white);
    doc.setFont("helvetica", "bold");
    doc.text("Total On-Road Price", margin + 5, y + 4);
    doc.setFontSize(10);
    doc.text(formatCurrency(data.onRoadPrice!.onRoadPrice), pageWidth - margin - 5, y + 4, { align: "right" });
    y += 14;

    // DISCOUNT
    if (hasDiscount) {
      // Calculate needed height for discount section
      const discountBoxH = data.discount!.remarks ? 28 : 22;
      checkPageBreak(discountBoxH + 18);

      const discountLabels: Record<string, string> = {
        cash: "Cash Discount", exchange: "Exchange Bonus", accessory: "Accessory Discount",
        corporate: "Corporate Discount", festival: "Festival Offer",
        custom: data.discount!.label || "Special Discount",
      };

      doc.setFillColor(255, 251, 235);
      doc.roundedRect(margin, y, contentWidth, discountBoxH, 3, 3, "F");
      doc.setFillColor(...CA.accent);
      doc.roundedRect(margin, y, 4, discountBoxH, 3, 0, "F");
      doc.rect(margin + 2, y, 2, discountBoxH, "F");

      doc.setFillColor(...CA.accent);
      doc.roundedRect(margin + 10, y + 2, 42, 5, 1, 1, "F");
      doc.setFontSize(5.5);
      doc.setTextColor(...CA.darkText);
      doc.setFont("helvetica", "bold");
      doc.text("EXCLUSIVE OFFER", margin + 31, y + 5.5, { align: "center" });

      doc.setFontSize(9);
      doc.setTextColor(...CA.darkText);
      doc.setFont("helvetica", "bold");
      doc.text(discountLabels[data.discount!.type], margin + 10, y + 14);

      doc.setFontSize(12);
      doc.setTextColor(...CA.primary);
      doc.text(`- ${formatCurrency(data.discount!.amount)}`, pageWidth - margin - 6, y + 14, { align: "right" });

      if (data.discount!.remarks) {
        doc.setFontSize(6.5);
        doc.setTextColor(...CA.grayText);
        doc.setFont("helvetica", "italic");
        // Wrap remarks text to prevent overflow
        const remarkLines = doc.splitTextToSize(data.discount!.remarks, contentWidth - 20);
        remarkLines.slice(0, 2).forEach((line: string, idx: number) => {
          doc.text(line, margin + 10, y + 20 + idx * 4);
        });
      }
      y += discountBoxH + 4;

      const finalPrice = data.onRoadPrice!.onRoadPrice - data.discount!.amount;
      doc.setFillColor(...CA.primaryDark);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");
      doc.setFontSize(9);
      doc.setTextColor(...CA.white);
      doc.setFont("helvetica", "bold");
      doc.text("YOUR FINAL PRICE (After Discount)", margin + 5, y + 6.5);
      doc.setFontSize(10);
      doc.text(formatCurrency(finalPrice), pageWidth - margin - 5, y + 6.5, { align: "right" });
      y += 14;
    }
  }

  // EMI SECTION
  if (hasEMI) {
    checkPageBreak(80);

    const emiBoxH = 30;
    doc.setFillColor(...CA.primaryLight);
    doc.roundedRect(margin, y, contentWidth, emiBoxH, 4, 4, "F");
    doc.setFillColor(...CA.primary);
    doc.roundedRect(margin + 2, y + 2, contentWidth - 4, emiBoxH - 4, 3, 3, "F");

    doc.setFontSize(8);
    doc.setTextColor(...CA.white);
    doc.setFont("helvetica", "normal");
    doc.text("Your Monthly EMI", pageWidth / 2, y + 9, { align: "center" });

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(data.emi), pageWidth / 2, y + 21, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`for ${data.tenure} months @ ${data.interestRate}% p.a.`, pageWidth / 2, y + 27, { align: "center" });

    y += emiBoxH + 5;

    const gridH = 24;
    doc.setFillColor(...CA.lightGray);
    doc.roundedRect(margin, y, contentWidth, gridH, 2, 2, "F");

    const colW = contentWidth / 4;
    const loanItems = [
      { label: "Car Price (Final)", value: formatCurrency(carFinalPrice) },
      { label: "Down Payment", value: formatCurrency(data.downPayment) },
      { label: "Loan Amount", value: formatCurrency(data.loanPrincipal) },
      { label: "Total Payable", value: formatCurrency(data.totalPayment) },
    ];

    loanItems.forEach((item, i) => {
      const cx = margin + i * colW + colW / 2;
      doc.setFontSize(6);
      doc.setTextColor(...CA.grayText);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, cx, y + 8, { align: "center" });
      doc.setFontSize(8);
      doc.setTextColor(...CA.darkText);
      doc.setFont("helvetica", "bold");
      doc.text(item.value, cx, y + 16, { align: "center" });
      if (i < 3) {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin + (i + 1) * colW, y + 3, margin + (i + 1) * colW, y + gridH - 3);
      }
    });

    y += gridH + 4;

    doc.setFontSize(7);
    doc.setTextColor(...CA.primary);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT BREAKDOWN", margin, y);
    y += 5;

    const principalPct = data.totalPayment > 0 ? (data.loanPrincipal / data.totalPayment) * 100 : 100;
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(margin, y, contentWidth, 7, 2, 2, "F");
    doc.setFillColor(...CA.primary);
    doc.roundedRect(margin, y, contentWidth * principalPct / 100, 7, 2, 2, "F");
    if (principalPct < 100) {
      doc.setFillColor(...CA.accent);
      doc.roundedRect(margin + contentWidth * principalPct / 100, y, contentWidth * (100 - principalPct) / 100, 7, 0, 2, "F");
    }
    y += 10;

    doc.setFillColor(...CA.primary);
    doc.circle(margin + 4, y, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...CA.grayText);
    doc.setFont("helvetica", "normal");
    doc.text(`Principal: ${formatCurrency(data.loanPrincipal)} (${Math.round(principalPct)}%)`, margin + 9, y + 1.5);
    doc.setFillColor(...CA.accent);
    doc.circle(pageWidth / 2 + 4, y, 2, "F");
    doc.text(`Interest: ${formatCurrency(data.totalInterest)} (${Math.round(100 - principalPct)}%)`, pageWidth / 2 + 9, y + 1.5);
    y += 7;

    doc.setFontSize(7);
    doc.setTextColor(...CA.primary);
    doc.setFont("helvetica", "bold");
    doc.text("PARTNERED FINANCE BANKS", margin, y);
    y += 4;
    const banks = COMPANY.partnerBanks || ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "IDFC First", "Yes Bank"];
    doc.setFontSize(6);
    doc.setTextColor(...CA.grayText);
    doc.setFont("helvetica", "normal");
    doc.text(banks.join("  |  "), pageWidth / 2, y, { align: "center" });
    y += 7;
  }

  // TERMS & CONDITIONS
  checkPageBreak(30);
  const validUntil = format(addDays(new Date(), COMPANY.validityDays || 7), "dd MMM yyyy");
  const termsH = 22;
  doc.setFillColor(254, 249, 195);
  doc.roundedRect(margin, y, contentWidth, termsH, 2, 2, "F");
  doc.setFillColor(...CA.accent);
  doc.roundedRect(margin, y, 3, termsH, 2, 0, "F");

  doc.setFontSize(7);
  doc.setTextColor(161, 98, 7);
  doc.setFont("helvetica", "bold");
  doc.text("Terms & Conditions:", margin + 6, y + 5);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(113, 63, 18);
  const terms = [
    `1. This offer is valid for 7 days (until ${validUntil}).`,
    "2. Ex-Showroom price is subject to change before billing as per manufacturer revision.",
    "3. Insurance and financing are arranged in-house by Grabyourcar.",
    "4. Processing fees may apply per financing institution.",
  ];
  terms.forEach((t, i) => {
    doc.text(t, margin + 6, y + 10 + i * 3);
  });
  y += termsH + 3;

  // DISCLAIMER
  checkPageBreak(10);
  doc.setFontSize(5.5);
  doc.setTextColor(...CA.grayText);
  doc.setFont("helvetica", "italic");
  doc.text(
    COMPANY.disclaimer || "This is an indicative estimate for reference purposes only.",
    pageWidth / 2, y, { align: "center", maxWidth: contentWidth }
  );
  y += 6;

  // Timestamp
  doc.setFontSize(5.5);
  doc.setTextColor(...CA.grayText);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated on ${format(new Date(), "dd MMM yyyy 'at' hh:mm a")} | Quote ID: GYC-${Date.now().toString().slice(-8)}`,
    pageWidth / 2, Math.min(y + 4, maxContentY), { align: "center" }
  );

  // FOOTER
  drawQuoteFooter(doc, COMPANY, CA, pageWidth, footerStartY, footerH);
}

// Helper: Draw footer on any page
function drawQuoteFooter(
  doc: jsPDF, COMPANY: EMIPDFConfig, CA: ColorPalette & { accent: RGB },
  pageWidth: number, footerStartY: number, footerH: number
) {
  const margin = 16;
  doc.setFillColor(...CA.primary);
  doc.rect(0, footerStartY, pageWidth, footerH, "F");
  doc.setFillColor(...CA.accent);
  doc.rect(0, footerStartY, pageWidth, 1.5, "F");

  doc.setFontSize(9);
  doc.setTextColor(...CA.white);
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
    doc.setTextColor(...CA.darkText);
    doc.text(`${COMPANY.founder}, ${COMPANY.founderTitle}  |  ${COMPANY.address}`, pageWidth / 2, footerStartY + 22, { align: "center" });
  }
}

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
    const whatsappCarPrice = data.onRoadPrice
      ? (data.discount && data.discount.amount > 0 ? data.onRoadPrice.onRoadPrice - data.discount.amount : data.onRoadPrice.onRoadPrice)
      : data.loanAmount;
    message += `💰 *Loan Details*\n`;
    message += `• Car Price (Final): ${formatCurrency(whatsappCarPrice)}\n`;
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
