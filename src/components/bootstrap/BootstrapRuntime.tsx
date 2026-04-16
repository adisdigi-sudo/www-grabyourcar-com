import { useEffect, useState, type ComponentType } from "react";
import { isChunkLoadRecoveryExhausted, isDynamicImportError, performSafePreviewReload, recoverFromChunkLoadError, resetChunkLoadRecovery } from "@/lib/chunkLoadRecovery";
import { isSensitivePreviewRouteWindow, shouldAvoidDevAutoReload } from "@/lib/adminPreviewStability";
import { clearPendingReloadFlag, DEV_SERVER_LAST_RELOAD_KEY, DEV_SERVER_PENDING_RELOAD_KEY, DEV_SERVER_STATUS_EVENT, markDevServerPendingReload } from "@/lib/devReloadGuard";
import { withPreviewParams } from "@/lib/previewRouting";
import { isSensitiveRouteAppReady } from "@/lib/startupShell";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

const CHUNK_RECOVERY_STATUS_EVENT = "lovable:chunk-recovery-status";
const ROUTE_ACTIVITY_EVENT = "lovable:route-activity";
const RUNTIME_FATAL_EVENT = "lovable:runtime-fatal";
const STARTUP_SHELL_ID = "lovable-startup-shell";
const SENSITIVE_ROUTE_RECONNECT_HEALTH_DELAY_MS = 420;

let hasTriggeredChunkRecovery = false;
let bootstrapListenersInstalled = false;

type ChunkRecoveryAttemptResult = "recovered" | "exhausted" | "ignored";

type DevServerStatus = "idle" | "disconnected" | "connected" | "reloading" | "update_ready";

type RuntimeFatalDetail = {
  message: string;
  source: string;
};

const NON_FATAL_RUNTIME_PATTERNS = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
];

const dispatchChunkRecoveryStatus = (status: "recovering" | "exhausted", source: string) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(CHUNK_RECOVERY_STATUS_EVENT, {
      detail: { status, source },
    }),
  );
};

const getRuntimeErrorMessage = (error: unknown) => {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "Unknown runtime error";
  }
  return "Unknown runtime error";
};

const shouldSurfaceRuntimeFailure = (error: unknown) => {
  if (isDynamicImportError(error)) return false;

  const message = getRuntimeErrorMessage(error);
  return !NON_FATAL_RUNTIME_PATTERNS.some((pattern) => message.includes(pattern));
};

const dispatchRuntimeFatal = (detail: RuntimeFatalDetail) => {
  if (typeof window === "undefined" || !isSensitivePreviewRouteWindow()) return;

  window.dispatchEvent(
    new CustomEvent(RUNTIME_FATAL_EVENT, {
      detail,
    }),
  );
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
  clearPendingReloadFlag();

  try {
    sessionStorage.setItem(DEV_SERVER_LAST_RELOAD_KEY, String(Date.now()));
  } catch {
    // ignore storage failures
  }

  performSafePreviewReload();
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

const reloadAfterDevServerRestart = () => {
  try {
    const hasPendingReload = sessionStorage.getItem(DEV_SERVER_PENDING_RELOAD_KEY) === "1";
    if (!hasPendingReload) return;

    console.info("[BootstrapRuntime] Dev server reconnected; auto reloading clean bundle", {
      href: window.location.href,
      sensitive: isSensitivePreviewRouteWindow(),
      embedded: window.top !== window,
    });

    performSafeReload();
  } catch {
    window.dispatchEvent(
      new CustomEvent(DEV_SERVER_STATUS_EVENT, {
        detail: { status: "update_ready" as const },
      }),
    );
  }
};

const shouldForceSensitiveRouteRecoveryReload = () => {
  if (typeof document === "undefined") {
    return true;
  }

  const startupShellState = document.getElementById(STARTUP_SHELL_ID)?.getAttribute("data-state");
  if (startupShellState === "loading" || startupShellState === "recovery") {
    return true;
  }

  return !isSensitiveRouteAppReady();
};

const announceSensitiveRouteReloadReady = (reason: "healthy" | "unhealthy") => {
  clearPendingReloadFlag();

  window.dispatchEvent(
    new CustomEvent(DEV_SERVER_STATUS_EVENT, {
      detail: { status: "update_ready" as const, reason },
    }),
  );
};

const handleSensitiveRouteReconnect = () => {
  window.setTimeout(() => {
    try {
      const hasPendingReload = sessionStorage.getItem(DEV_SERVER_PENDING_RELOAD_KEY) === "1";
      if (!hasPendingReload) return;

      if (shouldForceSensitiveRouteRecoveryReload()) {
        announceSensitiveRouteReloadReady("unhealthy");

        console.info("[BootstrapRuntime] Sensitive preview route still looks unstable after reconnect; keeping manual safe reload", {
          href: window.location.href,
          pathname: window.location.pathname,
        });
        return;
      }

      announceSensitiveRouteReloadReady("healthy");
    } catch {
      announceSensitiveRouteReloadReady("unhealthy");
    }
  }, SENSITIVE_ROUTE_RECONNECT_HEALTH_DELAY_MS);
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
    const error = event.error ?? event.message;
    const recoveryResult = attemptChunkRecovery(error, "window.error");

    if (recoveryResult === "ignored" && shouldSurfaceRuntimeFailure(error)) {
      dispatchRuntimeFatal({
        message: getRuntimeErrorMessage(error),
        source: "window.error",
      });
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const recoveryResult = attemptChunkRecovery(event.reason, "window.unhandledrejection");

    if (recoveryResult === "ignored" && shouldSurfaceRuntimeFailure(event.reason)) {
      dispatchRuntimeFatal({
        message: getRuntimeErrorMessage(event.reason),
        source: "window.unhandledrejection",
      });
    }
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
        if (isSensitivePreviewRouteWindow()) {
          handleSensitiveRouteReconnect();
          return;
        }
        reloadAfterDevServerRestart();
      }, 150);
    });

    import.meta.hot.on("vite:beforeFullReload", () => {
      markDevServerPendingReload();
      window.dispatchEvent(
        new CustomEvent(DEV_SERVER_STATUS_EVENT, {
          detail: { status: "update_ready" as const },
        }),
      );
    });
  }
};

