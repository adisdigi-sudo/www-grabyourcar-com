import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const CorporateFloatingCTA = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past ~600px (hero section)
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (dismissed || !visible) return null;

  const scrollToCTA = () => {
    document.getElementById("corporate-cta")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50",
        "py-3 px-4 transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="container mx-auto flex items-center justify-between gap-4 max-w-5xl">
        <div className="hidden sm:block">
          <p className="text-white font-semibold text-sm">Ready to streamline your fleet procurement?</p>
          <p className="text-slate-400 text-xs">Get volume pricing and dedicated support for your organization.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={scrollToCTA}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 flex-1 sm:flex-none"
          >
            Get Corporate Quote
            <ArrowRight className="h-4 w-4" />
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
