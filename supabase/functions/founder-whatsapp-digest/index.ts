import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Founder WhatsApp Digest
 * Runs at 9 AM and 7 PM daily — sends a comprehensive ops summary on WhatsApp
 *
 * POST body:
 * {
 *   "frequency": "morning" | "evening",       // default: morning
 *   "recipient_phones": ["+91..."],           // optional, falls back to auto_pilot_config
 *   "test": true                              // skip send, return preview
 * }
 */

interface DigestSnapshot {
  newLeadsToday: number;
  totalCallsToday: number;
  hotLeads: number;
  conversionsToday: number;
  revenueToday: number;
  attendanceCheckedIn: number;
  attendanceTotal: number;
  topPerformer: string | null;
  bottomPerformer: string | null;
  pendingFollowups: number;
  newPolicies: number;
  newHSRPBookings: number;
  newRentals: number;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const buildMessage = (snap: DigestSnapshot, frequency: string, dateLabel: string) => {
  const greeting = frequency === "morning" ? "🌅 Good morning" : "🌇 Evening update";
  return `${greeting}, Founder!
*GrabYourCar Daily Digest*  •  ${dateLabel}

📊 *Today's Snapshot*
• New leads: *${snap.newLeadsToday}*
• Calls made: *${snap.totalCallsToday}*
• Hot 🔥: *${snap.hotLeads}*
• Conversions: *${snap.conversionsToday}*
• Revenue: *${formatCurrency(snap.revenueToday)}*
• Pending follow-ups: *${snap.pendingFollowups}*

🛡️ Policies issued: *${snap.newPolicies}*
🚗 HSRP bookings: *${snap.newHSRPBookings}*
🔑 Rentals: *${snap.newRentals}*

👥 *Attendance:* ${snap.attendanceCheckedIn}/${snap.attendanceTotal} checked-in
🏆 Top performer: *${snap.topPerformer || "—"}*
📉 Needs push: *${snap.bottomPerformer || "—"}*

— GYC Auto-Pilot 🤖`;
};

async function gatherSnapshot(supabase: ReturnType<typeof createClient>): Promise<DigestSnapshot> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isoStart = todayStart.toISOString();

  const safeCount = async (q: any): Promise<number> => {
    try {
      const { count } = await q;
      return count ?? 0;
    } catch {
      return 0;
    }
  };

  const [newLeads, hotLeads, calls, policies, hsrp, rentals, deals, followups, attendance] = await Promise.all([
    safeCount(supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", isoStart)),
    safeCount(supabase.from("leads").select("id", { count: "exact", head: true }).eq("priority", "hot")),
    safeCount(supabase.from("auto_dialer_dispositions").select("id", { count: "exact", head: true }).gte("created_at", isoStart)),
    safeCount(supabase.from("insurance_policies").select("id", { count: "exact", head: true }).gte("created_at", isoStart)),
    safeCount(supabase.from("hsrp_bookings").select("id", { count: "exact", head: true }).gte("created_at", isoStart)),
    safeCount(supabase.from("rental_bookings").select("id", { count: "exact", head: true }).gte("created_at", isoStart)),
    supabase.from("deals").select("payment_received_amount").gte("created_at", isoStart).eq("payment_status", "received"),
    safeCount(supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "follow-up")),
    supabase.from("attendance_records").select("status,team_member_name").eq("attendance_date", todayStart.toISOString().slice(0, 10)),
  ]);

  let revenue = 0;
  let conversionsToday = 0;
  if ((deals as any).data) {
    for (const d of (deals as any).data as Array<{ payment_received_amount: number | null }>) {
      if (d.payment_received_amount) {
        revenue += Number(d.payment_received_amount);
        conversionsToday += 1;
      }
    }
  }

  let checkedIn = 0;
  let total = 0;
  if ((attendance as any).data) {
    for (const a of (attendance as any).data as Array<{ status: string | null }>) {
      total += 1;
      if (a.status === "present" || a.status === "checked_in") checkedIn += 1;
    }
  }

  // Top/bottom performer based on dispositions
  const { data: perf } = await supabase
    .from("auto_dialer_dispositions")
    .select("dialed_by_email")
    .gte("created_at", isoStart);

  const counts = new Map<string, number>();
  (perf || []).forEach((row: any) => {
    if (row.dialed_by_email) counts.set(row.dialed_by_email, (counts.get(row.dialed_by_email) || 0) + 1);
  });
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const topPerformer = sorted[0]?.[0] || null;
  const bottomPerformer = sorted.length > 1 ? sorted[sorted.length - 1][0] : null;

  return {
    newLeadsToday: newLeads,
    totalCallsToday: calls,
    hotLeads,
    conversionsToday,
    revenueToday: revenue,
    attendanceCheckedIn: checkedIn,
    attendanceTotal: total,
    topPerformer,
    bottomPerformer,
    pendingFollowups: followups,
    newPolicies: policies,
    newHSRPBookings: hsrp,
    newRentals: rentals,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const frequency: "morning" | "evening" = body.frequency === "evening" ? "evening" : "morning";
    const test = body.test === true;
    let recipients: string[] = Array.isArray(body.recipient_phones) ? body.recipient_phones : [];

    if (recipients.length === 0) {
      const { data: cfg } = await supabase
        .from("auto_pilot_config")
        .select("recipient_phones")
        .eq("agent_type", "founder_digest")
        .maybeSingle();
      if (cfg && Array.isArray((cfg as any).recipient_phones)) {
        recipients = (cfg as any).recipient_phones;
      }
    }

    const snap = await gatherSnapshot(supabase);
    const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const message = buildMessage(snap, frequency, dateLabel);

    if (test) {
      return new Response(JSON.stringify({ success: true, preview: message, snapshot: snap }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No recipients configured. Set in auto_pilot_config (agent_type='founder_digest')." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let sent = 0;
    let failed = 0;
    for (const phone of recipients) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            to: phone,
            messageType: "text",
            message,
            logEvent: `founder_digest_${frequency}`,
          }),
        });
        if (res.ok) sent += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }

    // Log run
    await supabase.from("auto_pilot_logs").insert({
      agent_type: "founder_digest",
      status: failed === 0 ? "success" : sent > 0 ? "partial" : "failed",
      messages_sent: sent,
      summary: `Sent ${frequency} digest to ${sent}/${recipients.length} recipients`,
      details: { snapshot: snap, frequency, recipients: recipients.length, failed },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, sent, failed, snapshot: snap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Founder digest error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
