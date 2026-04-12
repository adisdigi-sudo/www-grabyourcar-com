import { supabase } from "@/integrations/supabase/client";

// In-memory cache with 5 min TTL
let cache: { data: Record<string, { body_text: string; variables: string[] }>; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function loadTemplates() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  const { data, error } = await supabase
    .from("crm_message_templates")
    .select("slug, body_text, variables, is_active")
    .eq("is_active", true);
  if (error) {
    console.error("Failed to load CRM templates:", error);
    return cache?.data || {};
  }
  const map: Record<string, { body_text: string; variables: string[] }> = {};
  for (const t of data || []) {
    map[t.slug] = { body_text: t.body_text, variables: t.variables || [] };
  }
  cache = { data: map, ts: Date.now() };
  return map;
}

/**
 * Get a CRM message template by slug with variables replaced.
 * Variables in the template use {{variable_name}} syntax.
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
  return msg;
}

/** Invalidate the template cache (e.g., after editing) */
export function invalidateCrmTemplateCache() {
  cache = null;
}

/**
 * Smart send: checks 24hr window and sends free text if open,
 * falls back to approved Meta template if window closed.
 * 
 * @param phone - Customer phone number
 * @param slug - CRM template slug for free-form message
 * @param vars - Variables to replace in template
 * @param metaTemplateName - Meta-approved template name (optional fallback)
 * @param metaTemplateVars - Variables for Meta template (positional: var_1, var_2, etc.)
 */
export async function sendCrmWhatsApp(params: {
  phone: string;
  slug: string;
  vars: Record<string, string>;
  metaTemplateName?: string;
  metaTemplateVars?: Record<string, string>;
  logEvent?: string;
  leadId?: string;
}): Promise<{ success: boolean; method: "free_text" | "template" | "error"; error?: string }> {
  const { phone, slug, vars, metaTemplateName, metaTemplateVars, logEvent, leadId } = params;
  
  // First try: send as free text via whatsapp-send
  const freeMessage = await getCrmMessage(slug, vars);
  
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: {
      to: phone,
      message: freeMessage,
      messageType: "text",
      name: vars.customer_name || vars.name || "Customer",
      logEvent: logEvent || slug,
      lead_id: leadId,
    },
  });

  if (!error && data?.success) {
    return { success: true, method: "free_text" };
  }

  // If free text failed (possibly 24hr window expired), try template
  if (metaTemplateName) {
    const { data: tplData, error: tplError } = await supabase.functions.invoke("whatsapp-send", {
      body: {
        to: phone,
        messageType: "template",
        template_name: metaTemplateName,
        template_variables: metaTemplateVars || {},
        name: vars.customer_name || vars.name || "Customer",
        logEvent: logEvent || slug,
        lead_id: leadId,
      },
    });

    if (!tplError && tplData?.success) {
      return { success: true, method: "template" };
    }
    return { success: false, method: "error", error: tplData?.error || tplError?.message || "Both free text and template failed" };
  }

  return { success: false, method: "error", error: data?.error || error?.message || "Send failed" };
}
