import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_DOMAIN = "notify.grabyourcar.com";

interface DirectEmailRequest {
  to: string;
  subject: string;
  body: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  in_reply_to?: string;
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) throw new Error("Invalid recipient email");

    const senderName = from_name || "GrabYourCar";
    // Always use the verified sender domain
    const senderLocalPart = (from_email || "noreply@grabyourcar.com").split("@")[0];
    const senderEmail = `${senderLocalPart}@${SENDER_DOMAIN}`;
    const fromLine = `${senderName} <${senderEmail}>`;

    // Reply-to can be the original domain so replies go to actual mailbox
    const replyToAddr = reply_to || (from_email || "noreply@grabyourcar.com");

    // Strip HTML for plain text version
    const plainText = body
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const emailHeaders: Record<string, string> = {};
    if (in_reply_to) {
      emailHeaders["In-Reply-To"] = in_reply_to;
      emailHeaders["References"] = in_reply_to;
    }

    console.log(`📤 Sending email from: ${fromLine} to: ${to} subject: ${subject}`);

    const result = await resend.emails.send({
      from: fromLine,
      to: [to],
      subject,
      html: body,
      text: plainText,
      reply_to: replyToAddr,
      headers: Object.keys(emailHeaders).length > 0 ? emailHeaders : undefined,
    });

    // Check for Resend API errors
    const resendError = (result as any).error;
    const resendId = result.data?.id;
    const emailStatus = resendId ? "sent" : "failed";
    const errorMsg = resendError ? (resendError.message || JSON.stringify(resendError)) : null;

    if (resendError) {
      console.error(`❌ Resend API error:`, JSON.stringify(resendError));
    } else {
      console.log(`✅ Email sent successfully. Resend ID: ${resendId}`);
    }

    // Log to email_logs table
    await supabase.from("email_logs").insert({
      campaign_id: null,
      recipient_email: to,
      subject,
      status: emailStatus,
      resend_id: resendId || null,
      sent_at: new Date().toISOString(),
      error_message: errorMsg,
      metadata: { type: "direct", from: fromLine, reply_to: replyToAddr },
    });

    if (resendError) {
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendId, message: `Email sent to ${to}` }),
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
