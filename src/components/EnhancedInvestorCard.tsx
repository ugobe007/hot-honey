import React, { useState } from 'react';
import { 
  Star, 
  DollarSign, 
  MapPin, 
  Briefcase, 
  TrendingUp, 
  ChevronRight,
  Building2,
  Target,
  Globe,
  Award,
  Users,
  ExternalLink
} from 'lucide-react';

interface Investor {
  id: string;
  name: string;
  description?: string;
  tagline?: string;
  type?: string;
  stage?: string[];
  sectors?: string[];
  tags?: string[];
  checkSize?: string;
  geography?: string;
  notableInvestments?: string[];
  portfolioSize?: number;
  aum?: string;
  fundSize?: string;
  exits?: number;
  unicorns?: number;
  website?: string;
  linkedin?: string;
  twitter?: string;
  investmentThesis?: string;
  partners?: string[] | string | null;
  status?: string;
}

interface EnhancedInvestorCardProps {
  investor: Investor;
  matchScore?: number;
  onClick?: () => void;
  compact?: boolean;
}

const EnhancedInvestorCard: React.FC<EnhancedInvestorCardProps> = ({ 
  investor, 
  matchScore,
  onClick,
  compact = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Format check size display
  const formatCheckSize = () => {
    if (investor.checkSize) return investor.checkSize;
    return 'Contact for details';
  };

  // Get investor type
  const getInvestorType = () => {
    return investor.type || 'Investor';
  };

  // Get investor type badge color
  const getTypeBadgeColor = () => {
    return 'from-cyan-500 to-blue-500'; // Always use cyan/blue for professional look
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (compact) {
    // Compact version for matching engine - with height restriction and expandable view
    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative p-4 rounded-2xl transition-all duration-300
          bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1e1b4b]
          border-4 border-indigo-500/40
          ${isHovered ? 'shadow-2xl shadow-indigo-500/30 border-indigo-400/60' : 'shadow-lg shadow-indigo-900/50'}
          backdrop-blur-xl
          ${!isExpanded ? 'max-h-[450px]' : ''}
        `}
      >
        {/* Scrollable content area */}
        <div className={`${!isExpanded ? 'max-h-[370px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-slate-800' : ''}`}>
          <div onClick={onClick} className="cursor-pointer">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              {/* Name button and type */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-cyan-400 flex-1">
                    {investor.name}
                  </h3>
                  {/* Fire Icon - Larger */}
                  <div className="flex-shrink-0">
                    <img src="/images/fire-icon.svg" alt="Hot" className="w-12 h-12" />
                  </div>
                </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white bg-green-500/90">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              {getInvestorType()}
            </span>
          </div>
        </div>

        {/* Check size - prominent display */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Check Size</span>
          </div>
          <div className="text-xl font-bold text-white">
            {formatCheckSize()}
          </div>
        </div>

        {/* Notable investments */}
        {investor.notableInvestments && investor.notableInvestments.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Portfolio</span>
            </div>
            <div className="text-white text-sm leading-relaxed">
              {investor.notableInvestments.slice(0, 5).join(', ')}
              {investor.notableInvestments.length > 5 && (
                <span className="text-slate-400"> +{investor.notableInvestments.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        {/* Investment Thesis */}
        {investor.investmentThesis && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Investment Thesis</span>
            </div>
            <div className="text-white text-sm leading-relaxed">
              {investor.investmentThesis}
            </div>
          </div>
        )}

        {/* Fund Details */}
        {(investor.fundSize || investor.portfolioSize || investor.exits || investor.aum) && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Fund Details</span>
            </div>
            <div className="space-y-1">
              {investor.fundSize && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Fund Size</span>
                  <span className="text-white text-sm font-bold">{investor.fundSize}</span>
                </div>
              )}
              {investor.aum && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">AUM</span>
                  <span className="text-white text-sm font-bold">{investor.aum}</span>
                </div>
              )}
              {investor.portfolioSize && investor.portfolioSize > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Portfolio</span>
                  <span className="text-white text-sm font-bold">{investor.portfolioSize}</span>
                </div>
              )}
              {investor.exits && investor.exits > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Exits</span>
                  <span className="text-white text-sm font-bold">{investor.exits}</span>
                </div>
              )}
              {investor.unicorns && investor.unicorns > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Unicorns</span>
                  <span className="text-white text-sm font-bold">{investor.unicorns}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sectors */}
        {investor.sectors && investor.sectors.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sectors</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {investor.sectors.slice(0, 3).map((sector, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded text-teal-300 text-xs font-medium"
                >
                  {sector}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* Stages */}
        {investor.stage && investor.stage.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Stage</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {investor.stage.map((stg, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded text-indigo-300 text-xs font-medium"
                >
                  {stg}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-4">
            {investor.portfolioSize && investor.portfolioSize > 0 && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">{investor.portfolioSize} investments</span>
              </div>
            )}
            {investor.geography && (
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">{investor.geography}</span>
              </div>
            )}
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-400">Active Investor</span>
          </div>
        </div>

          </div>
        </div>

        {/* Expand/Collapse button */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#1e1b4b] to-transparent pointer-events-none" />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-full mt-3 py-2 text-center text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-2"
        >
          {isExpanded ? (
            <>
              <ChevronRight className="w-4 h-4 rotate-[-90deg]" />
              Show Less
            </>
          ) : (
            <>
              <ChevronRight className="w-4 h-4 rotate-90" />
              Show More
            </>
          )}
        </button>

        {/* Click hint */}
        <div className={`absolute bottom-16 right-4 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-1 text-purple-400">
            <span className="text-sm">View Profile</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  // Full card version for investor directory/profile
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative p-8 rounded-3xl cursor-pointer transition-all duration-300
        bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1e1b4b]
        border-4 border-indigo-500/40 hover:border-indigo-400/60
        ${isHovered ? 'shadow-2xl shadow-indigo-500/30' : 'shadow-lg shadow-indigo-900/50'}
      `}
    >
      {/* Match score badge (if provided) */}
      {matchScore && (
        <div className="absolute -top-3 -right-3">
          <div className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold shadow-lg">
            {matchScore}% Match
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex items-start gap-6 mb-6">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-3xl font-bold text-cyan-400">
              {investor.name}
            </h2>
            {(investor.linkedin || investor.twitter) && (
              <a 
                href={investor.linkedin || investor.twitter} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-white/10 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-5 h-5 text-gray-400 hover:text-white" />
              </a>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${getTypeBadgeColor()}`}>
              {getInvestorType()}
            </span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-400">Active</span>
            </div>
          </div>
          
          {investor.tagline && (
            <p className="mt-3 text-gray-400">
              {investor.tagline}
            </p>
          )}
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-xl bg-white/5">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-lg font-bold text-white">{formatCheckSize()}</div>
          <div className="text-xs text-gray-500">Check Size</div>
        </div>
        <div className="text-center border-x border-white/10">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Briefcase className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white">{investor.portfolioSize || '—'}</div>
          <div className="text-xs text-gray-500">Portfolio</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Globe className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-white">{investor.geography || 'Global'}</div>
          <div className="text-xs text-gray-500">Geography</div>
        </div>
      </div>

      {/* Notable investments */}
      {investor.notableInvestments && investor.notableInvestments.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-semibold text-white">Notable Investments</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {investor.notableInvestments.map((company, idx) => (
              <span
                key={idx}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500/30 to-amber-500/30 text-orange-200 text-sm font-medium border border-orange-400/50 shadow-sm shadow-orange-500/20"
              >
                {company}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fund Details */}
      {(investor.fundSize || investor.portfolioSize || investor.exits || investor.aum) && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold text-white">Fund Details</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {investor.fundSize && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Fund Size:</span>
                <span className="text-white text-sm font-bold">{investor.fundSize}</span>
              </div>
            )}
            {investor.aum && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">AUM:</span>
                <span className="text-white text-sm font-bold">{investor.aum}</span>
              </div>
            )}
            {investor.portfolioSize && investor.portfolioSize > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Portfolio:</span>
                <span className="text-white text-sm font-bold">{investor.portfolioSize}</span>
              </div>
            )}
            {investor.exits && investor.exits > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Exits:</span>
                <span className="text-green-400 text-sm font-bold">{investor.exits}</span>
              </div>
            )}
            {investor.unicorns && investor.unicorns > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Unicorns:</span>
                <span className="text-white text-sm font-bold">{investor.unicorns}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Investment focus */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sectors */}
        {investor.sectors && investor.sectors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Focus Sectors</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {investor.sectors.map((sector, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-sm border border-cyan-500/30"
                >
                  {sector}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stages */}
        {investor.stage && investor.stage.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-semibold text-white">Investment Stages</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {investor.stage.map((stg, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-sm border border-purple-500/30"
                >
                  {stg}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTA footer */}
      <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
        <div className="text-gray-400 text-sm">
          Click to view full profile
        </div>
        <button className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/40 hover:to-indigo-600/40 text-white font-semibold transition-all border border-purple-500/30 hover:border-purple-400/50">
          Connect
        </button>
      </div>
    </div>
  );
};

export default EnhancedInvestorCard;
