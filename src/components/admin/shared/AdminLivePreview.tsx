import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  ExternalLink,
  X,
} from "lucide-react";

interface AdminLivePreviewProps {
  previewPath: string;
  label?: string;
  isOpen: boolean;
  onToggle: () => void;
}

type ViewportMode = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTHS: Record<ViewportMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export function AdminLivePreview({
  previewPath,
  label = "Live Preview",
  isOpen,
  onToggle,
}: AdminLivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);

  const baseUrl = window.location.origin;
  const fullUrl = `${baseUrl}${previewPath}`;

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleOpenExternal = useCallback(() => {
    window.open(fullUrl, "_blank");
  }, [fullUrl]);

  if (!isOpen) return null;

  return (
    <div
      className="flex flex-col border-l border-border bg-muted/30 shrink-0"
      style={{ width: "45%", height: "calc(100vh - 4rem)" }}
    >
      {/* Preview Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">{label}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {previewPath}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {([
            { mode: "mobile" as ViewportMode, icon: Smartphone },
            { mode: "tablet" as ViewportMode, icon: Tablet },
            { mode: "desktop" as ViewportMode, icon: Monitor },
          ]).map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setViewport(mode)}
              className={cn(
                "p-1.5 rounded transition-colors",
                viewport === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
              title={mode}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}

          <div className="w-px h-4 bg-border mx-1" />

          <button
            onClick={handleRefresh}
            className="p-1.5 rounded text-muted-foreground hover:bg-accent transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1.5 rounded text-muted-foreground hover:bg-accent transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Close preview"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Iframe Container */}
      <div className="flex-1 overflow-hidden flex justify-center bg-muted/50 p-2">
        <div
          className={cn(
            "bg-background rounded-lg shadow-sm border border-border overflow-hidden transition-all duration-300",
            viewport !== "desktop" && "mx-auto"
          )}
          style={{
            width: VIEWPORT_WIDTHS[viewport],
            maxWidth: "100%",
            height: "100%",
          }}
        >
          <iframe
            ref={iframeRef}
            key={refreshKey}
            src={fullUrl}
            className="w-full h-full border-0"
            title={label}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            style={{ minHeight: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}

/** Compact toggle button to show/hide the preview panel */
export function PreviewToggleButton({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant={isOpen ? "default" : "outline"}
      size="sm"
      onClick={onToggle}
      className="gap-1.5"
    >
      {isOpen ? (
        <>
          <EyeOff className="h-3.5 w-3.5" />
          Hide Preview
        </>
      ) : (
        <>
          <Eye className="h-3.5 w-3.5" />
          Live Preview
        </>
      )}
    </Button>
  );
}
