import React, { useState } from 'react';

interface Startup {
  id: string;
  name: string;
  stage: string;
  value: string;
  market: string;
  raise: string;
  votes: number;
  totalVotes: number;
  needsVotes: number;
}

interface StartupVotingCardProps {
  startup: Startup;
  onVote: (vote: 'yes' | 'no') => void;
  onComment: () => void;
  onRevealHoneypot: () => void;
}

const StartupVotingCard: React.FC<StartupVotingCardProps> = ({
  startup,
  onVote,
  onComment,
  onRevealHoneypot
}) => {
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = (vote: 'yes' | 'no') => {
    setHasVoted(true);
    onVote(vote);
  };

  const progressPercentage = (startup.votes / startup.totalVotes) * 100;

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-slate-700 to-slate-600 rounded-2xl p-6 shadow-xl border border-slate-500">
      {/* Header with Name and Honeypot Icon */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{startup.name}</h2>
          <p className="text-sm text-red-500 font-medium">{startup.stage}</p>
        </div>
        <div className="text-2xl">🍯</div>
      </div>

      {/* Startup Details */}
      <div className="mb-6 space-y-2">
        <p className="text-gray-800">
          <strong>Value:</strong> {startup.value}
        </p>
        <p className="text-gray-800">
          <strong>Market:</strong> {startup.market}
        </p>
        <p className="text-gray-800">
          <strong>Raise:</strong> {startup.raise}
        </p>
      </div>

      {/* Reveal Honeypot Button */}
      <button
        onClick={onRevealHoneypot}
        className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg mb-4 transition-colors"
      >
        🍯 Reveal Honeypot
      </button>

      {/* Voting Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => handleVote('yes')}
          disabled={hasVoted}
          className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          ❤️ Yes
        </button>
        <button
          onClick={() => handleVote('no')}
          disabled={hasVoted}
          className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          ❌ No
        </button>
        <button
          onClick={onComment}
          className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          💬 Comment
        </button>
      </div>

      {/* Stage Progress */}
      <div className="bg-blue-500 text-white text-center py-2 rounded-lg mb-2 font-medium">
        Stage 1: Initial Voting
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="w-full bg-gray-300 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Vote Stats */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">
          {startup.votes}/{startup.totalVotes} votes
        </p>
        <p className="text-xs text-gray-600">
          Needs {startup.needsVotes}+ votes to advance
        </p>
      </div>
    </div>
  );
};

export default StartupVotingCard;
