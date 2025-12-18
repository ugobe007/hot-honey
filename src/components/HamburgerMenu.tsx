import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Home, Zap, Vote as VoteIcon, Briefcase, Rocket, TrendingUp, FileText, BookOpen, Settings, Crown, Activity } from 'lucide-react';

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
    
    // Listen for storage changes to update admin status
    window.addEventListener('storage', checkAdmin);
    return () => window.removeEventListener('storage', checkAdmin);
  }, []);

  return (
    <>
      {/* Floating Hamburger Button - 1970s Retro Colors */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-32 left-6 z-50 p-2 transition-all hover:scale-110"
        aria-label="Menu"
      >
        {isOpen ? (
          <X size={32} className="text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="block w-7 h-1 rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 drop-shadow-[0_0_4px_rgba(251,146,60,0.5)]"></span>
            <span className="block w-7 h-1 rounded-full bg-gradient-to-r from-red-500 to-orange-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]"></span>
            <span className="block w-7 h-1 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 drop-shadow-[0_0_4px_rgba(45,212,191,0.5)]"></span>
          </div>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Drawer - Dark Theme */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-[#1a0033] via-[#2d1b4e] to-[#1a0033] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-r-2 border-purple-500/30 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 mt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🔥</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-red-500 to-yellow-400 bg-clip-text text-transparent">
                  Hot Money
                </h2>
                <p className="text-xs text-purple-300">AI-Powered Matching</p>
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {/* Main Navigation */}
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="group px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600/40 to-indigo-600/40 hover:from-purple-500/60 hover:to-indigo-500/60 text-white transition-all font-bold flex items-center gap-3 border border-purple-400/50 hover:border-purple-300 shadow-lg"
            >
              <Home className="w-5 h-5 text-purple-300" />
              <span className="text-white">Home</span>
            </Link>
            
            <Link
              to="/match"
              onClick={() => setIsOpen(false)}
              className="group px-4 py-3 rounded-xl bg-gradient-to-r from-orange-600/40 to-red-600/40 hover:from-orange-500/60 hover:to-red-500/60 text-white transition-all font-bold flex items-center gap-3 border border-orange-400/50 hover:border-orange-300 shadow-lg"
            >
              <Zap className="w-5 h-5 text-yellow-300" />
              <span className="text-white">AI Matching</span>
            </Link>
            
            <Link
              to="/saved-matches"
              onClick={() => setIsOpen(false)}
              className="group px-4 py-3 rounded-xl bg-gradient-to-r from-red-600/40 to-orange-600/40 hover:from-red-500/60 hover:to-orange-500/60 text-white transition-all font-bold flex items-center gap-3 border border-red-400/50 hover:border-red-300 shadow-lg"
            >
              <img src="/images/fire-icon.svg" alt="Hot" className="w-5 h-5" />
              <span className="text-white">Saved Matches</span>
            </Link>
            
            <Link
              to="/vote"
              onClick={() => setIsOpen(false)}
              className="group px-4 py-3 rounded-xl bg-gradient-to-r from-green-600/40 to-emerald-600/40 hover:from-green-500/60 hover:to-emerald-500/60 text-white transition-all font-bold flex items-center gap-3 border border-green-400/50 hover:border-green-300 shadow-lg"
            >
              <VoteIcon className="w-5 h-5 text-green-300" />
              <span className="text-white">Vote</span>
            </Link>
            
            <Link
              to="/investors"
              onClick={() => setIsOpen(false)}
              className="group px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600/40 to-blue-600/40 hover:from-cyan-500/60 hover:to-blue-500/60 text-white transition-all font-bold flex items-center gap-3 border border-cyan-400/50 hover:border-cyan-300 shadow-lg"
            >
              <Briefcase className="w-5 h-5 text-cyan-300" />
              <span className="text-white">Investors</span>
            </Link>
            
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="group px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600/40 to-purple-600/40 hover:from-violet-500/60 hover:to-purple-500/60 text-white transition-all font-bold flex items-center gap-3 border border-violet-400/50 hover:border-violet-300 shadow-lg"
            >
              <Rocket className="w-5 h-5 text-violet-300" />
              <span className="text-white">Startups</span>
            </Link>
            
            <Link
              to="/market-trends"
              onClick={() => setIsOpen(false)}
              className="group px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600/40 to-indigo-600/40 hover:from-blue-500/60 hover:to-indigo-500/60 text-white transition-all font-bold flex items-center gap-3 border border-blue-400/50 hover:border-blue-300 shadow-lg"
            >
              <TrendingUp className="w-5 h-5 text-blue-300" />
              <span className="text-white">Market Trends</span>
            </Link>
            
            <Link
              to="/submit"
              onClick={() => setIsOpen(false)}
              className="group px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600/40 to-orange-600/40 hover:from-amber-500/60 hover:to-orange-500/60 text-white transition-all font-bold flex items-center gap-3 border border-amber-400/50 hover:border-amber-300 shadow-lg"
            >
              <FileText className="w-5 h-5 text-amber-300" />
              <span className="text-white">Submit Startup</span>
            </Link>
            
            {/* Divider */}
            <div className="my-3 border-t border-purple-500/30"></div>
            
            {/* Secondary Navigation */}
            <Link
              to="/about"
              onClick={() => setIsOpen(false)}
              className="group px-4 py-3 rounded-xl bg-gradient-to-r from-slate-600/40 to-gray-600/40 hover:from-slate-500/60 hover:to-gray-500/60 text-white transition-all font-bold flex items-center gap-3 border border-slate-400/50 hover:border-slate-300 shadow-lg"
            >
              <BookOpen className="w-5 h-5 text-slate-300" />
              <span className="text-white">About</span>
            </Link>
            
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="group px-4 py-3 rounded-xl bg-gradient-to-r from-slate-600/40 to-gray-600/40 hover:from-slate-500/60 hover:to-gray-500/60 text-white transition-all font-bold flex items-center gap-3 border border-slate-400/50 hover:border-slate-300 shadow-lg"
            >
              <Settings className="w-5 h-5 text-slate-300" />
              <span className="text-white">Settings</span>
            </Link>
            
            <Link
              to="/admin/dashboard"
              onClick={() => setIsOpen(false)}
              className="group px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-600/40 to-amber-600/40 hover:from-yellow-500/60 hover:to-amber-500/60 text-white transition-all font-bold flex items-center gap-3 border border-yellow-400/50 hover:border-yellow-300 shadow-lg"
            >
              <Crown className="w-5 h-5 text-yellow-300" />
              <span className="text-white">Admin Dashboard</span>
            </Link>

            {/* Admin Link - Only visible to admins */}
            {isAdmin && (
              <>
                <div className="my-3 border-t border-purple-500/30"></div>
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-white transition-all font-bold flex items-center gap-3 border-2 border-purple-400 hover:border-purple-300 shadow-lg"
                >
                  <Crown className="w-5 h-5 text-yellow-300" />
                  <span className="text-white">Admin Panel</span>
                </Link>
                
                <Link
                  to="/admin/operations"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-3 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-white transition-all font-bold flex items-center gap-3 border-2 border-cyan-400 hover:border-cyan-300 shadow-lg"
                >
                  <Activity className="w-5 h-5 text-cyan-300" />
                  <span className="text-white">⚡ Operations Center</span>
                </Link>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="mt-auto pt-6 border-t border-purple-500/30">
            <div className="text-center">
              <p className="text-xs text-purple-300/60">Powered by AI</p>
              <p className="text-xs text-purple-400/80 font-semibold mt-1">GOD Algorithm™</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
