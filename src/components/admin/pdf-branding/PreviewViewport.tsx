/**
 * PreviewViewport — wraps any preview with pan/zoom controls.
 * Used for the PDF Branding live preview so admins can zoom in/out
 * to inspect logo, header, footer details before saving.
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Move } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewViewportProps {
  children: React.ReactNode;
  /** Initial zoom level (1 = 100%) */
  defaultZoom?: number;
  /** Min zoom (default 0.4) */
  minZoom?: number;
  /** Max zoom (default 2.5) */
  maxZoom?: number;
  /** Optional label shown in toolbar */
  label?: string;
  className?: string;
}

export function PreviewViewport({
  children,
  defaultZoom = 0.85,
  minZoom = 0.4,
  maxZoom = 2.5,
  label,
  className,
}: PreviewViewportProps) {
  const [zoom, setZoom] = useState(defaultZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn = () => setZoom((z) => Math.min(maxZoom, +(z + 0.1).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(minZoom, +(z - 0.1).toFixed(2)));
  const resetView = () => {
    setZoom(defaultZoom);
    setPan({ x: 0, y: 0 });
  };
  const fitToWidth = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom (Ctrl/Cmd + scroll)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom((z) => Math.min(maxZoom, Math.max(minZoom, +(z + delta).toFixed(2))));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [maxZoom, minZoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  };
  const stopPan = () => setIsPanning(false);

  return (
    <div className={cn("flex flex-col rounded-lg border bg-muted/30", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b bg-background/80 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          {label && (
            <Badge variant="outline" className="text-[10px] font-medium truncate">
              {label}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            Ctrl+scroll to zoom · drag to pan
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={zoomOut} disabled={zoom <= minZoom}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-1.5 px-2 min-w-[110px]">
            <Slider
              value={[zoom * 100]}
              min={minZoom * 100}
              max={maxZoom * 100}
              step={5}
              onValueChange={([v]) => setZoom(v / 100)}
              className="w-20"
            />
            <span className="text-[10px] font-mono tabular-nums text-muted-foreground w-9 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={zoomIn} disabled={zoom >= maxZoom}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={fitToWidth} title="Fit to width">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={resetView} title="Reset view">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Scroll viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopPan}
        onMouseLeave={stopPan}
        className={cn(
          "relative overflow-auto p-4",
          zoom > 1 && (isPanning ? "cursor-grabbing" : "cursor-grab"),
        )}
        style={{ maxHeight: "calc(100vh - 220px)", minHeight: 420 }}
      >
        <div
          className="origin-top mx-auto transition-transform duration-150 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: "100%",
            maxWidth: 480,
          }}
        >
          {children}
        </div>
        {zoom > 1 && (
          <div className="pointer-events-none absolute bottom-2 right-3 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] text-muted-foreground shadow">
            <Move className="h-3 w-3" /> Drag to pan
          </div>
        )}
      </div>
    </div>
  );
}
