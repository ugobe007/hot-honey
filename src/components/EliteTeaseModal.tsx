/**
 * EliteTeaseModal - One-time upsell after first watch
 * 
 * Shows once after user adds first watchlist item.
 * "Want instant email alerts when this turns HOT?"
 * Opens UpgradeModal with 'enable_email_alerts' trigger.
 */

import { useState, useEffect } from 'react';
import { X, Mail, Zap, Bell, ChevronRight } from 'lucide-react';
import { getOnboardingState, markEliteTeaseSeen } from '../lib/onboarding';
import { logEvent } from '../analytics';

interface EliteTeaseModalProps {
  plan: string | undefined;
  watchlistCount: number;
  onUpgrade: (trigger: string) => void;
}

export default function EliteTeaseModal({ plan, watchlistCount, onUpgrade }: EliteTeaseModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const state = getOnboardingState();
    
    // Show if: just activated (watchlist > 0), elite tease not seen, not elite plan
    const shouldShow = 
      watchlistCount > 0 && 
      state.activated && 
      !state.elite_tease_seen && 
      plan !== 'elite';
    
    if (shouldShow) {
      // Small delay so it doesn't feel jarring right after watch click
      const timer = setTimeout(() => {
        setVisible(true);
        logEvent('elite_tease_shown', { watchlist_count: watchlistCount });
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [watchlistCount, plan]);

  const handleUpgrade = () => {
    markEliteTeaseSeen();
    logEvent('elite_tease_upgrade_clicked');
    setVisible(false);
    onUpgrade('enable_email_alerts');
  };

  const handleDismiss = () => {
    markEliteTeaseSeen();
    logEvent('elite_tease_dismissed');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-orange-500/20 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="relative p-6 text-center border-b border-gray-800">
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-500 mb-4">
            <Mail className="w-7 h-7 text-white" />
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2">
            🔥 Nice! You're watching.
          </h2>
          <p className="text-gray-400 text-sm">
            Want instant email alerts when this startup turns HOT?
          </p>
        </div>

        {/* Benefits */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3 text-gray-300">
            <Bell className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span className="text-sm">Email alerts within minutes of score spikes</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300">
            <Zap className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span className="text-sm">Beat other investors to hot deals</span>
          </div>
        </div>

        {/* CTA */}
        <div className="p-5 pt-0 space-y-3">
          <button
            onClick={handleUpgrade}
            className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all flex items-center justify-center gap-2"
          >
            Unlock Email Alerts <ChevronRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleDismiss}
            className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
