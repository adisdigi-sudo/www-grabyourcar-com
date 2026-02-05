import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AlertEmailRequest {
  type: 'hot_lead' | 'large_payment' | 'overdue_followup' | 'urgent_followup';
  title: string;
  message: string;
  data?: any;
  recipients?: string[];
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const getAlertColor = (type: string): string => {
  switch (type) {
    case 'hot_lead':
      return '#f97316'; // Orange
    case 'large_payment':
      return '#22c55e'; // Green
    case 'overdue_followup':
      return '#ef4444'; // Red
    case 'urgent_followup':
      return '#3b82f6'; // Blue
    default:
      return '#6366f1'; // Indigo
  }
};

const getAlertIcon = (type: string): string => {
  switch (type) {
    case 'hot_lead':
      return '🔥';
    case 'large_payment':
      return '💰';
    case 'overdue_followup':
      return '⚠️';
    case 'urgent_followup':
      return '📞';
    default:
      return '🔔';
  }
};

const generateAlertEmailHtml = (alert: AlertEmailRequest): string => {
  const color = getAlertColor(alert.type);
  const icon = getAlertIcon(alert.type);
  const timestamp = new Date().toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  let detailsHtml = '';
  
  if (alert.data) {
    if (alert.type === 'hot_lead' && alert.data.customer_name) {
      detailsHtml = `
        <tr>
          <td style="padding: 16px; background-color: #f9fafb; border-radius: 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 4px 0; color: #6b7280; font-size: 12px;">Customer</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600;">${alert.data.customer_name}</td>
              </tr>
              ${alert.data.phone ? `
              <tr>
                <td style="padding: 4px 0; color: #6b7280; font-size: 12px;">Phone</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600;">
                  <a href="tel:${alert.data.phone}" style="color: ${color}; text-decoration: none;">${alert.data.phone}</a>
                </td>
              </tr>
              ` : ''}
              ${alert.data.car_brand || alert.data.car_model ? `
              <tr>
                <td style="padding: 4px 0; color: #6b7280; font-size: 12px;">Interest</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600;">${alert.data.car_brand || ''} ${alert.data.car_model || ''}</td>
              </tr>
              ` : ''}
              ${alert.data.source ? `
              <tr>
                <td style="padding: 4px 0; color: #6b7280; font-size: 12px;">Source</td>
                <td style="padding: 4px 0; text-align: right;">${alert.data.source}</td>
              </tr>
              ` : ''}
            </table>
          </td>
        </tr>
      `;
    } else if (alert.type === 'large_payment' && alert.data.payment_amount) {
      detailsHtml = `
        <tr>
          <td style="padding: 16px; background-color: #f0fdf4; border-radius: 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 4px 0; color: #6b7280; font-size: 12px;">Amount</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 700; font-size: 18px; color: #16a34a;">${formatCurrency(alert.data.payment_amount)}</td>
              </tr>
              ${alert.data.owner_name ? `
              <tr>
                <td style="padding: 4px 0; color: #6b7280; font-size: 12px;">Customer</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600;">${alert.data.owner_name}</td>
              </tr>
              ` : ''}
              ${alert.data.registration_number ? `
              <tr>
                <td style="padding: 4px 0; color: #6b7280; font-size: 12px;">Registration</td>
                <td style="padding: 4px 0; text-align: right;">${alert.data.registration_number}</td>
              </tr>
              ` : ''}
              ${alert.data.service_type ? `
              <tr>
                <td style="padding: 4px 0; color: #6b7280; font-size: 12px;">Service</td>
                <td style="padding: 4px 0; text-align: right;">${alert.data.service_type}</td>
              </tr>
              ` : ''}
            </table>
          </td>
        </tr>
      `;
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alert - GrabYourCar</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${color}; padding: 24px; text-align: center;">
              <span style="font-size: 40px;">${icon}</span>
              <h1 style="margin: 12px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 700;">${alert.title}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151; line-height: 1.5;">
                ${alert.message}
              </p>
              
              ${detailsHtml}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 24px 24px 24px; text-align: center;">
              <a href="https://grabyourcar.lovable.app/admin" style="display: inline-block; background-color: ${color}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">View in Dashboard →</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                Alert received at ${timestamp} IST<br>
                GrabYourCar Admin Notifications
              </p>
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AlertEmailRequest = await req.json();
    
    let recipients = body.recipients || [];
    
    // If no recipients provided, fetch from admin settings or scheduled reports
    if (recipients.length === 0) {
      // First try admin_settings for alert_email_recipients
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'alert_email_recipients')
        .single();
      
      if (settings?.setting_value) {
        const value = settings.setting_value as any;
        if (Array.isArray(value)) {
          recipients = value;
        } else if (typeof value === 'object' && value.emails) {
          recipients = value.emails;
        }
      }
      
      // Fallback to scheduled reports recipients
      if (recipients.length === 0) {
        const { data: reports } = await supabase
          .from('scheduled_reports')
          .select('recipients')
          .eq('enabled', true)
          .limit(1);
        
        if (reports && reports.length > 0 && reports[0].recipients) {
          recipients = reports[0].recipients;
        }
      }
    }

    if (recipients.length === 0) {
      console.log("No alert email recipients configured");
      return new Response(
        JSON.stringify({ success: false, message: "No recipients configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending ${body.type} alert to ${recipients.length} recipient(s)`);

    const emailHtml = generateAlertEmailHtml(body);
    const icon = getAlertIcon(body.type);

    const emailResult = await resend.emails.send({
      from: "GrabYourCar Alerts <noreply@grabyourcar.com>",
      to: recipients,
      subject: `${icon} ${body.title}`,
      html: emailHtml,
    });

    console.log("Alert email sent:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Alert sent to ${recipients.length} recipient(s)`,
        emailId: emailResult.data?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-alert-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
