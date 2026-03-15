import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

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
      <App />
    </ThemeProvider>
  </HelmetProvider>
);
