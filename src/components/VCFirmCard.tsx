import { Link } from 'react-router-dom';

interface VCFirmCardProps {
  company: {
    id: number | string;
    name: string;
    tagline?: string;
    type?: string;
    fundSize?: string;
    checkSize?: string;
    portfolioCount?: number;
    stage?: string[];
    sectors?: string[];
    notableInvestments?: string[];
    investmentCount?: number;
  };
}

export default function VCFirmCard({ company }: VCFirmCardProps) {
  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'vc_firm': 
      case 'VC Firm': return '💼 VC';
      case 'accelerator':
      case 'Accelerator': return '🚀 ACCEL';
      case 'Angel': return '👼 ANGEL';
      case 'Corporate VC': return '🏢 CVC';
      default: return '💰 VC';
    }
  };

  return (
    <Link 
      to={`/investor/${company.id}`}
      className="block bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl shadow-xl overflow-hidden border-2 border-purple-400/60 hover:border-orange-400 relative hover:scale-[1.02] transition-all duration-300 w-full max-w-[420px] hover:shadow-purple-500/30"
    >
      {/* Header - Purple gradient */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-3 border-b border-purple-400">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-2">
            <h2 className="text-xl font-black text-white leading-tight truncate">
              {company?.name || 'Unknown VC'}
            </h2>
            {company?.tagline && (
              <p className="text-xs text-purple-200 italic truncate mt-0.5">
                {company.tagline}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <div className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
              <span className="text-[9px] font-black text-white">
                {getTypeLabel(company?.type)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Key Metrics - Silver boxes with orange accent */}
        <div className="grid grid-cols-3 gap-1.5">
          {company?.fundSize && (
            <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg p-2 border border-orange-300">
              <p className="text-orange-700 text-[8px] font-black">💰 FUND</p>
              <p className="text-orange-900 font-black text-xs truncate">{company.fundSize}</p>
            </div>
          )}
          {company?.checkSize && (
            <div className="bg-slate-100 rounded-lg p-2 border border-slate-300">
              <p className="text-slate-600 text-[8px] font-black">💵 CHECK</p>
              <p className="text-slate-800 font-bold text-xs truncate">{company.checkSize}</p>
            </div>
          )}
          {company?.portfolioCount && company.portfolioCount > 0 && (
            <div className="bg-slate-100 rounded-lg p-2 border border-slate-300">
              <p className="text-slate-600 text-[8px] font-black">🏢 PORT</p>
              <p className="text-slate-800 font-bold text-xs">{company.portfolioCount}+</p>
            </div>
          )}
        </div>

        {/* Stage Focus - Purple chips */}
        {company?.stage && company.stage.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {company.stage.slice(0, 3).map((stage, idx) => (
              <span key={idx} className="bg-purple-100 border border-purple-300 text-purple-700 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                {stage.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Sectors - Orange chips */}
        {company?.sectors && company.sectors.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {company.sectors.slice(0, 4).map((sector, idx) => (
              <span key={idx} className="bg-orange-50 border border-orange-300 text-orange-700 px-2 py-0.5 rounded-full text-[9px] font-semibold">
                {sector}
              </span>
            ))}
            {company.sectors.length > 4 && (
              <span className="text-orange-500 text-[9px] font-bold">+{company.sectors.length - 4}</span>
            )}
          </div>
        )}

        {/* Notable Investments */}
        {company?.notableInvestments && company.notableInvestments.length > 0 && (
          <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
            <p className="text-purple-600 text-[9px] font-black mb-1">⭐ NOTABLE</p>
            <p className="text-purple-800 text-xs font-medium truncate">
              {company.notableInvestments.slice(0, 3).join(' • ')}
            </p>
          </div>
        )}

        {/* Hot Honey Activity */}
        {company?.investmentCount && company.investmentCount > 0 && (
          <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg p-2 border border-orange-300">
            <p className="text-orange-700 text-[9px] font-black">🍯 HOT HONEY</p>
            <p className="text-orange-900 font-bold text-xs">
              {company.investmentCount} investment{company.investmentCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}