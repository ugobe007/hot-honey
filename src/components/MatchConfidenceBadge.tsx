import { Shield, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface MatchConfidenceBadgeProps {
  matchScore: number;
  godScore?: number;
  hasInference?: boolean;
  hasSectorMatch?: boolean;
  hasStageMatch?: boolean;
  variant?: 'badge' | 'detailed' | 'tooltip';
}

/**
 * MatchConfidenceBadge - Shows the confidence level of a match
 * 
 * Confidence is based on:
 * - GOD Score quality (is the startup well-scored?)
 * - Inference data (do we have sector/stage/team info?)
 * - Match factors (sector alignment, stage fit, etc.)
 * 
 * This builds trust by being honest about match quality.
 */
export default function MatchConfidenceBadge({
  matchScore,
  godScore = 0,
  hasInference = false,
  hasSectorMatch = false,
  hasStageMatch = false,
  variant = 'badge'
}: MatchConfidenceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate confidence level
  let confidenceScore = 0;
  const factors: string[] = [];

  // Base confidence from match score
  if (matchScore >= 80) {
    confidenceScore += 40;
    factors.push('High match score');
  } else if (matchScore >= 60) {
    confidenceScore += 30;
    factors.push('Good match score');
  } else if (matchScore >= 40) {
    confidenceScore += 20;
    factors.push('Moderate match score');
  } else {
    confidenceScore += 10;
    factors.push('Low match score');
  }

  // GOD Score quality
  if (godScore >= 70) {
    confidenceScore += 25;
    factors.push('Strong startup profile');
  } else if (godScore >= 50) {
    confidenceScore += 15;
    factors.push('Solid startup profile');
  } else if (godScore >= 40) {
    confidenceScore += 10;
    factors.push('Basic profile data');
  }

  // Inference data quality
  if (hasInference) {
    confidenceScore += 15;
    factors.push('Verified sector data');
  }

  // Sector match
  if (hasSectorMatch) {
    confidenceScore += 10;
    factors.push('Sector alignment');
  }

  // Stage match
  if (hasStageMatch) {
    confidenceScore += 10;
    factors.push('Stage fit');
  }

  // Normalize to percentage (max 100)
  confidenceScore = Math.min(confidenceScore, 100);

  // Determine confidence level
  let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
  let confidenceLabel = 'Low Confidence';
  let confidenceColor = 'text-cyan-400 bg-cyan-600/20 border-cyan-500/30';
  
  if (confidenceScore >= 70) {
    confidenceLevel = 'high';
    confidenceLabel = 'High Confidence';
    confidenceColor = 'text-green-400 bg-green-500/20 border-green-500/30';
  } else if (confidenceScore >= 45) {
    confidenceLevel = 'medium';
    confidenceLabel = 'Good Confidence';
    confidenceColor = 'text-yellow-400 bg-yellow-500/20 border-cyan-500/30';
  }

  // Simple badge variant
  if (variant === 'badge') {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${confidenceColor}`}
        title={`${confidenceLabel}: ${factors.join(', ')}`}
      >
        {confidenceLevel === 'high' ? (
          <Shield className="w-3 h-3" />
        ) : confidenceLevel === 'medium' ? (
          <Sparkles className="w-3 h-3" />
        ) : (
          <AlertCircle className="w-3 h-3" />
        )}
        <span>{confidenceLabel}</span>
      </div>
    );
  }

  // Detailed variant with breakdown
  if (variant === 'detailed') {
    return (
      <div className={`rounded-xl border p-4 ${confidenceColor.replace('text-', 'border-').replace('bg-', '')}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {confidenceLevel === 'high' ? (
              <Shield className="w-5 h-5 text-green-400" />
            ) : confidenceLevel === 'medium' ? (
              <Sparkles className="w-5 h-5 text-yellow-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-cyan-400" />
            )}
            <span className={`font-semibold ${
              confidenceLevel === 'high' ? 'text-green-400' :
              confidenceLevel === 'medium' ? 'text-yellow-400' :
              'text-cyan-400'
            }`}>
              {confidenceLabel}
            </span>
          </div>
          <span className="text-gray-400 text-sm">{confidenceScore}%</span>
        </div>

        {/* Confidence bar */}
        <div className="h-2 bg-black/30 rounded-full overflow-hidden mb-3">
          <div 
            className={`h-full rounded-full transition-all ${
              confidenceLevel === 'high' ? 'bg-green-400' :
              confidenceLevel === 'medium' ? 'bg-yellow-400' :
              'bg-cyan-400'
            }`}
            style={{ width: `${confidenceScore}%` }}
          />
        </div>

        {/* Factors */}
        <div className="space-y-1">
          {factors.map((factor, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
              <span className={`w-1.5 h-1.5 rounded-full ${
                confidenceLevel === 'high' ? 'bg-green-400' :
                confidenceLevel === 'medium' ? 'bg-yellow-400' :
                'bg-cyan-400'
              }`} />
              {factor}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Tooltip variant - shows on hover
  if (variant === 'tooltip') {
    return (
      <div className="relative inline-block">
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${confidenceColor}`}
        >
          {confidenceLevel === 'high' ? (
            <Shield className="w-3 h-3" />
          ) : confidenceLevel === 'medium' ? (
            <Sparkles className="w-3 h-3" />
          ) : (
            <HelpCircle className="w-3 h-3" />
          )}
          <span>{confidenceScore}%</span>
        </button>

        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl z-50">
            <div className="text-white font-semibold text-sm mb-2">{confidenceLabel}</div>
            <div className="space-y-1">
              {factors.slice(0, 3).map((factor, i) => (
                <div key={i} className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="text-green-400">✓</span> {factor}
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-8 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    );
  }

  return null;
}

/**
 * Helper to calculate confidence from raw data
 */
export function calculateMatchConfidence(
  matchScore: number,
  startup: any,
  investor: any
): { score: number; level: 'high' | 'medium' | 'low'; factors: string[] } {
  const godScore = startup?.total_god_score || 0;
  const hasInference = !!(startup?.sectors?.length > 0 || startup?.funding_stage);
  const hasSectorMatch = startup?.sectors?.some((s: string) => 
    investor?.sectors?.some((is: string) => 
      s.toLowerCase().includes(is.toLowerCase()) || is.toLowerCase().includes(s.toLowerCase())
    )
  );
  const hasStageMatch = startup?.stage !== undefined && investor?.stage?.includes(startup.stage);

  let score = 0;
  const factors: string[] = [];

  if (matchScore >= 80) { score += 40; factors.push('High match'); }
  else if (matchScore >= 60) { score += 30; factors.push('Good match'); }
  else { score += 15; }

  if (godScore >= 70) { score += 25; factors.push('Strong profile'); }
  else if (godScore >= 50) { score += 15; factors.push('Solid profile'); }

  if (hasInference) { score += 15; factors.push('Verified data'); }
  if (hasSectorMatch) { score += 10; factors.push('Sector fit'); }
  if (hasStageMatch) { score += 10; factors.push('Stage fit'); }

  score = Math.min(score, 100);
  const level = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';

  return { score, level, factors };
}
