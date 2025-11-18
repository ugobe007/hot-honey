import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
    
    // Check if admin and redirect accordingly
    const isAdmin = email.includes('admin') || email.includes('ugobe');
    if (isAdmin) {
      navigate('/admin/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 p-8">
      <div className="max-w-md mx-auto">
        
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 px-6 py-3 bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 font-bold rounded-xl transition-all shadow-lg"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
            textShadow: '0 1px 1px rgba(255,255,255,0.8)'
          }}
        >
          ← Back to Home
        </button>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-orange-200 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔑</div>
            <h1 className="text-4xl font-bold text-orange-600 mb-2">Log In</h1>
            <p className="text-slate-700">Access your account</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-slate-700 font-semibold mb-2">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-orange-200 text-slate-800 focus:border-orange-400 outline-none placeholder-slate-400"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-2">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-orange-200 text-slate-800 focus:border-orange-400 outline-none placeholder-slate-400"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl transition-all shadow-lg text-lg mt-6"
            >
              🚀 Log In
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/signup')}
              className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
            >
              Don't have an account? Sign Up →
            </button>
          </div>

          {/* Quick Login Options */}
          <div className="mt-6 pt-6 border-t border-orange-200">
            <p className="text-slate-700 font-semibold mb-3 text-center">Quick Login:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setEmail('admin@hotmoney.com');
                  setPassword('admin123');
                }}
                className="py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg text-sm"
              >
                👑 Admin Login
              </button>
              <button
                onClick={() => {
                  setEmail('investor@example.com');
                  setPassword('demo123');
                }}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg text-sm"
              >
                👤 Investor Login
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-orange-200">
            <p className="text-slate-700 text-sm mb-3">
              <strong className="text-orange-600">🔑 Demo Credentials:</strong>
            </p>
            <div className="space-y-2 text-sm">
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <p className="font-semibold text-purple-700">Admin Access:</p>
                <p className="text-slate-700">Email: <code className="bg-purple-100 px-2 py-0.5 rounded">admin@hotmoney.com</code></p>
                <p className="text-slate-700">Password: <code className="bg-purple-100 px-2 py-0.5 rounded">admin123</code></p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="font-semibold text-blue-700">Regular User:</p>
                <p className="text-slate-700">Email: <code className="bg-blue-100 px-2 py-0.5 rounded">investor@example.com</code></p>
                <p className="text-slate-700">Password: <code className="bg-blue-100 px-2 py-0.5 rounded">demo123</code></p>
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-3">
              💡 <strong>Tip:</strong> Any email containing "admin" or "ugobe" gets admin access automatically!
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/submit')}
            className="py-3 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-semibold rounded-xl transition-all shadow-lg"
          >
            📝 Submit Startup
          </button>
          <button
            onClick={() => navigate('/vote')}
            className="py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all shadow-lg"
          >
            🗳️ Start Voting
          </button>
        </div>
      </div>
    </div>
  );
}
