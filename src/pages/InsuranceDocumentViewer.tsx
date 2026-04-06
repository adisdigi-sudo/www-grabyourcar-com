import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, Download, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  fetchInsuranceStorageFile,
  type InsuranceStorageBucket,
  resolveInsuranceFileRequest,
} from "@/lib/insuranceDocumentViewer";

type ViewerState = {
  status: "loading" | "ready" | "error";
  objectUrl: string | null;
  fileName: string;
  mimeType: string;
  errorMessage: string | null;
};

const isValidBucket = (value?: string | null): value is InsuranceStorageBucket => {
  return value === "quote-pdfs" || value === "policy-documents";
};

const withPdfToolbar = (url: string, fileName: string, mimeType: string) => {
  const pdfLike = mimeType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
  return pdfLike ? `${url}#toolbar=1&navpanes=0` : url;
};

const InsuranceDocumentViewer = () => {
  const location = useLocation();
  const autoDownloadTriggeredRef = useRef(false);
  const [state, setState] = useState<ViewerState>({
    status: "loading",
    objectUrl: null,
    fileName: "document.pdf",
    mimeType: "application/pdf",
    errorMessage: null,
  });

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const shouldAutoDownload = searchParams.get("download") === "1";
  const bucketParam = searchParams.get("bucket");

  const fileRequest = useMemo(
    () =>
      resolveInsuranceFileRequest({
        bucket: isValidBucket(bucketParam) ? bucketParam : undefined,
        path: searchParams.get("path"),
        url: searchParams.get("url"),
        fileName: searchParams.get("name") || undefined,
      }),
    [bucketParam, searchParams],
  );

  useEffect(() => {
    let isActive = true;
    let localObjectUrl: string | null = null;
    autoDownloadTriggeredRef.current = false;

    if (!fileRequest.bucket && !fileRequest.url) {
      setState({
        status: "error",
        objectUrl: null,
        fileName: fileRequest.fileName,
        mimeType: "application/octet-stream",
        errorMessage: "No document reference was provided.",
      });
      return;
    }

    setState((current) => ({
      ...current,
      status: "loading",
      objectUrl: null,
      fileName: fileRequest.fileName,
      errorMessage: null,
    }));

    void fetchInsuranceStorageFile(fileRequest)
      .then(({ blob, fileName }) => {
        if (!isActive) return;

        localObjectUrl = URL.createObjectURL(blob);
        setState({
          status: "ready",
          objectUrl: localObjectUrl,
          fileName,
          mimeType: blob.type || "application/octet-stream",
          errorMessage: null,
        });
      })
      .catch((error) => {
        if (!isActive) return;

        setState({
          status: "error",
          objectUrl: null,
          fileName: fileRequest.fileName,
          mimeType: "application/octet-stream",
          errorMessage: error instanceof Error ? error.message : "Failed to load document.",
        });
      });

    return () => {
      isActive = false;
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [fileRequest]);

  const handleDownload = () => {
    if (!state.objectUrl) return;

    const anchor = document.createElement("a");
    anchor.href = state.objectUrl;
    anchor.download = state.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  useEffect(() => {
    if (state.status !== "ready" || !state.objectUrl || !shouldAutoDownload || autoDownloadTriggeredRef.current) {
      return;
    }

    autoDownloadTriggeredRef.current = true;
    handleDownload();
  }, [shouldAutoDownload, state.status, state.objectUrl, state.fileName]);

  const isPdf = state.mimeType.includes("pdf") || state.fileName.toLowerCase().endsWith(".pdf");
  const isImage = state.mimeType.startsWith("image/");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Insurance Document Viewer</p>
            <h1 className="truncate text-sm font-semibold md:text-base">{state.fileName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!state.objectUrl} className="gap-2">
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        {state.status === "loading" && (
          <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium">Loading document…</p>
              <p className="text-xs text-muted-foreground">Preparing a safe in-app preview and download link.</p>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Could not load this document</p>
              <p className="text-xs text-muted-foreground">{state.errorMessage}</p>
            </div>
          </div>
        )}

        {state.status === "ready" && state.objectUrl && (
          <>
            {isPdf && (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <object
                  data={withPdfToolbar(state.objectUrl, state.fileName, state.mimeType)}
                  type={state.mimeType || "application/pdf"}
                  aria-label={state.fileName}
                  className="h-[78vh] w-full"
                >
                  <div className="flex h-[78vh] flex-col items-center justify-center gap-3 px-6 text-center">
                    <FileText className="h-6 w-6 text-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Inline PDF preview isn’t available in this browser</p>
                      <p className="text-xs text-muted-foreground">Use download above to save the file, or open it in a new tab.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open(state.objectUrl, "_blank", "noopener,noreferrer")}>
                      Open in new tab
                    </Button>
                  </div>
                </object>
              </div>
            )}

            {isImage && (
              <div className="rounded-xl border border-border bg-card p-4">
                <img src={state.objectUrl} alt={state.fileName} className="mx-auto max-h-[78vh] w-auto max-w-full rounded-lg" />
              </div>
            )}

            {!isPdf && !isImage && (
              <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 text-center">
                <FileText className="h-6 w-6 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Preview is unavailable for this file type</p>
                  <p className="text-xs text-muted-foreground">Use the download button above to save the document locally.</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default InsuranceDocumentViewer;