// wa-feedback-dispatcher
// Sends a vertical-specific approved UTILITY feedback template after a "Won" event.
// Designed to be called from DB triggers (via pg_net) or directly.
//
// Body: { vertical, phone, name, variables: { ... }, recordId?, delaySeconds? }
// vertical: "insurance" | "loans" | "hsrp" | "sales"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// vertical -> template name mapping (must match wa_templates.name)
const TEMPLATE_MAP: Record<string, string> = {
  insurance: "feedback_insurance_won",
  loans: "feedback_loan_disbursed",
  hsrp: "feedback_hsrp_completed",
  sales: "feedback_sales_delivered",
};

const FEEDBACK_BASE = "https://www.grabyourcar.com/feedback";
const REVIEW_LINK = "https://g.page/r/grabyourcar/review";

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "").replace(/^0+/, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

function buildVariables(vertical: string, payload: Record<string, unknown>) {
  const name = String(payload.name || payload.customer_name || "Customer");
  const feedbackLink = `${FEEDBACK_BASE}?v=${vertical}${payload.recordId ? `&id=${payload.recordId}` : ""}`;

  switch (vertical) {
    case "insurance":
      return {
        "1": name,
        "2": String(payload.policy_number || payload.policy || "N/A"),
        "3": String(payload.insurer || "your insurer"),
        "4": feedbackLink,
        "5": REVIEW_LINK,
      };
    case "loans":
      return {
        "1": name,
        "2": String(payload.bank_name || payload.lender_name || "your lender"),
        "3": String(payload.loan_amount || payload.disbursement_amount || "N/A"),
        "4": feedbackLink,
        "5": REVIEW_LINK,
      };
    case "hsrp":
      return {
        "1": name,
        "2": String(payload.vehicle_number || payload.registration_number || "N/A"),
        "3": String(payload.service_type || "HSRP"),
        "4": feedbackLink,
        "5": REVIEW_LINK,
      };
    case "sales":
      return {
        "1": name,
        "2": String(payload.car_model || payload.vehicle || "your car"),
        "3": feedbackLink,
        "4": REVIEW_LINK,
      };
    default:
      return { "1": name, "2": feedbackLink };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const vertical = String(body.vertical || "").toLowerCase();
    const phone = normalizePhone(body.phone);
    const name = body.name || body.customer_name || "Customer";

    if (!phone) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid phone" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const templateName = TEMPLATE_MAP[vertical];
    if (!templateName) {
      return new Response(JSON.stringify({ ok: false, error: `Unknown vertical: ${vertical}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Idempotency: skip if a feedback for this record already sent in last 7 days
    if (body.recordId) {
      const { data: existing } = await supabase
        .from("wa_inbox_messages")
        .select("id")
        .eq("phone", phone)
        .ilike("content", `%feedback_${vertical}%`)
        .gte("created_at", new Date(Date.now() - 7 * 86400 * 1000).toISOString())
        .limit(1);
      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ ok: true, skipped: "already_sent" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Verify template is approved
    const { data: tpl } = await supabase
      .from("wa_templates")
      .select("name, status, body, variables")
      .eq("name", templateName)
      .maybeSingle();

    if (!tpl) {
      return new Response(JSON.stringify({ ok: false, error: `Template ${templateName} not found` }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const variables = buildVariables(vertical, { ...body, ...(body.variables || {}) });

    // If template not approved yet — fall back to plain text only if 24hr window is open
    if (tpl.status !== "approved") {
      const { data: convo } = await supabase
        .from("wa_conversations")
        .select("window_expires_at")
        .eq("phone", phone)
        .maybeSingle();

      const windowOpen = convo?.window_expires_at && new Date(convo.window_expires_at) > new Date();

      if (!windowOpen) {
        return new Response(JSON.stringify({
          ok: false,
          skipped: "template_not_approved_and_window_closed",
          template_status: tpl.status,
          message: `Template "${templateName}" is in "${tpl.status}" — submit to Meta for approval.`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Window open — render preview as plain text and send free
      let rendered = String(tpl.body || "");
      Object.entries(variables).forEach(([k, v]) => {
        rendered = rendered.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
      });

      const { data: textData, error: textErr } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          to: phone,
          message: rendered,
          messageType: "text",
          message_context: `feedback_${vertical}`,
          name,
          logEvent: `feedback_${vertical}_won`,
        },
      });
      return new Response(JSON.stringify({
        ok: !textErr && (textData?.success ?? true),
        method: "free_text",
        error: textErr?.message || textData?.error,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Template approved — send via template (UTILITY = ₹0.12)
    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: {
        to: phone,
        messageType: "template",
        template_name: templateName,
        template_variables: variables,
        message_context: `feedback_${vertical}`,
        name,
        logEvent: `feedback_${vertical}_won`,
      },
    });

    return new Response(JSON.stringify({
      ok: !error && (data?.success ?? true),
      method: "template",
      template: templateName,
      error: error?.message || data?.error,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("wa-feedback-dispatcher error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
