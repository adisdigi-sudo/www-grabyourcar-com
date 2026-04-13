const DYNAMIC_IMPORT_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "Failed to fetch module script",
  "error loading dynamically imported module",
  "Unable to preload",
  "Unable to preload CSS",
  "Failed to load url /node_modules/.vite/deps/",
  "Failed to load url /@fs/",
];

// Patterns that should NOT trigger recovery (API/fetch errors)
const FALSE_POSITIVE_PATTERNS = [
  "FetchError",
  "supabase",
  "postgrest",
  "edge-function",
  "rest/v1",
  "auth/v1",
];

const DEFAULT_MAX_ATTEMPTS = 3;
const CACHE_BUST_PARAM = "__v";

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
};

const isViteOptimizedDepError = (message: string): boolean => {
  const normalizedMessage = message.toLowerCase();

  return (
    (normalizedMessage.includes(".vite/deps") || normalizedMessage.includes("/@fs/")) &&
    (normalizedMessage.includes("failed to load url") || normalizedMessage.includes("does the file exist"))
  );
};

export const isDynamicImportError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  // Must match a dynamic import pattern
  const isImportError = DYNAMIC_IMPORT_ERROR_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase()),
  );
  if (!isImportError && !isViteOptimizedDepError(message)) return false;
  // Must NOT match a false positive (API/Supabase error)
  const isFalsePositive = FALSE_POSITIVE_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase()),
  );
  return !isFalsePositive;
};

export const recoverFromChunkLoadError = (
  storageKey = "chunk_load_recovery",
  maxAttempts = DEFAULT_MAX_ATTEMPTS
): boolean => {
  try {
    const currentAttempts = Number.parseInt(sessionStorage.getItem(storageKey) ?? "0", 10);
    if (!Number.isNaN(currentAttempts) && currentAttempts >= maxAttempts) {
      return false;
    }

    sessionStorage.setItem(storageKey, String(Number.isNaN(currentAttempts) ? 1 : currentAttempts + 1));

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set(CACHE_BUST_PARAM, Date.now().toString());
    window.location.replace(nextUrl.toString());
    return true;
  } catch {
    window.location.reload();
    return true;
  }
};

export const resetChunkLoadRecovery = (storageKey = "chunk_load_recovery"): void => {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
};
