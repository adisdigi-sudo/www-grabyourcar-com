import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendWhatsAppParams {
  phone: string;
  message: string;
  name?: string;
  logEvent?: string;
  silent?: boolean;
}

interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  fallback?: boolean;
}

// Cache the send mode to avoid repeated DB reads
let cachedSendMode: "api" | "manual" | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

/**
 * Get the current WhatsApp send mode from admin_settings.
 */
async function getSendMode(): Promise<"api" | "manual"> {
  const now = Date.now();
  if (cachedSendMode && now - cacheTimestamp < CACHE_TTL) {
    return cachedSendMode;
  }

  try {
    const { data } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "whatsapp_send_mode")
      .maybeSingle();

    const mode = (data?.setting_value as any) === "manual" ? "manual" : "api";
    cachedSendMode = mode;
    cacheTimestamp = now;
    return mode;
  } catch {
    return "api";
  }
}

/** Clear the cached send mode (call after toggling). */
export function clearSendModeCache() {
  cachedSendMode = null;
  cacheTimestamp = 0;
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
 * One-click WhatsApp send via Meta Cloud API.
 * Checks admin_settings for send mode — if "manual", opens wa.me directly.
 * Falls back to wa.me link if API fails.
 */
export async function sendWhatsApp({
  phone,
  message,
  name,
  logEvent,
  silent = false,
}: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  const fullPhone = normalizePhone(phone);
  const sendMode = await getSendMode();

  // Manual mode — go straight to wa.me
  if (sendMode === "manual") {
    const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
    if (!silent) toast.info("📱 Opened WhatsApp — please send manually");
    return { success: false, fallback: true };
  }

  try {
    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: {
        to: fullPhone,
        message,
        messageType: "text",
      },
    });

    if (error) throw error;

    if (data?.success) {
      if (!silent) toast.success(`✅ WhatsApp sent to ${name || fullPhone}`);

      // Log to wa_message_logs (fire-and-forget)
      supabase.from("wa_message_logs").insert({
        phone: fullPhone,
        customer_name: name || null,
        message_type: "text",
        message_content: message,
        trigger_event: logEvent || "manual_send",
        status: "sent",
        provider: "meta",
        provider_message_id: data.messageId || null,
        sent_at: new Date().toISOString(),
      }).then(() => {});

      return { success: true, messageId: data.messageId };
    }

    throw new Error(data?.error || data?.details || "API send failed");
  } catch (err) {
    console.warn("WhatsApp API send failed, falling back to wa.me:", err);

    const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");

    if (!silent) toast.info("📱 Opened WhatsApp — please send manually");

    return { success: false, fallback: true, error: String(err) };
  }
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
