/**
 * AdminImageUpload — drag/drop + URL upload with a live, zoomable
 * "fitment preview" so admins can see exactly how the image renders
 * in its target context (hero banner, card, logo, square) before saving.
 */

import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CloudUpload,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Monitor,
  Smartphone,
  Square,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FitmentPreviewMode = "hero-desktop" | "hero-mobile" | "card" | "logo" | "square" | "auto";

interface AdminImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  label?: string;
  placeholder?: string;
  recommendedSize?: string;
  /** Which fitment frame to show in the live preview */
  previewMode?: FitmentPreviewMode;
  /** Hide the side-by-side fitment preview (defaults to false) */
  hidePreview?: boolean;
}

interface UploadState {
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  fileName?: string;
}

export const AdminImageUpload = ({
  value,
  onChange,
  bucket = "car-assets",
  folder = "admin-uploads",
  label = "Image",
  placeholder = "https://example.com/image.jpg",
  recommendedSize,
  previewMode = "auto",
  hidePreview = false,
}: AdminImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle", progress: 0 });
  const [urlInput, setUrlInput] = useState("");
  const [activeTab, setActiveTab] = useState<string>("upload");

  // Auto-pick frame from recommendedSize hint if mode is "auto"
  const resolvedMode: FitmentPreviewMode =
    previewMode !== "auto"
      ? previewMode
      : recommendedSize?.includes("×")
        ? (() => {
            const [w, h] = recommendedSize.split("×").map((n) => parseInt(n.trim()));
            if (!w || !h) return "card";
            const ratio = w / h;
            if (ratio > 2) return "hero-desktop";
            if (ratio < 0.8) return "hero-mobile";
            if (Math.abs(ratio - 1) < 0.15) return "square";
            return "card";
          })()
        : "card";

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      setUploadState({ status: "uploading", progress: 30, fileName: file.name });

      try {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, { contentType: file.type, upsert: true });

        if (uploadError) throw uploadError;
        setUploadState((prev) => ({ ...prev, progress: 80 }));

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        onChange(urlData.publicUrl);
        setUploadState({ status: "done", progress: 100, fileName: file.name });
        toast.success("Image uploaded — preview updated");
      } catch (err: any) {
        setUploadState({ status: "error", progress: 0, error: err.message, fileName: file.name });
        toast.error(`Upload failed: ${err.message}`);
      }
    },
    [bucket, folder, onChange],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleUrlSubmit = () => {
    if (!urlInput.startsWith("http")) {
      toast.error("Enter a valid URL");
      return;
    }
    onChange(urlInput);
    setUrlInput("");
    toast.success("Image URL set");
  };

  const clearImage = () => {
    onChange("");
    setUploadState({ status: "idle", progress: 0 });
  };

  /* ──────────── Layout ──────────── */
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {recommendedSize && (
          <span className="text-[10px] text-muted-foreground">Recommended: {recommendedSize}</span>
        )}
      </div>

      <div className={cn("grid gap-4", !hidePreview && value && "lg:grid-cols-2")}>
        {/* ── LEFT: Uploader ── */}
        <div className="space-y-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="upload" className="text-xs h-7">
                <CloudUpload className="h-3 w-3 mr-1" /> Upload File
              </TabsTrigger>
              <TabsTrigger value="url" className="text-xs h-7">
                <Link2 className="h-3 w-3 mr-1" /> Paste URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-2 space-y-2">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30",
                )}
              >
                <CloudUpload
                  className={cn(
                    "h-7 w-7 mx-auto mb-1",
                    isDragOver ? "text-primary" : "text-muted-foreground/40",
                  )}
                />
                <p className="text-xs font-medium">
                  {isDragOver ? "Drop image here" : "Drag & drop or click to browse"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  JPG, PNG, WebP supported
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file);
                  e.target.value = "";
                }}
              />

              {uploadState.status !== "idle" && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{uploadState.fileName}</p>
                    {uploadState.status === "uploading" && (
                      <Progress value={uploadState.progress} className="h-1 mt-1" />
                    )}
                  </div>
                  {uploadState.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  )}
                  {uploadState.status === "done" && (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  )}
                  {uploadState.status === "error" && (
                    <span title={uploadState.error}>
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    </span>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="url" className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={placeholder}
                  className="text-xs h-8"
                  onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                />
                <Button
                  onClick={handleUrlSubmit}
                  disabled={!urlInput.startsWith("http")}
                  size="sm"
                  className="h-8 px-3"
                  type="button"
                >
                  Set
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {value && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2 text-[10px]">
              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1 font-mono">{value}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={clearImage}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Live Fitment Preview ── */}
        {!hidePreview && value && (
          <FitmentPreview imageUrl={value} initialMode={resolvedMode} />
        )}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
 * FitmentPreview — zoomable, mode-switching live preview
 * ────────────────────────────────────────────────────────── */
function FitmentPreview({
  imageUrl,
  initialMode,
}: {
  imageUrl: string;
  initialMode: FitmentPreviewMode;
}) {
  const [mode, setMode] = useState<FitmentPreviewMode>(
    initialMode === "auto" ? "card" : initialMode,
  );
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const frameClass: Record<Exclude<FitmentPreviewMode, "auto">, string> = {
    "hero-desktop": "aspect-[16/6] w-full",
    "hero-mobile": "aspect-[3/4] w-40 mx-auto",
    card: "aspect-[4/3] w-full",
    logo: "aspect-[3/1] w-full bg-foreground/95",
    square: "aspect-square w-48 mx-auto",
  };

  const frameLabel: Record<Exclude<FitmentPreviewMode, "auto">, string> = {
    "hero-desktop": "Desktop Hero",
    "hero-mobile": "Mobile Hero",
    card: "Card / Tile",
    logo: "Logo Strip",
    square: "Square / Avatar",
  };

  const activeMode = mode === "auto" ? "card" : mode;

  return (
    <div className="rounded-lg border bg-muted/20">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b bg-background/80 px-2 py-1.5 backdrop-blur">
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
          <ImageIcon className="h-3 w-3" /> {frameLabel[activeMode]}
        </Badge>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Slider
            value={[zoom * 100]}
            min={50}
            max={300}
            step={10}
            onValueChange={([v]) => setZoom(v / 100)}
            className="w-16"
          />
          <span className="text-[9px] font-mono tabular-nums w-8 text-right text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
            disabled={zoom >= 3}
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={reset}
            title="Reset"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Mode switcher */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b bg-background/40 px-2 py-1">
        <div className="flex flex-wrap gap-0.5">
          <FrameBtn active={activeMode === "hero-desktop"} onClick={() => setMode("hero-desktop")}>
            <Monitor className="h-3 w-3" />
            Desktop
          </FrameBtn>
          <FrameBtn active={activeMode === "hero-mobile"} onClick={() => setMode("hero-mobile")}>
            <Smartphone className="h-3 w-3" />
            Mobile
          </FrameBtn>
          <FrameBtn active={activeMode === "card"} onClick={() => setMode("card")}>
            Card
          </FrameBtn>
          <FrameBtn active={activeMode === "logo"} onClick={() => setMode("logo")}>
            Logo
          </FrameBtn>
          <FrameBtn active={activeMode === "square"} onClick={() => setMode("square")}>
            <Square className="h-3 w-3" />
            Square
          </FrameBtn>
        </div>
        <div className="flex gap-0.5">
          <FrameBtn active={fit === "cover"} onClick={() => setFit("cover")}>
            Cover
          </FrameBtn>
          <FrameBtn active={fit === "contain"} onClick={() => setFit("contain")}>
            Contain
          </FrameBtn>
        </div>
      </div>

      {/* Frame */}
      <div className="p-3">
        <div
          className={cn(
            "relative overflow-hidden rounded-md border bg-background shadow-inner",
            frameClass[activeMode],
            zoom > 1 && (isPanning.current ? "cursor-grabbing" : "cursor-grab"),
          )}
          onMouseDown={(e) => {
            if (zoom <= 1) return;
            isPanning.current = true;
            panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
          }}
          onMouseMove={(e) => {
            if (!isPanning.current) return;
            setPan({
              x: panStart.current.panX + (e.clientX - panStart.current.x),
              y: panStart.current.panY + (e.clientY - panStart.current.y),
            });
          }}
          onMouseUp={() => (isPanning.current = false)}
          onMouseLeave={() => (isPanning.current = false)}
        >
          <img
            src={imageUrl}
            alt="Fitment preview"
            draggable={false}
            className={cn(
              "h-full w-full select-none transition-transform",
              fit === "cover" ? "object-cover" : "object-contain",
            )}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center",
            }}
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = "0.3")}
          />
          {/* Mock overlay for hero */}
          {(activeMode === "hero-desktop" || activeMode === "hero-mobile") && (
            <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/10 to-transparent p-3">
              <div className="text-white">
                <div className="text-[10px] font-bold leading-tight">Sample headline</div>
                <div className="text-[8px] opacity-80">CTA text overlay preview</div>
              </div>
            </div>
          )}
          {activeMode === "card" && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-background/95 px-2 py-1 text-[9px] border-t">
              <div className="font-semibold truncate">Card title preview</div>
              <div className="text-muted-foreground truncate">Subtitle goes here</div>
            </div>
          )}
        </div>
        <p className="mt-2 text-[9px] text-muted-foreground text-center">
          Drag to pan when zoomed · switch frames to test all placements
        </p>
      </div>
    </div>
  );
}

function FrameBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export default AdminImageUpload;
