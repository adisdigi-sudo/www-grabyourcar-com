import { useEffect, useState, type ComponentType } from "react";
import { isChunkLoadRecoveryExhausted, isDynamicImportError, recoverFromChunkLoadError, resetChunkLoadRecovery } from "@/lib/chunkLoadRecovery";
import { isSensitivePreviewRouteWindow, shouldAvoidDevAutoReload } from "@/lib/adminPreviewStability";
import { WifiOff } from "lucide-react";

const DEV_SERVER_STATUS_EVENT = "lovable:dev-server-status";
const CHUNK_RECOVERY_STATUS_EVENT = "lovable:chunk-recovery-status";
const ROUTE_ACTIVITY_EVENT = "lovable:route-activity";
const DEV_SERVER_PENDING_RELOAD_KEY = "lovable_dev_server_pending_reload";
const DEV_SERVER_LAST_RELOAD_KEY = "lovable_dev_server_last_reload";
const DEV_SERVER_RELOAD_COOLDOWN_MS = 5000;
const CACHE_BUST_PARAM = "__v";

let hasTriggeredChunkRecovery = false;
let bootstrapListenersInstalled = false;

type ChunkRecoveryAttemptResult = "recovered" | "exhausted" | "ignored";

type DevServerStatus = "idle" | "disconnected" | "connected" | "reloading" | "update_ready";

const dispatchChunkRecoveryStatus = (status: "recovering" | "exhausted", source: string) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(CHUNK_RECOVERY_STATUS_EVENT, {
      detail: { status, source },
    }),
  );
};

const clearPendingReloadFlag = () => {
  try {
    sessionStorage.removeItem(DEV_SERVER_PENDING_RELOAD_KEY);
  } catch {
    // ignore storage failures
  }
};

const dispatchRouteActivity = () => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(ROUTE_ACTIVITY_EVENT, {
      detail: {
        pathname: window.location.pathname,
        sensitive: isSensitivePreviewRouteWindow(),
      },
    }),
  );
};

const installRouteActivityListeners = () => {
  if (typeof window === "undefined") return;

  const patchedWindow = window as Window & { __lovableRouteActivityPatched?: boolean };
  if (patchedWindow.__lovableRouteActivityPatched) return;

  patchedWindow.__lovableRouteActivityPatched = true;

  const notifyRouteChange = () => {
    window.setTimeout(() => {
      dispatchRouteActivity();
    }, 0);
  };

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = ((...args) => {
    originalPushState(...args);
    notifyRouteChange();
  }) as typeof window.history.pushState;

  window.history.replaceState = ((...args) => {
    originalReplaceState(...args);
    notifyRouteChange();
  }) as typeof window.history.replaceState;

  window.addEventListener("popstate", notifyRouteChange);
  window.addEventListener("hashchange", notifyRouteChange);
};

const performSafeReload = () => {
  try {
    clearPendingReloadFlag();
    sessionStorage.setItem(DEV_SERVER_LAST_RELOAD_KEY, String(Date.now()));

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set(CACHE_BUST_PARAM, Date.now().toString());
    window.location.replace(nextUrl.toString());
  } catch {
    window.location.reload();
  }
};

const attemptChunkRecovery = (error: unknown, source: string): ChunkRecoveryAttemptResult => {
  if (hasTriggeredChunkRecovery || !isDynamicImportError(error)) {
    return "ignored";
  }

  if (shouldAvoidDevAutoReload()) {
    dispatchChunkRecoveryStatus("exhausted", source);
    console.warn("[BootstrapRuntime] Skipping automatic chunk recovery on sensitive preview route", {
      source,
      error,
      href: window.location.href,
    });
    return "exhausted";
  }

  const recovered = recoverFromChunkLoadError();

  if (recovered) {
    hasTriggeredChunkRecovery = true;
    dispatchChunkRecoveryStatus("recovering", source);
    console.warn("[BootstrapRuntime] Attempting chunk recovery", { source, error });
    return "recovered";
  }

  if (isChunkLoadRecoveryExhausted()) {
    dispatchChunkRecoveryStatus("exhausted", source);
    console.error("[BootstrapRuntime] Chunk recovery attempts exhausted", { source, error });
    return "exhausted";
  }

  return "ignored";
};

