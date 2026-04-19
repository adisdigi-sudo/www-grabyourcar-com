import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { MessageCircle } from "lucide-react";

/**
 * LiveChatNotifier — global, mount-once popup that listens for new Riya chat
 * sessions in realtime and shows a toast with a "View" CTA. Admin-only.
 */
export const LiveChatNotifier = () => {
  const { isAdmin, isSuperAdmin, initialized } = useAdminAuth();
  const navigate = useNavigate();
  const seenSessionIds = useRef<Set<string>>(new Set());
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!initialized) return;
    if (!(isAdmin || isSuperAdmin)) return;

    const channel = supabase
      .channel("riya-live-chat-notifier")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "riya_chat_sessions" },
        (payload) => {
          const sess = payload.new as {
            id: string;
            visitor_name?: string | null;
            visitor_phone?: string | null;
            last_message_preview?: string | null;
          };
          if (seenSessionIds.current.has(sess.id)) return;
          seenSessionIds.current.add(sess.id);

          // Tiny "ding" via WebAudio (no asset needed)
          try {
            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = 880;
            g.gain.setValueAtTime(0.15, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            o.start();
            o.stop(ctx.currentTime + 0.4);
          } catch {
            // ignore audio failures
          }

          toast(
            `New chat from ${sess.visitor_name || sess.visitor_phone || "a visitor"}`,
            {
              description: sess.last_message_preview || "Click to view live transcript",
              icon: <MessageCircle className="h-4 w-4" />,
              duration: 8000,
              action: {
                label: "View",
                onClick: () => navigate("/admin?tab=live-chats"),
              },
            }
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "riya_chat_sessions", filter: "lead_captured=eq.true" },
        (payload) => {
          const sess = payload.new as {
            id: string;
            visitor_name?: string | null;
            visitor_phone?: string | null;
            lead_captured: boolean;
          };
          // Only fire once we observe the transition to true after mount
          if (Date.now() - mountTimeRef.current < 2000) return;
          toast.success(
            `🎯 Lead captured: ${sess.visitor_name || sess.visitor_phone || "visitor"}`,
            {
              description: "Phone shared in chat — saved to CRM",
              duration: 8000,
              action: {
                label: "Open chat",
                onClick: () => navigate("/admin?tab=live-chats"),
              },
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialized, isAdmin, isSuperAdmin, navigate]);

  return null;
};

export default LiveChatNotifier;
