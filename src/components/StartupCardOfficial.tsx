import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useReactions } from '../hooks/useReactions';
import { useAuth } from '../hooks/useAuth';

interface Startup {
  id: number | string;
  name: string;
  stage?: number;
  tagline?: string;
  pitch?: string;
  description?: string;
  sectors?: string[];
  team_size?: number;
  revenue_annual?: number;
  mrr?: number;
  growth_rate_monthly?: number;
  has_technical_cofounder?: boolean;
  is_launched?: boolean;
  location?: string;
  website?: string;
  linkedin?: string;
  raise_amount?: string;
  raise_type?: string;
  total_god_score?: number;
  team_score?: number;
  traction_score?: number;
  market_score?: number;
  product_score?: number;
  vision_score?: number;
  yesVotes?: number;
  noVotes?: number;
  fivePoints?: string[];
  // VIBE Score (qualitative - minimized weight)
  value_proposition?: string;
  problem?: string;
  solution?: string;
  market_size?: string;
  team_companies?: string[];
}

interface Props {
  startup: Startup;
  onVote: (vote: 'yes' | 'no', startup?: Startup) => void;
  onSwipeAway?: () => void;
}

export default function StartupCardOfficial({ startup, onVote, onSwipeAway }: Props) {
  const [hasVoted, setHasVoted] = useState(false);
  const [voteType, setVoteType] = useState<'yes' | 'no' | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showKeyPoints, setShowKeyPoints] = useState(false);
  const [isSwipingAway, setIsSwipingAway] = useState(false);
  const [showVoteMessage, setShowVoteMessage] = useState(false);
  const [voteMessage, setVoteMessage] = useState<string>('');
  
  // Reaction state
  const [localReaction, setLocalReaction] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [localThumbsUpCount, setLocalThumbsUpCount] = useState(0);
  const [localThumbsDownCount, setLocalThumbsDownCount] = useState(0);
  const [hasReactedUp, setHasReactedUp] = useState(false);
  const [hasReactedDown, setHasReactedDown] = useState(false);
  const [showThumbsUpFloat, setShowThumbsUpFloat] = useState(false);

  const { userId } = useAuth();
  const { castReaction, getCounts, hasReacted, fetchUserReactions } = useReactions(startup.id.toString());
  const supabaseReactionCounts = getCounts(startup.id.toString());
  const supabaseUserReaction = hasReacted(startup.id.toString());

  useEffect(() => {
    if (userId && !userId.startsWith('anon_')) {
      fetchUserReactions(userId);
    } else {
      const localReactions = JSON.parse(localStorage.getItem('localReactions') || '{}');
      const localCounts = JSON.parse(localStorage.getItem('localReactionCounts') || '{}');
      const userReactedStartups = JSON.parse(localStorage.getItem('userReactedStartups') || '{}');
      
      if (localReactions[startup.id]) setLocalReaction(localReactions[startup.id]);
      if (localCounts[startup.id]) {
        setLocalThumbsUpCount(localCounts[startup.id].thumbs_up || 0);
        setLocalThumbsDownCount(localCounts[startup.id].thumbs_down || 0);
      }
      if (userReactedStartups[startup.id]) {
        if (userReactedStartups[startup.id] === 'thumbs_up') setHasReactedUp(true);
        if (userReactedStartups[startup.id] === 'thumbs_down') setHasReactedDown(true);
      }
    }
  }, [userId]);

  const isAnonymous = !userId || userId.startsWith('anon_');
  const displayThumbsUpCount = isAnonymous ? localThumbsUpCount : supabaseReactionCounts.thumbs_up_count;
  const displayThumbsDownCount = isAnonymous ? localThumbsDownCount : supabaseReactionCounts.thumbs_down_count;

  const formatCurrency = (amount?: number) => {
    if (!amount || amount === 0) return null;
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  const formatGrowthRate = (rate?: number) => {
    if (!rate || rate === 0) return null;
    return `${rate > 0 ? '+' : ''}${rate}%`;
  };

  const getGODScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getGODScoreLabel = (score?: number) => {
    if (!score) return '⚪ UNSCORED';
    if (score >= 80) return '🟢 EXCELLENT';
    if (score >= 60) return '🟡 GOOD';
    if (score >= 40) return '🟠 FAIR';
    return '🔴 WEAK';
  };

  const handleReaction = async (reactionType: 'thumbs_up' | 'thumbs_down') => {
    if (reactionType === 'thumbs_up' && hasReactedUp) return;
    if (reactionType === 'thumbs_down' && hasReactedDown) return;

    const maxThumbsUp = 100;
    const maxThumbsDown = 75;

    if (reactionType === 'thumbs_up' && displayThumbsUpCount >= maxThumbsUp) return;
    if (reactionType === 'thumbs_down' && displayThumbsDownCount >= maxThumbsDown) return;

    if (reactionType === 'thumbs_up') {
      setShowThumbsUpFloat(true);
      setTimeout(() => setShowThumbsUpFloat(false), 800);
      setHasReactedUp(true);
    } else {
      setHasReactedDown(true);
    }

    try {
      if (isAnonymous) {
        const userReactedStartups = JSON.parse(localStorage.getItem('userReactedStartups') || '{}');
        userReactedStartups[startup.id] = reactionType;
        localStorage.setItem('userReactedStartups', JSON.stringify(userReactedStartups));

        const localCounts = JSON.parse(localStorage.getItem('localReactionCounts') || '{}');
        if (!localCounts[startup.id]) {
          localCounts[startup.id] = { thumbs_up: 0, thumbs_down: 0 };
        }
        
        if (reactionType === 'thumbs_up') {
          localCounts[startup.id].thumbs_up = Math.min(localCounts[startup.id].thumbs_up + 1, maxThumbsUp);
        } else {
          localCounts[startup.id].thumbs_down = Math.min(localCounts[startup.id].thumbs_down + 1, maxThumbsDown);
        }
        
        localStorage.setItem('localReactionCounts', JSON.stringify(localCounts));
        setLocalThumbsUpCount(localCounts[startup.id].thumbs_up);
        setLocalThumbsDownCount(localCounts[startup.id].thumbs_down);
      } else {
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

    if (vote === 'yes') {
      setVoteMessage(`✅ ${startup.name} added to your portfolio!`);
    } else {
      setVoteMessage(`❌ ${startup.name} removed from voting`);
    }

    setShowVoteMessage(true);
    setTimeout(() => setShowVoteMessage(false), 3000);

    onVote(vote, startup);

    setTimeout(() => {
      setIsSwipingAway(true);
      setTimeout(() => {
        if (onSwipeAway) onSwipeAway();
      }, 250);
    }, 500);
  };

  return (
    <div className={`relative transition-all duration-250 ease-out ${isSwipingAway ? 'transform -translate-x-full opacity-0' : ''}`}>
      {showVoteMessage && (
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-white border-4 border-orange-500 px-6 py-3 rounded-2xl shadow-2xl animate-bounce">
          <p className="text-base font-black text-gray-900 whitespace-nowrap">{voteMessage}</p>
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

      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl shadow-2xl overflow-hidden border-2 border-purple-400/60 hover:border-orange-400 relative hover:scale-[1.02] transition-all duration-300 w-full max-w-[480px] mx-auto hover:shadow-purple-500/30">
        {/* Header Section - Purple gradient */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-3 border-b border-purple-400">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h2 className="text-2xl font-black text-white mb-1 leading-tight">
                {startup.name}
              </h2>
              {startup.tagline && (
                <p className="text-sm text-purple-200 italic">
                  "{startup.tagline}"
                </p>
              )}
            </div>
            {startup.stage && (
              <div className="flex-shrink-0">
                <div className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 shadow-lg">
                  <span className="text-[9px] font-black text-white text-center leading-tight block">
                    STAGE {startup.stage}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* GOD Score - Orange accent */}
          {startup.total_god_score && (
            <div className="mt-2 bg-gradient-to-r from-orange-500/30 to-amber-500/30 border border-orange-400/50 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <span className="text-orange-200 text-xs font-bold">🎯 GOD SCORE</span>
                <div className="flex items-center gap-2">
                  <span className={`${getGODScoreColor(startup.total_god_score)} text-lg font-black`}>
                    {startup.total_god_score}
                  </span>
                  <span className="text-[10px] text-white/80">
                    {getGODScoreLabel(startup.total_god_score)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Key Metrics - Simple inline text */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {startup.team_size && startup.team_size > 0 && (
              <span className="text-slate-700">👥 <span className="font-bold">{startup.team_size} people</span></span>
            )}
            {formatCurrency(startup.revenue_annual) && (
              <span className="text-orange-700">💰 <span className="font-bold">{formatCurrency(startup.revenue_annual)}/yr</span></span>
            )}
            {formatCurrency(startup.mrr) && (
              <span className="text-orange-700">📊 <span className="font-bold">{formatCurrency(startup.mrr)}/mo</span></span>
            )}
            {formatGrowthRate(startup.growth_rate_monthly) && (
              <span className="text-slate-700">📈 <span className="font-bold">{formatGrowthRate(startup.growth_rate_monthly)}/mo</span></span>
            )}
          </div>

          {/* Status Indicators - Purple chips */}
          <div className="flex gap-2 flex-wrap">
            {startup.is_launched && (
              <span className="bg-purple-100 border border-purple-300 text-purple-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
                🚀 LAUNCHED
              </span>
            )}
            {startup.has_technical_cofounder && (
              <span className="bg-purple-100 border border-purple-300 text-purple-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
                💻 TECH COFOUNDER
              </span>
            )}
            {startup.location && (
              <span className="bg-slate-100 border border-slate-300 text-slate-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
                📍 {startup.location}
              </span>
            )}
          </div>

          {/* Sectors - Orange chips */}
          {startup.sectors && startup.sectors.length > 0 && (
            <div>
              <p className="text-purple-600 text-[10px] font-black mb-2">🏭 SECTORS</p>
              <div className="flex flex-wrap gap-1.5">
                {startup.sectors.slice(0, 3).map((sector, idx) => (
                  <span key={idx} className="bg-orange-50 border border-orange-300 text-orange-700 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                    {sector}
                  </span>
                ))}
                {startup.sectors.length > 3 && (
                  <span className="bg-orange-50 border border-orange-300 text-orange-700 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                    +{startup.sectors.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* VIBE Score - Qualitative startup story */}
          {(startup.value_proposition || startup.problem || startup.solution || startup.market_size || startup.team_companies || startup.raise_amount) && (
            <div className="space-y-1 bg-purple-50 rounded-lg p-3 border border-purple-200">
              {/* VIBE 1. Value Prop */}
              {(startup.value_proposition || startup.problem) && (
                <p className="text-purple-900 font-bold text-sm">
                  {startup.value_proposition || startup.problem}
                </p>
              )}
              
              {/* 2. Market Size */}
              {startup.market_size && (
                <p className="text-purple-700 font-medium text-sm">
                  {startup.market_size}
                </p>
              )}
              
              {/* 3. Solution */}
              {startup.solution && (
                <p className="text-purple-700 font-medium text-sm">
                  {startup.solution}
                </p>
              )}
              
              {/* 4. Team Companies */}
              {startup.team_companies && startup.team_companies.length > 0 && (
                <p className="text-purple-700 font-medium text-sm">
                  {startup.team_companies.join(', ')}
                </p>
              )}
              
              {/* 5. Investment Amount */}
              {startup.raise_amount && (
                <p className="text-orange-600 font-bold text-sm">
                  💰 {startup.raise_amount}
                  {startup.raise_type && ` ${startup.raise_type}`}
                </p>
              )}
            </div>
          )}

          {/* Pitch/Description */}
          {(startup.pitch || startup.description) && (
            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-gray-600 font-black text-xs mb-1 hover:text-gray-800 transition-colors flex items-center gap-1"
              >
                <span>{showDetails ? '▼' : '▶'}</span>
                <span>📋 ABOUT</span>
              </button>
              {showDetails && (
                <p className="text-gray-700 text-xs leading-relaxed mt-2">
                  {startup.pitch || startup.description}
                </p>
              )}
            </div>
          )}

          {/* Five Points - Collapsible */}
          {startup.fivePoints && startup.fivePoints.length > 0 && (
            <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
              <button
                onClick={() => setShowKeyPoints(!showKeyPoints)}
                className="text-orange-600 font-black text-xs hover:text-orange-700 transition-colors flex items-center gap-1 w-full"
              >
                <span>{showKeyPoints ? '▼' : '▶'}</span>
                <span>✨ KEY POINTS ({startup.fivePoints.length})</span>
              </button>
              {showKeyPoints && (
                <div className="space-y-1.5 mt-2">
                  {startup.fivePoints.slice(0, 5).map((point, idx) => (
                    <div key={idx} className="text-gray-700 text-xs flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation & Social Links */}
          <div className="space-y-2">
            {/* View Details Button - Always Shown */}
            <Link
              to={`/startup/${startup.id}`}
              className="w-full block bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black py-3 px-4 rounded-xl text-center transition-all shadow-lg shadow-orange-500/30 border-2 border-orange-400 text-sm"
            >
              📊 VIEW FULL PROFILE
            </Link>

            {/* Social Links */}
            {(startup.website || startup.linkedin) && (
              <div className="grid grid-cols-2 gap-2">
                {startup.website && (
                  <a
                    href={startup.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-3 rounded-lg text-center transition-all text-xs border border-gray-200"
                  >
                    🌐 Website
                  </a>
                )}
                {startup.linkedin && (
                  <a
                    href={startup.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 px-3 rounded-lg text-center transition-all text-xs border border-blue-400"
                  >
                    💼 LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Vote Buttons - Compact */}
          {!hasVoted && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleVote('yes')}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black py-2 px-3 rounded-lg transition-all shadow-md shadow-orange-500/30 border border-orange-400 text-xs"
              >
                🍯 SWEET!
              </button>
              <button
                onClick={() => handleVote('no')}
                className="bg-white hover:bg-gray-50 text-gray-600 font-black py-2 px-3 rounded-lg transition-all shadow-md border border-gray-300 text-xs"
              >
                👋 PASS
              </button>
            </div>
          )}

          {hasVoted && (
            <div className={`text-center py-2 px-3 rounded-lg font-black text-xs ${
              voteType === 'yes' 
                ? 'bg-green-500/20 border border-green-400 text-green-300'
                : 'bg-red-500/20 border border-red-400 text-red-300'
            }`}>
              {voteType === 'yes' ? '✅ PORTFOLIO' : '❌ PASSED'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
