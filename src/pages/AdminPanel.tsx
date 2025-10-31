import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { isAuthorizedAdmin } from '../config/adminConfig';

/**
 * Admin Panel - Centralized hub for all administrative tools
 * Only accessible to authorized administrators
 */

const AdminPanel: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAuthorizedAdmin(email)) {
      setIsAuthenticated(true);
      setError('');
      localStorage.setItem('adminEmail', email);
    } else {
      setError('Unauthorized. This email is not in the admin list.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEmail('');
    localStorage.removeItem('adminEmail');
  };

  // Check for existing session
  React.useEffect(() => {
    const savedEmail = localStorage.getItem('adminEmail');
    if (savedEmail && isAuthorizedAdmin(savedEmail)) {
      setEmail(savedEmail);
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-green-400 to-purple-950"
        style={{ 
          backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' 
        }}
      >
        <div className="bg-purple-900/80 backdrop-blur-sm p-8 rounded-2xl border-4 border-yellow-400 max-w-md w-full shadow-2xl">
          <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500">
            🔐 Admin Access
          </h1>
          <p className="text-green-200 mb-6">
            Enter your authorized email to access the admin panel
          </p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-yellow-300 mb-2 font-semibold">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-purple-800/50 border border-green-400/30 text-white placeholder-green-300/50 focus:outline-none focus:border-yellow-400"
                placeholder="your@email.com"
                required
              />
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-white hover:scale-105 transition-transform shadow-lg"
            >
              Access Admin Panel
            </button>
          </form>
          
          <Link 
            to="/" 
            className="block text-center mt-6 text-green-300 hover:text-green-100"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 text-white p-8"
      style={{ 
        backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' 
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500">
              ⚡ Admin Control Panel
            </h1>
            <p className="text-xl text-green-200">
              Welcome back, <span className="text-yellow-300 font-semibold">{email}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 rounded-xl font-semibold bg-purple-800/50 hover:bg-purple-700/60 border border-green-400/30"
          >
            Logout
          </button>
        </div>

        {/* Admin Tools Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Startup Management */}
          <Link to="/admin/startup-processor" className="group">
            <div className="bg-purple-800/30 backdrop-blur-sm rounded-2xl p-8 border border-green-400/30 hover:border-yellow-400 transition-all hover:scale-105 h-full">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-2">Startup Processor</h3>
              <p className="text-green-200">
                Process new startup URLs with AI-powered scraping and multi-source research
              </p>
            </div>
          </Link>

          <Link to="/admin/startup-review" className="group">
            <div className="bg-purple-800/30 backdrop-blur-sm rounded-2xl p-8 border border-green-400/30 hover:border-yellow-400 transition-all hover:scale-105 h-full">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-2">Review Dashboard</h3>
              <p className="text-green-200">
                Review all processed startups, validate data, and export to StartupCards
              </p>
            </div>
          </Link>

          <Link to="/admin/bulk-upload" className="group">
            <div className="bg-purple-800/30 backdrop-blur-sm rounded-2xl p-8 border border-green-400/30 hover:border-yellow-400 transition-all hover:scale-105 h-full">
              <div className="text-5xl mb-4">📤</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-2">Bulk Upload</h3>
              <p className="text-green-200">
                Upload multiple startup URLs at once via CSV or paste list
              </p>
            </div>
          </Link>

          {/* User Management */}
          <Link to="/admin/users" className="group">
            <div className="bg-purple-800/30 backdrop-blur-sm rounded-2xl p-8 border border-green-400/30 hover:border-yellow-400 transition-all hover:scale-105 h-full">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-2">User Management</h3>
              <p className="text-green-200">
                Manage investors, members, and permissions
              </p>
            </div>
          </Link>

          {/* Voting Management */}
          <Link to="/admin/voting" className="group">
            <div className="bg-purple-800/30 backdrop-blur-sm rounded-2xl p-8 border border-green-400/30 hover:border-yellow-400 transition-all hover:scale-105 h-full">
              <div className="text-5xl mb-4">🗳️</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-2">Voting Analytics</h3>
              <p className="text-green-200">
                View voting results, trends, and member participation
              </p>
            </div>
          </Link>

          {/* Investment Tracking */}
          <Link to="/admin/investments" className="group">
            <div className="bg-purple-800/30 backdrop-blur-sm rounded-2xl p-8 border border-green-400/30 hover:border-yellow-400 transition-all hover:scale-105 h-full">
              <div className="text-5xl mb-4">💰</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-2">Investment Tracking</h3>
              <p className="text-green-200">
                Monitor committed investments, track ROI, and manage deals
              </p>
            </div>
          </Link>

          {/* Analytics */}
          <Link to="/admin/analytics" className="group">
            <div className="bg-purple-800/30 backdrop-blur-sm rounded-2xl p-8 border border-green-400/30 hover:border-yellow-400 transition-all hover:scale-105 h-full">
              <div className="text-5xl mb-4">📈</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-2">Analytics</h3>
              <p className="text-green-200">
                Club metrics, engagement stats, and performance insights
              </p>
            </div>
          </Link>

          {/* Content Management */}
          <Link to="/admin/content" className="group">
            <div className="bg-purple-800/30 backdrop-blur-sm rounded-2xl p-8 border border-green-400/30 hover:border-yellow-400 transition-all hover:scale-105 h-full">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-2">Content Manager</h3>
              <p className="text-green-200">
                Edit site content, announcements, and featured startups
              </p>
            </div>
          </Link>

          {/* Settings */}
          <Link to="/admin/settings" className="group">
            <div className="bg-purple-800/30 backdrop-blur-sm rounded-2xl p-8 border border-green-400/30 hover:border-yellow-400 transition-all hover:scale-105 h-full">
              <div className="text-5xl mb-4">⚙️</div>
              <h3 className="text-2xl font-bold text-yellow-300 mb-2">Settings</h3>
              <p className="text-green-200">
                Configure site settings, API keys, and admin preferences
              </p>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-purple-800/30 backdrop-blur-sm rounded-2xl p-6 border border-green-400/30">
          <h3 className="text-xl font-bold text-yellow-300 mb-4">⚡ Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            <Link 
              to="/" 
              className="px-6 py-3 rounded-xl font-semibold bg-purple-700/50 hover:bg-purple-600/60 border border-green-400/30 transition-all"
            >
              🏠 View Live Site
            </Link>
            <Link 
              to="/dashboard" 
              className="px-6 py-3 rounded-xl font-semibold bg-purple-700/50 hover:bg-purple-600/60 border border-green-400/30 transition-all"
            >
              📊 View Dashboard
            </Link>
            <Link 
              to="/portfolio" 
              className="px-6 py-3 rounded-xl font-semibold bg-purple-700/50 hover:bg-purple-600/60 border border-green-400/30 transition-all"
            >
              💼 View Portfolio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
