import { useState, useEffect } from 'react';
import { useReactions } from '../hooks/useReactions';
import { useAuth } from '../hooks/useAuth';

interface Startup {
  id: number;
  name: string;
  stage?: number;
  tagline?: string;
  pitch?: string;
  fivePoints?: string[];
  raise?: string;
  yesVotes?: number;
  noVotes?: number;
  comments?: any[];
}

interface Props {
  startup: Startup;
  onVote: (vote: 'yes' | 'no', startup?: Startup) => void;
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
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [showThumbsUpFloat, setShowThumbsUpFloat] = useState(false);
  const [voteMessage, setVoteMessage] = useState<string>('');
  const [showVoteMessage, setShowVoteMessage] = useState(false);
  const [hasReactedUp, setHasReactedUp] = useState(false);
  const [hasReactedDown, setHasReactedDown] = useState(false);
  
  // Local state for anonymous reactions
  const [localReaction, setLocalReaction] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [localThumbsUpCount, setLocalThumbsUpCount] = useState(0);
  const [localThumbsDownCount, setLocalThumbsDownCount] = useState(0);

  // Get user ID for reactions
  const { userId } = useAuth();

  // Use reactions hook for authenticated users
  const { castReaction, getCounts, hasReacted, fetchUserReactions } = useReactions(startup.id.toString());
  const supabaseReactionCounts = getCounts(startup.id.toString());
  const supabaseUserReaction = hasReacted(startup.id.toString());

  // Load user's reactions on mount
  useEffect(() => {
    if (userId && !userId.startsWith('anon_')) {
      fetchUserReactions(userId);
    } else {
      // Load local reactions for anonymous users
      const localReactions = JSON.parse(localStorage.getItem('localReactions') || '{}');
      const localCounts = JSON.parse(localStorage.getItem('localReactionCounts') || '{}');
      
      if (localReactions[startup.id]) {
        setLocalReaction(localReactions[startup.id]);
      }
      
      if (localCounts[startup.id]) {
        setLocalThumbsUpCount(localCounts[startup.id].thumbs_up || 0);
        setLocalThumbsDownCount(localCounts[startup.id].thumbs_down || 0);
      }

      // Check if user has already reacted (limit 1 click per startup)
      const userReactedStartups = JSON.parse(localStorage.getItem('userReactedStartups') || '{}');
      if (userReactedStartups[startup.id]) {
        if (userReactedStartups[startup.id] === 'thumbs_up') setHasReactedUp(true);
        if (userReactedStartups[startup.id] === 'thumbs_down') setHasReactedDown(true);
      }
    }
  }, [userId]);

  // Determine which reaction/counts to display
  const isAnonymous = !userId || userId.startsWith('anon_');
  const displayReaction = isAnonymous ? localReaction : supabaseUserReaction;
  const displayThumbsUpCount = isAnonymous ? localThumbsUpCount : supabaseReactionCounts.thumbs_up_count;
  const displayThumbsDownCount = isAnonymous ? localThumbsDownCount : supabaseReactionCounts.thumbs_down_count;

  const getVotesNeeded = (stage: number) => (stage === 4 ? 1 : 5);
  const votesNeeded = getVotesNeeded(startup.stage || 1);
  const currentVotes = startup.yesVotes || 0;
  const progress = Math.min((currentVotes / votesNeeded) * 100, 100);

  const handleReaction = async (reactionType: 'thumbs_up' | 'thumbs_down') => {
    const isAnonymous = !userId || userId.startsWith('anon_');

    // Check if user already reacted
    if (reactionType === 'thumbs_up' && hasReactedUp) {
      alert('You already gave this a thumbs up! 👍');
      return;
    }
    if (reactionType === 'thumbs_down' && hasReactedDown) {
      alert('You already gave this a thumbs down! 👎');
      return;
    }

    // Check limits before reacting
    const maxThumbsUp = 100;
    const maxThumbsDown = 75;

    if (reactionType === 'thumbs_up' && displayThumbsUpCount >= maxThumbsUp) {
      alert('👍 Max thumbs up reached (100)!');
      return;
    }

    if (reactionType === 'thumbs_down' && displayThumbsDownCount >= maxThumbsDown) {
      alert('👎 Max thumbs down reached (75)!');
      return;
    }

    // Show floating animation only for thumbs up
    if (reactionType === 'thumbs_up') {
      setShowThumbsUpFloat(true);
      setTimeout(() => setShowThumbsUpFloat(false), 800);
      setHasReactedUp(true);
    } else {
      // No animation for thumbs down, just register the click
      setHasReactedDown(true);
    }

    try {
      if (isAnonymous) {
        // Track that user reacted (limit 1 per startup)
        const userReactedStartups = JSON.parse(localStorage.getItem('userReactedStartups') || '{}');
        userReactedStartups[startup.id] = reactionType;
        localStorage.setItem('userReactedStartups', JSON.stringify(userReactedStartups));

        // For anonymous: just increment the count (no toggle)
        const localCounts = JSON.parse(localStorage.getItem('localReactionCounts') || '{}');
        if (!localCounts[startup.id]) {
          localCounts[startup.id] = { thumbs_up: 0, thumbs_down: 0 };
        }
        
        // Increment the count
        if (reactionType === 'thumbs_up') {
          localCounts[startup.id].thumbs_up = Math.min(localCounts[startup.id].thumbs_up + 1, maxThumbsUp);
        } else {
          localCounts[startup.id].thumbs_down = Math.min(localCounts[startup.id].thumbs_down + 1, maxThumbsDown);
        }
        
        localStorage.setItem('localReactionCounts', JSON.stringify(localCounts));
        
        // Update local state immediately
        setLocalThumbsUpCount(localCounts[startup.id].thumbs_up);
        setLocalThumbsDownCount(localCounts[startup.id].thumbs_down);
        
        console.log('Anonymous reaction saved:', reactionType);
      } else {
        // Authenticated users: save to Supabase
        await castReaction(userId, startup.id.toString(), reactionType);
      }
    } catch (err) {
      console.error('Failed to cast reaction:', err);
    }
  };

