import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type OmniChannel = "whatsapp" | "email" | "rcs";

export interface OmniSendParams {
  channel: OmniChannel;
  phone?: string;
  email?: string;
  message: string;
  subject?: string;
  name?: string;
  logEvent?: string;
  silent?: boolean;
  vertical?: string;
  messageContext?: string;
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

export interface OmniSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  fallback?: boolean;
  channel: OmniChannel;
}

export interface OmniBulkRecipient {
  phone?: string;
  email?: string;
  name?: string;
  message: string;
  subject?: string;
}

export interface ChannelProviderStatus {
  channel: OmniChannel;
  provider_name: string;
  is_active: boolean;
  config_json: Record<string, any>;
}

/**
 * Fetch active channel providers from DB.
 */
export async function getChannelProviders(): Promise<ChannelProviderStatus[]> {
  const { data, error } = await supabase
    .from("channel_providers")
    .select("*")
    .order("channel");

  if (error) {
    console.error("Failed to fetch channel providers:", error);
    return [];
  }

  return (data || []).map((p: any) => ({
    channel: p.channel as OmniChannel,
    provider_name: p.provider_name,
    is_active: p.is_active,
    config_json: p.config_json || {},
  }));
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
 * Unified omni-channel send — routes through omni-channel-send edge function.
 */
export async function omniSend(params: OmniSendParams): Promise<OmniSendResult> {
  const {
    channel,
    message,
    subject,
    name,
    logEvent,
    silent = false,
    vertical,
    messageContext,
    templateName,
    templateComponents,
    templateVariables,
    fallbackTemplateName,
    fallbackTemplateComponents,
    fallbackTemplateVariables,
    messageType,
    mediaUrl,
    mediaFileName,
  } = params;
  const phone = params.phone ? normalizePhone(params.phone) : undefined;
  const email = params.email;

  try {
    const { data, error } = await supabase.functions.invoke("omni-channel-send", {
      body: {
        action: "send_text",
        channel,
        phone,
        email,
        message,
        subject,
        name,
        logEvent: logEvent || "omni_send",
        vertical,
        messageContext,
        templateName,
        templateComponents,
        templateVariables,
        fallbackTemplateName,
        fallbackTemplateComponents,
        fallbackTemplateVariables,
        messageType,
        mediaUrl,
        mediaFileName,
      },
    });

    if (error) throw error;

    if (data?.success) {
      if (!silent) {
        if (channel === "whatsapp") {
          toast.success(`✅ WhatsApp queued for delivery to ${name || phone}`);
        } else {
          const channelLabel = channel === "email" ? "Email" : "RCS";
          toast.success(`✅ ${channelLabel} sent to ${name || phone || email}`);
        }
      }
      return { success: true, messageId: data.messageId, channel };
    }

    // WhatsApp stays API-only to avoid blocked popups and false-positive manual sends
    if (data?.status === "not_configured" && channel === "whatsapp") {
      if (!silent) toast.error(data?.error || "WhatsApp channel is not configured");
      return { success: false, fallback: false, error: data?.error || "whatsapp_not_configured", channel };
    }

    const providerError = data?.error || "Send failed";
    if (!silent) toast.error(providerError);
    return {
      success: false,
      fallback: Boolean(data?.fallback),
      error: providerError,
      channel,
    };
  } catch (err) {
    console.warn(`Omni send failed for ${channel}:`, err);

    if (channel === "whatsapp") {
      if (!silent) toast.error("WhatsApp API failed — popup fallback disabled");
      return {
        success: false,
        fallback: false,
        error: err instanceof Error ? err.message : String(err),
        channel,
      };
    }

    if (!silent) toast.error(`Failed to send ${channel} message`);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      channel,
    };
  }
}

/**
 * Bulk send via omni-channel.
 */
export async function omniSendBulk(
  channel: OmniChannel,
  recipients: OmniBulkRecipient[],
  options?: {
    delayMs?: number;
    onProgress?: (sent: number, failed: number, total: number) => void;
    vertical?: string;
  }
): Promise<{ sent: number; failed: number }> {
  const delay = options?.delayMs ?? 1500;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const result = await omniSend({
      channel,
      phone: r.phone,
      email: r.email,
      message: r.message,
      subject: r.subject,
      name: r.name,
      logEvent: "bulk_omni_send",
      silent: true,
      vertical: options?.vertical,
    });

    if (result.success) sent++;
    else failed++;

    options?.onProgress?.(sent, failed, recipients.length);

    if (i < recipients.length - 1) {
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  const channelLabel = channel === "whatsapp" ? "WhatsApp" : channel === "email" ? "Email" : "RCS";
  toast.success(`📨 ${channelLabel} bulk send: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}
