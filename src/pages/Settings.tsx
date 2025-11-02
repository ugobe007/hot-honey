import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    investorType: 'angel',
    notifications: true,
    newsletter: true
  });

  useEffect(() => {
    // Load user profile from localStorage
    const profile = localStorage.getItem('userProfile');
    if (profile) {
      setUserProfile(JSON.parse(profile));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    alert('✅ Settings saved successfully!');
  };

  const handleClearVotes = () => {
    if (confirm('⚠️ Are you sure you want to clear ALL your votes? This cannot be undone.')) {
      localStorage.removeItem('myYesVotes');
      localStorage.removeItem('votedStartups');
      alert('✅ All votes cleared!');
      navigate('/vote');
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.clear();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8">
      {/* Top Navigation */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] pointer-events-auto">
        <div className="flex gap-2 pointer-events-auto">
          <Link to="/" className="text-4xl hover:scale-110 transition-transform" title="Hot Money Honey">
            🍯
          </Link>
          <Link to="/" className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-2xl transition-all shadow-lg">
            🏠 Home
          </Link>
          <Link to="/vote" className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-2xl transition-all shadow-lg">
            🗳️ Vote
          </Link>
          <Link to="/dashboard" className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-2xl transition-all shadow-lg">
            📊 Dashboard
          </Link>
          <Link to="/portfolio" className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-2xl transition-all shadow-lg">
            ⭐ Portfolio
          </Link>
          <Link to="/settings" className="px-7 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold rounded-2xl shadow-xl scale-110">
            ⚙️ Settings
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-28 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">⚙️ Settings</h1>
          <p className="text-xl text-purple-200">Manage your account and preferences</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border-2 border-purple-400/50">
            <h2 className="text-3xl font-bold text-white mb-6">👤 Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Name</label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border-2 border-purple-300/50 text-white placeholder-purple-300 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-white font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={userProfile.email}
                  onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border-2 border-purple-300/50 text-white placeholder-purple-300 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-white font-semibold mb-2">Investor Type</label>
                <select
                  value={userProfile.investorType}
                  onChange={(e) => setUserProfile({...userProfile, investorType: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border-2 border-purple-300/50 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="angel" className="bg-purple-900">👼 Angel Investor</option>
                  <option value="vc" className="bg-purple-900">💼 VC Fund</option>
                  <option value="family_office" className="bg-purple-900">🏛️ Family Office</option>
                  <option value="syndicate" className="bg-purple-900">🤝 Syndicate</option>
                  <option value="other" className="bg-purple-900">🔍 Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border-2 border-purple-400/50">
            <h2 className="text-3xl font-bold text-white mb-6">🔔 Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">Email Notifications</div>
                  <div className="text-purple-300 text-sm">Get notified about new deals and updates</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userProfile.notifications}
                    onChange={(e) => setUserProfile({...userProfile, notifications: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">Newsletter</div>
                  <div className="text-purple-300 text-sm">Weekly digest of hot deals</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userProfile.newsletter}
                    onChange={(e) => setUserProfile({...userProfile, newsletter: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Data Management Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border-2 border-purple-400/50">
            <h2 className="text-3xl font-bold text-white mb-6">🗄️ Data Management</h2>
            <div className="space-y-4">
              <button
                onClick={handleClearVotes}
                className="w-full px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all shadow-lg text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg">🗑️ Clear All Votes</div>
                    <div className="text-sm text-orange-200">Remove all your voting history</div>
                  </div>
                  <div className="text-2xl">→</div>
                </div>
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg">🚪 Log Out</div>
                    <div className="text-sm text-red-200">Sign out of your account</div>
                  </div>
                  <div className="text-2xl">→</div>
                </div>
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-xl rounded-2xl shadow-xl transition-all"
            >
              💾 Save Settings
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-4 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xl rounded-2xl shadow-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
