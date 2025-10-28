import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SharePortfolioModal from './SharePortfolioModal';

interface YesVote {
  id: number;
  name: string;
  pitch?: string;
  tagline?: string;
  stage?: number;
  votedAt: string;
}

const Dashboard: React.FC = () => {
  const [myYesVotes, setMyYesVotes] = useState<YesVote[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const votes = localStorage.getItem('myYesVotes');
    if (votes) {
      setMyYesVotes(JSON.parse(votes));
    }

    // Check admin status
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      setIsAdmin(profile.email === 'admin@hotmoneyhoney.com' || profile.isAdmin);
    }
  }, []);

  const clearAllVotes = () => {
    if (confirm('⚠️ Are you sure you want to clear ALL your votes? This cannot be undone.')) {
      localStorage.removeItem('myYesVotes');
      localStorage.removeItem('votedStartups');
      setMyYesVotes([]);
      alert('✅ All votes cleared! You can start voting again.');
      window.location.href = '/vote';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950" style={{ backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' }}>
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-2 items-center">
          <Link to="/signup" className="text-3xl hover:scale-110 transition-transform cursor-pointer" title="Sign Up/In">
            🍯
          </Link>
          <Link to="/signup" className="px-4 py-1.5 bg-yellow-400 text-black rounded-full font-semibold text-xs shadow-lg hover:bg-yellow-500 transition-all">
            👤 Sign Up/In
          </Link>
          <Link to="/" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-semibold text-xs shadow-lg hover:bg-orange-600 transition-all">
            🏠 Home
          </Link>
          <Link to="/vote" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-semibold text-xs shadow-lg hover:bg-orange-600 transition-all">
            📊 Vote
          </Link>
          <Link to="/dashboard" className="px-4 py-1.5 bg-orange-600 text-white rounded-full font-semibold text-xs shadow-lg">
            👤 Dashboard
          </Link>
          {isAdmin && (
            <Link to="/admin/bulk-upload" className="px-4 py-1.5 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 text-white rounded-full font-semibold text-xs shadow-lg hover:from-gray-500 hover:via-gray-600 hover:to-gray-700 transition-all">
              📊 Bulk Upload
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/document-upload" className="px-4 py-1.5 bg-gradient-to-r from-green-400 via-purple-500 to-purple-700 text-white rounded-full font-semibold text-xs shadow-lg hover:from-green-500 hover:via-purple-600 hover:to-purple-800 transition-all">
              📄 Scan Docs
            </Link>
          )}
        </div>
      </div>

      <div className="pt-28 px-8 max-w-7xl mx-auto">
        {/* User Profile Section */}
        <div className="mb-6 flex justify-end">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 flex items-center gap-4 shadow-xl border border-white/20">
            <div className="text-right">
              <p className="text-sm text-purple-200">Logged in as</p>
              <p className="text-white font-bold">
                {(() => {
                  const profile = localStorage.getItem('userProfile');
                  return profile ? JSON.parse(profile).name : 'User';
                })()}
              </p>
            </div>
            <Link 
              to="/settings"
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2"
            >
              ⚙️ Settings
            </Link>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to log out?')) {
                  localStorage.removeItem('isLoggedIn');
                  alert('✅ Logged out successfully!');
                  window.location.href = '/';
                }
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2"
            >
              🚪 Log Out
            </button>
          </div>
        </div>

        {/* ✅ CENTERED HEADER */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-white mb-2">
            🔥 My Hot Picks
          </h1>
          <p className="text-lg text-purple-200">
            You've voted YES on <span className="font-bold text-yellow-300">{myYesVotes.length}</span> {myYesVotes.length === 1 ? 'startup' : 'startups'}
          </p>
          
          {/* Action buttons when there are votes */}
          {myYesVotes.length > 0 && (
            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={() => setShowShareModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-medium text-sm transition-colors shadow-lg"
              >
                📤 Share Portfolio
              </button>
              <button
                onClick={clearAllVotes}
                className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 transition-colors shadow-lg"
              >
                🗑️ Clear All Votes
              </button>
            </div>
          )}
        </div>

        {myYesVotes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">🤷‍♂️</div>
            <p className="text-3xl font-bold text-white mb-4">
              No hot picks yet!
            </p>
            <p className="text-xl text-purple-200 mb-8">
              Start voting YES on startups you're interested in
            </p>
            <Link to="/vote" className="px-8 py-4 bg-orange-500 text-white rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors shadow-lg inline-block">
              🔥 Start Voting Now
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myYesVotes.map((vote) => (
              <div
                key={vote.id}
                className="bg-gradient-to-br from-amber-300 via-orange-400 to-yellow-500 rounded-2xl p-6 shadow-2xl border-4 border-orange-500 relative hover:scale-105 transition-transform"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                
                <div className="relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-gray-900 leading-tight mb-1">
                        {vote.name}
                      </h3>
                      {vote.stage && (
                        <p className="text-blue-700 font-bold text-xs">
                          stage #{vote.stage}
                        </p>
                      )}
                    </div>
                    <div className="text-3xl">🔥</div>
                  </div>

                  {vote.pitch && (
                    <p className="text-sm font-black text-gray-900 leading-tight mb-2">
                      "{vote.pitch}"
                    </p>
                  )}

                  {vote.tagline && (
                    <p className="text-xs font-bold text-gray-800 leading-tight mb-3">
                      {vote.tagline}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-orange-500">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👍</span>
                      <span className="text-sm font-bold text-gray-800">Voted YES</span>
                    </div>
                    <span className="text-xs text-gray-700 font-semibold">
                      {new Date(vote.votedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Link at Bottom */}
      <div className="fixed bottom-8 right-8 z-50">
        <Link 
          to="/settings" 
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full font-semibold shadow-2xl hover:from-purple-600 hover:to-purple-700 transition-all hover:scale-105"
        >
          ⚙️ Settings
        </Link>
      </div>

      {/* Share Portfolio Modal */}
      <SharePortfolioModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        yesVotes={myYesVotes}
      />
    </div>
  );
};

export default Dashboard;