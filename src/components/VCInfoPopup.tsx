import { useEffect } from 'react';
import { X, TrendingUp, Users, DollarSign, Globe, Target } from 'lucide-react';

interface VCInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  investor: {
    id: string;
    name: string;
    description?: string;
    tagline?: string;
    type?: string;
    stage?: string[];
    sectors?: string[];
    checkSize?: string;
    geography?: string;
    notableInvestments?: string[];
    portfolioSize?: number;
    investmentThesis?: string;
  };
}

export default function VCInfoPopup({ isOpen, onClose, investor }: VCInfoPopupProps) {
  // Handle ESC key to close modal (Accessibility)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasData = investor.investmentThesis || investor.checkSize || investor.portfolioSize || 
                  investor.geography || (investor.stage && investor.stage.length > 0) ||
                  (investor.sectors && investor.sectors.length > 0) || 
                  (investor.notableInvestments && investor.notableInvestments.length > 0) || 
                  investor.description;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div 
          className="relative bg-gradient-to-br from-cyan-900 to-blue-900 rounded-3xl p-8 border-2 border-cyan-500 shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 my-8 animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button - Fixed positioning issue */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 hover:rotate-90 transition-all duration-200 z-10"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4 animate-bounce">💼</div>
            <h2 className="text-3xl font-bold text-white mb-2">{investor.name || 'Unknown Investor'}</h2>
            {investor.tagline && (
              <p className="text-cyan-300 text-lg italic">"{investor.tagline}"</p>
            )}
            {investor.type && (
              <div className="inline-block bg-cyan-500/30 border border-cyan-400 text-cyan-200 px-4 py-1 rounded-full text-sm font-semibold mt-3 hover:bg-cyan-500/40 transition-colors">
                {investor.type}
              </div>
            )}
          </div>

          {/* Investment Thesis */}
          {investor.investmentThesis && (
            <div className="bg-white/10 rounded-xl p-4 mb-6 hover:bg-white/15 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white">Investment Philosophy</h3>
              </div>
              <p className="text-gray-300 text-sm">{investor.investmentThesis}</p>
            </div>
          )}

          {/* Key Metrics Grid - Better empty state handling */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Check Size */}
            {investor.checkSize ? (
              <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all hover:scale-105">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <h4 className="font-semibold text-white text-sm">Check Size</h4>
                </div>
                <p className="text-cyan-300 font-bold">{investor.checkSize}</p>
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-gray-500" />
                  <h4 className="font-semibold text-gray-400 text-sm">Check Size</h4>
                </div>
                <p className="text-gray-500 text-sm">Not specified</p>
              </div>
            )}

            {/* Portfolio Size */}
            {investor.portfolioSize ? (
              <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all hover:scale-105">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <h4 className="font-semibold text-white text-sm">Portfolio</h4>
                </div>
                <p className="text-cyan-300 font-bold">{investor.portfolioSize} companies</p>
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-gray-500" />
                  <h4 className="font-semibold text-gray-400 text-sm">Portfolio</h4>
                </div>
                <p className="text-gray-500 text-sm">Not specified</p>
              </div>
            )}

            {/* Geography */}
            {investor.geography ? (
              <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all hover:scale-105">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-purple-400" />
                  <h4 className="font-semibold text-white text-sm">Geography</h4>
                </div>
                <p className="text-cyan-300 font-bold">{investor.geography}</p>
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-gray-500" />
                  <h4 className="font-semibold text-gray-400 text-sm">Geography</h4>
                </div>
                <p className="text-gray-500 text-sm">Not specified</p>
              </div>
            )}

            {/* Investment Stages */}
            {investor.stage && investor.stage.length > 0 ? (
              <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all hover:scale-105">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                  <h4 className="font-semibold text-white text-sm">Stages</h4>
                </div>
                <p className="text-cyan-300 font-bold text-sm">{investor.stage.join(', ')}</p>
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                  <h4 className="font-semibold text-gray-400 text-sm">Stages</h4>
                </div>
                <p className="text-gray-500 text-sm">Not specified</p>
              </div>
            )}
          </div>

          {/* Sectors */}
          {investor.sectors && investor.sectors.length > 0 && (
            <div className="bg-white/10 rounded-xl p-4 mb-6 hover:bg-white/15 transition-colors">
              <h3 className="font-bold text-white mb-3">Focus Sectors</h3>
              <div className="flex flex-wrap gap-2">
                {investor.sectors.map((sector, idx) => (
                  <span
                    key={idx}
                    className="bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 px-3 py-1 rounded-full text-xs font-medium hover:bg-cyan-500/40 hover:scale-105 transition-all cursor-default"
                  >
                    {sector}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notable Investments */}
          {investor.notableInvestments && investor.notableInvestments.length > 0 && (
            <div className="bg-white/10 rounded-xl p-4 mb-6 hover:bg-white/15 transition-colors">
              <h3 className="font-bold text-white mb-3">🏆 Notable Investments</h3>
              <div className="space-y-2">
                {investor.notableInvestments.map((company, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full group-hover:scale-150 transition-transform"></div>
                    <span className="text-gray-300 font-medium group-hover:text-white transition-colors">{company}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {investor.description && (
            <div className="bg-white/10 rounded-xl p-4 mb-6 hover:bg-white/15 transition-colors">
              <h3 className="font-bold text-white mb-2">About</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{investor.description}</p>
            </div>
          )}

          {/* Empty State - Show when no data available */}
          {!hasData && (
            <div className="bg-white/5 rounded-xl p-8 mb-6 text-center">
              <p className="text-gray-400 text-sm">No additional information available at this time.</p>
            </div>
          )}

          {/* CTA Button - Enhanced hover effect */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/50 hover:scale-105"
          >
            Close
          </button>
        </div>
      </div>

      {/* Custom Styles - Animations & Scrollbar */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.7);
        }
      `}</style>
    </div>
  );
}
