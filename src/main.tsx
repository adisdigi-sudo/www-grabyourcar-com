import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { isSensitivePreviewRouteWindow } from "@/lib/adminPreviewStability";
import { BootstrapRuntime } from "@/components/bootstrap/BootstrapRuntime";
import { performSafePreviewReload } from "@/lib/chunkLoadRecovery";
import { DEV_SERVER_STATUS_EVENT, installSensitiveRouteReloadGuard } from "@/lib/devReloadGuard";

const STARTUP_SHELL_ID = "lovable-startup-shell";
const STARTUP_SHELL_RECOVERY_DELAY_MS = 4500;
const STARTUP_SHELL_HIDE_WAIT_MS = 2200;

let startupShellRecoveryTimer: number | null = null;
let detachStartupShellListeners: (() => void) | null = null;

const clearStartupShellRecoveryTimer = () => {
  if (startupShellRecoveryTimer) {
    window.clearTimeout(startupShellRecoveryTimer);
    startupShellRecoveryTimer = null;
  }
};

const promoteStartupShellToRecovery = (
  reason = "Startup expected time se zyada le raha hai. Blank screen ke bajaye yahan se safe recovery use karo.",
) => {
  if (typeof document === "undefined") return;

  const shell = document.getElementById(STARTUP_SHELL_ID);
  if (!shell || shell.getAttribute("data-state") === "recovery") return;

  shell.setAttribute("data-state", "recovery");
  shell.style.background = "linear-gradient(180deg, hsl(60 20% 99%), hsl(90 18% 96%))";

  const status = shell.querySelector<HTMLElement>("[data-shell-status]");
  const title = shell.querySelector<HTMLElement>("[data-shell-title]");
  const body = shell.querySelector<HTMLElement>("[data-shell-body]");
  const actions = shell.querySelector<HTMLElement>("[data-shell-actions]");

  if (status) {
    status.style.animation = "none";
    status.style.borderColor = "hsl(38 92% 50% / 0.28)";
    status.style.background = "hsl(38 92% 50% / 0.12)";
    status.style.display = "grid";
    status.style.placeItems = "center";
    status.style.font = "700 22px system-ui, sans-serif";
    status.style.color = "hsl(24 9.8% 10%)";
    status.textContent = "!";
  }

  if (title) {
    title.textContent = "CRM startup recovery mode";
  }

  if (body) {
    body.textContent = reason;
  }

  if (actions) {
    actions.style.display = "flex";
  }
};

