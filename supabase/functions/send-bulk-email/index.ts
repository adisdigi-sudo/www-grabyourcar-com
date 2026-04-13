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

// ─── INBOX DELIVERY OPTIMIZATION CONFIG ───
// Strict rate limits to protect domain reputation & maximize inbox placement
const INBOX_CONFIG = {
  // Warm-up phase: first 14 days of sending, use very conservative limits
  WARMUP_DAILY_LIMIT: 50,
  WARMUP_BATCH_SIZE: 10,
  WARMUP_BATCH_DELAY_MS: 5000, // 5s between batches during warmup

  // Normal phase: after warmup
  NORMAL_DAILY_LIMIT: 500,
  NORMAL_BATCH_SIZE: 25,
  NORMAL_BATCH_DELAY_MS: 2000, // 2s between batches

  // Per-email delay within a batch (prevents burst)
  INTER_EMAIL_DELAY_MS: 200,

  // Maximum emails per hour (ESP best practice)
  MAX_PER_HOUR: 200,
};

const replaceVariables = (content: string, variables: Record<string, string>): string => {
  let result = content;
  Object.entries(variables).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(pattern, value);
  });
  return result;
};

// Strip HTML tags to create plain text version (improves inbox placement)
const htmlToPlainText = (html: string): string => {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

    const { campaign_id, from_name, from_email, reply_to }: BulkEmailRequest = await req.json();
    if (!campaign_id) throw new Error("campaign_id is required");

    // ─── FETCH CAMPAIGN ───
    const { data: campaign, error: campErr } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (campErr || !campaign) throw new Error("Campaign not found");

    // ─── DAILY SEND LIMIT CHECK ───
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todaySentCount } = await supabase
      .from("email_logs")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", today.toISOString());

    const dailySent = todaySentCount || 0;

    // Check if we're in warmup phase (first 14 days since first ever campaign)
    const { data: firstCampaign } = await supabase
      .from("email_campaigns")
      .select("created_at")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    const daysSinceFirst = firstCampaign
      ? Math.floor((Date.now() - new Date(firstCampaign.created_at).getTime()) / (86400000))
      : 0;
    const isWarmup = daysSinceFirst < 14;

    const dailyLimit = isWarmup ? INBOX_CONFIG.WARMUP_DAILY_LIMIT : INBOX_CONFIG.NORMAL_DAILY_LIMIT;
    const batchSize = campaign.batch_size || (isWarmup ? INBOX_CONFIG.WARMUP_BATCH_SIZE : INBOX_CONFIG.NORMAL_BATCH_SIZE);
    const batchDelay = (campaign.batch_delay_seconds ? campaign.batch_delay_seconds * 1000 : null) 
      || (isWarmup ? INBOX_CONFIG.WARMUP_BATCH_DELAY_MS : INBOX_CONFIG.NORMAL_BATCH_DELAY_MS);

    const remainingToday = Math.max(0, dailyLimit - dailySent);
    if (remainingToday === 0) {
      await supabase.from("email_campaigns").update({
        status: "rate_limited",
      }).eq("id", campaign_id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Daily send limit reached (${dailyLimit}/day). ${isWarmup ? 'Domain is in warmup phase (14 days). ' : ''}Try again tomorrow.`,
          daily_sent: dailySent,
          daily_limit: dailyLimit,
          is_warmup: isWarmup,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── SENDER CONFIG ───
    const senderName = from_name || campaign.from_name || "GrabYourCar";
    const senderEmail = from_email || campaign.from_email || "noreply@grabyourcar.com";
    const fromLine = `${senderName} <${senderEmail}>`;

    // ─── GET EMAIL CONTENT ───
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

    // ─── LOAD DYNAMIC CONTENT RULES ───
    const { data: dynamicRules } = await supabase
      .from("dynamic_content_rules")
      .select("*")
      .eq("is_active", true);

    // ─── CHECK SUPPRESSED EMAILS ───
    const { data: suppressedEmails } = await supabase
      .from("suppressed_emails")
      .select("email");
    const suppressedSet = new Set((suppressedEmails || []).map(s => s.email.toLowerCase()));

    await supabase.from("email_campaigns").update({
      status: "sending",
      started_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    // ─── FETCH SUBSCRIBERS (with suppression filter) ───
    let query = supabase.from("email_subscribers").select("*").eq("subscribed", true);
    const segmentFilter = campaign.segment_filter as Record<string, unknown> | null;
    if (segmentFilter?.tags && Array.isArray(segmentFilter.tags) && segmentFilter.tags.length > 0) {
      query = query.overlaps("tags", segmentFilter.tags);
    }

    const { data: allSubscribers, error: subErr } = await query;
    if (subErr) throw new Error(`Failed to fetch subscribers: ${subErr.message}`);

    // Filter out suppressed emails
    const subscribers = (allSubscribers || []).filter(
      s => !suppressedSet.has(s.email.toLowerCase())
    );

    if (subscribers.length === 0) {
      await supabase.from("email_campaigns").update({
        status: "completed", total_recipients: 0, completed_at: new Date().toISOString(),
      }).eq("id", campaign_id);
      return new Response(
        JSON.stringify({ success: true, message: "No eligible subscribers found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply daily limit - only send up to remaining quota
    const eligibleSubscribers = subscribers.slice(0, remainingToday);
    const skippedCount = subscribers.length - eligibleSubscribers.length;

    await supabase.from("email_campaigns").update({ 
      total_recipients: eligibleSubscribers.length 
    }).eq("id", campaign_id);

    // ─── UNSUBSCRIBE TOKENS ───
    const subIds = eligibleSubscribers.map(s => s.id);
    const { data: existingTokens } = await supabase
      .from("email_unsubscribe_tokens")
      .select("subscriber_id, token")
      .in("subscriber_id", subIds);

    const tokenMap = new Map((existingTokens || []).map(t => [t.subscriber_id, t.token]));
    const missingIds = subIds.filter(id => !tokenMap.has(id));

    if (missingIds.length > 0) {
      const newTokens = missingIds.map(id => ({ subscriber_id: id }));
      const { data: inserted } = await supabase.from("email_unsubscribe_tokens")
        .insert(newTokens).select("subscriber_id, token");
      (inserted || []).forEach(t => tokenMap.set(t.subscriber_id, t.token));
    }

    console.log(`📧 Campaign "${campaign.name}" | From: ${fromLine} | To: ${eligibleSubscribers.length} subscribers | Warmup: ${isWarmup} | Batch: ${batchSize} | Delay: ${batchDelay}ms | Skipped (limit): ${skippedCount}`);

    let sentCount = 0;
    let failedCount = 0;

    // ─── CREATE BATCHES ───
    const batches = [];
    for (let i = 0; i < eligibleSubscribers.length; i += batchSize) {
      batches.push(eligibleSubscribers.slice(i, i + batchSize));
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];

      const emailPayloads = batch.map((sub) => {
        const unsubToken = tokenMap.get(sub.id) || '';
        const unsubUrl = `${supabaseUrl}/functions/v1/email-unsubscribe?token=${unsubToken}`;

        const variables: Record<string, string> = {
          customer_name: sub.name || "Valued Customer",
          name: sub.name || "Valued Customer",
          email: sub.email,
          phone: sub.phone || "",
          company: sub.company || "",
          unsubscribe_url: unsubUrl,
        };

        let personalizedHtml = replaceVariables(htmlContent, variables);

        // Apply dynamic content rules
        if (dynamicRules && dynamicRules.length > 0) {
          for (const rule of dynamicRules) {
            const placeholder = `{{dynamic:${rule.name}}}`;
            if (personalizedHtml.includes(placeholder)) {
              const conditions = typeof rule.conditions === "string" ? JSON.parse(rule.conditions) : rule.conditions;
              let matched = false;

              if (Array.isArray(conditions)) {
                matched = conditions.every((c: any) => {
                  const subValue = (sub as any)[c.field];
                  if (c.operator === "equals") return subValue === c.value;
                  if (c.operator === "contains") return String(subValue || "").includes(c.value);
                  if (c.operator === "in" && Array.isArray(c.value)) return c.value.includes(subValue);
                  if (c.operator === "has_tag") return Array.isArray(sub.tags) && sub.tags.includes(c.value);
                  return false;
                });
              }

              personalizedHtml = personalizedHtml.replace(
                placeholder,
                matched ? (rule.content_html || '') : (rule.fallback_html || '')
              );
            }
          }
        }

        // Add branded unsubscribe footer
        personalizedHtml += `<div style="text-align:center;margin-top:30px;padding:20px;border-top:1px solid #eee;font-size:12px;color:#999"><a href="${unsubUrl}" style="color:#999;text-decoration:underline">Unsubscribe</a> from these emails</div>`;

        const personalizedSubject = replaceVariables(subject, variables);

        const payload: Record<string, unknown> = {
          from: fromLine,
          to: [sub.email],
          subject: personalizedSubject,
          html: personalizedHtml,
          text: htmlToPlainText(personalizedHtml), // Plain text version = better inbox placement
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            "Precedence": "bulk",
            "X-Campaign-Id": campaign_id,
          },
        };
        if (reply_to) payload.reply_to = reply_to;
        return payload;
      });

      try {
        const batchResult = await resend.batch.send(emailPayloads);

        const logEntries = batch.map((sub, idx) => {
          const batchData = batchResult.data as { data?: { id: string }[] } | null;
          const emailId = batchData?.data?.[idx]?.id;
          const hasError = !emailId;
          if (hasError) failedCount++; else sentCount++;

          return {
            campaign_id,
            recipient_email: sub.email,
            recipient_name: sub.name,
            subject: replaceVariables(subject, { customer_name: sub.name || "Valued Customer", name: sub.name || "Valued Customer" }),
            status: hasError ? "failed" : "sent",
            resend_id: emailId || null,
            sent_at: hasError ? null : new Date().toISOString(),
            metadata: { campaign_name: campaign.name, from: fromLine, batch: batchIdx + 1 },
          };
        });

        await supabase.from("email_logs").insert(logEntries);
        await supabase.from("email_campaigns").update({ sent_count: sentCount, failed_count: failedCount }).eq("id", campaign_id);

      } catch (batchError: any) {
        console.error("Batch send error:", batchError);
        failedCount += batch.length;
        const failLogs = batch.map((sub) => ({
          campaign_id, recipient_email: sub.email, recipient_name: sub.name,
          subject: replaceVariables(subject, { customer_name: sub.name || "Valued Customer" }),
          status: "failed", error_message: batchError.message,
          metadata: { campaign_name: campaign.name, from: fromLine },
        }));
        await supabase.from("email_logs").insert(failLogs);
      }

      // ─── RATE LIMITING DELAYS ───
      if (batchIdx < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, batchDelay));
      }
    }

    // ─── FINAL STATUS ───
    const finalStatus = skippedCount > 0 ? "partially_completed" : "completed";
    await supabase.from("email_campaigns").update({
      status: finalStatus, 
      sent_count: sentCount, 
      failed_count: failedCount,
      completed_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    console.log(`✅ Campaign done: ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped (daily limit)`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Campaign sent to ${sentCount} recipients`, 
        sent: sentCount, 
        failed: failedCount, 
        skipped: skippedCount,
        total: eligibleSubscribers.length,
        daily_remaining: remainingToday - sentCount,
        is_warmup: isWarmup,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-bulk-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
