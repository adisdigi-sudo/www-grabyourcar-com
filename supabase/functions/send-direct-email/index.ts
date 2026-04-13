import { createClient } from 'npm:@supabase/supabase-js@2'

const SITE_NAME = "GrabYourCar";
const SENDER_DOMAIN = "notify.grabyourcar.com";
const FROM_DOMAIN = "grabyourcar.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DirectEmailRequest {
  to: string;
  subject: string;
  body: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  in_reply_to?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody: DirectEmailRequest = await req.json();
    const to = (rawBody.to || "").trim();
    const subject = (rawBody.subject || "").trim();
    const body = rawBody.body || "";
    const from_name = rawBody.from_name;
    const from_email = rawBody.from_email;
    const reply_to = rawBody.reply_to;
    const in_reply_to = rawBody.in_reply_to;

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "to, subject, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract email from "Name <email>" format if present
    const emailMatch = to.match(/<([^>]+)>/) || [null, to];
    const recipientEmail = (emailMatch[1] || to).trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      console.error("Invalid email received:", JSON.stringify(to));
      return new Response(
        JSON.stringify({ error: "Invalid recipient email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderName = from_name || SITE_NAME;
    const senderLocalPart = (from_email || "noreply@grabyourcar.com").split("@")[0];
    const replyToAddr = reply_to || (from_email || `noreply@${FROM_DOMAIN}`);

    // Strip HTML for plain text version
    const plainText = body
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const messageId = crypto.randomUUID();

    // Build extra headers for threading
    const extraHeaders: Record<string, string> = {};
    if (in_reply_to) {
      extraHeaders["In-Reply-To"] = in_reply_to;
      extraHeaders["References"] = in_reply_to;
    }

    // Get or create unsubscribe token for this recipient
    const normalizedEmail = recipientEmail.toLowerCase();
    let unsubscribeToken: string;

    const { data: existingToken } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token, used_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingToken && !existingToken.used_at) {
      unsubscribeToken = existingToken.token;
    } else if (!existingToken) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      unsubscribeToken = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      await supabase
        .from("email_unsubscribe_tokens")
        .upsert({ token: unsubscribeToken, email: normalizedEmail }, { onConflict: "email", ignoreDuplicates: true });
      // Re-read in case of race
      const { data: storedToken } = await supabase
        .from("email_unsubscribe_tokens")
        .select("token")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (storedToken) unsubscribeToken = storedToken.token;
    } else {
      unsubscribeToken = existingToken.token;
    }

    // Log pending status
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "direct_email",
      recipient_email: to,
      status: "pending",
    });

    // Enqueue via Lovable's email queue (same system as transactional emails)
    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to,
        from: `${senderName} <${senderLocalPart}@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html: body,
        text: plainText,
        reply_to: replyToAddr,
        extra_headers: Object.keys(extraHeaders).length > 0 ? extraHeaders : undefined,
        purpose: "transactional",
        label: "direct_email",
        idempotency_key: messageId,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("❌ Failed to enqueue direct email:", enqueueError);
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "direct_email",
        recipient_email: to,
        status: "failed",
        error_message: "Failed to enqueue email",
      });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to queue email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also log to legacy email_logs for the inbox dashboard
    await supabase.from("email_logs").insert({
      campaign_id: null,
      recipient_email: to,
      subject,
      status: "pending",
      resend_id: messageId,
      sent_at: new Date().toISOString(),
      metadata: {
        type: "direct",
        from: `${senderName} <${senderLocalPart}@${FROM_DOMAIN}>`,
        reply_to: replyToAddr,
        body_html: body,
      },
    });

    console.log(`✅ Direct email queued for ${to}: ${subject}`);

    return new Response(
      JSON.stringify({ success: true, id: messageId, message: `Email queued for ${to}` }),
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
