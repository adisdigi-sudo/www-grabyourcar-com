const APP_ROOT_ID = "root";

export const ensureAppRootElement = () => {
  if (typeof document === "undefined") {
    return null;
  }

  const existingRoot = document.getElementById(APP_ROOT_ID);
  if (existingRoot) {
    return existingRoot;
  }

  const root = document.createElement("div");
  root.id = APP_ROOT_ID;
  document.body.appendChild(root);

  console.warn("[Bootstrap] Missing #root element detected; created a fallback mount node.", {
    href: window.location.href,
  });

  return root;
};