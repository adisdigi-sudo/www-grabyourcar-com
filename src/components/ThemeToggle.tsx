import { forwardRef } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/button";

export const ThemeToggle = forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
function ThemeToggle({ className, ...props }, ref) {
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
      ref={ref}
      variant="ghost"
      size="icon"
      className={["h-9 w-9", className].filter(Boolean).join(" ")}
      onClick={cycleTheme}
      title={`Switch to ${nextThemeLabel} theme`}
      aria-label={`Current theme ${currentTheme}. Switch to ${nextThemeLabel} theme`}
      {...props}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
});

ThemeToggle.displayName = "ThemeToggle";
