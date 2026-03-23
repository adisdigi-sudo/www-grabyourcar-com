import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Phone, MessageCircle, FileText, Send, CheckCircle2,
  XCircle, Star, Clock, UserPlus, Eye, Car, CreditCard,
} from "lucide-react";
import { format } from "date-fns";

const ICON_MAP: Record<string, any> = {
  stage_change: Clock,
  call_logged: Phone,
  whatsapp_sent: MessageCircle,
  quote_shared: FileText,
  agreement_sent: Send,
  marked_won: CheckCircle2,
  marked_lost: XCircle,
  after_sales_closed: Star,
  remark_added: FileText,
  follow_up_set: Clock,
  delivery_media_added: Car,
  payment_received: CreditCard,
  website_visit: Globe,
  form_started: UserPlus,
  form_abandoned: Eye,
  intent_set: Car,
  intent_updated: Car,
  video_added: Car,
  delivery_date_set: CheckCircle2,
  created: UserPlus,
};

const COLOR_MAP: Record<string, string> = {
  stage_change: "bg-blue-500",
  call_logged: "bg-amber-500",
  whatsapp_sent: "bg-green-500",
  quote_shared: "bg-violet-500",
  agreement_sent: "bg-indigo-500",
  marked_won: "bg-emerald-500",
  marked_lost: "bg-red-500",
  after_sales_closed: "bg-yellow-500",
  remark_added: "bg-muted-foreground",
  follow_up_set: "bg-cyan-500",
  payment_received: "bg-emerald-600",
  website_visit: "bg-purple-500",
  form_started: "bg-blue-400",
  form_abandoned: "bg-orange-500",
  created: "bg-blue-500",
};

interface TimelineEntry {
  id: string;
  action: string;
  remarks?: string | null;
  performed_by?: string | null;
  created_at: string;
}

interface SalesCustomerTimelineProps {
  activities: TimelineEntry[];
  websiteJourney?: any;
}

export function SalesCustomerTimeline({ activities, websiteJourney }: SalesCustomerTimelineProps) {
  // Build combined timeline
  const timelineItems: TimelineEntry[] = [...activities];

  // Add website journey events if available
  if (websiteJourney?.events?.length) {
    websiteJourney.events.forEach((evt: any, i: number) => {
      timelineItems.push({
        id: `web-${i}`,
        action: "website_visit",
        remarks: `${evt.step}${evt.data ? ` - ${JSON.stringify(evt.data)}` : ""}`,
        performed_by: "Website",
        created_at: evt.at,
      });
    });
  }

  // Sort by date descending
  timelineItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No activity recorded yet
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[500px]">
      <div className="relative pl-6 space-y-0">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

        {timelineItems.map((item) => {
          const Icon = ICON_MAP[item.action] || Clock;
          const dotColor = COLOR_MAP[item.action] || "bg-muted-foreground";

          return (
            <div key={item.id} className="relative pb-4 last:pb-0">
              {/* Dot */}
              <div className={`absolute -left-6 top-1 w-[22px] h-[22px] rounded-full ${dotColor} flex items-center justify-center`}>
                <Icon className="h-3 w-3 text-white" />
              </div>

              {/* Content */}
              <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {item.action.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(item.created_at), "dd MMM yyyy, hh:mm a")}
                  </span>
                </div>
                {item.remarks && (
                  <p className="text-xs text-foreground/80 mt-1">{item.remarks}</p>
                )}
                {item.performed_by && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    by {item.performed_by}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
