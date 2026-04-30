// WhatsApp Auto-Followup Worker
// Reads wa_followup_sequences and sends followups to leads in wa_conversations
// that haven't replied within day_offset days. Idempotent: logs to wa_followup_logs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const result = { processed: 0, sent: 0, skipped: 0, errors: [] as any[] };

  try {
    // Load active sequences
    const { data: sequences, error: seqErr } = await supabase
      .from("wa_followup_sequences")
      .select("id,name,trigger_event,day_offset,message_text,is_active")
      .eq("is_active", true);
    if (seqErr) throw seqErr;

    for (const seq of sequences || []) {
      // Find candidate conversations: last_message_at older than day_offset days
      const cutoff = new Date(Date.now() - Number(seq.day_offset) * 24 * 60 * 60 * 1000).toISOString();

      const { data: convos } = await supabase
        .from("wa_conversations")
        .select("id,phone,customer_name,last_message_at,status")
        .lt("last_message_at", cutoff)
        .neq("status", "closed")
        .limit(500);

      for (const c of convos || []) {
        result.processed++;
        const phone = String(c.phone || "").replace(/\D/g, "");
        if (!phone || phone.length < 10) { result.skipped++; continue; }

        // Skip if we already sent THIS sequence to THIS phone in last 24h
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("wa_followup_logs")
          .select("id", { count: "exact", head: true })
          .eq("lead_phone", phone)
          .eq("sequence_id", seq.id)
          .gte("sent_at", since);
        if ((count || 0) > 0) { result.skipped++; continue; }

        const message = (seq.message_text || "")
          .replace(/\{\{name\}\}/gi, c.customer_name || "Customer")
          .replace(/\{\{phone\}\}/gi, phone);

        try {
          const { error: sendErr } = await supabase.functions.invoke("whatsapp-send", {
            body: { to: phone, message, type: "text" },
          });

          await supabase.from("wa_followup_logs").insert({
            lead_phone: phone,
            sequence_id: seq.id,
            message_text: message,
            status: sendErr ? "failed" : "sent",
            error: sendErr ? String(sendErr.message || sendErr) : null,
          });

          if (sendErr) result.errors.push({ phone, seq: seq.name, error: sendErr.message });
          else result.sent++;
        } catch (e) {
          result.errors.push({ phone, seq: seq.name, error: String(e) });
          await supabase.from("wa_followup_logs").insert({
            lead_phone: phone,
            sequence_id: seq.id,
            message_text: message,
            status: "failed",
            error: String(e),
          });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("wa-followup-worker error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message, ...result }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
