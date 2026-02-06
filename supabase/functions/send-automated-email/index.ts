import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  template_id?: string;
  template_name?: string;
  recipient_email: string;
  recipient_name?: string;
  variables?: Record<string, string>;
  sequence_id?: string;
}

const replaceVariables = (content: string, variables: Record<string, string>): string => {
  let result = content;
  Object.entries(variables).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(pattern, value);
  });
  return result;
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

    const body: EmailRequest = await req.json();
    
    // Get template
    let template;
    if (body.template_id) {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", body.template_id)
        .eq("is_active", true)
        .single();
      if (error) throw new Error(`Template not found: ${error.message}`);
      template = data;
    } else if (body.template_name) {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("name", body.template_name)
        .eq("is_active", true)
        .single();
      if (error) throw new Error(`Template not found: ${error.message}`);
      template = data;
    } else {
      throw new Error("Either template_id or template_name is required");
    }

    // Check subscriber preferences
    const { data: subscriber } = await supabase
      .from("email_subscribers")
      .select("*")
      .eq("email", body.recipient_email)
      .single();

    if (subscriber && !subscriber.subscribed) {
      console.log(`Recipient ${body.recipient_email} is unsubscribed`);
      return new Response(
        JSON.stringify({ success: false, message: "Recipient unsubscribed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Replace variables
    const variables = {
      customer_name: body.recipient_name || "Valued Customer",
      ...body.variables,
    };
    
    const subject = replaceVariables(template.subject, variables);
    const htmlContent = replaceVariables(template.html_content, variables);

    // Create log entry
    const { data: logEntry, error: logError } = await supabase
      .from("email_logs")
      .insert({
        template_id: template.id,
        sequence_id: body.sequence_id,
        recipient_email: body.recipient_email,
        recipient_name: body.recipient_name,
        subject,
        status: "sending",
        metadata: { variables },
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to create log entry:", logError);
    }

    // Send email
    const emailResult = await resend.emails.send({
      from: "GrabYourCar <noreply@grabyourcar.com>",
      to: [body.recipient_email],
      subject,
      html: htmlContent,
    });

    // Update log with result
    if (logEntry) {
      await supabase
        .from("email_logs")
        .update({
          status: emailResult.data?.id ? "sent" : "failed",
          resend_id: emailResult.data?.id,
          sent_at: new Date().toISOString(),
          error_message: emailResult.error?.message,
        })
        .eq("id", logEntry.id);
    }

    console.log("Email sent:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        email_id: emailResult.data?.id,
        log_id: logEntry?.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-automated-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
