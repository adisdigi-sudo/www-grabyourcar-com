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

const openUrlInNewTab = (url: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
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

  if (bucket && path) {
    const resolvedUrl = await resolveStorageUrl(bucket, path);
    openUrlInNewTab(resolvedUrl);
    return;
  }

  if (url) {
    openUrlInNewTab(url);
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
