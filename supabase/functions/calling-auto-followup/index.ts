import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * CALLING AUTO FOLLOW-UP ENGINE
 * Sends 2 daily WhatsApp follow-ups to Interested/Hot calling-queue contacts.
 * Run twice daily via pg_cron (10:00 IST and 18:00 IST).
 *
 * Skips:
 *  - contacts with auto_followup_enabled = false
 *  - contacts already converted to a lead (lead_id IS NOT NULL) — they go through CRM follow-up engine
 *  - contacts that already received a message in the same slot today
 *  - contacts whose phone is in wa_opt_outs
 */

const TEMPLATES: Record<string, { morning: string; evening: string }> = {
  default: {
    morning: "Hi {name} 👋, GrabYourCar team here. Bas check kar rahe the agar koi sawaal ho ya help chahiye? Reply karo, hum turant assist karenge.",
    evening: "Hi {name}, sham ko ek quick reminder. Aapne interest dikhaya tha — kya koi convenient time hai aaj/kal call ke liye? Reply with YES.",
  },
  insurance: {
    morning: "Hi {name} 👋, GrabYourCar Insurance. Aapke vehicle ka best quote ready hai. Premium 20% tak save kar sakte hain. Reply YES to share quote.",
    evening: "Hi {name}, reminder — aapka insurance quote pending hai. Aaj sham 7 baje tak confirm karenge to instant policy issue ho jayegi. Reply karo.",
  },
  loans: {
    morning: "Hi {name} 👋, GrabYourCar Loans. Aapke profile pe 8.5%* car loan pre-approved hai. Documents ready ho to 24 hrs me disbursal. Reply YES.",
    evening: "Hi {name}, evening update — aapki loan inquiry pe quote tayar hai. Reply karo, tomorrow morning sanction letter share kar denge.",
  },
  sales: {
    morning: "Hi {name} 👋, GrabYourCar Sales. Aapne jis car me interest dikhaya tha uska best deal + finance option ready hai. Reply for details.",
    evening: "Hi {name}, sham ki update — aaj ka special discount aapke liye reserve hai. Reply YES, we'll lock it for tomorrow's visit.",
  },
  hsrp: {
    morning: "Hi {name} 👋, GrabYourCar HSRP. Aapki HSRP booking pending hai. 5 minute me complete ho jayegi. Reply YES to continue.",
    evening: "Hi {name}, reminder — HSRP fitment slots tomorrow available hain. Reply karo to confirm karein.",
  },
  rentals: {
    morning: "Hi {name} 👋, GrabYourCar Self-Drive. Aapke dates ke liye cars available hain. Reply with city + dates, instant quote bhejte hain.",
    evening: "Hi {name}, weekend approach kar raha hai 🚗 — aapne self-drive me interest dikhaya tha. Reply karo to lock the car.",
  },
};

function pickTemplate(vertical: string, slot: "morning" | "evening", name: string): string {
  const tpl = TEMPLATES[vertical] || TEMPLATES.default;
  return tpl[slot].replace(/\{name\}/g, name || "Customer");
}

function currentSlotIST(): "morning" | "evening" {
  const now = new Date();
  // IST = UTC + 5:30
  const istHour = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;
  return istHour < 14 ? "morning" : "evening";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Allow override via body for manual testing
  let slot: "morning" | "evening" = currentSlotIST();
  let dryRun = false;
  try {
    const body = await req.json();
    if (body?.slot === "morning" || body?.slot === "evening") slot = body.slot;
    if (body?.dryRun) dryRun = true;
  } catch { /* no body */ }

  const today = new Date().toISOString().split("T")[0];

  try {
    // Pull all interested/hot contacts that haven't been converted to leads
    const { data: contacts, error } = await supabase
      .from("auto_dialer_contacts")
      .select("id, campaign_id, phone, name, disposition, vertical_slug:campaign_id, last_auto_followup_at, auto_followup_count, auto_dialer_campaigns!inner(vertical_slug)")
      .in("disposition", ["interested", "hot"])
      .eq("auto_followup_enabled", true)
      .is("lead_id", null)
      .limit(500);

    if (error) throw error;
    if (!contacts?.length) {
      return new Response(JSON.stringify({ success: true, slot, sent: 0, message: "No eligible contacts" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0, skipped = 0, failed = 0;

    for (const c of contacts as any[]) {
      const vertical = c.auto_dialer_campaigns?.vertical_slug || "default";
      const phone = String(c.phone).replace(/\D/g, "");
      if (phone.length < 10) { skipped++; continue; }

      // Skip if already sent in this slot today
      const { data: existing } = await supabase
        .from("calling_auto_followup_log")
        .select("id")
        .eq("contact_id", c.id)
        .eq("send_slot", slot)
        .gte("sent_at", `${today}T00:00:00.000Z`)
        .limit(1);
      if (existing?.length) { skipped++; continue; }

      // Skip if opted out
      const { data: optOut } = await supabase
        .from("wa_opt_outs")
        .select("id")
        .or(`phone.eq.${phone},phone.eq.91${phone}`)
        .limit(1);
      if (optOut?.length) {
        skipped++;
        await supabase.from("auto_dialer_contacts")
          .update({ auto_followup_enabled: false, auto_followup_paused_at: new Date().toISOString() })
          .eq("id", c.id);
        continue;
      }

      const message = pickTemplate(vertical, slot, c.name || "Customer");

      if (dryRun) {
        sent++;
        continue;
      }

      // Send via whatsapp-send edge function
      let sendOk = false;
      let errMsg: string | null = null;
      try {
        const { error: waErr } = await supabase.functions.invoke("whatsapp-send", {
          body: {
            to: phone,
            message,
            messageType: "text",
            message_context: "calling_auto_followup",
            name: c.name || "Customer",
            logEvent: `calling_auto_followup_${slot}`,
            vertical,
          },
        });
        if (waErr) throw waErr;
        sendOk = true;
      } catch (e: any) {
        errMsg = e?.message || String(e);
      }

      // Log the attempt
      await supabase.from("calling_auto_followup_log").insert({
        contact_id: c.id,
        campaign_id: c.campaign_id,
        vertical_slug: vertical,
        phone,
        customer_name: c.name,
        disposition: c.disposition,
        message_sent: message,
        channel: "whatsapp",
        status: sendOk ? "sent" : "failed",
        error_message: errMsg,
        send_slot: slot,
      });

      if (sendOk) {
        await supabase.from("auto_dialer_contacts")
          .update({
            last_auto_followup_at: new Date().toISOString(),
            auto_followup_count: (c.auto_followup_count || 0) + 1,
          })
          .eq("id", c.id);
        sent++;
      } else {
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, slot, sent, skipped, failed, total: contacts.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("calling-auto-followup error:", e);
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
