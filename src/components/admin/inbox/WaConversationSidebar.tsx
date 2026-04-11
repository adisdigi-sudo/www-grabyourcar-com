import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Pin, Clock, CheckCheck, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, formatDistanceToNowStrict } from "date-fns";
import type { WaConversation } from "../WhatsAppBusinessInbox";

interface Props {
  conversations: WaConversation[];
  selectedId: string | null;
  onSelect: (convo: WaConversation) => void;
  isLoading: boolean;
}

export function WaConversationSidebar({ conversations, selectedId, onSelect, isLoading }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "active">("all");

  const filtered = useMemo(() => {
    let list = conversations;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.customer_name?.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.last_message?.toLowerCase().includes(q)
      );
    }
    if (filter === "unread") list = list.filter(c => c.unread_count > 0);
    if (filter === "active") list = list.filter(c => {
      return c.window_expires_at && new Date(c.window_expires_at) > new Date();
    });
    return list;
  }, [conversations, search, filter]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Yesterday";
    return format(d, "dd/MM/yy");
  };

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  return (
    <div className="w-80 border-r flex flex-col bg-card shrink-0">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            Chats
            {totalUnread > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">{totalUnread}</Badge>
            )}
          </h3>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "unread", "active"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                filter === f
                  ? "bg-green-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f === "all" ? "All" : f === "unread" ? "Unread" : "24hr Active"}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">No conversations</div>
        ) : (
          filtered.map(convo => {
            const isSelected = convo.id === selectedId;
            const windowOpen = convo.window_expires_at && new Date(convo.window_expires_at) > new Date();

            return (
              <button
                key={convo.id}
                onClick={() => onSelect(convo)}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-accent/50 transition-colors",
                  isSelected && "bg-accent"
                )}
              >
                <div className="flex items-start gap-2.5">
                  {/* Avatar */}
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    windowOpen ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                  )}>
                    {(convo.customer_name || convo.phone)?.[0]?.toUpperCase() || "?"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-sm truncate">
                        {convo.is_pinned && <Pin className="inline h-3 w-3 mr-1 text-amber-500" />}
                        {convo.customer_name || convo.phone}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(convo.last_message_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {convo.last_message || "No messages"}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {windowOpen && (
                          <Clock className="h-3 w-3 text-green-500" />
                        )}
                        {convo.unread_count > 0 && (
                          <Badge className="h-4 min-w-4 px-1 text-[10px] bg-green-600 hover:bg-green-600">
                            {convo.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {convo.assigned_vertical && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 mt-1 h-4">
                        {convo.assigned_vertical}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}
