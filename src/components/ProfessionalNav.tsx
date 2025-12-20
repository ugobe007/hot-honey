import { Link } from 'react-router-dom';
import LogoDropdownMenu from './LogoDropdownMenu';

export default function ProfessionalNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo Dropdown + Logo */}
          <div className="flex items-center gap-4">
            <LogoDropdownMenu />
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <span className="text-xl font-bold text-slate-800">Hot Money</span>
            </Link>
          </div>

          {/* Right: Main Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/portfolio"
              className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium hidden sm:flex items-center gap-2"
            >
              ⭐ Portfolio
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors font-medium flex items-center gap-2"
            >
              👤 Dashboard
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors font-medium flex items-center gap-2"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
