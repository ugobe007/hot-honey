/**
 * TooltipTour - Lightweight contextual tooltips for key features
 * 
 * Shows max 3 tooltips pointing to key UI elements:
 * 1. Watch button - "Watch startups to track their signals"
 * 2. Notifications bell - "Your alerts and updates appear here"  
 * 3. Live signal pairings - "See which investors are matching with hot startups"
 * 
 * Uses data-tour-id attributes on target elements.
 * Non-blocking, dismissable with X or click-outside.
 */

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { getOnboardingState, markTourDismissed } from '../lib/onboarding';
import { logEvent } from '../analytics';

interface TooltipConfig {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_TOOLTIPS: TooltipConfig[] = [
  {
    id: 'watch-button',
    targetSelector: '[data-tour-id="watch-button"]',
    title: 'Watch startups',
    description: 'Track signals and get notified when they heat up',
    position: 'bottom'
  },
  {
    id: 'notifications-bell',
    targetSelector: '[data-tour-id="notifications-bell"]',
    title: 'Notifications',
    description: 'Your alerts and updates appear here',
    position: 'bottom'
  },
  {
    id: 'signal-pairings',
    targetSelector: '[data-tour-id="signal-pairings"]',
    title: 'Live pairings',
    description: 'See which investors are matching with hot startups',
    position: 'top'
  }
];

interface TooltipProps {
  config: TooltipConfig;
  onDismiss: () => void;
  stepNumber: number;
  totalSteps: number;
}

function Tooltip({ config, onDismiss, stepNumber, totalSteps }: TooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.querySelector(config.targetSelector);
    if (!target) {
      onDismiss();
      return;
    }

    const updatePosition = () => {
      const rect = target.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      const tooltipWidth = tooltip?.offsetWidth || 200;
      const tooltipHeight = tooltip?.offsetHeight || 80;
      
      let top = 0;
      let left = 0;
      
      switch (config.position) {
        case 'bottom':
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'top':
          top = rect.top - tooltipHeight - 8;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - 8;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + 8;
          break;
      }
      
      // Keep within viewport
      left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
      top = Math.max(8, Math.min(top, window.innerHeight - tooltipHeight - 8));
      
      setPosition({ top, left });
      setVisible(true);
    };

    // Initial position
    requestAnimationFrame(updatePosition);
    
    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [config, onDismiss]);

  if (!visible) return null;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 w-52 bg-gray-800 border border-orange-500/30 rounded-lg shadow-xl animate-fade-in"
      style={{ top: position.top, left: position.left }}
    >
      {/* Arrow */}
      <div 
        className={`absolute w-2 h-2 bg-gray-800 border-orange-500/30 transform rotate-45 ${
          config.position === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2 border-t border-l' :
          config.position === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2 border-b border-r' :
          config.position === 'left' ? '-right-1 top-1/2 -translate-y-1/2 border-t border-r' :
          '-left-1 top-1/2 -translate-y-1/2 border-b border-l'
        }`}
      />
      
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-semibold text-white text-sm">{config.title}</h4>
          <button 
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors -mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-gray-400 text-xs leading-relaxed">{config.description}</p>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
          <span className="text-gray-500 text-xs">{stepNumber}/{totalSteps}</span>
          <button
            onClick={onDismiss}
            className="text-orange-400 hover:text-orange-300 text-xs font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TooltipTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const state = getOnboardingState();
    
    // Show tour if: onboarding completed, tour not dismissed
    if (state.onboarding_seen && !state.tour_dismissed) {
      // Delay to let page render
      const timer = setTimeout(() => {
        setActive(true);
        logEvent('tooltip_tour_started');
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    logEvent('tooltip_tour_step_dismissed', { step: currentStep });
    
    if (currentStep < TOUR_TOOLTIPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tour complete
      markTourDismissed();
      logEvent('tooltip_tour_completed');
      setActive(false);
    }
  };

  const handleSkipAll = () => {
    markTourDismissed();
    logEvent('tooltip_tour_skipped', { at_step: currentStep });
    setActive(false);
  };

  if (!active || currentStep >= TOUR_TOOLTIPS.length) return null;

  const currentTooltip = TOUR_TOOLTIPS[currentStep];

  return (
    <>
      <Tooltip
        config={currentTooltip}
        onDismiss={handleDismiss}
        stepNumber={currentStep + 1}
        totalSteps={TOUR_TOOLTIPS.length}
      />
      
      {/* Skip all button (subtle, bottom right) */}
      {currentStep === 0 && (
        <button
          onClick={handleSkipAll}
          className="fixed bottom-4 right-4 z-50 text-gray-500 hover:text-gray-300 text-xs transition-colors"
        >
          Skip tour
        </button>
      )}
    </>
  );
}
