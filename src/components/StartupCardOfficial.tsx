import { useState } from 'react';

interface Startup {
  id: number;
  name: string;
  stage?: number;
  tagline?: string;
  pitch?: string;
  fivePoints?: string[];
  secretFact?: string;
  raise?: string;
  yesVotes?: number;
  noVotes?: number;
  comments?: any[];
}

interface Props {
  startup: Startup;
  onVote: (vote: 'yes' | 'no') => void;
  onSwipeAway?: () => void;
}

export default function StartupCardOfficial({ startup, onVote, onSwipeAway }: Props) {
  const [hasVoted, setHasVoted] = useState(false);
  const [voteType, setVoteType] = useState<'yes' | 'no' | null>(null);
  const [showBubbles, setShowBubbles] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [comment, setComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [isSwipingAway, setIsSwipingAway] = useState(false);
  const [showPuff, setShowPuff] = useState(false);

  const getVotesNeeded = (stage: number) => (stage === 4 ? 1 : 5);
  const votesNeeded = getVotesNeeded(startup.stage || 1);
  const currentVotes = startup.yesVotes || 0;
  const progress = Math.min((currentVotes / votesNeeded) * 100, 100);

  const handleVote = (vote: 'yes' | 'no') => {
    if (hasVoted) return;
    
    setVoteType(vote);
    setHasVoted(true);

    if (vote === 'yes') {
      setShowBubbles(true);
      setTimeout(() => setShowBubbles(false), 800);
    }

    onVote(vote);

    setTimeout(() => {
      setShowPuff(true);
      setTimeout(() => {
        setIsSwipingAway(true);
        setTimeout(() => {
          if (onSwipeAway) onSwipeAway();
        }, 250);
      }, 150);
    }, 300);
  };

  const handleCommentSubmit = () => {
    const badWords = ['stupid', 'dumb', 'idiot', 'hate', 'terrible', 'awful', 'sucks', 'crap', 'shit', 'fuck'];
    const hasBadWords = badWords.some(word => comment.toLowerCase().includes(word));
    
    if (hasBadWords) {
      alert('❌ Please keep comments constructive and professional.');
      return;
    }

    if (comment.trim().length < 5) {
      alert('❌ Comment must be at least 5 characters.');
      return;
    }

    alert('💬 Comment posted!');
    setComment('');
    setShowCommentBox(false);
  };

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
    <div className={`relative transition-all duration-250 ease-out ${isSwipingAway ? 'transform -translate-x-full opacity-0' : ''} ${showPuff ? 'animate-puff' : ''}`}>
      {showBubbles && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-float-up"
              style={{
                left: `${Math.random() * 90 + 5}%`,
                bottom: '0%',
                animationDelay: `${i * 0.05}s`,
                animationDuration: '0.8s'
              }}
            >
              🔥
            </div>
          ))}
        </div>
      )}

      {showPuff && (
        <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-puff-cloud opacity-70"
              style={{
                animationDelay: `${i * 0.02}s`,
              }}
            >
              💨
            </div>
          ))}
        </div>
      )}

      <div className="bg-gradient-to-br from-amber-300 via-orange-400 to-yellow-500 rounded-2xl p-5 shadow-2xl border-4 border-orange-500 relative w-[360px] h-[400px] flex flex-col">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
        
        <div className="relative flex flex-col h-full">
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

          {showSecret && (
            <div className="bg-yellow-200 border-2 border-yellow-400 rounded-lg p-1.5 mb-2">
              <p className="text-[10px] font-bold text-gray-900 leading-tight">
                {startup.secretFact || '🤫 Secret fact coming soon!'}
              </p>
            </div>
          )}

          {startup.pitch && (
            <p className="text-sm font-black text-gray-900 leading-tight tracking-tight mb-3">
              "{startup.pitch}"
            </p>
          )}

          <div className="mb-3 space-y-1.5">
            {(startup.fivePoints || []).slice(0, 4).map((point, i) => (
              <p 
                key={i} 
                className={`leading-tight tracking-tight ${
                  i === 0
                    ? 'text-xs font-black text-gray-900'
                    : i === 1 || i === 2
                    ? 'text-sm font-black text-gray-900'
                    : 'text-xs font-bold text-gray-800'
                }`}
              >
                {point}
              </p>
            ))}
            {startup.raise && (
              <p className="text-xs font-black text-gray-900 leading-tight tracking-tight">
                💰 {startup.raise}
              </p>
            )}
          </div>

          <div className="flex-1"></div>

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

          <button
            onClick={() => setShowCommentBox(!showCommentBox)}
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-xl text-xs transition-all"
          >
            comments ({startup.comments?.length || 0})
          </button>

          {showCommentBox && (
            <div className="mt-2 bg-white rounded-xl p-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share feedback..."
                className="w-full px-2 py-1.5 border-2 border-orange-300 rounded-lg text-xs"
                rows={2}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-gray-500">{comment.length}/500</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setComment('');
                      setShowCommentBox(false);
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-1 px-3 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCommentSubmit}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 px-3 rounded-lg text-xs"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-300px) scale(1.5);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: float-up 0.8s ease-out forwards;
        }

        @keyframes puff {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        .animate-puff {
          animation: puff 0.15s ease-out;
        }

        @keyframes puff-cloud {
          0% {
            transform: translate(0, 0) scale(0.5);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) scale(1.8);
            opacity: 0;
          }
        }
        .animate-puff-cloud {
          --tx: calc(cos(var(--angle)) * 60px);
          --ty: calc(sin(var(--angle)) * 60px);
          animation: puff-cloud 0.4s ease-out forwards;
        }
        .animate-puff-cloud:nth-child(1) { --angle: 0deg; }
        .animate-puff-cloud:nth-child(2) { --angle: 60deg; }
        .animate-puff-cloud:nth-child(3) { --angle: 120deg; }
        .animate-puff-cloud:nth-child(4) { --angle: 180deg; }
        .animate-puff-cloud:nth-child(5) { --angle: 240deg; }
        .animate-puff-cloud:nth-child(6) { --angle: 300deg; }
      `}</style>
    </div>
  );
}