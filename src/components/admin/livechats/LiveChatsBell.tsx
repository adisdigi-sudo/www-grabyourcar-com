import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface LiveChatsBellProps {
  onClick: () => void;
  className?: string;
}

const LAST_SEEN_KEY = "gyc_livechats_last_seen_at";

export const LiveChatsBell = ({ onClick, className }: LiveChatsBellProps) => {
  const [unread, setUnread] = useState(0);
  const [pulse, setPulse] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const refresh = async () => {
    try {
      const lastSeen = localStorage.getItem(LAST_SEEN_KEY) || new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from("riya_chat_sessions")
        .select("id", { count: "exact", head: true })
        .gte("last_visitor_message_at", lastSeen)
        .neq("takeover_state", "closed");
      setUnread(count ?? 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("livechats-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "riya_chat_sessions" },
        () => {
          refresh();
          setPulse(true);
          setTimeout(() => setPulse(false), 2000);
          // Subtle chime
          try {
            if (!audioRef.current) {
              audioRef.current = new Audio(
                "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
              );
              audioRef.current.volume = 0.3;
            }
            audioRef.current.play().catch(() => {});
          } catch {
            // ignore
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "riya_chat_messages", filter: "role=eq.user" },
        () => {
          refresh();
          setPulse(true);
          setTimeout(() => setPulse(false), 2000);
        }
      )
      .subscribe();

    const interval = setInterval(refresh, 30_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const handleClick = () => {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    setUnread(0);
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative flex items-center justify-center w-10 h-10 rounded-full bg-background border shadow-md hover:shadow-lg transition-all",
        pulse && "animate-pulse ring-2 ring-primary",
        className
      )}
      aria-label={`Live Chats — ${unread} unread`}
      title={`Live Chats — ${unread} active conversation${unread === 1 ? "" : "s"}`}
    >
      <MessageCircle className={cn("h-5 w-5", unread > 0 ? "text-primary" : "text-muted-foreground")} />
      {unread > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
        >
          {unread > 99 ? "99+" : unread}
        </Badge>
      )}
    </button>
  );
};

export default LiveChatsBell;
