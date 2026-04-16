import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getWhatsAppSignature } from "@/lib/senderSignature";

interface SendWhatsAppParams {
  phone: string;
  message: string;
  name?: string;
  logEvent?: string;
  silent?: boolean;
  messageContext?: string;
  vertical?: string;
  templateName?: string;
  templateComponents?: unknown[];
  templateVariables?: Record<string, string>;
  fallbackTemplateName?: string;
  fallbackTemplateComponents?: unknown[];
  fallbackTemplateVariables?: Record<string, string>;
  messageType?: "text" | "template" | "image" | "document" | "video" | "audio";
  mediaUrl?: string;
  mediaFileName?: string;
}

interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  fallback?: boolean;
}

/**
 * Normalize Indian phone to 91XXXXXXXXXX format.
 */
function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (clean.startsWith("91") && clean.length === 12) return clean;
  if (clean.length === 10 && /^[6-9]/.test(clean)) return `91${clean}`;
  return clean;
}

/**
 * One-click WhatsApp send via backend WhatsApp provider.
 * 100% API mode — all messages go through whatsapp-send edge function.
 * No manual mode, no fallback to web links.
 */
export async function sendWhatsApp({
  phone,
  message,
  name,
  logEvent,
  silent = false,
  messageContext,
  vertical,
  templateName,
  templateComponents,
  templateVariables,
  fallbackTemplateName,
  fallbackTemplateComponents,
  fallbackTemplateVariables,
  messageType,
  mediaUrl,
  mediaFileName,
}: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  const fullPhone = normalizePhone(phone);

  try {
    // Append sender signature to text messages (not templates, not media-only)
    let finalMessage = message;
    if (!templateName && (!messageType || messageType === "text")) {
      if (!finalMessage.includes("Regards,\n*")) {
        const sig = await getWhatsAppSignature();
        finalMessage += sig;
      }
    }

    const body: Record<string, unknown> = {
      to: fullPhone,
      message: finalMessage,
      messageType: messageType || (templateName ? "template" : mediaUrl ? "document" : "text"),
      name,
      logEvent: logEvent || "manual_send",
    };
    if (messageContext) body.message_context = messageContext;
    if (vertical) body.vertical = vertical;
    if (templateName) body.template_name = templateName;
    if (templateComponents) body.template_components = templateComponents;
    if (templateVariables) body.template_variables = templateVariables;
    if (fallbackTemplateName) body.fallback_template_name = fallbackTemplateName;
    if (fallbackTemplateComponents) body.fallback_template_components = fallbackTemplateComponents;
    if (fallbackTemplateVariables) body.fallback_template_variables = fallbackTemplateVariables;
    if (mediaUrl) body.mediaUrl = mediaUrl;
    if (mediaFileName) body.mediaFileName = mediaFileName;

    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body,
    });

    if (error) throw error;

    if (data?.success) {
      if (!silent) toast.success(`✅ WhatsApp queued for delivery to ${name || fullPhone}`);
      return { success: true, messageId: data.messageId };
    }

    const providerError = data?.error || data?.details || "API send failed";
    if (!silent) toast.error(providerError);
    return {
      success: false,
      fallback: Boolean(data?.fallback),
      error: providerError,
    };
  } catch (err) {
    console.warn("WhatsApp API send failed:", err);

    if (!silent) toast.error("WhatsApp API failed — message not accepted by provider");

    return {
      success: false,
      fallback: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** @deprecated Manual mode removed. This is a no-op for backward compatibility. */
export function clearSendModeCache() {
  // No-op: 100% API mode, no cache needed
}

/**
 * Bulk send WhatsApp messages with delay between each.
 */
export async function sendWhatsAppBulk(
  recipients: Array<{ phone: string; message: string; name?: string }>,
  options?: { delayMs?: number; onProgress?: (sent: number, total: number) => void }
): Promise<{ sent: number; failed: number }> {
  const delay = options?.delayMs ?? 1500;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const result = await sendWhatsApp({ ...r, logEvent: "bulk_send", silent: true });
    if (result.success) sent++;
    else failed++;
    options?.onProgress?.(i + 1, recipients.length);
    if (i < recipients.length - 1) await new Promise(res => setTimeout(res, delay));
  }

  toast.success(`📨 Bulk send complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}
