/**
 * ActivationBanner - Encourages users to add first watchlist item
 * 
 * Shows until user has at least 1 watchlist item (activated state).
 * "Activate signals: Watch 1 startup to start getting HOT alerts"
 * Button scrolls to startup list and pulses Watch buttons.
 */

import { useState, useEffect } from 'react';
import { Eye, X, Zap } from 'lucide-react';
import { getOnboardingState, markActivated } from '../lib/onboarding';
import { logEvent } from '../analytics';

interface ActivationBannerProps {
  watchlistCount: number;
  onActivate?: () => void;
}

export default function ActivationBanner({ watchlistCount, onActivate }: ActivationBannerProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const state = getOnboardingState();
    
    // Show if: onboarding seen, not yet activated, not manually dismissed
    const shouldShow = state.onboarding_seen && !state.activated && watchlistCount === 0;
    setVisible(shouldShow);
    
    // Mark activated if user has added to watchlist
    if (watchlistCount > 0 && !state.activated) {
      markActivated();
      logEvent('activation_completed', { trigger: 'watchlist_add' });
    }
  }, [watchlistCount]);

  const handleActivate = () => {
    logEvent('activation_banner_clicked');
    
    // Scroll to startup list
    const startupList = document.querySelector('[data-startup-list]');
    if (startupList) {
      startupList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Pulse watch buttons
    document.querySelectorAll('[data-watch-button]').forEach(btn => {
      btn.classList.add('animate-pulse-orange');
      setTimeout(() => btn.classList.remove('animate-pulse-orange'), 3000);
    });
    
    onActivate?.();
  };

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    logEvent('activation_banner_dismissed');
  };

  if (!visible || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">
              Activate your signals
            </h3>
            <p className="text-gray-400 text-xs">
              Watch 1 startup to start getting HOT alerts
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleActivate}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-lg hover:from-orange-600 hover:to-red-600 transition-all flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Watch a startup
          </button>
          
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * CSS to add to your global styles or tailwind.config.js:
 * 
 * @keyframes pulse-orange {
 *   0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.5); }
 *   50% { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
 * }
 * .animate-pulse-orange {
 *   animation: pulse-orange 0.8s ease-in-out 3;
 * }
 */
