import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { NotificationBell } from './NotificationBell';

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
    
    if (loggedIn) {
      const profile = localStorage.getItem('userProfile');
      if (profile) {
        setUserProfile(JSON.parse(profile));
      }
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userProfile');
    setIsLoggedIn(false);
    setUserProfile(null);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;
  const getButtonSize = (path: string) => {
    if (isActive(path)) return 'text-2xl py-4 px-8'; // 2x larger when active
    return 'text-base py-3 px-6'; // Normal size
  };

  return (
    <nav className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 shadow-xl border-b-4 border-orange-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:scale-105 transition-transform"
          >
            <span className="text-5xl">🍯</span>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                Hot Money Honey
              </h1>
              <p className="text-xs text-purple-300 font-semibold">Find Your Perfect Match</p>
            </div>
          </button>

          {/* Navigation Links */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className={`font-bold rounded-2xl transition-all ${getButtonSize('/')} ${
                isActive('/')
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-110'
                  : 'bg-purple-700 hover:bg-purple-600 text-white'
              }`}
            >
              🏠 Home
            </button>

            {isLoggedIn ? (
              <>
                {/* Dashboard Button - Larger and Light Blue */}
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`font-bold rounded-2xl transition-all ${
                    isActive('/dashboard') ? 'text-2xl py-4 px-10' : 'text-lg py-4 px-8'
                  } ${
                    isActive('/dashboard')
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-xl scale-110'
                      : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg'
                  }`}
                >
                  📊 Dashboard
                </button>

                <button
                  onClick={() => navigate('/vote')}
                  className={`font-bold rounded-2xl transition-all ${getButtonSize('/vote')} ${
                    isActive('/vote')
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-110'
                      : 'bg-purple-700 hover:bg-purple-600 text-white'
                  }`}
                >
                  🗳️ Vote
                </button>

                <button
                  onClick={() => navigate('/portfolio')}
                  className={`font-bold rounded-2xl transition-all ${getButtonSize('/portfolio')} ${
                    isActive('/portfolio')
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg scale-110'
                      : 'bg-purple-700 hover:bg-purple-600 text-white'
                  }`}
                >
                  ⭐ Portfolio
                </button>

                <button
                  onClick={() => navigate('/submit')}
                  className={`font-bold rounded-2xl transition-all ${getButtonSize('/submit')} ${
                    isActive('/submit')
                      ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg scale-110'
                      : 'bg-purple-700 hover:bg-purple-600 text-white'
                  }`}
                >
                  📝 Submit
                </button>

                <button
                  onClick={() => navigate('/admin/document-upload')}
                  className={`font-bold rounded-2xl transition-all ${getButtonSize('/admin/document-upload')} ${
                    isActive('/admin/document-upload')
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-110'
                      : 'bg-purple-700 hover:bg-purple-600 text-white'
                  }`}
                >
                  📄 Scanned Docs
                </button>

                {/* Notification Bell */}
                <NotificationBell />

                {userProfile && (
                  <div className="ml-4 flex items-center gap-3 bg-purple-800/50 rounded-2xl px-4 py-2 border-2 border-purple-600">
                    <span className="text-white font-semibold">{userProfile.name}</span>
                    <button
                      onClick={handleLogout}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl transition-all text-sm"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => navigate('/signup')}
                className={`font-bold rounded-2xl transition-all ${getButtonSize('/signup')} ${
                  isActive('/signup')
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-110'
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg'
                }`}
              >
                ✨ Sign Up / Log In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}