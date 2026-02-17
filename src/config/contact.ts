/**
 * Central contact configuration — single source of truth.
 * Update numbers here to propagate across the entire platform.
 */

/** WhatsApp Business API number (international format, no '+') */
export const WHATSAPP_NUMBER = "1155578093";

/** Phone number for tel: links */
export const PHONE_NUMBER = "+1155578093";

/** Display-formatted phone */
export const PHONE_DISPLAY = "+1 155578093";

/** Build a wa.me URL with pre-filled message */
export const getWhatsAppLink = (message?: string): string => {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};
