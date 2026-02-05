 import jsPDF from "jspdf";
 import { format } from "date-fns";
 
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
 }
 
 export const generateEMIPdf = (data: EMIData) => {
   const doc = new jsPDF();
   const pageWidth = doc.internal.pageSize.getWidth();
   const margin = 20;
   let yPos = 20;
 
   // Colors
   const primaryColor: [number, number, number] = [34, 197, 94]; // Green
   const darkColor: [number, number, number] = [30, 41, 59];
   const grayColor: [number, number, number] = [100, 116, 139];
   const lightGray: [number, number, number] = [241, 245, 249];
 
   // Helper functions
   const addText = (text: string, x: number, y: number, options?: { 
     fontSize?: number; 
     color?: [number, number, number]; 
     fontStyle?: "normal" | "bold";
     align?: "left" | "center" | "right";
   }) => {
     const { fontSize = 10, color = darkColor, fontStyle = "normal", align = "left" } = options || {};
     doc.setFontSize(fontSize);
     doc.setTextColor(...color);
     doc.setFont("helvetica", fontStyle);
     
     let xPos = x;
     if (align === "center") xPos = pageWidth / 2;
     if (align === "right") xPos = pageWidth - margin;
     
     doc.text(text, xPos, y, { align });
   };
 
   const drawLine = (y: number, color: [number, number, number] = lightGray) => {
     doc.setDrawColor(...color);
     doc.setLineWidth(0.5);
     doc.line(margin, y, pageWidth - margin, y);
   };
 
   const formatCurrency = (amount: number) => {
     if (amount >= 10000000) {
       return `₹${(amount / 10000000).toFixed(2)} Cr`;
     } else if (amount >= 100000) {
       return `₹${(amount / 100000).toFixed(2)} L`;
     }
     return `₹${amount.toLocaleString("en-IN")}`;
   };
 
   // Header with branding
   doc.setFillColor(...primaryColor);
   doc.rect(0, 0, pageWidth, 50, "F");
 
   // Company name
   addText("GRABYOURCAR", margin, 22, { fontSize: 24, color: [255, 255, 255], fontStyle: "bold" });
   addText("India's Smarter Way to Buy New Cars", margin, 32, { fontSize: 10, color: [255, 255, 255] });
 
   // Document title
   addText("EMI ESTIMATE", pageWidth - margin, 22, { fontSize: 18, color: [255, 255, 255], fontStyle: "bold", align: "right" });
   addText(format(new Date(), "dd MMM yyyy"), pageWidth - margin, 32, { fontSize: 10, color: [255, 255, 255], align: "right" });
 
   yPos = 70;
 
   // Car Info (if provided)
   if (data.carName) {
     doc.setFillColor(...lightGray);
     doc.roundedRect(margin, yPos - 8, pageWidth - margin * 2, 25, 3, 3, "F");
     
     addText("Vehicle", margin + 10, yPos, { fontSize: 9, color: grayColor });
     addText(data.carName + (data.variantName ? ` - ${data.variantName}` : ""), margin + 10, yPos + 10, { fontSize: 13, fontStyle: "bold" });
     
     yPos += 30;
   }
 
   yPos += 10;
 
   // Loan Parameters Section
   addText("LOAN PARAMETERS", margin, yPos, { fontSize: 11, fontStyle: "bold", color: primaryColor });
   yPos += 5;
   drawLine(yPos, primaryColor);
   yPos += 15;
 
   // Two column layout for parameters
   const col1X = margin;
   const col2X = pageWidth / 2 + 10;
   
   // Row 1
   addText("Car Price", col1X, yPos, { fontSize: 9, color: grayColor });
   addText(formatCurrency(data.loanAmount), col1X, yPos + 7, { fontSize: 12, fontStyle: "bold" });
   
   addText("Down Payment", col2X, yPos, { fontSize: 9, color: grayColor });
   addText(formatCurrency(data.downPayment), col2X, yPos + 7, { fontSize: 12, fontStyle: "bold" });
   
   yPos += 25;
   
   // Row 2
   addText("Loan Amount", col1X, yPos, { fontSize: 9, color: grayColor });
   addText(formatCurrency(data.loanPrincipal), col1X, yPos + 7, { fontSize: 12, fontStyle: "bold", color: primaryColor });
   
   addText("Interest Rate", col2X, yPos, { fontSize: 9, color: grayColor });
   addText(`${data.interestRate}% p.a.`, col2X, yPos + 7, { fontSize: 12, fontStyle: "bold" });
   
   yPos += 25;
   
   // Row 3
   addText("Loan Tenure", col1X, yPos, { fontSize: 9, color: grayColor });
   const years = Math.floor(data.tenure / 12);
   const months = data.tenure % 12;
   addText(`${data.tenure} months (${years} years${months > 0 ? ` ${months} months` : ""})`, col1X, yPos + 7, { fontSize: 12, fontStyle: "bold" });
   
   yPos += 35;
 
   // EMI Result - Hero Display
   doc.setFillColor(...primaryColor);
   doc.roundedRect(margin, yPos, pageWidth - margin * 2, 50, 5, 5, "F");
   
   addText("Your Monthly EMI", pageWidth / 2, yPos + 15, { fontSize: 12, color: [255, 255, 255], align: "center" });
   addText(`₹${data.emi.toLocaleString("en-IN")}`, pageWidth / 2, yPos + 35, { fontSize: 28, color: [255, 255, 255], fontStyle: "bold", align: "center" });
   
   yPos += 65;
 
   // Payment Breakdown
   addText("PAYMENT BREAKDOWN", margin, yPos, { fontSize: 11, fontStyle: "bold", color: primaryColor });
   yPos += 5;
   drawLine(yPos, primaryColor);
   yPos += 15;
 
   // Visual bar representation
   const barWidth = pageWidth - margin * 2;
   const principalPercent = (data.loanPrincipal / data.totalPayment) * 100;
   const interestPercent = 100 - principalPercent;
   
   doc.setFillColor(...primaryColor);
   doc.roundedRect(margin, yPos, barWidth * principalPercent / 100, 10, 2, 2, "F");
   doc.setFillColor(251, 191, 36); // Amber
   doc.roundedRect(margin + barWidth * principalPercent / 100, yPos, barWidth * interestPercent / 100, 10, 2, 2, "F");
   
   yPos += 20;
 
   // Legend and amounts
   doc.setFillColor(...primaryColor);
   doc.circle(margin + 3, yPos, 3, "F");
   addText("Principal Amount", margin + 10, yPos + 2, { fontSize: 9, color: grayColor });
   addText(formatCurrency(data.loanPrincipal), margin + 70, yPos + 2, { fontSize: 11, fontStyle: "bold" });
   addText(`(${principalPercent.toFixed(1)}%)`, margin + 110, yPos + 2, { fontSize: 9, color: grayColor });
   
   doc.setFillColor(251, 191, 36);
   doc.circle(col2X + 3, yPos, 3, "F");
   addText("Total Interest", col2X + 10, yPos + 2, { fontSize: 9, color: grayColor });
   addText(formatCurrency(data.totalInterest), col2X + 60, yPos + 2, { fontSize: 11, fontStyle: "bold" });
   addText(`(${interestPercent.toFixed(1)}%)`, col2X + 100, yPos + 2, { fontSize: 9, color: grayColor });
   
   yPos += 25;
   
   // Total Amount Payable
   doc.setFillColor(...lightGray);
   doc.roundedRect(margin, yPos - 5, pageWidth - margin * 2, 20, 3, 3, "F");
   
   addText("Total Amount Payable (Principal + Interest)", margin + 10, yPos + 5, { fontSize: 10, fontStyle: "bold" });
   addText(formatCurrency(data.totalPayment), pageWidth - margin - 10, yPos + 5, { fontSize: 14, fontStyle: "bold", color: darkColor, align: "right" });
   
   yPos += 35;
 
   // Partner Banks Section
   addText("PARTNERED BANKS", margin, yPos, { fontSize: 11, fontStyle: "bold", color: primaryColor });
   yPos += 5;
   drawLine(yPos, primaryColor);
   yPos += 12;
   
   addText("SBI  •  HDFC Bank  •  ICICI Bank  •  Axis Bank  •  Kotak  •  IDFC First  •  Yes Bank", pageWidth / 2, yPos, { fontSize: 9, color: grayColor, align: "center" });
   
   yPos += 20;
 
   // Disclaimer
   doc.setFillColor(254, 249, 195); // Light yellow
   doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, "F");
   
   addText("Note: This is an indicative estimate. Actual EMI may vary based on bank policies,", margin + 5, yPos + 8, { fontSize: 8, color: grayColor });
   addText("credit score, and prevailing interest rates. Contact us for a personalized quote.", margin + 5, yPos + 16, { fontSize: 8, color: grayColor });
 
   // Footer
   yPos = 270;
   drawLine(yPos);
   yPos += 8;
   
   addText("Get the Best Car Loan - Call or WhatsApp Us!", pageWidth / 2, yPos, { fontSize: 10, fontStyle: "bold", align: "center" });
   yPos += 6;
   addText("+91 98559 24442  |  www.grabyourcar.com", pageWidth / 2, yPos, { fontSize: 9, color: grayColor, align: "center" });
 
   // Save
   const carSuffix = data.carName ? `_${data.carName.replace(/\s+/g, "_")}` : "";
   const fileName = `EMI_Estimate${carSuffix}_${format(new Date(), "ddMMMyyyy")}.pdf`;
   doc.save(fileName);
 };
 
 // Generate shareable WhatsApp message
 export const generateEMIWhatsAppMessage = (data: EMIData): string => {
   const formatCurrency = (amount: number) => {
     if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
     if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
     return `₹${amount.toLocaleString("en-IN")}`;
   };
 
   let message = `📊 *EMI Estimate from Grabyourcar*\n\n`;
   
   if (data.carName) {
     message += `🚗 *${data.carName}*${data.variantName ? ` - ${data.variantName}` : ""}\n\n`;
   }
   
   message += `💰 *Loan Details*\n`;
   message += `• Car Price: ${formatCurrency(data.loanAmount)}\n`;
   message += `• Down Payment: ${formatCurrency(data.downPayment)}\n`;
   message += `• Loan Amount: ${formatCurrency(data.loanPrincipal)}\n`;
   message += `• Interest Rate: ${data.interestRate}% p.a.\n`;
   message += `• Tenure: ${data.tenure} months\n\n`;
   
   message += `📅 *Monthly EMI: ₹${data.emi.toLocaleString("en-IN")}*\n\n`;
   
   message += `Total Payable: ${formatCurrency(data.totalPayment)}\n`;
   message += `Total Interest: ${formatCurrency(data.totalInterest)}\n\n`;
   
   message += `---\n`;
   message += `Get the best car loan rates!\n`;
   message += `📞 +91 98559 24442\n`;
   message += `🌐 www.grabyourcar.com`;
   
   return message;
 };