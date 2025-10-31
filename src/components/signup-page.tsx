import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

type UserType = 'startup' | 'investor';
type AuthMode = 'signup' | 'login';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [userType, setUserType] = useState<UserType>('startup');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    description: '',
  });

  const handleSignUp = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    
    // Create user profile
    const userProfile = {
      id: `user-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      userType: userType,
      description: formData.description,
      createdAt: new Date().toISOString(),
      preferences: {
        industries: [],
        filterEnabled: false
      }
    };
    
    // Save to localStorage (in a real app, this would go to a backend)
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    localStorage.setItem('isLoggedIn', 'true');
    
    console.log('User profile created:', userProfile);
    
    // Show success message and redirect
    alert(`Welcome to Hot Honey! 🍯\n\nSigned up as: ${userType}\n\n✅ Your account has been created!`);
    
    // Redirect based on user type
    if (userType === 'investor') {
      navigate('/settings'); // Take investors to set preferences
    } else {
      navigate('/submit'); // Take startups to submit their startup
    }
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 p-8" style={{ backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' }}>
      <div className="max-w-4xl mx-auto">
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
        <div className="text-center mb-12">
          <div className="text-8xl mb-4 animate-pulse">🍯</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
            {authMode === 'signup' ? 'Join Hot Honey' : 'Welcome Back!'}
          </h1>
          <p className="text-xl text-white font-bold drop-shadow-lg">
            {authMode === 'signup' 
              ? 'Connect startups with investors who share your vision'
              : 'Log in to Hot Honey'}
          </p>
          <div className="mt-4 flex justify-center gap-4 text-4xl">
            <span className="animate-pulse" style={{ animationDelay: '0s' }}>🔥</span>
            <span className="animate-pulse" style={{ animationDelay: '0.3s' }}>💰</span>
            <span className="animate-pulse" style={{ animationDelay: '0.6s' }}>🚀</span>
          </div>
        </div>

        {/* Auth Mode Toggle (Sign Up / Log In) */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-3xl p-2 shadow-lg inline-flex">
            <button
              onClick={() => {
                setAuthMode('signup');
                setError('');
              }}
              className={`px-8 py-3 rounded-2xl font-bold transition-all ${
                authMode === 'signup'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-green-600'
              }`}
            >
              ✨ Sign Up
            </button>
            <button
              onClick={() => {
                setAuthMode('login');
                setError('');
              }}
              className={`px-8 py-3 rounded-2xl font-bold transition-all ${
                authMode === 'login'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              🔑 Log In
            </button>
          </div>
        </div>

        {/* Sign Up/Login Form */}
        <div className="bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 rounded-3xl p-8 shadow-2xl">
          <div className="bg-white/90 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-orange-600 mb-6 text-center">
              {authMode === 'signup' ? '✨ Create Your Account' : '🔑 Log In'}
            </h2>
            <p className="text-gray-600 text-center mb-8">
              {authMode === 'signup'
                ? 'Join the honey pot revolution and connect with the right partners'
                : 'Welcome back! Enter your credentials to continue.'}
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-100 border-2 border-red-400 rounded-xl">
                <p className="text-red-700 font-semibold text-center">❌ {error}</p>
              </div>
            )}

            <form onSubmit={authMode === 'signup' ? handleSignUp : handleLogin} className="space-y-6" autoComplete="off">
              {/* User Type Selection (Sign Up only) */}
              {authMode === 'signup' && (
                <div>
                  <label htmlFor="userType" className="block text-sm font-bold text-gray-700 mb-2">
                    I am a...
                  </label>
                  <select
                    id="userType"
                    value={userType}
                    onChange={(e) => setUserType(e.target.value as UserType)}
                    className="w-full px-4 py-3 border-2 border-orange-300 rounded-xl focus:outline-none focus:border-orange-500 text-gray-800 font-medium bg-white"
                  >
                    <option value="startup">🚀 Startup - Looking for investment</option>
                    <option value="investor">💰 Investor - Looking to invest</option>
                  </select>
                </div>
              )}

              {/* Name Field (Sign Up only) */}
              {authMode === 'signup' && (
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                    {userType === 'startup' ? 'Startup Name' : 'Full Name'}
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={userType === 'startup' ? 'Enter your startup name' : 'Enter your full name'}
                    required
                    autoComplete="off"
                    className="w-full px-4 py-3 border-2 border-orange-300 rounded-xl focus:outline-none focus:border-orange-500 text-gray-800 font-medium"
                  />
                </div>
              )}

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
                  placeholder="Create a secure password"
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-3 border-2 border-orange-300 rounded-xl focus:outline-none focus:border-orange-500 text-gray-800 font-medium"
                />
              </div>

              {/* Description Field (Startup Sign Up only) */}
              {authMode === 'signup' && userType === 'startup' && (
                <div>
                  <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-2">
                    Startup Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Tell us about your startup..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-orange-300 rounded-xl focus:outline-none focus:border-orange-500 text-gray-800 font-medium resize-none"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all text-lg"
              >
                {authMode === 'signup' ? '✨ Create Account' : '🔑 Log In'}
              </button>
            </form>

            {/* Additional Links */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                {authMode === 'signup' ? (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setError('');
                      }}
                      className="text-orange-600 font-bold hover:text-orange-700 hover:underline"
                    >
                      Log In
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{' '}
                    <button
                      onClick={() => {
                        setAuthMode('signup');
                        setError('');
                      }}
                      className="text-orange-600 font-bold hover:text-orange-700 hover:underline"
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <div className="bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 rounded-3xl p-1 shadow-lg hover:scale-105 transition-transform">
            <div className="bg-white rounded-3xl p-6 h-full">
              <div className="text-6xl mb-4 text-center">🚀</div>
              <h3 className="text-2xl font-bold text-orange-600 mb-4 text-center">For Startups</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-xl">🍯</span>
                  <span className="font-semibold">Get in front of engaged investors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">📊</span>
                  <span className="font-semibold">Showcase your pitch deck & documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">📈</span>
                  <span className="font-semibold">Track investor interest in real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">🤝</span>
                  <span className="font-semibold">Connect with the right partners</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">🔥</span>
                  <span className="font-semibold">Get them while they're HOT!</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-400 rounded-3xl p-1 shadow-lg hover:scale-105 transition-transform">
            <div className="bg-white rounded-3xl p-6 h-full">
              <div className="text-6xl mb-4 text-center">💰</div>
              <h3 className="text-2xl font-bold text-orange-600 mb-4 text-center">For Investors</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-xl">🍯</span>
                  <span className="font-semibold">Discover hot startups early</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">📋</span>
                  <span className="font-semibold">Access detailed startup profiles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">⭐</span>
                  <span className="font-semibold">Vote and track your favorites</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">💬</span>
                  <span className="font-semibold">Connect directly with founders</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">🔥</span>
                  <span className="font-semibold">Join the honey pot revolution!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}