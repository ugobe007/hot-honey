import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Home, Zap, Vote as VoteIcon, Briefcase, TrendingUp, FileText, BookOpen, Settings, Crown, Activity, Search, Users, Upload, BarChart3, Shield, Sliders } from 'lucide-react';
import FlameIcon from './FlameIcon';

export default function LogoDropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = () => {
      const currentUser = localStorage.getItem('currentUser');
      const userProfile = localStorage.getItem('userProfile');
      
      if (currentUser) {
        const user = JSON.parse(currentUser);
        setIsAdmin(user.isAdmin || false);
      } else if (userProfile) {
        const profile = JSON.parse(userProfile);
        setIsAdmin(profile.isAdmin || false);
      }
    };
    
    checkAdmin();
    window.addEventListener('storage', checkAdmin);
    return () => window.removeEventListener('storage', checkAdmin);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div ref={menuRef} className="fixed top-6 left-6 z-50">
      {/* 1970s Colored Hamburger Menu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:scale-105"
        aria-label="Menu"
      >
        <div className="flex flex-col gap-1.5 w-7">
          <div className="h-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-400" />
          <div className="h-1 rounded-full bg-gradient-to-r from-yellow-400 to-lime-400" />
          <div className="h-1 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400" />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm -z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute top-full left-0 mt-2 w-72 bg-gradient-to-b from-[#1a0033] via-[#2d1b4e] to-[#1a0033] rounded-2xl shadow-2xl border-2 border-purple-500/30 overflow-hidden animate-fadeIn">
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-purple-500/30">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                  <span className="text-xl">🔥</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold bg-gradient-to-r from-orange-400 via-red-500 to-yellow-400 bg-clip-text text-transparent">
                    Hot Match
                  </h2>
                  <p className="text-xs text-purple-300">AI-Powered Matching</p>
                </div>
              </div>

              <nav className="flex flex-col gap-1.5">
                {/* Main Navigation - Darker orange with dark text for readability */}
                <Link
                  to="/"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all font-bold flex items-center gap-3 border border-orange-600/50 shadow-md"
                >
                  <Home className="w-4 h-4 text-orange-900" />
                  <span className="text-orange-950">Home</span>
                </Link>
                
                <Link
                  to="/match"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 transition-all font-bold flex items-center gap-3 border border-orange-700/50 shadow-md"
                >
                  <Zap className="w-4 h-4 text-orange-950" />
                  <span className="text-orange-950">AI Matching</span>
                </Link>
                
                <Link
                  to="/vote"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 transition-all font-bold flex items-center gap-3 border border-amber-600/50 shadow-md"
                >
                  <VoteIcon className="w-4 h-4 text-amber-900" />
                  <span className="text-amber-950">Vote</span>
                </Link>
                
                <Link
                  to="/investors"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all font-bold flex items-center gap-3 border border-orange-600/50 shadow-md"
                >
                  <Briefcase className="w-4 h-4 text-orange-900" />
                  <span className="text-orange-950">Investors</span>
                </Link>
                
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 transition-all font-bold flex items-center gap-3 border border-orange-700/50 shadow-md"
                >
                  <FlameIcon variant={8} size="sm" />
                  <span className="text-orange-950">Startups</span>
                </Link>
                
                <Link
                  to="/trending"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all font-bold flex items-center gap-3 border border-red-600/50 shadow-md"
                >
                  <TrendingUp className="w-4 h-4 text-red-950" />
                  <span className="text-red-950">🔥 Trending</span>
                </Link>
                
                <Link
                  to="/strategies"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-all font-bold flex items-center gap-3 border border-purple-600/50 shadow-md"
                >
                  <BookOpen className="w-4 h-4 text-purple-100" />
                  <span className="text-white">📚 Playbook</span>
                </Link>
                
                <Link
                  to="/submit"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 transition-all font-bold flex items-center gap-3 border border-amber-600/50 shadow-md"
                >
                  <FileText className="w-4 h-4 text-amber-900" />
                  <span className="text-amber-950">Submit Startup</span>
                </Link>
                
                {/* Divider */}
                <div className="my-2 border-t border-purple-500/30"></div>
                
                {/* Secondary */}
                <Link
                  to="/about"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-white transition-all font-medium flex items-center gap-3 border border-white/10 hover:border-white/30"
                >
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">About</span>
                </Link>
                
                <Link
                  to="/settings"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-white transition-all font-medium flex items-center gap-3 border border-white/10 hover:border-white/30"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Settings</span>
                </Link>

                {/* Admin Section */}
                <div className="my-2 border-t border-purple-500/30"></div>
                <p className="text-xs text-purple-400 px-2 mb-1 font-semibold">ADMIN</p>
                
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 transition-all font-bold flex items-center gap-3 border border-purple-700/50 shadow-md"
                >
                  <Shield className="w-4 h-4 text-purple-100" />
                  <span className="text-white">Admin Panel</span>
                </Link>
                
                <Link
                  to="/admin/control"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all font-bold flex items-center gap-3 border border-indigo-700/50 shadow-md"
                >
                  <Sliders className="w-4 h-4 text-indigo-100" />
                  <span className="text-white">Control Center</span>
                </Link>
                
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all font-semibold flex items-center gap-3 border border-orange-600/50 shadow-md"
                >
                  <BarChart3 className="w-4 h-4 text-orange-900" />
                  <span className="text-orange-950">Workflow</span>
                </Link>
                
                <Link
                  to="/admin/operations"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 transition-all font-semibold flex items-center gap-3 border border-orange-700/50 shadow-md"
                >
                  <Activity className="w-4 h-4 text-orange-950" />
                  <span className="text-orange-950">Operations</span>
                </Link>
                
                <Link
                  to="/admin/discovered-startups"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 transition-all font-semibold flex items-center gap-3 border border-amber-600/50 shadow-md"
                >
                  <Search className="w-4 h-4 text-amber-900" />
                  <span className="text-amber-950">Discovered</span>
                </Link>
                
                <Link
                  to="/admin/edit-startups"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all font-semibold flex items-center gap-3 border border-orange-600/50 shadow-md"
                >
                  <FileText className="w-4 h-4 text-orange-900" />
                  <span className="text-orange-950">Edit Startups</span>
                </Link>
                
                <Link
                  to="/admin/discovered-investors"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 transition-all font-semibold flex items-center gap-3 border border-orange-700/50 shadow-md"
                >
                  <Users className="w-4 h-4 text-orange-950" />
                  <span className="text-orange-950">Investors</span>
                </Link>
                
                <Link
                  to="/bulkupload"
                  onClick={() => setIsOpen(false)}
                  className="group px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 transition-all font-semibold flex items-center gap-3 border border-amber-600/50 shadow-md"
                >
                  <Upload className="w-4 h-4 text-amber-900" />
                  <span className="text-amber-950">Bulk Upload</span>
                </Link>
              </nav>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-purple-500/30">
                <div className="text-center">
                  <p className="text-xs text-purple-300/60">Powered by AI</p>
                  <p className="text-xs text-purple-400/80 font-semibold mt-1">GOD Algorithm™</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
