import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { useVotes } from '../hooks/useVotes';

const StartupDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const startups = useStore((state) => state.startups);
  const { userId } = useAuth();
  const { castVote, hasVoted, removeVote, voteCounts } = useVotes(userId);
  
  // Ensure both are strings for comparison
  const startup = startups.find((s) => String(s.id) === String(id));

  if (!startup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <p className="text-white text-xl">Startup not found.</p>
          <button 
            onClick={() => navigate('/vote')}
            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-xl"
          >
            ← Back to Voting
          </button>
        </div>
      </div>
    );
  }

  // Get user's vote for this startup
  const userVote = hasVoted(startup.id.toString());
  const voteCount = voteCounts[startup.id.toString()];

  const handleVote = async (voteType: 'yes' | 'no') => {
    // If already voted this way, toggle off
    if (userVote === voteType) {
      await removeVote(startup.id.toString());
    } else {
      await castVote(startup.id.toString(), voteType);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/vote')}
          className="mb-6 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-2 px-6 rounded-xl border border-white/30 transition-all"
        >
          ← Back to Voting
        </button>

        {/* Main Content Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20 mb-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h2 className="text-4xl font-bold text-white mb-2">{startup.name}</h2>
              {startup.pitch && (
                <p className="text-xl text-purple-200 font-semibold mb-2">"{startup.pitch}"</p>
              )}
              {startup.tagline && (
                <p className="text-lg text-purple-300">{startup.tagline}</p>
              )}
            </div>
            <div className="text-6xl ml-4">🚀</div>
          </div>

          {/* Five Points */}
          {startup.fivePoints && startup.fivePoints.length > 0 && (
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-4">Key Points</h3>
              <div className="space-y-3">
                {startup.fivePoints.map((point, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <p className="text-white text-lg">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Startup Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {startup.description && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <h4 className="text-white font-bold mb-2">Value Proposition</h4>
                <p className="text-purple-200">{startup.description}</p>
              </div>
            )}
            {startup.marketSize && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <h4 className="text-white font-bold mb-2">Market Size</h4>
                <p className="text-purple-200">{startup.marketSize}</p>
              </div>
            )}
            {startup.unique && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <h4 className="text-white font-bold mb-2">Unique Value</h4>
                <p className="text-purple-200">{startup.unique}</p>
              </div>
            )}
            {startup.raise && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <h4 className="text-white font-bold mb-2">Raise Amount</h4>
                <p className="text-purple-200">{startup.raise}</p>
              </div>
            )}
            {startup.stage && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <h4 className="text-white font-bold mb-2">Stage</h4>
                <p className="text-purple-200">Stage {startup.stage}</p>
              </div>
            )}
          </div>

          {/* Video Link */}
          {startup.video && (
            <div className="mb-6 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-2">🎥 Pitch Video</h3>
              <a 
                className="text-blue-300 hover:text-blue-200 underline text-lg" 
                href={startup.video} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Watch now →
              </a>
            </div>
          )}

          {/* Vote Stats */}
          <div className="flex gap-6 mb-6">
            <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-4 border border-green-500/30 flex items-center gap-3">
              <span className="text-3xl">👍</span>
              <div>
                <p className="text-green-200 text-sm">YES Votes</p>
                <p className="text-white text-2xl font-bold">{voteCount?.yes_votes || startup.yesVotes || 0}</p>
              </div>
            </div>
            <div className="bg-gray-500/20 backdrop-blur-sm rounded-lg p-4 border border-gray-500/30 flex items-center gap-3">
              <span className="text-3xl">👎</span>
              <div>
                <p className="text-gray-200 text-sm">NO Votes</p>
                <p className="text-white text-2xl font-bold">{voteCount?.no_votes || startup.noVotes || 0}</p>
              </div>
            </div>
          </div>

          {/* Voting Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => handleVote('yes')}
              className={`flex-1 font-bold py-4 px-6 rounded-xl text-lg shadow-lg transition-all ${
                userVote === 'yes'
                  ? 'bg-green-600 text-white scale-105 shadow-green-500/50'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {userVote === 'yes' ? '✓ YES - You voted!' : '👍 Vote YES'}
            </button>
            <button
              onClick={() => handleVote('no')}
              className={`flex-1 font-bold py-4 px-6 rounded-xl text-lg shadow-lg transition-all ${
                userVote === 'no'
                  ? 'bg-gray-700 text-white opacity-50'
                  : 'bg-gray-400 hover:bg-gray-500 text-gray-900'
              }`}
            >
              {userVote === 'no' ? '✓ NO - You voted' : '👎 Vote NO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartupDetail;
