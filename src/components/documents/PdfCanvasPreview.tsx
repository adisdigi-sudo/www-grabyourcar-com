import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { Button } from "@/components/ui/button";

GlobalWorkerOptions.workerSrc = pdfWorker;

const PDF_PREVIEW_MAX_WIDTH = 1100;

type PdfCanvasPreviewProps = {
  fileUrl: string;
  fileName: string;
  onOpenInNewTab: () => void;
};

export const PdfCanvasPreview = ({ fileUrl, fileName, onOpenInNewTab }: PdfCanvasPreviewProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pageCount, setPageCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;

    const updateWidth = () => {
      const nextWidth = Math.round(node.clientWidth);
      setContainerWidth((current) => (current === nextWidth ? current : nextWidth));
    };

    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvasContainer = canvasContainerRef.current;
    if (!canvasContainer || !fileUrl || containerWidth === 0) return;

    let isCancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;
    const renderTasks: Array<{ cancel: () => void }> = [];

    const renderPdf = async () => {
      setStatus("loading");
      setPageCount(0);
      setErrorMessage(null);
      canvasContainer.innerHTML = "";

      try {
        loadingTask = getDocument(fileUrl);
        const pdf = await loadingTask.promise;

        if (isCancelled) return;

        setPageCount(pdf.numPages);

        const availableWidth = Math.max(containerWidth - 48, 280);
        const targetWidth = Math.min(availableWidth, PDF_PREVIEW_MAX_WIDTH);
        const pixelRatio = window.devicePixelRatio || 1;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (isCancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const scale = targetWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const pageWrapper = document.createElement("section");
          pageWrapper.className = "overflow-hidden rounded-lg border border-border bg-background shadow-sm";

          const pageLabel = document.createElement("div");
          pageLabel.className = "border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground";
          pageLabel.textContent = `Page ${pageNumber}`;

          const canvas = document.createElement("canvas");
          canvas.className = "block h-auto w-full bg-white";
          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Canvas preview is unavailable in this browser.");
          }

          pageWrapper.appendChild(pageLabel);
          pageWrapper.appendChild(canvas);
          canvasContainer.appendChild(pageWrapper);

          const renderTask = page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
          });

          renderTasks.push(renderTask);
          await renderTask.promise;
        }

        if (!isCancelled) {
          setStatus("ready");
        }
      } catch (error) {
        if (isCancelled) return;

        canvasContainer.innerHTML = "";
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "PDF preview couldn’t be rendered.");
      }
    };

    void renderPdf();

    return () => {
      isCancelled = true;
      canvasContainer.innerHTML = "";
      renderTasks.forEach((task) => {
        try {
          task.cancel();
        } catch {
          // ignore cleanup failures
        }
      });
      void loadingTask?.destroy();
    };
  }, [containerWidth, fileUrl]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
        {status === "ready" ? `${pageCount} page${pageCount === 1 ? "" : "s"}` : "Preparing in-app PDF preview"}
      </div>

      <div ref={hostRef} className="min-h-[78vh] bg-muted/20 p-3 md:p-6">
        {status === "loading" && (
          <div className="flex min-h-[72vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background/70 px-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Rendering PDF preview…</p>
              <p className="text-xs text-muted-foreground">{fileName}</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex min-h-[72vh] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-background px-6 text-center">
            <FileText className="h-6 w-6 text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Preview unavailable for this PDF</p>
              <p className="text-xs text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenInNewTab}>
              Open in new tab
            </Button>
          </div>
        )}

        <div
          ref={canvasContainerRef}
          className="mx-auto flex max-w-full flex-col gap-4"
          style={{ display: status === "ready" ? "flex" : "none" }}
        />
      </div>
    </div>
  );
};