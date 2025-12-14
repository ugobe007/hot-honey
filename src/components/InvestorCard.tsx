import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InvestorFirm } from '../data/investorData';

interface InvestorCardProps {
  investor: InvestorFirm;
  onContact?: (investorId: number | string) => void;
  showEdit?: boolean;
}

export default function InvestorCard({ investor, onContact, showEdit = false }: InvestorCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'vc_firm': 
      case 'VC Firm': return '💼 VC';
      case 'accelerator':
      case 'Accelerator': return '🚀 ACCEL';
      case 'angel_network':
      case 'Angel': return '👼 ANGEL';
      case 'corporate_vc':
      case 'Corporate VC': return '🏢 CVC';
      default: return '💰 VC';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return null;
    if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(0)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  return (
    <Link 
      to={`/investor/${investor.id}`}
      className="block bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl shadow-xl overflow-hidden border-2 border-purple-400/60 hover:border-orange-400 relative hover:scale-[1.02] transition-all duration-300 w-full max-w-[420px] hover:shadow-purple-500/30"
    >
      {/* Header Section - Purple gradient */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-3 border-b border-purple-400">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-2">
            <h2 className="text-xl font-black text-white leading-tight truncate">
              {investor.name}
            </h2>
            {investor.tagline && (
              <p className="text-xs text-purple-200 italic truncate mt-0.5">
                {investor.tagline}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <div className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
              <span className="text-[9px] font-black text-white">
                {getTypeLabel(investor.type)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Key Metrics Row - Silver/slate boxes */}
        <div className="grid grid-cols-3 gap-1.5">
          {(investor.activeFundSize || investor.fundSize || investor.aum) && (
            <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg p-2 border border-orange-300">
              <p className="text-orange-700 text-[8px] font-black">💰 FUND</p>
              <p className="text-orange-900 font-black text-xs">
                {formatCurrency(investor.activeFundSize) || investor.fundSize || investor.aum}
              </p>
            </div>
          )}
          {investor.checkSize && (
            <div className="bg-slate-100 rounded-lg p-2 border border-slate-300">
              <p className="text-slate-600 text-[8px] font-black">💵 CHECK</p>
              <p className="text-slate-800 font-bold text-xs truncate">{investor.checkSize}</p>
            </div>
          )}
          {investor.portfolioCount && (
            <div className="bg-slate-100 rounded-lg p-2 border border-slate-300">
              <p className="text-slate-600 text-[8px] font-black">🏢 PORT</p>
              <p className="text-slate-800 font-bold text-xs">{investor.portfolioCount}+</p>
            </div>
          )}
        </div>

        {/* Stage Focus - Purple chips */}
        {investor.stage && investor.stage.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {investor.stage.slice(0, 3).map((stage, idx) => (
              <span key={idx} className="bg-purple-100 border border-purple-300 text-purple-700 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                {stage.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Sectors - Orange chips */}
        {investor.sectors && investor.sectors.length > 0 && investor.sectors[0] !== 'all' && (
          <div className="flex flex-wrap gap-1">
            {investor.sectors.slice(0, 4).map((sector, idx) => (
              <span key={idx} className="bg-orange-50 border border-orange-300 text-orange-700 px-2 py-0.5 rounded-full text-[9px] font-semibold">
                {sector}
              </span>
            ))}
            {investor.sectors.length > 4 && (
              <span className="text-orange-500 text-[9px] font-bold">+{investor.sectors.length - 4}</span>
            )}
          </div>
        )}

        {/* Notable Investments - Compact */}
        {investor.notableInvestments && investor.notableInvestments.length > 0 && (
          <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
            <p className="text-purple-600 text-[9px] font-black mb-1">⭐ NOTABLE</p>
            <p className="text-purple-800 text-xs font-medium truncate">
              {investor.notableInvestments.slice(0, 3).map(inv => 
                typeof inv === 'string' ? inv : (inv as any).name || (inv as any).company
              ).join(' • ')}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
