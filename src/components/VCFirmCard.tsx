import { useState } from 'react';

interface VCFirmCardProps {
  company: {
    id: number;
    name: string;
    tagline?: string;
    pitch?: string;
    fivePoints?: string[];
    website?: string;
    entityType?: 'vc_firm' | 'accelerator';
    investmentCount?: number; // Number of startups they've invested in on Hot Honey
    totalInvested?: string; // Total amount invested on Hot Honey
    recentInvestments?: string[]; // Names of recently invested startups
  };
  onComment?: (companyId: number, comment: string) => void;
}

export default function VCFirmCard({ company, onComment }: VCFirmCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [honeypotValue, setHoneypotValue] = useState('');
  const [comments, setComments] = useState<string[]>([]);

  const handleSubmitComment = () => {
    if (comment.trim()) {
      setComments([...comments, comment]);
      if (onComment) {
        onComment(company.id, comment);
      }
      setComment('');
    }
  };

  // Safely determine entity type with fallback
  const entityType = company?.entityType || 'vc_firm';
  const isAccelerator = entityType === 'accelerator';
  const entityLabel = isAccelerator ? '🚀 ACCELERATOR' : '💼 VC FIRM';

  // Calculate investment rank/level
  const investmentCount = company?.investmentCount || 0;
  const getInvestmentLevel = (count: number) => {
    if (count >= 10) return { label: '🔥 MEGA INVESTOR', color: 'text-red-400' };
    if (count >= 5) return { label: '⭐ ACTIVE INVESTOR', color: 'text-orange-400' };
    if (count >= 1) return { label: '✨ INVESTOR', color: 'text-yellow-400' };
    return { label: '👀 WATCHING', color: 'text-gray-400' };
  };

  const investmentLevel = getInvestmentLevel(investmentCount);

  return (
    <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-purple-800 rounded-3xl shadow-2xl overflow-hidden border-4 border-lime-400 relative">
      {/* Circular Lime Green Stamp - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <div className="w-20 h-20 bg-lime-400 rounded-full flex items-center justify-center transform rotate-12 shadow-lg border-4 border-lime-500">
          <span className="text-xs font-black text-gray-900 text-center leading-tight">
            {entityLabel.split(' ')[0]}<br/>{entityLabel.split(' ')[1]}
          </span>
        </div>
      </div>

      <div className="p-8">
        {/* Firm Name - Lime Green */}
        <h2 className="text-4xl font-black text-lime-400 mb-2 pr-24">
          {company?.name || 'Unknown Company'}
        </h2>

        {/* Investment Level Badge */}
        {investmentCount > 0 && (
          <div className="mb-4">
            <span className={`${investmentLevel.color} font-bold text-sm`}>
              {investmentLevel.label}
            </span>
            <span className="text-lime-300 font-semibold text-sm ml-2">
              • {investmentCount} investment{investmentCount !== 1 ? 's' : ''} on Hot Honey
            </span>
          </div>
        )}

        {/* Tagline */}
        {company?.tagline && (
          <p className="text-xl text-lime-300 font-bold mb-6 italic">
            "{company.tagline}"
          </p>
        )}

        {/* Investment Stats */}
        {investmentCount > 0 && (
          <div className="bg-lime-400/20 backdrop-blur-sm rounded-xl p-4 border-2 border-lime-300 mb-6">
            <h3 className="text-lime-300 font-black text-lg mb-2">📊 Hot Honey Activity</h3>
            <div className="space-y-1 text-lime-200 text-sm">
              <p>💰 Total Invested: {company?.totalInvested || 'TBD'}</p>
              <p>🎯 Portfolio Companies: {investmentCount}</p>
              {company?.recentInvestments && company.recentInvestments.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold text-lime-300">Recent Investments:</p>
                  <ul className="list-disc list-inside ml-2">
                    {company.recentInvestments.slice(0, 3).map((investment, i) => (
                      <li key={i}>{investment}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Five Points */}
        {company?.fivePoints && company.fivePoints.length > 0 && (
          <div className="space-y-3 mb-6">
            {company.fivePoints.map((point, index) => (
              <div key={index} className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border-2 border-lime-300">
                <p className="text-lime-200 font-semibold">
                  <span className="text-lime-400 font-black">{index + 1}.</span> {point}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Website */}
        {company?.website && (
          <div className="mb-6">
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-300 hover:text-lime-200 underline font-semibold"
            >
              🌐 Visit Website
            </a>
          </div>
        )}

        {/* Honeypot Input */}
        <div className="mb-6">
          <label className="block text-lime-300 font-bold mb-2">
            🍯 Share Details About This Firm
          </label>
          <input
            type="text"
            value={honeypotValue}
            onChange={(e) => setHoneypotValue(e.target.value)}
            placeholder="Add investment focus, portfolio companies, etc..."
            className="w-full px-4 py-3 bg-white/20 border-2 border-lime-300 rounded-xl text-lime-100 placeholder-lime-300/50 focus:outline-none focus:border-lime-400 focus:ring-2 focus:ring-lime-400"
          />
        </div>

        {/* Comments Section */}
        <div className="border-t-2 border-lime-300 pt-6">
          <button
            onClick={() => setShowComments(!showComments)}
            className="text-lime-300 hover:text-lime-200 font-bold mb-4 flex items-center gap-2"
          >
            💬 {showComments ? 'Hide' : 'Show'} Comments ({comments.length})
          </button>

          {showComments && (
            <div className="space-y-4">
              {/* Existing Comments */}
              {comments.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {comments.map((c, index) => (
                    <div key={index} className="bg-lime-400/10 rounded-lg p-3 border border-lime-300/30">
                      <p className="text-lime-200 text-sm">{c}</p>
                      <p className="text-lime-400/50 text-xs mt-1">Just now</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment */}
              <div className="space-y-3">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add your notes about this firm..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/20 border-2 border-lime-300 rounded-xl text-lime-100 placeholder-lime-300/50 focus:outline-none focus:border-lime-400 resize-none"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!comment.trim()}
                  className="bg-lime-400 hover:bg-lime-500 text-gray-900 font-bold py-2 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Post Comment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}