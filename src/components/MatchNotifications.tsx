/**
 * MATCH NOTIFICATIONS COMPONENT
 * =============================
 * Bell icon with dropdown showing match notifications/alerts
 * Color scheme: Light blue to violet
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  X,
  Sparkles,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  ChevronRight,
  Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  type: 'new_match' | 'high_score_match' | 'intro_accepted' | 'investor_viewed' | 'weekly_digest';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
  data?: any;
}

interface MatchNotificationsProps {
  className?: string;
}

export default function MatchNotifications({ className = '' }: MatchNotificationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load notifications
  useEffect(() => {
    loadNotifications();
    
    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications' 
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Demo notifications for non-logged-in users
        setNotifications(getDemoNotifications());
        setUnreadCount(2);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          createdAt: n.created_at,
          read: n.read,
          link: n.link,
          data: n.data
        })));
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setNotifications(getDemoNotifications());
      setUnreadCount(2);
    }
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_match': return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'high_score_match': return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'intro_accepted': return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case 'investor_viewed': return <Users className="w-4 h-4 text-violet-400" />;
      case 'weekly_digest': return <Clock className="w-4 h-4 text-blue-400" />;
      default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-700">
            <h3 className="font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button className="p-1 hover:bg-slate-800 rounded transition-colors">
                <Settings className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-slate-800/30' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.link) {
                      window.location.href = notification.link;
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${notification.read ? 'text-slate-300' : 'text-white'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <Link
              to="/notifications"
              className="block p-3 text-center text-sm text-cyan-400 hover:bg-slate-800 transition-colors border-t border-slate-700"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
              <ChevronRight className="w-4 h-4 inline ml-1" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// Demo notifications for non-logged-in users
function getDemoNotifications(): Notification[] {
  const now = new Date();
  return [
    {
      id: '1',
      type: 'high_score_match',
      title: '🔥 High-Score Match!',
      message: 'You have a 92% match with Sequoia Capital for your AI startup.',
      createdAt: new Date(now.getTime() - 30 * 60000).toISOString(),
      read: false,
      link: '/matches'
    },
    {
      id: '2',
      type: 'new_match',
      title: 'New investor matches',
      message: '5 new investors match your startup profile. Check them out!',
      createdAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      read: false,
      link: '/matches'
    },
    {
      id: '3',
      type: 'weekly_digest',
      title: 'Weekly Match Digest',
      message: 'Your startup had 23 new matches this week with an average score of 67%.',
      createdAt: new Date(now.getTime() - 24 * 3600000).toISOString(),
      read: true,
      link: '/analytics'
    },
    {
      id: '4',
      type: 'investor_viewed',
      title: 'Investor viewed your profile',
      message: 'A partner from Andreessen Horowitz viewed your startup profile.',
      createdAt: new Date(now.getTime() - 48 * 3600000).toISOString(),
      read: true
    }
  ];
}


