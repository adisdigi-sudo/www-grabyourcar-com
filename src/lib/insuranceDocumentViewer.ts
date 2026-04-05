import { supabase } from "@/integrations/supabase/client";

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

const openBlobInNewTab = (blob: Blob) => {
  const blobUrl = URL.createObjectURL(blob);
  const newWindow = window.open(blobUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  return newWindow;
};

export async function openInsuranceStorageFile(options: {
  bucket?: "quote-pdfs" | "policy-documents";
  path?: string | null;
  url?: string | null;
}) {
  const { bucket, path, url } = options;

  if (bucket && path) {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;
    openBlobInNewTab(data);
    return;
  }

  if (url) {
    if (!isStorageUrl(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to open file (${response.status})`);
    }

    const blob = await response.blob();
    openBlobInNewTab(blob);
  }
}

export async function downloadInsuranceStorageFile(options: {
  bucket?: "quote-pdfs" | "policy-documents";
  path?: string | null;
  url?: string | null;
  fileName?: string;
}) {
  const { bucket, path, url, fileName } = options;

  let blob: Blob | null = null;
  let resolvedFileName = fileName || "document.pdf";

  if (bucket && path) {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;
    blob = data;
    resolvedFileName = fileName || path.split("/").pop() || resolvedFileName;
  } else if (url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file (${response.status})`);
    }
    blob = await response.blob();
    resolvedFileName = fileName || guessFileNameFromUrl(url, resolvedFileName);
  }

  if (!blob) {
    throw new Error("No file available to download");
  }

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = resolvedFileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
