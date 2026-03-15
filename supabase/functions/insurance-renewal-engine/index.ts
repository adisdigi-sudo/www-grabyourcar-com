import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Insurance Renewal Automation Engine v2
 * 
 * Actions:
 * - scan: Detect policies in configurable day windows and send premium branded WhatsApp reminders
 * - recover: Find lapsed policies (expired 1-90 days) and trigger recovery sequences
 * - send_single: Send a renewal reminder to a specific client (agent one-click)
 * 
 * Template is loaded from insurance_renewal_settings (fully editable from admin).
 */

const DEFAULT_TEMPLATE = `🚗 *Grabyourcar Policy Renewal Reminder*
━━━━━━━━━━━━━━━━━━━━━

Hello *{{customer_name}}*,

We hope you are enjoying a smooth and safe drive!

This is a friendly reminder from *Grabyourcar Insurance Desk* that your *{{vehicle_model}}* {{vehicle_number_line}}insurance policy is set to expire on *{{expiry_date}}* — just *{{days_remaining}} days* to go.

Renewing your policy before the expiry helps you:

✅ Avoid inspection hassles
✅ Maintain your No Claim Bonus
✅ Stay financially protected
✅ Ensure uninterrupted coverage

Our team has already prepared renewal assistance for you to make the process quick and seamless.

👉 Simply *reply to this message* or click below to get your renewal quote instantly.

🔗 Renew Now: https://www.grabyourcar.com/insurance

{{policy_details_section}}

If you need any help, feel free to contact your dedicated advisor.

📞 {{advisor_number}}
🌐 www.grabyourcar.com

Thank you for trusting *Grabyourcar* — we look forward to protecting your journeys ahead.

Drive safe! 🚘`;

const DEFAULT_WINDOWS = [45, 30, 15, 7, 1];
const DEFAULT_ADVISOR = "+91 98559 24442";

