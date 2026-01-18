/**
 * OnboardingModal - First-run modal for new users
 * 
 * 2-step flow:
 * 1. Welcome screen with value prop
 * 2. Sector selection chips
 * 
 * Shows only if: authed, onboarding_seen=false, plan=free/pro, not on /pricing or /admin
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Sparkles, ChevronRight, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getOnboardingState, 
  markOnboardingSeen, 
  setPreferredSector,
  advanceStep,
  SECTOR_OPTIONS 
} from '../lib/onboarding';
import { logEvent } from '../analytics';

export default function OnboardingModal() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0); // 0=welcome, 1=sector
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  useEffect(() => {
    // Only show for authenticated users
    if (!user) return;
    
    // Skip for elite users (already committed)
    if (profile?.plan === 'elite') return;
    
    // Skip on pricing/admin pages
    if (location.pathname.startsWith('/pricing') || location.pathname.startsWith('/admin')) return;
    
    // Check onboarding state
    const state = getOnboardingState();
    if (!state.onboarding_seen) {
      setVisible(true);
      setStep(state.onboarding_step);
      logEvent('onboarding_started', { step: state.onboarding_step });
    }
  }, [user, profile, location.pathname]);

  const handleNextStep = () => {
    if (step === 0) {
      setStep(1);
      advanceStep();
      logEvent('onboarding_step_completed', { step: 0 });
    }
  };

  const handleSectorSelect = (sectorId: string) => {
    setSelectedSector(sectorId);
  };

  const handleComplete = () => {
    if (selectedSector) {
      setPreferredSector(selectedSector);
      logEvent('onboarding_sector_selected', { sector: selectedSector });
    }
    markOnboardingSeen();
    logEvent('onboarding_completed', { 
      sector: selectedSector,
      skipped_sector: !selectedSector 
    });
    setVisible(false);
  };

  const handleSkip = () => {
    markOnboardingSeen();
    logEvent('onboarding_skipped', { step });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-orange-500/20 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-orange-600 to-red-600 p-6 text-center">
          <button 
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
            <Flame className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1">
            {step === 0 ? 'Welcome to Hot Match!' : 'Personalize Your Feed'}
          </h2>
          <p className="text-white/80 text-sm">
            {step === 0 
              ? 'AI-powered startup signals for smarter investing'
              : 'Select your primary sector interest'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 0 ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                <Sparkles className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-white text-sm">Real-time signals</h3>
                  <p className="text-gray-400 text-xs">Track startup velocity & investor interest</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                <Sparkles className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-white text-sm">Watch & get alerts</h3>
                  <p className="text-gray-400 text-xs">Be first to know when startups heat up</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                <Sparkles className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-white text-sm">AI-curated matches</h3>
                  <p className="text-gray-400 text-xs">Find the perfect investors for every deal</p>
                </div>
              </div>
              
              <button
                onClick={handleNextStep}
                className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all flex items-center justify-center gap-2"
              >
                Get Started <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm text-center">
                We'll surface the most relevant startups for you
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                {SECTOR_OPTIONS.map(sector => (
                  <button
                    key={sector.id}
                    onClick={() => handleSectorSelect(sector.id)}
                    className={`p-3 rounded-lg text-left transition-all ${
                      selectedSector === sector.id
                        ? 'bg-orange-500/20 border-2 border-orange-500 text-white'
                        : 'bg-gray-800 border-2 border-transparent text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span className="text-lg mr-2">{sector.icon}</span>
                    <span className="text-sm font-medium">{sector.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleComplete}
                  className="flex-1 py-3 px-4 text-gray-400 hover:text-white transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!selectedSector}
                  className={`flex-1 py-3 px-4 font-semibold rounded-lg transition-all ${
                    selectedSector
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Step indicator */}
        <div className="flex justify-center gap-2 pb-4">
          <div className={`w-2 h-2 rounded-full ${step === 0 ? 'bg-orange-500' : 'bg-gray-600'}`} />
          <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-orange-500' : 'bg-gray-600'}`} />
        </div>
      </div>
    </div>
  );
}
