import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SharePortfolioModal from './SharePortfolioModal';
import StartupCardOfficial from './StartupCardOfficial';
import startupData from '../data/startupData';
import { useStore } from '../store';

interface YesVote {
  id: number;
  name: string;
  pitch?: string;
  tagline?: string;
  stage?: number;
  fivePoints?: string[];
  votedAt: string;
}

const Dashboard: React.FC = () => {
  const location = useLocation();
  const [myYesVotes, setMyYesVotes] = useState<YesVote[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const voteYes = useStore((state) => state.voteYes);
  const voteNo = useStore((state) => state.voteNo);
  const unvote = useStore((state) => state.unvote);

  useEffect(() => {
    const votes = localStorage.getItem('myYesVotes');
    if (votes) {
      const parsedVotes = JSON.parse(votes);
      
      // Migrate old votes that don't have fivePoints
      const enrichedVotes = parsedVotes.map((vote: any) => {
        if (!vote.fivePoints) {
          // Find the startup in startupData and add missing fields
          const fullStartup = startupData.find(s => s.id === vote.id);
          if (fullStartup) {
            return { ...vote, fivePoints: fullStartup.fivePoints };
          }
        }
        return vote;
      });
      
      // Save enriched data back to localStorage
      localStorage.setItem('myYesVotes', JSON.stringify(enrichedVotes));
      setMyYesVotes(enrichedVotes);
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

  const isActive = (path: string) => location.pathname === path;
  const getButtonSize = (path: string) => {
    if (isActive(path)) return 'text-lg py-3 px-6'; // Active - moderately larger
    return 'text-sm py-2 px-4'; // Normal size
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950" style={{ backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' }}>
      
      {/* User Profile Section - Upper Right Corner */}
      <div className="fixed top-4 right-4 z-50">
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
            className="px-4 py-2 bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 text-gray-800 rounded-full text-sm font-semibold transition-all flex items-center gap-2"
          >
            🚪 Log Out
          </button>
        </div>
      </div>
      
      {/* Navigation Bar */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-3 items-center">
          <Link to="/signup" className="text-4xl hover:scale-110 transition-transform cursor-pointer" title="Hot Money Honey">
            🍯
          </Link>
          
          <Link 
            to="/" 
            className={`font-bold rounded-2xl transition-all ${getButtonSize('/')} ${
              isActive('/')
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-110'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            🏠 Home
          </Link>

          {/* Dashboard Button - Same Orange Gradient as StartupCard */}
          <Link 
            to="/dashboard" 
            className={`font-bold rounded-2xl transition-all ${
              isActive('/dashboard') ? 'text-lg py-3 px-7' : 'text-base py-2.5 px-5'
            } ${
              isActive('/dashboard')
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-white shadow-xl scale-110'
                : 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 hover:from-amber-500 hover:via-orange-600 hover:to-yellow-600 text-white shadow-lg'
            }`}
          >
            📊 Dashboard
          </Link>

          <Link 
            to="/vote" 
            className={`font-bold rounded-2xl transition-all ${getButtonSize('/vote')} ${
              isActive('/vote')
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-110'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            🗳️ Vote
          </Link>

          {isAdmin && (
            <Link 
              to="/admin/bulk-upload" 
              className={`font-bold rounded-2xl transition-all ${getButtonSize('/admin/bulk-upload')} ${
                isActive('/admin/bulk-upload')
                  ? 'bg-gradient-to-r from-gray-500 to-gray-700 text-white shadow-lg scale-110'
                  : 'bg-gradient-to-r from-gray-400 to-gray-600 hover:from-gray-500 hover:to-gray-700 text-white'
              }`}
            >
              📊 Bulk Upload
            </Link>
          )}

          {isAdmin && (
            <Link 
              to="/admin/document-upload" 
              className={`font-bold rounded-2xl transition-all ${getButtonSize('/admin/document-upload')} ${
                isActive('/admin/document-upload')
                  ? 'bg-gradient-to-r from-green-500 to-purple-700 text-white shadow-lg scale-110'
                  : 'bg-gradient-to-r from-green-400 to-purple-600 hover:from-green-500 hover:to-purple-700 text-white'
              }`}
            >
              📄 Scan Docs
            </Link>
          )}
        </div>
      </div>

      <div className="pt-28 px-8 max-w-7xl mx-auto">

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
              <Link
                to="/analytics"
                className="px-6 py-3 bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950 text-yellow-400 rounded-lg font-bold text-sm transition-all shadow-lg"
              >
                📈 View Analytics
              </Link>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myYesVotes.map((vote) => (
              <div key={vote.id} className="transform scale-90">
                <StartupCardOfficial
                  startup={vote}
                  onVote={(voteType) => {
                    if (voteType === 'yes') {
                      voteYes(vote);
                    } else {
                      // If voting no from dashboard, remove from portfolio
                      unvote(vote);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
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