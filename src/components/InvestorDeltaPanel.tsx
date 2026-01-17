/**
 * INVESTOR DELTA PANEL
 * ====================
 * Shows alignment differential between startup and investor
 * 
 * Template D: Investor Pairing Insight
 * - Why they'll lean in
 * - Why they'll hesitate
 * - What proof to show
 */

import React, { useState, useEffect } from 'react';
import { Zap, AlertCircle, Target, ArrowRight } from 'lucide-react';
import { getMatchDelta, MatchDelta } from '../lib/intelligenceService';

interface Props {
  startupId: string;
  investorId: string;
  investorName?: string;
  className?: string;
}

export default function InvestorDeltaPanel({ startupId, investorId, investorName, className = '' }: Props) {
  const [delta, setDelta] = useState<MatchDelta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!startupId || !investorId) return;
    
    setIsLoading(true);
    getMatchDelta(startupId, investorId)
      .then(data => {
        setDelta(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('[InvestorDeltaPanel] Error:', err);
        setIsLoading(false);
      });
  }, [startupId, investorId]);

  if (isLoading) {
    return (
      <div className={`p-3 bg-[#0f0f0f] border border-gray-800 rounded-lg ${className}`}>
        <div className="text-xs text-gray-500 animate-pulse">Analyzing alignment...</div>
      </div>
    );
  }

  if (!delta) {
    return null; // Silent fail - don't show anything if no data
  }

  const { alignment_delta } = delta;

  return (
    <div className={`bg-gradient-to-r from-violet-500/5 via-[#0f0f0f] to-cyan-500/5 border border-violet-500/20 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-violet-500/10 flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-[10px] font-semibold text-violet-300 uppercase tracking-wider">
          Why {investorName || delta.investor_name} Will
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Lean In */}
        {alignment_delta.reflection && (
          <div>
            <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span>✓</span> Lean In
            </div>
            <p className="text-xs text-gray-300">{alignment_delta.reflection}</p>
          </div>
        )}

        {/* Hesitate */}
        {alignment_delta.tension.length > 0 && (
          <div>
            <div className="text-[10px] text-orange-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Hesitate
            </div>
            <ul className="space-y-1">
              {alignment_delta.tension.slice(0, 2).map((t, i) => (
                <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                  <span className="text-orange-500/60">•</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Proof */}
        {alignment_delta.next_proof.length > 0 && (
          <div className="pt-2 border-t border-gray-800/50">
            <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Show Them
            </div>
            <p className="text-xs text-cyan-300/80 flex items-start gap-1.5">
              <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
              {alignment_delta.next_proof[0]}
            </p>
          </div>
        )}
      </div>

      {/* Match Score (if available) */}
      {delta.match_score !== null && (
        <div className="px-3 py-1.5 bg-black/20 text-[10px] text-gray-500">
          Match Score: <span className="text-white/60">{delta.match_score}%</span>
        </div>
      )}
    </div>
  );
}
