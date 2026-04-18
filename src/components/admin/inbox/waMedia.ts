// Helpers to render WhatsApp media URLs in the inbox UI.
// Inbound media from Meta is stored as the raw Meta media ID (no http prefix).
// Outbound media we send is already a public Supabase storage URL.
// For inbound IDs we route through the `whatsapp-media-proxy` edge function,
// which downloads the bytes (with auth), caches them in the wa-media bucket
// and 302-redirects to the cached public URL — so it works in <img>/<video>.

const SUPABASE_PROJECT_ID = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID || "ynoiwioypxpurwdbjvyt";
const FUNCTIONS_BASE = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
}

/** Returns a URL safe to use in <img>, <video>, <audio>, or download links. */
export function resolveWaMediaUrl(
  mediaUrl: string | null | undefined,
  opts?: { download?: boolean; filename?: string | null },
): string | null {
  if (!mediaUrl) return null;
  if (isHttpUrl(mediaUrl)) return mediaUrl;
  // It's a Meta media id — proxy it.
  const params = new URLSearchParams({ id: mediaUrl });
  if (opts?.download) params.set("download", "1");
  if (opts?.filename) params.set("filename", opts.filename);
  return `${FUNCTIONS_BASE}/whatsapp-media-proxy?${params.toString()}`;
}

export function isImageMime(mime: string | null | undefined, type?: string | null): boolean {
  if (type === "image" || type === "sticker") return true;
  return !!mime && mime.toLowerCase().startsWith("image/");
}

export function isVideoMime(mime: string | null | undefined, type?: string | null): boolean {
  if (type === "video") return true;
  return !!mime && mime.toLowerCase().startsWith("video/");
}

export function isAudioMime(mime: string | null | undefined, type?: string | null): boolean {
  if (type === "audio" || type === "voice" || type === "ptt") return true;
  return !!mime && mime.toLowerCase().startsWith("audio/");
}

export function isDocumentMime(mime: string | null | undefined, type?: string | null): boolean {
  if (type === "document") return true;
  if (!mime) return false;
  const m = mime.toLowerCase();
  return m.includes("pdf") || m.includes("word") || m.includes("excel") || m.includes("sheet")
    || m.includes("powerpoint") || m.includes("presentation") || m.includes("text/")
    || m.includes("zip") || m.includes("csv");
}

export function prettyFileLabel(mime: string | null | undefined, filename: string | null | undefined): string {
  if (filename) return filename;
  if (!mime) return "Document";
  if (mime.includes("pdf")) return "PDF document";
  if (mime.includes("word")) return "Word document";
  if (mime.includes("excel") || mime.includes("sheet")) return "Spreadsheet";
  if (mime.includes("presentation")) return "Presentation";
  return "Document";
}
