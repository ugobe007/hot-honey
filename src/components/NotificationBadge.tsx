/**
 * NOTIFICATION BADGE COMPONENT
 * ============================
 * Shows unread notification count in nav
 * Uses lightweight useUnreadCount hook
 */

import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUnreadCount } from '../hooks/useNotifications';
import { useAuth } from '../contexts/AuthContext';

interface NotificationBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export function NotificationBadge({ className = '', showLabel = false }: NotificationBadgeProps) {
  const { user } = useAuth();
  const { count, isLoading } = useUnreadCount();

  // Don't show if not logged in
  if (!user) return null;

  return (
    <Link
      to="/notifications"
      data-tour-id="notifications-bell"
      className={`
        relative inline-flex items-center gap-2 p-2 rounded-lg
        text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors
        ${className}
      `}
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
    >
      <Bell className="w-5 h-5" />
      {showLabel && <span className="text-sm">Notifications</span>}
      
      {/* Badge */}
      {!isLoading && count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

/**
 * Inline variant for menus
 */
export function NotificationMenuItem({ onClick }: { onClick?: () => void }) {
  const { user } = useAuth();
  const { count, isLoading } = useUnreadCount();

  if (!user) return null;

  return (
    <Link
      to="/notifications"
      onClick={onClick}
      className="flex items-center justify-between w-full px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
    >
      <span className="flex items-center gap-2">
        <Bell className="w-4 h-4" />
        Notifications
      </span>
      {!isLoading && count > 0 && (
        <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

export default NotificationBadge;
