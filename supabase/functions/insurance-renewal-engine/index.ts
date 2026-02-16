import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Insurance Renewal Automation Engine
 * 
 * Actions:
 * - scan: Detect policies in 60/30/15/7 day windows and trigger WhatsApp reminders + advisor tasks
 * - recover: Find lapsed policies (expired 1-90 days) and trigger recovery sequences
 */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { action = "scan" } = await req.json().catch(() => ({}));
    const now = new Date();
    const results: any = { triggered: 0, tasks_created: 0, recovered: 0 };

    if (action === "scan" || action === "all") {
      // Define renewal windows
      const windows = [
        { days: 60, event: "insurance_renewal_60d", priority: "low", urgency: "upcoming" },
        { days: 30, event: "insurance_renewal_30d", priority: "medium", urgency: "warning" },
        { days: 15, event: "insurance_renewal_15d", priority: "high", urgency: "urgent" },
        { days: 7, event: "insurance_renewal_7d", priority: "critical", urgency: "critical" },
      ];

      for (const w of windows) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + w.days);
        const dateStr = targetDate.toISOString().split("T")[0];

        // Find policies expiring on this exact day
        const { data: policies } = await supabase
          .from("insurance_policies")
          .select("*, insurance_clients(id, customer_name, phone, email, vehicle_number, vehicle_model, assigned_advisor)")
          .eq("status", "active")
          .eq("expiry_date", dateStr);

        if (!policies || policies.length === 0) continue;

        for (const policy of policies) {
          const client = policy.insurance_clients;
          if (!client?.phone) continue;

          // Check if we already triggered this window for this policy
          const trackingKey = `${policy.id}_${w.days}d`;
          const { data: existing } = await supabase
            .from("insurance_renewal_tracking")
            .select("id")
            .eq("policy_id", policy.id)
            .eq("reminder_type", `${w.days}_day`)
            .limit(1);

          if (existing && existing.length > 0) continue;

          // 1. Trigger WhatsApp reminder
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/wa-automation-trigger`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SERVICE_KEY}`,
              },
              body: JSON.stringify({
                event: w.event,
                phone: client.phone,
                name: client.customer_name || "Customer",
                data: {
                  days_left: String(w.days),
                  expiry_date: policy.expiry_date,
                  insurer: policy.insurer || "",
                  premium: String(policy.premium_amount || ""),
                  vehicle: client.vehicle_number || client.vehicle_model || "",
                  policy_number: policy.policy_number || "",
                  policy_type: policy.policy_type || "Comprehensive",
                },
              }),
            });
            results.triggered++;
          } catch (e) {
            console.error("WA trigger failed:", e);
          }

          // 2. Create/update renewal tracking
          await supabase.from("insurance_renewal_tracking").insert({
            policy_id: policy.id,
            client_id: client.id,
            reminder_type: `${w.days}_day`,
            status: "reminder_sent",
            next_action_date: dateStr,
            notes: `Auto ${w.days}-day renewal reminder sent`,
          });

          // 3. Create advisor follow-up task
          await supabase.from("insurance_tasks").insert({
            client_id: client.id,
            task_type: "renewal_followup",
            title: `Renewal: ${client.customer_name || client.phone} (${w.days}d)`,
            description: `Policy ${policy.policy_number || policy.id} expires on ${policy.expiry_date}. Premium: ₹${policy.premium_amount || 'N/A'}. Vehicle: ${client.vehicle_number || 'N/A'}.`,
            priority: w.priority,
            status: "pending",
            due_date: dateStr,
            assigned_to: client.assigned_advisor || null,
          });
          results.tasks_created++;

          // 4. Log activity
          await supabase.from("insurance_activity_log").insert({
            client_id: client.id,
            activity_type: "renewal_reminder",
            title: `${w.days}-day renewal reminder sent`,
            description: `Automated reminder for policy expiring ${policy.expiry_date}`,
            metadata: { policy_id: policy.id, window: w.days, urgency: w.urgency },
          });
        }
      }
    }

    if (action === "recover" || action === "all") {
      // Find policies expired in last 90 days that haven't been renewed
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: lapsed } = await supabase
        .from("insurance_policies")
        .select("*, insurance_clients(id, customer_name, phone, vehicle_number)")
        .eq("status", "active")
        .lt("expiry_date", now.toISOString().split("T")[0])
        .gte("expiry_date", ninetyDaysAgo.toISOString().split("T")[0]);

      if (lapsed) {
        for (const policy of lapsed) {
          const client = policy.insurance_clients;
          if (!client?.phone) continue;

          // Check if recovery already attempted
          const { data: tracked } = await supabase
            .from("insurance_renewal_tracking")
            .select("id")
            .eq("policy_id", policy.id)
            .eq("reminder_type", "recovery")
            .limit(1);

          if (tracked && tracked.length > 0) continue;

          // Mark policy as expired
          await supabase.from("insurance_policies")
            .update({ status: "expired" })
            .eq("id", policy.id);

          // Trigger recovery WhatsApp
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/wa-automation-trigger`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SERVICE_KEY}`,
              },
              body: JSON.stringify({
                event: "insurance_renewal_lapsed",
                phone: client.phone,
                name: client.customer_name || "Customer",
                data: {
                  expiry_date: policy.expiry_date,
                  insurer: policy.insurer || "",
                  vehicle: client.vehicle_number || "",
                },
              }),
            });
          } catch (e) {
            console.error("Recovery WA failed:", e);
          }

          await supabase.from("insurance_renewal_tracking").insert({
            policy_id: policy.id,
            client_id: client.id,
            reminder_type: "recovery",
            status: "recovery_sent",
            notes: "Lapsed policy recovery attempt",
          });

          await supabase.from("insurance_tasks").insert({
            client_id: client.id,
            task_type: "renewal_followup",
            title: `LAPSED: ${client.customer_name || client.phone}`,
            description: `Policy expired on ${policy.expiry_date}. Urgent recovery needed. Customer may face inspection/price hike.`,
            priority: "critical",
            status: "pending",
          });

          results.recovered++;
        }
      }
    }

    console.log("Renewal engine results:", results);

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
