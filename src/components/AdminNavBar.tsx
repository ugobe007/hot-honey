import { Link, useNavigate, useLocation } from 'react-router-dom';

interface AdminNavBarProps {
  currentPage?: string;
}

export default function AdminNavBar({ currentPage }: AdminNavBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine current page from props or URL
  const activePage = currentPage || location.pathname;

  // Nav items with hamburger colors (orange/yellow, red/orange, teal/cyan)
  const navItems = [
    { path: '/', label: '🏠 Home', color: 'orange' },
    { path: '/admin/dashboard', label: '📊 Workflow', color: 'red' },
    { path: '/admin/operations', label: '🎛️ Operations', color: 'teal' },
    { path: '/admin/discovered-startups', label: '🔍 Discovered', color: 'orange' },
    { path: '/admin/edit-startups', label: '✏️ Edit Startups', color: 'red' },
    { path: '/admin/discovered-investors', label: '👥 Investors', color: 'teal' },
    { path: '/bulkupload', label: '📤 Upload', color: 'orange' },
    { path: '/vote', label: '⚡ Match', color: 'red', highlight: true },
  ];

  const getColorClasses = (color: string, isActive: boolean, highlight?: boolean) => {
    if (isActive) {
      // Active state - bright and bold
      switch (color) {
        case 'orange':
          return 'bg-gradient-to-r from-orange-500/30 to-yellow-500/30 text-orange-300 border-orange-400/60 font-bold';
        case 'red':
          return 'bg-gradient-to-r from-red-500/30 to-orange-500/30 text-red-300 border-red-400/60 font-bold';
        case 'teal':
          return 'bg-gradient-to-r from-teal-500/30 to-cyan-500/30 text-teal-300 border-teal-400/60 font-bold';
        default:
          return 'bg-white/20 text-white border-white/40 font-bold';
      }
    }
    
    if (highlight) {
      // Always highlighted (like Match button)
      return 'bg-gradient-to-r from-red-500/20 to-orange-500/20 text-orange-300 border-orange-400/40 hover:from-red-500/40 hover:to-orange-500/40 font-bold';
    }
    
    // Normal state with subtle color hint
    switch (color) {
      case 'orange':
        return 'text-orange-200/70 hover:text-orange-200 hover:bg-orange-500/20 border-transparent hover:border-orange-400/30';
      case 'red':
        return 'text-red-200/70 hover:text-red-200 hover:bg-red-500/20 border-transparent hover:border-red-400/30';
      case 'teal':
        return 'text-teal-200/70 hover:text-teal-200 hover:bg-teal-500/20 border-transparent hover:border-teal-400/30';
      default:
        return 'text-gray-300 hover:text-white hover:bg-white/10 border-transparent';
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return activePage === '/';
    return activePage.startsWith(path);
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/50 via-indigo-900/50 to-purple-900/50 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          <button 
            onClick={() => navigate(-1)} 
            className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1 text-sm"
          >
            ← Back
          </button>
          
          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item, index) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${getColorClasses(item.color, isActive(item.path), item.highlight)}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:scale-105 transition-transform">
            <img 
              src="/images/hot_match_logo.png" 
              alt="HotMatch" 
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