const markDevServerPendingReload = () => {
  try {
    sessionStorage.setItem(DEV_SERVER_PENDING_RELOAD_KEY, "1");
  } catch {
    // ignore storage failures
  }
};

const reloadAfterDevServerRestart = () => {
  try {
    const hasPendingReload = sessionStorage.getItem(DEV_SERVER_PENDING_RELOAD_KEY) === "1";
    if (!hasPendingReload) return;

    if (shouldAvoidDevAutoReload()) {
      console.info("[BootstrapRuntime] Skipping automatic reload after dev-server reconnect on sensitive preview route", {
        href: window.location.href,
      });
      clearPendingReloadFlag();
      return;
    }

    const lastReloadAt = Number.parseInt(sessionStorage.getItem(DEV_SERVER_LAST_RELOAD_KEY) ?? "0", 10);
    if (!Number.isNaN(lastReloadAt) && Date.now() - lastReloadAt < DEV_SERVER_RELOAD_COOLDOWN_MS) {
      clearPendingReloadFlag();
      return;
    }

    performSafeReload();
  } catch {
    window.location.reload();
  }
};

const installBootstrapRuntime = () => {
  if (typeof window === "undefined" || bootstrapListenersInstalled) return;

  bootstrapListenersInstalled = true;
  installRouteActivityListeners();
  dispatchRouteActivity();

  window.addEventListener("vite:preloadError", (event) => {
    const preloadEvent = event as Event & {
      payload?: unknown;
      preventDefault: () => void;
    };

    preloadEvent.preventDefault();

    const recoveryResult = attemptChunkRecovery(preloadEvent.payload, "window.vite:preloadError");

    if (recoveryResult === "ignored") {
      if (shouldAvoidDevAutoReload()) {
        dispatchChunkRecoveryStatus("exhausted", "window.vite:preloadError");
        console.warn("[BootstrapRuntime] Skipping forced preload reload on sensitive preview route", {
          payload: preloadEvent.payload,
          href: window.location.href,
        });
        return;
      }

      performSafeReload();
    }
  });

  window.addEventListener("error", (event) => {
    attemptChunkRecovery(event.error ?? event.message, "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    attemptChunkRecovery(event.reason, "window.unhandledrejection");
  });

  if (import.meta.hot) {
    import.meta.hot.on("vite:ws:disconnect", () => {
      markDevServerPendingReload();
      window.dispatchEvent(
        new CustomEvent(DEV_SERVER_STATUS_EVENT, {
          detail: { status: "disconnected" as const },
        }),
      );
    });

    import.meta.hot.on("vite:ws:connect", () => {
      window.dispatchEvent(
        new CustomEvent(DEV_SERVER_STATUS_EVENT, {
          detail: { status: "connected" as const },
        }),
      );

      window.setTimeout(() => {
        reloadAfterDevServerRestart();
      }, 150);
    });

    import.meta.hot.on("vite:beforeFullReload", () => {
      markDevServerPendingReload();
      window.dispatchEvent(
        new CustomEvent(DEV_SERVER_STATUS_EVENT, {
          detail: { status: "reloading" as const },
        }),
      );
    });
  }
};

const DevServerStatusOverlay = () => {
  const [isSensitiveRoute, setIsSensitiveRoute] = useState(() => isSensitivePreviewRouteWindow());
  const [status, setStatus] = useState<DevServerStatus>(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") {
      return "idle";
    }

    try {
      return sessionStorage.getItem(DEV_SERVER_PENDING_RELOAD_KEY) === "1" && isSensitivePreviewRouteWindow()
        ? "update_ready"
        : "idle";
    } catch {
      return "idle";
    }
  });

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") return;

    let connectedTimer: number | null = null;

    const handleStatus = (event: Event) => {
      const nextStatus = (event as CustomEvent<{ status?: "disconnected" | "connected" | "reloading" }>).detail?.status;
      if (!nextStatus) return;

      setStatus(nextStatus);

      if (connectedTimer) {
        window.clearTimeout(connectedTimer);
        connectedTimer = null;
      }

      if (nextStatus === "connected") {
        connectedTimer = window.setTimeout(() => {
          setStatus((current) => (current === "connected" ? "idle" : current));
        }, 1200);
      }
    };

    const handleRouteActivity = (event: Event) => {
      const sensitive = (event as CustomEvent<{ sensitive?: boolean }>).detail?.sensitive ?? isSensitivePreviewRouteWindow();
      setIsSensitiveRoute(sensitive);

      if (!sensitive) {
        clearPendingReloadFlag();
        setStatus("idle");
      }
    };

    window.addEventListener(DEV_SERVER_STATUS_EVENT, handleStatus as EventListener);
    window.addEventListener(ROUTE_ACTIVITY_EVENT, handleRouteActivity as EventListener);

    return () => {
      window.removeEventListener(DEV_SERVER_STATUS_EVENT, handleStatus as EventListener);
      window.removeEventListener(ROUTE_ACTIVITY_EVENT, handleRouteActivity as EventListener);
      if (connectedTimer) {
        window.clearTimeout(connectedTimer);
      }
    };
  }, []);

  void isSensitiveRoute;
  void status;
  return null;
};

