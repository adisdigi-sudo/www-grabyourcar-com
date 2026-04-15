import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Shield, AlertTriangle, Phone, CalendarClock } from "lucide-react";
import { differenceInDays, differenceInHours, format } from "date-fns";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: "renewal" | "followup" | "overdue" | "urgent";
  title: string;
  subtitle: string;
  daysLeft?: number;
}

interface StageNotificationBannerProps {
  items: NotificationItem[];
  className?: string;
}

const typeConfig = {
  renewal: { icon: Shield, bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", text: "text-amber-700", dot: "bg-amber-500", blink: true },
  followup: { icon: Clock, bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800", text: "text-blue-700", dot: "bg-blue-500", blink: false },
  overdue: { icon: AlertTriangle, bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", text: "text-red-700", dot: "bg-red-500", blink: true },
  urgent: { icon: Phone, bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800", text: "text-orange-700", dot: "bg-orange-500", blink: true },
};

export function StageNotificationBanner({ items, className }: StageNotificationBannerProps) {
  if (items.length === 0) return null;

  const urgentCount = items.filter(i => i.type === "overdue" || i.type === "urgent").length;

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Summary bar */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium",
        urgentCount > 0 ? "bg-red-50 dark:bg-red-950/30 border-red-200 text-red-700" : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-700"
      )}>
        <Bell className={cn("h-3.5 w-3.5", urgentCount > 0 && "animate-bounce")} />
        <span>{items.length} action{items.length > 1 ? "s" : ""} pending</span>
        {urgentCount > 0 && (
          <Badge variant="destructive" className="text-[9px] h-4 px-1.5 animate-pulse ml-auto">
            {urgentCount} urgent
          </Badge>
        )}
      </div>

      {/* Individual notifications */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {items.slice(0, 6).map(item => {
          const config = typeConfig[item.type];
          const Icon = config.icon;
          return (
            <div key={item.id} className={cn(
              "shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all",
              config.bg
            )}>
              <div className="relative">
                <Icon className={cn("h-3.5 w-3.5", config.text)} />
                {config.blink && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", config.dot)} />
                    <span className={cn("relative inline-flex rounded-full h-2 w-2", config.dot)} />
                  </span>
                )}
              </div>
              <div>
                <p className={cn("font-medium leading-tight", config.text)}>{item.title}</p>
                <p className="text-muted-foreground text-[9px]">{item.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to build notification items from insurance clients
export function buildInsuranceNotifications(clients: any[]): NotificationItem[] {
  const items: NotificationItem[] = [];
  const now = new Date();

  // Skip clients that are already resolved (lost, won, policy_issued, lapsed)
  const RESOLVED_STAGES = ["lost", "policy_issued", "closed"];
  const RESOLVED_STATUSES = ["won", "lost", "lapsed", "cancelled"];

  clients.forEach(c => {
    const stage = (c.pipeline_stage || "").toLowerCase();
    const status = (c.lead_status || "").toLowerCase();

    // Skip resolved clients entirely — no notifications for them
    if (RESOLVED_STAGES.includes(stage) || RESOLVED_STATUSES.includes(status)) return;

    // Skip clients moved out of overdue (moved to pipeline, removed, or retargeted)
    if (["removed", "moved_to_pipeline"].includes(c.overdue_reason || "")) return;
    if (c.retarget_status === "scheduled") return;

    // Renewal coming
    if (c.policy_expiry_date) {
      const days = differenceInDays(new Date(c.policy_expiry_date), now);
      if (days >= 0 && days <= 30) {
        items.push({
          id: `renewal-${c.id}`,
          type: days <= 7 ? "urgent" : "renewal",
          title: `${c.customer_name || "Client"} — ${days}d to renewal`,
          subtitle: c.vehicle_number || c.phone,
          daysLeft: days,
        });
      }
      if (days < 0 && days >= -15) {
        items.push({
          id: `overdue-renewal-${c.id}`,
          type: "overdue",
          title: `${c.customer_name || "Client"} — expired ${Math.abs(days)}d ago`,
          subtitle: c.vehicle_number || c.phone,
          daysLeft: days,
        });
      }
    }

    // Follow-up due — skip if call_status is already "completed" or "done"
    if (c.follow_up_date) {
      const callDone = ["completed", "done", "successful"].includes((c.call_status || "").toLowerCase());
      if (!callDone) {
        const fuDate = new Date(c.follow_up_date);
        const hours = differenceInHours(fuDate, now);
        if (hours <= 24 && hours >= -48) {
          items.push({
            id: `followup-${c.id}`,
            type: hours < 0 ? "overdue" : "followup",
            title: `${c.customer_name || "Client"} — follow-up ${hours < 0 ? "overdue" : "today"}`,
            subtitle: c.follow_up_time ? `at ${c.follow_up_time}` : c.phone,
          });
        }
      }
    }
  });

  // Sort: overdue first, then urgent, then by daysLeft
  return items.sort((a, b) => {
    const priority = { overdue: 0, urgent: 1, followup: 2, renewal: 3 };
    return priority[a.type] - priority[b.type];
  });
}

// Helper to build notification items from loan applications
export function buildLoanNotifications(apps: any[]): NotificationItem[] {
  const items: NotificationItem[] = [];
  const now = new Date();

  apps.forEach(a => {
    // Stale leads (no activity in 2+ days)
    if (a.last_activity_at) {
      const hours = differenceInHours(now, new Date(a.last_activity_at));
      if (hours > 48 && !["disbursed", "lost"].includes(a.stage)) {
        items.push({
          id: `stale-${a.id}`,
          type: "followup",
          title: `${a.customer_name || "Lead"} — no activity ${Math.floor(hours / 24)}d`,
          subtitle: a.phone,
        });
      }
    }

    // Hot priority not contacted
    if (a.priority === "hot" && a.stage === "new_lead") {
      items.push({
        id: `hot-${a.id}`,
        type: "urgent",
        title: `🔥 Hot lead: ${a.customer_name || "Lead"}`,
        subtitle: `${a.source || "Unknown source"} • ${a.phone}`,
      });
    }

    // Loan application pending > 3 days
    if (a.stage === "loan_application" && a.stage_updated_at) {
      const days = differenceInDays(now, new Date(a.stage_updated_at));
      if (days > 3) {
        items.push({
          id: `pending-app-${a.id}`,
          type: "renewal",
          title: `${a.customer_name} — app pending ${days}d`,
          subtitle: a.lender_name || a.phone,
        });
      }
    }
  });

  return items.sort((a, b) => {
    const priority = { overdue: 0, urgent: 1, followup: 2, renewal: 3 };
    return priority[a.type] - priority[b.type];
  });
}
