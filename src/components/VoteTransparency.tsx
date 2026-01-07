import React from 'react';
import { TrendingUp, Users, ThumbsUp, ThumbsDown, Info } from 'lucide-react';

interface VoteTransparencyProps {
  startup: any;
  currentVotes?: {
    yes: number;
    no: number;
    total: number;
  };
}

export default function VoteTransparency({ startup, currentVotes }: VoteTransparencyProps) {
  const godScore = startup.total_god_score || 0;
  const yesVotes = currentVotes?.yes || startup.yesVotes || 0;
  const noVotes = currentVotes?.no || startup.noVotes || 0;
  const totalVotes = yesVotes + noVotes;
  const yesPercentage = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;
  const noPercentage = totalVotes > 0 ? Math.round((noVotes / totalVotes) * 100) : 0;

  // Calculate community influence on GOD score
  const communityBoost = yesPercentage > 70 ? 5 : yesPercentage > 50 ? 3 : 0;
  const adjustedScore = Math.min(godScore + communityBoost, 100);

  return (
    <div className="bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-cyan-900/40 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-cyan-400" />
          Vote Impact & Transparency
        </h3>
        <div className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 rounded-full">
          <span className="text-cyan-300 font-bold text-sm">🔍 Real-Time Data</span>
        </div>
      </div>

      {/* Community Voting Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg">
              <ThumbsUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-green-300 font-bold text-sm">YES Votes</div>
              <div className="text-3xl font-bold text-white">{yesVotes}</div>
            </div>
          </div>
          <div className="w-full bg-black/40 rounded-full h-2 mt-2">
            <div 
              className="bg-gradient-to-r from-green-400 to-emerald-400 h-2 rounded-full transition-all"
              style={{ width: `${yesPercentage}%` }}
            ></div>
          </div>
          <div className="text-green-300 text-sm mt-2 font-semibold">{yesPercentage}% of community</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-red-500/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-blue-500 to-violet-500 p-2 rounded-lg">
              <ThumbsDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-red-300 font-bold text-sm">NO Votes</div>
              <div className="text-3xl font-bold text-white">{noVotes}</div>
            </div>
          </div>
          <div className="w-full bg-black/40 rounded-full h-2 mt-2">
            <div 
              className="bg-gradient-to-r from-blue-400 to-violet-400 h-2 rounded-full transition-all"
              style={{ width: `${noPercentage}%` }}
            ></div>
          </div>
          <div className="text-red-300 text-sm mt-2 font-semibold">{noPercentage}% of community</div>
        </div>
      </div>

      {/* AI + Community Score Calculation */}
      <div className="bg-black/40 rounded-xl p-6 border border-cyan-500/30 mb-4">
        <h4 className="text-lg font-bold text-yellow-300 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          How Your Vote Impacts the Score
        </h4>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Base GOD Score (AI Analysis):</span>
            <span className="font-mono font-bold text-white text-lg">{godScore}</span>
          </div>

          <div className="border-t border-gray-700 pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400">Community Confidence:</span>
              <span className="font-mono text-cyan-400">{yesPercentage}% positive</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Community Boost:</span>
              <span className={`font-mono font-bold ${communityBoost > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                {communityBoost > 0 ? `+${communityBoost}` : '0'}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/50 rounded-lg p-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">Final Score (AI + Community):</span>
              <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {adjustedScore}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Impact Explanation */}
      <div className={`rounded-xl p-4 border ${
        yesPercentage > 70 
          ? 'bg-green-500/10 border-green-500/30' 
          : yesPercentage > 50 
          ? 'bg-yellow-500/10 border-cyan-500/30'
          : 'bg-gray-500/10 border-gray-500/30'
      }`}>
        <div className="flex items-start gap-2">
          <Info className={`w-5 h-5 mt-1 flex-shrink-0 ${
            yesPercentage > 70 
              ? 'text-green-400' 
              : yesPercentage > 50 
              ? 'text-yellow-400'
              : 'text-gray-400'
          }`} />
          <div className="text-sm text-gray-300">
            {yesPercentage > 70 ? (
              <>
                <strong className="text-green-300">🚀 Strong Community Support!</strong> This startup gets a <strong className="text-green-300">+{communityBoost} boost</strong> to its GOD score because over 70% of the community voted YES. High confidence signals to investors!
              </>
            ) : yesPercentage > 50 ? (
              <>
                <strong className="text-yellow-300">✅ Positive Community Signal</strong> This startup gets a <strong className="text-yellow-300">+{communityBoost} boost</strong> to its GOD score because over 50% of the community voted YES. Moderate confidence.
              </>
            ) : (
              <>
                <strong className="text-gray-300">📊 Voting in Progress</strong> Community votes influence the final score. When 50%+ vote YES, the startup gets a boost to its GOD score. Your vote matters!
              </>
            )}
          </div>
        </div>
      </div>

      {/* Formula Explanation */}
      <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
        <div className="text-xs text-gray-300">
          <strong className="text-purple-300">📐 Score Formula:</strong>
          <div className="mt-1 font-mono text-purple-200">
            Final Score = Base GOD Score + Community Boost
          </div>
          <div className="mt-1 text-gray-400">
            • Community Boost = +5 if ≥70% YES votes
            <br />
            • Community Boost = +3 if 50-69% YES votes
            <br />
            • Community Boost = 0 if &lt;50% YES votes
          </div>
        </div>
      </div>

      {/* Total Participants */}
      <div className="mt-4 text-center">
        <div className="inline-block bg-black/40 border border-cyan-500/30 rounded-full px-6 py-2">
          <span className="text-gray-400 text-sm">Total Community Participants: </span>
          <span className="text-cyan-300 font-bold text-lg">{totalVotes}</span>
        </div>
      </div>
    </div>
  );
}
