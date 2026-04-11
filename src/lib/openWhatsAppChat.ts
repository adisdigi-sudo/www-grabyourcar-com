/**
 * Opens WhatsApp chat directly via wa.me link (primary delivery method).
 * This guarantees message reaches the customer since user sends it manually.
 */
export function openWhatsAppChat(phone: string, message: string): void {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  let full = clean;
  if (!clean.startsWith("91") && clean.length === 10 && /^[6-9]/.test(clean)) {
    full = `91${clean}`;
  }
  const url = `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
