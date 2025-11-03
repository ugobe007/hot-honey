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
    // Navigate to home page after login
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8">
      <div className="max-w-md mx-auto">
        
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-all"
        >
          ← Back to Home
        </button>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔑</div>
            <h1 className="text-4xl font-bold text-white mb-2">Log In</h1>
            <p className="text-purple-200">Access your account</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-white font-semibold mb-2">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white border border-white/30 focus:border-orange-400 outline-none placeholder-white/50"
                required
              />
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white border border-white/30 focus:border-orange-400 outline-none placeholder-white/50"
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
              className="text-orange-300 hover:text-orange-200 font-semibold transition-colors"
            >
              Don't have an account? Sign Up →
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-white/80 text-sm">
              <strong className="text-orange-300">💡 Tip:</strong> Use an email with "admin" or "ugobe" to get admin access!
            </p>
            <p className="text-white/60 text-xs mt-2">
              (This is a demo - in production, authentication would be validated against a backend)
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/submit')}
            className="py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all"
          >
            📝 Submit Startup
          </button>
          <button
            onClick={() => navigate('/vote')}
            className="py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all"
          >
            🗳️ Start Voting
          </button>
        </div>
      </div>
    </div>
  );
}
