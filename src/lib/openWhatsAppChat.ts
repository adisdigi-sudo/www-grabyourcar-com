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

  if (!full) {
    return;
  }

  const encodedMessage = encodeURIComponent(message);
  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent);
  const url = isMobile
    ? `https://wa.me/${full}?text=${encodedMessage}`
    : `https://web.whatsapp.com/send?phone=${full}&text=${encodedMessage}`;

  try {
    if (typeof window !== "undefined" && window.top && window.top !== window) {
      const popup = window.top.open(url, "_blank", "noopener,noreferrer");
      if (popup) return;
    }
  } catch {
    // Ignore cross-origin access issues and continue with standard fallback.
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
