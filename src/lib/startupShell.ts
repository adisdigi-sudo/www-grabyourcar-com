import { isSensitivePreviewRouteWindow, shouldStabilizeStartupShellWindow } from "@/lib/adminPreviewStability";
import { performSafePreviewReload } from "@/lib/chunkLoadRecovery";
import { DEV_SERVER_STATUS_EVENT } from "@/lib/devReloadGuard";

const STARTUP_SHELL_ID = "lovable-startup-shell";
const STARTUP_SHELL_RECOVERY_DELAY_MS = 4500;
const STARTUP_SHELL_HIDE_WAIT_MS = 2200;
const ROOT_BLANK_RECOVERY_DELAY_MS = 900;
const STARTUP_SHELL_AUTO_RELOAD_DELAY_MS = 1600;
const STARTUP_SHELL_AUTO_RELOAD_MAX_ATTEMPTS = 2;
const STARTUP_SHELL_AUTO_RELOAD_WINDOW_MS = 45000;
const APP_ROOT_ID = "root";
const STARTUP_SHELL_AUTO_RELOAD_KEY = "lovable_startup_shell_auto_reload";

let startupShellRecoveryTimer: number | null = null;
let startupShellBlankTimer: number | null = null;
let startupShellAutoReloadTimer: number | null = null;
let detachStartupShellListeners: (() => void) | null = null;
let rootObserver: MutationObserver | null = null;
let bodyObserver: MutationObserver | null = null;
let healthMonitorInstalled = false;
let globalRecoveryListenersInstalled = false;

const STARTUP_READY_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "h1",
  "h2",
  "h3",
  "img",
  "table",
  "canvas",
  "svg",
  "form",
  "section",
  "article",
  "[role='main']",
].join(", ");

const isElementVisible = (element: Element | null) => {
  if (!element || !(element instanceof HTMLElement || element instanceof SVGElement)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }

  return element.getClientRects().length > 0;
};

const hasVisibleReadySelector = (container: ParentNode | null) => {
  if (!container || !(container instanceof Element || container instanceof DocumentFragment)) {
    return false;
  }

  return Array.from(container.querySelectorAll(STARTUP_READY_SELECTOR)).some((element) => {
    if ((element as HTMLElement).id === STARTUP_SHELL_ID) {
      return false;
    }

    return isElementVisible(element);
  });
};

const getMeaningfulTextLength = (container: ParentNode | null) => {
  if (!container || !(container instanceof Element || container instanceof DocumentFragment)) {
    return 0;
  }

  const text = container.textContent?.replace(/\s+/g, " ").trim() ?? "";
  return text.length;
};

const hasVisibleLayoutSurface = (root: HTMLElement) => {
  const candidateSurfaces = root.querySelectorAll("main, [role='main'], aside, nav, header, section, article, form");
  return Array.from(candidateSurfaces).some((element) => isElementVisible(element));
};

const hasRenderableAppFrame = (root: HTMLElement) => {
  const candidateSurfaces = Array.from(
    root.querySelectorAll("main, [role='main'], aside, nav, header, section, article, form"),
  );

  if (candidateSurfaces.length === 0) {
    return false;
  }

  return candidateSurfaces.some((surface) => {
    if (!(surface instanceof HTMLElement)) {
      return false;
    }

    if (!isElementVisible(surface)) {
      return false;
    }

    return hasVisibleReadySelector(surface) || getMeaningfulTextLength(surface) >= 24;
  });
};

const clearStartupShellRecoveryTimer = () => {
  if (startupShellRecoveryTimer) {
    window.clearTimeout(startupShellRecoveryTimer);
    startupShellRecoveryTimer = null;
  }
};

const clearBlankRecoveryTimer = () => {
  if (startupShellBlankTimer) {
    window.clearTimeout(startupShellBlankTimer);
    startupShellBlankTimer = null;
  }
};

