// Re-export everything from types/index for backwards compatibility
export * from './types/index';

export interface StoreState {
  startups: import('./types/index').StartupComponent[];
  currentIndex: number;
  portfolio: import('./types/index').StartupComponent[];
  voteYes: (startup: import('./types/index').StartupComponent) => void;
  voteNo: () => void;
  rateStartup: (index: number, rating: number) => void;
  resetVoting: () => void;
  unvote: (startup: import('./types/index').StartupComponent) => void;
  loadStartupsFromDatabase: () => Promise<void>;
}
// FIXED types.ts

export interface Founder {
  name: string;
  role: string;
  background: string;
  linkedIn?: string;
}

export interface IPFiling {
  type: 'patent' | 'trademark' | 'copyright';
  title: string;
  status: 'pending' | 'approved' | 'filed';
  date: Date;
  jurisdiction?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  previousCompany?: string;
  joinedDate: Date;
}

export interface Advisor {
  name: string;
  expertise: string;
  currentRole?: string;
  company?: string;
  joinedDate: Date;
}

export interface CustomerTraction {
  metric: string; // e.g., "10K users", "$500K ARR", "100 enterprise clients"
  date: Date;
  description?: string;
}

/**
 * @deprecated Use `Startup` from '@/types' or '@/lib/database.types' instead
 * This interface is kept for backward compatibility but will be removed in a future version.
 * Use adaptStartupForComponent() from '@/utils/startupAdapters' to convert database types.
 */
export interface Startup {
  id: number;
  name: string;
  description: string;
  marketSize: string;
  unique: string;
  raise: string;
  video?: string;
  deck?: string;
  press?: string;
  tech?: string;
  teamLogos?: string[];
  yesVotes?: number;
  noVotes?: number;
  rating?: number;
  stage?: number; // 0-5 for stage progression
  tagline?: string; // Short tagline like "AI-powered HR"
  pitch?: string; // Main pitch description
  fivePoints?: string[]; // The 5 key points for the card
  comments?: Comment[];
  hotness?: number; // Calculated hotness score out of 5.0
  
  // GOD Algorithm Scores (from database, 0-100 scale)
  total_god_score?: number; // Overall GOD score (weighted average)
  team_score?: number; // Team quality score (20% weight)
  traction_score?: number; // Traction/growth score (18% weight)
  market_score?: number; // Market opportunity score (15% weight)
  product_score?: number; // Product development score (12% weight)
  vision_score?: number; // Vision/ambition score (10% weight)
  
  answersCount?: number; // Number of answers (questions answered)
  industries?: string[]; // Industry tags: fintech, ai, saas, deeptech, robotics, healthtech, edtech, cleantech, ecommerce, crypto, consumer, enterprise
  founders?: Founder[];
  ipFilings?: IPFiling[];
  teamHires?: TeamMember[];
  advisors?: Advisor[];
  boardMembers?: Advisor[]; // Reuse Advisor interface for board members
  customerTraction?: CustomerTraction[];
  
  // Additional fields from extracted_data
  team?: string;
  traction?: string;
  extracted_data?: any; // JSONB field from database
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
}

