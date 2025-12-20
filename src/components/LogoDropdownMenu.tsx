import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Zap, Vote as VoteIcon, Briefcase, TrendingUp, FileText, BookOpen, Settings, Crown, Activity, Search, Users, Upload, BarChart3, Shield, Sliders, Rocket, ArrowLeft, ChartBar } from 'lucide-react';
import FlameIcon from './FlameIcon';

export default function LogoDropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is admin (always true for now to show admin links)
  useEffect(() => {
    const checkAdmin = () => {
      const currentUser = localStorage.getItem('currentUser');
      const userProfile = localStorage.getItem('userProfile');
      
      if (currentUser) {
        const user = JSON.parse(currentUser);
        setIsAdmin(user.isAdmin || true); // Default to true for admin access
      } else if (userProfile) {
        const profile = JSON.parse(userProfile);
        setIsAdmin(profile.isAdmin || true);
      } else {
        setIsAdmin(true); // Default admin for development
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

  // Check if path is active
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  
  // Hide nav bar on matching engine pages - users don't need to see this
  const isMatchingPage = ['/matching', '/matching-engine', '/match', '/'].some(
    path => location.pathname === path
  );

  return (
    <>
      {/* Floating Nav Buttons - Hidden on matching pages */}
      {!isMatchingPage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-xl">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Back</span>
            </button>
            
            {/* Home */}
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${isActive('/') && location.pathname === '/' ? 'bg-orange-500/30 text-orange-400' : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'}`}
            >
              <span className="text-sm">🏠</span>
            </Link>
            
            {/* Admin */}
            <Link
              to="/admin/control"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${isActive('/admin') ? 'bg-orange-500/30 text-orange-400' : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'}`}
            >
              <span className="text-sm">⚙️</span>
            </Link>
            
            {/* Analytics */}
            <Link
              to="/admin/analytics"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${isActive('/admin/analytics') ? 'bg-orange-500/30 text-orange-400' : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'}`}
            >
              <span className="text-sm">📊</span>
            </Link>
            
            {/* Operations */}
            <Link
              to="/admin/operations"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${isActive('/admin/operations') ? 'bg-orange-500/30 text-orange-400' : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'}`}
            >
              <span className="text-sm">🔧</span>
            </Link>
            
            {/* Bulk Upload */}
            <Link
              to="/bulkupload"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${isActive('/bulkupload') ? 'bg-orange-500/30 text-orange-400' : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'}`}
            >
              <span className="text-sm">📦</span>
            </Link>
            
            {/* Startups */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${isActive('/dashboard') ? 'bg-orange-500/30 text-orange-400' : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'}`}
            >
              <span className="text-sm">🚀</span>
            </Link>
            
            {/* Investors */}
            <Link
              to="/investors"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${isActive('/investors') ? 'bg-orange-500/30 text-orange-400' : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'}`}
            >
              <span className="text-sm">👥</span>
            </Link>
            
            {/* Enrichment */}
            <Link
              to="/admin/investor-enrichment"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${isActive('/admin/investor-enrichment') ? 'bg-orange-500/30 text-orange-400' : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'}`}
            >
              <span className="text-sm">🔄</span>
            </Link>
            
            {/* Match - Highlighted */}
            <Link
              to="/matching"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/30 text-orange-400 hover:bg-orange-500/40 transition-all"
            >
              <Zap className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Hamburger Menu Button */}
      <div ref={menuRef} className="fixed top-4 left-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-4 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] hover:from-[#2d2d2d] hover:to-[#393939] backdrop-blur-sm border border-[#FF5A09]/30 hover:border-[#FF5A09]/60 transition-all hover:scale-105 shadow-lg shadow-black/20"
        aria-label="Menu"
      >
        <div className="flex flex-col gap-2 w-8">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-[#FF5A09] to-[#FF9900]" />
          <div className="h-1.5 rounded-full bg-gradient-to-r from-[#FF9900] to-[#FFCC00]" />
          <div className="h-1.5 rounded-full bg-gradient-to-r from-[#FF5A09] to-[#FF9900]" />
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
          
          {/* Menu Panel - Clean Dark Theme with Orange Accents - Larger */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl shadow-2xl border border-[#FF5A09]/20 overflow-hidden animate-fadeIn">
            <div className="p-5 max-h-[75vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#FF5A09]/30">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF5A09] to-[#FF9900] flex items-center justify-center shadow-lg shadow-[#FF5A09]/30">
                  <span className="text-2xl">🔥</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-[#FF5A09] to-[#FF9900] bg-clip-text text-transparent">
                    Hot Match
                  </h2>
                  <p className="text-sm text-[#888888]">AI-Powered Matching</p>
                </div>
              </div>

              <nav className="flex flex-col gap-1.5">
                {/* Main Navigation - Dark backgrounds with orange accents */}
                <Link
                  to="/"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-3 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <Home className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Home</span>
                </Link>
                
                <Link
                  to="/match"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-3 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <Zap className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">AI Matching</span>
                </Link>
                
                <Link
                  to="/vote"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-3 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <VoteIcon className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Vote</span>
                </Link>
                
                <Link
                  to="/investors"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-3 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <Briefcase className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Investors</span>
                </Link>
                
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-3 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <FlameIcon variant={8} size="sm" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Startups</span>
                </Link>
                
                <Link
                  to="/trending"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-3 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <TrendingUp className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Trending</span>
                </Link>
                
                <Link
                  to="/strategies"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-3 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <BookOpen className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Playbook</span>
                </Link>
                
                <Link
                  to="/submit"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-3 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <FileText className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Submit Startup</span>
                </Link>
                
                {/* Divider */}
                <div className="my-3 border-t border-[#333333]"></div>
                
                {/* Secondary */}
                <Link
                  to="/about"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-2.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-all font-medium flex items-center gap-3"
                >
                  <BookOpen className="w-5 h-5 text-[#666666]" />
                  <span className="text-base text-[#888888] group-hover:text-[#e0e0e0]">About</span>
                </Link>
                
                <Link
                  to="/navigation"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-2.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-all font-medium flex items-center gap-3"
                >
                  <Settings className="w-5 h-5 text-[#666666]" />
                  <span className="text-base text-[#888888] group-hover:text-[#e0e0e0]">Site Map</span>
                </Link>

                {/* Admin Section */}
                <div className="my-3 border-t border-[#333333]"></div>
                <p className="text-sm text-[#FF5A09] px-3 mb-2 font-semibold tracking-wider">ADMIN</p>
                
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-2.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <Shield className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Admin Panel</span>
                </Link>
                
                <Link
                  to="/admin/control"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-2.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <Sliders className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Control Center</span>
                </Link>
                
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-2.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <BarChart3 className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Workflow</span>
                </Link>
                
                <Link
                  to="/admin/operations"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-2.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <Activity className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Operations</span>
                </Link>
                
                <Link
                  to="/admin/discovered-startups"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-2.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <Search className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Discovered</span>
                </Link>
                
                <Link
                  to="/admin/edit-startups"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-2.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <FileText className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Edit Startups</span>
                </Link>
                
                <Link
                  to="/admin/discovered-investors"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-2.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <Users className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Investors</span>
                </Link>
                
                <Link
                  to="/bulkupload"
                  onClick={() => setIsOpen(false)}
                  className="group px-4 py-2.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border-l-2 border-l-transparent hover:border-l-[#FF5A09] transition-all font-medium flex items-center gap-3"
                >
                  <Upload className="w-5 h-5 text-[#FF5A09]" />
                  <span className="text-base text-[#e0e0e0] group-hover:text-[#FF9900]">Bulk Upload</span>
                </Link>
              </nav>

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-[#333333]">
                <div className="text-center">
                  <p className="text-sm text-[#555555]">Powered by AI</p>
                  <p className="text-sm bg-gradient-to-r from-[#FF5A09] to-[#FF9900] bg-clip-text text-transparent font-semibold mt-1">GOD Algorithm™</p>
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
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      </div>
    </>
  );
}
