import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  canonical_url?: string;
  robots?: string;
}

/**
 * Fetches SEO settings from the backend for a given page key.
 * Returns merged data: backend values override defaults.
 */
export const useSEOSettings = (pageKey: string) => {
  return useQuery<SEOData | null>({
    queryKey: ["seoSettings", pageKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", `seo_${pageKey}`)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch SEO settings:", error);
        return null;
      }

      if (!data?.setting_value) return null;

      return data.setting_value as unknown as SEOData;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 min
  });
};
