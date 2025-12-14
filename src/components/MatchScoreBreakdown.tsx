import React from 'react';
import { X, Target, TrendingUp, MapPin, DollarSign, Zap, Briefcase } from 'lucide-react';

interface MatchScoreBreakdownProps {
  isOpen: boolean;
  onClose: () => void;
  matchScore: number;
  breakdown: {
    industryMatch: number;
    stageMatch: number;
    geographyMatch: number;
    checkSizeMatch: number;
    thesisAlignment: number;
  };
  startupName: string;
  investorName: string;
}

const MatchScoreBreakdown: React.FC<MatchScoreBreakdownProps> = ({
  isOpen,
  onClose,
  matchScore,
  breakdown,
  startupName,
  investorName,
}) => {
  if (!isOpen) return null;

  const ProgressBar = ({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: any }) => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="text-white font-medium">{label}</span>
        </div>
        <span className={`text-xl font-bold ${color}`}>{value}%</span>
      </div>
      <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${
            value >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
            value >= 70 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
            value >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
            'bg-gradient-to-r from-orange-500 to-red-500'
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  const getMatchQuality = (score: number) => {
    if (score >= 90) return { label: 'Exceptional Match', color: 'text-green-400', emoji: '🎯' };
    if (score >= 80) return { label: 'Strong Match', color: 'text-cyan-400', emoji: '✨' };
    if (score >= 70) return { label: 'Good Match', color: 'text-blue-400', emoji: '👍' };
    return { label: 'Potential Match', color: 'text-yellow-400', emoji: '💡' };
  };

  const quality = getMatchQuality(matchScore);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-3xl p-8 max-w-2xl w-full border-2 border-purple-500/50 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{quality.emoji}</span>
              <h2 className="text-3xl font-bold text-white">Match Score Breakdown</h2>
            </div>
            <p className="text-gray-300 text-sm">
              Why <span className="text-orange-400 font-semibold">{startupName}</span> and{' '}
              <span className="text-cyan-400 font-semibold">{investorName}</span> are a great fit
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors ml-4"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Overall Score */}
        <div className="bg-white/10 rounded-2xl p-6 mb-8 border border-white/20">
          <div className="text-center">
            <div className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              {matchScore}%
            </div>
            <div className={`text-xl font-semibold ${quality.color} mb-2`}>
              {quality.label}
            </div>
            <p className="text-gray-400 text-sm">
              AI-calculated compatibility score
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 mb-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Score Components
          </h3>

          <ProgressBar
            label="Industry Alignment"
            value={breakdown.industryMatch}
            color="text-cyan-400"
            icon={Target}
          />

          <ProgressBar
            label="Stage Fit"
            value={breakdown.stageMatch}
            color="text-purple-400"
            icon={TrendingUp}
          />

          <ProgressBar
            label="Geography Match"
            value={breakdown.geographyMatch}
            color="text-emerald-400"
            icon={MapPin}
          />

          <ProgressBar
            label="Check Size Compatibility"
            value={breakdown.checkSizeMatch}
            color="text-green-400"
            icon={DollarSign}
          />

          <ProgressBar
            label="Investment Thesis Alignment"
            value={breakdown.thesisAlignment}
            color="text-orange-400"
            icon={Briefcase}
          />
        </div>

        {/* Why This Matters */}
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-5 border border-purple-500/30 mb-6">
          <h4 className="text-white font-bold mb-3 flex items-center gap-2">
            <span className="text-xl">💡</span>
            Why This Match Works
          </h4>
          <div className="space-y-2 text-gray-300 text-sm">
            {breakdown.industryMatch >= 80 && (
              <p>• <span className="text-cyan-400">Strong sector alignment</span> - investor actively seeks deals in this space</p>
            )}
            {breakdown.stageMatch >= 80 && (
              <p>• <span className="text-purple-400">Perfect stage timing</span> - investor focuses on this stage of growth</p>
            )}
            {breakdown.geographyMatch >= 80 && (
              <p>• <span className="text-emerald-400">Geographic advantage</span> - investor has local presence and network</p>
            )}
            {breakdown.checkSizeMatch >= 80 && (
              <p>• <span className="text-green-400">Check size match</span> - funding ask aligns with typical investment range</p>
            )}
            {breakdown.thesisAlignment >= 80 && (
              <p>• <span className="text-orange-400">Thesis alignment</span> - company fits investor's strategic focus areas</p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all"
          >
            Got It
          </button>
          <button
            onClick={() => {
              onClose();
              // Could trigger "Connect" action here
            }}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
          >
            Connect Now
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MatchScoreBreakdown;
