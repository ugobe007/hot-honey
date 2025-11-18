import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

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
      {/* Floating Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-50 p-3 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 text-white hover:from-purple-700 hover:to-purple-900 transition-all shadow-xl"
        aria-label="Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">💰</span>
              <h2 className="text-2xl font-bold text-slate-800">Hot Money</h2>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center gap-3"
            >
              <span className="text-xl">🏠</span>
              <span>Home</span>
            </Link>
            <Link
              to="/vote"
              onClick={() => setIsOpen(false)}
              className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center gap-3"
            >
              <span className="text-xl">🗳️</span>
              <span>Vote</span>
            </Link>
            <Link
              to="/investors"
              onClick={() => setIsOpen(false)}
              className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center gap-3"
            >
              <span className="text-xl">💼</span>
              <span>Investors</span>
            </Link>
            <Link
              to="/analytics"
              onClick={() => setIsOpen(false)}
              className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center gap-3"
            >
              <span className="text-xl">📈</span>
              <span>Analytics</span>
            </Link>
            <Link
              to="/about"
              onClick={() => setIsOpen(false)}
              className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center gap-3"
            >
              <span className="text-xl">📖</span>
              <span>About</span>
            </Link>
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center gap-3"
            >
              <span className="text-xl">⚙️</span>
              <span>Settings</span>
            </Link>

            {/* Admin Link - Only visible to admins */}
            {isAdmin && (
              <>
                <div className="my-2 border-t border-slate-200"></div>
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors font-bold flex items-center gap-3 border-2 border-purple-200"
                >
                  <span className="text-xl">👑</span>
                  <span>Admin Panel</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
