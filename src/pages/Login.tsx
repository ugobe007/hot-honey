import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    // Get stored user profile
    const userProfile = localStorage.getItem('userProfile');
    
    if (!userProfile) {
      setError('No account found with this email. Please sign up first.');
      return;
    }

    const profile = JSON.parse(userProfile);

    // Simple email check (in production, this would verify against backend)
    if (profile.email.toLowerCase() === formData.email.toLowerCase()) {
      // In production, you'd verify password here
      localStorage.setItem('isLoggedIn', 'true');
      
      alert(`Welcome back, ${profile.name}! 🍯`);
      
      // Redirect based on user type
      if (profile.userType === 'investor') {
        navigate('/dashboard');
      } else {
        navigate('/submit');
      }
    } else {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 p-8" style={{ backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' }}>
      <div className="max-w-md mx-auto">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all"
          >
            ← Home
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-8xl mb-4 animate-pulse">🍯</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
            Welcome Back!
          </h1>
          <p className="text-xl text-white font-bold drop-shadow-lg">
            Log in to Hot Honey
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 rounded-3xl p-8 shadow-2xl">
          <div className="bg-white/90 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-orange-600 mb-6 text-center">
              🔑 Log In
            </h2>

            {error && (
              <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  required
                  autoComplete="off"
                  className="w-full px-4 py-3 border-2 border-orange-300 rounded-xl focus:outline-none focus:border-orange-500 text-gray-800 font-medium"
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-3 border-2 border-orange-300 rounded-xl focus:outline-none focus:border-orange-500 text-gray-800 font-medium"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all text-lg"
              >
                Log In →
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link to="/signup" className="text-orange-600 font-bold hover:text-orange-700 hover:underline">
                  Sign Up
                </Link>
              </p>
            </div>

            {/* Forgot Password */}
            <div className="mt-4 text-center">
              <button 
                onClick={() => alert('Password reset feature coming soon! For now, please contact support.')}
                className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
          <h3 className="font-bold text-lg mb-4">What you get with Hot Honey:</h3>
          <ul className="space-y-2 text-sm">
            <li>🔥 Vote on hot startups</li>
            <li>💼 Build your investment portfolio</li>
            <li>🎯 Filter by your favorite industries</li>
            <li>📤 Share your picks with other investors</li>
            <li>🚀 Discover the next big thing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
