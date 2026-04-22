import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * KPI Alerts Evaluator
 * --------------------
 * Runs every 15 min via pg_cron. Evaluates configured rules in
 * `marketing_alerts` and writes triggered events to `kpi_alert_events`.
 *
 * Supported alert types:
 *  - spend_spike   : ad spend in last 24h > threshold
 *  - low_roi       : ROI in last 7d < threshold (%)
 *  - target_miss   : current month target_revenue achievement < threshold (%)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AlertRule {
  id: string;
  alert_type: string;
  threshold: number | null;
  vertical: string | null;
  notify_roles: string[] | null;
  is_active: boolean;
  cooldown_minutes: number | null;
  last_triggered_at: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { data: rules, error: rulesErr } = await supabase
      .from("marketing_alerts")
      .select("*")
      .eq("is_active", true);
    if (rulesErr) throw rulesErr;

    const now = new Date();
    const events: any[] = [];
    const triggered: string[] = [];

    for (const rule of (rules || []) as AlertRule[]) {
      // Cooldown
      if (rule.last_triggered_at && rule.cooldown_minutes) {
        const last = new Date(rule.last_triggered_at).getTime();
        if (now.getTime() - last < rule.cooldown_minutes * 60_000) {
          continue;
        }
      }

      let triggeredEvent: any = null;

      if (rule.alert_type === "spend_spike") {
        const since = new Date(now.getTime() - 24 * 3600_000).toISOString();
        let q = supabase
          .from("ad_campaigns")
          .select("total_spend, vertical")
          .gte("created_at", since);
        if (rule.vertical) q = q.eq("vertical", rule.vertical);
        const { data: ads } = await q;
        const totalSpend = (ads || []).reduce(
          (s: number, r: any) => s + Number(r.total_spend || 0),
          0,
        );
        if (totalSpend > Number(rule.threshold || 0)) {
          triggeredEvent = {
            rule_id: rule.id,
            alert_type: rule.alert_type,
            severity: "high",
            title: "Ad spend spike",
            message: `Spend in last 24h is ₹${totalSpend.toLocaleString("en-IN")}, above threshold ₹${Number(rule.threshold).toLocaleString("en-IN")}.`,
            value: totalSpend,
            threshold: rule.threshold,
            vertical: rule.vertical,
            notify_roles: rule.notify_roles,
          };
        }
      } else if (rule.alert_type === "low_roi") {
        const since = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
        const [adsRes, dealsRes] = await Promise.all([
          supabase
            .from("ad_campaigns")
            .select("total_spend")
            .gte("created_at", since),
          supabase
            .from("deals")
            .select("payment_received_amount, deal_value")
            .gte("closed_at", since)
            .in("payment_status", ["received", "partial"]),
        ]);
        const spend = (adsRes.data || []).reduce(
          (s: number, r: any) => s + Number(r.total_spend || 0),
          0,
        );
        const revenue = (dealsRes.data || []).reduce(
          (s: number, r: any) =>
            s + Number(r.payment_received_amount || r.deal_value || 0),
          0,
        );
        const roi = spend > 0 ? Math.round(((revenue - spend) / spend) * 100) : 0;
        if (spend > 0 && roi < Number(rule.threshold || 0)) {
          triggeredEvent = {
            rule_id: rule.id,
            alert_type: rule.alert_type,
            severity: "medium",
            title: "Low ROI detected",
            message: `7-day ROI is ${roi}%, below threshold ${rule.threshold}%.`,
            value: roi,
            threshold: rule.threshold,
            notify_roles: rule.notify_roles,
          };
        }
      } else if (rule.alert_type === "target_miss") {
        const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { data: targets } = await supabase
          .from("team_targets")
          .select("vertical_name, target_revenue")
          .eq("month_year", monthYear)
          .eq("period_type", "month");
        const totalTarget = (targets || []).reduce(
          (s: number, r: any) => s + Number(r.target_revenue || 0),
          0,
        );
        if (totalTarget > 0) {
          const { data: deals } = await supabase
            .from("deals")
            .select("payment_received_amount, deal_value")
            .gte("closed_at", monthStart)
            .in("payment_status", ["received", "partial"]);
          const achieved = (deals || []).reduce(
            (s: number, r: any) =>
              s + Number(r.payment_received_amount || r.deal_value || 0),
            0,
          );
          // Pace check: expect linear achievement based on day of month
          const dayOfMonth = now.getDate();
          const daysInMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
          ).getDate();
          const expectedPct = Math.round((dayOfMonth / daysInMonth) * 100);
          const actualPct = Math.round((achieved / totalTarget) * 100);
          const gap = expectedPct - actualPct;
          if (gap > Number(rule.threshold || 15)) {
            triggeredEvent = {
              rule_id: rule.id,
              alert_type: rule.alert_type,
              severity: gap > 30 ? "high" : "medium",
              title: "Monthly target at risk",
              message: `Achievement ${actualPct}% vs expected pace ${expectedPct}% (gap ${gap}%).`,
              value: actualPct,
              threshold: rule.threshold,
              notify_roles: rule.notify_roles,
            };
          }
        }
      }

      if (triggeredEvent) {
        events.push(triggeredEvent);
        triggered.push(rule.id);
      }
    }

    if (events.length > 0) {
      const { error: insErr } = await supabase
        .from("kpi_alert_events")
        .insert(events);
      if (insErr) console.error("insert events failed:", insErr);

      // Update last_triggered_at
      await supabase
        .from("marketing_alerts")
        .update({ last_triggered_at: now.toISOString() })
        .in("id", triggered);
    }

    return new Response(
      JSON.stringify({
        success: true,
        evaluated: rules?.length || 0,
        triggered: events.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[kpi-alerts-evaluator] error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
