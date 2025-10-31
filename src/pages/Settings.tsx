import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const INDUSTRIES = [
  { id: 'fintech', name: 'FinTech', emoji: '💰' },
  { id: 'ai', name: 'AI/ML', emoji: '🤖' },
  { id: 'saas', name: 'SaaS', emoji: '☁️' },
  { id: 'deeptech', name: 'Deep Tech', emoji: '🔬' },
  { id: 'robotics', name: 'Robotics', emoji: '🦾' },
  { id: 'healthtech', name: 'HealthTech', emoji: '🏥' },
  { id: 'edtech', name: 'EdTech', emoji: '📚' },
  { id: 'cleantech', name: 'CleanTech', emoji: '🌱' },
  { id: 'ecommerce', name: 'E-Commerce', emoji: '🛒' },
  { id: 'crypto', name: 'Crypto/Web3', emoji: '₿' },
  { id: 'consumer', name: 'Consumer', emoji: '🛍️' },
  { id: 'enterprise', name: 'Enterprise', emoji: '🏢' },
];

export default function Settings() {
  const navigate = useNavigate();
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      setIsLoggedIn(true);
      setUserEmail(profile.email || 'User');
      
      // Load preferences from user profile
      if (profile.preferences) {
        setSelectedIndustries(profile.preferences.industries || []);
        setFilterEnabled(profile.preferences.filterEnabled || false);
      }
    } else {
      // Try to load unsaved preferences (for preview)
      const savedPreferences = localStorage.getItem('investorPreferences');
      if (savedPreferences) {
        const prefs = JSON.parse(savedPreferences);
        setSelectedIndustries(prefs.industries || []);
        setFilterEnabled(prefs.filterEnabled || false);
      }
    }
  }, []);

  const toggleIndustry = (industryId: string) => {
    setSelectedIndustries(prev => 
      prev.includes(industryId)
        ? prev.filter(id => id !== industryId)
        : [...prev, industryId]
    );
  };

  const handleSave = () => {
    // Check if user is logged in (in a real app, this would check actual auth)
    const userProfile = localStorage.getItem('userProfile');
    
    if (!userProfile) {
      // User not logged in - prompt to sign up
      if (confirm('🔒 Please sign up to save your preferences!\n\nWould you like to go to the sign up page now?')) {
        navigate('/signup');
      }
      return;
    }

    // User is logged in - save preferences
    const preferences = {
      industries: selectedIndustries,
      filterEnabled: filterEnabled,
      savedAt: new Date().toISOString()
    };
    
    // Save to user profile
    const profile = JSON.parse(userProfile);
    profile.preferences = preferences;
    localStorage.setItem('userProfile', JSON.stringify(profile));
    
    // Also save to investorPreferences for easy access
    localStorage.setItem('investorPreferences', JSON.stringify(preferences));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSelectAll = () => {
    if (selectedIndustries.length === INDUSTRIES.length) {
      setSelectedIndustries([]);
    } else {
      setSelectedIndustries(INDUSTRIES.map(i => i.id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 p-8 relative">
      {/* Radial green accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-96 h-96 bg-green-400 rounded-full blur-3xl opacity-40" style={{left: '20%', top: '40%'}}></div>
      </div>

      {/* Navigation */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-1 items-center">
          <Link to="/signup" className="text-4xl hover:scale-110 transition-transform cursor-pointer" title="Sign Up">
            🍯
          </Link>
          <Link to="/signup" className="px-4 py-1.5 bg-yellow-400 text-black rounded-full font-medium text-sm shadow-lg hover:bg-yellow-500 transition-colors">
            👤 Sign Up
          </Link>
          <Link to="/" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
            🏠 Home
          </Link>
          <Link to="/vote" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
            📊 Vote
          </Link>
          <Link to="/dashboard" className="px-4 py-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-white rounded-full font-medium text-sm shadow-lg hover:from-amber-500 hover:via-orange-600 hover:to-yellow-600 transition-all">
            👤 Dashboard
          </Link>
          <Link to="/settings" className="px-4 py-1.5 bg-orange-600 text-white rounded-full font-medium text-sm shadow-lg">
            ⚙️ Settings
          </Link>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto relative z-10 pt-28">
        {/* Content Container */}
        <div className="bg-white rounded-3xl shadow-2xl p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">⚙️</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
              Investor Preferences
            </h1>
            <p className="text-lg text-gray-700">
              Customize your Hot Honey experience
            </p>
          </div>

          {/* Login Status Banner */}
          {!isLoggedIn && (
            <div className="mb-6 p-4 bg-yellow-100 border-2 border-yellow-400 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-800 font-semibold mb-1">⚠️ Not Logged In</p>
                  <p className="text-sm text-yellow-700">
                    Sign up to save your preferences to your account
                  </p>
                </div>
                <button
                  onClick={() => navigate('/signup')}
                  className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {isLoggedIn && (
            <div className="mb-6 p-4 bg-green-100 border-2 border-green-400 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="text-green-800 font-semibold">
                  ✅ Logged in as <strong>{userEmail}</strong>
                </p>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to log out?')) {
                      localStorage.removeItem('userProfile');
                      localStorage.removeItem('isLoggedIn');
                      setIsLoggedIn(false);
                      setUserEmail('');
                      alert('✅ Logged out successfully!');
                      navigate('/');
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors text-sm"
                >
                  Log Out
                </button>
              </div>
            </div>
          )}

          {saved && (
            <div className="mb-6 p-4 bg-green-100 border-2 border-green-400 rounded-xl text-center">
              <p className="text-green-800 font-semibold">✅ Preferences saved successfully!</p>
            </div>
          )}

          {/* Filter Toggle */}
          <div className="mb-8 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">🎯 Industry Filter</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Only show startups in your selected industries
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterEnabled}
                  onChange={(e) => setFilterEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
            {filterEnabled && selectedIndustries.length === 0 && (
              <div className="mt-3 p-3 bg-yellow-100 border-2 border-yellow-300 rounded-lg">
                <p className="text-sm text-yellow-800 font-semibold">⚠️ Please select at least one industry below</p>
              </div>
            )}
          </div>

          {/* Industry Selection */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Industries of Interest</h2>
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-semibold hover:bg-purple-200 transition-colors text-sm"
              >
                {selectedIndustries.length === INDUSTRIES.length ? '❌ Deselect All' : '✅ Select All'}
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Select the industries you're most interested in investing in
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {INDUSTRIES.map(industry => (
                <button
                  key={industry.id}
                  onClick={() => toggleIndustry(industry.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    selectedIndustries.includes(industry.id)
                      ? 'border-orange-500 bg-orange-50 shadow-lg'
                      : 'border-gray-300 bg-white hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  <div className="text-3xl mb-2">{industry.emoji}</div>
                  <div className={`font-semibold text-sm ${
                    selectedIndustries.includes(industry.id) ? 'text-orange-700' : 'text-gray-700'
                  }`}>
                    {industry.name}
                  </div>
                  {selectedIndustries.includes(industry.id) && (
                    <div className="text-orange-600 text-xl mt-1">✓</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="mb-6 bg-purple-50 border-2 border-purple-300 rounded-xl p-4">
            <h3 className="font-bold text-purple-700 mb-2">💡 How it works</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Toggle the filter ON to only see startups in your selected industries</li>
              <li>• Toggle OFF to see all startups (great for discovery!)</li>
              <li>• You can change your preferences anytime</li>
              <li>• Your selections are saved automatically to your device</li>
            </ul>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all text-lg"
          >
            💾 Save Preferences
          </button>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/vote')}
              className="text-orange-600 hover:text-orange-700 font-semibold underline"
            >
              ← Back to Voting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
