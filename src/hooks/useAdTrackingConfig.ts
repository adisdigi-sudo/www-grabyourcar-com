import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdTrackingConfig {
  google_ads_id: string;
  google_lead_label: string;
  google_whatsapp_label: string;
  google_call_label: string;
  meta_pixel_id: string;
}

const CACHE_KEY = "gyc_ad_tracking_config";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let configPromise: Promise<AdTrackingConfig | null> | null = null;

/** Singleton fetch — deduplicates concurrent calls */
export async function fetchAdTrackingConfig(): Promise<AdTrackingConfig | null> {
  // Check localStorage cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { config, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return config;
    }
  } catch {}

  if (!configPromise) {
    configPromise = (async () => {
      try {
        const { data } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "ad_tracking_config")
          .maybeSingle();
        const cfg = (data?.setting_value as unknown as AdTrackingConfig) || null;
        if (cfg) {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ config: cfg, ts: Date.now() }));
          } catch {}
        }
        configPromise = null;
        return cfg;
      } catch {
        configPromise = null;
        return null;
      });
  }
  return configPromise;
}

/** React hook to get the tracking config */
export function useAdTrackingConfig() {
  const [config, setConfig] = useState<AdTrackingConfig | null>(null);

  useEffect(() => {
    fetchAdTrackingConfig().then(setConfig);
  }, []);

  return config;
}
