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
    if (isActive(path)) return 'text-2xl py-5 px-12'; // 2x larger when active - more pill shaped
    return 'text-base py-4 px-10'; // Normal size - more pill shaped
  };

  return (
    <nav className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 shadow-xl border-b-4 border-cyan-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center hover:scale-105 transition-transform"
          >
            <svg 
              width="180" 
              height="80" 
              viewBox="0 0 768 768" 
              className="drop-shadow-lg"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Flame */}
              <path d="M384 150 C350 180, 320 220, 320 280 C320 340, 340 380, 360 420 C340 440, 330 470, 330 500 C330 570, 380 620, 450 620 C520 620, 570 570, 570 500 C570 470, 560 440, 540 420 C560 380, 580 340, 580 280 C580 220, 550 180, 516 150 C500 130, 485 110, 470 90 C455 110, 440 130, 424 150 Z" 
                fill="#F97316" 
              />
              <path d="M384 180 C360 205, 340 240, 340 290 C340 340, 355 375, 375 410 C360 425, 350 450, 350 480 C350 535, 390 580, 450 580 C510 580, 550 535, 550 480 C550 450, 540 425, 525 410 C545 375, 560 340, 560 290 C560 240, 540 205, 516 180 C500 165, 490 145, 480 125 C470 145, 460 165, 444 180 Z" 
                fill="#FB923C" 
              />
              <path d="M384 210 C370 230, 360 260, 360 300 C360 340, 370 370, 385 400 C375 410, 370 430, 370 455 C370 495, 400 530, 450 530 C500 530, 530 495, 530 455 C530 430, 525 410, 515 400 C530 370, 540 340, 540 300 C540 260, 530 230, 516 210 C505 195, 495 175, 485 155 C475 175, 465 195, 454 210 Z" 
                fill="#FCD34D" 
              />
              
              {/* HOT MATCH Text */}
              <g transform="translate(0, 370)">
                {/* HOT */}
                <text x="384" y="60" fontSize="140" fontWeight="900" fill="#F8FAFC" textAnchor="middle" fontFamily="Arial Black, sans-serif" stroke="#1E293B" strokeWidth="12">HOT</text>
                {/* MATCH */}
                <text x="384" y="180" fontSize="140" fontWeight="900" fill="#F8FAFC" textAnchor="middle" fontFamily="Arial Black, sans-serif" stroke="#1E293B" strokeWidth="12">MATCH</text>
                
                {/* Wavy bottom decoration */}
                <path d="M 140 200 Q 180 210, 220 200 Q 260 190, 300 200 Q 340 210, 384 200 Q 428 190, 468 200 Q 508 210, 548 200 Q 588 190, 628 200" 
                  fill="none" 
                  stroke="#0F766E" 
                  strokeWidth="8" 
                  strokeLinecap="round"
                />
                <path d="M 140 215 Q 180 225, 220 215 Q 260 205, 300 215 Q 340 225, 384 215 Q 428 205, 468 215 Q 508 225, 548 215 Q 588 205, 628 215" 
                  fill="none" 
                  stroke="#0F766E" 
                  strokeWidth="8" 
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </button>

          {/* Navigation Links */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className={`font-bold rounded-full transition-all ${getButtonSize('/')} ${
                isActive('/')
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg scale-110'
                  : 'bg-purple-700 hover:bg-purple-600 text-white'
              }`}
            >
              🏠 Home
            </button>

            {isLoggedIn && (
              <>

                {/* Dashboard Button - Larger and Light Blue */}
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`font-bold rounded-full transition-all ${
                    isActive('/dashboard') ? 'text-2xl py-5 px-14' : 'text-lg py-4 px-12'
                  } ${
                    isActive('/dashboard')
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-xl scale-110'
                      : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg'
                  }`}
                >
                  📊 Dashboard
                </button>

                {/* Benchmarks Button - Orange/Amber */}
                <button
                  onClick={() => navigate('/benchmarks')}
                  className={`font-bold rounded-full transition-all ${getButtonSize('/benchmarks')} ${
                    isActive('/benchmarks')
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg scale-110'
                      : 'bg-purple-700 hover:bg-cyan-600 text-cyan-300'
                  }`}
                >
                  📈 Benchmarks
                </button>

                <button
                  onClick={() => navigate('/vote')}
                  className={`font-bold rounded-full transition-all ${getButtonSize('/vote')} ${
                    isActive('/vote')
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-110'
                      : 'bg-purple-700 hover:bg-purple-600 text-white'
                  }`}
                >
                  🗳️ Vote
                </button>

                <button
                  onClick={() => navigate('/portfolio')}
                  className={`font-bold rounded-full transition-all ${getButtonSize('/portfolio')} ${
                    isActive('/portfolio')
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg scale-110'
                      : 'bg-purple-700 hover:bg-purple-600 text-white'
                  }`}
                >
                  ⭐ Portfolio
                </button>

                {/* Notification Bell */}
                <NotificationBell />

                {userProfile && (
                  <div className="ml-4 flex items-center gap-3 bg-gradient-to-r from-purple-900 to-purple-700 rounded-full px-4 py-2 border-2 border-purple-500">
                    <span className="text-white font-semibold">{userProfile.name}</span>
                    <button
                      onClick={handleLogout}
                      className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-bold py-2 px-4 rounded-full transition-all text-sm"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}/* CACHE BUSTER Sun Nov  2 06:39:48 PST 2025 */
