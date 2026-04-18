/**
 * LogoFitPreview
 * --------------
 * Live "how will it look on the website" preview for the brand logo.
 * - Renders mock Header (light), Footer (dark) and Mobile header
 * - Honours height/width settings from the form
 * - Detects natural dimensions of the uploaded image and suggests
 *   optimal heights so a tiny PNG no longer renders microscopically.
 */

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Monitor, Smartphone, Layout } from "lucide-react";

interface LogoFitPreviewProps {
  logoUrl: string;
  logoDarkUrl?: string;
  brandName: string;
  tagline: string;
  heightHeader: number;
  heightFooter: number;
  heightMobile: number;
  widthHeader: number;
  widthFooter: number;
  widthMobile: number;
  positionHorizontal: "left" | "center" | "right";
  onApplySuggested: (sizes: {
    heightHeader: number;
    heightFooter: number;
    heightMobile: number;
  }) => void;
}

interface NaturalSize {
  width: number;
  height: number;
  ratio: number;
}

/** Suggest sizes so the logo visually balances the chrome heights */
const suggestSizes = (natural: NaturalSize) => {
  const { ratio } = natural; // width / height
  // Aim for header ~64px tall for square-ish logos, taller chrome for wide ones
  // Wide logos (ratio > 3) → shorter heights so they don't overflow
  // Tall logos (ratio < 1) → bigger heights to be readable
  let header = 64;
  let footer = 56;
  let mobile = 40;

  if (ratio >= 4) {
    header = 48;
    footer = 40;
    mobile = 32;
  } else if (ratio >= 2.5) {
    header = 56;
    footer = 48;
    mobile = 36;
  } else if (ratio >= 1.5) {
    header = 64;
    footer = 56;
    mobile = 40;
  } else if (ratio >= 1) {
    header = 72;
    footer = 60;
    mobile = 44;
  } else {
    // Tall / square logo
    header = 80;
    footer = 64;
    mobile = 48;
  }

  return { heightHeader: header, heightFooter: footer, heightMobile: mobile };
};

export const LogoFitPreview = ({
  logoUrl,
  logoDarkUrl,
  brandName,
  tagline,
  heightHeader,
  heightFooter,
  heightMobile,
  widthHeader,
  widthFooter,
  widthMobile,
  positionHorizontal,
  onApplySuggested,
}: LogoFitPreviewProps) => {
  const [natural, setNatural] = useState<NaturalSize | null>(null);
  const probeRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!logoUrl) {
      setNatural(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setNatural({
          width: img.naturalWidth,
          height: img.naturalHeight,
          ratio: img.naturalWidth / img.naturalHeight,
        });
      }
    };
    img.onerror = () => setNatural(null);
    img.src = logoUrl;
  }, [logoUrl]);

  const suggested = natural ? suggestSizes(natural) : null;

  const justifyClass =
    positionHorizontal === "center"
      ? "justify-center"
      : positionHorizontal === "right"
      ? "justify-end"
      : "justify-start";

  const darkLogo = logoDarkUrl?.trim() ? logoDarkUrl : logoUrl;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Layout className="h-4 w-4 text-primary" />
            Live Website Preview
          </CardTitle>
          {natural && (
            <Badge variant="outline" className="text-[10px]">
              Source: {natural.width}×{natural.height}px · ratio {natural.ratio.toFixed(2)}
            </Badge>
          )}
        </div>
        {suggested && (
          <div className="flex items-center justify-between gap-2 pt-2 px-3 py-2 rounded-md bg-primary/5 border border-primary/20">
            <div className="text-xs text-foreground/80">
              <Sparkles className="h-3.5 w-3.5 inline mr-1 text-primary" />
              Suggested fit:{" "}
              <span className="font-semibold">
                Header {suggested.heightHeader}px · Footer {suggested.heightFooter}px · Mobile{" "}
                {suggested.heightMobile}px
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => onApplySuggested(suggested)}
            >
              Apply auto-fit
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Desktop Header (light) */}
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
            <Monitor className="h-3.5 w-3.5" />
            Desktop header (light theme)
          </div>
          <div className="rounded-lg border bg-background overflow-hidden shadow-sm">
            <div className={`flex items-center px-6 py-3 gap-6 ${justifyClass}`}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  style={{
                    height: heightHeader,
                    width: widthHeader > 0 ? widthHeader : "auto",
                    maxWidth: 320,
                  }}
                  className="object-contain"
                />
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  Upload a logo to preview
                </div>
              )}
              <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground ml-auto">
                <span>New Cars</span>
                <span>Loans</span>
                <span>Insurance</span>
                <span>Blog</span>
                <Button size="sm" className="h-8">Get Quote</Button>
              </nav>
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5" />
            Mobile header
          </div>
          <div className="rounded-lg border bg-background overflow-hidden shadow-sm max-w-[380px]">
            <div className={`flex items-center px-3 py-2 gap-3 ${justifyClass}`}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  style={{
                    height: heightMobile,
                    width: widthMobile > 0 ? widthMobile : "auto",
                    maxWidth: 160,
                  }}
                  className="object-contain"
                />
              ) : (
                <div className="text-xs text-muted-foreground italic">No logo</div>
              )}
              <div className="ml-auto flex items-center gap-2 text-muted-foreground">
                <div className="h-5 w-5 rounded bg-muted" />
                <div className="h-5 w-5 rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer (dark) */}
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
            <Monitor className="h-3.5 w-3.5" />
            Footer (dark theme)
          </div>
          <div
            className="rounded-lg overflow-hidden shadow-sm"
            style={{ background: "hsl(220 40% 12%)" }}
          >
            <div className={`flex items-center px-6 py-4 gap-4 ${justifyClass}`}>
              {darkLogo ? (
                <img
                  src={darkLogo}
                  alt={brandName}
                  style={{
                    height: heightFooter,
                    width: widthFooter > 0 ? widthFooter : "auto",
                    maxWidth: 280,
                  }}
                  className="object-contain"
                />
              ) : (
                <div className="text-xs text-white/60 italic">No logo</div>
              )}
              <div className="text-white/80">
                <div className="font-semibold text-sm">{brandName}</div>
                <div className="text-[11px] text-white/60">{tagline}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden probe (kept for completeness, not strictly needed) */}
        <img ref={probeRef} src={logoUrl} alt="" className="hidden" />
      </CardContent>
    </Card>
  );
};