const clearAutoReloadTimer = () => {
  if (startupShellAutoReloadTimer) {
    window.clearTimeout(startupShellAutoReloadTimer);
    startupShellAutoReloadTimer = null;
  }
};

type StartupShellAutoReloadState = {
  attempts: number;
  startedAt: number;
};

const readStartupShellAutoReloadState = (): StartupShellAutoReloadState => {
  if (typeof window === "undefined") {
    return { attempts: 0, startedAt: Date.now() };
  }

  try {
    const rawState = sessionStorage.getItem(STARTUP_SHELL_AUTO_RELOAD_KEY);
    if (!rawState) {
      return { attempts: 0, startedAt: Date.now() };
    }

    const parsedState = JSON.parse(rawState) as Partial<StartupShellAutoReloadState>;
    const attempts = Number.isFinite(parsedState.attempts) ? Number(parsedState.attempts) : 0;
    const startedAt = Number.isFinite(parsedState.startedAt) ? Number(parsedState.startedAt) : Date.now();

    if (Date.now() - startedAt > STARTUP_SHELL_AUTO_RELOAD_WINDOW_MS) {
      sessionStorage.removeItem(STARTUP_SHELL_AUTO_RELOAD_KEY);
      return { attempts: 0, startedAt: Date.now() };
    }

    return { attempts, startedAt };
  } catch {
    return { attempts: 0, startedAt: Date.now() };
  }
};

const writeStartupShellAutoReloadState = (state: StartupShellAutoReloadState) => {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(STARTUP_SHELL_AUTO_RELOAD_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
};

const resetStartupShellAutoReloadState = () => {
  if (typeof window === "undefined") return;

  clearAutoReloadTimer();

  try {
    sessionStorage.removeItem(STARTUP_SHELL_AUTO_RELOAD_KEY);
  } catch {
    // ignore storage failures
  }
};

const scheduleStartupShellAutoReload = () => {
  if (typeof window === "undefined" || !shouldStabilizeStartupShellWindow()) {
    clearAutoReloadTimer();
    return;
  }

  const reloadState = readStartupShellAutoReloadState();
  if (reloadState.attempts >= STARTUP_SHELL_AUTO_RELOAD_MAX_ATTEMPTS) {
    clearAutoReloadTimer();
    return;
  }

  clearAutoReloadTimer();
  startupShellAutoReloadTimer = window.setTimeout(() => {
    if (isSensitiveRouteAppReady()) {
      resetStartupShellAutoReloadState();
      return;
    }

    const latestState = readStartupShellAutoReloadState();
    if (latestState.attempts >= STARTUP_SHELL_AUTO_RELOAD_MAX_ATTEMPTS) {
      return;
    }

    writeStartupShellAutoReloadState({
      attempts: latestState.attempts + 1,
      startedAt: latestState.startedAt,
    });

    performSafePreviewReload();
  }, STARTUP_SHELL_AUTO_RELOAD_DELAY_MS);
};

const recoverStartupShell = (reason: string) => {
  ensureStartupShell();
  promoteStartupShellToRecovery(reason);
};

const handleGlobalRuntimeFatal = () => {
  recoverStartupShell("Runtime issue detect hui hai. Niche diye options se page ko safely recover karo.");
};

const handleGlobalDevServerStatus = (event: Event) => {
  const detail = (event as CustomEvent<{ status?: string; reason?: string }>).detail;
  const status = detail?.status;

  if (status === "connected" || (status === "update_ready" && detail?.reason === "healthy")) {
    if (isSensitiveRouteAppReady()) {
      removeStartupShell();
    }
    return;
  }

  if (status === "update_ready" || status === "disconnected") {
    recoverStartupShell("Dev connection/update ne startup ko interrupt kiya. Ab yahan se safe reload kar sakte ho.");
  }
};

const installGlobalRecoveryListeners = () => {
  if (typeof window === "undefined" || globalRecoveryListenersInstalled) {
    return;
  }

  globalRecoveryListenersInstalled = true;
  window.addEventListener("lovable:runtime-fatal", handleGlobalRuntimeFatal as EventListener);
  window.addEventListener(DEV_SERVER_STATUS_EVENT, handleGlobalDevServerStatus as EventListener);
};

export const isSensitiveRouteAppReady = () => {
  if (typeof document === "undefined") return false;

  const root = document.getElementById(APP_ROOT_ID);
  if (!root || root.childElementCount === 0) return false;

  if (hasRenderableAppFrame(root)) {
    return true;
  }

  const mainRegion = root.querySelector("main, [role='main'], section, article, form");
  const mainHasVisibleNodes = hasVisibleReadySelector(mainRegion);
  const mainTextLength = getMeaningfulTextLength(mainRegion);

  if ((mainHasVisibleNodes && mainTextLength >= 8) || mainTextLength >= 24) {
    return true;
  }

  const rootHasVisibleNodes = hasVisibleReadySelector(root);
  const rootTextLength = getMeaningfulTextLength(root);

  const hasRenderableDirectChild = Array.from(root.children).some((child) => {
    if (!(child instanceof HTMLElement) || child.id === STARTUP_SHELL_ID) {
      return false;
    }

    if (!isElementVisible(child)) {
      return false;
    }

    return (
      child.matches("main, [role='main'], aside, nav, header, section, article, form") ||
      getMeaningfulTextLength(child) >= 24 ||
      hasVisibleReadySelector(child)
    );
  });

  if (hasRenderableDirectChild) {
    return true;
  }

  if (hasVisibleLayoutSurface(root) && rootHasVisibleNodes && rootTextLength >= 24) {
    return true;
  }

  return rootHasVisibleNodes && rootTextLength >= 80;
};

export const promoteStartupShellToRecovery = (
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
    title.textContent = "Page startup recovery mode";
  }

  if (body) {
    body.textContent = reason;
  }

  if (actions) {
    actions.style.display = "flex";
  }

  scheduleStartupShellAutoReload();
};

