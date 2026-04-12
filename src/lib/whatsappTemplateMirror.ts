import { supabase } from "@/integrations/supabase/client";

export interface LegacyTemplateMirrorInput {
  name: string;
  body: string;
  displayName?: string | null;
  category?: string | null;
  language?: string | null;
  vertical?: string | null;
  headerType?: string | null;
  headerContent?: string | null;
  footer?: string | null;
  buttons?: unknown[] | null;
  variables?: string[] | null;
  status?: string | null;
}

const CATEGORY_MAP: Record<string, "marketing" | "utility" | "authentication"> = {
  authentication: "authentication",
  auth: "authentication",
  otp: "authentication",
  marketing: "marketing",
  welcome: "marketing",
  offer: "marketing",
  recommendation: "marketing",
  re_engagement: "marketing",
  referral: "marketing",
  birthday: "marketing",
  anniversary: "marketing",
  addon_upsell: "marketing",
  ncb_alert: "marketing",
  lapsed_recovery: "marketing",
  follow_up: "marketing",
  utility: "utility",
  transactional: "utility",
  reminder: "utility",
  renewals: "utility",
  renewal: "utility",
  renewal_reminder: "utility",
  general: "utility",
  insurance: "utility",
  service: "utility",
  payment: "utility",
  quote: "utility",
  finance: "utility",
  claim: "utility",
  policy_issued: "utility",
};

const STATUS_SET = new Set(["draft", "pending", "approved", "rejected", "paused", "disabled"]);

export function normalizeTemplateName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "") || "template";
}

export function normalizeTemplateCategory(category?: string | null) {
  const key = String(category || "utility").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return CATEGORY_MAP[key] || "utility";
}

export function normalizeLegacyVariableSyntax(content: string) {
  return content.replace(/(^|[^{}])\{([a-zA-Z_]\w*)\}(?!})/g, (_, prefix: string, key: string) => {
    return `${prefix}{{${key}}}`;
  });
}

function extractVariables(body: string, explicit?: string[] | null) {
  const normalizedExplicit = (explicit || [])
    .map((variable) => variable.replace(/[{}]/g, "").trim())
    .filter(Boolean);

  const discovered = Array.from(body.matchAll(/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g)).map((match) => match[1]);
  return Array.from(new Set([...normalizedExplicit, ...discovered]));
}

function normalizeStatus(status?: string | null) {
  const normalized = String(status || "draft").trim().toLowerCase();
  return STATUS_SET.has(normalized) ? normalized : "draft";
}

export async function upsertMetaManagedTemplate(input: LegacyTemplateMirrorInput) {
  const name = normalizeTemplateName(input.name);
  const body = normalizeLegacyVariableSyntax(input.body || "");
  const variables = extractVariables(body, input.variables);

  const payload = {
    name,
    display_name: input.displayName || input.name,
    category: normalizeTemplateCategory(input.category),
    language: input.language || "en",
    body,
    header_type: input.headerType || null,
    header_content: input.headerContent || null,
    footer: input.footer || null,
    buttons: input.buttons || [],
    variables,
    vertical: input.vertical || null,
    status: normalizeStatus(input.status),
  };

  const { data: existing, error: existingError } = await supabase
    .from("wa_templates")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { error } = await supabase.from("wa_templates").update(payload).eq("id", existing.id);
    if (error) throw error;
    return { templateId: existing.id, normalizedName: name };
  }

  const { data, error } = await supabase
    .from("wa_templates")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;
  return { templateId: data.id, normalizedName: name };
}

export async function syncTemplateToMeta(input: LegacyTemplateMirrorInput) {
  const { templateId, normalizedName } = await upsertMetaManagedTemplate(input);

  const { data, error } = await supabase.functions.invoke("meta-templates", {
    body: { action: "submit_template", template_id: templateId },
  });

  const metaError = error?.message || data?.error || null;
  return {
    templateId,
    normalizedName,
    submitted: !metaError,
    error: metaError ? String(metaError) : null,
    status: metaError ? "rejected" : String(data?.status || "pending").toLowerCase(),
  };
}

export async function deleteMetaManagedTemplate({
  templateId,
  name,
  deleteFromMeta = true,
}: {
  templateId?: string | null;
  name?: string | null;
  deleteFromMeta?: boolean;
}) {
  const normalizedName = name ? normalizeTemplateName(name) : null;

  if (deleteFromMeta && normalizedName) {
    try {
      await supabase.functions.invoke("meta-templates", {
        body: { action: "delete_template", template_name: normalizedName },
      });
    } catch {
      // ignore Meta delete failures during local cleanup
    }
  }

  if (templateId) {
    const { error } = await supabase.from("wa_templates").delete().eq("id", templateId);
    if (error) throw error;
    return;
  }

  if (normalizedName) {
    const { error } = await supabase.from("wa_templates").delete().eq("name", normalizedName);
    if (error) throw error;
  }
}