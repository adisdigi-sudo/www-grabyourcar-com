import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Queue Processor — Updated for Finbite v2 API
 * Processes wa_message_queue entries and sends via Finbite v2.
 * Also processes scheduled wa_message_logs entries.
 */

const FINBITE_V2_URL = "https://app.finbite.in/api/v2/whatsapp-business/messages";
const FINBITE_V1_URL = "https://wbiztool.com/api/v1/send_msg/";
const META_GRAPH_BASE = "https://graph.facebook.com/v21.0";

function normalizePhone(phone: string): { full: string; short: string; valid: boolean } {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  let short = clean;
  if (clean.startsWith("91") && clean.length === 12) short = clean.slice(2);
  return { full: `91${short}`, short, valid: /^[6-9]\d{9}$/.test(short) };
}

async function sendViaMeta(
  token: string,
  phoneNumberId: string,
  to: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; provider_message_id?: string; error?: string }> {
  const url = `${META_GRAPH_BASE}/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      ...payload,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (response.ok && result?.messages?.[0]?.id) {
    return { success: true, provider_message_id: result.messages[0].id };
  }

  return {
    success: false,
    error: result?.error?.message || JSON.stringify(result),
  };
}

async function sendMessage(
  apiKey: string,
  phoneId: string,
  clientId: string | undefined,
  v1ApiKey: string | undefined,
  phone: { full: string; short: string },
  content: string,
  templateName?: string,
  variables?: Record<string, string>,
  mediaUrl?: string,
  mediaType?: string,
  whatsappToken?: string,
  whatsappPhoneNumberId?: string
): Promise<{ success: boolean; provider_message_id?: string; error?: string }> {
  // Try v2 first
  let body: Record<string, unknown>;

  if (templateName) {
    const components: Array<Record<string, unknown>> = [];
    if (variables && Object.keys(variables).length > 0) {
      components.push({
        type: "body",
        parameters: Object.values(variables).map(v => ({ type: "text", text: v })),
      });
    }
    body = {
      messaging_product: "whatsapp",
      to: phone.full,
      type: "template",
      template: { name: templateName, language: { code: "en" }, ...(components.length > 0 ? { components } : {}) },
    };
  } else if (mediaUrl && mediaType) {
    body = {
      messaging_product: "whatsapp",
      to: phone.full,
      type: mediaType,
      [mediaType]: { link: mediaUrl, caption: content || "" },
    };
  } else {
    body = {
      messaging_product: "whatsapp",
      to: phone.full,
      type: "text",
      text: { body: content },
    };
  }

  // Prefer direct Meta API when configured (ensures media appears as true attachment, not clickable link text)
  if (whatsappToken && whatsappPhoneNumberId) {
    if (templateName) {
      const components: Array<Record<string, unknown>> = [];
      if (variables && Object.keys(variables).length > 0) {
        components.push({
          type: "body",
          parameters: Object.values(variables).map((v) => ({ type: "text", text: v })),
        });
      }

      const metaTemplate = await sendViaMeta(whatsappToken, whatsappPhoneNumberId, phone.full, {
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
          ...(components.length > 0 ? { components } : {}),
        },
      });
      if (metaTemplate.success) return metaTemplate;
    } else if (mediaUrl && mediaType) {
      const normalizedMediaType = ["image", "video", "audio", "document"].includes(mediaType)
        ? mediaType
        : "document";

      const metaMedia = await sendViaMeta(whatsappToken, whatsappPhoneNumberId, phone.full, {
        type: normalizedMediaType,
        [normalizedMediaType]: {
          link: mediaUrl,
          ...(normalizedMediaType === "image" || normalizedMediaType === "document" ? { caption: content || "" } : {}),
        },
      });
      if (metaMedia.success) return metaMedia;
    } else {
      const metaText = await sendViaMeta(whatsappToken, whatsappPhoneNumberId, phone.full, {
        type: "text",
        text: { preview_url: false, body: content },
      });
      if (metaText.success) return metaText;
    }
  }

  const v2Resp = await fetch(FINBITE_V2_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "X-Phone-ID": phoneId,
    },
    body: JSON.stringify(body),
  });

  const ct = v2Resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const result = await v2Resp.json();
    if (v2Resp.ok && !result.error) {
      return { success: true, provider_message_id: result.messages?.[0]?.id || null };
    }
    // Don't fallback for template messages - they only work on v2
    if (templateName) return { success: false, error: JSON.stringify(result) };
  } else {
    const text = await v2Resp.text();
    if (templateName) return { success: false, error: `Non-JSON (${v2Resp.status})` };
  }

  // Fallback to v1 for text messages
  if (!templateName && clientId && v1ApiKey) {
    const formData = new URLSearchParams();
    formData.append("client_id", clientId);
    formData.append("api_key", v1ApiKey);
    formData.append("whatsapp_client", phoneId);
    formData.append("phone", phone.short);
    formData.append("country_code", "91");
    formData.append("msg", content);
    formData.append("msg_type", mediaUrl ? "1" : "0");
    if (mediaUrl) formData.append("media_url", mediaUrl);

    const v1Resp = await fetch(FINBITE_V1_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const v1ct = v1Resp.headers.get("content-type") || "";
    if (v1ct.includes("application/json")) {
      const result = await v1Resp.json();
      if (v1Resp.ok && result.status !== false && !result.error) {
        return { success: true, provider_message_id: result.message_id || null };
      }
      return { success: false, error: JSON.stringify(result) };
    }
  }

  return { success: false, error: "All delivery attempts failed" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const FINBITE_API_KEY = Deno.env.get("FINBITE_API_KEY");
  const FINBITE_BEARER_TOKEN = Deno.env.get("FINBITE_BEARER_TOKEN");
  const FINBITE_WHATSAPP_CLIENT = Deno.env.get("FINBITE_WHATSAPP_CLIENT");
  const FINBITE_CLIENT_ID = Deno.env.get("FINBITE_CLIENT_ID");
  const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const hasFinbite = Boolean((FINBITE_BEARER_TOKEN || FINBITE_API_KEY) && FINBITE_WHATSAPP_CLIENT);
  const hasMeta = Boolean(WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID);

  if ((!hasFinbite && !hasMeta) || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing configuration (need WhatsApp provider + database credentials)" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const batchSize = body.batchSize || 50;
    const campaignId = body.campaignId;

    // Check opt-outs
    const { data: optOuts } = await supabase.from("wa_opt_outs").select("phone");
    const optOutSet = new Set((optOuts || []).map((o: { phone: string }) => o.phone));

    // Fetch queued messages
    let query = supabase
      .from("wa_message_queue")
      .select("*")
      .in("status", ["queued"])
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (campaignId) query = query.eq("campaign_id", campaignId);

    const { data: messages, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No messages in queue" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as processing
    const now = new Date().toISOString();
    const messageIds = messages.map((m: { id: string }) => m.id);
    await supabase.from("wa_message_queue").update({ status: "processing", updated_at: now }).in("id", messageIds);

    let sent = 0, failed = 0, skipped = 0;

    for (const msg of messages) {
      const phone = normalizePhone(msg.phone);

      // Check opt-out
      if (optOutSet.has(phone.short) || optOutSet.has(`91${phone.short}`) || optOutSet.has(msg.phone)) {
        await supabase.from("wa_message_queue").update({
          status: "cancelled", error_message: "Opted out", updated_at: new Date().toISOString(),
        }).eq("id", msg.id);
        skipped++;
        continue;
      }

      if (!phone.valid) {
        await supabase.from("wa_message_queue").update({
          status: "failed", error_message: "Invalid phone", failed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("id", msg.id);
        failed++;
        continue;
      }

      const result = await sendMessage(
        FINBITE_BEARER_TOKEN || FINBITE_API_KEY || "",
        FINBITE_WHATSAPP_CLIENT || "",
        FINBITE_CLIENT_ID,
        FINBITE_API_KEY || undefined,
        phone,
        msg.message_content,
        msg.template_name, msg.variables_data,
        msg.media_url, msg.media_type,
        WHATSAPP_ACCESS_TOKEN || undefined,
        WHATSAPP_PHONE_NUMBER_ID || undefined
      );

      if (result.success) {
        await supabase.from("wa_message_queue").update({
          status: "sent", sent_at: new Date().toISOString(),
          provider_message_id: result.provider_message_id || null, updated_at: new Date().toISOString(),
        }).eq("id", msg.id);

        // Also log to wa_message_logs for data ownership
        await supabase.from("wa_message_logs").insert({
          phone: msg.phone,
          template_name: msg.template_name || null,
          message_type: msg.template_name ? "template" : "text",
          message_content: msg.message_content,
          trigger_event: msg.automation_rule_id ? "automation" : "campaign",
          campaign_id: msg.campaign_id || null,
          lead_id: msg.lead_id || null,
          provider: "finbite",
          provider_message_id: result.provider_message_id || null,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

        sent++;
      } else {
        await handleFailure(supabase, msg, result.error || "Unknown");
        failed++;
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 200));
    }

    // Update campaign stats if applicable
    if (campaignId) await updateCampaignStats(supabase, campaignId);

    console.log(`Queue processed: ${sent} sent, ${failed} failed, ${skipped} skipped`);

    return new Response(JSON.stringify({ processed: messages.length, sent, failed, skipped }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Queue processor error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleFailure(supabase: ReturnType<typeof createClient>, msg: { id: string; attempts?: number; max_attempts?: number }, errorMsg: string) {
  const nextAttempt = (msg.attempts || 0) + 1;
  const maxAttempts = msg.max_attempts || 3;
  if (nextAttempt < maxAttempts) {
    const delayMs = Math.pow(3, nextAttempt) * 60000;
    await supabase.from("wa_message_queue").update({
      status: "queued", attempts: nextAttempt,
      next_retry_at: new Date(Date.now() + delayMs).toISOString(),
      error_message: errorMsg, updated_at: new Date().toISOString(),
    }).eq("id", msg.id);
  } else {
    await supabase.from("wa_message_queue").update({
      status: "failed", attempts: nextAttempt,
      failed_at: new Date().toISOString(),
      error_message: `Max retries exceeded. Last: ${errorMsg}`,
      updated_at: new Date().toISOString(),
    }).eq("id", msg.id);
  }
}

async function updateCampaignStats(supabase: ReturnType<typeof createClient>, campaignId: string) {
  const { data: stats } = await supabase.from("wa_message_queue").select("status").eq("campaign_id", campaignId);
  if (!stats) return;

  const counts = {
    total_queued: stats.filter((s: { status: string }) => s.status === "queued").length,
    total_sent: stats.filter((s: { status: string }) => ["sent", "delivered", "read", "replied"].includes(s.status)).length,
    total_delivered: stats.filter((s: { status: string }) => ["delivered", "read", "replied"].includes(s.status)).length,
    total_failed: stats.filter((s: { status: string }) => s.status === "failed").length,
  };

  const allDone = counts.total_queued === 0;
  await supabase.from("wa_campaigns").update({
    ...counts,
    status: allDone ? (counts.total_failed === stats.length ? "failed" : "completed") : "sending",
    completed_at: allDone ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", campaignId);
}
