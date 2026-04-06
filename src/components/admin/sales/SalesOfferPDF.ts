import jsPDF from "jspdf";

interface SalesOfferParams {
  customerName: string;
  phone: string;
  carModel: string;
  variant?: string;
  color?: string;
  dealValue?: number;
  exShowroomPrice?: number;
  onRoadPrice?: number;
  specialTerms?: string;
  dealership?: string;
}

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

  // Pricing
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Pricing", 15, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (params.exShowroomPrice) {
    doc.text(`Ex-Showroom Price: Rs. ${Math.round(params.exShowroomPrice).toLocaleString("en-IN")}`, 15, y);
    y += 6;
  }
  if (params.onRoadPrice) {
    doc.text(`On-Road Price: Rs. ${Math.round(params.onRoadPrice).toLocaleString("en-IN")}`, 15, y);
    y += 6;
  }
  if (params.dealValue) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(16, 124, 65);
    doc.text(`Deal Value: Rs. ${Math.round(params.dealValue).toLocaleString("en-IN")}`, 15, y);
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
