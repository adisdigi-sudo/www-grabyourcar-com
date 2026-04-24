/**
 * VisitorEngagementPopups — exit-intent + 30s-time popups that nudge
 * the visitor toward the Riya chat widget. Uses the brand's design tokens.
 *
 * Integration: emits a window event "riya:open" — RiyaChatWidget listens
 * and opens itself.
 */
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { trackEvent } from "@/lib/visitorTracker";
import { useLocation } from "react-router-dom";

const STORAGE_KEYS = {
  exitShown: "gyc_exit_popup_shown_at",
  timeShown: "gyc_time_popup_shown_at",
};

const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 h between same popup
const TIME_TRIGGER_MS = 30_000; // 30 sec
const EXCLUDE_PREFIXES = ["/admin", "/crm", "/workspace", "/auth", "/thank-you", "/insurance-doc"];

const wasShownRecently = (key: string): boolean => {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(key);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < COOLDOWN_MS;
};

const markShown = (key: string) => {
  try {
    window.localStorage.setItem(key, String(Date.now()));
  } catch {
    // ignore
  }
};

const openRiya = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("riya:open"));
};

type Trigger = "exit" | "time";

export const VisitorEngagementPopups = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<Trigger>("time");
  const dismissedRef = useRef(false);

  const isExcluded = EXCLUDE_PREFIXES.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (isExcluded) return;
    if (typeof window === "undefined") return;

    // Time-based trigger
    const timeT = window.setTimeout(() => {
      if (dismissedRef.current) return;
      if (wasShownRecently(STORAGE_KEYS.timeShown)) return;
      setTrigger("time");
      setOpen(true);
      markShown(STORAGE_KEYS.timeShown);
      void trackEvent("popup_shown", "time_30s");
    }, TIME_TRIGGER_MS);

    // Exit-intent (mouse leaves top of viewport)
    const onMouseOut = (e: MouseEvent) => {
      if (dismissedRef.current) return;
      if (e.clientY > 10) return;
      if (e.relatedTarget || (e as unknown as { toElement?: unknown }).toElement) return;
      if (wasShownRecently(STORAGE_KEYS.exitShown)) return;
      setTrigger("exit");
      setOpen(true);
      markShown(STORAGE_KEYS.exitShown);
      void trackEvent("popup_shown", "exit_intent");
    };

    document.addEventListener("mouseout", onMouseOut);
    return () => {
      window.clearTimeout(timeT);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [isExcluded, location.pathname]);

  const handleChat = () => {
    void trackEvent("popup_cta_click", trigger === "exit" ? "exit_to_riya" : "time_to_riya");
    setOpen(false);
    dismissedRef.current = true;
    // Slight delay so the dialog close animation finishes before chat opens
    window.setTimeout(openRiya, 200);
  };

  const handleDismiss = () => {
    void trackEvent("popup_dismiss", trigger);
    setOpen(false);
    dismissedRef.current = true;
  };

  if (isExcluded) return null;

  const headline =
    trigger === "exit"
      ? "Ek minute ruko! 👋"
      : "Help chahiye? 💬";
  const subline =
    trigger === "exit"
      ? "Best price aur instant offers chahiye? Riya se baat karein — 30 second me sab clear."
      : "Aap kaafi der se site dekh rahe hain. Riya aapki seedhi madad karegi — abhi chat shuru karein.";

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleDismiss())}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl">
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-primary-foreground">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-3 top-3 p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs uppercase tracking-wide opacity-90">GrabYourCar Assistant</span>
          </div>
          <DialogTitle className="text-2xl font-bold leading-tight">{headline}</DialogTitle>
          <DialogDescription className="text-primary-foreground/90 mt-2">
            {subline}
          </DialogDescription>
        </div>

        <div className="p-6 space-y-4 bg-background">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Riya</span> abhi online hai.
              Best price, EMI calculator, brochure — sab chat me milega.
            </div>
          </div>

          <Button onClick={handleChat} className="w-full h-11 text-base font-semibold gap-2">
            <MessageCircle className="h-5 w-5" />
            Riya se chat shuru karein
          </Button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Nahi, baad me dekhunga
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VisitorEngagementPopups;
