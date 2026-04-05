import { supabase } from "@/integrations/supabase/client";

const OBJECT_URL_TTL = 60_000;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isStorageUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes("/storage/v1/object/public/") || parsed.pathname.includes("/storage/v1/object/sign/");
  } catch {
    return false;
  }
};

const guessFileNameFromUrl = (url: string, fallback: string) => {
  try {
    const parsed = new URL(url);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
    return lastSegment || fallback;
  } catch {
    return fallback;
  }
};

const openUrlInNewTab = (url: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

const openPendingTab = () => {
  try {
    return window.open("", "_blank");
  } catch {
    return null;
  }
};

const writeTabDocument = (tab: Window | null, title: string, body: string) => {
  if (!tab || tab.closed) return;

  try {
    tab.document.open();
    tab.document.write(`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(title)}</title>
          <style>
            :root { color-scheme: light; }
            * { box-sizing: border-box; }
            html, body { margin: 0; height: 100%; background: #0f172a; color: #e2e8f0; font-family: system-ui, sans-serif; }
            .viewer-shell { min-height: 100%; display: flex; flex-direction: column; }
            .viewer-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: #020617; border-bottom: 1px solid rgba(148, 163, 184, 0.2); }
            .viewer-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .viewer-frame { flex: 1; width: 100%; border: 0; background: white; }
            .viewer-state { min-height: 100%; display: grid; place-items: center; padding: 24px; text-align: center; }
            .viewer-copy { max-width: 420px; }
            .viewer-copy strong { display: block; font-size: 16px; margin-bottom: 8px; }
            .viewer-copy span { font-size: 13px; opacity: 0.78; }
          </style>
        </head>
        <body>${body}</body>
      </html>`);
    tab.document.close();
  } catch {
    // Ignore document write failures
  }
};

const setPendingTabMessage = (tab: Window | null, message: string) => {
  writeTabDocument(
    tab,
    message,
    `
      <div class="viewer-state">
        <div class="viewer-copy">
          <strong>${escapeHtml(message)}</strong>
          <span>Preparing your document preview…</span>
        </div>
      </div>
    `
  );
};

const revokeObjectUrlLater = (objectUrl: string) => {
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), OBJECT_URL_TTL);
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }

  return btoa(binary);
};

const openBlobInNewTab = async (blob: Blob, pendingTab: Window | null, fileName: string) => {
  const mimeType = blob.type || "application/pdf";
  const fileData = arrayBufferToBase64(await blob.arrayBuffer());

  if (pendingTab && !pendingTab.closed) {
    try {
      writeTabDocument(
        pendingTab,
        fileName,
        `
          <div class="viewer-shell">
            <div class="viewer-bar">
              <div class="viewer-title">${escapeHtml(fileName)}</div>
            </div>
            <iframe id="insurance-pdf-viewer" class="viewer-frame"></iframe>
          </div>
          <script>
            (function () {
              const mimeType = ${JSON.stringify(mimeType)};
              const base64 = ${JSON.stringify(fileData)};
              const bytes = Uint8Array.from(atob(base64), function (char) {
                return char.charCodeAt(0);
              });
              const pdfBlob = new Blob([bytes], { type: mimeType });
              const pdfUrl = URL.createObjectURL(pdfBlob);
              const frame = document.getElementById('insurance-pdf-viewer');

              if (frame) {
                frame.src = pdfUrl + '#toolbar=1&navpanes=0';
              }

              window.addEventListener('beforeunload', function () {
                URL.revokeObjectURL(pdfUrl);
              });
            })();
          </script>
        `
      );
      return;
    } catch {
      try {
        pendingTab.close();
      } catch {
        // no-op
      }
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  openUrlInNewTab(objectUrl);
  revokeObjectUrlLater(objectUrl);
};

const resolveFileBlob = async (options: {
  bucket?: "quote-pdfs" | "policy-documents";
  path?: string | null;
  url?: string | null;
  fileName?: string;
}) => {
  const { bucket, path, url, fileName } = options;

  if (bucket && path) {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;

    return {
      blob: data,
      fileName: fileName || path.split("/").pop() || "document.pdf",
    };
  }

  if (url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file (${response.status})`);
    }

    return {
      blob: await response.blob(),
      fileName: fileName || guessFileNameFromUrl(url, "document.pdf"),
    };
  }

  throw new Error("No file available");
};

export async function openInsuranceStorageFile(options: {
  bucket?: "quote-pdfs" | "policy-documents";
  path?: string | null;
  url?: string | null;
}) {
  const { bucket, path, url } = options;

  const shouldUseBlobPreview = Boolean(
    (bucket && path) || (url && isStorageUrl(url))
  );

  if (!shouldUseBlobPreview && url) {
    openUrlInNewTab(url);
    return;
  }

  const pendingTab = openPendingTab();
  setPendingTabMessage(pendingTab, "Opening document");

  try {
    const { blob, fileName } = await resolveFileBlob({ bucket, path, url });
    await openBlobInNewTab(blob, pendingTab, fileName);
  } catch (error) {
    if (pendingTab && !pendingTab.closed) {
      try {
        pendingTab.close();
      } catch {
        // no-op
      }
    }

    throw error;
  }
}

export async function downloadInsuranceStorageFile(options: {
  bucket?: "quote-pdfs" | "policy-documents";
  path?: string | null;
  url?: string | null;
  fileName?: string;
}) {
  const { blob, fileName: resolvedFileName } = await resolveFileBlob(options);

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = resolvedFileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  revokeObjectUrlLater(blobUrl);
}
