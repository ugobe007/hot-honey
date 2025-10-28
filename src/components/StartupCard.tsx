import { useState } from 'react';
import { Startup } from '../types';

interface Props {
  startup: Startup;
  onVote: (startupId: number, vote: 'yes' | 'no') => void;
}

export default function StartupCard({ startup, onVote }: Props) {
  const [hasVoted, setHasVoted] = useState(false);
  const [voteType, setVoteType] = useState<'yes' | 'no' | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const handleVote = (vote: 'yes' | 'no') => {
    if (hasVoted) return;
    
    setVoteType(vote);
    setHasVoted(true);
    onVote(startup.id, vote);
  };

  const getVotesNeeded = (stage: number) => (stage === 4 ? 1 : 5);
  const votesNeeded = getVotesNeeded(startup.stage || 1);
  const currentVotes = startup.yesVotes || 0;
  const progress = Math.min((currentVotes / votesNeeded) * 100, 100);

  const getStageDescription = (stage: number) => {
    switch(stage) {
      case 1: return 'Anonymous voting • Need 5 votes to advance';
      case 2: return 'Review materials • Need 5 votes to advance';
      case 3: return 'Meet founder • Need 5 votes to advance';
      case 4: return 'Deal room access • Need 1 vote to close';
      default: return 'Voting stage';
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-300 via-orange-400 to-yellow-500 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border-4 border-orange-500 relative w-[360px] h-[400px] flex flex-col">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
      
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
              {startup.name}
            </h2>
            <p className="text-blue-700 font-bold text-xs mt-0.5">
              stage #{startup.stage || 1}
            </p>
            <p className="text-[10px] text-gray-700 italic leading-tight mt-0.5">
              {getStageDescription(startup.stage || 1)}
            </p>
          </div>
          <button
            onClick={() => setShowSecret(!showSecret)}
            className="text-3xl hover:scale-110 transition-transform flex-shrink-0"
          >
            🍯
          </button>
        </div>

        {/* Secret */}
        {showSecret && (
          <div className="bg-yellow-200 border-2 border-yellow-400 rounded-lg p-1.5 mb-2">
            <p className="text-[10px] font-bold text-gray-900 leading-tight">
              🤫 YC-backed • Fortune 500 LOI
            </p>
          </div>
        )}

        {/* Pitch */}
        {startup.pitch && (
          <p className="text-sm font-black text-gray-900 leading-tight tracking-tight mb-1">
            "{startup.pitch}"
          </p>
        )}

        {/* Tagline */}
        {startup.tagline && (
          <p className="text-xs font-bold text-gray-800 leading-tight tracking-tight mb-2">
            {startup.tagline}
          </p>
        )}

        {/* Five Points */}
        <div className="mb-3 space-y-1">
          {(startup.fivePoints || []).map((point, i) => (
            <p 
              key={i} 
              className={`leading-tight tracking-tight ${
                i === 0 || i === 1 || i === 2
                  ? 'text-xs font-black text-gray-900'
                  : 'text-[11px] font-bold text-gray-800'
              }`}
            >
              {point}
            </p>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-gray-700 mb-1">
            <span className="font-bold">Stage {(startup.stage || 1) + 1}</span>
            <span className="font-black">{currentVotes}/{votesNeeded} votes</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-1.5">
            <div 
              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Vote Stats */}
        <div className="flex gap-3 mb-2">
          <div className="flex items-center gap-1">
            <span className="text-base">👍</span>
            <span className="font-black text-gray-900 text-sm">{startup.yesVotes || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base">👎</span>
            <span className="font-black text-gray-900 text-sm">{startup.noVotes || 0}</span>
          </div>
        </div>

        {/* Voting Buttons */}
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xl">🔥</div>
          <button
            onClick={() => handleVote('yes')}
            disabled={hasVoted}
            className={`flex-1 font-black py-2 px-3 rounded-xl text-sm shadow-lg transition-all ${
              voteType === 'yes' ? 'bg-green-600 text-white scale-105' : 'bg-orange-500 hover:bg-orange-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            yes
          </button>
          <button
            onClick={() => handleVote('no')}
            disabled={hasVoted}
            className={`flex-1 font-black py-2 px-3 rounded-xl text-sm shadow-lg transition-all ${
              voteType === 'no' 
                ? 'bg-gray-700 text-white opacity-50' 
                : 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-300 hover:from-gray-400 hover:via-gray-500 hover:to-gray-400 text-gray-800 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            no
          </button>
        </div>

        {/* Comments */}
        <button
          className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-xl text-xs transition-all"
        >
          comments ({startup.comments?.length || 0})
        </button>
      </div>
    </div>
  );
}