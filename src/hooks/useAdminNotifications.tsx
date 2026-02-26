import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "./useAdminAuth";

export interface Notification {
  id: string;
  type: 'hot_lead' | 'new_lead' | 'pending_order' | 'payment_received' | 'booking_confirmed' | 'urgent_followup' | 'overdue_followup';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
  priority?: 'high' | 'medium' | 'low';
}

// Sound notification utility
const playNotificationSound = (type: 'urgent' | 'normal' = 'normal') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'urgent') {
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(0, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else {
      oscillator.frequency.setValueAtTime(520, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  } catch (error) {
    console.log('Audio notification not supported');
  }
};

// Send email alert for critical notifications
const sendEmailAlert = async (
  type: 'hot_lead' | 'large_payment' | 'overdue_followup' | 'urgent_followup',
  title: string,
  message: string,
  data?: any
) => {
  try {
    await supabase.functions.invoke('send-alert-email', {
      body: { type, title, message, data }
    });
    console.log('Email alert sent for:', type);
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
};

// Large payment threshold (₹50,000)
const LARGE_PAYMENT_THRESHOLD = 50000;

export const useAdminNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('admin-notification-sound');
    return stored !== 'false';
  });
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(() => {
    const stored = localStorage.getItem('admin-email-alerts');
    return stored === 'true';
  });
  const { toast } = useToast();
  const { isAdmin } = useAdminAuth();
  const followupCheckRef = useRef<NodeJS.Timeout | null>(null);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('admin-notification-sound', String(newValue));
      return newValue;
    });
  }, []);

  const toggleEmailAlerts = useCallback(() => {
    setEmailAlertsEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('admin-email-alerts', String(newValue));
      return newValue;
    });
  }, []);

  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>,
    sendEmail = false
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);

    // Play sound for urgent notifications
    if (soundEnabled) {
      if (notification.type === 'hot_lead' || notification.type === 'urgent_followup' || notification.type === 'overdue_followup') {
        playNotificationSound('urgent');
      } else {
        playNotificationSound('normal');
      }
    }

    // Send email alert for critical notifications if enabled
    if (sendEmail && emailAlertsEnabled) {
      if (notification.type === 'hot_lead') {
        sendEmailAlert('hot_lead', notification.title, notification.message, notification.data);
      }
    }

    // Show toast
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'hot_lead' || notification.type === 'urgent_followup' || notification.type === 'overdue_followup' ? 'destructive' : 'default',
    });
  }, [toast, soundEnabled, emailAlertsEnabled]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Check for urgent follow-ups periodically
  const checkUrgentFollowups = useCallback(async () => {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      const { data: overdueLeads, error: overdueError } = await supabase
        .from('leads')
        .select('id, customer_name, car_brand, car_model, next_follow_up_at, phone')
        .lt('next_follow_up_at', now.toISOString())
        .not('status', 'in', '("converted","lost")')
        .order('next_follow_up_at', { ascending: true })
        .limit(5);

      if (!overdueError && overdueLeads && overdueLeads.length > 0) {
        const mostUrgent = overdueLeads[0];
        const followupTime = new Date(mostUrgent.next_follow_up_at!);
        const hoursOverdue = Math.round((now.getTime() - followupTime.getTime()) / (1000 * 60 * 60));
        
        addNotification({
          type: 'overdue_followup',
          title: `⚠️ Overdue Follow-up (${hoursOverdue}h)`,
          message: `${mostUrgent.customer_name} - ${mostUrgent.car_brand || ''} ${mostUrgent.car_model || 'Inquiry'}`,
          data: mostUrgent,
          priority: 'high',
        });
      }

      const { data: upcomingLeads, error: upcomingError } = await supabase
        .from('leads')
        .select('id, customer_name, car_brand, car_model, next_follow_up_at, phone')
        .gte('next_follow_up_at', now.toISOString())
        .lte('next_follow_up_at', oneHourFromNow.toISOString())
        .not('status', 'in', '("converted","lost")')
        .order('next_follow_up_at', { ascending: true })
        .limit(3);

      if (!upcomingError && upcomingLeads && upcomingLeads.length > 0) {
        upcomingLeads.forEach(lead => {
          const followupTime = new Date(lead.next_follow_up_at!);
          const minutesUntil = Math.round((followupTime.getTime() - now.getTime()) / (1000 * 60));
          
          addNotification({
            type: 'urgent_followup',
            title: `📞 Follow-up in ${minutesUntil} min`,
            message: `${lead.customer_name} - ${lead.car_brand || ''} ${lead.car_model || 'Inquiry'}`,
            data: lead,
            priority: 'medium',
          });
        });
      }
    } catch (error) {
      console.error('Error checking follow-ups:', error);
    }
  }, [addNotification]);

  useEffect(() => {
    if (!isAdmin()) return;

    checkUrgentFollowups();
    followupCheckRef.current = setInterval(checkUrgentFollowups, 15 * 60 * 1000);

    // Subscribe to leads changes
    const leadsChannel = supabase
      .channel('admin-leads-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const lead = payload.new as any;
          const isHot = lead.status === 'hot';
          addNotification({
            type: isHot ? 'hot_lead' : 'new_lead',
            title: isHot ? '🔥 Hot Lead!' : 'New Lead',
            message: `${lead.customer_name} - ${lead.car_brand || 'General'} ${lead.car_model || 'Inquiry'}`,
            data: lead,
            priority: isHot ? 'high' : 'medium',
          }, isHot); // Send email for hot leads
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const lead = payload.new as any;
          const oldLead = payload.old as any;
          
          if (lead.status === 'hot' && oldLead.status !== 'hot') {
            addNotification({
              type: 'hot_lead',
              title: '🔥 Lead Upgraded to Hot!',
              message: `${lead.customer_name} is now a hot lead`,
              data: lead,
              priority: 'high',
            }, true); // Send email
          }
          
          if (lead.next_follow_up_at && lead.next_follow_up_at !== oldLead.next_follow_up_at) {
            const followupTime = new Date(lead.next_follow_up_at);
            const now = new Date();
            const minutesUntil = (followupTime.getTime() - now.getTime()) / (1000 * 60);
            
            if (minutesUntil > 0 && minutesUntil <= 60) {
              addNotification({
                type: 'urgent_followup',
                title: `📞 Follow-up scheduled in ${Math.round(minutesUntil)} min`,
                message: `${lead.customer_name} - Remember to call!`,
                data: lead,
                priority: 'medium',
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to HSRP bookings for large payments
    const hsrpChannel = supabase
      .channel('admin-hsrp-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'hsrp_bookings',
        },
        (payload) => {
          const booking = payload.new as any;
          addNotification({
            type: 'pending_order',
            title: '📋 New HSRP Booking',
            message: `${booking.owner_name} - ${booking.registration_number}`,
            data: booking,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hsrp_bookings',
        },
        (payload) => {
          const booking = payload.new as any;
          const oldBooking = payload.old as any;
          
          if (booking.payment_status === 'paid' && oldBooking.payment_status !== 'paid') {
            const isLargePayment = booking.payment_amount >= LARGE_PAYMENT_THRESHOLD;
            
            addNotification({
              type: 'payment_received',
              title: isLargePayment ? '💰 Large Payment Received!' : '💰 Payment Received!',
              message: `₹${booking.payment_amount?.toLocaleString()} - ${booking.owner_name}`,
              data: booking,
              priority: isLargePayment ? 'high' : 'medium',
            });

            // Send email for large payments
            if (isLargePayment && emailAlertsEnabled) {
              sendEmailAlert('large_payment', 'Large Payment Received!', 
                `₹${booking.payment_amount?.toLocaleString()} received from ${booking.owner_name}`, booking);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to rental bookings
    const rentalChannel = supabase
      .channel('admin-rental-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rental_bookings',
        },
        (payload) => {
          const booking = payload.new as any;
          addNotification({
            type: 'booking_confirmed',
            title: '🚗 New Rental Booking',
            message: `${booking.vehicle_name} - ${booking.pickup_date}`,
            data: booking,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(hsrpChannel);
      supabase.removeChannel(rentalChannel);
      if (followupCheckRef.current) {
        clearInterval(followupCheckRef.current);
      }
    };
  }, [isAdmin, addNotification, checkUrgentFollowups, emailAlertsEnabled]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    soundEnabled,
    toggleSound,
    emailAlertsEnabled,
    toggleEmailAlerts,
  };
};
