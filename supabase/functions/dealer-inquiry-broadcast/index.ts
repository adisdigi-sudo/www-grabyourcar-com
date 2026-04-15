import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(phone: string): { full: string; short: string; valid: boolean } {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  let short = clean;
  if (clean.startsWith("91") && clean.length === 12) short = clean.slice(2);
  return { full: `91${short}`, short, valid: /^[6-9]\d{9}$/.test(short) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { phones, message, brand } = await req.json();

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return new Response(JSON.stringify({ error: "phones array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!message) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0, failed = 0;
    const errors: string[] = [];

    for (const rawPhone of phones) {
      const phone = normalizePhone(rawPhone);
      if (!phone.valid) { failed++; errors.push(`Invalid: ${rawPhone}`); continue; }

      try {
        const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phone.full,
            type: "text",
            text: { preview_url: false, body: message },
          }),
        });

        const result = await resp.json();
        if (resp.ok && result.messages?.[0]?.id) {
          sent++;
        } else {
          failed++;
          errors.push(`${rawPhone}: ${result.error?.message || "Unknown error"}`);
        }
      } catch (e) {
        failed++;
        errors.push(`${rawPhone}: ${e instanceof Error ? e.message : "Send error"}`);
      }

      // Rate limit: 200ms between messages
      await new Promise(r => setTimeout(r, 200));
    }

    // Log to dealer_broadcast_logs
    await supabase.from("dealer_broadcast_logs").insert({
      broadcast_type: "dealer_inquiry",
      message_template: message,
      recipient_count: phones.length,
      sent_by: "admin",
      status: failed === phones.length ? "failed" : "sent",
      details: { brand, sent, failed, errors: errors.slice(0, 20) },
    });

    console.log(`Dealer inquiry broadcast: ${sent} sent, ${failed} failed / ${phones.length}`);

    return new Response(JSON.stringify({
      success: true,
      summary: { total: phones.length, sent, failed },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Dealer inquiry broadcast error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
