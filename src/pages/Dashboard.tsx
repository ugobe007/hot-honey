import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StartupCardOfficial from '../components/StartupCardOfficial';
import startupData from '../data/startupData';

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
  const navigate = useNavigate();
  const [myYesVotes, setMyYesVotes] = useState<YesVote[]>([]);

  useEffect(() => {
    // Load YES votes from localStorage
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
  }, []);

  const handleVote = (vote: 'yes' | 'no') => {
    console.log(`Voted ${vote}`);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('userProfile');
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
          <Link to="/dashboard" className="px-7 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold rounded-2xl shadow-xl scale-110">
            📊 Dashboard
          </Link>
          <Link to="/portfolio" className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-2xl transition-all shadow-lg">
            ⭐ Portfolio
          </Link>
        </div>
      </div>

      {/* User Controls - Upper Right */}
      <div className="fixed top-4 right-4 z-[200] pointer-events-auto">
        <div className="flex gap-2 items-center bg-purple-800/50 backdrop-blur-md rounded-2xl px-4 py-2 border border-purple-600/30">
          <span className="text-white text-sm">User</span>
          <button
            onClick={handleLogout}
            className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-all"
          >
            🚪 Log Out
          </button>
        </div>
      </div>

      <div className="pt-28 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">
            🔥 My Hot Picks
          </h1>
          <p className="text-2xl text-purple-200">
            You've voted YES on <span className="font-bold text-yellow-300">{myYesVotes.length}</span> {myYesVotes.length === 1 ? 'startup' : 'startups'}
          </p>
        </div>

        {myYesVotes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📭</div>
            <p className="text-3xl font-bold text-white mb-4">
              No hot picks yet!
            </p>
            <p className="text-xl text-purple-200 mb-8">
              Start voting YES on startups you're interested in
            </p>
            <button
              onClick={() => navigate('/vote')}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg rounded-2xl shadow-lg transition-all"
            >
              � Start Voting Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myYesVotes.map((vote) => (
              <div key={vote.id}>
                <StartupCardOfficial
                  startup={vote}
                  onVote={handleVote}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;