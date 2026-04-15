import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Car, GripVertical, Clock, Star, Flame, Eye } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const SOURCE_COLORS: Record<string, string> = {
  meta: "bg-blue-500/10 text-blue-600",
  "google ads": "bg-red-500/10 text-red-600",
  referral: "bg-green-500/10 text-green-600",
  "walk-in": "bg-amber-500/10 text-amber-600",
  whatsapp: "bg-emerald-500/10 text-emerald-600",
  website: "bg-purple-500/10 text-purple-600",
  manual: "bg-muted text-muted-foreground",
  "csv import": "bg-indigo-500/10 text-indigo-600",
  abandoned: "bg-orange-500/10 text-orange-600",
};

interface SalesLeadCardProps {
  lead: any;
  onDragStart: (e: React.DragEvent, lead: any) => void;
  onDragEnd: () => void;
  onClick: (lead: any) => void;
  isDragging: boolean;
}

export function SalesLeadCard({ lead, onDragStart, onDragEnd, onClick, isDragging }: SalesLeadCardProps) {
  const isHot = lead.is_hot || lead.buying_intent === "Immediate (This Week)";
  const isAbandoned = lead.is_abandoned;

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onDragEnd={onDragEnd}
      className={`border-border/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${
        isDragging ? "opacity-30 scale-95" : ""
      } ${isHot ? "ring-1 ring-orange-400/50" : ""} ${isAbandoned ? "border-orange-300/50" : ""}`}
      onClick={() => onClick(lead)}
    >
      <CardContent className="p-2.5 space-y-1.5">
        {/* Header row */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0" />
            <span className="font-medium text-xs truncate max-w-[130px]">
              {lead.customer_name || "Unknown"}
            </span>
            {isHot && <Flame className="h-3 w-3 text-orange-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-1">
            {lead.source && (
              <Badge className={`text-[8px] px-1 py-0 border-0 ${SOURCE_COLORS[lead.source.toLowerCase()] || "bg-muted text-muted-foreground"}`}>
                {lead.source}
              </Badge>
            )}
          </div>
        </div>

        {/* Client ID */}
        {lead.client_id && (
          <div className="text-[9px] font-mono text-muted-foreground/50 truncate">
            {lead.client_id}
          </div>
        )}

        {/* Phone + Quick Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Phone className="h-2.5 w-2.5" />
            {lead.phone}
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`tel:${lead.phone}`);
              }}
            >
              <Phone className="h-3 w-3 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={async (e) => {
                e.stopPropagation();
                const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
                await sendWhatsApp({
                  phone: lead.phone || "",
                  message: `Hi ${lead.customer_name}, this is GrabYourCar. How can we help you today?`,
                  name: lead.customer_name,
                  logEvent: "sales_contact",
                });
              }}
            >
              <MessageCircle className="h-3 w-3 text-green-600" />
            </Button>
          </div>
        </div>

        {/* Car Interest */}
        {(lead.car_brand || lead.car_model) && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Car className="h-2.5 w-2.5" />
            {[lead.car_brand, lead.car_model, lead.car_variant].filter(Boolean).join(" ")}
          </div>
        )}

        {/* Outcome badges */}
        <div className="flex items-center gap-1 flex-wrap">
          {lead.status_outcome === "won" && (
            <Badge className="text-[8px] bg-emerald-500/10 text-emerald-600 border-0">Won</Badge>
          )}
          {lead.status_outcome === "lost" && (
            <Badge className="text-[8px] bg-red-500/10 text-red-600 border-0">Lost</Badge>
          )}
          {isAbandoned && (
            <Badge className="text-[8px] bg-orange-500/10 text-orange-600 border-0">Abandoned</Badge>
          )}
          {lead.buying_intent && (
            <Badge variant="outline" className="text-[8px] px-1 py-0">
              {lead.buying_intent}
            </Badge>
          )}
        </div>

        {/* Rating */}
        {lead.feedback_rating > 0 && (
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-2.5 w-2.5 ${lead.feedback_rating >= n ? "text-yellow-500" : "text-muted-foreground/20"}`}
                fill={lead.feedback_rating >= n ? "currentColor" : "none"}
              />
            ))}
          </div>
        )}

        {/* Footer: follow-up + age */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          {lead.follow_up_date ? (
            <div className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {format(new Date(lead.follow_up_date), "dd MMM")}
            </div>
          ) : (
            <span />
          )}
          {lead.created_at && (
            <span>{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
          )}
        </div>

        {/* Website behavior indicator */}
        {lead.website_journey && (
          <div className="flex items-center gap-1 text-[9px] text-purple-500">
            <Eye className="h-2.5 w-2.5" />
            Website tracked
          </div>
        )}
      </CardContent>
    </Card>
  );
}
