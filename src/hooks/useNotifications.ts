/**
 * NOTIFICATIONS HOOK
 * ==================
 * Manages user notifications (alerts)
 * - Fetch notifications via API
 * - Mark as read (single or all)
 * - Real-time unread count badge
 * 
 * Updated for Prompt 13 alerts system
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export type NotificationKind = 'startup_hot' | 'momentum_spike' | 'system' | 'promo' | 'stage_advance' | 'deal_close';

export interface Notification {
  id: string;
  kind: NotificationKind;
  entity_type: string;
  entity_id: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  // Legacy fields for backwards compatibility
  user_id?: string;
  startup_id?: string;
  startup_name?: string;
  startup_logo?: string;
  notification_type?: string;
  message?: string;
  read?: boolean;
}

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  alertsEnabled: boolean;
  plan: string;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:3002' : '');

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  }
  return { 'Content-Type': 'application/json' };
}

/**
 * Main notifications hook using API endpoints
 */
export function useNotifications(userIdOrLimit?: string | number): UseNotificationsResult {
  // Support both old signature (userId) and new signature (limit)
  const limit = typeof userIdOrLimit === 'number' ? userIdOrLimit : 50;
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [plan, setPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track if component is mounted to avoid state updates after unmount
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/notifications?limit=${limit}`, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - empty state
          if (isMounted.current) {
            setNotifications([]);
            setUnreadCount(0);
            setAlertsEnabled(false);
          }
          return;
        }
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      if (isMounted.current) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
        setAlertsEnabled(data.alerts_enabled || false);
        setPlan(data.plan || 'free');
      }
    } catch (err) {
      console.error('[useNotifications] Error:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setNotifications([]);
        setUnreadCount(0);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [limit]);

  useEffect(() => {
    fetchNotifications();

    // Re-fetch when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchNotifications();
    });

    // Poll for new notifications every 60 seconds (only if alerts enabled)
    const interval = setInterval(() => {
      if (alertsEnabled) {
        fetchUnreadCount();
      }
    }, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [fetchNotifications, alertsEnabled]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/notifications/count`, { headers });
      
      if (response.ok && isMounted.current) {
        const data = await response.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error('[useNotifications] Count fetch error:', err);
    }
  }, []);

  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/notifications/mark-read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id })
      });

      if (!response.ok) {
        // Revert optimistic update
        await fetchNotifications();
        throw new Error('Failed to mark as read');
      }

      return true;
    } catch (err) {
      console.error('[useNotifications] Mark read error:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
      return false;
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);

      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/notifications/mark-read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ all: true })
      });

      if (!response.ok) {
        // Revert optimistic update
        await fetchNotifications();
        throw new Error('Failed to mark all as read');
      }

      return true;
    } catch (err) {
      console.error('[useNotifications] Mark all read error:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark all as read');
      return false;
    }
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    alertsEnabled,
    plan,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
}

/**
 * Lightweight hook for just the unread count (for header badge)
 */
export function useUnreadCount(): { count: number; isLoading: boolean } {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}/api/notifications/count`, { headers });
        
        if (response.ok) {
          const data = await response.json();
          setCount(data.unread_count || 0);
        }
      } catch (err) {
        console.error('[useUnreadCount] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCount();

    // Re-fetch on auth change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchCount();
    });

    // Poll every 60 seconds
    const interval = setInterval(fetchCount, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { count, isLoading };
}
