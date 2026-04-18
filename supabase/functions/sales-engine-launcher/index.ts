// Sales Engine Launcher — Bulk-trigger an engine for a list of phones.
// Sends the initial step message + creates a session per phone.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(p: string) {
  const d = String(p || "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10) return `91${d}`;
  return d;
}

async function sendInitial(toPhone: string, step: any) {
  const TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!TOKEN || !PHONE_ID) throw new Error("WhatsApp creds missing");

  const to = normalizePhone(toPhone);
  const messageType = step.message_type || "text";
  const body = step.message_text;
  const mediaUrl = step.media_url;

  let payload: Record<string, unknown>;
  if (step.template_name) {
    // Use template (required if window not open)
    payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: step.template_name,
        language: { code: "en" },
      },
    };
  } else if (mediaUrl && ["image", "video", "document", "audio"].includes(messageType)) {
    payload = {
      messaging_product: "whatsapp", recipient_type: "individual", to, type: messageType,
      [messageType]: { link: mediaUrl, ...(messageType !== "audio" && body ? { caption: body } : {}) },
    };
  } else {
    payload = {
      messaging_product: "whatsapp", recipient_type: "individual", to, type: "text",
      text: { body },
    };
  }

  const resp = await fetch(`https://graph.facebook.com/v25.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(payload),
  });
  const result = await resp.json();
  return { ok: resp.ok, wa_id: result.messages?.[0]?.id || null, error: result.error || null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { engine_id, phones, campaign_id } = await req.json();

    if (!engine_id || !Array.isArray(phones) || phones.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "engine_id and phones[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load engine + initial step
    const { data: engine } = await supabase.from("sales_engines").select("*").eq("id", engine_id).maybeSingle();
    if (!engine) {
      return new Response(JSON.stringify({ success: false, error: "Engine not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!engine.is_active) {
      return new Response(JSON.stringify({ success: false, error: "Engine is paused. Activate it first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: initialStep } = await supabase
      .from("sales_engine_steps")
      .select("*")
      .eq("engine_id", engine_id)
      .eq("is_initial", true)
      .order("step_order")
      .limit(1)
      .maybeSingle();

    let stepToSend = initialStep;
    if (!stepToSend) {
      const { data: firstStep } = await supabase
        .from("sales_engine_steps")
        .select("*")
        .eq("engine_id", engine_id)
        .order("step_order")
        .limit(1)
        .maybeSingle();
      stepToSend = firstStep;
    }
    if (!stepToSend) {
      return new Response(JSON.stringify({ success: false, error: "Engine has no steps" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    let sent = 0, failed = 0, skipped = 0;

    for (const rawPhone of phones) {
      const phone = normalizePhone(rawPhone);
      if (!phone || phone.length < 11) { failed++; results.push({ phone: rawPhone, ok: false, error: "invalid phone" }); continue; }

      // Skip if there's already an active session
      const { data: existing } = await supabase
        .from("sales_engine_sessions")
        .select("id")
        .eq("phone", phone)
        .eq("engine_id", engine_id)
        .in("status", ["pending_reply", "active"])
        .maybeSingle();
      if (existing) { skipped++; results.push({ phone, ok: false, error: "already active" }); continue; }

      // Send message
      try {
        const sendRes = await sendInitial(phone, stepToSend);
        if (!sendRes.ok) {
          failed++;
          results.push({ phone, ok: false, error: sendRes.error?.message || "send failed" });
          continue;
        }

        // Create session
        const { data: newSession } = await supabase.from("sales_engine_sessions").insert({
          engine_id,
          phone,
          current_step_key: stepToSend.step_key,
          status: "pending_reply",
          triggered_by_campaign: campaign_id || null,
          last_message_sent_at: new Date().toISOString(),
        }).select("id").single();

        if (newSession) {
          await supabase.from("sales_engine_session_logs").insert({
            session_id: newSession.id,
            direction: "outbound",
            step_key: stepToSend.step_key,
            message_text: stepToSend.message_text,
            message_type: stepToSend.message_type || "text",
          });
        }

        // Mirror to inbox
        const windowExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const { data: existingConvo } = await supabase
          .from("wa_conversations").select("id").eq("phone", phone).maybeSingle();
        let convoId = existingConvo?.id;
        if (!convoId) {
          const { data: newConvo } = await supabase.from("wa_conversations").insert({
            phone, last_message: stepToSend.message_text?.slice(0, 200), last_message_at: new Date().toISOString(),
            window_expires_at: windowExpiry, status: "active",
          }).select("id").single();
          convoId = newConvo?.id;
        } else {
          await supabase.from("wa_conversations").update({
            last_message: stepToSend.message_text?.slice(0, 200), last_message_at: new Date().toISOString(),
          }).eq("id", convoId);
        }
        if (convoId) {
          await supabase.from("wa_inbox_messages").insert({
            conversation_id: convoId, direction: "outbound", message_type: stepToSend.message_type || "text",
            content: stepToSend.message_text, media_url: stepToSend.media_url,
            wa_message_id: sendRes.wa_id, status: "sent", sent_by_name: `Engine: ${engine.name}`,
          });
        }

        sent++;
        results.push({ phone, ok: true, wa_id: sendRes.wa_id });
      } catch (e) {
        failed++;
        results.push({ phone, ok: false, error: String(e) });
      }

      // brief pacing to avoid Meta rate limits
      await new Promise((r) => setTimeout(r, 250));
    }

    return new Response(JSON.stringify({ success: true, sent, failed, skipped, total: phones.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sales-engine-launcher error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
