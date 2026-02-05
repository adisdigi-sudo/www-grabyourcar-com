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

export const generateCSV = (data: DashboardExportData): string => {
  const lines: string[] = [];
  const { dateRange, stats, leadsTrend, leadSources, funnelData, revenueData, performanceData } = data;

  // Header with date range
  lines.push(`Dashboard Report - ${format(dateRange.from, 'MMM dd, yyyy')} to ${format(dateRange.to, 'MMM dd, yyyy')}`);
  lines.push(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`);
  lines.push("");

  // Dashboard Stats Section
  if (stats) {
    lines.push("DASHBOARD STATISTICS");
    lines.push("Metric,Value");
    lines.push(`Total Leads,${stats.totalLeads}`);
    lines.push(`New Leads Today,${stats.newLeadsToday}`);
    lines.push(`Hot Leads,${stats.hotLeads}`);
    lines.push(`Conversion Rate,${stats.conversionRate}%`);
    lines.push(`Total HSRP Bookings,${stats.totalHsrpBookings}`);
    lines.push(`Pending HSRP Bookings,${stats.pendingHsrpBookings}`);
    lines.push(`Total Rental Bookings,${stats.totalRentalBookings}`);
    lines.push(`Total Inquiries,${stats.totalInquiries}`);
    lines.push(`Revenue,₹${stats.revenue?.toLocaleString()}`);
    lines.push("");
  }

  // Lead Funnel Section
  if (funnelData && funnelData.length > 0) {
    lines.push("LEAD FUNNEL");
    lines.push("Stage,Count");
    funnelData.forEach((stage) => {
      lines.push(`${stage.name},${stage.count}`);
    });
    lines.push("");
  }

  // Lead Sources Section
  if (leadSources && leadSources.length > 0) {
    lines.push("LEAD SOURCES");
    lines.push("Source,Count");
    leadSources.forEach((source) => {
      lines.push(`${source.name},${source.value}`);
    });
    lines.push("");
  }

  // Revenue Section
  if (revenueData && revenueData.length > 0) {
    lines.push("REVENUE BREAKDOWN (LAST 6 MONTHS)");
    lines.push("Month,HSRP (₹),Rentals (₹),Accessories (₹),Total (₹)");
    revenueData.forEach((month) => {
      const total = month.hsrp + month.rentals + month.accessories;
      lines.push(`${month.month},${month.hsrp},${month.rentals},${month.accessories},${total}`);
    });
    lines.push("");
  }

  // Lead Trends Section (simplified)
  if (leadsTrend && leadsTrend.length > 0) {
    lines.push("LEAD TRENDS");
    lines.push("Date,New Leads,Conversions");
    leadsTrend.forEach((day) => {
      lines.push(`${day.date},${day.leads},${day.converted}`);
    });
    lines.push("");
  }

  // Performance Metrics Section
  if (performanceData) {
    lines.push("PERFORMANCE METRICS");
    lines.push("Metric,Value");
    lines.push(`Avg Response Time,${performanceData.avgResponseTime}`);
    lines.push(`Lead to Customer Rate,${performanceData.leadToCustomerRate}%`);
    lines.push(`Follow-up Completion,${performanceData.followUpCompletion}%`);
    lines.push(`HSRP Fulfillment Rate,${performanceData.hsrpFulfillmentRate}%`);
    lines.push(`Monthly Target,${performanceData.monthlyTarget}`);
    lines.push(`Monthly Achieved,${performanceData.monthlyAchieved}`);
  }

  return lines.join("\n");
};

export const downloadCSV = (data: DashboardExportData) => {
  const csv = generateCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const fileName = `dashboard-report-${format(data.dateRange.from, 'yyyy-MM-dd')}-to-${format(data.dateRange.to, 'yyyy-MM-dd')}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
