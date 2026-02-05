import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "./useAdminAuth";

export interface Notification {
  id: string;
  type: 'hot_lead' | 'new_lead' | 'pending_order' | 'payment_received' | 'booking_confirmed';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

export const useAdminNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const { isAdmin } = useAdminAuth();

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount(prev => prev + 1);

    // Show toast for important notifications
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'hot_lead' ? 'destructive' : 'default',
    });
  }, [toast]);

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

  useEffect(() => {
    if (!isAdmin()) return;

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
          
          // Only notify if status changed to hot
          if (lead.status === 'hot' && oldLead.status !== 'hot') {
            addNotification({
              type: 'hot_lead',
              title: '🔥 Lead Upgraded to Hot!',
              message: `${lead.customer_name} is now a hot lead`,
              data: lead,
            });
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
    };
  }, [isAdmin, addNotification]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
};
