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
      // Urgent: Higher pitched, double beep
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(0, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else {
      // Normal: Single soft tone
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

export const useAdminNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('admin-notification-sound');
    return stored !== 'false';
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

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount(prev => prev + 1);

    // Play sound for urgent notifications
    if (soundEnabled) {
      if (notification.type === 'hot_lead' || notification.type === 'urgent_followup' || notification.type === 'overdue_followup') {
        playNotificationSound('urgent');
      } else {
        playNotificationSound('normal');
      }
    }

    // Show toast for important notifications
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'hot_lead' || notification.type === 'urgent_followup' || notification.type === 'overdue_followup' ? 'destructive' : 'default',
    });
  }, [toast, soundEnabled]);

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
      
      // Check for overdue follow-ups (past due)
      const { data: overdueLeads, error: overdueError } = await supabase
        .from('leads')
        .select('id, customer_name, car_brand, car_model, next_follow_up_at, phone')
        .lt('next_follow_up_at', now.toISOString())
        .not('status', 'in', '("converted","lost")')
        .order('next_follow_up_at', { ascending: true })
        .limit(5);

      if (!overdueError && overdueLeads && overdueLeads.length > 0) {
        // Only notify for the most urgent one to avoid spam
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

      // Check for upcoming follow-ups (within next hour)
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

    // Initial check for urgent follow-ups
    checkUrgentFollowups();

    // Check every 15 minutes for follow-ups
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
          addNotification({
            type: lead.status === 'hot' ? 'hot_lead' : 'new_lead',
            title: lead.status === 'hot' ? '🔥 Hot Lead!' : 'New Lead',
            message: `${lead.customer_name} - ${lead.car_brand || 'General'} ${lead.car_model || 'Inquiry'}`,
            data: lead,
            priority: lead.status === 'hot' ? 'high' : 'medium',
          });
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
          
          // Notify if status changed to hot
          if (lead.status === 'hot' && oldLead.status !== 'hot') {
            addNotification({
              type: 'hot_lead',
              title: '🔥 Lead Upgraded to Hot!',
              message: `${lead.customer_name} is now a hot lead`,
              data: lead,
              priority: 'high',
            });
          }
          
          // Notify if follow-up was scheduled within the next hour
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

    // Subscribe to HSRP bookings
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
            addNotification({
              type: 'payment_received',
              title: '💰 Payment Received!',
              message: `₹${booking.payment_amount?.toLocaleString()} - ${booking.owner_name}`,
              data: booking,
              priority: 'high',
            });
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
  }, [isAdmin, addNotification, checkUrgentFollowups]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    soundEnabled,
    toggleSound,
  };
};
