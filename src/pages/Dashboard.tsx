import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

  const clearAllVotes = () => {
    if (confirm('⚠️ Are you sure you want to clear ALL your votes? This cannot be undone.')) {
      localStorage.removeItem('myYesVotes');
      localStorage.removeItem('votedStartups');
      setMyYesVotes([]);
      alert('✅ All votes cleared! You can start voting again.');
      window.location.href = '/vote';
    }
  };

  const handleVote = (vote: 'yes' | 'no') => {
    console.log(`Voted ${vote}`);
    // Vote handling can be added here if needed
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
          <div className="space-y-8">
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