  const handleVote = (vote: 'yes' | 'no') => {
    if (hasVoted) return;
    
    setVoteType(vote);
    setHasVoted(true);

    // Show vote message
    if (vote === 'yes') {
      setVoteMessage(`✅ ${startup.name} added to your portfolio!`);
      setShowBubbles(true);
      setTimeout(() => setShowBubbles(false), 800);
    } else {
      setVoteMessage(`❌ ${startup.name} removed from voting`);
      // No animation for NO votes, just show button depressed
    }

    // Display vote message
    setShowVoteMessage(true);
    setTimeout(() => setShowVoteMessage(false), 3000);

    onVote(vote, startup);

    // Show sign-up prompt for anonymous users after voting
    const isAnonymous = !userId || userId.startsWith('anon_');
    if (isAnonymous) {
      setTimeout(() => {
        setShowSignUpPrompt(true);
        setTimeout(() => setShowSignUpPrompt(false), 4000);
      }, 600);
    }

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

    const isAnonymous = !userId || userId.startsWith('anon_');
    
    // Store comment locally
    const localComments = JSON.parse(localStorage.getItem('localComments') || '{}');
    if (!localComments[startup.id]) localComments[startup.id] = [];
    localComments[startup.id].push({
      text: comment,
      timestamp: new Date().toISOString(),
      anonymous: isAnonymous
    });
    localStorage.setItem('localComments', JSON.stringify(localComments));

    if (isAnonymous) {
      alert('💬 Comment saved locally! Sign up to save permanently across devices.');
    } else {
      alert('💬 Comment posted!');
    }
    
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
      {showVoteMessage && (
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-white border-4 border-orange-500 px-6 py-3 rounded-2xl shadow-2xl animate-bounce">
          <p className="text-base font-black text-gray-900 whitespace-nowrap">{voteMessage}</p>
        </div>
      )}

      {showSignUpPrompt && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-400 text-black px-4 py-2 rounded-lg shadow-xl animate-bounce">
          <p className="text-sm font-bold">💾 Sign up to save your votes!</p>
        </div>
      )}

      {showThumbsUpFloat && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute text-3xl animate-float-up"
              style={{
                left: `${Math.random() * 80 + 10}%`,
                bottom: '0%',
                animationDelay: `${i * 0.08}s`,
                animationDuration: '1s'
              }}
            >
              👍
            </div>
          ))}
        </div>
      )}

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

      <div className="bg-gradient-to-br from-amber-300 via-orange-400 to-yellow-500 rounded-2xl p-5 shadow-2xl border-4 border-orange-500 relative w-full max-w-[360px] sm:w-[360px] h-auto min-h-[420px] flex flex-col mx-auto">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
        
        <div className="relative flex flex-col h-full">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                {startup.name}
              </h2>
              <p className="text-blue-700 font-bold text-base mt-0.5">
                stage #{startup.stage || 1}
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
                🤫 {startup.fivePoints && startup.fivePoints[4] ? startup.fivePoints[4] : 'Traction data available'}
              </p>
            </div>
          )}

          {startup.pitch && (
            <p className="text-lg font-black text-gray-900 leading-tight tracking-tight mb-3">
              "{startup.pitch}"
            </p>
          )}

          <div className="mb-3 space-y-1.5">
            {(startup.fivePoints || []).slice(0, 4).map((point, i) => (
              <p 
                key={i} 
                className="text-base font-black text-gray-900 leading-tight tracking-tight"
              >
                {point}
              </p>
            ))}
            {startup.raise && (
              <p className="text-base font-black text-gray-900 leading-tight tracking-tight">
                💰 {startup.raise}
              </p>
            )}
          </div>

          <div className="flex-1"></div>

          <div className="flex gap-3 mb-2">
            <button
              onClick={() => handleReaction('thumbs_up')}
              className="flex items-center gap-1 transition-all"
            >
              <span className={displayThumbsUpCount >= 10 ? "text-3xl" : "text-2xl"}>👍</span>
              <span className="font-black text-gray-900 text-lg">{displayThumbsUpCount}</span>
            </button>
            
            <button
              onClick={() => handleReaction('thumbs_down')}
              className="flex items-center gap-1 transition-all"
            >
              <span className="text-2xl">👎</span>
              <span className="font-black text-gray-900 text-lg">{displayThumbsDownCount}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className={
              startup.stage === 1 ? "text-xl" :
              startup.stage === 2 ? "text-2xl" :
              startup.stage === 3 ? "text-3xl" :
              "text-4xl"
            }>🔥</div>
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