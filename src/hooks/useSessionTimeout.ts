import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withPreviewParams } from "@/lib/previewRouting";

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Auto-logout admin users after 10 minutes of inactivity.
 * Tracks mouse, keyboard, scroll, and touch events.
 */
export const useSessionTimeout = (enabled: boolean = true) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(async () => {
    toast.error("Session expired due to inactivity. Please log in again.");
    await supabase.auth.signOut();
    window.location.replace(withPreviewParams("/crm-auth"));
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    // Clear existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    // Show warning 1 minute before logout
    warningRef.current = setTimeout(() => {
      toast.warning("Session will expire in 1 minute due to inactivity.", {
        duration: 10000,
      });
    }, TIMEOUT_MS - 60 * 1000);

    // Auto-logout after full timeout
    timerRef.current = setTimeout(logout, TIMEOUT_MS);
  }, [enabled, logout]);

  useEffect(() => {
    if (!enabled) return;

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => resetTimer();

    // Initialize timer
    resetTimer();

    // Attach listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [enabled, resetTimer]);
};
