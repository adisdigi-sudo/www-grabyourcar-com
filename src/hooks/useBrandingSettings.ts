import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BrandingSettings {
  logo_url: string;
  logo_dark_url: string;
  animated_logo_url: string;
  use_animated_logo: boolean;
  favicon_url: string;
  og_image_url: string;
  primary_color: string;
  secondary_color: string;
  brand_name: string;
  tagline: string;
  logo_height_header: number;
  logo_height_footer: number;
  logo_height_mobile: number;
  logo_width_header: number;
  logo_width_footer: number;
  logo_width_mobile: number;
  logo_position_horizontal: "left" | "center" | "right";
  logo_position_vertical: "top" | "center" | "bottom";
  banner_height_desktop: number;
  banner_height_mobile: number;
}

export const BRANDING_QUERY_KEY = ["brandingSettings"] as const;
export const BRANDING_BROADCAST_CHANNEL = "gyc-branding-sync";
export const BRANDING_DRAFT_BROADCAST_CHANNEL = "gyc-branding-draft-sync";
export const BRANDING_PREVIEW_QUERY_PARAM = "_brandingPreview";

const getBrandingPreviewId = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get(BRANDING_PREVIEW_QUERY_PARAM);
};

export const normalizeBrandingSettings = (
  value?: Partial<BrandingSettings> | null,
): BrandingSettings => ({
  logo_url: String(value?.logo_url || ""),
  logo_dark_url: String(value?.logo_dark_url || ""),
  animated_logo_url: String(value?.animated_logo_url || ""),
  use_animated_logo: Boolean(value?.use_animated_logo),
  favicon_url: String(value?.favicon_url || "/favicon.png"),
  og_image_url: String(value?.og_image_url || "/og-image.png"),
  primary_color: String(value?.primary_color || "#2563eb"),
  secondary_color: String(value?.secondary_color || "#7c3aed"),
  brand_name: String(value?.brand_name || "Grabyourcar"),
  tagline: String(value?.tagline || "Your Trusted Car Partner"),
  logo_height_header: Number(value?.logo_height_header) || 64,
  logo_height_footer: Number(value?.logo_height_footer) || 56,
  logo_height_mobile: Number(value?.logo_height_mobile) || 40,
  logo_width_header: Number(value?.logo_width_header) || 0,
  logo_width_footer: Number(value?.logo_width_footer) || 0,
  logo_width_mobile: Number(value?.logo_width_mobile) || 0,
  logo_position_horizontal: (value?.logo_position_horizontal as "left" | "center" | "right") || "left",
  logo_position_vertical: (value?.logo_position_vertical as "top" | "center" | "bottom") || "center",
  banner_height_desktop: Number(value?.banner_height_desktop) || 400,
  banner_height_mobile: Number(value?.banner_height_mobile) || 280,
});

const fetchBrandingSettings = async (): Promise<Partial<BrandingSettings> | null> => {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("setting_value")
    .eq("setting_key", "branding_settings")
    .maybeSingle();

  if (error) throw error;
  return (data?.setting_value as unknown as Partial<BrandingSettings>) || null;
};

/**
 * Subscribe every consumer of branding settings to:
 *  1. Supabase realtime row updates on `admin_settings`
 *  2. A BroadcastChannel push from the admin panel after save
 *  3. The browser `storage` event (cross-tab fallback)
 *
 * Effect: the moment the admin clicks Save, every open page
 * (header, footer, mobile menu, hero, banners, public site, etc.)
 * re-renders with the new branding without needing a manual refresh.
 */
export const useBrandingSettingsQuery = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const previewId = getBrandingPreviewId();
    const draftStorageKey = previewId
      ? `${BRANDING_DRAFT_BROADCAST_CHANNEL}:${previewId}`
      : null;

    const apply = (incoming: unknown) => {
      if (incoming && typeof incoming === "object") {
        queryClient.setQueryData(BRANDING_QUERY_KEY, incoming);
      } else {
        queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
      }
    };

    const applyDraft = (incoming: unknown) => {
      if (!previewId || !incoming || typeof incoming !== "object") return;

      const payload = incoming as {
        previewId?: string;
        settings?: unknown;
      };

      if (payload.previewId !== previewId) return;
      apply(payload.settings);
    };

    // 1. Realtime postgres updates
    const channel = supabase
      .channel("branding_settings_live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_settings",
          filter: "setting_key=eq.branding_settings",
        },
        (payload) => {
          const next = (payload.new as { setting_value?: unknown } | null)?.setting_value;
          apply(next);
        },
      )
      .subscribe();

    // 2. Same-origin broadcast (fastest path inside the same browser)
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(BRANDING_BROADCAST_CHANNEL);
      bc.onmessage = (e) => apply(e.data);
    }

    let draftBc: BroadcastChannel | null = null;
    if (previewId && typeof BroadcastChannel !== "undefined") {
      draftBc = new BroadcastChannel(BRANDING_DRAFT_BROADCAST_CHANNEL);
      draftBc.onmessage = (e) => applyDraft(e.data);
    }

    if (draftStorageKey) {
      try {
        const storedDraft = localStorage.getItem(draftStorageKey);
        if (storedDraft) {
          applyDraft(JSON.parse(storedDraft));
        }
      } catch {
        /* ignore */
      }
    }

    // 3. localStorage event — cross-tab fallback when BroadcastChannel is unavailable
    const onStorage = (e: StorageEvent) => {
      if (!e.newValue) return;

      if (e.key === BRANDING_BROADCAST_CHANNEL) {
        try {
          apply(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
        return;
      }

      if (draftStorageKey && e.key === draftStorageKey) {
        try {
          applyDraft(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      }

      if (e.key !== BRANDING_BROADCAST_CHANNEL) return;
      try {
        apply(JSON.parse(e.newValue));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      supabase.removeChannel(channel);
      bc?.close();
      draftBc?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: fetchBrandingSettings,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

/** Push the freshly-saved branding to every other tab + iframe instantly. */
export const broadcastBrandingUpdate = (next: Partial<BrandingSettings>) => {
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(BRANDING_BROADCAST_CHANNEL);
      bc.postMessage(next);
      bc.close();
    }
  } catch {
    /* ignore */
  }
  try {
    // Storage event fires in OTHER tabs only — perfect for the public-site iframe
    localStorage.setItem(
      BRANDING_BROADCAST_CHANNEL,
      JSON.stringify({ ...next, _ts: Date.now() }),
    );
  } catch {
    /* ignore */
  }
};

export const broadcastBrandingDraft = (
  previewId: string,
  next: Partial<BrandingSettings>,
) => {
  const payload = {
    previewId,
    settings: next,
    _ts: Date.now(),
  };

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(BRANDING_DRAFT_BROADCAST_CHANNEL);
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    /* ignore */
  }

  try {
    localStorage.setItem(
      `${BRANDING_DRAFT_BROADCAST_CHANNEL}:${previewId}`,
      JSON.stringify(payload),
    );
  } catch {
    /* ignore */
  }
};