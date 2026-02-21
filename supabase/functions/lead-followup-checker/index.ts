import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Lead Follow-up Checker — 30-Minute Escalation Engine
 * 
 * Runs on cron (every 5 min) or manual trigger.
 * Finds leads not contacted within 30 min → Alerts manager via WhatsApp + Email.
 * Mirrors n8n "Wait 30 Minutes → Check Lead Status → Lead Contacted? → Manager Alert" flow.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const FINBITE_BEARER_TOKEN = Deno.env.get("FINBITE_BEARER_TOKEN");
  const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Find leads where follow_up_due has passed, not contacted, and alert not yet sent
    const now = new Date().toISOString();
    const { data: overdueLeads, error } = await supabase
      .from("automation_lead_tracking")
      .select("*")
      .eq("contacted", false)
      .eq("follow_up_alert_sent", false)
      .lte("follow_up_due", now)
      .order("follow_up_due", { ascending: true })
      .limit(50);

    if (error) throw error;
    if (!overdueLeads || overdueLeads.length === 0) {
      return new Response(JSON.stringify({ success: true, alerted: 0, message: "No overdue leads" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let alerted = 0;
    const managerPhone = "919855924442";
    const managerEmail = "hello@grabyourcar.com";

    for (const lead of overdueLeads) {
      // Send Manager WhatsApp Alert
      if (FINBITE_BEARER_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
        try {
          await fetch("https://app.finbite.in/api/v2/whatsapp-business/messages", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FINBITE_BEARER_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: managerPhone,
              phoneNoId: WHATSAPP_PHONE_NUMBER_ID,
              type: "text",
              text: `⚠️ *URGENT: Lead Not Contacted*\n\n*Lead ID:* ${lead.lead_id}\n*Name:* ${lead.name}\n*Phone:* ${lead.phone}\n*Vertical:* ${lead.vertical}\n*Assigned To:* ${lead.assigned_executive_email}\n*Assigned At:* ${lead.assigned_at}\n\n🔴 This lead has NOT been contacted within 30 minutes.\n\nPlease follow up immediately!`,
            }),
          });
        } catch (e) {
          console.error("Manager WhatsApp alert failed:", e);
        }
      }

      // Send Manager Email Alert
      if (RESEND_API_KEY) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "hello@grabyourcar.com",
              to: [managerEmail],
              subject: `URGENT: Lead Not Contacted - ${lead.vertical}`,
              html: `<h2 style="color: red;">⚠️ URGENT: Lead Not Contacted</h2>
                <p><strong>Lead ID:</strong> ${lead.lead_id}<br>
                <strong>Name:</strong> ${lead.name}<br>
                <strong>Phone:</strong> ${lead.phone}<br>
                <strong>Vertical:</strong> ${lead.vertical}<br>
                <strong>Assigned To:</strong> ${lead.assigned_executive_email}<br>
                <strong>Assigned At:</strong> ${lead.assigned_at}</p>
                <p style="color: red; font-weight: bold;">🔴 This lead has NOT been contacted within 30 minutes.</p>
                <p>Please follow up immediately!</p>`,
            }),
          });
        } catch (e) {
          console.error("Manager email alert failed:", e);
        }
      }

      // Mark alert as sent
      await supabase.from("automation_lead_tracking")
        .update({ follow_up_alert_sent: true, manager_alerted: true })
        .eq("id", lead.id);

      alerted++;
    }

    return new Response(JSON.stringify({ success: true, alerted }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Follow-up checker error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
