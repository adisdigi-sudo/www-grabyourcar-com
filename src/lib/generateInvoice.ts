import jsPDF from "jspdf";
import { format } from "date-fns";

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface OrderData {
  id: string;
  order_id: string | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_status: string;
  order_status: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_email?: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  created_at: string;
  payment_id?: string;
}

export const generateInvoice = (order: OrderData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  // Colors
  const primaryColor: [number, number, number] = [220, 38, 38]; // Red
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

  // Header with branding
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Company name
  addText("GRABYOURCAR", margin, 20, { fontSize: 22, color: [255, 255, 255], fontStyle: "bold" });
  addText("Your Trusted Car Buying Partner", margin, 28, { fontSize: 9, color: [255, 255, 255] });

  // Invoice title
  addText("TAX INVOICE", pageWidth - margin, 20, { fontSize: 16, color: [255, 255, 255], fontStyle: "bold", align: "right" });
  addText(`#${order.order_id || order.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, 28, { fontSize: 10, color: [255, 255, 255], align: "right" });

  yPos = 60;

  // Invoice details row
  const colWidth = contentWidth / 3;
  
  // Invoice Date
  addText("Invoice Date", margin, yPos, { fontSize: 8, color: grayColor });
  addText(format(new Date(order.created_at), "dd MMM yyyy"), margin, yPos + 6, { fontSize: 10, fontStyle: "bold" });

  // Order Status
  addText("Order Status", margin + colWidth, yPos, { fontSize: 8, color: grayColor });
  addText(order.order_status.toUpperCase(), margin + colWidth, yPos + 6, { fontSize: 10, fontStyle: "bold" });

  // Payment Status
  addText("Payment Status", margin + colWidth * 2, yPos, { fontSize: 8, color: grayColor });
  addText(order.payment_status.toUpperCase(), margin + colWidth * 2, yPos + 6, { fontSize: 10, fontStyle: "bold", color: order.payment_status === "paid" ? [22, 163, 74] : grayColor });

  yPos += 25;
  drawLine(yPos);
  yPos += 15;

  // Bill To Section
  addText("BILL TO", margin, yPos, { fontSize: 9, color: grayColor, fontStyle: "bold" });
  yPos += 8;
  addText(order.shipping_name, margin, yPos, { fontSize: 11, fontStyle: "bold" });
  yPos += 6;
  addText(order.shipping_address, margin, yPos, { fontSize: 9, color: grayColor });
  yPos += 5;
  addText(`${order.shipping_city}, ${order.shipping_state} - ${order.shipping_pincode}`, margin, yPos, { fontSize: 9, color: grayColor });
  yPos += 5;
  addText(`Phone: ${order.shipping_phone}`, margin, yPos, { fontSize: 9, color: grayColor });
  if (order.shipping_email) {
    yPos += 5;
    addText(`Email: ${order.shipping_email}`, margin, yPos, { fontSize: 9, color: grayColor });
  }

  yPos += 20;

  // Items Table Header
  doc.setFillColor(...lightGray);
  doc.rect(margin, yPos - 5, contentWidth, 12, "F");
  
  addText("Item", margin + 3, yPos + 3, { fontSize: 9, fontStyle: "bold", color: grayColor });
  addText("Qty", margin + 100, yPos + 3, { fontSize: 9, fontStyle: "bold", color: grayColor });
  addText("Price", margin + 120, yPos + 3, { fontSize: 9, fontStyle: "bold", color: grayColor });
  addText("Amount", pageWidth - margin - 3, yPos + 3, { fontSize: 9, fontStyle: "bold", color: grayColor, align: "right" });

  yPos += 12;

  // Items
  order.items.forEach((item, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 30;
    }

    const itemTotal = item.price * item.quantity;
    
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPos - 4, contentWidth, 10, "F");
    }

    // Truncate long names
    const maxNameLength = 45;
    const displayName = item.name.length > maxNameLength 
      ? item.name.substring(0, maxNameLength) + "..." 
      : item.name;

    addText(displayName, margin + 3, yPos + 2, { fontSize: 9 });
    addText(item.quantity.toString(), margin + 100, yPos + 2, { fontSize: 9 });
    addText(`₹${item.price.toLocaleString()}`, margin + 120, yPos + 2, { fontSize: 9 });
    addText(`₹${itemTotal.toLocaleString()}`, pageWidth - margin - 3, yPos + 2, { fontSize: 9, align: "right" });

    yPos += 10;
  });

  yPos += 5;
  drawLine(yPos);
  yPos += 15;

  // Summary Section
  const summaryX = pageWidth - margin - 80;
  
  // Subtotal
  addText("Subtotal:", summaryX, yPos, { fontSize: 9, color: grayColor });
  addText(`₹${order.subtotal.toLocaleString()}`, pageWidth - margin, yPos, { fontSize: 9, align: "right" });
  yPos += 8;

  // Delivery
  addText("Delivery:", summaryX, yPos, { fontSize: 9, color: grayColor });
  addText(order.delivery_fee > 0 ? `₹${order.delivery_fee.toLocaleString()}` : "FREE", pageWidth - margin, yPos, { fontSize: 9, align: "right", color: order.delivery_fee === 0 ? [22, 163, 74] : darkColor });
  yPos += 10;

  // Total
  doc.setFillColor(...primaryColor);
  doc.rect(summaryX - 5, yPos - 5, 90, 14, "F");
  addText("TOTAL:", summaryX, yPos + 4, { fontSize: 10, color: [255, 255, 255], fontStyle: "bold" });
  addText(`₹${order.total_amount.toLocaleString()}`, pageWidth - margin, yPos + 4, { fontSize: 12, color: [255, 255, 255], fontStyle: "bold", align: "right" });

  yPos += 30;

  // Payment Info
  if (order.payment_id) {
    addText("Payment Reference:", margin, yPos, { fontSize: 8, color: grayColor });
    addText(order.payment_id, margin + 35, yPos, { fontSize: 8 });
    yPos += 10;
  }

  // Footer
  yPos = 270;
  drawLine(yPos);
  yPos += 8;
  
  addText("Thank you for shopping with Grabyourcar!", pageWidth / 2, yPos, { fontSize: 9, color: grayColor, align: "center" });
  yPos += 5;
  addText("For support: support@grabyourcar.com | +91 9876543210", pageWidth / 2, yPos, { fontSize: 8, color: grayColor, align: "center" });
  yPos += 5;
  addText("www.grabyourcar.com", pageWidth / 2, yPos, { fontSize: 8, color: primaryColor, align: "center" });

  // Save
  const fileName = `Invoice_${order.order_id || order.id.slice(0, 8).toUpperCase()}.pdf`;
  doc.save(fileName);
};
