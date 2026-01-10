/**
 * AdminNavBar - Standardized navigation bar for all admin panels
 * Provides consistent global site links across all admin pages
 */

import { Link, useLocation } from 'react-router-dom';
import { Home, Settings, BarChart3, Activity, ArrowLeft, Radio, TrendingUp, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminNavBarProps {
  showBack?: boolean;
  currentPage?: string;
}

export default function AdminNavBar({ showBack = true, currentPage }: AdminNavBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active page from URL
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-b border-white/10 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-2 text-sm">
        {showBack && (
          <>
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-gray-600">|</span>
          </>
        )}
        <Link 
          to="/" 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <span className="text-gray-600">|</span>
        <Link 
          to="/admin" 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            isActive('/admin') && !location.pathname.includes('/admin/') 
              ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 font-semibold' 
              : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <span className="text-gray-600">|</span>
        <Link 
          to="/admin/control" 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            isActive('/admin/control') 
              ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold' 
              : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Control Center</span>
        </Link>
        <span className="text-gray-600">|</span>
        <Link 
          to="/admin/pipeline" 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            isActive('/admin/pipeline') 
              ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold' 
              : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Pipeline</span>
        </Link>
        <span className="text-gray-600">|</span>
        <Link 
          to="/admin/analytics" 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            isActive('/admin/analytics') 
              ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-semibold' 
              : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </Link>
        <span className="text-gray-600">|</span>
        <Link 
          to="/admin/health" 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            isActive('/admin/health') 
              ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 font-semibold' 
              : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Health</span>
        </Link>
        <span className="text-gray-600">|</span>
        <Link 
          to="/admin/forecasts" 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            isActive('/admin/forecasts') 
              ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-semibold' 
              : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Forecasts</span>
        </Link>
        <span className="text-gray-600">|</span>
        <Link 
          to="/admin/benchmarks" 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            isActive('/admin/benchmarks') 
              ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-semibold' 
              : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Benchmarks</span>
        </Link>
        <span className="text-gray-600">|</span>
        <Link 
          to="/admin/matching-engine" 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            isActive('/admin/matching-engine') 
              ? 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 font-semibold' 
              : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Matching Engine</span>
        </Link>
        <span className="text-gray-600">|</span>
        <Link 
          to="/admin/god-scores" 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            isActive('/admin/god-scores') 
              ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 font-semibold' 
              : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>GOD Scores</span>
        </Link>
        {currentPage && (
          <>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500 text-xs px-2">{currentPage}</span>
          </>
        )}
      </div>
    </nav>
  );
}




