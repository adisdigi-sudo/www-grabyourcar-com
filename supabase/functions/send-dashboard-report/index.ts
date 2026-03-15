import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DashboardStats {
  totalLeads: number;
  newLeadsToday: number;
  hotLeads: number;
  convertedLeads: number;
  totalHsrpBookings: number;
  pendingHsrpBookings: number;
  totalRentalBookings: number;
  totalInquiries: number;
  revenue: number;
  conversionRate: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const generateEmailHtml = (stats: DashboardStats, dateRange: string, frequency: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Report - GrabYourCar</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">📊 Dashboard Report</h1>
              <p style="margin: 10px 0 0 0; color: #bfdbfe; font-size: 14px;">${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Summary • ${dateRange}</p>
            </td>
          </tr>

          <!-- Stats Grid -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #1f2937;">Lead Performance</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 10px;">
                    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 32px; font-weight: 700; color: #1e40af;">${stats.totalLeads}</p>
                      <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Total Leads</p>
                    </div>
                  </td>
                  <td width="50%" style="padding: 10px;">
                    <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 32px; font-weight: 700; color: #dc2626;">${stats.hotLeads}</p>
                      <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Hot Leads</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 10px;">
                    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 32px; font-weight: 700; color: #16a34a;">${stats.convertedLeads}</p>
                      <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Converted</p>
                    </div>
                  </td>
                  <td width="50%" style="padding: 10px;">
                    <div style="background-color: #fefce8; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 32px; font-weight: 700; color: #ca8a04;">${stats.conversionRate}%</p>
                      <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Conversion Rate</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bookings Section -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #1f2937;">Bookings & Revenue</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px 16px; font-size: 14px; color: #6b7280;">HSRP Bookings</td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1f2937; text-align: right;">${stats.totalHsrpBookings}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb;">Pending HSRP</td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #f59e0b; text-align: right; border-top: 1px solid #e5e7eb;">${stats.pendingHsrpBookings}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px 16px; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb;">Rental Bookings</td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1f2937; text-align: right; border-top: 1px solid #e5e7eb;">${stats.totalRentalBookings}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb;">Total Inquiries</td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1f2937; text-align: right; border-top: 1px solid #e5e7eb;">${stats.totalInquiries}</td>
                </tr>
                <tr style="background-color: #ecfdf5;">
                  <td style="padding: 16px; font-size: 16px; font-weight: 600; color: #1f2937; border-top: 2px solid #10b981;">Total Revenue</td>
                  <td style="padding: 16px; font-size: 20px; font-weight: 700; color: #059669; text-align: right; border-top: 2px solid #10b981;">${formatCurrency(stats.revenue)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <a href="https://www.grabyourcar.com/admin" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Full Dashboard →</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated report from GrabYourCar Admin Dashboard.</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} GrabYourCar. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for manual trigger or use default for cron
    let recipients: string[] = [];
    let frequency = "weekly";
    let reportId: string | null = null;

    try {
      const body = await req.json();
      recipients = body.recipients || [];
      frequency = body.frequency || "weekly";
      reportId = body.reportId || null;
    } catch {
      // If no body, fetch from scheduled_reports table
      console.log("No request body, fetching scheduled reports...");
    }

    // If no recipients provided, fetch enabled scheduled reports
    if (recipients.length === 0) {
      const { data: reports, error: reportsError } = await supabase
        .from("scheduled_reports")
        .select("*")
        .eq("enabled", true);

      if (reportsError) {
        console.error("Error fetching reports:", reportsError);
        throw reportsError;
      }

      if (!reports || reports.length === 0) {
        console.log("No scheduled reports configured");
        return new Response(
          JSON.stringify({ message: "No scheduled reports configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Process each report
      for (const report of reports) {
        recipients = report.recipients;
        frequency = report.frequency;
        reportId = report.id;
      }
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate date range based on frequency
    const now = new Date();
    let fromDate: Date;
    let dateRange: string;

    switch (frequency) {
      case "daily":
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        dateRange = `${fromDate.toLocaleDateString("en-IN")}`;
        break;
      case "weekly":
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateRange = `${fromDate.toLocaleDateString("en-IN")} - ${now.toLocaleDateString("en-IN")}`;
        break;
      case "monthly":
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        dateRange = `${fromDate.toLocaleDateString("en-IN")} - ${now.toLocaleDateString("en-IN")}`;
        break;
      default:
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateRange = `${fromDate.toLocaleDateString("en-IN")} - ${now.toLocaleDateString("en-IN")}`;
    }

    const fromDateStr = fromDate.toISOString().split("T")[0];
    const toDateStr = now.toISOString().split("T")[0];

    console.log(`Generating ${frequency} report for ${dateRange}`);

    // Fetch dashboard stats
    const [
      leadsResult,
      hotLeadsResult,
      convertedLeadsResult,
      hsrpResult,
      pendingHsrpResult,
      rentalResult,
      inquiriesResult,
      hsrpRevenueResult,
      rentalRevenueResult,
      accessoryRevenueResult,
    ] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true })
        .gte("created_at", fromDateStr).lte("created_at", toDateStr),
      supabase.from("leads").select("id", { count: "exact", head: true })
        .eq("status", "hot").gte("created_at", fromDateStr).lte("created_at", toDateStr),
      supabase.from("leads").select("id", { count: "exact", head: true })
        .eq("status", "converted").gte("created_at", fromDateStr).lte("created_at", toDateStr),
      supabase.from("hsrp_bookings").select("id", { count: "exact", head: true })
        .gte("created_at", fromDateStr).lte("created_at", toDateStr),
      supabase.from("hsrp_bookings").select("id", { count: "exact", head: true })
        .eq("order_status", "pending").gte("created_at", fromDateStr).lte("created_at", toDateStr),
      supabase.from("rental_bookings").select("id", { count: "exact", head: true })
        .gte("created_at", fromDateStr).lte("created_at", toDateStr),
      supabase.from("inquiries").select("id", { count: "exact", head: true })
        .gte("created_at", fromDateStr).lte("created_at", toDateStr),
      supabase.from("hsrp_bookings").select("payment_amount")
        .eq("payment_status", "paid").gte("created_at", fromDateStr).lte("created_at", toDateStr),
      supabase.from("rental_bookings").select("total_amount")
        .eq("payment_status", "paid").gte("created_at", fromDateStr).lte("created_at", toDateStr),
      supabase.from("accessory_orders").select("total_amount")
        .eq("payment_status", "paid").gte("created_at", fromDateStr).lte("created_at", toDateStr),
    ]);

    const hsrpRevenue = hsrpRevenueResult.data?.reduce((sum, b) => sum + (b.payment_amount || 0), 0) || 0;
    const rentalRevenue = rentalRevenueResult.data?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
    const accessoryRevenue = accessoryRevenueResult.data?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

    const totalLeads = leadsResult.count || 0;
    const convertedLeads = convertedLeadsResult.count || 0;

    const stats: DashboardStats = {
      totalLeads,
      newLeadsToday: 0,
      hotLeads: hotLeadsResult.count || 0,
      convertedLeads,
      totalHsrpBookings: hsrpResult.count || 0,
      pendingHsrpBookings: pendingHsrpResult.count || 0,
      totalRentalBookings: rentalResult.count || 0,
      totalInquiries: inquiriesResult.count || 0,
      revenue: hsrpRevenue + rentalRevenue + accessoryRevenue,
      conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
    };

    console.log("Stats gathered:", stats);

    // Generate and send email
    const emailHtml = generateEmailHtml(stats, dateRange, frequency);

    const emailResult = await resend.emails.send({
      from: "GrabYourCar Reports <noreply@grabyourcar.com>",
      to: recipients,
      subject: `📊 ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Dashboard Report - ${dateRange}`,
      html: emailHtml,
    });

    console.log("Email sent:", emailResult);

    // Update last_sent_at if reportId provided
    if (reportId) {
      await supabase
        .from("scheduled_reports")
        .update({ last_sent_at: now.toISOString() })
        .eq("id", reportId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Report sent to ${recipients.length} recipient(s)`,
        emailId: emailResult.data?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-dashboard-report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
