// Sales Engine Router — handles inbound replies for an active engine session.
// Returns { handled: true } if a session was advanced, otherwise { handled: false }
// so the webhook can continue with chatbot rules / AI brain.

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

async function sendWhatsAppText(toPhone: string, body: string, mediaUrl?: string | null, messageType?: string | null) {
  const TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!TOKEN || !PHONE_ID) throw new Error("WhatsApp creds missing");

  const to = normalizePhone(toPhone);
  let payload: Record<string, unknown>;

  if (mediaUrl && messageType && ["image", "video", "document", "audio"].includes(messageType)) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: messageType,
      [messageType]: { link: mediaUrl, ...(messageType !== "audio" && body ? { caption: body } : {}) },
    };
  } else {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body },
    };
  }

  const resp = await fetch(`https://graph.facebook.com/v25.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(payload),
  });
  const result = await resp.json();
  return { ok: resp.ok, wa_id: result.messages?.[0]?.id || null, raw: result };
}

function matchBranch(branches: any[], replyText: string) {
  const txt = (replyText || "").trim().toLowerCase();

  // 1. Try keyword/regex matches first (in branch_order)
  const sorted = [...branches].sort((a, b) => (a.branch_order || 0) - (b.branch_order || 0));

  for (const b of sorted) {
    if (b.match_type === "keyword") {
      const kws: string[] = (b.match_keywords || []).map((k: string) => k.toLowerCase().trim()).filter(Boolean);
      if (kws.some((k) => txt.includes(k))) return b;
    } else if (b.match_type === "regex") {
      const kws: string[] = b.match_keywords || [];
      if (kws.some((p) => { try { return new RegExp(p, "i").test(txt); } catch { return false; } })) return b;
    }
  }

  // 2. Fallback "any" branch
  const anyB = sorted.find((b) => b.match_type === "any");
  if (anyB) return anyB;

  // 3. no_match branch
  return sorted.find((b) => b.match_type === "no_match") || null;
}

async function createLeadInVertical(supabase: any, engine: any, session: any) {
  const phone = session.phone;
  const cleanPhone = phone.replace(/^91/, "");
  const name = session.customer_name || "Sales Engine Lead";
  const captured = session.qualification_data || {};

  let table: string | null = null;
  let row: any = null;

  switch (engine.vertical) {
    case "loans":
      table = "loans_pipeline";
      row = {
        customer_name: name,
        phone: cleanPhone,
        stage: "new_inquiry",
        source: `sales_engine:${engine.name}`,
        notes: `Qualified via Sales Engine.\nCaptured: ${JSON.stringify(captured)}`,
      };
      break;
    case "insurance":
      table = "insurance_clients";
      row = {
        customer_name: name,
        phone: cleanPhone,
        lead_status: "new",
        pipeline_stage: "new_lead",
        priority: "medium",
        lead_source: `sales_engine:${engine.name}`,
        notes: `Qualified via Sales Engine.\nCaptured: ${JSON.stringify(captured)}`,
      };
      break;
    case "sales":
      table = "leads";
      row = {
        name, phone: cleanPhone, source: `sales_engine:${engine.name}`,
        status: "new", service_category: "car_sales",
        message: `Sales engine qualified. Captured: ${JSON.stringify(captured)}`,
      };
      break;
    case "hsrp":
      table = "leads";
      row = {
        name, phone: cleanPhone, source: `sales_engine:${engine.name}`,
        status: "new", service_category: "hsrp",
        message: `HSRP engine qualified. Captured: ${JSON.stringify(captured)}`,
      };
      break;
    default:
      table = "leads";
      row = {
        name, phone: cleanPhone, source: `sales_engine:${engine.name}`,
        status: "new", service_category: engine.vertical || "general",
        message: `Sales engine qualified. Captured: ${JSON.stringify(captured)}`,
      };
  }

  const { data, error } = await supabase.from(table).insert(row).select("id").single();
  if (error) {
    console.error("Lead creation failed:", error);
    return { lead_id: null, lead_table: table };
  }
  return { lead_id: data?.id || null, lead_table: table };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { phone, message_text, customer_name } = body;

    if (!phone) {
      return new Response(JSON.stringify({ handled: false, error: "phone required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneE164 = normalizePhone(phone);
    const phoneVariants = [phoneE164, phoneE164.replace(/^91/, "")];

    // Find an active session for this phone
    const { data: sessions } = await supabase
      .from("sales_engine_sessions")
      .select("*")
      .in("phone", phoneVariants)
      .in("status", ["pending_reply", "active"])
      .order("started_at", { ascending: false })
      .limit(1);

    const session = sessions?.[0];
    if (!session) {
      return new Response(JSON.stringify({ handled: false, reason: "no_active_session" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.paused_by_agent) {
      return new Response(JSON.stringify({ handled: false, reason: "session_paused" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load engine
    const { data: engine } = await supabase
      .from("sales_engines")
      .select("*")
      .eq("id", session.engine_id)
      .maybeSingle();

    if (!engine || !engine.is_active) {
      return new Response(JSON.stringify({ handled: false, reason: "engine_inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load current step
    const { data: currentStep } = await supabase
      .from("sales_engine_steps")
      .select("*")
      .eq("engine_id", engine.id)
      .eq("step_key", session.current_step_key)
      .maybeSingle();

    if (!currentStep) {
      return new Response(JSON.stringify({ handled: false, reason: "no_current_step" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log inbound
    await supabase.from("sales_engine_session_logs").insert({
      session_id: session.id,
      direction: "inbound",
      step_key: currentStep.step_key,
      message_text,
    });

    // Capture field if present
    const newCaptured = { ...(session.qualification_data || {}) };
    if (currentStep.capture_field) {
      newCaptured[currentStep.capture_field] = message_text;
    }

    // Get branches
    const { data: branches } = await supabase
      .from("sales_engine_branches")
      .select("*")
      .eq("step_id", currentStep.id);

    const branch = matchBranch(branches || [], message_text);

    if (!branch) {
      // No branch matched and no fallback — just stay
      await supabase.from("sales_engine_sessions").update({
        qualification_data: newCaptured,
        last_reply_at: new Date().toISOString(),
        total_replies: (session.total_replies || 0) + 1,
      }).eq("id", session.id);

      return new Response(JSON.stringify({ handled: false, reason: "no_branch_match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let nextStep: any = null;
    let newStatus = session.status;
    let leadInfo: { lead_id: string | null; lead_table: string | null } = { lead_id: null, lead_table: null };
    let outboundText: string | null = null;
    let outboundMedia: string | null = null;
    let outboundType: string | null = null;

    if (branch.action === "qualify") {
      newStatus = "qualified";
      leadInfo = await createLeadInVertical(supabase, engine, { ...session, qualification_data: newCaptured, customer_name: customer_name || session.customer_name });
    } else if (branch.action === "disqualify") {
      newStatus = "disqualified";
    } else if (branch.action === "handover") {
      newStatus = "handover";
      // Mark conversation for human takeover
      await supabase.from("wa_conversations").update({
        human_takeover: true,
        human_takeover_at: new Date().toISOString(),
      }).eq("phone", phoneE164);
    } else if (branch.action === "end") {
      newStatus = "completed";
    } else if (branch.action === "continue" && branch.next_step_key) {
      const { data: ns } = await supabase
        .from("sales_engine_steps")
        .select("*")
        .eq("engine_id", engine.id)
        .eq("step_key", branch.next_step_key)
        .maybeSingle();
      nextStep = ns;
      if (nextStep) {
        outboundText = nextStep.message_text;
        outboundMedia = nextStep.media_url;
        outboundType = nextStep.message_type;
        if (nextStep.is_terminal) newStatus = "completed";
      }
    }

    // Send outbound message if any
    let waId: string | null = null;
    if (outboundText) {
      try {
        const sendRes = await sendWhatsAppText(phoneE164, outboundText, outboundMedia, outboundType);
        waId = sendRes.wa_id;

        // Log outbound to engine + inbox
        await supabase.from("sales_engine_session_logs").insert({
          session_id: session.id,
          direction: "outbound",
          step_key: nextStep?.step_key,
          branch_matched: branch.match_type,
          message_text: outboundText,
          message_type: outboundType || "text",
        });

        // Mirror in inbox so agent sees it
        const { data: convo } = await supabase
          .from("wa_conversations")
          .select("id")
          .eq("phone", phoneE164)
          .maybeSingle();
        if (convo) {
          await supabase.from("wa_inbox_messages").insert({
            conversation_id: convo.id,
            direction: "outbound",
            message_type: outboundType || "text",
            content: outboundText,
            media_url: outboundMedia,
            wa_message_id: waId,
            status: sendRes.ok ? "sent" : "failed",
            sent_by_name: `Engine: ${engine.name}`,
          });
        }
      } catch (e) {
        console.error("Outbound send failed:", e);
      }
    }

    // Update session
    await supabase.from("sales_engine_sessions").update({
      current_step_key: nextStep?.step_key || session.current_step_key,
      status: newStatus,
      qualification_data: newCaptured,
      last_reply_at: new Date().toISOString(),
      last_message_sent_at: outboundText ? new Date().toISOString() : session.last_message_sent_at,
      total_replies: (session.total_replies || 0) + 1,
      qualified_at: newStatus === "qualified" ? new Date().toISOString() : session.qualified_at,
      lead_id_created: leadInfo.lead_id || session.lead_id_created,
      lead_table: leadInfo.lead_table || session.lead_table,
    }).eq("id", session.id);

    return new Response(JSON.stringify({
      handled: true,
      action: branch.action,
      next_step: nextStep?.step_key || null,
      status: newStatus,
      lead_id: leadInfo.lead_id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("sales-engine-router error:", err);
    return new Response(JSON.stringify({ handled: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
