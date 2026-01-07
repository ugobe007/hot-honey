import React from 'react';
import { ThumbsUp, Users, DollarSign, Rocket, TrendingUp, Zap } from 'lucide-react';

interface StartupData {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  sectors?: string[];
  tags?: string[];
  stage?: number | null;
  total_god_score?: number;
  has_revenue?: boolean;
  has_customers?: boolean;
  is_launched?: boolean;
  team_size?: number;
  location?: string;
  raise_amount?: number;
  arr?: number;
  mrr?: number;
  growth_rate_monthly?: number;
  deployment_frequency?: string;
  fivePoints?: string[];
  extracted_data?: any;
}

interface EnhancedStartupCardProps {
  startup: StartupData;
  onVote?: () => void;
  onClick?: () => void;
  showVoteButton?: boolean;
}

const STAGE_NAMES: Record<number, string> = {
  0: 'Pre-Seed',
  1: 'Seed',
  2: 'Series A',
  3: 'Series B',
  4: 'Series C',
  5: 'Growth',
  6: 'Late Stage'
};

function formatMoney(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
}

const EnhancedStartupCard: React.FC<EnhancedStartupCardProps> = ({
  startup,
  onVote,
  onClick,
  showVoteButton = true
}) => {
  const s = startup as any;
  
  // Build traction signals
  const signals: { icon: React.ReactNode; label: string; color: string }[] = [];
  
  if (s.has_revenue) {
    signals.push({ icon: <DollarSign className="w-3 h-3" />, label: 'Revenue', color: 'text-green-400 bg-green-500/20 border-green-500/40' });
  }
  if (s.has_customers) {
    signals.push({ icon: <Users className="w-3 h-3" />, label: 'Customers', color: 'text-blue-400 bg-blue-500/20 border-blue-500/40' });
  }
  if (s.is_launched) {
    signals.push({ icon: <Rocket className="w-3 h-3" />, label: 'Live', color: 'text-purple-400 bg-purple-500/20 border-purple-500/40' });
  }
  if (s.growth_rate_monthly && s.growth_rate_monthly >= 15) {
    signals.push({ icon: <TrendingUp className="w-3 h-3" />, label: `${s.growth_rate_monthly}% MoM`, color: 'text-blue-400 bg-cyan-500/20 border-cyan-500/40' });
  }
  if (s.deployment_frequency === 'daily' || s.deployment_frequency === 'weekly') {
    signals.push({ icon: <Zap className="w-3 h-3" />, label: 'Fast Ship', color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40' });
  }
  
  // GOD Score badge
  const godScore = s.total_god_score || 0;
  const godColor = godScore >= 60 ? 'text-green-400' : godScore >= 45 ? 'text-blue-400' : 'text-gray-400';
  
  // Stage
  const stageName = s.stage !== null && s.stage !== undefined ? STAGE_NAMES[s.stage] : null;
  
  // Clean description
  const getDescription = () => {
    const desc = s.description || s.tagline || '';
    if (!desc || 
        desc.toLowerCase().includes('technology company that appears') ||
        desc.toLowerCase().includes('appears to have') ||
        desc.toLowerCase().includes('discovered from')) {
      return s.tagline || '';
    }
    return desc.slice(0, 80);
  };
  
  // Get fivePoints
  const fivePoints = (s.fivePoints || s.extracted_data?.fivePoints || [])
    .filter((p: string) => {
      if (!p || typeof p !== 'string') return false;
      const lower = p.toLowerCase();
      return !lower.includes('discovered from') && 
             !lower.includes('website:') && 
             !lower.startsWith('stage:') &&
             !p.includes('.com') && 
             !p.includes('.io');
    })
    .slice(0, 3);

  return (
    <div 
      onClick={onClick}
      className="bg-gradient-to-br from-[#1a1a1a] via-[#222222] to-[#2a2a2a] rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 cursor-pointer hover:shadow-2xl transition-all border-2 sm:border-4 border-cyan-500/60 hover:border-cyan-400/80 h-[380px] sm:h-[440px] flex flex-col"
    >
      {/* Header: Logo + Name + GOD Score */}
      <div className="flex items-start gap-3 mb-3">
        <img 
          src="/images/hot_badge.png" 
          alt="Hot Startup" 
          className="w-16 h-16 sm:w-20 sm:h-20 object-contain flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white leading-tight line-clamp-1">{s.name}</h3>
            {godScore > 0 && (
              <span className={`text-sm font-bold ${godColor}`}>
                {godScore}
              </span>
            )}
          </div>
          {getDescription() && (
            <p className="text-cyan-300/80 text-xs sm:text-sm italic line-clamp-2 mt-1">"{getDescription()}"</p>
          )}
        </div>
      </div>

      {/* Stage Badge */}
      {stageName && (
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 px-3 py-1 rounded-lg text-xs font-semibold">
            {stageName}
          </span>
          {s.team_size && s.team_size > 1 && (
            <span className="text-gray-400 text-xs flex items-center gap-1">
              <Users className="w-3 h-3" /> {s.team_size}
            </span>
          )}
        </div>
      )}

      {/* Traction Signals Row */}
      {signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
          {signals.slice(0, 4).map((signal, idx) => (
            <span
              key={idx}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${signal.color}`}
            >
              {signal.icon}
              {signal.label}
            </span>
          ))}
        </div>
      )}

      {/* KEY HIGHLIGHTS PANEL - Purple like investor Notable Investments */}
      {fivePoints.length > 0 && (
        <div className="bg-purple-500/10 rounded-lg p-3 mb-3 border border-purple-500/20 flex-1">
          <p className="text-purple-300 text-xs font-semibold mb-2">✨ Key Highlights</p>
          <div className="space-y-1.5">
            {fivePoints.map((point: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className="text-cyan-400 mt-0.5">✦</span>
                <p className="text-white/90 line-clamp-1">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue/Metrics Row */}
      {(s.arr || s.mrr || s.raise_amount) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(s.arr || s.mrr) && (
            <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded-lg text-xs font-medium border border-green-500/30">
              💰 {s.arr ? `${formatMoney(s.arr)} ARR` : `${formatMoney(s.mrr || 0)} MRR`}
            </span>
          )}
          {s.raise_amount && (
            <span className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-lg text-xs font-medium border border-cyan-500/30">
              🎯 Raising {formatMoney(s.raise_amount)}
            </span>
          )}
        </div>
      )}

      {/* Sector Tags - at bottom */}
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {(s.sectors || s.tags || []).slice(0, 3).map((tag: string, idx: number) => (
          <span
            key={idx}
            className="bg-purple-500/20 text-purple-300 px-2 py-0.5 sm:py-1 rounded-lg text-xs font-medium border border-purple-500/30"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Vote Button */}
      {showVoteButton && onVote && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onVote();
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 mt-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 text-white font-bold text-sm hover:from-cyan-600 hover:via-blue-600 hover:to-violet-600 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-[1.02] active:scale-[0.98]"
        >
          <ThumbsUp className="w-4 h-4" />
          Vote for {s.name?.split(' ')[0]}
        </button>
      )}
    </div>
  );
};

export default EnhancedStartupCard;
