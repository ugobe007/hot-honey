import { useState, useEffect } from 'react';

const INDUSTRIES = [
  { id: 'fintech', name: 'FinTech', emoji: '💰' },
  { id: 'ai', name: 'AI/ML', emoji: '🤖' },
  { id: 'saas', name: 'SaaS', emoji: '☁️' },
  { id: 'deeptech', name: 'Deep Tech', emoji: '🔬' },
  { id: 'robotics', name: 'Robotics', emoji: '🦾' },
  { id: 'healthtech', name: 'HealthTech', emoji: '🏥' },
  { id: 'edtech', name: 'EdTech', emoji: '📚' },
  { id: 'cleantech', name: 'CleanTech', emoji: '🌱' },
  { id: 'ecommerce', name: 'E-Commerce', emoji: '🛒' },
  { id: 'crypto', name: 'Crypto/Web3', emoji: '₿' },
  { id: 'consumer', name: 'Consumer', emoji: '🛍️' },
  { id: 'enterprise', name: 'Enterprise', emoji: '🏢' },
];

interface SharePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  yesVotes: any[];
}

export default function SharePortfolioModal({ isOpen, onClose, yesVotes }: SharePortfolioModalProps) {
  const [investorName, setInvestorName] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setShareUrl('');
      setCopied(false);
      setSelectedIndustries([]);
    }
  }, [isOpen]);

  const toggleIndustry = (industryId: string) => {
    setSelectedIndustries(prev => 
      prev.includes(industryId)
        ? prev.filter(id => id !== industryId)
        : [...prev, industryId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIndustries.length === INDUSTRIES.length) {
      setSelectedIndustries([]);
    } else {
      setSelectedIndustries(INDUSTRIES.map(i => i.id));
    }
  };

  const generateShareLink = () => {
    // Generate a unique share ID
    const shareId = `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare share data
    const shareData = {
      id: shareId,
      investorName: investorName || 'Anonymous Investor',
      industries: selectedIndustries,
      startups: yesVotes,
      createdAt: new Date().toISOString()
    };

    // Save to localStorage (in real app, this would be sent to a backend)
    const existingShares = localStorage.getItem('portfolioShares');
    const shares = existingShares ? JSON.parse(existingShares) : {};
    shares[shareId] = shareData;
    localStorage.setItem('portfolioShares', JSON.stringify(shares));

    // Generate URL
    const url = `${window.location.origin}/shared-portfolio/${shareId}`;
    setShareUrl(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Share Your Portfolio
            </h2>
            <p className="text-gray-600">
              Choose which deals to share with friends and colleagues
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
          >
            ×
          </button>
        </div>

        {!shareUrl ? (
          <>
            {/* Investor Name */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Your Name (Optional)
              </label>
              <input
                type="text"
                value={investorName}
                onChange={(e) => setInvestorName(e.target.value)}
                placeholder="e.g., Murray's Hot Picks"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to share anonymously
              </p>
            </div>

            {/* Industry Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">Select Industries to Share</h3>
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg font-semibold hover:bg-purple-200 transition-colors text-xs"
                >
                  {selectedIndustries.length === INDUSTRIES.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Only startups in selected industries will be shared
              </p>

              <div className="grid grid-cols-3 gap-3">
                {INDUSTRIES.map(industry => (
                  <button
                    key={industry.id}
                    onClick={() => toggleIndustry(industry.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedIndustries.includes(industry.id)
                        ? 'border-cyan-500 bg-slate-800'
                        : 'border-gray-300 bg-white hover:border-cyan-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{industry.emoji}</div>
                    <div className={`font-semibold text-xs ${
                      selectedIndustries.includes(industry.id) ? 'text-cyan-300' : 'text-gray-700'
                    }`}>
                      {industry.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-700">
                💡 <strong>Pro Tip:</strong> You can share different portfolios with different people! For example, share FinTech+AI deals with Murray, but keep your DeepTech picks private.
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateShareLink}
              disabled={selectedIndustries.length === 0}
              className={`w-full font-bold py-4 px-8 rounded-2xl shadow-lg transition-all text-lg ${
                selectedIndustries.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
              }`}
            >
              {selectedIndustries.length === 0 ? '⚠️ Select at least one industry' : '🔗 Generate Share Link'}
            </button>
          </>
        ) : (
          <>
            {/* Share Link Generated */}
            <div className="mb-6">
              <div className="bg-green-50 border-2 border-green-400 rounded-xl p-6 mb-4">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-3">✅</div>
                  <h3 className="text-2xl font-bold text-green-800 mb-2">
                    Share Link Created!
                  </h3>
                  <p className="text-green-700">
                    Anyone with this link can view your selected deals
                  </p>
                </div>
              </div>

              <label className="block text-sm font-bold text-gray-700 mb-2">
                Your Shareable Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-6 py-3 bg-cyan-600 text-white rounded-xl font-semibold hover:bg-cyan-700 transition-colors"
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Sharing Stats */}
            <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 mb-6">
              <h4 className="font-bold text-purple-700 mb-2">📊 What's being shared:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Investor:</strong> {investorName || 'Anonymous'}</li>
                <li>• <strong>Industries:</strong> {selectedIndustries.length} selected</li>
                <li>• <strong>Filtered Startups:</strong> Showing only {selectedIndustries.map(id => 
                  INDUSTRIES.find(i => i.id === id)?.name
                ).join(', ')}</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShareUrl('');
                  setSelectedIndustries([]);
                }}
                className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-2xl hover:bg-gray-300 transition-all"
              >
                Create Another
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-2xl transition-all"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
