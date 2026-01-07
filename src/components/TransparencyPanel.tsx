import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, Brain, Calculator, TrendingUp } from 'lucide-react';

interface TransparencyPanelProps {
  matchScore: number;
  breakdown?: {
    godScore: number;
    industryMatch: number;
    stageMatch: number;
    geographyMatch: number;
    checkSizeMatch: number;
    thesisAlignment: number;
  };
  startup: any;
  investor: any;
}

export default function TransparencyPanel({ matchScore, breakdown, startup, investor }: TransparencyPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'formula' | 'breakdown' | 'evidence'>('formula');

  const godScore = breakdown?.godScore || startup.total_god_score || 0;
  const matchBonus = matchScore - godScore;

  return (
    <div className="fixed bottom-8 right-8 z-50 max-w-md">
      {/* Collapsed State - Glowing Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="group relative bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 p-4 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-110 animate-pulse"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-full blur-xl opacity-60 group-hover:opacity-80 animate-pulse"></div>
          <div className="relative flex items-center gap-3">
            <Brain className="w-6 h-6 text-white" />
            <div className="text-left">
              <div className="text-xs text-purple-200 font-semibold uppercase tracking-wide">Match Math</div>
              <div className="text-2xl font-bold text-white">{matchScore}%</div>
            </div>
            <ChevronUp className="w-5 h-5 text-white animate-bounce" />
          </div>
        </button>
      )}

      {/* Expanded State - Full Transparency Panel */}
      {isExpanded && (
        <div className="bg-gradient-to-br from-gray-900/95 via-purple-900/95 to-blue-900/95 backdrop-blur-xl border-2 border-purple-500/50 rounded-2xl shadow-2xl p-6 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-purple-500 to-cyan-500 p-2 rounded-lg">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Match Transparency</h3>
                <p className="text-sm text-gray-400">See how we calculated this score</p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-black/20 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('formula')}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all ${
                activeTab === 'formula'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🧮 Formula
            </button>
            <button
              onClick={() => setActiveTab('breakdown')}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all ${
                activeTab === 'breakdown'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📊 Breakdown
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all ${
                activeTab === 'evidence'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ✅ Evidence
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Formula Tab */}
            {activeTab === 'formula' && (
              <div className="space-y-4">
                <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
                  <h4 className="text-lg font-bold text-purple-300 mb-3">The Math Behind Your Match</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Base GOD Score:</span>
                      <span className="font-mono font-bold text-white">{godScore}</span>
                      <span className="text-gray-500 text-xs">(0-100 scale)</span>
                    </div>
                    <div className="border-t border-gray-700 pt-2">
                      <div className="text-gray-400 mb-2">Match Bonuses:</div>
                      <div className="space-y-1 ml-4">
                        {breakdown?.industryMatch && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">+ Industry Match:</span>
                            <span className="font-mono text-green-400">+{breakdown.industryMatch}</span>
                          </div>
                        )}
                        {breakdown?.stageMatch && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">+ Stage Match:</span>
                            <span className="font-mono text-green-400">+{breakdown.stageMatch}</span>
                          </div>
                        )}
                        {breakdown?.geographyMatch && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">+ Geography Match:</span>
                            <span className="font-mono text-green-400">+{breakdown.geographyMatch}</span>
                          </div>
                        )}
                        {breakdown?.thesisAlignment && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">+ Thesis Alignment:</span>
                            <span className="font-mono text-green-400">+{breakdown.thesisAlignment}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="border-t border-gray-700 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Total Match Bonus:</span>
                        <span className="font-mono font-bold text-cyan-400">+{matchBonus}</span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/50 rounded-lg p-3 mt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">Final Match Score:</span>
                        <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                          {matchScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
                    <p className="text-xs text-gray-300">
                      <strong className="text-purple-300">Formula:</strong> Match Score = GOD Score + Industry Match + Stage Match + Geography Match + Thesis Alignment (capped at 99%)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Breakdown Tab */}
            {activeTab === 'breakdown' && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-yellow-300 font-semibold">GOD Score (Base)</span>
                    <span className="text-2xl font-bold text-white">{godScore}</span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-cyan-400 to-blue-400 h-2 rounded-full transition-all"
                      style={{ width: `${godScore}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Quality score based on team, traction, market, product, and pitch
                  </p>
                </div>

                {breakdown?.industryMatch && (
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-300 font-semibold">Industry Match</span>
                      <span className="text-xl font-bold text-green-400">+{breakdown.industryMatch}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Investor actively invests in {investor.sectors?.slice(0, 2).join(', ')}
                    </p>
                  </div>
                )}

                {breakdown?.stageMatch && (
                  <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-300 font-semibold">Stage Match</span>
                      <span className="text-xl font-bold text-blue-400">+{breakdown.stageMatch}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Perfect fit for {startup.stage || 'Seed'} stage companies
                    </p>
                  </div>
                )}

                {breakdown?.geographyMatch && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-300 font-semibold">Geography Match</span>
                      <span className="text-xl font-bold text-purple-400">+{breakdown.geographyMatch}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Investor location aligns with startup geography
                    </p>
                  </div>
                )}

                {breakdown?.thesisAlignment && (
                  <div className="bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-cyan-300 font-semibold">Thesis Alignment</span>
                      <span className="text-xl font-bold text-cyan-400">+{breakdown.thesisAlignment}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Strong alignment with investor's investment thesis
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Evidence Tab */}
            {activeTab === 'evidence' && (
              <div className="space-y-4">
                <div className="bg-black/40 rounded-xl p-4 border border-cyan-500/30">
                  <h4 className="text-lg font-bold text-cyan-300 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Evidence-Based Matching
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">🎯 Startup Stage:</div>
                      <div className="text-white ml-4">{startup.stage || 'Seed'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">🏢 Industries:</div>
                      <div className="flex flex-wrap gap-2 ml-4">
                        {(startup.industries || []).slice(0, 3).map((ind: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-cyan-600/20 text-cyan-300 rounded text-xs">
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">💰 Investor Focus:</div>
                      <div className="flex flex-wrap gap-2 ml-4">
                        {(investor.sectors || []).slice(0, 3).map((sec: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs">
                            {sec}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">📊 Investor Stage Focus:</div>
                      <div className="flex flex-wrap gap-2 ml-4">
                        {(investor.stage || []).slice(0, 3).map((stage: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                            {stage}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">💵 Check Size:</div>
                      <div className="text-white ml-4">{investor.checkSize || investor.check_size || 'Varies'}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                    <p className="text-xs text-gray-300">
                      All scores are calculated using real data from our database, investor portfolios, and startup metrics. No fake numbers!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
