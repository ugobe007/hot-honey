import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();

  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-4">Please Log In</h1>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl font-bold text-white">👤 Profile</h1>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
          >
            ← Back to Home
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-slate-700 shadow-2xl">
          <div className="flex items-start gap-6">
            <div className="text-8xl">
              {user.isAdmin ? '🍯' : '👤'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-white">{user.name}</h2>
                {user.isAdmin && (
                  <span className="px-3 py-1 bg-cyan-500 text-white rounded-full text-sm font-bold">
                    ⭐ ADMIN
                  </span>
                )}
              </div>
              <p className="text-purple-200 text-lg mb-4">{user.email}</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/settings')}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all"
                >
                  ⚙️ Settings
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all"
                >
                  🚪 Log Out
                </button>
              </div>
              
              {/* Username display */}
              <div className="mt-4 pt-4 border-t border-purple-400/30">
                <p className="text-purple-300 text-sm">
                  <span className="font-semibold">Username:</span> ugobe07
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Tools - Only show for admins */}
        {user.isAdmin && (
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-lg rounded-2xl p-8 border-2 border-cyan-500/50 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-5xl">🍯</div>
              <div>
                <h2 className="text-3xl font-bold text-white">Administrator Tools</h2>
                <p className="text-cyan-200">You have access to advanced features</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Admin Dashboard - NEW */}
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl border-2 border-cyan-400 transition-all text-left group shadow-xl"
              >
                <div className="text-4xl mb-2">👑</div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-100 transition-colors">
                  Admin Dashboard
                </h3>
                <p className="text-white text-sm">
                  Central hub for managing all startups, reviews, and admin tasks
                </p>
              </button>

              {/* Database Management */}
              <button
                onClick={() => navigate('/admin/edit-startups')}
                className="p-6 bg-slate-800/50 hover:bg-white/20 rounded-xl border border-slate-700 transition-all text-left group"
              >
                <div className="text-4xl mb-2">✏️</div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  Edit Startups
                </h3>
                <p className="text-white/70 text-sm">
                  View, edit, and manage all submitted startups in the database
                </p>
              </button>

              <button
                onClick={() => navigate('/admin/bulk-import')}
                className="p-6 bg-slate-800/50 hover:bg-white/20 rounded-xl border border-slate-700 transition-all text-left group"
              >
                <div className="text-4xl mb-2">🚀</div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  Bulk Import
                </h3>
                <p className="text-white/70 text-sm">
                  Import multiple startups from VC portfolios with AI enrichment
                </p>
              </button>

              <button
                onClick={() => navigate('/admin/review')}
                className="p-6 bg-slate-800/50 hover:bg-white/20 rounded-xl border border-slate-700 transition-all text-left group"
              >
                <div className="text-4xl mb-2">📋</div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  Review Queue
                </h3>
                <p className="text-white/70 text-sm">
                  Approve or reject pending startup submissions
                </p>
              </button>

              <button
                onClick={() => navigate('/admin/migrate')}
                className="p-6 bg-slate-800/50 hover:bg-white/20 rounded-xl border border-slate-700 transition-all text-left group"
              >
                <div className="text-4xl mb-2">🔄</div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  Migrate Data
                </h3>
                <p className="text-white/70 text-sm">
                  Move legacy localStorage data to Supabase database
                </p>
              </button>

              <button
                onClick={() => navigate('/admin/diagnostic')}
                className="p-6 bg-slate-800/50 hover:bg-white/20 rounded-xl border border-slate-700 transition-all text-left group"
              >
                <div className="text-4xl mb-2">🔍</div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  System Diagnostic
                </h3>
                <p className="text-white/70 text-sm">
                  Check database status, connections, and data integrity
                </p>
              </button>

              <button
                onClick={() => navigate('/admin/setup')}
                className="p-6 bg-slate-800/50 hover:bg-white/20 rounded-xl border border-slate-700 transition-all text-left group"
              >
                <div className="text-4xl mb-2">⚙️</div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  Database Setup
                </h3>
                <p className="text-white/70 text-sm">
                  Initialize tables, run migrations, and configure database
                </p>
              </button>
            </div>

            <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-xl">
              <p className="text-cyan-200 text-sm">
                💡 <strong>Admin Tip:</strong> These tools give you full control over the platform's data and functionality. 
                Use the diagnostic page to monitor system health.
              </p>
            </div>
          </div>
        )}

        {/* Regular User Section */}
        {!user.isAdmin && (
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Your Activity</h2>
            
            <div className="grid gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-6 bg-slate-800/50 hover:bg-white/20 rounded-xl border border-slate-700 transition-all text-left group"
              >
                <div className="text-4xl mb-2">📊</div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  My Dashboard
                </h3>
                <p className="text-white/70 text-sm">
                  View your voted startups and portfolio
                </p>
              </button>

              <button
                onClick={() => navigate('/vote')}
                className="p-6 bg-slate-800/50 hover:bg-white/20 rounded-xl border border-slate-700 transition-all text-left group"
              >
                <div className="text-4xl mb-2">🗳️</div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  Vote on Startups
                </h3>
                <p className="text-white/70 text-sm">
                  Discover and vote on innovative startups
                </p>
              </button>

              <button
                onClick={() => navigate('/submit')}
                className="p-6 bg-slate-800/50 hover:bg-white/20 rounded-xl border border-slate-700 transition-all text-left group"
              >
                <div className="text-4xl mb-2">📝</div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  Submit Your Startup
                </h3>
                <p className="text-white/70 text-sm">
                  Get your startup in front of investors
                </p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
