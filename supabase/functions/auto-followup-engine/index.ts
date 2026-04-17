import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * AUTO FOLLOW-UP ENGINE
 * Runs every minute via pg_cron.
 * Scans all 5 vertical lead tables for follow_up_date + follow_up_time that are due,
 * picks the vertical's default follow-up template, renders variables, and auto-sends
 * via WhatsApp + Email (per template channel).
 *
 * Dedupe: a (vertical, lead_id, template_slug, follow_up_date, follow_up_time) row in
 * template_send_log prevents duplicate sends.
 */

interface VerticalConfig {
  vertical: string;
  table: string;
  selectCols: string;
  // map from row -> { phone, email, name, vars }
  mapRow: (r: any) => { phone?: string; email?: string; name?: string; vars: Record<string, string>; lead_key: string };
}

const VERTICALS: VerticalConfig[] = [
  {
    vertical: "sales",
    table: "sales_pipeline",
    selectCols: "id,customer_name,phone,email,car_model,follow_up_date,follow_up_time,assigned_to",
    mapRow: (r) => ({
      phone: r.phone,
      email: r.email,
      name: r.customer_name,
      lead_key: r.id,
      vars: {
        customer_name: r.customer_name || "Customer",
        agent_name: r.assigned_to || "Anshdeep",
        car_model: r.car_model || "your selected car",
      },
    }),
  },
  {
    vertical: "insurance",
    table: "insurance_clients",
    selectCols: "id,customer_name,phone,email,vehicle_number,current_insurer,policy_expiry_date,follow_up_date,follow_up_time,assigned_executive",
    mapRow: (r) => {
      let expiry_note = "";
      if (r.policy_expiry_date) {
        const days = Math.ceil((new Date(r.policy_expiry_date).getTime() - Date.now()) / 86400000);
        expiry_note = days > 0 ? `expires in ${days} days` : `expired ${Math.abs(days)} days ago`;
      }
      return {
        phone: r.phone,
        email: r.email,
        name: r.customer_name,
        lead_key: r.id,
        vars: {
          customer_name: r.customer_name || "Customer",
          agent_name: r.assigned_executive || "Anshdeep",
          vehicle_number: r.vehicle_number || "your vehicle",
          current_insurer: r.current_insurer || "your insurer",
          expiry_note,
        },
      };
    },
  },
  {
    vertical: "hsrp",
    table: "hsrp_bookings",
    selectCols: "id,owner_name,mobile,email,registration_number,order_status,follow_up_date,follow_up_time",
    mapRow: (r) => ({
      phone: r.mobile,
      email: r.email,
      name: r.owner_name,
      lead_key: r.id,
      vars: {
        owner_name: r.owner_name || "Customer",
        agent_name: "Anshdeep",
        registration_number: r.registration_number || "your vehicle",
        order_status: r.order_status || "in progress",
      },
    }),
  },
  {
    vertical: "rental",
    table: "rental_bookings",
    selectCols: "id,customer_name,phone,email,vehicle_name,pickup_date,follow_up_date,follow_up_time",
    mapRow: (r) => ({
      phone: r.phone,
      email: r.email,
      name: r.customer_name,
      lead_key: r.id,
      vars: {
        customer_name: r.customer_name || "Customer",
        agent_name: "Anshdeep",
        car_name: r.vehicle_name || "the car",
        pickup_date: r.pickup_date || "your scheduled date",
      },
    }),
  },
];

