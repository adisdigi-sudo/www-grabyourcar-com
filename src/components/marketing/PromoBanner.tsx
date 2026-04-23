/**
 * PromoBanner — color-coded promotional banner with countdown timer.
 *
 * Source of truth: public.promotional_banners table.
 * Filters by page scope (slug or 'all') and only shows non-expired active banners.
 *
 * Color theme map ensures every offer type renders consistently.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackConversion } from "@/lib/conversionTracking";
import { X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BannerRow {
  id: string;
  slug: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_url: string | null;
  offer_type: string;
  color_theme: string;
  ends_at: string | null;
  display_order: number;
  page_scope: string[] | null;
}

const THEME: Record<string, { bg: string; text: string; cta: string; border: string }> = {
  red: {
    bg: "bg-gradient-to-r from-red-600 to-orange-500",
    text: "text-white",
    cta: "bg-white text-red-600 hover:bg-white/90",
    border: "border-red-700",
  },
  green: {
    bg: "bg-gradient-to-r from-emerald-600 to-green-500",
    text: "text-white",
    cta: "bg-white text-emerald-700 hover:bg-white/90",
    border: "border-emerald-700",
  },
  blue: {
    bg: "bg-gradient-to-r from-blue-600 to-sky-500",
    text: "text-white",
    cta: "bg-white text-blue-700 hover:bg-white/90",
    border: "border-blue-700",
  },
  amber: {
    bg: "bg-gradient-to-r from-amber-500 to-yellow-500",
    text: "text-black",
    cta: "bg-black text-white hover:bg-black/90",
    border: "border-amber-600",
  },
  purple: {
    bg: "bg-gradient-to-r from-purple-600 to-fuchsia-500",
    text: "text-white",
    cta: "bg-white text-purple-700 hover:bg-white/90",
    border: "border-purple-700",
  },
  primary: {
    bg: "bg-gradient-to-r from-primary to-primary/80",
    text: "text-primary-foreground",
    cta: "bg-background text-primary hover:bg-background/90",
    border: "border-primary",
  },
};

interface PromoBannerProps {
  /** Page slug used to filter banners (e.g., 'home', 'car-insurance', 'hsrp'). */
  scope: string;
  /** Optional: restrict to a single banner slug. */
  bannerSlug?: string;
  className?: string;
}

const formatCountdown = (ms: number) => {
  if (ms <= 0) return "Ending soon";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m left`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s left`;
  return `${minutes}m ${seconds}s left`;
};

export function PromoBanner({ scope, bannerSlug, className }: PromoBannerProps) {
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = sessionStorage.getItem("gyc_dismissed_banners");
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("promotional_banners")
        .select("id, slug, title, message, cta_label, cta_url, offer_type, color_theme, ends_at, display_order, page_scope")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (cancelled || error || !data) return;
      const filtered = (data as BannerRow[]).filter((b) => {
        if (bannerSlug && b.slug !== bannerSlug) return false;
        if (b.ends_at && new Date(b.ends_at).getTime() <= Date.now()) return false;
        const scopes = b.page_scope || ["all"];
        return scopes.includes("all") || scopes.includes(scope);
      });
      setBanners(filtered);
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, bannerSlug]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(() => banners.filter((b) => !dismissed.has(b.id)), [banners, dismissed]);

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        sessionStorage.setItem("gyc_dismissed_banners", JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleCta = (b: BannerRow) => {
    trackConversion({
      event_type: "cta_click",
      cta_label: `banner:${b.slug}`,
      vertical: scope,
      campaign: b.offer_type,
    });
  };

  if (visible.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {visible.map((b) => {
        const theme = THEME[b.color_theme] || THEME.primary;
        const remaining = b.ends_at ? new Date(b.ends_at).getTime() - now : null;
        return (
          <div
            key={b.id}
            className={cn(
              "relative rounded-lg border-2 px-4 py-3 shadow-md flex items-center justify-between gap-3 flex-wrap",
              theme.bg,
              theme.text,
              theme.border,
            )}
          >
            <div className="flex-1 min-w-[220px]">
              <div className="font-bold text-base md:text-lg leading-tight">{b.title}</div>
              <div className="text-sm opacity-95">{b.message}</div>
            </div>
            <div className="flex items-center gap-2">
              {remaining !== null && (
                <span className={cn("inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-1 text-xs font-mono", theme.text)}>
                  <Clock className="h-3 w-3" />
                  {formatCountdown(remaining)}
                </span>
              )}
              {b.cta_label && b.cta_url && (
                <a
                  href={b.cta_url}
                  onClick={() => handleCta(b)}
                  target={b.cta_url.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm transition-transform hover:scale-105",
                    theme.cta,
                  )}
                >
                  {b.cta_label}
                </a>
              )}
              <button
                aria-label="Dismiss banner"
                onClick={() => dismiss(b.id)}
                className={cn("rounded-full p-1 hover:bg-black/20", theme.text)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PromoBanner;
