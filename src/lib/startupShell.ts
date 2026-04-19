const STARTUP_SHELL_IDS = ["lovable-startup-shell", "lovable-dev-preview-reconnect"];

const removeLegacyStartupShellNodes = () => {
  if (typeof document === "undefined") return;
  STARTUP_SHELL_IDS.forEach((id) => {
    document.getElementById(id)?.remove();
  });
};

export const isSensitiveRouteAppReady = () => true;

export const promoteStartupShellToRecovery = () => {
  removeLegacyStartupShellNodes();
};

export const ensureStartupShell = () => {
  removeLegacyStartupShellNodes();
};

export const removeStartupShell = () => {
  removeLegacyStartupShellNodes();
};

export const installStartupShellHealthMonitor = () => {
  removeLegacyStartupShellNodes();
};