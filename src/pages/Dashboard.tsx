import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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

  useEffect(() => {
    // Load YES votes from localStorage
    const votes = localStorage.getItem('myYesVotes');
    if (votes) {
      setMyYesVotes(JSON.parse(votes));
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-1">
          <Link to="/signup" className="px-4 py-1.5 bg-yellow-400 text-black rounded-full font-medium text-sm shadow-lg hover:bg-yellow-500 transition-colors">
            👤 Sign Up
          </Link>
          <Link to="/" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
            🏠 Home
          </Link>
          <Link to="/vote" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
            📊 Vote
          </Link>
          <Link to="/dashboard" className="px-4 py-1.5 bg-orange-600 text-white rounded-full font-medium text-sm shadow-lg">
            👤 Dashboard
          </Link>
        </div>
      </div>

      <div className="pt-28 px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-5xl font-bold text-gray-800 mb-2">
                🔥 My Hot Picks
              </h1>
              <p className="text-lg text-gray-600">
                You've voted YES on <span className="font-bold text-orange-600">{myYesVotes.length}</span> {myYesVotes.length === 1 ? 'startup' : 'startups'}
              </p>
            </div>
            {myYesVotes.length > 0 && (
              <button
                onClick={clearAllVotes}
                className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 transition-colors shadow-lg"
              >
                🗑️ Clear All Votes
              </button>
            )}
          </div>
        </div>

        {myYesVotes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">🤷‍♂️</div>
            <p className="text-3xl font-bold text-gray-800 mb-4">
              No hot picks yet!
            </p>
            <p className="text-xl text-gray-600 mb-8">
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
                className="bg-gradient-to-br from-amber-300 via-orange-400 to-yellow-500 rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border-4 border-orange-500 relative hover:scale-105 transition-transform"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                
                <div className="relative">
                  {/* Header */}
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

                  {/* Pitch */}
                  {vote.pitch && (
                    <p className="text-sm font-black text-gray-900 leading-tight mb-2">
                      "{vote.pitch}"
                    </p>
                  )}

                  {/* Tagline */}
                  {vote.tagline && (
                    <p className="text-xs font-bold text-gray-800 leading-tight mb-3">
                      {vote.tagline}
                    </p>
                  )}

                  {/* Vote Badge */}
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
    </div>
  );
};

export default Dashboard;