export const ensureStartupShell = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(STARTUP_SHELL_ID)) return;

  const fallbackActionLabel = isSensitivePreviewRouteWindow() ? "Open sign in" : "Open home";

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
      <div data-shell-title style="font:600 16px system-ui, sans-serif;">Page reconnect ho raha hai</div>
      <div data-shell-body style="max-width:420px;text-align:center;font:400 13px system-ui, sans-serif;color:hsl(215.4 16.3% 46.9%);padding:0 20px;">Agar preview update aayi hai to page thodi der stable shell par rahega. White page ke bajaye yeh recovery state dikhni chahiye.</div>
      <div data-shell-actions style="display:none;gap:10px;flex-wrap:wrap;justify-content:center;">
        <button type="button" data-shell-reload style="border:0;border-radius:9999px;background:hsl(221.2 83.2% 53.3%);color:white;padding:10px 16px;font:600 13px system-ui,sans-serif;cursor:pointer;">Reload safely</button>
        <button type="button" data-shell-auth style="border:1px solid hsl(214.3 31.8% 91.4%);border-radius:9999px;background:white;color:hsl(222.2 84% 4.9%);padding:10px 16px;font:600 13px system-ui,sans-serif;cursor:pointer;">${fallbackActionLabel}</button>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = "@keyframes lovable-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }";
  shell.appendChild(style);
  document.body.appendChild(shell);

  const reloadButton = shell.querySelector<HTMLButtonElement>("[data-shell-reload]");
  const signInButton = shell.querySelector<HTMLButtonElement>("[data-shell-auth]");

  const handleReload = () => {
    clearStartupShellRecoveryTimer();
    clearBlankRecoveryTimer();
    clearAutoReloadTimer();
    performSafePreviewReload();
  };

  const handleOpenSignIn = () => {
    clearStartupShellRecoveryTimer();
    clearBlankRecoveryTimer();
    clearAutoReloadTimer();
    window.location.replace(
      new URL(isSensitivePreviewRouteWindow() ? "/crm-auth" : "/", window.location.origin).toString(),
    );
  };

  reloadButton?.addEventListener("click", handleReload);
  signInButton?.addEventListener("click", handleOpenSignIn);

  detachStartupShellListeners = () => {
    reloadButton?.removeEventListener("click", handleReload);
    signInButton?.removeEventListener("click", handleOpenSignIn);
  };

  clearStartupShellRecoveryTimer();
  startupShellRecoveryTimer = window.setTimeout(() => {
    promoteStartupShellToRecovery();
  }, STARTUP_SHELL_RECOVERY_DELAY_MS);
};

