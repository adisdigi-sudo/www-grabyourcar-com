import { sendCrmWhatsAppMessage } from "@/lib/crmWhatsApp";

export function openWhatsAppChat(phone: string, message: string): void {
  void sendCrmWhatsAppMessage({
    phone,
    message,
    logEvent: "legacy_open_whatsapp_chat",
    vertical: "crm",
  });
}
