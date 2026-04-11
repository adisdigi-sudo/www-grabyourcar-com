import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, Phone, Mail, Tag, Clock, MessageSquare, UserCheck } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import type { WaConversation } from "../WhatsAppBusinessInbox";

interface Props {
  conversation: WaConversation;
  messageCount: number;
  onClose: () => void;
}

export function WaCustomerInfoPanel({ conversation, messageCount, onClose }: Props) {
  const isWindowOpen = conversation.window_expires_at && new Date(conversation.window_expires_at) > new Date();

  return (
    <div className="w-72 border-l bg-card flex flex-col shrink-0">
      <div className="h-14 flex items-center justify-between px-4 border-b">
        <h4 className="font-semibold text-sm">Contact Info</h4>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Profile */}
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mx-auto">
              {(conversation.customer_name || conversation.phone)?.[0]?.toUpperCase() || "?"}
            </div>
            <p className="font-semibold mt-2">{conversation.customer_name || "Unknown"}</p>
            <p className="text-xs text-muted-foreground">{conversation.phone}</p>
          </div>

          <Separator />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <MessageSquare className="h-4 w-4 mx-auto text-muted-foreground" />
              <p className="text-lg font-bold mt-1">{messageCount}</p>
              <p className="text-[10px] text-muted-foreground">Messages</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <Clock className="h-4 w-4 mx-auto text-muted-foreground" />
              <p className="text-xs font-bold mt-1">
                {isWindowOpen
                  ? formatDistanceToNowStrict(new Date(conversation.window_expires_at!))
                  : "Closed"}
              </p>
              <p className="text-[10px] text-muted-foreground">Window</p>
            </div>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{conversation.phone}</span>
            </div>
            {conversation.assigned_vertical && (
              <div className="flex items-center gap-2 text-xs">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{conversation.assigned_vertical}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>First chat: {format(new Date(conversation.created_at), "dd MMM yyyy")}</span>
            </div>
          </div>

          {/* Tags */}
          {conversation.tags && conversation.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium mb-1.5 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {conversation.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Status */}
          <Separator />
          <div className="space-y-1">
            <p className="text-xs font-medium">Status</p>
            <Badge className={conversation.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}>
              {conversation.status}
            </Badge>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
