import jsPDF from "jspdf";
import { format } from "date-fns";

interface PayrollData {
  id: string;
  employee_name: string;
  employee_id?: string;
  department?: string;
  designation?: string;
  payroll_month: string;
  basic_salary: number;
  hra: number;
  da: number;
  special_allowance: number;
  other_allowances: number;
  gross_salary: number;
  pf_deduction: number;
  esi_deduction: number;
  tds: number;
  professional_tax: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  payment_mode?: string;
  payment_date?: string;
  bank_account?: string;
}

export const generatePayslipPDF = (record: PayrollData) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const m = 20;
  const cw = pw - m * 2;
  let y = 0;

  const red: [number, number, number] = [220, 38, 38];
  const dark: [number, number, number] = [30, 41, 59];
  const gray: [number, number, number] = [100, 116, 139];
  const white: [number, number, number] = [255, 255, 255];
  const lightBg: [number, number, number] = [248, 250, 252];

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

  const row = (label: string, value: string, yy: number, isTotal = false) => {
    if (isTotal) {
      doc.setFillColor(248, 250, 252);
      doc.rect(m, yy - 4, cw, 10, "F");
    }
    text(label, m + 5, yy + 2, { size: isTotal ? 10 : 9, bold: isTotal, color: isTotal ? dark : gray });
    text(value, pw - m - 5, yy + 2, { size: isTotal ? 10 : 9, bold: isTotal, align: "right" });
    return yy + (isTotal ? 12 : 8);
  };

  const fmt = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;

  // Header
  doc.setFillColor(...red);
  doc.rect(0, 0, pw, 40, "F");
  text("GRABYOURCAR", m, 18, { size: 20, color: white, bold: true });
  text("PAYSLIP", pw - m, 18, { size: 14, color: white, bold: true, align: "right" });
  text(record.payroll_month, pw - m, 28, { size: 10, color: white, align: "right" });
  text("Confidential Document", m, 28, { size: 8, color: [255, 200, 200] });

  y = 55;

  // Employee Info
  const halfW = cw / 2;
  const pairs: [string, string][] = [
    ["Employee Name", record.employee_name],
    ["Employee ID", record.employee_id || "—"],
    ["Department", record.department || "—"],
    ["Designation", record.designation || "—"],
    ["Payment Mode", record.payment_mode || "Bank Transfer"],
    ["Bank A/C", record.bank_account ? `****${record.bank_account.slice(-4)}` : "—"],
  ];

  pairs.forEach(([label, value], i) => {
    const col = i % 2 === 0 ? m : m + halfW;
    const rowY = y + Math.floor(i / 2) * 14;
    text(label, col, rowY, { size: 8, color: gray });
    text(value, col, rowY + 6, { size: 10, bold: true });
  });

  y += Math.ceil(pairs.length / 2) * 14 + 10;
  line(y);
  y += 10;

  // Earnings
  text("EARNINGS", m + 5, y, { size: 10, bold: true, color: [22, 163, 74] });
  text("Amount", pw - m - 5, y, { size: 9, bold: true, color: gray, align: "right" });
  y += 8;
  line(y);
  y += 6;

  y = row("Basic Salary", fmt(record.basic_salary), y);
  y = row("House Rent Allowance (HRA)", fmt(record.hra), y);
  y = row("Dearness Allowance (DA)", fmt(record.da), y);
  y = row("Special Allowance", fmt(record.special_allowance), y);
  if (record.other_allowances > 0) y = row("Other Allowances", fmt(record.other_allowances), y);
  y += 2;
  y = row("GROSS SALARY", fmt(record.gross_salary), y, true);
  y += 5;

  // Deductions
  text("DEDUCTIONS", m + 5, y, { size: 10, bold: true, color: red });
  text("Amount", pw - m - 5, y, { size: 9, bold: true, color: gray, align: "right" });
  y += 8;
  line(y);
  y += 6;

  y = row("Provident Fund (PF)", fmt(record.pf_deduction), y);
  y = row("ESI", fmt(record.esi_deduction), y);
  y = row("TDS (Income Tax)", fmt(record.tds), y);
  y = row("Professional Tax", fmt(record.professional_tax), y);
  if (record.other_deductions > 0) y = row("Other Deductions", fmt(record.other_deductions), y);
  y += 2;
  y = row("TOTAL DEDUCTIONS", fmt(record.total_deductions), y, true);
  y += 10;

  // Net Pay
  doc.setFillColor(...red);
  doc.rect(m, y - 4, cw, 18, "F");
  text("NET PAY", m + 10, y + 8, { size: 12, color: white, bold: true });
  text(fmt(record.net_salary), pw - m - 10, y + 8, { size: 14, color: white, bold: true, align: "right" });

  y += 30;

  // Footer
  text("This is a computer-generated payslip and does not require a signature.", pw / 2, y, { size: 7, color: gray, align: "center" });
  y += 5;
  text("GrabYourCar Pvt. Ltd. | support@grabyourcar.com", pw / 2, y, { size: 7, color: gray, align: "center" });

  const fileName = `Payslip_${record.employee_name.replace(/\s+/g, "_")}_${record.payroll_month}.pdf`;
  doc.save(fileName);
};
