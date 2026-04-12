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
 * 
 * @param slug - Template slug (e.g., "insurance_follow_up")
 * @param vars - Key-value map of variable replacements
 * @param fallback - Fallback message if template not found
 * @returns The message with variables replaced
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
  // Replace all {{variable}} with actual values, remove if no value
  msg = msg.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
  // Clean up empty lines from removed variables
  msg = msg.replace(/\n{3,}/g, "\n\n").trim();
  return msg;
}

/** Invalidate the template cache (e.g., after editing) */
export function invalidateCrmTemplateCache() {
  cache = null;
}
