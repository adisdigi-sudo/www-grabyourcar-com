import jsPDF from "jspdf";
import { format } from "date-fns";

interface DashboardExportData {
  dateRange: { from: Date; to: Date };
  stats?: any;
  leadsTrend?: any[];
  leadSources?: any[];
  funnelData?: any[];
  revenueData?: any[];
  performanceData?: any;
}

export const generatePDF = (data: DashboardExportData) => {
  const { dateRange, stats, leadsTrend, leadSources, funnelData, revenueData, performanceData } = data;
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let yPosition = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxY = pageHeight - margin;

  // Helper function to add text
  const addText = (text: string, size: number, bold: boolean = false, color = [0, 0, 0]) => {
    if (yPosition > maxY - 5) {
      doc.addPage();
      yPosition = margin;
    }
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, margin, yPosition);
    yPosition += size / 2.5;
  };

  // Helper function to add table
  const addTable = (headers: string[], rows: string[][]) => {
    if (yPosition > maxY - 20) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    const cellWidth = (pageWidth - 2 * margin) / headers.length;
    
    // Header row
    doc.setFillColor(66, 66, 66);
    doc.setTextColor(255, 255, 255);
    headers.forEach((header, i) => {
      doc.rect(margin + i * cellWidth, yPosition, cellWidth, 7, "F");
      doc.text(header, margin + i * cellWidth + 2, yPosition + 5);
    });

    yPosition += 8;
    doc.setTextColor(0, 0, 0);

    // Data rows
    rows.forEach((row, idx) => {
      if (yPosition > maxY - 5) {
        doc.addPage();
        yPosition = margin;
      }

      const rowHeight = 6;
      if (idx % 2 === 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, "F");
      }

      row.forEach((cell, i) => {
        doc.text(cell, margin + i * cellWidth + 2, yPosition + 4);
      });

      yPosition += rowHeight;
    });

    yPosition += 3;
  };

  // Title
  addText("Dashboard Report", 16, true, [25, 25, 112]);
  addText(
    `${format(dateRange.from, "MMM dd, yyyy")} to ${format(dateRange.to, "MMM dd, yyyy")}`,
    10,
    false,
    [100, 100, 100]
  );
  addText(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, 8, false, [150, 150, 150]);
  yPosition += 5;

  // Dashboard Statistics Section
  if (stats) {
    addText("DASHBOARD STATISTICS", 12, true);
    const statsRows = [
      ["Total Leads", stats.totalLeads?.toString() || "0"],
      ["New Leads Today", stats.newLeadsToday?.toString() || "0"],
      ["Hot Leads", stats.hotLeads?.toString() || "0"],
      ["Conversion Rate", `${stats.conversionRate}%`],
      ["Total HSRP Bookings", stats.totalHsrpBookings?.toString() || "0"],
      ["Pending HSRP Bookings", stats.pendingHsrpBookings?.toString() || "0"],
      ["Total Rental Bookings", stats.totalRentalBookings?.toString() || "0"],
      ["Total Inquiries", stats.totalInquiries?.toString() || "0"],
      ["Revenue", `₹${stats.revenue?.toLocaleString() || "0"}`],
    ];
    addTable(["Metric", "Value"], statsRows);
  }

  // Lead Funnel Section
  if (funnelData && funnelData.length > 0) {
    addText("LEAD FUNNEL", 12, true);
    const funnelRows = funnelData.map((stage) => [
      stage.name.charAt(0).toUpperCase() + stage.name.slice(1),
      stage.count?.toString() || "0",
    ]);
    addTable(["Stage", "Count"], funnelRows);
  }

  // Lead Sources Section
  if (leadSources && leadSources.length > 0) {
    addText("LEAD SOURCES", 12, true);
    const sourceRows = leadSources.map((source) => [
      source.name,
      source.value?.toString() || "0",
    ]);
    addTable(["Source", "Count"], sourceRows);
  }

  // Revenue Section
  if (revenueData && revenueData.length > 0) {
    addText("REVENUE BREAKDOWN (LAST 6 MONTHS)", 12, true);
    const revenueRows = revenueData.map((month) => {
      const total = month.hsrp + month.rentals + month.accessories;
      return [
        month.month,
        `₹${month.hsrp?.toLocaleString() || "0"}`,
        `₹${month.rentals?.toLocaleString() || "0"}`,
        `₹${month.accessories?.toLocaleString() || "0"}`,
        `₹${total?.toLocaleString() || "0"}`,
      ];
    });
    addTable(["Month", "HSRP", "Rentals", "Accessories", "Total"], revenueRows);
  }

  // Performance Metrics
  if (performanceData) {
    addText("PERFORMANCE METRICS", 12, true);
    const perfRows = [
      ["Avg Response Time", performanceData.avgResponseTime || "N/A"],
      ["Lead to Customer Rate", `${performanceData.leadToCustomerRate}%`],
      ["Follow-up Completion", `${performanceData.followUpCompletion}%`],
      ["HSRP Fulfillment Rate", `${performanceData.hsrpFulfillmentRate}%`],
      ["Monthly Target", performanceData.monthlyTarget?.toString() || "0"],
      ["Monthly Achieved", performanceData.monthlyAchieved?.toString() || "0"],
    ];
    addTable(["Metric", "Value"], perfRows);
  }

  // Footer
  const pageCount = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  return doc;
};

export const downloadPDF = (data: DashboardExportData) => {
  const doc = generatePDF(data);
  const fileName = `dashboard-report-${format(data.dateRange.from, 'yyyy-MM-dd')}-to-${format(data.dateRange.to, 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};
