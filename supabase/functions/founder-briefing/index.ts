import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Mode = "daily" | "weekly";

interface BriefingPayload {
  mode?: Mode;
  testPhone?: string;
}

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n || 0);

function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (clean.startsWith("91") && clean.length === 12) return clean;
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

async function sendWhatsAppText(phone: string, body: string): Promise<{ success: boolean; error?: string }> {
  const TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!TOKEN || !PHONE_ID) return { success: false, error: "WA env missing" };

  try {
    const resp = await fetch(`https://graph.facebook.com/v25.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(phone),
        type: "text",
        text: { preview_url: false, body },
      }),
    });
    const json = await resp.json();
    if (!resp.ok) return { success: false, error: json?.error?.message || "WA send failed" };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "WA send error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { mode = "daily", testPhone }: BriefingPayload =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // Get founder phones from admin_settings
    const { data: settingRow } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "founder_briefing_config")
      .maybeSingle();

    const config = (settingRow?.setting_value || {}) as {
      enabled?: boolean;
      phones?: string[];
      daily_enabled?: boolean;
      weekly_enabled?: boolean;
    };

    if (!testPhone) {
      if (config.enabled === false) {
        return new Response(JSON.stringify({ success: false, skipped: "disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (mode === "daily" && config.daily_enabled === false) {
        return new Response(JSON.stringify({ success: false, skipped: "daily disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (mode === "weekly" && config.weekly_enabled === false) {
        return new Response(JSON.stringify({ success: false, skipped: "weekly disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const recipients = testPhone ? [testPhone] : (config.phones || []).filter(Boolean);
    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No founder phones configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Time window
    const now = new Date();
    const windowFrom =
      mode === "weekly"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const windowLabel = mode === "weekly" ? "Last 7 Days" : "Yesterday";

    // ---- Fetch wins (deals received)
    const { data: deals } = await supabase
      .from("deals")
      .select("vertical_name,deal_value,payment_received_amount,payment_status,closed_at")
      .gte("closed_at", windowFrom.toISOString())
      .eq("payment_status", "received");

    const totalRevenue = (deals || []).reduce(
      (sum, d: any) => sum + Number(d.payment_received_amount || d.deal_value || 0),
      0,
    );
    const totalDeals = deals?.length || 0;

    const byVertical = new Map<string, { count: number; rev: number }>();
    (deals || []).forEach((d: any) => {
      const v = d.vertical_name || "Unknown";
      const ex = byVertical.get(v) || { count: 0, rev: 0 };
      ex.count += 1;
      ex.rev += Number(d.payment_received_amount || d.deal_value || 0);
      byVertical.set(v, ex);
    });
    const topVerticals = Array.from(byVertical.entries())
      .sort((a, b) => b[1].rev - a[1].rev)
      .slice(0, 3);

    // ---- Risk alerts
    const { data: overdueTasks } = await supabase
      .from("ai_cofounder_tasks")
      .select("title,team_member_name,due_date")
      .eq("is_overdue", true)
      .neq("status", "completed")
      .limit(5);

    const { data: riskRows } = await supabase
      .from("ai_risk_indicators")
      .select("title,severity,description")
      .is("resolved_at", null)
      .gte("created_at", windowFrom.toISOString())
      .order("severity", { ascending: false })
      .limit(3);

    // ---- Targets snapshot (current month)
    const monthYear = now.toISOString().slice(0, 7);
    const { data: targets } = await supabase
      .from("team_targets")
      .select("vertical_name,target_revenue")
      .eq("month_year", monthYear);
    const totalTargetRev = (targets || []).reduce((s: number, t: any) => s + Number(t.target_revenue || 0), 0);

    // Month-to-date achieved
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: mtdDeals } = await supabase
      .from("deals")
      .select("payment_received_amount,deal_value")
      .gte("closed_at", monthStart)
      .eq("payment_status", "received");
    const mtdRev = (mtdDeals || []).reduce(
      (s: number, d: any) => s + Number(d.payment_received_amount || d.deal_value || 0),
      0,
    );
    const mtdPct = totalTargetRev > 0 ? Math.round((mtdRev / totalTargetRev) * 100) : 0;

    // ---- Compose message
    const lines: string[] = [];
    const heading = mode === "weekly" ? "📊 *Weekly Founder Briefing*" : "📊 *Daily Founder Briefing*";
    lines.push(heading);
    lines.push(`_${windowLabel} • ${now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}_`);
    lines.push("");

    // Wins
    lines.push("✅ *TOP WINS*");
    if (totalDeals === 0) {
      lines.push("• No deals closed in this window");
    } else {
      lines.push(`• ${totalDeals} deal(s) closed`);
      lines.push(`• Revenue: ₹${formatINR(totalRevenue)}`);
      if (topVerticals.length > 0) {
        lines.push("• Top verticals:");
        topVerticals.forEach(([name, s]) => {
          lines.push(`   - ${name}: ₹${formatINR(s.rev)} (${s.count} deals)`);
        });
      }
    }
    lines.push("");

    // Targets
    lines.push("🎯 *MONTH-TO-DATE TARGET*");
    if (totalTargetRev === 0) {
      lines.push("• No targets set for this month");
    } else {
      const statusEmoji = mtdPct >= 100 ? "🟢" : mtdPct >= 70 ? "🟡" : "🔴";
      lines.push(`${statusEmoji} ${mtdPct}% achieved`);
      lines.push(`• ₹${formatINR(mtdRev)} of ₹${formatINR(totalTargetRev)}`);
    }
    lines.push("");

    // Risks
    lines.push("⚠️ *RISK ALERTS*");
    const hasRisks = (riskRows?.length || 0) > 0 || (overdueTasks?.length || 0) > 0;
    if (!hasRisks) {
      lines.push("• No open alerts ✨");
    } else {
      (riskRows || []).slice(0, 3).forEach((r: any) => {
        lines.push(`• [${(r.severity || "med").toUpperCase()}] ${r.title}`);
      });
      if ((overdueTasks?.length || 0) > 0) {
        lines.push(`• ${overdueTasks!.length} overdue task(s) need action`);
      }
    }
    lines.push("");
    lines.push("_Open Founder Cockpit for full report_");

    const message = lines.join("\n");

    // Send to all recipients
    const results: Array<{ phone: string; success: boolean; error?: string }> = [];
    for (const phone of recipients) {
      const r = await sendWhatsAppText(phone, message);
      results.push({ phone, ...r });
    }

    // Log
    await supabase.from("auto_pilot_logs").insert({
      agent_type: `founder_briefing_${mode}`,
      status: results.every((r) => r.success) ? "success" : "partial",
      summary: `Sent ${results.filter((r) => r.success).length}/${results.length} briefings`,
      messages_sent: results.filter((r) => r.success).length,
      details: { mode, results, totalDeals, totalRevenue, mtdPct },
      completed_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
        preview: message,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[founder-briefing] error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
