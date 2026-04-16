import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = Exclude<Theme, "system">;

interface ThemeProviderProps {
  children: ReactNode;
  attribute?: "class" | "data-theme";
  defaultTheme?: Theme;
  enableSystem?: boolean;
  storageKey?: string;
}

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const DEFAULT_THEME: Theme = "system";
const DEFAULT_RESOLVED_THEME: ResolvedTheme = "light";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isTheme = (value: string | null): value is Theme =>
  value === "light" || value === "dark" || value === "system";

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") {
    return DEFAULT_RESOLVED_THEME;
  }

  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
};

const applyThemeAttribute = (attribute: ThemeProviderProps["attribute"], theme: ResolvedTheme) => {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    return;
  }

  root.setAttribute(attribute ?? "class", theme);
};

export const ThemeProvider = ({
  children,
  attribute = "class",
  defaultTheme = DEFAULT_THEME,
  enableSystem = true,
  storageKey = "theme",
}: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return defaultTheme;
    }

    const storedTheme = window.localStorage.getItem(storageKey);
    return isTheme(storedTheme) ? storedTheme : defaultTheme;
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  useEffect(() => {
    if (typeof window === "undefined" || !enableSystem) {
      return;
    }

    const mediaQuery = window.matchMedia(MEDIA_QUERY);
    const updateSystemTheme = () => setSystemTheme(mediaQuery.matches ? "dark" : "light");

    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);

    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, [enableSystem]);

  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    if (theme === "system") {
      return enableSystem ? systemTheme : DEFAULT_RESOLVED_THEME;
    }

    return theme;
  }, [enableSystem, systemTheme, theme]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, theme);
    }

    applyThemeAttribute(attribute, resolvedTheme);
  }, [attribute, resolvedTheme, storageKey, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      setTheme: setThemeState,
    }),
    [resolvedTheme, systemTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (context) {
    return context;
  }

  return {
    theme: DEFAULT_THEME,
    resolvedTheme: getSystemTheme(),
    systemTheme: getSystemTheme(),
    setTheme: () => undefined,
  } satisfies ThemeContextValue;
};
