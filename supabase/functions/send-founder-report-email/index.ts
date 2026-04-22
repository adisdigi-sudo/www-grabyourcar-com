import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const body = await req.json();
    const {
      to,             // string | string[]
      subject,
      summary,
      pdfBase64,
      pdfFileName,
      csvBase64,
      csvFileName,
      // legacy fields kept for backward compat
      fileName,
    } = body || {};

    const recipients: string[] = Array.isArray(to)
      ? to.filter((e) => typeof e === "string" && /.+@.+\..+/.test(e))
      : (typeof to === "string" && /.+@.+\..+/.test(to) ? [to] : []);

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No valid recipient email(s) provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2 style="color:#0f172a;margin:0 0 8px">Founder Performance Report</h2>
        <p style="color:#475569;line-height:1.5">${
          summary || "Your latest GrabYourCar founder report is attached."
        }</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">— GrabYourCar Founder Cockpit</p>
      </div>
    `;

    const attachments: Array<{ filename: string; content: string }> = [];
    if (pdfBase64) attachments.push({ filename: pdfFileName || fileName || "founder-report.pdf", content: pdfBase64 });
    if (csvBase64) attachments.push({ filename: csvFileName || "founder-report.csv", content: csvBase64 });

    const payload: any = {
      from: "GrabYourCar Reports <reports@notify.grabyourcar.com>",
      to: recipients,
      subject: subject || "Your Founder Performance Report",
      html,
    };
    if (attachments.length) payload.attachments = attachments;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[send-founder-report-email] Resend error:", data);
      return new Response(JSON.stringify({ error: data.message || "Send failed" }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id, recipients }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-founder-report-email] error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
