import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./App.tsx";
import "./index.css";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import {
  isDynamicImportError,
  recoverFromChunkLoadError,
  resetChunkLoadRecovery,
} from "@/lib/chunkLoadRecovery";

const handleDynamicImportFailure = (error: unknown) => {
  if (!isDynamicImportError(error)) return;
  console.warn("[ChunkRecovery] Dynamic import error detected, attempting recovery:", error);
  recoverFromChunkLoadError("global_chunk_recovery");
};

window.addEventListener(
  "error",
  (event) => {
    // Only handle script/module loading errors, not runtime errors
    if (event.filename && (event.filename.endsWith('.js') || event.filename.endsWith('.mjs'))) {
      handleDynamicImportFailure(event.error ?? event.message);
    }
  },
  true
);

window.addEventListener("unhandledrejection", (event) => {
  // Only recover from genuine dynamic import failures
  if (isDynamicImportError(event.reason)) {
    console.warn("[ChunkRecovery] Unhandled rejection from dynamic import:", event.reason);
    handleDynamicImportFailure(event.reason);
  }
});

window.addEventListener(
  "load",
  () => {
    resetChunkLoadRecovery("global_chunk_recovery");
    resetChunkLoadRecovery("route_chunk_recovery");
  },
  { once: true }
);

// Block search-engine indexing on .lovable.app domains
if (window.location.hostname.endsWith(".lovable.app")) {
  const noindex = document.createElement("meta");
  noindex.name = "robots";
  noindex.content = "noindex, nofollow";
  document.head.appendChild(noindex);
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppErrorBoundary>
        <>
          <App />
          <Analytics />
          <SpeedInsights />
        </>
      </AppErrorBoundary>
    </ThemeProvider>
  </HelmetProvider>
);
