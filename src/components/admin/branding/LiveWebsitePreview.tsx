/**
 * LiveWebsitePreview
 * ------------------
 * A REAL preview of the public website inside the admin Branding panel.
 *
 * - Loads "/" inside an iframe with a cache-buster query param
 * - Switches between Desktop / Tablet / Mobile viewports
 * - Lets admins jump to other live pages (Header / Footer / Hero / Auth)
 *   without leaving the admin
 * - Exposes a `refreshKey` prop so the parent can force-reload after save
 */

import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ExternalLink,
  Eye,
} from "lucide-react";

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTH: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "820px",
  mobile: "390px",
};

const ROUTES: { label: string; path: string }[] = [
  { label: "Home", path: "/" },
  { label: "New Cars", path: "/new-cars" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

interface LiveWebsitePreviewProps {
  /** Increment to force the iframe to reload (e.g. after Save) */
  refreshKey?: number;
  /** Optional badge to indicate "auto-syncing" */
  syncing?: boolean;
}

export const LiveWebsitePreview = ({
  refreshKey = 0,
  syncing = false,
}: LiveWebsitePreviewProps) => {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [path, setPath] = useState<string>("/");
  const [manualRefresh, setManualRefresh] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Cache-bust on every save or manual refresh so the iframe always re-fetches assets
  const src = useMemo(() => {
    const stamp = `${refreshKey}-${manualRefresh}`;
    const sep = path.includes("?") ? "&" : "?";
    return `${baseUrl}${path}${sep}_brandingPreview=${encodeURIComponent(stamp)}`;
  }, [baseUrl, path, refreshKey, manualRefresh]);

  return (
    <Card className="border-primary/30 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Live Website Preview
            {syncing && (
              <Badge variant="secondary" className="text-[10px] animate-pulse">
                Syncing…
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {([
              { mode: "mobile" as Viewport, icon: Smartphone, label: "Mobile" },
              { mode: "tablet" as Viewport, icon: Tablet, label: "Tablet" },
              { mode: "desktop" as Viewport, icon: Monitor, label: "Desktop" },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewport(mode)}
                title={label}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewport === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setManualRefresh((k) => k + 1)}
              title="Refresh"
              className="p-1.5 rounded text-muted-foreground hover:bg-accent"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => window.open(`${baseUrl}${path}`, "_blank")}
              title="Open in new tab"
              className="p-1.5 rounded text-muted-foreground hover:bg-accent"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Page picker — lets admins preview every placement */}
        <div className="flex flex-wrap gap-1 pt-2">
          {ROUTES.map((r) => (
            <button
              key={r.path}
              type="button"
              onClick={() => setPath(r.path)}
              className={cn(
                "text-[11px] px-2 py-0.5 rounded border transition-colors",
                path === r.path
                  ? "bg-primary/10 border-primary text-primary font-medium"
                  : "border-border text-muted-foreground hover:bg-accent",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="rounded-lg border bg-muted/30 p-2 flex justify-center">
          <div
            className="bg-background border border-border rounded-md overflow-hidden shadow-inner transition-all duration-300"
            style={{
              width: VIEWPORT_WIDTH[viewport],
              maxWidth: "100%",
              height: viewport === "mobile" ? 640 : viewport === "tablet" ? 700 : 720,
            }}
          >
            <iframe
              ref={iframeRef}
              key={src}
              src={src}
              title="Live website preview"
              className="w-full h-full border-0 bg-background"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground text-center">
          Updates apply instantly when you click Save · switch pages above to preview
          header, footer, hero, and more.
        </p>
      </CardContent>
    </Card>
  );
};
