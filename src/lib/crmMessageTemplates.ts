import { supabase } from "@/integrations/supabase/client";
import { getWhatsAppSignature } from "@/lib/senderSignature";

// In-memory cache with 5 min TTL
let cache: { data: Record<string, { body_text: string; variables: string[]; opt_out_footer: string | null; meta_category: string }> ; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function loadTemplates() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  const { data, error } = await supabase
    .from("crm_message_templates")
    .select("slug, body_text, variables, is_active, opt_out_footer, meta_category")
    .eq("is_active", true);
  if (error) {
    console.error("Failed to load CRM templates:", error);
    return cache?.data || {};
  }
  const map: Record<string, { body_text: string; variables: string[]; opt_out_footer: string | null; meta_category: string }> = {};
  for (const t of data || []) {
    map[t.slug] = { 
      body_text: t.body_text, 
      variables: t.variables || [],
      opt_out_footer: t.opt_out_footer || null,
      meta_category: t.meta_category || "service",
    };
  }
  cache = { data: map, ts: Date.now() };
  return map;
}

/**
 * Get a CRM message template by slug with variables replaced.
 * Variables in the template use {{variable_name}} syntax.
 * Automatically appends opt-out footer for service messages.
 */
export async function getCrmMessage(
  slug: string,
  vars: Record<string, string> = {},
  fallback?: string
): Promise<string> {
  const templates = await loadTemplates();
  const tpl = templates[slug];
  if (!tpl) {
    console.warn(`CRM template "${slug}" not found, using fallback`);
    return fallback || `Hi ${vars.customer_name || vars.name || "there"}`;
  }
  
  let msg = tpl.body_text;
  msg = msg.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
  msg = msg.replace(/\n{3,}/g, "\n\n").trim();
  
  // Append opt-out footer for CRM messages (Meta compliance)
  if (tpl.opt_out_footer && tpl.meta_category === "service") {
    msg += `\n\n_${tpl.opt_out_footer}_`;
  }
  
  return msg;
}

/** Invalidate the template cache (e.g., after editing) */
export function invalidateCrmTemplateCache() {
  cache = null;
}

/**
 * META CATEGORY CLASSIFICATION
 * Determines correct Meta category for a message context.
 * 
 * SERVICE (FREE): CRM replies, follow-ups to existing clients within 24hr window
 * UTILITY: Renewal reminders, booking confirmations, status updates (₹0.35/msg)
 * MARKETING: New lead outreach, promos, cold campaigns (₹0.80/msg)
 */
export type MetaMessageCategory = "service" | "utility" | "marketing" | "authentication";

export function classifyMessageCategory(context: string): MetaMessageCategory {
  const UTILITY_CONTEXTS = [
    "renewal_reminder", "booking_confirmation", "payment_receipt",
    "appointment_reminder", "delivery_update", "hsrp_status",
  ];
  const MARKETING_CONTEXTS = [
    "new_lead_outreach", "promotional_offer", "cross_sell",
    "re_engagement", "bulk_campaign", "festival_offer",
  ];
  const AUTH_CONTEXTS = ["otp_verification"];
  
  if (AUTH_CONTEXTS.includes(context)) return "authentication";
  if (MARKETING_CONTEXTS.includes(context)) return "marketing";
  if (UTILITY_CONTEXTS.includes(context)) return "utility";
  return "service"; // default = free
}

/**
 * Smart send: checks 24hr window and sends free text if open,
 * falls back to approved Meta template if window closed.
 * Strictly enforces Meta category rules.
 */
export async function sendCrmWhatsApp(params: {
  phone: string;
  slug: string;
  vars: Record<string, string>;
  messageContext?: string; // e.g., "crm_followup", "renewal_reminder"
  metaTemplateName?: string;
  metaTemplateVars?: Record<string, string>;
  logEvent?: string;
  leadId?: string;
}): Promise<{ success: boolean; method: "free_text" | "template" | "error"; category: MetaMessageCategory; error?: string }> {
  const { phone, slug, vars, messageContext, metaTemplateName, metaTemplateVars, logEvent, leadId } = params;
  
  const category = classifyMessageCategory(messageContext || "crm_followup");
  
  // For service category: try free text first (saves money)
  if (category === "service") {
    const freeMessage = await getCrmMessage(slug, vars);
    
    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: {
        to: phone,
        message: freeMessage,
        messageType: "text",
        message_context: messageContext || "crm_followup",
        name: vars.customer_name || vars.name || "Customer",
        logEvent: logEvent || slug,
        lead_id: leadId,
      },
    });

    if (!error && data?.success) {
      return { success: true, method: "free_text", category };
    }
  }

  // For utility/marketing OR if free text failed: use approved template
  if (metaTemplateName) {
    const { data: tplData, error: tplError } = await supabase.functions.invoke("whatsapp-send", {
      body: {
        to: phone,
        messageType: "template",
        template_name: metaTemplateName,
        template_variables: metaTemplateVars || {},
        message_context: messageContext || slug,
        name: vars.customer_name || vars.name || "Customer",
        logEvent: logEvent || slug,
        lead_id: leadId,
      },
    });

    if (!tplError && tplData?.success) {
      return { success: true, method: "template", category };
    }
    return { success: false, method: "error", category, error: tplData?.error || tplError?.message || "Template send failed" };
  }

  // If service category and no template fallback, try free text anyway
  if (category !== "service") {
    return { success: false, method: "error", category, error: `${category} messages require an approved Meta template` };
  }

  const freeMessage = await getCrmMessage(slug, vars);
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: {
      to: phone,
      message: freeMessage,
      messageType: "text",
      message_context: messageContext || "crm_followup",
      name: vars.customer_name || vars.name || "Customer",
      logEvent: logEvent || slug,
      lead_id: leadId,
    },
  });

  if (!error && data?.success) {
    return { success: true, method: "free_text", category };
  }
  return { success: false, method: "error", category, error: data?.error || error?.message || "Send failed" };
}
