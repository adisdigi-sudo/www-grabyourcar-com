import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DirectEmailRequest {
  to: string;
  subject: string;
  body: string; // HTML body
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  in_reply_to?: string; // For threading
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { to, subject, body, from_name, from_email, reply_to, in_reply_to }: DirectEmailRequest = await req.json();

    if (!to || !subject || !body) {
      throw new Error("to, subject, and body are required");
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) throw new Error("Invalid recipient email");

    const senderName = from_name || "GrabYourCar";
    const senderEmail = from_email || "noreply@grabyourcar.com";
    const fromLine = `${senderName} <${senderEmail}>`;

    // Strip HTML for plain text version
    const plainText = body
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const headers: Record<string, string> = {};
    if (in_reply_to) {
      headers["In-Reply-To"] = in_reply_to;
      headers["References"] = in_reply_to;
    }

    const result = await resend.emails.send({
      from: fromLine,
      to: [to],
      subject,
      html: body,
      text: plainText,
      reply_to: reply_to || senderEmail,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    // Log to email_logs table
    await supabase.from("email_logs").insert({
      campaign_id: null,
      recipient_email: to,
      subject,
      status: result.data?.id ? "sent" : "failed",
      resend_id: result.data?.id || null,
      sent_at: new Date().toISOString(),
      metadata: { type: "direct", from: fromLine, reply_to: reply_to || senderEmail },
    });

    console.log(`📧 Direct email sent to ${to}: ${subject}`);

    return new Response(
      JSON.stringify({ success: true, id: result.data?.id, message: `Email sent to ${to}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-direct-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
