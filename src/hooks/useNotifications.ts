import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  startup_id: string;
  startup_name?: string;
  startup_logo?: string;
  notification_type: 'stage_advance' | 'deal_close';
  message: string;
  read: boolean;
  created_at: string;
}

/**
 * Hook for managing user notifications
 * Includes real-time updates when new notifications arrive
 */
export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .rpc('mark_notification_read', { notification_id: notificationId });

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .rpc('mark_all_notifications_read', { user_id_param: userId });

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    // Subscribe to new notifications
    const notificationsSubscription = supabase
      .channel('user_notifications')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          fetchNotifications(); // Refresh list
        }
      )
      .subscribe();

    return () => {
      notificationsSubscription.unsubscribe();
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
