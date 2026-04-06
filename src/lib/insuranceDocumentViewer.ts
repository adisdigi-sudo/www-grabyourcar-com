import { supabase } from "@/integrations/supabase/client";
import { appendPreviewQueryParams } from "@/lib/previewRouting";

export type InsuranceStorageBucket = "quote-pdfs" | "policy-documents" | "loan-documents";

export type InsuranceStorageFileOptions = {
  bucket?: InsuranceStorageBucket;
  path?: string | null;
  url?: string | null;
  fileName?: string;
};

const VIEWER_ROUTE = "/document-viewer";

const openUrlInNewTab = (url: string) => {
  const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (openedWindow) {
    openedWindow.opener = null;
    return;
  }

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

const sanitizeFileName = (value: string | null | undefined, fallback: string) => {
  const normalized = (value || fallback)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");

  return normalized || fallback;
};

const withPdfViewerParams = (url: string, fileReference?: string | null) => {
  const reference = (fileReference || url).toLowerCase();
  if (!reference.endsWith(".pdf") || url.includes("#")) return url;
  return `${url}#toolbar=1&navpanes=0`;
};

const normalizeBucket = (value?: string | null): InsuranceStorageBucket | undefined => {
  if (value === "quote-pdfs" || value === "policy-documents" || value === "loan-documents") return value;
  return undefined;
};

const inferStorageTargetFromUrl = (fileUrl?: string | null) => {
  if (!fileUrl) return null;

  try {
    const parsed = new URL(fileUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const objectIndex = segments.indexOf("object");
    if (objectIndex === -1) return null;

    const afterObject = segments.slice(objectIndex + 1).map((segment) => decodeURIComponent(segment));
    if (afterObject.length < 2) return null;

    const hasVisibilityPrefix = ["public", "sign", "authenticated"].includes(afterObject[0]);
    const bucketIndex = hasVisibilityPrefix ? 1 : 0;
    const bucket = normalizeBucket(afterObject[bucketIndex]);
    const path = afterObject.slice(bucketIndex + 1).join("/");

    if (!bucket || !path) return null;

    return { bucket, path };
  } catch {
    return null;
  }
};

export const resolveInsuranceFileRequest = (options: InsuranceStorageFileOptions) => {
  const inferredTarget = !options.bucket && !options.path ? inferStorageTargetFromUrl(options.url) : null;
  const bucket = options.bucket || inferredTarget?.bucket;
  const path = options.path || inferredTarget?.path || null;
  const url = bucket && path ? null : options.url || null;
  const fileName =
    sanitizeFileName(
      options.fileName ||
        (path ? path.split("/").pop() : undefined) ||
        (url ? guessFileNameFromUrl(url, "document.pdf") : "document.pdf"),
      "document.pdf",
    );

  return {
    bucket,
    path,
    url,
    fileName,
  } satisfies Required<Pick<InsuranceStorageFileOptions, "fileName">> & {
    bucket?: InsuranceStorageBucket;
    path: string | null;
    url: string | null;
  };
};

const revokeObjectUrlLater = (objectUrl: string) => {
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};

export const buildInsuranceDocumentViewerUrl = (
  options: InsuranceStorageFileOptions,
  mode: "view" | "download" = "view",
) => {
  const resolved = resolveInsuranceFileRequest(options);
  const viewerUrl = new URL(VIEWER_ROUTE, window.location.origin);

  appendPreviewQueryParams(viewerUrl);

  if (resolved.bucket && resolved.path) {
    viewerUrl.searchParams.set("bucket", resolved.bucket);
    viewerUrl.searchParams.set("path", resolved.path);
  } else if (resolved.url) {
    viewerUrl.searchParams.set("url", resolved.url);
  }

  if (resolved.fileName) {
    viewerUrl.searchParams.set("name", resolved.fileName);
  }

  if (mode === "download") {
    viewerUrl.searchParams.set("download", "1");
  }

  return viewerUrl.toString();
};

export const fetchInsuranceStorageFile = async (options: InsuranceStorageFileOptions) => {
  const { bucket, path, url, fileName } = resolveInsuranceFileRequest(options);

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

export async function openInsuranceStorageFile(options: InsuranceStorageFileOptions) {
  openUrlInNewTab(buildInsuranceDocumentViewerUrl(options, "view"));
}

export async function downloadInsuranceStorageFile(options: InsuranceStorageFileOptions) {
  const { blob, fileName: resolvedFileName } = await fetchInsuranceStorageFile(options);

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = resolvedFileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  revokeObjectUrlLater(blobUrl);
}