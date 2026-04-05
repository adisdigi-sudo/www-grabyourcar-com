import { supabase } from "@/integrations/supabase/client";

const OBJECT_URL_TTL = 60_000;

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
    return window.open("", "_blank", "noopener,noreferrer");
  } catch {
    return null;
  }
};

const setPendingTabMessage = (tab: Window | null, message: string) => {
  if (!tab) return;

  try {
    tab.document.title = message;
    tab.document.body.innerHTML = `
      <div style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;">
        <div style="text-align:center;padding:24px;">
          <div style="font-size:16px;font-weight:600;margin-bottom:8px;">${message}</div>
          <div style="font-size:13px;opacity:.72;">Preparing your document preview…</div>
        </div>
      </div>
    `;
  } catch {
    // Ignore cross-window write failures
  }
};

const revokeObjectUrlLater = (objectUrl: string) => {
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), OBJECT_URL_TTL);
};

const openBlobInNewTab = (blob: Blob, pendingTab: Window | null) => {
  const objectUrl = URL.createObjectURL(blob);

  if (pendingTab && !pendingTab.closed) {
    try {
      pendingTab.location.href = objectUrl;
      revokeObjectUrlLater(objectUrl);
      return;
    } catch {
      try {
        pendingTab.close();
      } catch {
        // no-op
      }
    }
  }

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

const resolveStorageUrl = async (bucket: "quote-pdfs" | "policy-documents", path: string) => {
  const { data: signedData, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 15);

  if (!error && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (data?.publicUrl) {
    return data.publicUrl;
  }

  throw error ?? new Error("Failed to resolve file URL");
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
    const { blob } = await resolveFileBlob({ bucket, path, url });
    openBlobInNewTab(blob, pendingTab);
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
