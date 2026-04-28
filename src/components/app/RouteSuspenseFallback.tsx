import { useEffect, useState } from "react";
import { performSafePreviewReload } from "@/lib/chunkLoadRecovery";

/**
 * Shown inside <Suspense fallback={...}>. If the chunk takes more than `timeoutMs`,
 * we assume the dynamic import is hung (stale deploy / cache mismatch) and trigger
 * a cache-busted reload so the user is not stuck on a route transition forever.
 *
 * After `softTimeoutMs` we offer a manual "Reload" button so the user has control
 * before any automatic action.
 */
export const RouteSuspenseFallback = ({
  hardTimeoutMs = 8000,
  softTimeoutMs = 3000,
}: {
  hardTimeoutMs?: number;
  softTimeoutMs?: number;
}) => {
  const [showReload, setShowReload] = useState(false);

  useEffect(() => {
    const soft = window.setTimeout(() => setShowReload(true), softTimeoutMs);
    const hard = window.setTimeout(() => {
      // Only auto-reload once per session for a given path to avoid loops.
      const key = `__suspense_autoreload:${window.location.pathname}`;
      try {
        if (sessionStorage.getItem(key) === "1") return;
        sessionStorage.setItem(key, "1");
      } catch {
        // ignore storage errors
      }
      performSafePreviewReload();
    }, hardTimeoutMs);

    return () => {
      window.clearTimeout(soft);
      window.clearTimeout(hard);
    };
  }, [hardTimeoutMs, softTimeoutMs]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background"
      role="main"
      aria-busy="true"
      data-startup-ready="route-suspense-loading"
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      {showReload && (
        <button
          type="button"
          onClick={() => performSafePreviewReload()}
          className="mt-2 text-xs underline text-muted-foreground hover:text-foreground"
        >
          Refresh
        </button>
      )}
    </main>
  );
};
