import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FINBITE_V2_URL = "https://app.finbite.in/api/v2/whatsapp-business/messages";

/**
 * Broadcast Send — Updated for Finbite v2 API with template support
 * Sends broadcast messages using Finbite-approved templates.
 * All messages are logged to wa_message_logs for data ownership.
 */

function normalizePhone(phone: string): { full: string; short: string; valid: boolean } {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  let short = clean;
  if (clean.startsWith("91") && clean.length === 12) short = clean.slice(2);
  return { full: `91${short}`, short, valid: /^[6-9]\d{9}$/.test(short) };
}

async function sendViaV2(
  apiKey: string,
  phoneId: string,
  to: string,
  templateName: string | null,
  message: string,
  variables?: Record<string, string>
): Promise<{ success: boolean; provider_message_id?: string; error?: string }> {
  let body: Record<string, unknown>;

  if (templateName) {
    // Exact Finbite v2 body format for templates
    body = {
      to,
      phoneNoId: phoneId,
      type: "template",
      name: templateName,
      language: "en_US",
    };
  } else {
    body = { to, phoneNoId: phoneId, type: "text", text: { body: message } };
  }

  const resp = await fetch(FINBITE_V2_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "X-Phone-ID": phoneId,
    },
    body: JSON.stringify(body),
  });

  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const result = await resp.json();
    if (resp.ok && !result.error) {
      return { success: true, provider_message_id: result.messages?.[0]?.id || null };
    }
    return { success: false, error: JSON.stringify(result) };
  }
  const text = await resp.text();
  return { success: false, error: `Non-JSON (${resp.status})` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FINBITE_API_KEY = Deno.env.get("FINBITE_API_KEY");
    const FINBITE_WHATSAPP_CLIENT = Deno.env.get("FINBITE_WHATSAPP_CLIENT");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!FINBITE_API_KEY || !FINBITE_WHATSAPP_CLIENT) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Database not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { broadcastId } = await req.json();

    if (!broadcastId) {
      return new Response(JSON.stringify({ error: "broadcastId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch broadcast
    const { data: broadcast, error: bErr } = await supabase
      .from("whatsapp_broadcasts")
      .select("*")
      .eq("id", broadcastId)
      .single();

    if (bErr || !broadcast) {
      return new Response(JSON.stringify({ error: "Broadcast not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status
    await supabase.from("whatsapp_broadcasts")
      .update({ status: "sending", started_at: new Date().toISOString() })
      .eq("id", broadcastId);

    // Fetch leads
    const segmentFilters = broadcast.segment_filters || {};
    const targetSegment = broadcast.target_segment || {};
    let leadsQuery = supabase.from("leads").select("id, name, phone, priority, service_category, created_at");

    const segmentValue = targetSegment.segment || "all";
    if (segmentValue === "hot") leadsQuery = leadsQuery.eq("priority", "high");
    else if (segmentValue === "warm") leadsQuery = leadsQuery.eq("priority", "medium");
    else if (segmentValue === "new_week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      leadsQuery = leadsQuery.gte("created_at", oneWeekAgo.toISOString());
    } else if (segmentValue === "finance") leadsQuery = leadsQuery.eq("service_category", "finance");

    const { data: leads, error: leadsErr } = await leadsQuery;

    if (leadsErr || !leads || leads.length === 0) {
      await supabase.from("whatsapp_broadcasts")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", broadcastId);
      return new Response(JSON.stringify({ error: "No leads found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("whatsapp_broadcasts")
      .update({ total_recipients: leads.length })
      .eq("id", broadcastId);

    // Get template name from broadcast (if configured)
    const templateName = broadcast.template_name || null;
    const messageContent = broadcast.message_content || "Hello from GrabYourCar! 🚗";
    let sentCount = 0, deliveredCount = 0, failedCount = 0;

    for (const lead of leads) {
      if (!lead.phone) { failedCount++; continue; }

      const phone = normalizePhone(lead.phone);
      if (!phone.valid) { failedCount++; continue; }

      // Build personalized variables
      const variables: Record<string, string> = {
        name: lead.name || "Customer",
        phone: lead.phone || "",
      };

      // Personalize text message
      const personalizedMsg = messageContent
        .replace(/\{name\}/gi, lead.name || "Customer")
        .replace(/\{phone\}/gi, lead.phone || "");

      try {
        const result = await sendViaV2(
          FINBITE_API_KEY, "474586035740177",
          phone.full, templateName, personalizedMsg, variables
        );

        // Log to wa_message_logs (data ownership)
        await supabase.from("wa_message_logs").insert({
          phone: phone.short,
          customer_name: lead.name || null,
          template_name: templateName || null,
          message_type: templateName ? "template" : "text",
          message_content: personalizedMsg,
          trigger_event: "broadcast",
          lead_id: lead.id,
          campaign_id: broadcastId,
          provider: "finbite",
          provider_message_id: result.provider_message_id || null,
          status: result.success ? "sent" : "failed",
          sent_at: result.success ? new Date().toISOString() : null,
          failed_at: result.success ? null : new Date().toISOString(),
          error_message: result.error || null,
        });

        // Legacy broadcast_recipients
        await supabase.from("broadcast_recipients").insert({
          broadcast_id: broadcastId,
          lead_id: lead.id,
          phone: phone.short,
          status: result.success ? "sent" : "failed",
          sent_at: result.success ? new Date().toISOString() : null,
          error_message: result.error?.substring(0, 500) || null,
        });

        if (result.success) { sentCount++; deliveredCount++; }
        else { failedCount++; }
      } catch (sendError) {
        failedCount++;
        const errMsg = sendError instanceof Error ? sendError.message : "Unknown";
        await supabase.from("broadcast_recipients").insert({
          broadcast_id: broadcastId, lead_id: lead.id, phone: phone.short,
          status: "failed", error_message: errMsg.substring(0, 500),
        });
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 200));

      // Progress update every 10
      if ((sentCount + failedCount) % 10 === 0) {
        await supabase.from("whatsapp_broadcasts")
          .update({ sent_count: sentCount, delivered_count: deliveredCount, failed_count: failedCount })
          .eq("id", broadcastId);
      }
    }

    // Final update
    await supabase.from("whatsapp_broadcasts").update({
      status: failedCount === leads.length ? "failed" : "completed",
      completed_at: new Date().toISOString(),
      sent_count: sentCount, delivered_count: deliveredCount,
      failed_count: failedCount, total_recipients: leads.length,
    }).eq("id", broadcastId);

    console.log(`Broadcast ${broadcastId}: ${sentCount} sent, ${failedCount} failed / ${leads.length}`);

    return new Response(JSON.stringify({
      success: true,
      summary: { total: leads.length, sent: sentCount, delivered: deliveredCount, failed: failedCount },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Broadcast error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
