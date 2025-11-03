
export interface StoreState {
  startups: Startup[];
  currentIndex: number;
  portfolio: Startup[];
  voteYes: (startup: Startup) => void;
  voteNo: () => void;
  rateStartup: (index: number, rating: number) => void;
  resetVoting: () => void;
  unvote: (startup: Startup) => void;
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
  answersCount?: number; // Number of answers (questions answered)
  industries?: string[]; // Industry tags: fintech, ai, saas, deeptech, robotics, healthtech, edtech, cleantech, ecommerce, crypto, consumer, enterprise
  founders?: Founder[];
  ipFilings?: IPFiling[];
  teamHires?: TeamMember[];
  advisors?: Advisor[];
  boardMembers?: Advisor[]; // Reuse Advisor interface for board members
  customerTraction?: CustomerTraction[];
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
}

