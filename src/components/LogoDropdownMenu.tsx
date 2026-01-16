import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Settings,
  Bookmark,
  History,
  FileText,
  Lock,
  Cpu,
  Home,
  ArrowLeft,
  LogIn,
  LogOut,
  Sliders,
  Activity,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent } from '../lib/analytics';
import { getSession } from '../lib/routeGuards';

interface Props {
  onPythClick?: () => void;
  /** External control: when true, drawer opens */
  externalOpen?: boolean;
  /** Callback when open state changes (for external control) */
  onOpenChange?: (open: boolean) => void;
  /** 
   * Mode controls what UI gets rendered:
   * - 'app': Full UI with trigger button and Back/Home pills (default)
   * - 'oracle': Drawer content only, no floating UI (OracleHeader provides trigger)
   */
  mode?: 'app' | 'oracle';
}

/**
 * SYSTEM DRAWER - Pyth "Quiet Instrument" Design
 *
 * Goals:
 * - Monochrome base (no yellow buttons)
 * - Thin rows, clear hierarchy
 * - Accent (amber) only for emphasis/hover/admin
 * - Admin section not in DOM unless admin
 */
export default function LogoDropdownMenu({ onPythClick, externalOpen, onOpenChange, mode = 'app' }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Oracle mode = drawer content only, no floating trigger/pills
  const isOracleMode = mode === 'oracle';
  
  // Use external control if provided, otherwise internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalOpen(open);
    }
  };
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasScan, setHasScan] = useState(false);
  const [userRole, setUserRole] = useState<'founder' | 'investor'>('founder');

  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Single source of truth: logged in = user exists
  const isLoggedIn = !!user;

  const ADMIN_EMAILS = [
    'aabramson@comunicano.com',
    'ugobe07@gmail.com',
    'ugobe1@mac.com'
  ];

  useEffect(() => {
    const checkAuth = () => {
      // Get session state (scan status)
      const session = getSession();
      setHasScan(session.hasSubmittedUrl);
      
      // Get role from localStorage (this is intentional - role persists across sessions)
      const savedRole = (localStorage.getItem('userRole') as 'founder' | 'investor') || 'founder';
      setUserRole(savedRole);

      // Admin check: use user from useAuth() as primary source
      let adminStatus = false;

      if (user) {
        adminStatus =
          Boolean(user.isAdmin) ||
          (user.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false);
      }

      setIsAdmin(adminStatus);
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    trackEvent('drawer_opened');
  };

  const handleClose = () => {
    setIsOpen(false);
    trackEvent('drawer_closed');
  };

  const toggleRole = () => {
    const newRole = userRole === 'founder' ? 'investor' : 'founder';
    setUserRole(newRole);
    localStorage.setItem('userRole', newRole);
    trackEvent('role_toggled', { from: userRole, to: newRole });
  };

  const Row = ({
    to,
    icon: Icon,
    label,
    subtle,
    onClick
  }: {
    to: string;
    icon: any;
    label: string;
    subtle?: boolean;
    onClick?: () => void;
  }) => (
    <Link
      to={to}
      onClick={() => {
        onClick?.();
        handleClose();
      }}
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all
        ${subtle ? 'opacity-70 hover:opacity-100' : ''}
        hover:bg-white/5`}
    >
      <Icon className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
        {label}
      </span>
    </Link>
  );

  const SectionLabel = ({ children }: { children: string }) => (
    <p className="text-[10px] text-gray-600 px-3 mt-4 mb-2 uppercase tracking-[0.18em]">
      {children}
    </p>
  );

  return (
    <>
      {/* Minimal top nav: back + home - hidden on Oracle Gate (OracleHeader handles nav) */}
      {!isOracleMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 max-w-[95vw]">
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-black/35 backdrop-blur-md rounded-full border border-white/10">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-gray-500 hover:text-gray-200 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-xs hidden sm:inline">Back</span>
            </button>

            <Link
              to="/"
              className="flex items-center justify-center w-7 h-7 rounded-full text-gray-500 hover:text-white transition-all"
            >
              <Home className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Drawer button - hidden on Oracle Gate (OracleHeader provides trigger) */}
      {!isOracleMode && (
        <div ref={menuRef} className="fixed top-4 left-3 z-50">
          <button
            onClick={() => (isOpen ? handleClose() : handleOpen())}
            className="p-2.5 rounded-lg bg-black/25 hover:bg-black/45 backdrop-blur-md
                       border border-white/10 hover:border-white/15 transition-all"
            aria-label="System Menu"
          >
            <div className="flex flex-col gap-1.5 w-5">
              <div className="h-0.5 rounded-full bg-gray-600" />
              <div className="h-0.5 rounded-full bg-gray-600" />
              <div className="h-0.5 rounded-full bg-gray-600" />
            </div>
          </button>
        </div>
      )}

      {/* Menu ref for Oracle mode (OracleHeader triggers drawer) */}
      {isOracleMode && <div ref={menuRef} />}

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/35 z-50" onClick={handleClose} />

          {/* Panel - Fixed position in Oracle mode */}
          <div
            className={`${isOracleMode ? 'fixed top-16 left-4' : 'absolute top-full left-0 mt-2'} w-[300px] z-50
                       bg-[#0b0b0b] rounded-2xl shadow-2xl
                       border border-white/10 overflow-hidden`}
          >
              {/* Header - Simple Menu title (brand is in OracleHeader) */}
              <div className="px-5 pt-5 pb-3 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white/80">Menu</div>
                    <div className="text-xs text-white/40 mt-1">Navigation & settings</div>
                  </div>
                  {/* Operator Mode badge for admins */}
                  {isAdmin && (
                    <span className="text-[9px] text-amber-500/70 uppercase tracking-widest font-medium">
                      Operator
                    </span>
                  )}
                </div>
              </div>

              <div className="p-2 max-h-[72vh] overflow-y-auto">
                {/* Account */}
                <SectionLabel>Account</SectionLabel>
                {isLoggedIn ? (
                  <>
                    <Row to="/profile" icon={User} label="Profile" />
                    <Row to="/settings" icon={Settings} label="Settings" />

                    {/* Role toggle (quiet pill) */}
                    <button
                      onClick={toggleRole}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-sm border border-white/10 bg-white/5" />
                        <span className="text-sm text-gray-300">Role</span>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border
                          ${
                            userRole === 'investor'
                              ? 'border-sky-500/30 text-sky-300 bg-sky-500/10'
                              : 'border-amber-500/30 text-amber-300 bg-amber-500/10'
                          }`}
                      >
                        {userRole === 'investor' ? 'Investor' : 'Founder'}
                      </span>
                    </button>
                  </>
                ) : (
                  <Row to="/login" icon={LogIn} label="Login" />
                )}

                {/* Signals */}
                {(isLoggedIn || hasScan) && (
                  <>
                    <SectionLabel>Signals</SectionLabel>
                    <Row to="/feed" icon={Bookmark} label="Saved Signals" />
                  </>
                )}

                {/* Matches */}
                {(isLoggedIn || hasScan) && (
                  <>
                    <SectionLabel>Matches</SectionLabel>
                    <Row to="/saved-matches" icon={Bookmark} label="Saved Matches" />
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-40">
                      <History className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-500">Match History</span>
                      <span className="text-[10px] text-gray-600 ml-auto">Soon</span>
                    </div>
                  </>
                )}

                {/* About */}
                <SectionLabel>About</SectionLabel>
                <Row to="/why" icon={FileText} label="Why Pythh Exists" />
                <Row to="/privacy" icon={Lock} label="Privacy" />

                {/* System - Admin section (only in DOM if admin) */}
                {isAdmin && (
                  <>
                    <p className="text-[10px] text-amber-500 px-3 mt-4 mb-2 uppercase tracking-[0.18em]">
                      System
                    </p>

                    <Link
                      to="/admin/control"
                      onClick={handleClose}
                      className="group flex items-center gap-3 px-3 py-2 rounded-lg
                                 hover:bg-amber-500/10 transition-all"
                    >
                      <Sliders className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-gray-200 group-hover:text-white">Control</span>
                    </Link>

                    <Link
                      to="/admin/health"
                      onClick={handleClose}
                      className="group flex items-center gap-3 px-3 py-2 rounded-lg
                                 hover:bg-amber-500/10 transition-all"
                    >
                      <Activity className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-gray-200 group-hover:text-white">Health</span>
                    </Link>

                    <Link
                      to="/admin/pipeline"
                      onClick={handleClose}
                      className="group flex items-center gap-3 px-3 py-2 rounded-lg
                                 hover:bg-amber-500/10 transition-all"
                    >
                      <Activity className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-gray-200 group-hover:text-white">Pipelines</span>
                    </Link>

                    <Link
                      to="/admin/diagnostic"
                      onClick={handleClose}
                      className="group flex items-center gap-3 px-3 py-2 rounded-lg
                                 hover:bg-amber-500/10 transition-all"
                    >
                      <Shield className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-gray-200 group-hover:text-white">Diagnostics</span>
                    </Link>
                  </>
                )}

                {/* Logout */}
                {isLoggedIn && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <button
                      onClick={() => {
                        logout();
                        trackEvent('logout_completed');
                        handleClose();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-all"
                    >
                      <LogOut className="w-4 h-4 text-gray-500 group-hover:text-red-300" />
                      <span className="text-sm text-gray-300 hover:text-red-200">
                        Logout
                      </span>
                    </button>

                    {/* Investor value prop (quiet) */}
                    {userRole === 'investor' && (
                      <p className="text-[11px] text-gray-400 text-center mt-3 italic">
                        Investors use Pythh to detect momentum before rounds are obvious.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
    </>
  );
}
