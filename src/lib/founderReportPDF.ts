import jsPDF from "jspdf";
import { format } from "date-fns";

export interface FounderReportData {
  period: "week" | "month" | "quarter";
  periodLabel: string;
  dateRange: { from: Date; to: Date };
  totals: {
    targetRev: number;
    achievedRev: number;
    targetCount: number;
    achievedCount: number;
  };
  verticalStats: Array<{
    verticalName: string;
    targetRevenue: number;
    achievedRevenue: number;
    targetCount: number;
    achievedCount: number;
    achievement: number;
  }>;
  topPerformers: Array<{
    employee_name: string;
    vertical_name: string;
    total_deals: number;
    total_incentive: number;
  }>;
}

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n || 0);

export const generateFounderReportPDF = (data: FounderReportData): jsPDF => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxY = pageHeight - margin;
  let y = 18;

  const ensureSpace = (needed: number) => {
    if (y + needed > maxY) {
      doc.addPage();
      y = margin;
    }
  };

  const text = (txt: string, size: number, bold = false, color: number[] = [20, 20, 20]) => {
    ensureSpace(size / 2.2);
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(txt, margin, y);
    y += size / 2.2;
  };

  const drawTable = (headers: string[], rows: string[][], colWidths?: number[]) => {
    ensureSpace(20);
    const usable = pageWidth - 2 * margin;
    const widths = colWidths ?? headers.map(() => usable / headers.length);

    // header
    doc.setFillColor(30, 64, 175);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    let x = margin;
    headers.forEach((h, i) => {
      doc.rect(x, y, widths[i], 7, "F");
      doc.text(h, x + 2, y + 5);
      x += widths[i];
    });
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    rows.forEach((row, idx) => {
      ensureSpace(7);
      if (idx % 2 === 0) {
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, y, usable, 6.5, "F");
      }
      x = margin;
      row.forEach((cell, i) => {
        const truncated = cell.length > 28 ? cell.slice(0, 26) + "…" : cell;
        doc.text(truncated, x + 2, y + 4.5);
        x += widths[i];
      });
      y += 6.5;
    });
    y += 4;
  };

  // ===== HEADER =====
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageWidth, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("GrabYourCar — Founder Report", margin, 9);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.periodLabel}`, pageWidth - margin, 9, { align: "right" });
  y = 22;

  text(
    `Period: ${format(data.dateRange.from, "dd MMM yyyy")} — ${format(data.dateRange.to, "dd MMM yyyy")}`,
    9,
    false,
    [100, 100, 100],
  );
  text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 8, false, [140, 140, 140]);
  y += 3;

  // ===== EXECUTIVE SUMMARY =====
  text("EXECUTIVE SUMMARY", 12, true, [30, 64, 175]);
  const overallPct =
    data.totals.targetRev > 0 ? Math.round((data.totals.achievedRev / data.totals.targetRev) * 100) : 0;
  const status = overallPct >= 100 ? "AHEAD" : overallPct >= 70 ? "ON TRACK" : "BEHIND";
  const statusColor: number[] = overallPct >= 100 ? [22, 163, 74] : overallPct >= 70 ? [202, 138, 4] : [220, 38, 38];

  drawTable(
    ["Metric", "Value"],
    [
      ["Target Revenue", `₹${formatINR(data.totals.targetRev)}`],
      ["Achieved Revenue", `₹${formatINR(data.totals.achievedRev)}`],
      ["Achievement %", `${overallPct}%`],
      ["Target Deals", String(data.totals.targetCount || "—")],
      ["Achieved Deals", String(data.totals.achievedCount)],
      ["Status", status],
    ],
    [70, pageWidth - 2 * margin - 70],
  );

  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.rect(margin, y, pageWidth - 2 * margin, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`OVERALL STATUS: ${status} — ${overallPct}% of target`, pageWidth / 2, y + 5.5, { align: "center" });
  y += 12;

  // ===== PER-VERTICAL =====
  text("PER-VERTICAL PERFORMANCE", 12, true, [30, 64, 175]);
  if (data.verticalStats.length === 0) {
    text("No vertical data available", 9, false, [120, 120, 120]);
  } else {
    const rows = data.verticalStats.map((v) => [
      v.verticalName,
      v.targetRevenue > 0 ? `₹${formatINR(v.targetRevenue)}` : "—",
      `₹${formatINR(v.achievedRevenue)}`,
      `${v.achievedCount}/${v.targetCount || "—"}`,
      v.targetRevenue > 0 ? `${v.achievement}%` : "N/A",
    ]);
    drawTable(["Vertical", "Target", "Achieved", "Deals", "Ach%"], rows, [50, 35, 35, 25, 25]);
  }

  // ===== TOP PERFORMERS =====
  text("TOP PERFORMERS (by incentive)", 12, true, [30, 64, 175]);
  if (data.topPerformers.length === 0) {
    text("No incentive data for this period", 9, false, [120, 120, 120]);
  } else {
    const rows = data.topPerformers.slice(0, 10).map((p, i) => [
      `#${i + 1}`,
      p.employee_name || "—",
      p.vertical_name || "—",
      String(p.total_deals || 0),
      `₹${formatINR(Number(p.total_incentive || 0))}`,
    ]);
    drawTable(["Rank", "Employee", "Vertical", "Deals", "Incentive"], rows, [15, 55, 45, 20, 35]);
  }

  // ===== FOOTER =====
  const pageCount = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.text("Confidential — GrabYourCar Founder Report", margin, pageHeight - 8);
  }

  return doc;
};

export const downloadFounderReportPDF = (data: FounderReportData) => {
  const doc = generateFounderReportPDF(data);
  const fileName = `founder-report-${data.period}-${format(data.dateRange.from, "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
};
