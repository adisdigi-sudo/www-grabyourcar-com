/**
 * React hook to read resolved PDF branding for a vertical.
 * Use in admin Branding Editor + Invoice Studio + per-vertical PDF Settings UI.
 */

import { useEffect, useState } from "react";
import { resolveBranding, clearBrandingCache } from "@/lib/pdf/brandingResolver";
import type { ResolvedBranding } from "@/lib/pdf/types";

interface UsePdfBrandingResult {
  branding: ResolvedBranding | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function usePdfBranding(verticalSlug: string): UsePdfBrandingResult {
  const [branding, setBranding] = useState<ResolvedBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resolved = await resolveBranding(verticalSlug);
      setBranding(resolved);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verticalSlug]);

  return {
    branding,
    loading,
    error,
    refresh: async () => {
      clearBrandingCache();
      await load();
    },
  };
}
