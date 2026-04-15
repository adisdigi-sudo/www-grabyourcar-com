import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { BootstrapRuntime } from "@/components/bootstrap/BootstrapRuntime";

const STARTUP_SHELL_ID = "lovable-startup-shell";

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
  shell.style.background = "hsl(0 0% 100%)";
  shell.style.color = "hsl(222.2 84% 4.9%)";
  shell.innerHTML = `
    <div style="height:44px;width:44px;border-radius:9999px;border:3px solid hsl(220 14% 96%);border-top-color:hsl(221.2 83.2% 53.3%);animation:lovable-spin 1s linear infinite;"></div>
    <div style="font:600 16px system-ui, sans-serif;">CRM reconnect ho raha hai</div>
    <div style="max-width:420px;text-align:center;font:400 13px system-ui, sans-serif;color:hsl(215.4 16.3% 46.9%);padding:0 20px;">Agar dev update aayi hai to page thodi der stable shell par rahega. White page ke bajaye yeh recovery state dikhni chahiye.</div>
  `;

  const style = document.createElement("style");
  style.textContent = `@keyframes lovable-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  shell.appendChild(style);
  document.body.appendChild(shell);
};

const removeStartupShell = () => {
  const shell = typeof document !== "undefined" ? document.getElementById(STARTUP_SHELL_ID) : null;
  shell?.remove();
};

try {
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
