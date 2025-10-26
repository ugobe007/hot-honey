import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const FloatingNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { icon: '🐝', label: 'Sign Up', path: '/signup' },
    { icon: '🏠', label: 'Home', path: '/' },
    { icon: '🗳️', label: 'Vote', path: '/vote-demo' },
    { icon: '👤', label: 'Dashboard', path: '/dashboard' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex gap-3 items-center">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all transform hover:scale-105 shadow-xl ${
              isActive(item.path)
                ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
                : 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white hover:from-orange-400 hover:to-orange-500'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default FloatingNav;