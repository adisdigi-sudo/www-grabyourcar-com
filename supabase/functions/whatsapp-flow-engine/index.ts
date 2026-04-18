// WhatsApp Flow Engine — Pure DB-driven router (no AI dependency)
// Deployable anywhere: just point WhatsApp webhook here
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface InboundMessage {
  customer_phone: string;
  message_text: string;
  vertical_slug?: string;
  customer_name?: string;
}

// Normalize text for matching
function normalize(text: string): string {
  return (text || "").toLowerCase().trim().replace(/[^\w\s@.]/g, " ").replace(/\s+/g, " ");
}

// Match keywords against message
function matchKeywords(message: string, keywords: string[]): boolean {
  const norm = normalize(message);
  return keywords.some((kw) => {
    const k = normalize(kw);
    return norm === k || norm.includes(k) || k.split(" ").every((w) => norm.includes(w));
  });
}

// Extract identity from message (vehicle no, policy no, phone)
function extractIdentity(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Indian vehicle: HR26AB1234 or HR-26-AB-1234
  const veh = text.match(/[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{1,4}/i);
  if (veh) out.vehicle_number = veh[0].replace(/[-\s]/g, "").toUpperCase();
  // Policy number (alphanumeric 8-20 chars)
  const pol = text.match(/\b[A-Z0-9]{8,20}\b/);
  if (pol && !out.vehicle_number) out.policy_number = pol[0];
  // Phone (10 digits)
  const ph = text.match(/\b[6-9]\d{9}\b/);
  if (ph) out.phone = ph[0];
  return out;
}

// Build payment info reply from action_config
function buildPaymentReply(cfg: any): string {
  if (cfg.reply_template) return cfg.reply_template;
  return `🏦 Payment Details\n\nAccount: ${cfg.account_name}\nA/C No: ${cfg.account_number}\nIFSC: ${cfg.ifsc}\nBank: ${cfg.bank}\n\nUPI: ${cfg.upi_id}\nUPI No: ${cfg.upi_number}`;
}

// Fetch document from DB and return URL/info
async function fetchDocument(cfg: any, identity: Record<string, string>) {
  const lookupVal = identity[cfg.lookup_field];
  if (!lookupVal) return { found: false };

  const { data, error } = await supabase
    .from(cfg.source_table)
    .select("*")
    .ilike(cfg.lookup_field, `%${lookupVal}%`)
    .limit(1)
    .maybeSingle();

  if (error || !data) return { found: false };
  return {
    found: true,
    pdf_url: data[cfg.pdf_url_field] || null,
    record: data,
  };
}

// Fetch sales info (car details, order status, etc.)
async function fetchSalesInfo(cfg: any, message: string) {
  // For cars: match name in message
  if (cfg.source_table === "cars") {
    const norm = normalize(message);
    const { data: cars } = await supabase
      .from("cars")
      .select(cfg.fields_to_send.join(","))
      .limit(50);

    if (!cars) return null;
    const match = (cars as any[]).find((c) =>
      normalize(c.name || "").split(" ").some((w: string) => norm.includes(w) && w.length > 3)
    );
    return match;
  }

  // Generic lookup
  const { data } = await supabase
    .from(cfg.source_table)
    .select(cfg.fields_to_send.join(","))
    .limit(1)
    .maybeSingle();
  return data;
}

function formatSalesReply(record: any, cfg: any): string {
  const prefix = cfg.reply_prefix || "Here are the details:";
  const lines = cfg.fields_to_send.map((f: string) => {
    const label = f.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    return `*${label}:* ${record[f] ?? "—"}`;
  });
  return `${prefix}\n\n${lines.join("\n")}\n\n_Source: grabyourcar.com_`;
}

// Main router
async function routeMessage(input: InboundMessage) {
  const startTime = Date.now();
  const { customer_phone, message_text, vertical_slug } = input;

  // Get or create session
  let { data: session } = await supabase
    .from("whatsapp_flow_sessions")
    .select("*")
    .eq("customer_phone", customer_phone)
    .eq("status", "active")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    const { data: newSession } = await supabase
      .from("whatsapp_flow_sessions")
      .insert({
        customer_phone,
        vertical_slug,
        status: "active",
        collected_variables: extractIdentity(message_text),
      })
      .select()
      .single();
    session = newSession;
  } else {
    // Update collected variables with new identity info
    const newIdentity = extractIdentity(message_text);
    const merged = { ...(session.collected_variables || {}), ...newIdentity };
    await supabase
      .from("whatsapp_flow_sessions")
      .update({ collected_variables: merged, last_message_at: new Date().toISOString() })
      .eq("id", session.id);
    session.collected_variables = merged;
  }

  // Find matching trigger (vertical-specific first, then global)
  const triggerQuery = supabase
    .from("whatsapp_flow_triggers")
    .select("*")
    .eq("is_active", true);

  const { data: triggers } = vertical_slug
    ? await triggerQuery
        .or(`vertical_slug.eq.${vertical_slug},vertical_slug.is.null`)
        .order("priority", { ascending: true })
    : await triggerQuery
        .order("priority", { ascending: true });

  let matched: any = null;
  for (const t of triggers || []) {
    if (matchKeywords(message_text, t.keywords)) {
      matched = t;
      break;
    }
  }

  let outbound = "";
  let attachments: any[] = [];
  let action = "no_match";
  let success = true;
  let errorMsg: string | null = null;

  try {
    if (!matched) {
      // No match → polite redirect
      outbound = `🙏 I didn't quite catch that. Could you rephrase?\n\nYou can ask me for:\n• *Policy* / *Insurance copy*\n• *Sanction letter* / *Loan document*\n• *Invoice* / *Receipt*\n• *Account* / *UPI* (payment details)\n• *Car name* (Fortuner, Creta, etc.)\n• *HSRP status*\n\nOr just type what you need!`;
      action = "no_match_fallback";
    } else if (matched.intent_type === "payment_info") {
      outbound = buildPaymentReply(matched.action_config);
      action = "sent_payment_info";
    } else if (matched.intent_type === "fixed_reply") {
      outbound = matched.action_config.reply_text;
      attachments = matched.action_config.attachments || [];
      action = "sent_fixed_reply";
    } else if (matched.intent_type === "redirect") {
      outbound = matched.action_config.redirect_message;
      action = "redirected";
    } else if (matched.intent_type === "document") {
      // Check identity
      const identity = session.collected_variables || {};
      const missing = (matched.required_identity_fields || []).filter((f: string) => !identity[f]);
      if (missing.length > 0) {
        outbound = matched.fallback_message || `Please share your ${missing.join(", ")} so I can fetch your document.`;
        action = "identity_required";
      } else {
        const doc = await fetchDocument(matched.action_config, identity);
        if (doc.found && doc.pdf_url) {
          outbound = `✅ Here is your ${matched.action_config.document_type.replace(/_/g, " ")}:`;
          attachments = [{ type: "document", url: doc.pdf_url, filename: `${matched.action_config.document_type}.pdf` }];
          action = "document_sent";
        } else {
          outbound = `I couldn't find a record matching ${Object.values(identity).join(", ")}. Please double-check or contact support.`;
          action = "document_not_found";
        }
      }
    } else if (matched.intent_type === "sales_info") {
      const record = await fetchSalesInfo(matched.action_config, message_text);
      if (record) {
        outbound = formatSalesReply(record, matched.action_config);
        action = "sales_info_sent";
      } else {
        outbound = matched.fallback_message || "I couldn't find that. Could you specify the exact model name?";
        action = "sales_info_not_found";
      }
    }

    // Increment trigger counter
    if (matched) {
      await supabase
        .from("whatsapp_flow_triggers")
        .update({ total_triggered: (matched.total_triggered || 0) + 1 })
        .eq("id", matched.id);
    }
  } catch (e) {
    success = false;
    errorMsg = (e as Error).message;
    outbound = "Sorry, I'm facing a technical issue. A human will reach out shortly.";
    action = "error";
  }

  // Log
  await supabase.from("whatsapp_flow_logs").insert({
    session_id: session?.id,
    customer_phone,
    inbound_message: message_text,
    matched_trigger_id: matched?.id || null,
    outbound_message: outbound,
    outbound_attachments: attachments,
    action_taken: action,
    success,
    error_message: errorMsg,
    processing_time_ms: Date.now() - startTime,
  });

  return { outbound, attachments, action, matched: matched?.trigger_name || null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const result = await routeMessage(body);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
