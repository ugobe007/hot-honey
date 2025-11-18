/**
 * FIRE POINTS MANAGER
 * ====================
 * Handles all fire points operations and investor gamification
 */

import { 
  FirePoints, 
  InvestorProfile, 
  POINT_VALUES, 
  TIER_THRESHOLDS,
  PERKS 
} from '../types/gamification';

const STORAGE_KEY = 'investorProfile';

/**
 * Get current investor profile from localStorage
 */
export function getInvestorProfile(): InvestorProfile | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Error parsing investor profile:', e);
    return null;
  }
}

/**
 * Initialize a new investor profile
 */
export function initializeInvestorProfile(userId: string): InvestorProfile {
  const profile: InvestorProfile = {
    userId,
    firePoints: {
      total: 0,
      earnedToday: 0,
      streak: 0,
      lastActivity: new Date().toISOString(),
    },
    tier: 'Bronze',
    perks: PERKS.map(p => ({ ...p, isUnlocked: false })),
    achievements: [],
    teamNotes: [],
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

/**
 * Award fire points for an action
 */
export function awardPoints(
  action: keyof typeof POINT_VALUES,
  multiplier: number = 1
): { newTotal: number; pointsEarned: number; tierUp: boolean; perksUnlocked: string[] } {
  let profile = getInvestorProfile();
  
  // Initialize if needed
  if (!profile) {
    const userId = localStorage.getItem('userId') || `anon_${Date.now()}`;
    profile = initializeInvestorProfile(userId);
  }
  
  // Check daily reset
  const lastActivity = new Date(profile.firePoints.lastActivity);
  const today = new Date();
  const isNewDay = lastActivity.toDateString() !== today.toDateString();
  
  if (isNewDay) {
    profile.firePoints.earnedToday = 0;
    
    // Check streak
    const dayDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff === 1) {
      profile.firePoints.streak += 1;
    } else if (dayDiff > 1) {
      profile.firePoints.streak = 1; // reset streak
    }
  }
  
  const pointsEarned = POINT_VALUES[action] * multiplier;
  const oldTotal = profile.firePoints.total;
  const oldTier = profile.tier;
  
  profile.firePoints.total += pointsEarned;
  profile.firePoints.earnedToday += pointsEarned;
  profile.firePoints.lastActivity = today.toISOString();
  
  // Check tier upgrade
  const newTier = calculateTier(profile.firePoints.total);
  const tierUp = newTier !== oldTier;
  if (tierUp) {
    profile.tier = newTier;
  }
  
  // Check perk unlocks
  const perksUnlocked: string[] = [];
  profile.perks = profile.perks.map(perk => {
    if (!perk.isUnlocked && profile.firePoints.total >= perk.unlockedAt) {
      perksUnlocked.push(perk.name);
      return { ...perk, isUnlocked: true };
    }
    return perk;
  });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  
  return {
    newTotal: profile.firePoints.total,
    pointsEarned,
    tierUp,
    perksUnlocked,
  };
}

/**
 * Calculate investor tier based on points
 */
export function calculateTier(points: number): InvestorProfile['tier'] {
  if (points >= TIER_THRESHOLDS.Diamond) return 'Diamond';
  if (points >= TIER_THRESHOLDS.Platinum) return 'Platinum';
  if (points >= TIER_THRESHOLDS.Gold) return 'Gold';
  if (points >= TIER_THRESHOLDS.Silver) return 'Silver';
  return 'Bronze';
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: InvestorProfile['tier']): string {
  const colors = {
    Bronze: 'from-amber-600 to-amber-800',
    Silver: 'from-slate-400 to-slate-600',
    Gold: 'from-yellow-400 to-yellow-600',
    Platinum: 'from-cyan-400 to-blue-600',
    Diamond: 'from-purple-400 to-pink-600',
  };
  return colors[tier];
}

/**
 * Check if user has early access perk
 */
export function hasEarlyAccess(): boolean {
  const profile = getInvestorProfile();
  if (!profile) return false;
  
  const earlyAccessPerk = profile.perks.find(p => p.id === 'early-access');
  return earlyAccessPerk?.isUnlocked || false;
}

/**
 * Check if user has team notes perk
 */
export function hasTeamNotes(): boolean {
  const profile = getInvestorProfile();
  if (!profile) return false;
  
  const teamNotesPerk = profile.perks.find(p => p.id === 'team-notes');
  return teamNotesPerk?.isUnlocked || false;
}

/**
 * Check if user has AI scout perk
 */
export function hasAIScout(): boolean {
  const profile = getInvestorProfile();
  if (!profile) return false;
  
  const aiScoutPerk = profile.perks.find(p => p.id === 'ai-scout');
  return aiScoutPerk?.isUnlocked || false;
}

/**
 * Generate random bonus card reward
 * Randomly appears to keep users engaged
 */
export function shouldShowBonusCard(): boolean {
  // 20% chance to show bonus card
  return Math.random() < 0.2;
}

/**
 * Get random bonus multiplier (1.5x to 3x)
 */
export function getRandomBonusMultiplier(): number {
  const multipliers = [1.5, 2, 2.5, 3];
  return multipliers[Math.floor(Math.random() * multipliers.length)];
}