function normalizePhone(phone: string): string | null {
  if (!phone || phone.startsWith("IB_")) return null;
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  let short = clean;
  if (clean.startsWith("91") && clean.length === 12) short = clean.slice(2);
  if (!/^[6-9]\d{9}$/.test(short)) return null;
  return `91${short}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return dateStr; }
}

function buildMessage(
  template: string,
  client: Record<string, any>,
  policy: Record<string, any> | null,
  daysRemaining: number,
  advisorNumber: string,
): string {
  const vehicleModel = client.vehicle_model || client.vehicle_make || "your vehicle";
  const vehicleNumber = client.vehicle_number || "";
  const vehicleNumberLine = vehicleNumber ? `(${vehicleNumber}) ` : "";
  const customerName = client.customer_name || "Valued Customer";
  const expiryDate = policy?.expiry_date ? formatDate(policy.expiry_date) : (client.policy_expiry_date ? formatDate(client.policy_expiry_date) : "soon");

  // Build policy details section
  let policyDetails = "";
  const insurer = policy?.insurer || client.current_insurer || "";
  const policyNumber = policy?.policy_number || client.current_policy_number || "";
  const premium = policy?.premium_amount || client.current_premium || "";

  if (insurer || policyNumber || premium) {
    policyDetails = "📋 *Your Policy Details:*\n";
    if (policyNumber) policyDetails += `📄 Policy: ${policyNumber}\n`;
    if (insurer) policyDetails += `🏢 Insurer: ${insurer}\n`;
    if (premium) policyDetails += `💰 Premium: ₹${Number(premium).toLocaleString("en-IN")}\n`;
    if (vehicleNumber) policyDetails += `🚗 Vehicle: ${vehicleNumber}\n`;
  }

  return template
    .replace(/\{\{customer_name\}\}/g, customerName)
    .replace(/\{\{vehicle_model\}\}/g, vehicleModel)
    .replace(/\{\{vehicle_number_line\}\}/g, vehicleNumberLine)
    .replace(/\{\{vehicle_number\}\}/g, vehicleNumber)
    .replace(/\{\{expiry_date\}\}/g, expiryDate)
    .replace(/\{\{days_remaining\}\}/g, String(daysRemaining))
    .replace(/\{\{advisor_number\}\}/g, advisorNumber)
    .replace(/\{\{policy_details_section\}\}/g, policyDetails)
    .replace(/\{\{insurer\}\}/g, insurer)
    .replace(/\{\{policy_number\}\}/g, policyNumber)
    .replace(/\{\{premium\}\}/g, premium ? `₹${Number(premium).toLocaleString("en-IN")}` : "")
    .replace(/\n{3,}/g, "\n\n"); // Clean excess newlines
}

const WINDOW_COLUMN_MAP: Record<number, string> = {
  60: "reminder_60_sent",
  45: "reminder_45_sent",
  30: "reminder_30_sent",
  15: "reminder_15_sent",
  7: "reminder_7_sent",
  1: "reminder_1_sent",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { action = "scan", client_id, policy_id, custom_message } = body;
    const now = new Date();
    const results: Record<string, number> = { triggered: 0, tasks_created: 0, recovered: 0 };

    // Load configurable template & settings
    const { data: settings } = await supabase
      .from("insurance_renewal_settings")
      .select("setting_key, setting_value");

    const settingsMap: Record<string, any> = {};
    (settings || []).forEach((s: any) => { settingsMap[s.setting_key] = s.setting_value; });

    const templateConfig = settingsMap["renewal_whatsapp_template"] || {};
    const template = templateConfig.template_body || DEFAULT_TEMPLATE;
    const advisorNumber = templateConfig.advisor_number || DEFAULT_ADVISOR;

    const windowConfig = settingsMap["renewal_trigger_windows"] || {};
    const windows: number[] = windowConfig.windows || DEFAULT_WINDOWS;
    const windowsEnabled = windowConfig.enabled !== false;

    // ===== SEND SINGLE (Agent one-click) =====
    if (action === "send_single" && client_id) {
      const { data: client } = await supabase
        .from("insurance_clients")
        .select("*")
        .eq("id", client_id)
        .single();

      if (!client) {
        return new Response(JSON.stringify({ error: "Client not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const phone = normalizePhone(client.phone);
      if (!phone) {
        return new Response(JSON.stringify({ error: "Invalid phone number" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get latest policy
      let policy = null;
      if (policy_id) {
        const { data } = await supabase.from("insurance_policies").select("*").eq("id", policy_id).single();
        policy = data;
      } else {
        const { data } = await supabase.from("insurance_policies")
          .select("*").eq("client_id", client_id).eq("status", "active")
          .order("expiry_date", { ascending: true }).limit(1);
        policy = data?.[0] || null;
      }

      const expiryDate = policy?.expiry_date || client.policy_expiry_date;
      let daysRemaining = 0;
      if (expiryDate) {
        daysRemaining = Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / 86400000);
        if (daysRemaining < 0) daysRemaining = 0;
      }

      const message = custom_message || buildMessage(template, client, policy, daysRemaining, advisorNumber);

      // Send via whatsapp-send
      const sendResp = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ to: phone, message }),
      });
      const sendResult = await sendResp.json();

      // Log activity
      await supabase.from("insurance_activity_log").insert({
        client_id: client.id,
        activity_type: "renewal_reminder",
        title: "Premium renewal reminder sent",
        description: `Renewal reminder sent to ${client.phone}${expiryDate ? ` (expires ${formatDate(expiryDate)})` : ""}`,
        metadata: { days_remaining: daysRemaining, sent_via: "agent_click" },
      });

      return new Response(JSON.stringify({
        success: sendResp.ok,
        message_preview: message.substring(0, 200) + "...",
        result: sendResult,
      }), {
        status: sendResp.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SCAN: Automated renewal reminders =====
    if ((action === "scan" || action === "all") && windowsEnabled) {
      for (const days of windows) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + days);
        const dateStr = targetDate.toISOString().split("T")[0];

        const reminderCol = WINDOW_COLUMN_MAP[days];
        if (!reminderCol) continue;

        // Find policies expiring on this exact day
        const { data: policies } = await supabase
          .from("insurance_policies")
          .select("*, insurance_clients(id, customer_name, phone, email, vehicle_number, vehicle_model, vehicle_make, current_insurer, current_policy_number, current_premium, assigned_advisor_id, advisor_name)")
          .eq("status", "active")
          .eq("expiry_date", dateStr);

        if (!policies || policies.length === 0) continue;

        for (const policy of policies) {
          const client = policy.insurance_clients;
          if (!client) continue;
          const phone = normalizePhone(client.phone);
          if (!phone) continue;

          // Check if already sent for this window
          const { data: tracking } = await supabase
            .from("insurance_renewal_tracking")
            .select("id, " + reminderCol)
            .eq("policy_id", policy.id)
            .limit(1);

          const existingTrack = tracking?.[0];
          if (existingTrack && existingTrack[reminderCol]) continue;

          const message = buildMessage(template, client, policy, days, advisorNumber);

          // Send WhatsApp
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SERVICE_KEY}`,
              },
              body: JSON.stringify({ to: phone, message }),
            });
            results.triggered++;
          } catch (e) {
            console.error("WA send failed:", e);
            continue;
          }

          // Upsert tracking
          if (existingTrack) {
            await supabase.from("insurance_renewal_tracking")
              .update({ [reminderCol]: true, [`${reminderCol}_at`]: now.toISOString() })
              .eq("id", existingTrack.id);
          } else {
            await supabase.from("insurance_renewal_tracking").insert({
              policy_id: policy.id,
              client_id: client.id,
              expiry_date: policy.expiry_date,
              days_until_expiry: days,
              [reminderCol]: true,
              [`${reminderCol}_at`]: now.toISOString(),
            });
          }

          // Create advisor task for critical windows
          if (days <= 15) {
            const priority = days <= 1 ? "critical" : days <= 7 ? "high" : "medium";
            await supabase.from("insurance_tasks").insert({
              client_id: client.id,
              task_type: "renewal_followup",
              title: `Renewal: ${client.customer_name} (${days}d left)`,
              description: `Policy ${policy.policy_number || policy.id} expires ${formatDate(policy.expiry_date)}. Premium: ₹${policy.premium_amount ? Number(policy.premium_amount).toLocaleString("en-IN") : "N/A"}. Vehicle: ${client.vehicle_number || "N/A"}.`,
              priority,
              status: "pending",
              due_date: dateStr,
              assigned_to: client.assigned_advisor_id || null,
            });
            results.tasks_created++;
          }

          // Log activity
          await supabase.from("insurance_activity_log").insert({
            client_id: client.id,
            activity_type: "renewal_reminder",
            title: `${days}-day renewal reminder sent`,
            description: `Automated premium renewal reminder for policy expiring ${formatDate(policy.expiry_date)}`,
            metadata: { policy_id: policy.id, window: days, automated: true },
          });
        }
      }
    }

    // ===== RECOVER: Lapsed policies =====
    if (action === "recover" || action === "all") {
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: lapsed } = await supabase
        .from("insurance_policies")
        .select("*, insurance_clients(id, customer_name, phone, vehicle_number, vehicle_model, current_insurer)")
        .eq("status", "active")
        .lt("expiry_date", now.toISOString().split("T")[0])
        .gte("expiry_date", ninetyDaysAgo.toISOString().split("T")[0]);

      if (lapsed) {
        for (const policy of lapsed) {
          const client = policy.insurance_clients;
          if (!client) continue;
          const phone = normalizePhone(client.phone);
          if (!phone) continue;

          // Check if recovery already attempted
          const { data: tracked } = await supabase
            .from("insurance_renewal_tracking")
            .select("id, outcome")
            .eq("policy_id", policy.id)
            .limit(1);

          if (tracked?.[0]?.outcome === "recovered") continue;

          // Mark policy as expired
          await supabase.from("insurance_policies")
            .update({ status: "expired" })
            .eq("id", policy.id);

          // Send recovery message
          const recoveryMsg = `⚠️ *Urgent: Policy Expired*\n━━━━━━━━━━━━━━━━━━━━━\n\nDear *${client.customer_name || "Valued Customer"}*,\n\nYour motor insurance for *${client.vehicle_model || "your vehicle"}* ${client.vehicle_number ? `(${client.vehicle_number}) ` : ""}expired on *${formatDate(policy.expiry_date)}*.\n\n🚨 *Without active insurance:*\n❌ You cannot file claims\n❌ Legal penalties may apply\n❌ NCB discount may be lost\n❌ Vehicle inspection may be required\n\n💡 *Renew now to avoid complications!*\nOur team can help you get the best rates even after expiry.\n\n📞 Call us: ${advisorNumber}\n🔗 https://www.grabyourcar.com/insurance\n\n— *Grabyourcar Insurance* 🚗`;

          try {
            await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SERVICE_KEY}`,
              },
              body: JSON.stringify({ to: phone, message: recoveryMsg }),
            });
          } catch (e) {
            console.error("Recovery WA failed:", e);
          }

          // Update or insert tracking
          if (tracked?.[0]) {
            await supabase.from("insurance_renewal_tracking")
              .update({ outcome: "lapsed", recovery_attempts: (tracked[0].recovery_attempts || 0) + 1, last_recovery_at: now.toISOString() })
              .eq("id", tracked[0].id);
          } else {
            await supabase.from("insurance_renewal_tracking").insert({
              policy_id: policy.id,
              client_id: client.id,
              expiry_date: policy.expiry_date,
              outcome: "lapsed",
              recovery_attempts: 1,
              last_recovery_at: now.toISOString(),
            });
          }

          await supabase.from("insurance_tasks").insert({
            client_id: client.id,
            task_type: "renewal_followup",
            title: `LAPSED: ${client.customer_name || client.phone}`,
            description: `Policy expired ${formatDate(policy.expiry_date)}. Urgent recovery needed.`,
            priority: "critical",
            status: "pending",
          });

          results.recovered++;
        }
      }
    }

    console.log("Renewal engine v2 results:", results);

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Renewal engine error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
