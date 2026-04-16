import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const respond = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: jsonHeaders,
  });

/**
 * WhatsApp Send — Provider-Agnostic Gateway
 *
 * Reads active WhatsApp provider from `channel_providers` table.
 * Supported providers: meta, waab
 *
 * Supports: text, template, image, document, video, audio
 */

interface SendMessageRequest {
  to: string;
  phone?: string;
  message?: string;
  messageType?: "text" | "template" | "image" | "document" | "video" | "audio";
  template_name?: string;
  template_variables?: Record<string, string>;
  template_components?: unknown[];
  mediaUrl?: string;
  mediaFileName?: string;
  action?: string;
  name?: string;
  logEvent?: string;
  lead_id?: string;
  message_context?: string;
  vertical?: string;
  fallback_template_name?: string;
  fallback_template_variables?: Record<string, string>;
  fallback_template_components?: unknown[];
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

interface ManagedTemplateMeta {
  body?: string | null;
  language?: string | null;
  status?: string | null;
  variables?: unknown;
}

interface CategoryRule {
  meta_category?: string | null;
  requires_template?: boolean | null;
  opt_out_footer_required?: boolean | null;
}

const FREEFORM_TYPES = new Set(["text", "image", "document", "video", "audio"]);
const WINDOW_CLOSED_ERROR = /(re-engagement message|131047)/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildImplicitFallbackTemplate(params: {
  explicitName?: string;
  explicitVariables?: Record<string, string>;
  explicitComponents?: unknown[];
  vertical?: string;
  messageContext?: string;
  name?: string;
  mediaUrl?: string;
}) {
  if (params.explicitName) {
    return {
      name: params.explicitName,
      variables: params.explicitVariables,
      components: params.explicitComponents,
    };
  }

  const safeName = params.name || "Customer";
  const linkText = params.mediaUrl ? `Open here: ${params.mediaUrl}` : "Reply to receive details";
  const ctx = (params.messageContext || "").toLowerCase();
  const vert = (params.vertical || "").toLowerCase();

  // Insurance vertical
  if (vert === "insurance" || /insurance|renewal|policy/i.test(ctx)) {
    return {
      name: "renewal_reminder",
      variables: {
        customer_name: safeName,
        vehicle: "your policy",
        premium: linkText,
        var_1: safeName,
        var_2: "your policy",
        var_3: linkText,
      },
      components: undefined,
    };
  }

  // Loan vertical
  if (vert === "loans" || /loan|emi|disburs/i.test(ctx)) {
    return {
      name: "welcome_new_lead",
      variables: { var_1: `${safeName} - Your loan update is ready. ${linkText}` },
      components: undefined,
    };
  }

  // Sales / quote vertical
  if (vert === "sales" || /quote|deal|car_sales/i.test(ctx)) {
    return {
      name: "welcome_new_lead",
      variables: { var_1: `${safeName} - Your car deal details. ${linkText}` },
      components: undefined,
    };
  }

  // HSRP vertical
  if (vert === "hsrp" || /hsrp|number_plate/i.test(ctx)) {
    return {
      name: "welcome_new_lead",
      variables: { var_1: `${safeName} - HSRP booking update. ${linkText}` },
      components: undefined,
    };
  }

  // Payment/invoice context
  if (/payment|invoice|receipt/i.test(ctx)) {
    return {
      name: "welcome_new_lead",
      variables: { var_1: `${safeName} - Your payment receipt. ${linkText}` },
      components: undefined,
    };
  }

  // Default fallback for any vertical
  return {
    name: "welcome_new_lead",
    variables: {
      var_1: params.mediaUrl ? `${safeName} - View your document: ${params.mediaUrl}` : safeName,
    },
    components: undefined,
  };
}

function normalizePhone(phone: string): { full: string; short: string; valid: boolean } {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  let short = clean;
  if (clean.startsWith("91") && clean.length === 12) {
    short = clean.slice(2);
  }
  const valid = /^[6-9]\d{9}$/.test(short);
  return { full: `91${short}`, short, valid };
}

function extractTemplateVariableOrder(templateMeta?: ManagedTemplateMeta) {
  const explicit = Array.isArray(templateMeta?.variables)
    ? templateMeta.variables
        .map((value) => String(value).replace(/[{}]/g, "").trim())
        .filter(Boolean)
    : [];

  if (explicit.length > 0) return explicit;

  const body = templateMeta?.body || "";
  const matches = Array.from(body.matchAll(/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g)).map((match) => match[1]);
  return Array.from(new Set(matches));
}

function buildTemplateParameters(templateVariables?: Record<string, unknown>, orderedKeys: string[] = [], templateHasVariables?: boolean) {
  if (!templateVariables) return [];

  // If the template explicitly has 0 variables, never send parameters
  if (templateHasVariables === false) return [];

  const entries = Object.entries(templateVariables).filter(([, value]) => {
    if (value === null || value === undefined) return false;
    return String(value).trim().length > 0;
  });

  if (entries.length === 0) return [];

  if (orderedKeys.length > 0) {
    const orderedValues = orderedKeys
      .map((key, index) => {
        const fallbackKeys = [key, `var_${index + 1}`, String(index + 1)];
        const matchedKey = fallbackKeys.find((candidate) => {
          const value = templateVariables[candidate];
          return value !== null && value !== undefined && String(value).trim().length > 0;
        });

        if (!matchedKey) return null;
        return templateVariables[matchedKey];
      })
      .filter((value): value is unknown => value !== null);

    if (orderedValues.length === orderedKeys.length) {
      return orderedValues.map((value) => ({ type: "text", text: String(value) }));
    }
  }

  const positionalEntries = entries
    .map(([key, value]) => {
      const match = key.match(/^var_(\d+)$/) || key.match(/^(\d+)$/);
      return match ? { index: Number(match[1]), value } : null;
    })
    .filter((entry): entry is { index: number; value: unknown } => entry !== null)
    .sort((a, b) => a.index - b.index);

  if (positionalEntries.length === entries.length) {
    return positionalEntries.map(({ value }) => ({ type: "text", text: String(value) }));
  }

  return entries.map(([key, value]) => ({
    type: "text",
    parameter_name: key,
    text: String(value),
  }));
}

// ── Meta Cloud API Provider ──
async function sendViaMeta(
  token: string,
  phoneNumberId: string,
  to: string,
  payload: Record<string, unknown>
): Promise<SendResult> {
  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    ...payload,
  };

