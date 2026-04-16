import jsPDF from "jspdf";
import { format } from "date-fns";

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  hsn_code?: string;
}

type InvoiceItemLike = Partial<InvoiceItem> & {
  name?: string;
  title?: string;
  rate?: number | string;
  price?: number | string;
  quantity?: number | string;
  amount?: number | string;
  hsn?: string;
};

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  client_address?: string;
  gstin?: string;
  items?: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount?: number;
  total_amount: number;
  amount_paid?: number;
  balance_due?: number;
  description?: string;
  vertical_name?: string;
  notes?: string;
  invoice_type?: string;
}

export const generateInvoicePDF = (inv: InvoiceData) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const m = 20;
  const cw = pw - m * 2;
  let y = 0;

  const red: [number, number, number] = [220, 38, 38];
  const dark: [number, number, number] = [30, 41, 59];
  const gray: [number, number, number] = [100, 116, 139];
  const white: [number, number, number] = [255, 255, 255];
  const green: [number, number, number] = [22, 163, 74];

  const text = (t: string, x: number, yy: number, opts?: {
    size?: number; color?: [number, number, number]; bold?: boolean; align?: "left" | "center" | "right";
  }) => {
    const { size = 10, color = dark, bold = false, align = "left" } = opts || {};
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    let xp = x;
    if (align === "center") xp = pw / 2;
    if (align === "right") xp = pw - m;
    doc.text(t, xp, yy, { align });
  };

  const line = (yy: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(m, yy, pw - m, yy);
  };

  const fmt = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;

  const toNumber = (value: unknown, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
  };

  const normalizeItem = (item: InvoiceItemLike, index: number): InvoiceItem => {
    const quantity = toNumber(item.quantity, 1);
    const rate = toNumber(item.rate ?? item.price, 0);
    const amount = toNumber(item.amount, quantity * rate);
    const description = String(
      item.description ?? item.name ?? item.title ?? inv.description ?? `Item ${index + 1}`,
    ).trim();

    return {
      description: description || `Item ${index + 1}`,
      quantity,
      rate,
      amount,
      hsn_code: item.hsn_code ?? item.hsn,
    };
  };

  // Header
  doc.setFillColor(...red);
  doc.rect(0, 0, pw, 45, "F");
  text("GRABYOURCAR", m, 20, { size: 22, color: white, bold: true });
  text("GST: 09XXXXX1234Z5XX", m, 30, { size: 8, color: [255, 200, 200] });
  text("TAX INVOICE", pw - m, 18, { size: 16, color: white, bold: true, align: "right" });
  text(inv.invoice_number, pw - m, 28, { size: 10, color: white, align: "right" });
  if (inv.invoice_type) {
    text(inv.invoice_type.toUpperCase(), pw - m, 36, { size: 8, color: [255, 200, 200], align: "right" });
  }

  y = 60;

  // Invoice Meta
  const colW = cw / 3;
  text("Invoice Date", m, y, { size: 8, color: gray });
  text(format(new Date(inv.invoice_date), "dd MMM yyyy"), m, y + 6, { size: 10, bold: true });

  if (inv.due_date) {
    text("Due Date", m + colW, y, { size: 8, color: gray });
    text(format(new Date(inv.due_date), "dd MMM yyyy"), m + colW, y + 6, { size: 10, bold: true });
  }

  if (inv.vertical_name) {
    text("Vertical", m + colW * 2, y, { size: 8, color: gray });
    text(inv.vertical_name, m + colW * 2, y + 6, { size: 10, bold: true });
  }

  y += 22;
  line(y);
  y += 12;

  // Bill To
  text("BILL TO", m, y, { size: 9, color: gray, bold: true });
  y += 8;
  text(inv.client_name, m, y, { size: 11, bold: true });
  y += 6;
  if (inv.client_address) { text(inv.client_address, m, y, { size: 9, color: gray }); y += 5; }
  if (inv.client_phone) { text(`Phone: ${inv.client_phone}`, m, y, { size: 9, color: gray }); y += 5; }
  if (inv.client_email) { text(`Email: ${inv.client_email}`, m, y, { size: 9, color: gray }); y += 5; }
  if (inv.gstin) { text(`GSTIN: ${inv.gstin}`, m, y, { size: 9, color: gray }); y += 5; }

  y += 12;

  // Items Table or Description
  const items: InvoiceItem[] = inv.items && Array.isArray(inv.items) && inv.items.length > 0
    ? inv.items.map((item, index) => normalizeItem(item as InvoiceItemLike, index))
    : [{ description: inv.description || "Service", quantity: 1, rate: inv.subtotal, amount: inv.subtotal }];

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(m, y - 4, cw, 10, "F");
  text("Description", m + 3, y + 3, { size: 8, bold: true, color: gray });
  text("HSN", m + 85, y + 3, { size: 8, bold: true, color: gray });
  text("Qty", m + 105, y + 3, { size: 8, bold: true, color: gray });
  text("Rate", m + 120, y + 3, { size: 8, bold: true, color: gray });
  text("Amount", pw - m - 3, y + 3, { size: 8, bold: true, color: gray, align: "right" });
  y += 10;

  items.forEach((item, i) => {
    if (y > 240) { doc.addPage(); y = 30; }
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(m, y - 3, cw, 9, "F");
    }
    const name = item.description.length > 35 ? item.description.substring(0, 35) + "..." : item.description;
    text(name, m + 3, y + 3, { size: 9 });
    text(item.hsn_code || "—", m + 85, y + 3, { size: 9, color: gray });
    text(String(item.quantity), m + 105, y + 3, { size: 9 });
    text(fmt(item.rate), m + 120, y + 3, { size: 9 });
    text(fmt(item.amount), pw - m - 3, y + 3, { size: 9, align: "right" });
    y += 9;
  });

  y += 5;
  line(y);
  y += 12;

  // GST Breakdown
  const cgst = inv.tax_amount / 2;
  const sgst = inv.tax_amount / 2;
  const summaryX = pw - m - 85;

  text("Subtotal:", summaryX, y, { size: 9, color: gray });
  text(fmt(inv.subtotal), pw - m, y, { size: 9, align: "right" });
  y += 8;

  text("CGST (9%):", summaryX, y, { size: 9, color: gray });
  text(fmt(cgst), pw - m, y, { size: 9, align: "right" });
  y += 8;

  text("SGST (9%):", summaryX, y, { size: 9, color: gray });
  text(fmt(sgst), pw - m, y, { size: 9, align: "right" });
  y += 8;

  if (inv.discount_amount && inv.discount_amount > 0) {
    text("Discount:", summaryX, y, { size: 9, color: green });
    text(`- ${fmt(inv.discount_amount)}`, pw - m, y, { size: 9, align: "right", color: green });
    y += 8;
  }

  y += 2;
  doc.setFillColor(...red);
  doc.rect(summaryX - 5, y - 4, 95, 14, "F");
  text("TOTAL:", summaryX, y + 5, { size: 10, color: white, bold: true });
  text(fmt(inv.total_amount), pw - m, y + 5, { size: 12, color: white, bold: true, align: "right" });

  y += 22;

  if ((inv.amount_paid || 0) > 0) {
    text("Amount Paid:", summaryX, y, { size: 9, color: green });
    text(fmt(inv.amount_paid!), pw - m, y, { size: 9, align: "right", color: green });
    y += 8;
    text("Balance Due:", summaryX, y, { size: 9, bold: true });
    text(fmt(inv.balance_due || (inv.total_amount - (inv.amount_paid || 0))), pw - m, y, { size: 9, align: "right", bold: true });
    y += 10;
  }

  // Notes
  if (inv.notes) {
    y += 5;
    text("Notes:", m, y, { size: 8, color: gray, bold: true });
    y += 6;
    text(inv.notes, m, y, { size: 8, color: gray });
  }

  // Footer
  y = 270;
  line(y);
  y += 6;
  text("Thank you for your business!", pw / 2, y, { size: 9, color: gray, align: "center" });
  y += 5;
  text("GrabYourCar Pvt. Ltd. | support@grabyourcar.com | +91 9876543210", pw / 2, y, { size: 7, color: gray, align: "center" });
  y += 4;
  text("www.grabyourcar.com", pw / 2, y, { size: 7, color: red, align: "center" });

  const fileName = `Invoice_${inv.invoice_number}.pdf`;
  doc.save(fileName);
};
