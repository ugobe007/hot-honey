import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InvestorFirm } from '../data/investorData';

interface InvestorCardProps {
  investor: InvestorFirm;
  onContact?: (investorId: number | string) => void;
  showEdit?: boolean;
}

export default function InvestorCard({ investor, onContact, showEdit = true }: InvestorCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vc_firm': return 'from-blue-600 to-blue-800';
      case 'accelerator': return 'from-green-600 to-green-800';
      case 'angel_network': return 'from-purple-600 to-purple-800';
      case 'corporate_vc': return 'from-orange-600 to-orange-800';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'vc_firm': return '💼 VC FIRM';
      case 'accelerator': return '🚀 ACCELERATOR';
      case 'angel_network': return '👼 ANGEL NETWORK';
      case 'corporate_vc': return '🏢 CORPORATE VC';
      default: return '💰 INVESTOR';
    }
  };

  const getInvestmentBadge = () => {
    const count = investor.hotHoneyInvestments || 0;
    if (count >= 10) return { emoji: '🔥', text: 'MEGA INVESTOR', color: 'text-red-400' };
    if (count >= 5) return { emoji: '⭐', text: 'ACTIVE', color: 'text-yellow-400' };
    if (count >= 1) return { emoji: '✨', text: 'INVESTED', color: 'text-green-400' };
    return { emoji: '👀', text: 'WATCHING', color: 'text-gray-400' };
  };

  const badge = getInvestmentBadge();

  return (
    <div className={`bg-gradient-to-br ${getTypeColor(investor.type)} rounded-2xl shadow-xl overflow-hidden border-2 border-yellow-400 relative hover:scale-105 transition-transform duration-300`}>
      {/* Type Badge - Top Right */}
      <div className="absolute top-2 right-2 z-10">
        <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center transform -rotate-12 shadow-lg border-2 border-yellow-500">
          <span className="text-[10px] font-black text-gray-900 text-center leading-tight">
            {getTypeLabel(investor.type).split(' ')[0]}<br/>{getTypeLabel(investor.type).split(' ')[1]}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Firm Name */}
        <h2 className="text-2xl font-black text-yellow-400 mb-1 pr-20">
          {investor.name}
        </h2>

        {/* Tagline */}
        {investor.tagline && (
          <p className="text-sm text-white/90 italic mb-3">
            "{investor.tagline}"
          </p>
        )}

        {/* Hot Honey Activity Badge */}
        {investor.hotHoneyInvestments !== undefined && investor.hotHoneyInvestments > 0 && (
          <div className="mb-3">
            <span className={`${badge.color} font-bold text-sm`}>
              {badge.emoji} {badge.text}
            </span>
            <span className="text-yellow-300 font-semibold text-sm ml-2">
              • {investor.hotHoneyInvestments} investment{investor.hotHoneyInvestments !== 1 ? 's' : ''} on Hot Honey
            </span>
          </div>
        )}

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {investor.checkSize && (
            <div className="bg-white/10 rounded-lg p-2">
              <p className="text-yellow-400 text-[10px] font-bold mb-1">💰 CHECK SIZE</p>
              <p className="text-white font-bold text-sm">{investor.checkSize}</p>
            </div>
          )}
          {investor.portfolioCount && (
            <div className="bg-white/10 rounded-lg p-2">
              <p className="text-yellow-400 text-[10px] font-bold mb-1">📊 PORTFOLIO</p>
              <p className="text-white font-bold text-sm">{investor.portfolioCount}+ cos</p>
            </div>
          )}
          {investor.aum && (
            <div className="bg-white/10 rounded-lg p-2">
              <p className="text-yellow-400 text-[10px] font-bold mb-1">💼 AUM</p>
              <p className="text-white font-bold text-sm">{investor.aum}</p>
            </div>
          )}
          {investor.unicorns && investor.unicorns > 0 && (
            <div className="bg-white/10 rounded-lg p-2">
              <p className="text-yellow-400 text-[10px] font-bold mb-1">🦄 UNICORNS</p>
              <p className="text-white font-bold text-sm">{investor.unicorns}</p>
            </div>
          )}
        </div>

        {/* Investment Focus */}
        {investor.stage && investor.stage.length > 0 && (
          <div className="mb-3">
            <p className="text-yellow-400 text-[10px] font-bold mb-2">🎯 STAGE FOCUS</p>
            <div className="flex flex-wrap gap-1">
              {investor.stage.slice(0, 3).map((stage, idx) => (
                <span key={idx} className="bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                  {stage.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sectors */}
        {investor.sectors && investor.sectors.length > 0 && investor.sectors[0] !== 'all' && (
          <div className="mb-4">
            <p className="text-yellow-400 text-xs font-bold mb-2">🏭 SECTORS</p>
            <div className="flex flex-wrap gap-2">
              {investor.sectors.slice(0, 5).map((sector, idx) => (
                <span key={idx} className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  {sector}
                </span>
              ))}
              {investor.sectors.length > 5 && (
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  +{investor.sectors.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Notable Investments */}
        {investor.notableInvestments && investor.notableInvestments.length > 0 && (
          <div className="mb-4">
            <p className="text-yellow-400 text-xs font-bold mb-2">⭐ NOTABLE INVESTMENTS</p>
            <p className="text-white text-sm">
              {investor.notableInvestments.slice(0, 6).join(', ')}
              {investor.notableInvestments.length > 6 && ' & more'}
            </p>
          </div>
        )}

        {/* Description (Collapsible) */}
        {investor.description && (
          <div className="mb-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-yellow-400 font-bold text-xs mb-1 hover:text-yellow-300 transition-colors"
            >
              {showDetails ? '▼' : '▶'} About
            </button>
            {showDetails && (
              <p className="text-white/80 text-xs leading-relaxed">
                {investor.description}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mb-2">
          {investor.website && (
            <a
              href={investor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-2 rounded-lg text-center transition-all text-xs"
            >
              🌐 Site
            </a>
          )}
          {investor.linkedin && (
            <a
              href={investor.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-2 rounded-lg text-center transition-all text-xs"
            >
              💼 In
            </a>
          )}
        </div>

        {/* Edit Button (Admin Only) */}
        {showEdit && (
          <Link
            to={`/investor/${investor.id}/edit`}
            className="w-full block bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2 px-2 rounded-lg text-center transition-all shadow-lg mb-2 text-xs"
          >
            ✏️ Edit
          </Link>
        )}

        {/* Contact Button */}
        {onContact && (
          <button
            onClick={() => onContact(investor.id)}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-2 px-2 rounded-lg transition-all shadow-lg text-xs"
          >
            📧 Contact
          </button>
        )}

        {/* Hot Honey Startups */}
        {investor.hotHoneyStartups && investor.hotHoneyStartups.length > 0 && (
          <div className="mt-4 bg-green-500/20 border-2 border-green-400 rounded-xl p-4">
            <p className="text-green-400 font-bold text-sm mb-2">
              🍯 Invested via Hot Honey
            </p>
            <p className="text-white text-sm">
              {investor.hotHoneyStartups.join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