const ChunkRecoveryOverlay = () => {
  const [recoverySource, setRecoverySource] = useState<string | null>(() =>
    typeof window !== "undefined" && isChunkLoadRecoveryExhausted() ? "startup" : null,
  );

  useEffect(() => {
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: "recovering" | "exhausted"; source?: string }>).detail;

      if (detail?.status === "exhausted") {
        setRecoverySource(detail.source ?? "runtime");
        return;
      }

      if (detail?.status === "recovering") {
        setRecoverySource(null);
      }
    };

    window.addEventListener(CHUNK_RECOVERY_STATUS_EVENT, handleStatus as EventListener);

    return () => {
      window.removeEventListener(CHUNK_RECOVERY_STATUS_EVENT, handleStatus as EventListener);
    };
  }, []);

  if (!recoverySource) {
    return null;
  }

  const handleManualRefresh = () => {
    resetChunkLoadRecovery();
    performSafeReload();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/95 px-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center text-card-foreground shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <WifiOff className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">Latest update got stuck</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We stopped the auto-reload loop so the screen does not go blank again. Refresh once to load a clean bundle.
        </p>
        <button
          type="button"
          onClick={handleManualRefresh}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Reload safely
        </button>
      </div>
    </div>
  );
};

const SafeTelemetry = () => {
  const [telemetry, setTelemetry] = useState<null | {
    Analytics: ComponentType;
    SpeedInsights: ComponentType;
  }>(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }

    let cancelled = false;

    Promise.all([import("@vercel/analytics/react"), import("@vercel/speed-insights/react")])
      .then(([analyticsModule, speedInsightsModule]) => {
        if (cancelled) return;

        setTelemetry({
          Analytics: analyticsModule.Analytics,
          SpeedInsights: speedInsightsModule.SpeedInsights,
        });
      })
      .catch((error) => {
        console.warn("[BootstrapRuntime] Telemetry disabled after startup failure", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (import.meta.env.DEV || !telemetry) return null;

  const { Analytics, SpeedInsights } = telemetry;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
};

installBootstrapRuntime();

export const BootstrapRuntime = () => {
  return (
    <>
      <SafeTelemetry />
      <DevServerStatusOverlay />
      <ChunkRecoveryOverlay />
    </>
  );
};
