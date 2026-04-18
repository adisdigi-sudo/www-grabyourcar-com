const SENSITIVE_PREVIEW_ROUTE_PREFIXES = [
  "/crm",
  "/crm-auth",
  "/crm-reset-password",
  "/admin",
  "/admin-auth",
  "/admin-reset-password",
  "/workspace",
  "/document-viewer",
];

export const isSensitivePreviewRoutePath = (pathname: string) =>
  SENSITIVE_PREVIEW_ROUTE_PREFIXES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

export const isEmbeddedPreviewWindow = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    if (window.self !== window.top) {
      return true;
    }

    if (window.frameElement) {
      return true;
    }

    return window.location.ancestorOrigins?.length > 0;
  } catch {
    return true;
  }
};

export const isLovableEditorPreviewHost = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const { hostname, search } = window.location;
  return (
    hostname.endsWith(".lovableproject.com") ||
    hostname.startsWith("id-preview--") ||
    new URLSearchParams(search).has("__lovable_token")
  );
};

export const isSensitivePreviewRouteWindow = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const { hostname, pathname } = window.location;
  return hostname.startsWith("admin.") || isSensitivePreviewRoutePath(pathname);
};

// Sensitive CRM routes should stabilize only in standalone windows.
// Editor/embedded previews must fail open so the iframe never gets trapped
// behind the global startup recovery shell.
export const shouldStabilizeStartupShellWindow = () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (isEmbeddedPreviewWindow() || isLovableEditorPreviewHost()) {
    return false;
  }

  return isSensitivePreviewRouteWindow();
};

// Avoid force-reload loops for any sensitive route during dev, including editor previews.
export const shouldAvoidDevAutoReload = () => import.meta.env.DEV && isSensitivePreviewRouteWindow();