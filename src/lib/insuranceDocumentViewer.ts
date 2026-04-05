import { supabase } from "@/integrations/supabase/client";

const openUrlInNewTab = (url: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
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

const withPdfViewerParams = (url: string, fileReference?: string | null) => {
  const reference = (fileReference || url).toLowerCase();
  if (!reference.endsWith(".pdf") || url.includes("#")) return url;
  return `${url}#toolbar=1&navpanes=0`;
};

const revokeObjectUrlLater = (objectUrl: string) => {
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
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

const resolveOpenUrl = (options: {
  bucket?: "quote-pdfs" | "policy-documents";
  path?: string | null;
  url?: string | null;
}) => {
  const { bucket, path, url } = options;

  if (bucket && path) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (!data.publicUrl) throw new Error("Could not resolve file URL");
    return withPdfViewerParams(data.publicUrl, path);
  }

  if (url) {
    return withPdfViewerParams(url, url);
  }

  throw new Error("No file available");
};

export async function openInsuranceStorageFile(options: {
  bucket?: "quote-pdfs" | "policy-documents";
  path?: string | null;
  url?: string | null;
}) {
  openUrlInNewTab(resolveOpenUrl(options));
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