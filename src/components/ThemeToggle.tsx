import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const currentTheme = theme ?? "system";

  const cycleTheme = () => {
    if (currentTheme === "light") {
      setTheme("dark");
      return;
    }

    if (currentTheme === "dark") {
      setTheme("system");
      return;
    }

    setTheme("light");
  };

  const Icon = currentTheme === "light" ? Sun : currentTheme === "dark" ? Moon : Laptop;

  const nextThemeLabel = currentTheme === "light"
    ? "dark"
    : currentTheme === "dark"
      ? "system"
      : "light";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={cycleTheme}
      title={`Switch to ${nextThemeLabel} theme`}
      aria-label={`Current theme ${currentTheme}. Switch to ${nextThemeLabel} theme`}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
