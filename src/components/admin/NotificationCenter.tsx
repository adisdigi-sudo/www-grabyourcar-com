import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  CheckCheck, 
  Trash2,
  Flame,
  UserPlus,
  CreditCard,
  Car,
  Package,
  Phone,
  AlertTriangle,
  Volume2,
  VolumeX
} from "lucide-react";
import { useAdminNotifications, Notification } from "@/hooks/useAdminNotifications";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'hot_lead':
      return <Flame className="h-4 w-4 text-orange-500" />;
    case 'new_lead':
      return <UserPlus className="h-4 w-4 text-blue-500" />;
    case 'pending_order':
      return <Package className="h-4 w-4 text-yellow-500" />;
    case 'payment_received':
      return <CreditCard className="h-4 w-4 text-green-500" />;
    case 'booking_confirmed':
      return <Car className="h-4 w-4 text-purple-500" />;
    case 'urgent_followup':
      return <Phone className="h-4 w-4 text-blue-500 animate-pulse" />;
    case 'overdue_followup':
      return <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getNotificationBg = (type: Notification['type'], read: boolean) => {
  if (read) return 'bg-background';
  
  switch (type) {
    case 'hot_lead':
      return 'bg-orange-50 dark:bg-orange-950/20';
    case 'new_lead':
      return 'bg-blue-50 dark:bg-blue-950/20';
    case 'payment_received':
      return 'bg-green-50 dark:bg-green-950/20';
    case 'urgent_followup':
      return 'bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500';
    case 'overdue_followup':
      return 'bg-red-50 dark:bg-red-950/30 border-l-2 border-red-500';
    default:
      return 'bg-muted/50';
  }
};

const getPriorityIndicator = (priority?: 'high' | 'medium' | 'low') => {
  if (!priority || priority === 'low') return null;
  
  if (priority === 'high') {
    return (
      <span className="absolute -top-1 -left-1 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
      </span>
    );
  }
  
  return null;
};

export const NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
    soundEnabled,
    toggleSound,
  } = useAdminNotifications();

  const urgentCount = notifications.filter(
    n => !n.read && (n.type === 'hot_lead' || n.type === 'urgent_followup' || n.type === 'overdue_followup')
  ).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={cn("h-5 w-5", urgentCount > 0 && "animate-bounce")} />
          {unreadCount > 0 && (
            <Badge 
              variant={urgentCount > 0 ? "destructive" : "default"}
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs",
                urgentCount > 0 && "animate-pulse"
              )}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={toggleSound}
              title={soundEnabled ? "Mute notifications" : "Enable sound"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-primary" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={clearNotifications}
                title="Clear all"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {urgentCount > 0 && (
          <div className="bg-destructive/10 px-4 py-2 text-sm text-destructive flex items-center gap-2 border-b">
            <AlertTriangle className="h-4 w-4" />
            <span>{urgentCount} urgent notification{urgentCount > 1 ? 's' : ''} require attention</span>
          </div>
        )}

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">You'll see alerts here when they happen</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 cursor-pointer transition-colors hover:bg-muted/50 relative",
                    getNotificationBg(notification.type, notification.read)
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  {getPriorityIndicator(notification.priority)}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
