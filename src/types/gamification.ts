/**
 * GAMIFICATION SYSTEM
 * ====================
 * Fire Points reward system to drive investor engagement
 * 
 * Points are earned through:
 * - Voting on startups
 * - Daily logins
 * - Sharing deals
 * - Early discovery of startups
 * - Completing profile
 */

export interface FirePoints {
  total: number;
  earnedToday: number;
  streak: number; // consecutive days of activity
  lastActivity: string; // ISO date
}

export interface InvestorProfile {
  userId: string;
  firePoints: FirePoints;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  perks: InvestorPerk[];
  achievements: Achievement[];
  teamNotes: TeamNote[];
  scoutPreferences?: ScoutPreferences;
}

export interface InvestorPerk {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number; // fire points required
  isUnlocked: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string; // ISO date
  pointsAwarded: number;
}

export interface TeamNote {
  id: string;
  startupId: string;
  content: string;
  createdAt: string;
  tags: string[];
}

export interface ScoutPreferences {
  industries: string[];
  minFunding?: number;
  maxFunding?: number;
  stages: string[];
  keywords: string[];
  excludeKeywords: string[];
  regions?: string[];
}

// Point values for different actions
export const POINT_VALUES = {
  VOTE_YES: 10,
  VOTE_NO: 5,
  DAILY_LOGIN: 20,
  WEEKLY_STREAK: 50,
  SHARE_DEAL: 15,
  COMPLETE_PROFILE: 100,
  FIRST_INVESTMENT: 200,
  REFER_INVESTOR: 150,
  DISCOVER_EARLY: 30, // voting on startup in first 24h
  WRITE_NOTE: 5,
  RANDOM_CARD_BONUS: 25, // random reward card
};

// Tier thresholds
export const TIER_THRESHOLDS = {
  Bronze: 0,
  Silver: 500,
  Gold: 2000,
  Platinum: 5000,
  Diamond: 10000,
};

// Perks unlock at different point levels
export const PERKS: InvestorPerk[] = [
  {
    id: 'early-access',
    name: 'Early Access',
    description: 'See newest startups 24 hours before other investors',
    icon: '⚡',
    unlockedAt: 100,
    isUnlocked: false,
  },
  {
    id: 'team-notes',
    name: 'Team Notes',
    description: 'Leave private notes on deals for your team to review',
    icon: '📝',
    unlockedAt: 250,
    isUnlocked: false,
  },
  {
    id: 'ai-scout',
    name: 'AI Scout',
    description: 'Get daily personalized deal recommendations from AI',
    icon: '🤖',
    unlockedAt: 500,
    isUnlocked: false,
  },
  {
    id: 'priority-support',
    name: 'Priority Support',
    description: 'Direct line to founders and priority deal access',
    icon: '💎',
    unlockedAt: 1000,
    isUnlocked: false,
  },
  {
    id: 'deal-analytics',
    name: 'Advanced Analytics',
    description: 'Deep insights and trends across your portfolio',
    icon: '📊',
    unlockedAt: 1500,
    isUnlocked: false,
  },
  {
    id: 'syndicate-lead',
    name: 'Syndicate Lead',
    description: 'Create and lead investment syndicates',
    icon: '👥',
    unlockedAt: 3000,
    isUnlocked: false,
  },
];
