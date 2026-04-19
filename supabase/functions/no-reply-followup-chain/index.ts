import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * No-Reply Auto Follow-up Chain
 *
 * Strategy (rolling per lead):
 *   - 24h after creation, no reply → send template "followup_day_1"
 *   - 48h after creation, no reply → send template "followup_day_2"
 *   - 7d after creation, no reply → mark cold + alert manager
 *
 * "Reply" = any inbound message in `wa_message_logs` (direction=inbound) OR a disposition
 * marked Hot/Interested/Callback in `auto_dialer_dispositions`.
 *
 * Uses `lead_followup_state` table to track which step has fired (1, 2, 3, done).
 *
 * Run as cron every 30 min.
 */

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  vertical_id: string | null;
  created_at: string;
  status: string | null;
  assigned_to: string | null;
}

const HOURS = (n: number) => n * 3600 * 1000;

async function hasReplied(supabase: ReturnType<typeof createClient>, phone: string, leadId: string): Promise<boolean> {
  // Check inbound WA logs (last reply)
  const { data: inbound } = await supabase
    .from("wa_message_logs")
    .select("id")
    .eq("phone", phone)
    .eq("direction", "inbound")
    .limit(1);
  if (inbound && inbound.length > 0) return true;

  // Check positive disposition
  const { data: dispo } = await supabase
    .from("auto_dialer_dispositions")
    .select("id")
    .eq("phone", phone)
    .in("disposition", ["hot", "interested", "callback"])
    .limit(1);
  if (dispo && dispo.length > 0) return true;

  return false;
}

async function fireTemplate(
  supabaseUrl: string,
  serviceKey: string,
  phone: string,
  templateName: string,
  name: string | null,
  leadId: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        to: phone,
        messageType: "template",
        template_name: templateName,
        template_variables: { var_1: name || "Customer" },
        name: name || "Customer",
        logEvent: `no_reply_chain:${templateName}`,
        lead_id: leadId,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const now = Date.now();
    const cutoff7d = new Date(now - HOURS(7 * 24)).toISOString();
    const cutoff24h = new Date(now - HOURS(24)).toISOString();

    // Pull recent leads (last 14 days) to evaluate
    const cutoff14d = new Date(now - HOURS(14 * 24)).toISOString();
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, name, phone, vertical_id, created_at, status, assigned_to")
      .gte("created_at", cutoff14d)
      .neq("status", "converted")
      .neq("status", "cold")
      .neq("status", "lost")
      .limit(2000);

    if (error) throw error;

    let day1Sent = 0;
    let day2Sent = 0;
    let markedCold = 0;
    let skippedReplied = 0;

    for (const lead of (leads || []) as Lead[]) {
      if (!lead.phone) continue;

      const ageMs = now - new Date(lead.created_at).getTime();

      // Skip if customer replied
      if (await hasReplied(supabase, lead.phone, lead.id)) {
        skippedReplied += 1;
        continue;
      }

      // Read state
      const { data: state } = await supabase
        .from("lead_followup_state")
        .select("step_fired, last_step_at")
        .eq("lead_id", lead.id)
        .maybeSingle();

      const stepFired = (state as any)?.step_fired || 0;

      // 7-day mark cold
      if (ageMs >= HOURS(7 * 24) && stepFired < 3) {
        await supabase.from("leads").update({ status: "cold", priority: "low" }).eq("id", lead.id);
        await supabase.from("lead_followup_state").upsert(
          { lead_id: lead.id, step_fired: 3, last_step_at: new Date().toISOString() },
          { onConflict: "lead_id" },
        );
        // Alert manager via WhatsApp digest log
        await supabase.from("ai_daily_pushes").insert({
          push_type: "lead_cold_alert",
          team_member_name: lead.assigned_to || "Manager",
          message: `Lead ${lead.name || lead.phone} marked cold (7 days no reply)`,
          action_url: `/admin/leads/${lead.id}`,
        });
        markedCold += 1;
        continue;
      }

      // 48-hour template 2
      if (ageMs >= HOURS(48) && stepFired < 2) {
        const ok = await fireTemplate(SUPABASE_URL, SERVICE_KEY, lead.phone, "followup_day_2", lead.name, lead.id);
        if (ok) {
          await supabase.from("lead_followup_state").upsert(
            { lead_id: lead.id, step_fired: 2, last_step_at: new Date().toISOString() },
            { onConflict: "lead_id" },
          );
          day2Sent += 1;
        }
        continue;
      }

      // 24-hour template 1
      if (ageMs >= HOURS(24) && stepFired < 1) {
        const ok = await fireTemplate(SUPABASE_URL, SERVICE_KEY, lead.phone, "followup_day_1", lead.name, lead.id);
        if (ok) {
          await supabase.from("lead_followup_state").upsert(
            { lead_id: lead.id, step_fired: 1, last_step_at: new Date().toISOString() },
            { onConflict: "lead_id" },
          );
          day1Sent += 1;
        }
      }
    }

    await supabase.from("auto_pilot_logs").insert({
      agent_type: "no_reply_chain",
      status: "success",
      messages_sent: day1Sent + day2Sent,
      summary: `Day1: ${day1Sent}, Day2: ${day2Sent}, Cold: ${markedCold}, SkippedReplied: ${skippedReplied}`,
      details: { day1Sent, day2Sent, markedCold, skippedReplied, evaluated: (leads || []).length },
      started_at: new Date(now).toISOString(),
      completed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, day1Sent, day2Sent, markedCold, evaluated: (leads || []).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("No-reply chain error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
