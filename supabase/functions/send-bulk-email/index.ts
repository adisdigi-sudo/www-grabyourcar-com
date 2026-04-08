import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BulkEmailRequest {
  campaign_id: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
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
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { campaign_id, from_name, from_email }: BulkEmailRequest = await req.json();
    if (!campaign_id) throw new Error("campaign_id is required");

    // Fetch campaign
    const { data: campaign, error: campErr } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (campErr || !campaign) throw new Error("Campaign not found");

    // Build sender - support custom from addresses like anshdeep@grabyourcar.com
    const senderName = from_name || campaign.from_name || "GrabYourCar";
    const senderEmail = from_email || campaign.from_email || "noreply@grabyourcar.com";
    const fromLine = `${senderName} <${senderEmail}>`;

    // Get HTML content - from campaign directly or from template
    let htmlContent = campaign.html_content;
    let subject = campaign.subject;

    if (!htmlContent && campaign.template_id) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", campaign.template_id)
        .single();
      if (template) {
        htmlContent = template.html_content;
        if (!subject) subject = template.subject;
      }
    }

    if (!htmlContent) throw new Error("No email content found for campaign");

    // Mark campaign as sending
    await supabase.from("email_campaigns").update({
      status: "sending",
      started_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    // Fetch subscribers - filter by tags if segment_filter has tags
    let query = supabase
      .from("email_subscribers")
      .select("*")
      .eq("subscribed", true);

    const segmentFilter = campaign.segment_filter as Record<string, unknown> | null;
    if (segmentFilter?.tags && Array.isArray(segmentFilter.tags) && segmentFilter.tags.length > 0) {
      query = query.overlaps("tags", segmentFilter.tags);
    }

    const { data: subscribers, error: subErr } = await query;
    if (subErr) throw new Error(`Failed to fetch subscribers: ${subErr.message}`);
    if (!subscribers || subscribers.length === 0) {
      await supabase.from("email_campaigns").update({
        status: "completed",
        total_recipients: 0,
        completed_at: new Date().toISOString(),
      }).eq("id", campaign_id);
      return new Response(
        JSON.stringify({ success: true, message: "No subscribers found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update total recipients
    await supabase.from("email_campaigns").update({
      total_recipients: subscribers.length,
    }).eq("id", campaign_id);

    console.log(`Sending campaign "${campaign.name}" from ${fromLine} to ${subscribers.length} subscribers`);

    let sentCount = 0;
    let failedCount = 0;

    // Resend batch API supports up to 100 emails per call
    const BATCH_SIZE = 100;
    const batches = [];

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      batches.push(subscribers.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const emailPayloads = batch.map((sub) => {
        const variables: Record<string, string> = {
          customer_name: sub.name || "Valued Customer",
          name: sub.name || "Valued Customer",
          email: sub.email,
          phone: sub.phone || "",
          company: sub.company || "",
        };

        return {
          from: fromLine,
          to: [sub.email],
          subject: replaceVariables(subject, variables),
          html: replaceVariables(htmlContent, variables),
        };
      });

      try {
        const batchResult = await resend.batch.send(emailPayloads);
        console.log(`Batch sent: ${emailPayloads.length} emails`, batchResult);

        const logEntries = batch.map((sub, idx) => {
          const batchData = batchResult.data as { data?: { id: string }[] } | null;
          const emailId = batchData?.data?.[idx]?.id;
          const hasError = !emailId;

          if (hasError) failedCount++;
          else sentCount++;

          return {
            campaign_id,
            recipient_email: sub.email,
            recipient_name: sub.name,
            subject: replaceVariables(subject, { customer_name: sub.name || "Valued Customer", name: sub.name || "Valued Customer" }),
            status: hasError ? "failed" : "sent",
            resend_id: emailId || null,
            sent_at: hasError ? null : new Date().toISOString(),
            metadata: { campaign_name: campaign.name, from: fromLine },
          };
        });

        await supabase.from("email_logs").insert(logEntries);

        await supabase.from("email_campaigns").update({
          sent_count: sentCount,
          failed_count: failedCount,
        }).eq("id", campaign_id);

      } catch (batchError: any) {
        console.error("Batch send error:", batchError);
        failedCount += batch.length;

        const failLogs = batch.map((sub) => ({
          campaign_id,
          recipient_email: sub.email,
          recipient_name: sub.name,
          subject: replaceVariables(subject, { customer_name: sub.name || "Valued Customer", name: sub.name || "Valued Customer" }),
          status: "failed",
          error_message: batchError.message,
          metadata: { campaign_name: campaign.name, from: fromLine },
        }));
        await supabase.from("email_logs").insert(failLogs);
      }

      if (batches.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Mark campaign as completed
    await supabase.from("email_campaigns").update({
      status: "completed",
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    console.log(`Campaign completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Campaign sent to ${sentCount} recipients`,
        sent: sentCount,
        failed: failedCount,
        total: subscribers.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-bulk-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
