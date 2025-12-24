import React from 'react';

interface EnhancedInvestorCardProps {
  investor: {
    id: string;
    name: string;
    tagline?: string;
    type?: string;
    stage?: string[];
    sectors?: string[];
    check_size?: string;
    geography?: string;
    notable_investments?: string[];
    portfolio_size?: number;
    status?: string;
  };
  compact?: boolean;
  onClick?: () => void;
}

export default function EnhancedInvestorCard({ investor, compact = false, onClick }: EnhancedInvestorCardProps) {
  return (
    <div
      className={`bg-gradient-to-br from-[#1a1a1a] via-[#222222] to-[#2a2a2a] rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 cursor-pointer hover:shadow-2xl transition-all border-2 sm:border-4 border-amber-500/60 hover:border-amber-400/80 h-[340px] sm:h-[400px] flex flex-col ${compact ? 'max-w-[340px] sm:max-w-md' : 'w-full'}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`View investor ${investor.name}`}
    >
      {/* Header with name and badges */}
      <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
        <span className="text-lg sm:text-xl font-bold text-white">{investor.name}</span>
        {investor.type && (
          <span className="px-2 py-0.5 sm:py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-semibold uppercase border border-amber-500/40">
            {investor.type}
          </span>
        )}
        {investor.status && (
          <span className="px-2 py-0.5 sm:py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold border border-green-500/40">
            {investor.status}
          </span>
        )}
      </div>
      
      {/* Tagline */}
      {investor.tagline && (
        <div className="text-gray-400 mb-2 sm:mb-3 text-xs sm:text-sm line-clamp-2">{investor.tagline}</div>
      )}
      
      {/* Key metrics */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        {investor.check_size && (
          <span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg text-xs font-medium border border-amber-500/30">
            💰 {investor.check_size}
          </span>
        )}
        {investor.portfolio_size !== undefined && investor.portfolio_size > 0 && (
          <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-xs font-medium border border-blue-500/30">
            📊 {investor.portfolio_size} investments
          </span>
        )}
        {investor.geography && (
          <span className="bg-gray-500/20 text-gray-300 px-2 py-1 rounded-lg text-xs font-medium border border-gray-500/30">
            📍 {investor.geography}
          </span>
        )}
      </div>
      
      {/* Notable investments - limit on mobile */}
      {investor.notable_investments && investor.notable_investments.length > 0 && (
        <div className="mb-2 sm:mb-3 text-xs text-gray-400 line-clamp-2">
          <span className="font-semibold text-gray-300">🏆 Notable:</span>{' '}
          <span className="hidden sm:inline">{investor.notable_investments.slice(0, 4).join(', ')}</span>
          <span className="sm:hidden">{investor.notable_investments.slice(0, 2).join(', ')}</span>
          {investor.notable_investments.length > 4 && <span className="hidden sm:inline"> +{investor.notable_investments.length - 4} more</span>}
        </div>
      )}
      
      {/* Sectors and stages - limit displayed on mobile */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-auto">
        {investor.sectors && investor.sectors.slice(0, 3).map((sector) => (
          <span key={sector} className="bg-purple-500/20 text-purple-300 px-2 py-0.5 sm:py-1 rounded-lg text-xs font-medium border border-purple-500/30">
            {sector}
          </span>
        ))}
        {investor.stage && investor.stage.slice(0, 2).map((stage) => (
          <span key={stage} className="bg-teal-500/20 text-teal-300 px-2 py-0.5 sm:py-1 rounded-lg text-xs font-medium border border-teal-500/30">
            {stage}
          </span>
        ))}
      </div>
      
      {/* Click hint */}
      <p className="text-cyan-400 text-xs font-medium mt-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
        Tap to view profile →
      </p>
    </div>
  );
}
