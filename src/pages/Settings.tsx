import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HamburgerMenu from '../components/HamburgerMenu';

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 p-8">
      {/* Hamburger Menu */}
      <HamburgerMenu />

      {/* Current Page Button */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-full bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 font-medium text-sm flex items-center gap-2 shadow-lg hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 transition-all cursor-pointer"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
            textShadow: '0 1px 1px rgba(255,255,255,0.8)'
          }}>
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="pt-28 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-orange-600 mb-4">⚙️ Settings</h1>
          <p className="text-xl text-slate-700">Manage your account and preferences</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-orange-200">
            <h2 className="text-3xl font-bold text-orange-600 mb-6">👤 Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-2">Name</label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl bg-white border-2 border-orange-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={userProfile.email}
                  onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-white border-2 border-orange-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-2">Investor Type</label>
                <select
                  value={userProfile.investorType}
                  onChange={(e) => setUserProfile({...userProfile, investorType: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-white border-2 border-orange-200 text-slate-800 focus:outline-none focus:border-orange-400"
                >
                  <option value="angel" className="bg-white">👼 Angel Investor</option>
                  <option value="vc" className="bg-white">💼 VC Fund</option>
                  <option value="family_office" className="bg-white">🏛️ Family Office</option>
                  <option value="syndicate" className="bg-white">🤝 Syndicate</option>
                  <option value="other" className="bg-white">🔍 Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-orange-200">
            <h2 className="text-3xl font-bold text-orange-600 mb-6">🔔 Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-800 font-semibold">Email Notifications</div>
                  <div className="text-slate-600 text-sm">Get notified about new deals and updates</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userProfile.notifications}
                    onChange={(e) => setUserProfile({...userProfile, notifications: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-800 font-semibold">Newsletter</div>
                  <div className="text-slate-600 text-sm">Weekly digest of hot deals</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userProfile.newsletter}
                    onChange={(e) => setUserProfile({...userProfile, newsletter: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Data Management Section */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border-2 border-orange-200">
            <h2 className="text-3xl font-bold text-orange-600 mb-6">🗄️ Data Management</h2>
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
              className="px-8 py-4 bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 font-bold text-xl rounded-2xl shadow-xl transition-all"
              style={{
                boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
                textShadow: '0 1px 1px rgba(255,255,255,0.8)'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
