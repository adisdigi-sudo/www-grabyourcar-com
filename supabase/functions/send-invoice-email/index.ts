import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) throw new Error("invoice_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: inv, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (error || !inv) throw new Error("Invoice not found");
    if (!inv.client_email) throw new Error("No client email");

    const items = Array.isArray(inv.items) ? inv.items : [];
    const itemsHtml = items.map((i: any) =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.description || 'Service'}</td>
       <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity || 1}</td>
       <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${Math.round(i.rate || i.amount || 0).toLocaleString('en-IN')}</td>
       <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${Math.round(i.amount || 0).toLocaleString('en-IN')}</td></tr>`
    ).join('');

    const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
      <div style="background:#DC2626;padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">GRABYOURCAR</h1>
        <p style="color:#fca5a5;margin:4px 0 0;font-size:12px">Tax Invoice</p>
      </div>
      <div style="padding:24px">
        <p style="color:#333">Dear <strong>${inv.client_name}</strong>,</p>
        <p style="color:#666">Thank you for your payment! Here's your invoice:</p>
        
        <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
          <table style="width:100%;font-size:14px">
            <tr><td style="color:#666">Invoice #</td><td style="text-align:right;font-weight:bold">${inv.invoice_number}</td></tr>
            <tr><td style="color:#666">Date</td><td style="text-align:right">${inv.invoice_date}</td></tr>
            <tr><td style="color:#666">Vertical</td><td style="text-align:right">${inv.vertical_name || '—'}</td></tr>
          </table>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="padding:8px;text-align:left">Description</th>
              <th style="padding:8px;text-align:center">Qty</th>
              <th style="padding:8px;text-align:right">Rate</th>
              <th style="padding:8px;text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div style="text-align:right;margin-top:16px">
          <div style="background:#DC2626;color:#fff;display:inline-block;padding:12px 24px;border-radius:8px;font-size:18px;font-weight:bold">
            Total Paid: ₹${Math.round(inv.total_amount || 0).toLocaleString('en-IN')}
          </div>
        </div>

        <p style="color:#666;font-size:12px;margin-top:24px;text-align:center">
          This is an auto-generated invoice. For queries, contact support@grabyourcar.com
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#94a3b8">
        GrabYourCar Pvt. Ltd. | www.grabyourcar.com
      </div>
    </div>`;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "GrabYourCar <invoices@grabyourcar.com>",
        to: [inv.client_email],
        subject: `Invoice ${inv.invoice_number} - Payment Received | GrabYourCar`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailRes.json();

    return new Response(JSON.stringify({ success: true, email_result: emailResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
