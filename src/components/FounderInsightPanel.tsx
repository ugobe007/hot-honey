/**
 * FOUNDER INSIGHT PANEL
 * =====================
 * Displays Pythh Brain v1 intelligence in founder-facing copy
 * 
 * Shows:
 * - The Founder Snapshot (how market reads you)
 * - Where Belief Breaks (fragility bullets)
 * - What Changes Outcome (direction bullets)
 * - Momentum line (if accelerating)
 */

import React, { useState, useEffect } from 'react';
import { Brain, AlertTriangle, Target, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { getFounderProfile, FounderProfile, CopyBlocks } from '../lib/intelligenceService';

interface Props {
  startupId: string;
  startupName?: string;
  /** Compact mode shows only snapshot, expandable for rest */
  compact?: boolean;
  /** Custom class */
  className?: string;
}

export default function FounderInsightPanel({ startupId, startupName, compact = true, className = '' }: Props) {
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!compact);

  useEffect(() => {
    if (!startupId) return;
    
    setIsLoading(true);
    setError(null);
    
    getFounderProfile(startupId)
      .then(data => {
        setProfile(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('[FounderInsightPanel] Error:', err);
        setError('Could not load intelligence');
        setIsLoading(false);
      });
  }, [startupId]);

  if (isLoading) {
    return (
      <div className={`p-4 bg-[#0f0f0f] border border-gray-800 rounded-xl ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Brain className="w-4 h-4 animate-pulse" />
          <span className="text-sm">Analyzing signals...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`p-4 bg-[#0f0f0f] border border-gray-800 rounded-xl ${className}`}>
        <div className="flex items-center gap-2 text-gray-600">
          <Brain className="w-4 h-4" />
          <span className="text-sm">Intelligence not available</span>
        </div>
      </div>
    );
  }

  const { copy_blocks, dimensions } = profile;

  return (
    <div className={`bg-gradient-to-br from-[#0f0f0f] via-[#111] to-[#0f0f0f] border border-gray-800 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
            Pythh Intelligence
          </span>
        </div>
        {compact && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Snapshot - Always visible */}
      <div className="p-4">
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          {copy_blocks.snapshot.title}
        </h4>
        <p className="text-sm text-white/90 leading-relaxed font-medium">
          {copy_blocks.snapshot.body}
        </p>
      </div>

      {/* Expandable sections */}
      {(isExpanded || !compact) && (
        <div className="border-t border-gray-800/50">
          {/* Fragility */}
          {copy_blocks.fragility.bullets.length > 0 && (
            <div className="p-4 border-b border-gray-800/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                <h4 className="text-xs text-orange-400 uppercase tracking-wider font-semibold">
                  {copy_blocks.fragility.title}
                </h4>
              </div>
              <ul className="space-y-1.5">
                {copy_blocks.fragility.bullets.map((bullet, i) => (
                  <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                    <span className="text-orange-500/60 mt-1">•</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Direction */}
          <div className="p-4 border-b border-gray-800/50">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <h4 className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">
                {copy_blocks.direction.title}
              </h4>
            </div>
            <ul className="space-y-1.5">
              {copy_blocks.direction.bullets.map((bullet, i) => (
                <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="text-emerald-500/60 mt-1">→</span>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          {/* Momentum (only if present) */}
          {copy_blocks.momentum && (
            <div className="p-4 bg-cyan-500/5">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <p className="text-sm text-cyan-300">
                  {copy_blocks.momentum}
                </p>
              </div>
            </div>
          )}

          {/* Dimension Scores (subtle) */}
          <div className="p-4 bg-black/20">
            <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Signal Dimensions</div>
            <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
              <span>
                Narrative: <span className={dimensions.narrative_coherence.score >= 60 ? 'text-emerald-500' : 'text-gray-400'}>{dimensions.narrative_coherence.score}</span>
              </span>
              <span>
                Activity: <span className={dimensions.obsession_density.score >= 60 ? 'text-emerald-500' : 'text-gray-400'}>{dimensions.obsession_density.score}</span>
              </span>
              <span>
                Evidence: <span className={dimensions.conviction_evidence_ratio.evidence_score >= 50 ? 'text-emerald-500' : 'text-gray-400'}>{dimensions.conviction_evidence_ratio.evidence_score}</span>
              </span>
              <span>
                Resilience: <span className={dimensions.fragility_index.score >= 60 ? 'text-emerald-500' : 'text-gray-400'}>{dimensions.fragility_index.score}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