function isDue(date: string | null, time: string | null) {
  if (!date) return false;
  const t = time && /^\d{1,2}:\d{2}/.test(time) ? time.slice(0, 5) : "09:00";
  const dueAt = new Date(`${date}T${t}:00`);
  const now = new Date();
  // due if scheduled <= now AND scheduled >= now-2h (don't backfill old leads)
  return dueAt.getTime() <= now.getTime() && dueAt.getTime() >= now.getTime() - 2 * 60 * 60 * 1000;
}

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SB_URL, SVC);

  const summary: any = { scanned: 0, sent: 0, skipped: 0, errors: 0, perVertical: {} };

  try {
    // Load all default templates once
    const { data: defaults, error: tplErr } = await supabase
      .from("crm_message_templates")
      .select("vertical,slug,label,channel,body_text,subject,email_html")
      .eq("is_default_followup", true)
      .eq("is_active", true);
    if (tplErr) throw tplErr;
    const tplMap = new Map<string, any>();
    (defaults || []).forEach((t) => t.vertical && tplMap.set(t.vertical, t));

    for (const v of VERTICALS) {
      const stat = { scanned: 0, sent: 0, skipped: 0, errors: 0 };
      const tpl = tplMap.get(v.vertical);
      if (!tpl) { stat.skipped = -1; summary.perVertical[v.vertical] = { ...stat, reason: "no_default_template" }; continue; }

      // Pull leads with a follow_up_date in past 2h..now
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000).toISOString().split("T")[0];
      const tomorrow = new Date(today.getTime() + 86400000).toISOString().split("T")[0];

      const { data: rows, error } = await supabase
        .from(v.table)
        .select(v.selectCols)
        .gte("follow_up_date", yesterday)
        .lte("follow_up_date", tomorrow)
        .limit(500);
      if (error) { stat.errors++; summary.perVertical[v.vertical] = { ...stat, error: error.message }; continue; }

      for (const row of rows || []) {
        stat.scanned++;
        if (!isDue(row.follow_up_date, row.follow_up_time)) { stat.skipped++; continue; }

        const mapped = v.mapRow(row);
        if (!mapped.phone && !mapped.email) { stat.skipped++; continue; }

        // Dedupe check
        const { data: existing } = await supabase
          .from("template_send_log")
          .select("id")
          .eq("vertical", v.vertical)
          .eq("lead_id", mapped.lead_key)
          .eq("template_slug", tpl.slug)
          .eq("follow_up_date", row.follow_up_date)
          .eq("follow_up_time", row.follow_up_time || "09:00")
          .limit(1)
          .maybeSingle();
        if (existing) { stat.skipped++; continue; }

        let sentOk = false;
        let errMsg: string | null = null;

        // WhatsApp
        if ((tpl.channel === "whatsapp" || tpl.channel === "both") && mapped.phone) {
          try {
            const message = render(tpl.body_text, mapped.vars);
            const { error: waErr } = await supabase.functions.invoke("whatsapp-send", {
              body: {
                to: mapped.phone,
                message,
                messageType: "text",
                message_context: "auto_followup",
                name: mapped.name || "Customer",
                logEvent: tpl.slug,
                lead_id: mapped.lead_key,
              },
            });
            if (waErr) throw waErr;
            sentOk = true;
          } catch (e: any) {
            errMsg = `wa: ${e.message || e}`;
          }
        }

        // Email
        if ((tpl.channel === "email" || tpl.channel === "both") && mapped.email) {
          try {
            const subject = render(tpl.subject || tpl.label, mapped.vars);
            const html = render(tpl.email_html || `<pre>${tpl.body_text}</pre>`, mapped.vars);
            const { error: emErr } = await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "raw-html",
                recipientEmail: mapped.email,
                idempotencyKey: `followup-${v.vertical}-${mapped.lead_key}-${row.follow_up_date}-${row.follow_up_time || "09:00"}`,
                templateData: { subject, html, name: mapped.name },
              },
            });
            if (emErr) throw emErr;
            sentOk = true;
          } catch (e: any) {
            errMsg = errMsg ? `${errMsg}; em: ${e.message || e}` : `em: ${e.message || e}`;
          }
        }

        // Log
        await supabase.from("template_send_log").insert({
          vertical: v.vertical,
          lead_id: mapped.lead_key,
          lead_table: v.table,
          template_slug: tpl.slug,
          channel: tpl.channel,
          recipient_phone: mapped.phone || null,
          recipient_email: mapped.email || null,
          recipient_name: mapped.name || null,
          status: sentOk ? "sent" : "failed",
          error_message: errMsg,
          follow_up_date: row.follow_up_date,
          follow_up_time: row.follow_up_time || "09:00",
          payload: { vars: mapped.vars },
        });

        if (sentOk) { stat.sent++; summary.sent++; } else { stat.errors++; summary.errors++; }
      }
      summary.scanned += stat.scanned;
      summary.perVertical[v.vertical] = stat;
    }

    return new Response(JSON.stringify({ success: true, summary, ranAt: new Date().toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("auto-followup-engine error:", e);
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e), summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