  console.log("Meta API request:", JSON.stringify(body));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  console.log("Meta API response:", JSON.stringify(result));

  if (response.ok && result.messages?.[0]?.id) {
    return { success: true, messageId: result.messages[0].id, provider: "meta" };
  }

  return { success: false, error: result.error?.message || JSON.stringify(result), provider: "meta" };
}

// ── WAAB Provider (legacy REST API) ──
async function sendViaWaab(
  apiKey: string,
  baseUrl: string,
  to: string,
  payload: { type: "text"; message: string } | { type: "template"; template_name: string; variables?: Record<string, string> }
): Promise<SendResult> {
  const endpoint = `${baseUrl}/api/v1/messages/send`;

  let body: Record<string, unknown>;
  if (payload.type === "template") {
    body = {
      to,
      type: "template",
      template: { name: payload.template_name, language: "en" },
    };
    if (payload.variables && Object.keys(payload.variables).length > 0) {
      (body.template as any).parameters = Object.values(payload.variables).map(v => ({ type: "text", text: v }));
    }
  } else {
    body = { to, type: "text", text: { body: payload.message } };
  }

  console.log("WAAB API request:", JSON.stringify(body));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const result = await response.json();
    console.log("WAAB API response:", JSON.stringify(result));
    if (response.ok && (result.success || result.messages?.[0]?.id || result.message_id)) {
      return { success: true, messageId: result.messages?.[0]?.id || result.message_id || result.id, provider: "waab" };
    }
    return { success: false, error: JSON.stringify(result), provider: "waab" };
  }

  const text = await response.text();
  console.error("WAAB non-JSON:", text.substring(0, 300));
  return { success: false, error: `Non-JSON response (${response.status})`, provider: "waab" };
}

