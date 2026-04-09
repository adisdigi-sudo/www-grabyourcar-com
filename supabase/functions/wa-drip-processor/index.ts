import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * WhatsApp Drip Sequence Processor
 * 
 * Processes active wa_drip_enrollments that are due.
 * Each sequence has steps: [{ day: 0, message: "...", template_name: "...", delay_hours: 0 }, ...]
 * Sends via wa-automation-trigger or messaging-service.
 * Called by pg_cron every 30 minutes.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Get all active enrollments that are due
    const now = new Date().toISOString();
    const { data: enrollments, error: enrollErr } = await supabase
      .from("wa_drip_enrollments")
      .select("*, wa_drip_sequences(*)")
      .eq("status", "active")
      .lte("next_send_at", now)
      .limit(50);

    if (enrollErr) throw enrollErr;
    if (!enrollments?.length) {
      return new Response(JSON.stringify({ processed: 0, message: "No due enrollments" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let completed = 0;
    let failed = 0;

    for (const enrollment of enrollments) {
      const sequence = enrollment.wa_drip_sequences;
      if (!sequence?.is_active) {
        await supabase.from("wa_drip_enrollments")
          .update({ status: "paused" })
          .eq("id", enrollment.id);
        continue;
      }

      const steps = (sequence.steps || []) as Array<{
        day?: number;
        delay_hours?: number;
        message?: string;
        template_name?: string;
        type?: string;
      }>;

      const currentStep = steps[enrollment.current_step_index];
      if (!currentStep) {
        // Sequence complete
        await supabase.from("wa_drip_enrollments")
          .update({ status: "completed", completed_at: now })
          .eq("id", enrollment.id);
        completed++;
        continue;
      }

      // Check opt-out
      const cleanPhone = enrollment.phone.replace(/\D/g, "").replace(/^91/, "");
      const { data: optOut } = await supabase
        .from("wa_opt_outs")
        .select("id")
        .or(`phone.eq.${cleanPhone},phone.eq.91${cleanPhone}`)
        .limit(1);

      if (optOut?.length) {
        await supabase.from("wa_drip_enrollments")
          .update({ status: "opted_out" })
          .eq("id", enrollment.id);
        continue;
      }

      // Send via messaging-service
      try {
        const variables: Record<string, string> = {
          name: enrollment.lead_name || "Customer",
          phone: enrollment.phone,
        };

        if (currentStep.template_name) {
          // Send template via messaging-service
          await fetch(`${SUPABASE_URL}/functions/v1/messaging-service`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({
              action: "send_template",
              phone: enrollment.phone,
              template_name: currentStep.template_name,
              variables,
              lead_id: enrollment.lead_id,
              customer_name: enrollment.lead_name,
            }),
          });
        } else if (currentStep.message) {
          // Send text message
          let messageContent = currentStep.message;
          for (const [key, value] of Object.entries(variables)) {
            messageContent = messageContent.replace(new RegExp(`\\{${key}\\}`, "gi"), value);
          }

          await fetch(`${SUPABASE_URL}/functions/v1/messaging-service`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({
              action: "send_text",
              phone: enrollment.phone,
              message: messageContent,
              lead_id: enrollment.lead_id,
            }),
          });
        }

        sent++;

        // Advance to next step
        const nextIndex = enrollment.current_step_index + 1;
        const nextStep = steps[nextIndex];

        if (nextStep) {
          const delayMs = ((nextStep.day || 0) * 86400 + (nextStep.delay_hours || 0) * 3600) * 1000;
          const nextSendAt = new Date(Date.now() + Math.max(delayMs, 3600000)).toISOString(); // min 1 hour

          await supabase.from("wa_drip_enrollments").update({
            current_step_index: nextIndex,
            next_send_at: nextSendAt,
            last_sent_at: now,
          }).eq("id", enrollment.id);
        } else {
          await supabase.from("wa_drip_enrollments").update({
            status: "completed",
            completed_at: now,
            last_sent_at: now,
          }).eq("id", enrollment.id);
          completed++;
        }
      } catch (e) {
        console.error(`Drip send failed for ${enrollment.phone}:`, e);
        failed++;
      }
    }

    return new Response(JSON.stringify({ processed: enrollments.length, sent, completed, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WA Drip Processor error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
