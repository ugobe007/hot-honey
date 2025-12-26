import React from 'react';

interface EnhancedInvestorCardProps {
  investor: {
    id: string;
    name: string;
    tagline?: string;
    bio?: string;
    firm?: string;
    type?: string;
    stage?: string[];
    sectors?: string[];
    check_size?: string;
    check_size_min?: number;
    check_size_max?: number;
    geography?: string | string[];
    geography_focus?: string[];
    notable_investments?: string[] | any;
    notableInvestments?: string[];
    portfolio_size?: number;
    total_investments?: number; // Database field name
    portfolioCount?: number; // Adapter field name
    photo_url?: string;
    linkedin_url?: string;
    investment_thesis?: string;
    active_fund_size?: number;
    status?: string;
  };
  compact?: boolean;
  onClick?: () => void;
}

export default function EnhancedInvestorCard({ investor, compact = false, onClick }: EnhancedInvestorCardProps) {
  // Format check size
  const formatCheckSize = () => {
    if (investor.check_size) return investor.check_size;
    if (investor.check_size_min || investor.check_size_max) {
      const min = investor.check_size_min ? `$${(investor.check_size_min / 1000000).toFixed(1)}M` : '$0';
      const max = investor.check_size_max ? `$${(investor.check_size_max / 1000000).toFixed(0)}M` : '';
      return `${min} - ${max}`;
    }
    return null;
  };

  // Format fund size
  const formatFundSize = () => {
    if (!investor.active_fund_size) return null;
    if (investor.active_fund_size >= 1000000000) {
      return `$${(investor.active_fund_size / 1000000000).toFixed(1)}B`;
    }
    return `$${(investor.active_fund_size / 1000000).toFixed(0)}M`;
  };

  // Get geography
  const getGeography = () => {
    if (typeof investor.geography === 'string' && investor.geography) return investor.geography;
    if (Array.isArray(investor.geography) && investor.geography.length > 0) {
      return investor.geography.join(', ');
    }
    if (investor.geography_focus && investor.geography_focus.length > 0) {
      return investor.geography_focus.join(', ');
    }
    return null;
  };

  // Get notable investments (handle both field names, JSON, and object arrays)
  const getNotableInvestments = (): string[] => {
    const investments = investor.notable_investments || investor.notableInvestments;
    if (!investments) return [];
    if (Array.isArray(investments)) {
      // Check if it's an array of objects (from database) or strings
      if (investments.length > 0 && typeof investments[0] === 'object' && investments[0] !== null) {
        // Extract company names from objects like { company: 'Name', year: 2023 }
        return investments.map((inv: any) => inv.company || inv.name || String(inv)).filter(Boolean);
      }
      return investments.filter((s): s is string => typeof s === 'string');
    }
    if (typeof investments === 'string') {
      try { return JSON.parse(investments); } catch { return []; }
    }
    return [];
  };

  // Get portfolio size (handle multiple field names)
  const getPortfolioSize = () => {
    return investor.portfolio_size || investor.total_investments || investor.portfolioCount || 0;
  };

  // Get firm name (clean it up)
  const getFirmName = () => {
    if (investor.firm && investor.firm !== investor.name) {
      return investor.firm;
    }
    // Extract from name if in format "Person (Firm)"
    const match = investor.name.match(/\(([^)]+)\)/);
    return match ? match[1] : null;
  };

  const checkSize = formatCheckSize();
  const fundSize = formatFundSize();
  const geography = getGeography();
  const notableInvestments = getNotableInvestments();
  const firmName = getFirmName();
  const bio = investor.bio || investor.investment_thesis;
  const portfolioSize = getPortfolioSize();

  return (
    <div
      className={`bg-gradient-to-br from-[#1a1a1a] via-[#222222] to-[#2a2a2a] rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 cursor-pointer hover:shadow-2xl transition-all border-2 sm:border-4 border-amber-500/60 hover:border-amber-400/80 h-[380px] sm:h-[440px] flex flex-col ${compact ? 'max-w-[340px] sm:max-w-md' : 'w-full'}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`View investor ${investor.name}`}
    >
      {/* Header with photo, name, and firm */}
      <div className="flex items-start gap-3 mb-3">
        {/* Photo */}
        {investor.photo_url ? (
          <img 
            src={investor.photo_url} 
            alt={investor.name}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-500/50 object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {investor.name.charAt(0)}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-white leading-tight" style={{ wordBreak: 'break-word' }}>
            {investor.name.length > 35 ? investor.name.slice(0, 35) + '...' : investor.name}
          </h3>
          {firmName && (
            <p className="text-amber-400 text-xs sm:text-sm font-medium truncate">{firmName}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {investor.type && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-semibold uppercase border border-amber-500/40">
                {investor.type}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Bio/Thesis */}
      {bio && (
        <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 mb-3">{bio}</p>
      )}
      
      {/* Key metrics row */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
        {checkSize && (
          <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded-lg text-xs font-medium border border-green-500/30">
            💰 {checkSize}
          </span>
        )}
        {fundSize && (
          <span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg text-xs font-medium border border-amber-500/30">
            🏦 {fundSize} AUM
          </span>
        )}
        {portfolioSize > 0 && (
          <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-xs font-medium border border-blue-500/30">
            📊 {portfolioSize}+ deals
          </span>
        )}
        {geography && (
          <span className="bg-gray-500/20 text-gray-300 px-2 py-1 rounded-lg text-xs font-medium border border-gray-500/30">
            📍 {geography}
          </span>
        )}
      </div>
      
      {/* Notable investments */}
      {notableInvestments.length > 0 && (
        <div className="bg-purple-500/10 rounded-lg p-2 mb-3 border border-purple-500/20">
          <p className="text-purple-300 text-xs font-semibold mb-1">🏆 Notable Investments</p>
          <p className="text-white text-xs">
            {notableInvestments.slice(0, 4).join(' • ')}
            {notableInvestments.length > 4 && <span className="text-purple-400"> +{notableInvestments.length - 4} more</span>}
          </p>
        </div>
      )}
      
      {/* Sectors and stages */}
      <div className="flex flex-wrap gap-1.5 mt-auto">
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
    </div>
  );
}