const ensureStartupShell = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(STARTUP_SHELL_ID)) return;

  const shell = document.createElement("div");
  shell.id = STARTUP_SHELL_ID;
  shell.setAttribute("aria-live", "polite");
  shell.style.position = "fixed";
  shell.style.inset = "0";
  shell.style.zIndex = "9999";
  shell.style.display = "flex";
  shell.style.flexDirection = "column";
  shell.style.alignItems = "center";
  shell.style.justifyContent = "center";
  shell.style.gap = "12px";
  shell.style.background = "linear-gradient(180deg, hsl(0 0% 100%), hsl(210 20% 97%))";
  shell.style.color = "hsl(222.2 84% 4.9%)";
  shell.setAttribute("data-state", "loading");
  shell.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 20px;max-width:460px;text-align:center;">
      <div data-shell-status style="height:44px;width:44px;border-radius:9999px;border:3px solid hsl(220 14% 96%);border-top-color:hsl(221.2 83.2% 53.3%);animation:lovable-spin 1s linear infinite;"></div>
      <div data-shell-title style="font:600 16px system-ui, sans-serif;">CRM reconnect ho raha hai</div>
      <div data-shell-body style="max-width:420px;text-align:center;font:400 13px system-ui, sans-serif;color:hsl(215.4 16.3% 46.9%);padding:0 20px;">Agar dev update aayi hai to page thodi der stable shell par rahega. White page ke bajaye yeh recovery state dikhni chahiye.</div>
      <div data-shell-actions style="display:none;gap:10px;flex-wrap:wrap;justify-content:center;">
        <button type="button" data-shell-reload style="border:0;border-radius:9999px;background:hsl(221.2 83.2% 53.3%);color:white;padding:10px 16px;font:600 13px system-ui,sans-serif;cursor:pointer;">Reload safely</button>
        <button type="button" data-shell-auth style="border:1px solid hsl(214.3 31.8% 91.4%);border-radius:9999px;background:white;color:hsl(222.2 84% 4.9%);padding:10px 16px;font:600 13px system-ui,sans-serif;cursor:pointer;">Open sign in</button>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `@keyframes lovable-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  shell.appendChild(style);
  document.body.appendChild(shell);

  const reloadButton = shell.querySelector<HTMLButtonElement>("[data-shell-reload]");
  const signInButton = shell.querySelector<HTMLButtonElement>("[data-shell-auth]");

  const handleReload = () => {
    clearStartupShellRecoveryTimer();
    performSafePreviewReload();
  };

  const handleOpenSignIn = () => {
    clearStartupShellRecoveryTimer();
    window.location.replace(new URL("/crm-auth", window.location.origin).toString());
  };

  const handleRuntimeFatal = () => {
    promoteStartupShellToRecovery("Runtime issue detect hui hai. Niche diye options se CRM ko safely recover karo.");
  };

  const handleDevServerStatus = (event: Event) => {
    const status = (event as CustomEvent<{ status?: string }>).detail?.status;
    if (status === "update_ready" || status === "disconnected") {
      promoteStartupShellToRecovery("Dev connection/update ne CRM startup ko interrupt kiya. Ab yahan se safe reload kar sakte ho.");
    }
  };

  reloadButton?.addEventListener("click", handleReload);
  signInButton?.addEventListener("click", handleOpenSignIn);
  window.addEventListener("lovable:runtime-fatal", handleRuntimeFatal as EventListener);
  window.addEventListener(DEV_SERVER_STATUS_EVENT, handleDevServerStatus as EventListener);

  detachStartupShellListeners = () => {
    reloadButton?.removeEventListener("click", handleReload);
    signInButton?.removeEventListener("click", handleOpenSignIn);
    window.removeEventListener("lovable:runtime-fatal", handleRuntimeFatal as EventListener);
    window.removeEventListener(DEV_SERVER_STATUS_EVENT, handleDevServerStatus as EventListener);
  };

  clearStartupShellRecoveryTimer();
  startupShellRecoveryTimer = window.setTimeout(() => {
    promoteStartupShellToRecovery();
  }, STARTUP_SHELL_RECOVERY_DELAY_MS);
};

const isSensitiveRouteAppReady = () => {
  if (typeof document === "undefined") return false;

  const root = document.getElementById("root");
  if (!root || root.childElementCount === 0) return false;

  return Boolean(
    root.querySelector(
      "main, aside, button, h1, h2, [aria-live='polite'], [data-sonner-toaster], [class*='animate-spin']",
    ),
  );
};

const removeStartupShell = () => {
  const cleanupShell = () => {
    clearStartupShellRecoveryTimer();
    detachStartupShellListeners?.();
    detachStartupShellListeners = null;
    const shell = typeof document !== "undefined" ? document.getElementById(STARTUP_SHELL_ID) : null;
    shell?.remove();
  };

  if (typeof document === "undefined") return;

  if (!isSensitivePreviewRouteWindow()) {
    cleanupShell();
    return;
  }

  if (isSensitiveRouteAppReady()) {
    cleanupShell();
    return;
  }

  const root = document.getElementById("root");
  if (!root) {
    promoteStartupShellToRecovery("CRM root mount nahi ho paaya. Safe reload try karo.");
    return;
  }

  const observer = new MutationObserver(() => {
    if (!isSensitiveRouteAppReady()) return;
    observer.disconnect();
    window.clearTimeout(timeoutId);
    cleanupShell();
  });

  observer.observe(root, { childList: true, subtree: true });

  const timeoutId = window.setTimeout(() => {
    observer.disconnect();
    if (isSensitiveRouteAppReady()) {
      cleanupShell();
      return;
    }

    promoteStartupShellToRecovery("CRM UI mount confirm nahi hui, isliye white screen avoid karne ke liye recovery panel hold par rakha gaya hai.");
  }, STARTUP_SHELL_HIDE_WAIT_MS);
};

try {
  installSensitiveRouteReloadGuard();
  ensureStartupShell();

  if (window.location.hostname.endsWith(".lovable.app")) {
    const existingNoindex = document.querySelector('meta[name="robots"]');

    if (!existingNoindex) {
      const noindex = document.createElement("meta");
      noindex.name = "robots";
      noindex.content = "noindex, nofollow";
      document.head.appendChild(noindex);
    }
  }
} catch (error) {
  console.warn("[Bootstrap] Failed during startup shell init", error);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

createRoot(rootElement).render(
  <AppErrorBoundary>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
        <BootstrapRuntime onReady={removeStartupShell} />
      </ThemeProvider>
    </HelmetProvider>
  </AppErrorBoundary>
);
