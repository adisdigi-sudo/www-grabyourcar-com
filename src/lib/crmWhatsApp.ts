import { toast } from "sonner";
import { sendWhatsApp } from "@/lib/sendWhatsApp";

type WhatsAppMessageType = "text" | "template" | "image" | "document" | "video" | "audio";

interface SendCrmWhatsAppMessageOptions {
  phone?: string | null;
  message: string;
  name?: string | null;
  logEvent?: string;
  vertical?: string;
  silent?: boolean;
  successMessage?: string;
  errorMessage?: string;
  messageType?: WhatsAppMessageType;
  mediaUrl?: string;
  mediaFileName?: string;
}

export async function sendCrmWhatsAppMessage({
  phone,
  message,
  name,
  logEvent = "crm_whatsapp_send",
  vertical,
  silent = false,
  successMessage,
  errorMessage = "WhatsApp API send failed",
  messageType,
  mediaUrl,
  mediaFileName,
}: SendCrmWhatsAppMessageOptions): Promise<boolean> {
  if (!phone?.trim()) {
    if (!silent) toast.error("No WhatsApp number available");
    return false;
  }

  try {
    const result = await sendWhatsApp({
      phone,
      message,
      name: name || undefined,
      logEvent,
      vertical,
      silent: true,
      messageType,
      mediaUrl,
      mediaFileName,
    });

    if (!result.success) {
      if (!silent) toast.error(result.error || errorMessage);
      return false;
    }

    if (!silent) toast.success(successMessage || "WhatsApp message sent via API");
    return true;
  } catch (error) {
    if (!silent) toast.error(error instanceof Error ? error.message : errorMessage);
    return false;
  }
}