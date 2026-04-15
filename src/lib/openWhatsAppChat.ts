/**
 * Opens WhatsApp chat for manual sending.
 * In preview/iframe environments, web.whatsapp.com can be blocked,
 * so we first try the native WhatsApp protocol and only then fall back to web URLs.
 */

function normalizeWhatsAppPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");

  if (!clean) return "";
  if (clean.startsWith("91") && clean.length === 12) return clean;
  if (clean.length === 10 && /^[6-9]/.test(clean)) return `91${clean}`;

  return clean;
}

function clickHiddenLink(url: string, target: "_self" | "_blank" | "_top"): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = target;
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function openWhatsAppChat(phone: string, message: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const full = normalizeWhatsAppPhone(phone);
  if (!full) {
    return;
  }

  const encodedMessage = encodeURIComponent(message || "");
  const query = encodedMessage ? `?text=${encodedMessage}` : "";
  const nativeUrl = `whatsapp://send?phone=${full}${encodedMessage ? `&text=${encodedMessage}` : ""}`;
  const webUrl = `https://wa.me/${full}${query}`;
  const apiFallbackUrl = `https://api.whatsapp.com/send?phone=${full}${encodedMessage ? `&text=${encodedMessage}` : ""}`;
  const inIframe = window.top !== window;

  try {
    clickHiddenLink(nativeUrl, "_self");
  } catch {
    // Ignore and proceed to web fallback.
  }

  window.setTimeout(() => {
    if (document.visibilityState === "hidden") {
      return;
    }

    try {
      if (inIframe) {
        clickHiddenLink(apiFallbackUrl, "_top");
        return;
      }

      const popup = window.open(webUrl, "_blank", "noopener,noreferrer");
      if (popup) {
        return;
      }
    } catch {
      // Fall through to anchor fallback below.
    }

    clickHiddenLink(inIframe ? apiFallbackUrl : webUrl, inIframe ? "_top" : "_blank");
  }, 900);
}
