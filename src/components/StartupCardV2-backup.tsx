import { useState } from 'react';
import { colors, borderRadius, shadows, spacing } from '../design/v2-system';

interface StartupCardV2Props {
  startup: {
    id: number;
    name: string;
    tagline?: string;
    pitch?: string;
    fivePoints?: string[];
    stage?: number;
    yesVotes?: number;
    noVotes?: number;
  };
  onVote: (vote: 'yes' | 'no') => void;
  onSwipeAway?: () => void;
}

export default function StartupCardV2({ startup, onVote, onSwipeAway }: StartupCardV2Props) {
  const [showSecretInfo, setShowSecretInfo] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showFireAnimation, setShowFireAnimation] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<string[]>([]);

  const handleVote = async (vote: 'yes' | 'no') => {
    setIsVoting(true);
    
    if (vote === 'yes') {
      setShowFireAnimation(true);
      setTimeout(() => setShowFireAnimation(false), 2000);
    }

    await new Promise(resolve => setTimeout(resolve, 300));
    onVote(vote);
    setIsVoting(false);

    if (onSwipeAway) {
      setTimeout(onSwipeAway, 800);
    }
  };

  const handleSecretReveal = () => {
    setShowSecretInfo(true);
    setTimeout(() => setShowSecretInfo(false), 5000);
  };

  const addComment = () => {
    if (comment.trim()) {
      setComments([...comments, comment.trim()]);
      setComment('');
    }
  };

  const getStageProgress = () => {
    const stage = startup.stage || 1;
    const stages = [
      { name: 'CONCEPT', votes: 5, color: colors.wafer },
      { name: 'PROTOTYPE', votes: 5, color: colors.caribbeanGreen },
      { name: 'TRACTION', votes: 5, color: colors.texasRose },
      { name: 'SCALING', votes: 1, color: colors.steelGray },
    ];
    return { current: stage, stages };
  };

  const progress = getStageProgress();

  return (
    <div className="relative">
      {/* Fire Animation Overlay */}
      {showFireAnimation && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-8xl animate-bounce">🔥</div>
          <div className="absolute text-6xl animate-ping">🔥</div>
          <div className="absolute text-4xl animate-pulse">🔥</div>
        </div>
      )}

      <div
        className="w-full max-w-md mx-auto transition-all duration-500 hover:scale-105"
        style={{
          background: colors.texasRose,
          border: `3px solid ${colors.steelGray}`,
          borderRadius: borderRadius.none,
          boxShadow: shadows.strong,
          padding: spacing.lg,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-2xl font-bold"
            style={{
              color: colors.caribbeanGreen,
              fontWeight: 700,
            }}
          >
            🔥 {startup.name}
          </h2>
          <button
            onClick={handleSecretReveal}
            className="text-xl hover:scale-110 transition-transform"
            title="Reveal secret info"
          >
            🔥
          </button>
        </div>

        {/* Tagline - Bold and prominent */}
        {startup.tagline && (
          <p
            className="text-base mb-2 font-bold"
            style={{
              color: colors.snow,
              fontWeight: 700,
            }}
          >
            {startup.tagline}
          </p>
        )}

        {/* Secret Info Popup */}
        {showSecretInfo && startup.fivePoints && startup.fivePoints[4] && (
          <div
            className="mb-4 p-3 animate-pulse"
            style={{
              background: colors.steelGray,
              color: colors.snow,
              borderRadius: borderRadius.small,
            }}
          >
            <div className="text-sm font-semibold mb-2">🔥 SECRET INTEL</div>
            <p className="text-sm">{startup.fivePoints[4]}</p>
          </div>
        )}

        {/* Simplified Key Points - No boxes, tighter spacing */}
        {startup.fivePoints && (
          <div className="space-y-1 mb-6">
            {startup.fivePoints.slice(0, 4).map((point, i) => (
              <div
                key={i}
                className="text-sm"
                style={{
                  color: colors.snow,
                  fontWeight: 400,
                  lineHeight: 1.3,
                }}
              >
                <span className="font-semibold">({i + 1})</span> {point}
              </div>
            ))}
          </div>
        )}

        {/* Stage Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span
              className="text-sm font-semibold"
              style={{ color: colors.snow }}
            >
              STAGE {progress.current}/4
            </span>
            <span
              className="text-sm"
              style={{ color: colors.snow, opacity: 0.8 }}
            >
              {progress.stages[progress.current - 1]?.name || 'CONCEPT'}
            </span>
          </div>
          <div className="flex gap-1">
            {progress.stages.map((stage, idx) => (
              <div
                key={idx}
                className="flex-1 h-2"
                style={{
                  background: idx < progress.current ? colors.caribbeanGreen : colors.wafer,
                  borderRadius: borderRadius.none,
                }}
              />
            ))}
          </div>
        </div>

        {/* Voting Buttons */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => handleVote('no')}
            disabled={isVoting}
            className="flex-1 py-3 font-bold text-base transition-all hover:scale-105 disabled:opacity-50"
            style={{
              background: colors.wafer,
              color: colors.steelGray,
              border: 'none',
              borderRadius: borderRadius.none,
              boxShadow: shadows.medium,
            }}
          >
            {isVoting ? '⏳' : '❌ PASS'}
          </button>
          <button
            onClick={() => handleVote('yes')}
            disabled={isVoting}
            className="flex-1 py-3 font-bold text-base transition-all hover:scale-105 disabled:opacity-50"
            style={{
              background: colors.steelGray,
              color: colors.snow,
              border: 'none',
              borderRadius: borderRadius.none,
              boxShadow: shadows.medium,
            }}
          >
            {isVoting ? '⏳' : '🔥 INVEST'}
          </button>
        </div>
            {isVoting ? '⏳' : '❌ PASS'}
          </button>
          <button
            onClick={() => handleVote('yes')}
            disabled={isVoting}
            className="flex-1 py-4 font-bold text-lg transition-all hover:scale-105 disabled:opacity-50"
            style={{
              background: colors.texasRose,
              color: colors.snow,
              border: 'none',
              borderRadius: borderRadius.none,
              boxShadow: shadows.medium,
            }}
          >
            {isVoting ? '⏳' : '🔥 INVEST'}
          </button>
        </div>

        {/* Vote Counter */}
        <div className="flex justify-center gap-6 mb-6">
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: colors.steelGray }}
            >
              {startup.noVotes || 0}
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: colors.text.secondary }}
            >
              PASSES
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: colors.texasRose }}
            >
              {startup.yesVotes || 0}
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: colors.text.secondary }}
            >
              INVESTMENTS
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 p-3 text-sm"
              style={{
                background: colors.wafer,
                border: `1px solid ${colors.steelGray}`,
                borderRadius: borderRadius.none,
                color: colors.steelGray,
              }}
              onKeyPress={(e) => e.key === 'Enter' && addComment()}
            />
            <button
              onClick={addComment}
              className="px-4 py-3 font-semibold text-sm transition-all hover:scale-105"
              style={{
                background: colors.caribbeanGreen,
                color: colors.snow,
                border: 'none',
                borderRadius: borderRadius.none,
              }}
            >
              POST
            </button>
          </div>

          {/* Display Comments */}
          {comments.map((commentText, idx) => (
            <div
              key={idx}
              className="p-3 text-sm"
              style={{
                background: colors.snow,
                border: `1px solid ${colors.wafer}`,
                borderRadius: borderRadius.none,
                color: colors.steelGray,
              }}
            >
              💬 {commentText}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}