// ── WABB.in Provider (Webhook-based) ──
async function sendViaWabb(
  webhookUrl: string,
  to: string,
  message: string,
  name?: string,
): Promise<SendResult> {
  const payload = {
    Phone: to,
    Name: (name || "Customer").trim(),
    Message: message.trim() || "Hello from GrabYourCar!",
  };

  console.log("WABB webhook request:", JSON.stringify({ ...payload, webhookUrl: webhookUrl.substring(0, 40) + "..." }));

  let lastError = "Unknown WABB error";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      const trimmedResponse = responseText.trim();
      console.log(`WABB webhook response attempt ${attempt}:`, response.status, trimmedResponse.substring(0, 300));

      if (response.ok) {
        let parsed: Record<string, unknown> | null = null;
        if (trimmedResponse) {
          try {
            parsed = JSON.parse(trimmedResponse);
          } catch {
            parsed = null;
          }
        }

        const messageId = typeof parsed?.id === "string"
          ? parsed.id
          : typeof parsed?.message_id === "string"
            ? parsed.message_id
            : undefined;

        const accepted =
          typeof parsed?.success === "boolean"
            ? parsed.success
            : typeof parsed?.status === "string"
              ? ["success", "accepted", "queued", "sent"].includes(parsed.status.toLowerCase())
              : false;

        if (messageId || accepted) {
          return { success: true, messageId: messageId || `wabb_${Date.now()}`, provider: "wabb" };
        }

        // WABB Catch Webhook uses fire-and-forget model:
        // A 200 response (even empty {} or empty body) means the webhook accepted the payload.
        // The message will be processed and delivered asynchronously.
        if (trimmedResponse.length === 0 || trimmedResponse === "{}") {
          console.log(`WABB webhook accepted payload (fire-and-forget) on attempt ${attempt}`);
          return { success: true, messageId: `wabb_${Date.now()}`, provider: "wabb" };
        }

        // If we got a 200 with unexpected content, still treat as accepted but log warning
        console.warn(`WABB webhook returned 200 with unexpected body: ${trimmedResponse.substring(0, 200)}`);
        return { success: true, messageId: `wabb_${Date.now()}`, provider: "wabb" };
      } else {
        lastError = `WABB webhook error (${response.status}): ${trimmedResponse.substring(0, 200) || "empty response"}`;
        const shouldRetry =
          attempt < 3 && (
            response.status === 429 ||
            response.status >= 500 ||
            ((response.status === 400 || response.status === 405) && trimmedResponse.length === 0)
          );

        if (!shouldRetry) {
          return { success: false, error: lastError, provider: "wabb" };
        }

        console.warn(`Retrying WABB webhook after attempt ${attempt} failed with status ${response.status}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown WABB network error";

      if (attempt === 3) {
        return { success: false, error: `WABB webhook network error: ${lastError}`, provider: "wabb" };
      }

      console.warn(`Retrying WABB webhook after network failure on attempt ${attempt}:`, lastError);
    }

    await sleep(400 * attempt);
  }

  return { success: false, error: lastError, provider: "wabb" };
}

// ── Provider Router ──
async function sendMessage(
  providerName: string,
  providerConfig: Record<string, any>,
  to: string,
  messageType: string,
  message: string,
  templateName?: string,
  templateVars?: Record<string, string>,
  mediaUrl?: string,
  mediaFileName?: string,
  name?: string,
  templateComponents?: unknown[],
  templateMeta?: ManagedTemplateMeta,
): Promise<SendResult> {
  const phone = normalizePhone(to);
  if (!phone.valid) {
    return { success: false, error: "Invalid phone number format" };
  }

  if (providerName === "meta") {
    const token = providerConfig?.access_token || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = providerConfig?.phone_number_id || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    if (!token || !phoneNumberId) {
      return { success: false, error: "Meta API credentials not configured", provider: "meta" };
    }

    let payload: Record<string, unknown>;
    if (messageType === "template" && templateName) {
      const components: unknown[] = [];
      const varOrder = extractTemplateVariableOrder(templateMeta);
      const templateHasVariables = varOrder.length > 0;
      const derivedParameters = buildTemplateParameters(templateVars, varOrder, templateHasVariables);
      const templateLanguage = templateMeta?.language || "en";
      if (templateComponents && templateComponents.length > 0) {
        components.push(...templateComponents);
      } else if (derivedParameters.length > 0) {
        components.push({
          type: "body",
          parameters: derivedParameters,
        });
      }

      payload = {
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguage },
          ...(components.length > 0 ? { components } : {}),
        },
      };
    } else if (messageType === "image" && mediaUrl) {
      payload = { type: "image", image: { link: mediaUrl, caption: message || "" } };
    } else if (messageType === "document" && mediaUrl) {
      payload = { type: "document", document: { link: mediaUrl, caption: message || "", filename: mediaFileName || "document.pdf" } };
    } else {
      payload = { type: "text", text: { preview_url: false, body: message || "Hello from GrabYourCar!" } };
    }

    return sendViaMeta(token, phoneNumberId, phone.full, payload);
  }

  if (providerName === "waab") {
    const apiKey = providerConfig?.api_key || Deno.env.get("WAAB_API_KEY");
    const baseUrl = providerConfig?.base_url || Deno.env.get("WAAB_BASE_URL") || "";
    if (!apiKey || !baseUrl) {
      return { success: false, error: "WAAB credentials not configured. Add API Key and Base URL in Channel Providers.", provider: "waab" };
    }

    if (messageType === "template" && templateName) {
      return sendViaWaab(apiKey, baseUrl, phone.full, { type: "template", template_name: templateName, variables: templateVars });
    }
    return sendViaWaab(apiKey, baseUrl, phone.full, { type: "text", message: message || "" });
  }

  if (providerName === "wabb") {
    // WABB Catch Webhook doesn't support templates — use Meta API for template sends
    if (messageType === "template" && templateName) {
      const metaToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
      const metaPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
      if (metaToken && metaPhoneId) {
        console.log("WABB: Template message — routing via Meta Cloud API");
        const components: unknown[] = [];
        if (templateVars && Object.keys(templateVars).length > 0) {
          components.push({
            type: "body",
            parameters: Object.values(templateVars).map(val => ({ type: "text", text: val })),
          });
        }
        const payload = { type: "template", template: { name: templateName, language: { code: "en" }, ...(components.length > 0 ? { components } : {}) } };
        return sendViaMeta(metaToken, metaPhoneId, phone.full, payload);
      }
      console.warn("WABB: Template requested but Meta API credentials missing, falling back to text");
    }

    const webhookUrl = providerConfig?.webhook_url || Deno.env.get("WABB_WEBHOOK_URL");
    if (!webhookUrl) {
      return { success: false, error: "WABB webhook URL not configured. Add it in Channel Providers or set WABB_WEBHOOK_URL secret.", provider: "wabb" };
    }
    return sendViaWabb(webhookUrl, phone.full, message || "Hello from GrabYourCar!", name);
  }

  return { success: false, error: `Unknown provider: ${providerName}` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json() as SendMessageRequest & Record<string, unknown>;

    // Health check
    if (body.action === "health_check") {
      const { data: provider } = await supabase
        .from("channel_providers")
        .select("*")
        .eq("channel", "whatsapp")
        .single();

      return new Response(
        JSON.stringify({
          ok: true,
          status: "ok",
          configured: !!provider?.is_active,
          provider: provider?.provider_name || "none",
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // Resolve target phone
    const to = body.to || body.phone;
    if (!to) {
      return respond({ ok: false, success: false, status: "validation_error", error: "Phone number required (to or phone)" });
    }

    const template_name = body.template_name || body.templateName;
    const template_variables = body.template_variables || body.templateVariables;
    const template_components = body.template_components || body.templateComponents;
    const fallback_template_name = body.fallback_template_name || body.fallbackTemplateName;
    const fallback_template_variables = body.fallback_template_variables || body.fallbackTemplateVariables;
    const fallback_template_components = body.fallback_template_components || body.fallbackTemplateComponents;
    const mediaUrl = body.mediaUrl || body.media_url;
    const mediaFileName = body.mediaFileName || body.media_file_name;
    const name = body.name;
    const logEvent = body.logEvent || body.log_event;
    const lead_id = body.lead_id || body.leadId;
    const message = body.message || "";
    const vertical = body.vertical;
    const message_context = body.message_context || body.messageContext || logEvent || "crm_followup";
    const originalMessageType = body.messageType || body.message_type || (template_name ? "template" : mediaUrl ? "document" : "text");
    const phoneNorm = normalizePhone(to);

    const { data: convoRows } = await supabase
      .from("wa_conversations")
      .select("window_expires_at, customer_name")
      .eq("phone", phoneNorm.full)
      .order("updated_at", { ascending: false })
      .limit(1);

    const convo = convoRows?.[0];
    const windowOpen = Boolean(convo?.window_expires_at && new Date(convo.window_expires_at) > new Date());

    const { data: categoryRuleRows } = await supabase
      .from("wa_category_rules")
      .select("meta_category, requires_template, opt_out_footer_required")
      .eq("message_context", message_context)
      .eq("is_active", true)
      .limit(1);

    const categoryRule = categoryRuleRows?.[0] as CategoryRule | undefined;
    const fallbackTemplate = buildImplicitFallbackTemplate({
      explicitName: fallback_template_name as string | undefined,
      explicitVariables: fallback_template_variables as Record<string, string> | undefined,
      explicitComponents: fallback_template_components as unknown[] | undefined,
      vertical: typeof vertical === "string" ? vertical : undefined,
      messageContext: typeof message_context === "string" ? message_context : undefined,
      name: typeof name === "string" ? name : convo?.customer_name || undefined,
      mediaUrl: typeof mediaUrl === "string" ? mediaUrl : undefined,
    });

    let effectiveMessageType = originalMessageType;
    let effectiveTemplateName = template_name as string | undefined;
    let effectiveTemplateVariables = template_variables as Record<string, string> | undefined;
    let effectiveTemplateComponents = template_components as unknown[] | undefined;
    let templateFallbackUsed = false;

    if (FREEFORM_TYPES.has(originalMessageType)) {
      const mustUseTemplate = Boolean(categoryRule?.requires_template);
      if (mustUseTemplate || !windowOpen) {
        if (!fallbackTemplate?.name) {
          return respond({
            ok: false,
            success: false,
            fallback: false,
            status: mustUseTemplate ? "template_required" : "window_closed",
            error: mustUseTemplate
              ? `Approved WhatsApp template required for ${message_context}`
              : "24-hour window closed and no approved fallback template configured",
            window_open: windowOpen,
            message_context,
          });
        }

        effectiveMessageType = "template";
        effectiveTemplateName = fallbackTemplate.name;
        effectiveTemplateVariables = fallbackTemplate.variables;
        effectiveTemplateComponents = fallbackTemplate.components;
        templateFallbackUsed = true;
      }
    }

    let templateMeta: ManagedTemplateMeta | undefined;
    if (effectiveMessageType === "template" && effectiveTemplateName) {
      const { data: templateRows } = await supabase
        .from("wa_templates")
        .select("body, language, status, variables")
        .eq("name", effectiveTemplateName)
        .order("created_at", { ascending: false })
        .limit(1);

      templateMeta = templateRows?.[0] as ManagedTemplateMeta | undefined;

      if (templateMeta?.status && templateMeta.status !== "approved") {
        return respond({
          ok: false,
          success: false,
          fallback: false,
          status: "template_not_approved",
          error: `Template ${effectiveTemplateName} is not approved`,
          template_name: effectiveTemplateName,
        });
      }
    }

    // Get active WhatsApp provider from DB
    const { data: provider } = await supabase
      .from("channel_providers")
      .select("*")
      .eq("channel", "whatsapp")
      .single();

    const providerName = provider?.provider_name || "meta";
    const providerConfig = provider?.config_json || {};
    const isActive = provider?.is_active ?? false;

    if (!isActive) {
      return respond({
        ok: false,
        success: false,
        fallback: false,
        status: "not_configured",
        error: "WhatsApp channel is not active. Enable it in Channel Providers settings.",
      });
    }

    // Send via the active provider
    let result = await sendMessage(
      providerName,
      providerConfig,
      to,
      effectiveMessageType,
      message,
      effectiveTemplateName,
      effectiveTemplateVariables,
      mediaUrl,
      mediaFileName,
      name,
      effectiveTemplateComponents,
      templateMeta,
    );

    if (!result.success && FREEFORM_TYPES.has(originalMessageType) && WINDOW_CLOSED_ERROR.test(result.error || "") && fallbackTemplate?.name) {
      effectiveMessageType = "template";
      effectiveTemplateName = fallbackTemplate.name;
      effectiveTemplateVariables = fallbackTemplate.variables;
      effectiveTemplateComponents = fallbackTemplate.components;
      templateFallbackUsed = true;

      if (!templateMeta || effectiveTemplateName !== template_name) {
        const { data: retryTemplateRows } = await supabase
          .from("wa_templates")
          .select("body, language, status, variables")
          .eq("name", effectiveTemplateName)
          .order("created_at", { ascending: false })
          .limit(1);
        templateMeta = retryTemplateRows?.[0] as ManagedTemplateMeta | undefined;
      }

      result = await sendMessage(
        providerName,
        providerConfig,
        to,
        effectiveMessageType,
        message,
        effectiveTemplateName,
        effectiveTemplateVariables,
        undefined,
        undefined,
        name,
        effectiveTemplateComponents,
        templateMeta,
      );
    }

    const deliveryStatus = result.success ? "sent" : "failed";

    // Log to wa_message_logs
    try {
      await supabase.from("wa_message_logs").insert({
        phone: phoneNorm.full,
        customer_name: name || null,
        message_type: effectiveMessageType,
        message_content: message || null,
        template_name: effectiveTemplateName || null,
        trigger_event: logEvent || "api_send",
        lead_id: lead_id || null,
        status: deliveryStatus,
        provider: result.provider || providerName,
        provider_message_id: result.messageId || null,
        error_message: result.error || null,
        sent_at: result.success ? new Date().toISOString() : null,
        failed_at: result.success ? null : new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Failed to log wa_message_logs (non-fatal):", logError);
    }

    // ── Also log to wa_inbox_messages + wa_conversations for Hub visibility ──
    if (result.success) {
      try {
        // Upsert conversation by phone
        const convoPhone = phoneNorm.full;
        const msgPreview = message ? message.substring(0, 100) : (template_name ? `[Template: ${template_name}]` : "Message sent");

        const { data: existingConvo } = await supabase
          .from("wa_conversations")
          .select("id")
          .eq("phone", convoPhone)
          .maybeSingle();

        let convoId: string;

        if (existingConvo) {
          convoId = existingConvo.id;
          await supabase.from("wa_conversations").update({
            last_message: msgPreview,
            last_message_at: new Date().toISOString(),
            customer_name: name || undefined,
            updated_at: new Date().toISOString(),
          }).eq("id", convoId);
        } else {
          const { data: newConvo } = await supabase.from("wa_conversations").insert({
            phone: convoPhone,
            customer_name: name || convoPhone,
            last_message: msgPreview,
            last_message_at: new Date().toISOString(),
            status: "active",
          }).select("id").single();
          convoId = newConvo?.id;
        }

        if (convoId) {
          await supabase.from("wa_inbox_messages").insert({
            conversation_id: convoId,
            direction: "outbound",
            message_type: effectiveMessageType === "document" ? "document" : effectiveMessageType === "image" ? "image" : effectiveMessageType === "template" ? "template" : "text",
            content: message || null,
            media_url: templateFallbackUsed ? null : (mediaUrl || null),
            media_filename: templateFallbackUsed ? null : (mediaFileName || null),
            template_name: effectiveTemplateName || null,
            template_variables: effectiveTemplateVariables ? effectiveTemplateVariables : null,
            wa_message_id: result.messageId || null,
            status: "sent",
            sent_by_name: "System",
          });
        }

        console.log(`Logged outbound message to wa_inbox_messages for conversation ${convoId}`);
      } catch (inboxErr) {
        console.error("Failed to log to wa_inbox_messages (non-fatal):", inboxErr);
      }
    }

    if (result.success) {
      return respond({
        ok: true,
        success: true,
        messageId: result.messageId,
        provider: result.provider,
        fallback: templateFallbackUsed,
        window_open: windowOpen,
        message_context,
        status: deliveryStatus,
      });
    }

    return respond({
      ok: false,
      success: false,
      fallback: templateFallbackUsed,
      status: "provider_error",
      error: result.error,
      provider: result.provider,
      window_open: windowOpen,
      message_context,
    });
  } catch (error) {
    console.error("whatsapp-send error:", error);
    return respond({
      ok: false,
      success: false,
      fallback: false,
      status: "runtime_error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
