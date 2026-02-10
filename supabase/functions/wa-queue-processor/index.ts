import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FINBITE_API_URL = "https://api.finbite.in/v1/whatsapp/send";

interface MessageJob {
  id: string;
  phone: string;
  message_content: string;
  media_url?: string;
  media_type?: string;
  campaign_id?: string;
  attempts: number;
  max_attempts: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const FINBITE_CLIENT_ID = Deno.env.get("FINBITE_CLIENT_ID");
  const FINBITE_API_KEY = Deno.env.get("FINBITE_API_KEY");
  const FINBITE_WHATSAPP_CLIENT = Deno.env.get("FINBITE_WHATSAPP_CLIENT");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!FINBITE_CLIENT_ID || !FINBITE_API_KEY || !FINBITE_WHATSAPP_CLIENT || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing configuration" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const batchSize = body.batchSize || 50;
    const campaignId = body.campaignId;

    // 1. Check opt-outs
    const { data: optOuts } = await supabase.from("wa_opt_outs").select("phone");
    const optOutSet = new Set((optOuts || []).map(o => o.phone));

    // 2. Fetch queued messages
    let query = supabase
      .from("wa_message_queue")
      .select("*")
      .in("status", ["queued"])
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }

    // Also pick up retry-eligible messages
    const now = new Date().toISOString();
    
    const { data: messages, error: fetchErr } = await query;

    if (fetchErr) throw fetchErr;
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No messages in queue" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Mark as processing
    const messageIds = messages.map(m => m.id);
    await supabase
      .from("wa_message_queue")
      .update({ status: "processing", updated_at: now })
      .in("id", messageIds);

    // 4. Process each message
    let sent = 0, failed = 0, skipped = 0;
    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const msg of messages) {
      // Check opt-out
      const cleanPhone = msg.phone.replace(/\D/g, "").replace(/^91/, "");
      if (optOutSet.has(cleanPhone) || optOutSet.has(`91${cleanPhone}`) || optOutSet.has(msg.phone)) {
        await supabase.from("wa_message_queue").update({
          status: "cancelled",
          error_message: "Opted out",
          updated_at: new Date().toISOString(),
        }).eq("id", msg.id);
        skipped++;
        results.push({ id: msg.id, status: "skipped", error: "Opted out" });
        continue;
      }

      // Normalize phone
      let normalizedPhone = cleanPhone;
      if (normalizedPhone.length === 12 && normalizedPhone.startsWith("91")) {
        normalizedPhone = normalizedPhone.slice(2);
      }
      if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
        await supabase.from("wa_message_queue").update({
          status: "failed",
          error_message: "Invalid phone number",
          failed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", msg.id);
        failed++;
        results.push({ id: msg.id, status: "failed", error: "Invalid phone" });
        continue;
      }

      try {
        // Send via Finbite
        const formData = new URLSearchParams();
        formData.append("client_id", FINBITE_CLIENT_ID);
        formData.append("api_key", FINBITE_API_KEY);
        formData.append("whatsapp_client", FINBITE_WHATSAPP_CLIENT);
        formData.append("phone", normalizedPhone);
        formData.append("country_code", "91");
        formData.append("msg", msg.message_content);
        formData.append("msg_type", msg.media_type ? "1" : "0");
        if (msg.media_url) formData.append("media_url", msg.media_url);

        const response = await fetch(FINBITE_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });

        const contentType = response.headers.get("content-type") || "";
        
        if (contentType.includes("application/json")) {
          const result = await response.json();
          if (response.ok && result.status !== false && !result.error) {
            await supabase.from("wa_message_queue").update({
              status: "sent",
              sent_at: new Date().toISOString(),
              provider_message_id: result.message_id || result.id || null,
              updated_at: new Date().toISOString(),
            }).eq("id", msg.id);
            sent++;
            results.push({ id: msg.id, status: "sent" });
          } else {
            await handleFailure(supabase, msg, JSON.stringify(result));
            failed++;
            results.push({ id: msg.id, status: "failed", error: JSON.stringify(result) });
          }
        } else {
          const text = await response.text();
          await handleFailure(supabase, msg, "Non-JSON response");
          failed++;
          results.push({ id: msg.id, status: "failed", error: "Non-JSON response" });
        }
      } catch (sendErr) {
        const errMsg = sendErr instanceof Error ? sendErr.message : "Unknown error";
        await handleFailure(supabase, msg, errMsg);
        failed++;
        results.push({ id: msg.id, status: "failed", error: errMsg });
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 200));
    }

    // 5. Update campaign stats if applicable
    if (campaignId) {
      await updateCampaignStats(supabase, campaignId);
    }

    console.log(`Queue processed: ${sent} sent, ${failed} failed, ${skipped} skipped`);

    return new Response(JSON.stringify({
      processed: messages.length,
      sent, failed, skipped, results,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Queue processor error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleFailure(supabase: any, msg: MessageJob, errorMsg: string) {
  const nextAttempt = msg.attempts + 1;
  if (nextAttempt < msg.max_attempts) {
    // Exponential backoff: 1min, 5min, 15min
    const delayMs = Math.pow(3, nextAttempt) * 60000;
    const nextRetry = new Date(Date.now() + delayMs).toISOString();
    await supabase.from("wa_message_queue").update({
      status: "queued",
      attempts: nextAttempt,
      next_retry_at: nextRetry,
      error_message: errorMsg,
      updated_at: new Date().toISOString(),
    }).eq("id", msg.id);
  } else {
    // Dead letter — max retries exceeded
    await supabase.from("wa_message_queue").update({
      status: "failed",
      attempts: nextAttempt,
      failed_at: new Date().toISOString(),
      error_message: `Max retries exceeded. Last error: ${errorMsg}`,
      updated_at: new Date().toISOString(),
    }).eq("id", msg.id);
  }
}

async function updateCampaignStats(supabase: any, campaignId: string) {
  const { data: stats } = await supabase
    .from("wa_message_queue")
    .select("status")
    .eq("campaign_id", campaignId);

  if (!stats) return;

  const counts = {
    total_queued: stats.filter((s: any) => s.status === "queued").length,
    total_sent: stats.filter((s: any) => ["sent", "delivered", "read", "replied"].includes(s.status)).length,
    total_delivered: stats.filter((s: any) => ["delivered", "read", "replied"].includes(s.status)).length,
    total_read: stats.filter((s: any) => ["read", "replied"].includes(s.status)).length,
    total_replied: stats.filter((s: any) => s.status === "replied").length,
    total_failed: stats.filter((s: any) => s.status === "failed").length,
  };

  const allDone = counts.total_queued === 0;

  await supabase.from("wa_campaigns").update({
    ...counts,
    status: allDone ? (counts.total_failed === stats.length ? "failed" : "completed") : "sending",
    completed_at: allDone ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", campaignId);
}
