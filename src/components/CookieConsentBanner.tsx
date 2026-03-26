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
    <div className="fixed bottom-14 md:bottom-0 inset-x-0 z-[60] p-2 sm:p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-card/95 backdrop-blur-lg shadow-2xl p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <p className="flex-1 text-xs sm:text-sm text-muted-foreground leading-snug">
            We use cookies to improve your experience.{" "}
            <a href="/privacy-policy" className="underline hover:text-primary">Privacy Policy</a>
          </p>
          <div className="flex gap-1.5 shrink-0">
            <Button size="sm" onClick={handleAccept} className="text-xs h-8 px-3">
              Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDecline} className="text-xs h-8 px-2">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
