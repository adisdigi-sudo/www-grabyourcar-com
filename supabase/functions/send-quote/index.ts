import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QuoteRequest {
  clientName: string;
  clientEmail: string;
  clientMobile: string;
  carName: string;
  variantName: string;
  selectedColor?: string;
  selectedCity?: string;
  onRoadPrice: number;
  emi: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  tenure: number;
  totalPayment: number;
  totalInterest: number;
  brochureUrl?: string;
  priceBreakup?: {
    exShowroom: number;
    rto: number;
    insurance: number;
    tcs: number;
    fastag: number;
    registration: number;
    handling: number;
  };
  discount?: {
    amount: number;
    type: string;
    label?: string;
  };
}

const formatCurrency = (amount: number) => {
  const rounded = Math.round(amount);
  if (rounded >= 10000000) return `₹${(rounded / 10000000).toFixed(2)} Cr`;
  if (rounded >= 100000) return `₹${(rounded / 100000).toFixed(2)} L`;
  return `₹${rounded.toLocaleString("en-IN")}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: QuoteRequest = await req.json();

    if (!data.clientEmail || !data.carName) {
      throw new Error("Missing required fields: clientEmail, carName");
    }

    const finalPrice = data.discount?.amount
      ? data.onRoadPrice - data.discount.amount
      : data.onRoadPrice;

    const brochureSection = data.brochureUrl
      ? `
        <tr>
          <td style="padding: 20px 30px; text-align: center; background: #f0fdf4; border-radius: 12px; margin: 20px 0;">
            <p style="font-size: 14px; color: #166534; margin: 0 0 10px;">📄 Download the official brochure for more details</p>
            <a href="${data.brochureUrl}" style="display: inline-block; padding: 12px 28px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Download ${data.carName} Brochure</a>
          </td>
        </tr>`
      : "";

    const discountSection = data.discount?.amount
      ? `
        <tr>
          <td style="padding: 12px 20px; background: #fffbeb; border-left: 4px solid #f59e0b;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
              <tr>
                <td style="color: #92400e; font-weight: 600;">🎁 ${data.discount.label || "Special Discount"}</td>
                <td style="text-align: right; color: #16a34a; font-weight: 700; font-size: 16px;">- ${formatCurrency(data.discount.amount)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px 20px; background: #14532d; border-radius: 0 0 12px 12px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color: white; font-weight: 700; font-size: 15px;">Your Final Price</td>
                <td style="text-align: right; color: white; font-weight: 700; font-size: 18px;">${formatCurrency(finalPrice)}</td>
              </tr>
            </table>
          </td>
        </tr>`
      : "";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: white;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">GRABYOURCAR</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0; font-size: 13px;">India's Smarter Way to Buy New Cars</p>
      </td>
    </tr>
    
    <!-- Greeting -->
    <tr>
      <td style="padding: 30px 30px 15px;">
        <p style="font-size: 16px; color: #1e293b; margin: 0;">Dear <strong>${data.clientName || "Customer"}</strong>,</p>
        <p style="font-size: 14px; color: #64748b; margin: 10px 0 0;">Thank you for your interest! Here's your personalized price quote:</p>
      </td>
    </tr>
    
    <!-- Car Card -->
    <tr>
      <td style="padding: 0 30px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 20px; border-left: 5px solid #22c55e;">
              <h2 style="margin: 0; font-size: 20px; color: #0f172a;">${data.carName.toUpperCase()}</h2>
              <p style="margin: 5px 0 0; font-size: 14px; color: #64748b;">
                ${data.variantName}${data.selectedColor ? ` • ${data.selectedColor}` : ""}${data.selectedCity ? ` • ${data.selectedCity}` : ""}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Price Breakup -->
    <tr>
      <td style="padding: 20px 30px;">
        <h3 style="font-size: 14px; color: #22c55e; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">On-Road Price Breakup</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          ${data.priceBreakup ? `
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 20px; color: #64748b;">Ex-Showroom</td>
            <td style="padding: 10px 20px; text-align: right; font-weight: 600;">${formatCurrency(data.priceBreakup.exShowroom)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 20px; color: #64748b;">RTO & Registration</td>
            <td style="padding: 10px 20px; text-align: right; font-weight: 600;">${formatCurrency(data.priceBreakup.rto)}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 20px; color: #64748b;">Insurance (1 Year)</td>
            <td style="padding: 10px 20px; text-align: right; font-weight: 600;">${formatCurrency(data.priceBreakup.insurance)}</td>
          </tr>
          ${data.priceBreakup.tcs > 0 ? `
          <tr>
            <td style="padding: 10px 20px; color: #64748b;">TCS</td>
            <td style="padding: 10px 20px; text-align: right; font-weight: 600;">${formatCurrency(data.priceBreakup.tcs)}</td>
          </tr>` : ""}
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 20px; color: #64748b;">Other Charges</td>
            <td style="padding: 10px 20px; text-align: right; font-weight: 600;">${formatCurrency(data.priceBreakup.fastag + data.priceBreakup.registration + data.priceBreakup.handling)}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 16px 20px; background: #22c55e; color: white; font-weight: 700; font-size: 15px;">On-Road Price</td>
            <td style="padding: 16px 20px; background: #22c55e; color: white; font-weight: 700; font-size: 18px; text-align: right;">${formatCurrency(data.onRoadPrice)}</td>
          </tr>
          ${discountSection}
        </table>
      </td>
    </tr>

    <!-- EMI Section -->
    <tr>
      <td style="padding: 0 30px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 25px; text-align: center; color: white;">
              <p style="margin: 0; font-size: 13px; opacity: 0.9;">Your Monthly EMI</p>
              <p style="margin: 8px 0; font-size: 36px; font-weight: 800; letter-spacing: -1px;">${formatCurrency(data.emi)}</p>
              <p style="margin: 0; font-size: 12px; opacity: 0.8;">for ${data.tenure} months @ ${data.interestRate}% p.a.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 20px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255,255,255,0.15); border-radius: 10px;">
                <tr>
                  <td style="padding: 12px; text-align: center; color: white; width: 33%; border-right: 1px solid rgba(255,255,255,0.2);">
                    <p style="margin: 0; font-size: 11px; opacity: 0.8;">Down Payment</p>
                    <p style="margin: 4px 0 0; font-weight: 700; font-size: 14px;">${formatCurrency(data.downPayment)}</p>
                  </td>
                  <td style="padding: 12px; text-align: center; color: white; width: 33%; border-right: 1px solid rgba(255,255,255,0.2);">
                    <p style="margin: 0; font-size: 11px; opacity: 0.8;">Loan Amount</p>
                    <p style="margin: 4px 0 0; font-weight: 700; font-size: 14px;">${formatCurrency(data.loanAmount)}</p>
                  </td>
                  <td style="padding: 12px; text-align: center; color: white; width: 33%;">
                    <p style="margin: 0; font-size: 11px; opacity: 0.8;">Total Interest</p>
                    <p style="margin: 4px 0 0; font-weight: 700; font-size: 14px;">${formatCurrency(data.totalInterest)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Brochure Download -->
    ${brochureSection}

    <!-- Partner Banks -->
    <tr>
      <td style="padding: 15px 30px; text-align: center;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">🏦 Partnered with SBI • HDFC • ICICI • Axis • Kotak • IDFC First</p>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding: 20px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center;">
              <a href="https://wa.me/919577200023?text=Hi%20Grabyourcar!%20I'm%20interested%20in%20${encodeURIComponent(data.carName)}.%20Please%20help%20me%20with%20the%20best%20deal." style="display: inline-block; padding: 14px 32px; background: #25d366; color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px;">💬 Chat on WhatsApp</a>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding-top: 12px;">
              <a href="tel:+919577200023" style="font-size: 14px; color: #22c55e; text-decoration: none; font-weight: 600;">📞 Call: +91 95772 00023</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Disclaimer -->
    <tr>
      <td style="padding: 15px 30px;">
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
          This is an indicative estimate. Actual EMI may vary based on bank policies, credit score, and prevailing interest rates. Quote valid for 7 days.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #0f172a; padding: 25px 30px; text-align: center;">
        <h3 style="color: #22c55e; margin: 0 0 5px; font-size: 16px;">GRABYOURCAR</h3>
        <p style="color: #94a3b8; margin: 0; font-size: 12px;">India's Smarter Way to Buy New Cars</p>
        <p style="color: #64748b; margin: 10px 0 0; font-size: 11px;">hello@grabyourcar.com | www.grabyourcar.com</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailResponse = await resend.emails.send({
      from: "Grabyourcar <quotes@grabyourcar.com>",
      to: [data.clientEmail],
      subject: `Your ${data.carName} Price Quote - Grabyourcar`,
      html,
    });

    console.log("Quote email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending quote:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
