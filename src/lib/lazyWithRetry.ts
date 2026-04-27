import { lazy, ComponentType } from "react";
import { isDynamicImportError, recoverFromChunkLoadError } from "@/lib/chunkLoadRecovery";

/**
 * Wraps React.lazy with retry-on-failure logic.
 * If the dynamic import fails (e.g. stale chunk after a deploy), we:
 *  1. retry the import once after a short delay
 *  2. if still failing, trigger the chunk-load recovery (cache-busted reload)
 *
 * This prevents users from getting stuck on the "Loading page..." Suspense fallback
 * when their browser has cached an old index.html pointing at a chunk that no longer exists.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retryDelayMs = 600,
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isDynamicImportError(err)) throw err;
      // First retry — network blip or chunk still propagating
      try {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        return await factory();
      } catch (err2) {
        if (!isDynamicImportError(err2)) throw err2;
        // Stale deploy — force a cache-busted reload (bounded by recovery counter)
        const recovered = recoverFromChunkLoadError();
        if (!recovered) {
          throw err2;
        }
        // Return a placeholder while the page reloads
        return {
          default: (() => null) as unknown as T,
        };
      }
    }
  });
}
