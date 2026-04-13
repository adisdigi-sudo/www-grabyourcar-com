import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const contentType = req.headers.get("content-type") || "";

    let emailData: {
      from_email: string;
      from_name?: string;
      to_email: string;
      subject?: string;
      body_text?: string;
      body_html?: string;
      cc?: string;
      bcc?: string;
      reply_to?: string;
      message_id?: string;
      in_reply_to?: string;
      headers?: Record<string, string>;
      attachments?: any[];
    };

    if (contentType.includes("multipart/form-data")) {
      // Handle multipart form data (common for email forwarding services)
      const formData = await req.formData();
      emailData = {
        from_email: formData.get("from")?.toString() || formData.get("sender")?.toString() || "unknown",
        from_name: formData.get("from_name")?.toString() || undefined,
        to_email: formData.get("to")?.toString() || formData.get("recipient")?.toString() || "unknown",
        subject: formData.get("subject")?.toString() || undefined,
        body_text: formData.get("text")?.toString() || formData.get("body-plain")?.toString() || undefined,
        body_html: formData.get("html")?.toString() || formData.get("body-html")?.toString() || undefined,
        cc: formData.get("cc")?.toString() || undefined,
        reply_to: formData.get("reply_to")?.toString() || undefined,
        message_id: formData.get("Message-Id")?.toString() || formData.get("message-id")?.toString() || undefined,
        in_reply_to: formData.get("In-Reply-To")?.toString() || undefined,
      };
    } else {
      // Handle JSON payload
      const body = await req.json();
      
      // Support multiple formats: direct JSON, Resend inbound, generic webhook
      emailData = {
        from_email: body.from_email || body.from || body.sender || body.data?.from || "unknown",
        from_name: body.from_name || body.data?.from_name || undefined,
        to_email: body.to_email || body.to || body.recipient || body.data?.to || "unknown",
        subject: body.subject || body.data?.subject || undefined,
        body_text: body.body_text || body.text || body.body || body.data?.text || undefined,
        body_html: body.body_html || body.html || body.data?.html || undefined,
        cc: body.cc || body.data?.cc || undefined,
        bcc: body.bcc || body.data?.bcc || undefined,
        reply_to: body.reply_to || body.data?.reply_to || undefined,
        message_id: body.message_id || body.data?.message_id || undefined,
        in_reply_to: body.in_reply_to || body.data?.in_reply_to || undefined,
        headers: body.headers || body.data?.headers || undefined,
        attachments: body.attachments || body.data?.attachments || undefined,
      };
    }

    // Extract name from "Name <email>" format
    if (!emailData.from_name && emailData.from_email.includes("<")) {
      emailData.from_name = emailData.from_email.split("<")[0].trim().replace(/"/g, "");
      emailData.from_email = emailData.from_email.match(/<([^>]+)>/)?.[1] || emailData.from_email;
    }

    // Similarly clean to_email
    if (emailData.to_email.includes("<")) {
      emailData.to_email = emailData.to_email.match(/<([^>]+)>/)?.[1] || emailData.to_email;
    }

    // Handle array format for to
    if (Array.isArray(emailData.to_email)) {
      emailData.to_email = (emailData.to_email as string[])[0];
    }

    const { error } = await supabase.from("received_emails").insert({
      from_email: emailData.from_email,
      from_name: emailData.from_name,
      to_email: emailData.to_email,
      subject: emailData.subject || "(No Subject)",
      body_text: emailData.body_text,
      body_html: emailData.body_html,
      cc: emailData.cc,
      bcc: emailData.bcc,
      reply_to: emailData.reply_to,
      message_id: emailData.message_id,
      in_reply_to: emailData.in_reply_to,
      headers: emailData.headers,
      attachments: emailData.attachments,
      folder: "inbox",
      is_read: false,
      received_at: new Date().toISOString(),
    });

    if (error) {
      console.error("DB insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📨 Received email from ${emailData.from_email} to ${emailData.to_email}: ${emailData.subject}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Inbound email error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
