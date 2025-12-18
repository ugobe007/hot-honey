import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Rss, 
  Upload, 
  Users, 
  Building2,
  Activity,
  Settings,
  FileText,
  Database,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const navItems = [
  { 
    section: 'Main',
    items: [
      { path: '/admin/control', label: 'Control Center', icon: LayoutDashboard },
      { path: '/admin/review', label: 'AI Review Queue', icon: ClipboardCheck, badge: 'pending' },
    ]
  },
  {
    section: 'Discovery',
    items: [
      { path: '/admin/rss-manager', label: 'RSS Sources', icon: Rss },
      { path: '/admin/discovered-startups', label: 'Discovered Startups', icon: Building2 },
      { path: '/admin/discovered-investors', label: 'Discovered Investors', icon: Users },
    ]
  },
  {
    section: 'Data Management',
    items: [
      { path: '/admin/bulk-upload', label: 'Bulk Upload', icon: Upload },
      { path: '/admin/god-scores', label: 'GOD Scores', icon: Sparkles },
      { path: '/admin/investor-enrichment', label: 'Investor Enrichment', icon: Users },
    ]
  },
  {
    section: 'Technical',
    items: [
      { path: '/admin/ai-logs', label: 'AI Logs', icon: FileText },
      { path: '/admin/diagnostic', label: 'Diagnostics', icon: Activity },
      { path: '/admin/database-check', label: 'Database Check', icon: Database },
    ]
  },
];

export function AdminSidebar({ collapsed = false, onToggle }: AdminSidebarProps) {
  const location = useLocation();
  const [pendingCount, setPendingCount] = React.useState<number>(0);

  // Fetch pending count for badge
  React.useEffect(() => {
    const fetchPending = async () => {
      try {
        const { count } = await supabase
          .from('startup_uploads')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingCount(count || 0);
      } catch (e) {
        // Ignore errors
      }
    };
    fetchPending();
  }, []);

  return (
    <aside 
      className={`bg-gray-900 text-white transition-all duration-300 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-xl">🍯</span>
            <span className="font-bold text-amber-400">Admin</span>
          </div>
        )}
        <button 
          onClick={onToggle}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((section) => (
          <div key={section.section} className="mb-6">
            {!collapsed && (
              <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.section}
              </div>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                const showBadge = item.badge === 'pending' && pendingCount > 0;
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-amber-500/20 text-amber-400 border-l-2 border-amber-400' 
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={20} className="flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {showBadge && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {pendingCount}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && showBadge && (
                        <span className="absolute right-1 top-1 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <Link
          to="/"
          className={`flex items-center gap-3 text-gray-400 hover:text-white transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Settings size={18} />
          {!collapsed && <span className="text-sm">Back to App</span>}
        </Link>
      </div>
    </aside>
  );
}

export default AdminSidebar;
