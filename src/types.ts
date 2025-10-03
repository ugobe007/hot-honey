
export interface StoreState {
  startups: Startup[];
  currentIndex: number;
  portfolio: Startup[];
  voteYes: (startup: Startup) => void;
  voteNo: () => void;
  rateStartup: (index: number, rating: number) => void;
  resetVoting: () => void;
  unvote: (startup: Startup) => void;
}
// FIXED types.ts

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
  rating?: number;
}