const FatalRuntimeOverlay = () => {
  const [fatalDetail, setFatalDetail] = useState<RuntimeFatalDetail | null>(null);

  useEffect(() => {
    const handleFatal = (event: Event) => {
      const detail = (event as CustomEvent<RuntimeFatalDetail>).detail;
      if (!detail?.message) return;
      setFatalDetail(detail);
    };

    window.addEventListener(RUNTIME_FATAL_EVENT, handleFatal as EventListener);

    return () => {
      window.removeEventListener(RUNTIME_FATAL_EVENT, handleFatal as EventListener);
    };
  }, []);

  if (!fatalDetail || !isSensitivePreviewRouteWindow()) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-background/95 px-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center text-card-foreground shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">CRM runtime recovery mode</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Blank screen avoid karne ke liye runtime failure ko intercept kar diya gaya hai. Safe reload se latest stable bundle khul jayega.
        </p>
        <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground">
          {fatalDetail.message}
        </p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setFatalDetail(null);
              resetChunkLoadRecovery();
              performSafeReload();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Reload safely
          </button>
          <button
            type="button"
            onClick={() => {
              setFatalDetail(null);
              window.location.replace(withPreviewParams("/crm-auth"));
            }}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Open sign in
          </button>
        </div>
      </div>
    </div>
  );
};

const DevServerStatusOverlay = () => {
  const [isSensitiveRoute, setIsSensitiveRoute] = useState(() => isSensitivePreviewRouteWindow());
  const [status, setStatus] = useState<DevServerStatus>(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") {
      return "idle";
    }

    return "idle";
  });

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") return;

    let connectedTimer: number | null = null;

    const handleStatus = (event: Event) => {
      const nextStatus = (event as CustomEvent<{ status?: DevServerStatus }>).detail?.status;
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
        return;
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

  const handleManualReload = () => {
    clearPendingReloadFlag();
    setStatus("idle");
    performSafeReload();
  };

  if (!import.meta.env.DEV || !isSensitiveRoute || status === "idle" || status === "connected") {
    return null;
  }

  const copy =
    status === "disconnected"
      ? {
          title: "Dev connection lost",
          body: "Editor reconnect ho raha hai. CRM shell active rakha gaya hai taaki white page na aaye.",
          actionLabel: null,
        }
      : status === "reloading"
        ? {
            title: "Update detected",
            body: "Background me update aayi hai. Aapka current CRM work disturb nahi hoga; jab ready ho tab manual safe reload karna.",
            actionLabel: null,
          }
        : {
            title: "Update ready",
            body: "Naya dev bundle ready hai. CRM route ko white page se bachane ke liye reload ab sirf aapke manual safe action se hoga.",
            actionLabel: "Reload safely",
          };

  return (
    <div className="fixed bottom-4 right-4 z-[10000] w-[min(92vw,28rem)] rounded-2xl border border-border bg-card/95 p-4 text-card-foreground shadow-lg backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <WifiOff className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{copy.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
          {copy.actionLabel ? (
            <button
              type="button"
              onClick={handleManualReload}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              {copy.actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
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

export const BootstrapRuntime = ({ onReady }: { onReady?: () => void }) => {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      onReady?.();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [onReady]);

  return (
    <>
      <SafeTelemetry />
      <DevServerStatusOverlay />
      <ChunkRecoveryOverlay />
      <FatalRuntimeOverlay />
    </>
  );
};