export const removeStartupShell = () => {
  const cleanupShell = () => {
    clearStartupShellRecoveryTimer();
    clearBlankRecoveryTimer();
    resetStartupShellAutoReloadState();
    detachStartupShellListeners?.();
    detachStartupShellListeners = null;
    const shell = typeof document !== "undefined" ? document.getElementById(STARTUP_SHELL_ID) : null;
    shell?.remove();
  };

  if (typeof document === "undefined") return;

  if (!shouldStabilizeStartupShellWindow()) {
    cleanupShell();
    return;
  }

  if (isSensitiveRouteAppReady()) {
    cleanupShell();
    return;
  }

  const root = document.getElementById(APP_ROOT_ID);
  if (!root) {
    ensureStartupShell();
    promoteStartupShellToRecovery("App root mount nahi ho paaya. Safe reload try karo.");
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

    ensureStartupShell();
    promoteStartupShellToRecovery("Page UI mount confirm nahi hui, isliye white screen avoid karne ke liye recovery panel hold par rakha gaya hai.");
  }, STARTUP_SHELL_HIDE_WAIT_MS);
};

const bindRootObserver = (onChange: () => void) => {
  rootObserver?.disconnect();
  rootObserver = null;

  const root = document.getElementById(APP_ROOT_ID);
  if (!root) return;

  rootObserver = new MutationObserver(onChange);
  rootObserver.observe(root, { childList: true, subtree: true });
};

const queueBlankStateRecovery = (reason: string) => {
  if (!shouldStabilizeStartupShellWindow()) {
    clearBlankRecoveryTimer();
    return;
  }

  clearBlankRecoveryTimer();
  startupShellBlankTimer = window.setTimeout(() => {
    if (!shouldStabilizeStartupShellWindow() || isSensitiveRouteAppReady()) {
      return;
    }

    ensureStartupShell();
    promoteStartupShellToRecovery(reason);
  }, ROOT_BLANK_RECOVERY_DELAY_MS);
};

export const installStartupShellHealthMonitor = () => {
  if (typeof window === "undefined" || typeof document === "undefined" || healthMonitorInstalled) return;

  healthMonitorInstalled = true;
  installGlobalRecoveryListeners();

  const evaluateRootHealth = () => {
    if (!shouldStabilizeStartupShellWindow()) {
      clearBlankRecoveryTimer();
      return;
    }

    if (isSensitiveRouteAppReady()) {
      clearBlankRecoveryTimer();
      resetStartupShellAutoReloadState();
      if (document.getElementById(STARTUP_SHELL_ID)) {
        removeStartupShell();
      }
      return;
    }

    queueBlankStateRecovery(
      "CRM UI blank ho gayi thi. White page avoid karne ke liye recovery panel automatically wapas dikhaya gaya hai.",
    );
  };

  bindRootObserver(evaluateRootHealth);

  bodyObserver = new MutationObserver(() => {
    bindRootObserver(evaluateRootHealth);
    evaluateRootHealth();
  });

  bodyObserver.observe(document.body, { childList: true });

  window.addEventListener(DEV_SERVER_STATUS_EVENT, evaluateRootHealth as EventListener);
  window.addEventListener("pageshow", evaluateRootHealth);
  document.addEventListener("visibilitychange", evaluateRootHealth);

  window.setTimeout(evaluateRootHealth, 0);
};
