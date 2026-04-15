import jsPDF from "jspdf";
import { format } from "date-fns";

interface BankComparison {
  bankName: string;
  interestRate: number;
  processingFee: number;
  emi: number;
  totalPayment: number;
  totalInterest: number;
}

interface ComparisonPDFData {
  carName: string;
  variantName?: string;
  loanAmount: number;
  downPayment: number;
  principal: number;
  tenure: number;
  banks: BankComparison[];
  customerName?: string;
  customerPhone?: string;
}

const fmt = (n: number) => {
  if (n >= 10000000) return `Rs. ${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `Rs. ${(n / 100000).toFixed(2)} L`;
  return `Rs. ${n.toLocaleString("en-IN")}`;
};

const fmtFull = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

export const generateComparisonPdf = (data: ComparisonPDFData, returnDoc?: boolean): jsPDF | void => {
  const doc = new jsPDF("p", "mm", "a4");
  const w = 210;
  const margin = 15;
  const usable = w - margin * 2;
  let y = 0;

  // Colors
  const navy = [0, 51, 102] as [number, number, number];
  const green = [34, 197, 94] as [number, number, number];
  const orange = [245, 130, 32] as [number, number, number];
  const gray = [100, 116, 139] as [number, number, number];
  const lightGray = [241, 245, 249] as [number, number, number];
  const white = [255, 255, 255] as [number, number, number];

  // ---- Header Bar ----
  doc.setFillColor(...navy);
  doc.rect(0, 0, w, 38, "F");

  // Green accent line
  doc.setFillColor(...green);
  doc.rect(0, 38, w, 2, "F");

  // Company name
  doc.setTextColor(...white);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", margin, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("India's Smarter Way to Buy New Cars", margin, 26);

  doc.setFontSize(8);
  doc.text(`+91 98559 24442 | hello@grabyourcar.com`, w - margin, 18, { align: "right" });
  doc.text(`www.grabyourcar.com`, w - margin, 25, { align: "right" });

  // Date
  doc.setFontSize(8);
  doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, w - margin, 33, { align: "right" });

  y = 48;

  // ---- Title Section ----
  doc.setTextColor(...navy);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("EMI Comparison Report", margin, y);
  y += 8;

  if (data.carName) {
    doc.setFontSize(12);
    doc.setTextColor(...orange);
    doc.text(data.carName + (data.variantName ? ` - ${data.variantName}` : ""), margin, y);
    y += 8;
  }

  // ---- Customer Details ----
  if (data.customerName || data.customerPhone) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, usable, 16, 3, 3, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, usable, 16, 3, 3, "S");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...gray);
    doc.text("PREPARED FOR", margin + 6, y + 5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...navy);
    let custLine = data.customerName || "";
    if (data.customerPhone) custLine += (custLine ? "  |  " : "") + data.customerPhone;
    doc.text(custLine, margin + 6, y + 12);
    y += 20;
  }

  // ---- Loan Summary Box ----
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, usable, 22, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.setFont("helvetica", "normal");

  const colW = usable / 4;
  const labels = ["Car Price", "Down Payment", "Loan Amount", "Tenure"];
  const values = [fmtFull(data.loanAmount), fmtFull(data.downPayment), fmtFull(data.principal), `${data.tenure} months (${Math.floor(data.tenure/12)}Y ${data.tenure%12}M)`];

  labels.forEach((label, i) => {
    const x = margin + colW * i + colW / 2;
    doc.text(label, x, y + 8, { align: "center" });
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(values[i], x, y + 16, { align: "center" });
    doc.setTextColor(...gray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
  });

  y += 30;

  // ---- Bank Comparison Cards ----
  const banks = data.banks;
  const bestIdx = banks.reduce((best, b, i) => (b.emi > 0 && b.emi < banks[best].emi ? i : best), 0);

  const cardW = (usable - (banks.length - 1) * 6) / banks.length;

  banks.forEach((bank, i) => {
    const x = margin + i * (cardW + 6);
    const isBest = i === bestIdx && banks.length > 1;
    const cardY = y;

    // Card background
    if (isBest) {
      doc.setFillColor(240, 253, 244); // green-50
      doc.setDrawColor(...green);
    } else {
      doc.setFillColor(...white);
      doc.setDrawColor(226, 232, 240); // slate-200
    }
    doc.setLineWidth(isBest ? 0.8 : 0.4);
    doc.roundedRect(x, cardY, cardW, 110, 3, 3, "FD");

    // Bank name header
    doc.setFillColor(isBest ? green[0] : navy[0], isBest ? green[1] : navy[1], isBest ? green[2] : navy[2]);
    doc.roundedRect(x, cardY, cardW, 16, 3, 3, "F");
    doc.rect(x, cardY + 10, cardW, 6, "F"); // cover bottom corners

    doc.setTextColor(...white);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(bank.bankName, x + cardW / 2, cardY + 10.5, { align: "center" });

    if (isBest) {
      doc.setFontSize(7);
      doc.text("BEST RATE", x + cardW / 2, cardY + 15, { align: "center" });
    }

    let cy = cardY + 24;

    // EMI Display
    doc.setFillColor(isBest ? 220 : 241, isBest ? 252 : 245, isBest ? 231 : 249);
    doc.roundedRect(x + 4, cy, cardW - 8, 22, 2, 2, "F");

    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Monthly EMI", x + cardW / 2, cy + 7, { align: "center" });

    doc.setTextColor(isBest ? green[0] : navy[0], isBest ? green[1] : navy[1], isBest ? green[2] : navy[2]);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(fmtFull(bank.emi), x + cardW / 2, cy + 18, { align: "center" });

    cy += 28;

    // Details rows
    const rows = [
      ["Interest Rate", `${bank.interestRate}% p.a.`],
      ["Total Interest", fmtFull(bank.totalInterest)],
      ["Total Payable", fmtFull(bank.totalPayment)],
      ["Processing Fee", bank.processingFee === 0 ? "FREE" : fmtFull(bank.processingFee)],
      ["Effective Cost", fmtFull(bank.totalPayment + bank.processingFee)],
    ];

    rows.forEach(([label, value], ri) => {
      if (ri % 2 === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(x + 3, cy - 1, cardW - 6, 10, "F");
      }
      doc.setTextColor(...gray);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(label, x + 6, cy + 5);
      doc.setTextColor(...navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(value, x + cardW - 6, cy + 5, { align: "right" });
      cy += 10;
    });
  });

  y += 118;

  // ---- Savings Banner ----
  if (banks.length > 1) {
    const worstCost = Math.max(...banks.map(b => b.totalPayment + b.processingFee));
    const bestCost = banks[bestIdx].totalPayment + banks[bestIdx].processingFee;
    const savings = worstCost - bestCost;

    if (savings > 0) {
      doc.setFillColor(220, 252, 231); // green-100
      doc.roundedRect(margin, y, usable, 18, 3, 3, "F");
      doc.setFontSize(10);
      doc.setTextColor(22, 101, 52); // green-800
      doc.setFont("helvetica", "bold");
      doc.text(
        `You save ${fmtFull(savings)} by choosing ${banks[bestIdx].bankName} over the most expensive option!`,
        w / 2, y + 11, { align: "center" }
      );
      y += 24;
    }
  }

  // ---- Disclaimer ----
  y += 4;
  doc.setDrawColor(...green);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);
  y += 6;

  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.setFont("helvetica", "normal");
  const disclaimer = [
    "Disclaimer: This is an indicative comparison. Actual EMI, interest rates, and processing fees may vary based on bank policies, credit score, and prevailing market conditions.",
    "Processing fees, pre-payment charges, and documentation charges may apply as per the financing institution. Contact our team for exact quotes.",
    "This quote is valid for 7 days from the date of generation.",
  ];
  disclaimer.forEach(line => {
    doc.text(line, margin, y, { maxWidth: usable });
    y += 6;
  });

  // ---- Footer ----
  const footerY = 285;
  doc.setFillColor(...navy);
  doc.rect(0, footerY - 5, w, 20, "F");
  doc.setFillColor(...green);
  doc.rect(0, footerY - 5, w, 1.5, "F");

  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR - Get the Best Car Loan, Lowest Interest Rates Guaranteed!", w / 2, footerY + 4, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana - 122001", w / 2, footerY + 10, { align: "center" });

  // Save or return
  if (returnDoc) {
    return doc;
  }
  const fileName = `GrabYourCar_EMI_Comparison_${format(new Date(), "ddMMyyyy_HHmm")}.pdf`;
  doc.save(fileName);
};
