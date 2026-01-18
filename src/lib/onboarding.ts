/**
 * Onboarding State Machine
 * 
 * Tracks user onboarding progress and activation status.
 * Persists to localStorage under 'onboarding_v1'.
 * 
 * Activation = user has completed at least one of:
 * - watchlist_add (primary)
 * - view_matches
 * - upgrade_cta_clicked
 */

export interface OnboardingState {
  onboarding_seen: boolean;
  onboarding_step: number;  // 0=welcome, 1=sector, 2=watch, 3=elite_tease
  activated: boolean;
  activation_completed_at: string | null;
  preferred_sector: string | null;
  elite_tease_seen: boolean;
  tour_dismissed: boolean;
}

const STORAGE_KEY = 'onboarding_v1';

const DEFAULT_STATE: OnboardingState = {
  onboarding_seen: false,
  onboarding_step: 0,
  activated: false,
  activation_completed_at: null,
  preferred_sector: null,
  elite_tease_seen: false,
  tour_dismissed: false
};

/**
 * Get current onboarding state from localStorage
 */
export function getOnboardingState(): OnboardingState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_STATE, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('[onboarding] Failed to parse state:', e);
  }
  return { ...DEFAULT_STATE };
}

/**
 * Set onboarding state (merges with existing)
 */
export function setOnboardingState(updates: Partial<OnboardingState>): OnboardingState {
  const current = getOnboardingState();
  const newState = { ...current, ...updates };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  } catch (e) {
    console.error('[onboarding] Failed to save state:', e);
  }
  
  return newState;
}

/**
 * Advance to next onboarding step
 */
export function advanceStep(): OnboardingState {
  const current = getOnboardingState();
  return setOnboardingState({ 
    onboarding_step: current.onboarding_step + 1 
  });
}

/**
 * Mark onboarding as seen (after completing or skipping)
 */
export function markOnboardingSeen(): OnboardingState {
  return setOnboardingState({ onboarding_seen: true });
}

/**
 * Mark user as activated
 */
export function markActivated(): OnboardingState {
  const current = getOnboardingState();
  if (current.activated) return current;
  
  return setOnboardingState({ 
    activated: true,
    activation_completed_at: new Date().toISOString()
  });
}

/**
 * Set preferred sector from onboarding
 */
export function setPreferredSector(sector: string): OnboardingState {
  return setOnboardingState({ preferred_sector: sector });
}

/**
 * Mark elite tease as seen (prevents repeat showing)
 */
export function markEliteTeaseSeen(): OnboardingState {
  return setOnboardingState({ elite_tease_seen: true });
}

/**
 * Mark tour as dismissed
 */
export function markTourDismissed(): OnboardingState {
  return setOnboardingState({ tour_dismissed: true });
}

/**
 * Reset onboarding (for testing)
 */
export function resetOnboarding(): OnboardingState {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('[onboarding] Failed to reset:', e);
  }
  return { ...DEFAULT_STATE };
}

/**
 * Check if user should see onboarding modal
 */
export function shouldShowOnboarding(plan: string | undefined, pathname: string): boolean {
  const state = getOnboardingState();
  
  // Skip if already seen
  if (state.onboarding_seen) return false;
  
  // Skip on pricing/admin pages
  if (pathname.startsWith('/pricing') || pathname.startsWith('/admin')) return false;
  
  // Only show for free/pro plans (not Elite who are already committed)
  if (plan === 'elite') return false;
  
  return true;
}

/**
 * Check if user should see activation banner
 */
export function shouldShowActivationBanner(): boolean {
  const state = getOnboardingState();
  return state.onboarding_seen && !state.activated;
}

/**
 * Check if user should see elite tease
 */
export function shouldShowEliteTease(plan: string | undefined): boolean {
  const state = getOnboardingState();
  return state.activated && !state.elite_tease_seen && plan !== 'elite';
}

// Sector options for onboarding
export const SECTOR_OPTIONS = [
  { id: 'ai-ml', label: 'AI / ML', icon: '🤖' },
  { id: 'saas', label: 'SaaS', icon: '☁️' },
  { id: 'fintech', label: 'FinTech', icon: '💳' },
  { id: 'devtools', label: 'DevTools', icon: '🛠️' },
  { id: 'healthtech', label: 'HealthTech', icon: '🏥' },
  { id: 'climate', label: 'Climate', icon: '🌱' },
  { id: 'consumer', label: 'Consumer', icon: '🛒' },
  { id: 'enterprise', label: 'Enterprise', icon: '🏢' },
  { id: 'crypto', label: 'Crypto / Web3', icon: '⛓️' },
  { id: 'biotech', label: 'Biotech', icon: '🧬' }
];
