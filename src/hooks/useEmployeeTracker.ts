import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const HEARTBEAT_INTERVAL = 60_000; // 1 min
const IDLE_THRESHOLD = 5 * 60_000; // 5 min idle = warning
const IDLE_HARD_THRESHOLD = 10 * 60_000; // 10 min = log break

/**
 * Tracks employee login sessions, active/idle time, and breaks.
 * Super admins are excluded from tracking.
 */
export function useEmployeeTracker({
  enabled,
  userId,
  userEmail,
  userName,
  verticalName,
  isSuperAdmin,
}: {
  enabled: boolean;
  userId?: string;
  userEmail?: string;
  userName?: string;
  verticalName?: string;
  isSuperAdmin: boolean;
}) {
  const sessionIdRef = useRef<string | null>(null);
  const lastActivityRef = useRef(Date.now());
  const activeSecondsRef = useRef(0);
  const idleSecondsRef = useRef(0);
  const breakSecondsRef = useRef(0);
  const breakCountRef = useRef(0);
  const isIdleRef = useRef(false);
  const isOnBreakRef = useRef(false);
  const idleWarningShownRef = useRef(false);

  // Create session on mount
  const createSession = useCallback(async () => {
    if (!userId || isSuperAdmin) return;
    
    try {
      const { data, error } = await supabase
        .from("employee_sessions")
        .insert({
          user_id: userId,
          user_email: userEmail,
          user_name: userName,
          vertical_name: verticalName,
          session_date: new Date().toISOString().split("T")[0],
          login_at: new Date().toISOString(),
          is_active: true,
        })
        .select("id")
        .single();

      if (!error && data) {
        sessionIdRef.current = data.id;
      }
    } catch {
      // Silent
    }
  }, [userId, userEmail, userName, verticalName, isSuperAdmin]);

  // Update session heartbeat
  const heartbeat = useCallback(async () => {
    if (!sessionIdRef.current) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;

    // Check idle thresholds
    if (timeSinceActivity >= IDLE_HARD_THRESHOLD && !isOnBreakRef.current) {
      isOnBreakRef.current = true;
      breakCountRef.current += 1;
      if (!idleWarningShownRef.current) {
        toast.warning("Aap kaam nahi kar rahe! 🚨 Break recorded.", { duration: 8000 });
        idleWarningShownRef.current = true;
      }
    } else if (timeSinceActivity >= IDLE_THRESHOLD && !isIdleRef.current) {
      isIdleRef.current = true;
      if (!idleWarningShownRef.current) {
        toast.info("Kuch der se activity nahi hai... Sab theek hai? 🤔", { duration: 6000 });
        idleWarningShownRef.current = true;
      }
    }

    // Accumulate seconds
    if (isOnBreakRef.current) {
      breakSecondsRef.current += Math.round(HEARTBEAT_INTERVAL / 1000);
    } else if (isIdleRef.current) {
      idleSecondsRef.current += Math.round(HEARTBEAT_INTERVAL / 1000);
    } else {
      activeSecondsRef.current += Math.round(HEARTBEAT_INTERVAL / 1000);
    }

    try {
      await supabase
        .from("employee_sessions")
        .update({
          total_active_seconds: activeSecondsRef.current,
          total_idle_seconds: idleSecondsRef.current,
          total_break_seconds: breakSecondsRef.current,
          break_count: breakCountRef.current,
          is_active: !isOnBreakRef.current,
          last_heartbeat_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionIdRef.current);
    } catch {
      // Silent
    }
  }, []);

  // Handle user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isIdleRef.current || isOnBreakRef.current) {
      if (isOnBreakRef.current) {
        toast.success("Welcome back! Chalo kaam shuru karte hain! 💪", { duration: 4000 });
      }
      isIdleRef.current = false;
      isOnBreakRef.current = false;
      idleWarningShownRef.current = false;
    }
  }, []);

  // End session on unmount / logout
  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      await supabase
        .from("employee_sessions")
        .update({
          logout_at: new Date().toISOString(),
          is_active: false,
          total_active_seconds: activeSecondsRef.current,
          total_idle_seconds: idleSecondsRef.current,
          total_break_seconds: breakSecondsRef.current,
          break_count: breakCountRef.current,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionIdRef.current);
    } catch {
      // Silent
    }
    sessionIdRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled || !userId || isSuperAdmin) return;

    createSession();

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => document.addEventListener(e, handleActivity, { passive: true }));

    const heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    // Detect page close
    const beforeUnload = () => {
      endSession();
    };
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      events.forEach((e) => document.removeEventListener(e, handleActivity));
      clearInterval(heartbeatInterval);
      window.removeEventListener("beforeunload", beforeUnload);
      endSession();
    };
  }, [enabled, userId, isSuperAdmin, createSession, handleActivity, heartbeat, endSession]);

  return { endSession };
}
