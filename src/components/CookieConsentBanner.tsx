import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const CONSENT_KEY = "gyc_cookie_consent";

type ConsentStatus = "granted" | "denied" | null;

const getStoredConsent = (): ConsentStatus => {
  try {
    return localStorage.getItem(CONSENT_KEY) as ConsentStatus;
  } catch {
    return null;
  }
};

/** Push Google Consent Mode v2 update */
const updateGoogleConsent = (granted: boolean) => {
  if (window.gtag) {
    window.gtag("consent", "update", {
      ad_storage: granted ? "granted" : "denied",
      ad_user_data: granted ? "granted" : "denied",
      ad_personalization: granted ? "granted" : "denied",
      analytics_storage: granted ? "granted" : "denied",
    });
  }
};

export const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (consent === null) {
      // No choice yet — show banner after short delay
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    // Already answered — apply stored choice silently
    updateGoogleConsent(consent === "granted");
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "granted");
    updateGoogleConsent(true);
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, "denied");
    updateGoogleConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-3 sm:p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 backdrop-blur-lg shadow-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Cookie className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to improve your experience, serve personalized ads, and analyze traffic.
                By clicking <strong className="text-foreground">"Accept All"</strong>, you consent to our use of cookies.{" "}
                <a
                  href="/privacy-policy"
                  className="underline underline-offset-2 hover:text-primary transition-colors"
                >
                  Privacy Policy
                </a>
              </p>
              <button
                onClick={handleDecline}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors sm:hidden"
                aria-label="Close cookie banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleAccept} className="text-xs sm:text-sm">
                Accept All
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline} className="text-xs sm:text-sm">
                Decline
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
