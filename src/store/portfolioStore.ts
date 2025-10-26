import { create } from 'zustand';

interface Startup {
  id: string;
  name: string;
  description: string;
  votes: number;
  totalVotes: number;
  stage: string;
  yesVotes: number; // Track all "yes" votes beyond the 5 needed
  comments: Array<{
    id: string;
    userId: string;
    userName: string;
    comment: string;
    timestamp: Date;
  }>;
  honeypotClicks: number;
}

interface UserVote {
  startupId: string;
  vote: 'yes' | 'no';
  timestamp: Date;
}

interface PortfolioState {
  userVotes: UserVote[];
  portfolioStartups: string[]; // IDs of startups user voted "yes" on
  startups: Startup[];
  
  // Actions
  addVote: (startupId: string, vote: 'yes' | 'no') => void;
  addComment: (startupId: string, comment: string) => void;
  incrementHoneypotClick: (startupId: string) => void;
  getStartupById: (id: string) => Startup | undefined;
  getUserVoteForStartup: (startupId: string) => UserVote | undefined;
  calculatePopularityScore: (startupId: string) => number;
  checkForStageAdvancement: (startupId: string) => boolean;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  userVotes: [],
  portfolioStartups: [],
  startups: [
    {
      id: '1',
      name: 'NeuralNest',
      description: 'AI-powered neural networks for edge computing',
      votes: 3,
      totalVotes: 5,
      yesVotes: 3,
      stage: 'Stage 1: Initial Voting',
      comments: [],
      honeypotClicks: 0
    },
    {
      id: '2',
      name: 'GreenTech',
      description: 'Sustainable energy solutions for smart cities',
      votes: 7,
      totalVotes: 5,
      yesVotes: 7,
      stage: 'Stage 2: Community Review',
      comments: [],
      honeypotClicks: 0
    },
    {
      id: '3',
      name: 'FinFlow',
      description: 'Automated financial flow management platform',
      votes: 4,
      totalVotes: 5,
      yesVotes: 4,
      stage: 'Stage 1: Initial Voting',
      comments: [],
      honeypotClicks: 0
    }
  ],

  addVote: (startupId: string, vote: 'yes' | 'no') => {
    const state = get();
    const existingVote = state.userVotes.find(v => v.startupId === startupId);
    
    if (existingVote) return; // User already voted

    // Add user vote
    const newVote: UserVote = {
      startupId,
      vote,
      timestamp: new Date()
    };

    // Update startup vote count
    const updatedStartups = state.startups.map(startup => {
      if (startup.id === startupId) {
        const newYesVotes = vote === 'yes' ? startup.yesVotes + 1 : startup.yesVotes;
        const newTotalVotes = startup.votes + 1;
        
        return {
          ...startup,
          votes: newTotalVotes,
          yesVotes: newYesVotes
        };
      }
      return startup;
    });

    // Add to portfolio if voted "yes"
    const newPortfolioStartups = vote === 'yes' 
      ? [...state.portfolioStartups, startupId]
      : state.portfolioStartups;

    set({
      userVotes: [...state.userVotes, newVote],
      portfolioStartups: newPortfolioStartups,
      startups: updatedStartups
    });

    // Check if startup should advance to next stage
    get().checkForStageAdvancement(startupId);
  },

  addComment: (startupId: string, comment: string) => {
    const state = get();
    const newComment = {
      id: Date.now().toString(),
      userId: 'current-user', // TODO: Get from auth
      userName: 'Anonymous User', // TODO: Get from auth
      comment,
      timestamp: new Date()
    };

    const updatedStartups = state.startups.map(startup => {
      if (startup.id === startupId) {
        return {
          ...startup,
          comments: [...startup.comments, newComment]
        };
      }
      return startup;
    });

    set({ startups: updatedStartups });
  },

  incrementHoneypotClick: (startupId: string) => {
    const state = get();
    const updatedStartups = state.startups.map(startup => {
      if (startup.id === startupId) {
        return {
          ...startup,
          honeypotClicks: startup.honeypotClicks + 1
        };
      }
      return startup;
    });

    set({ startups: updatedStartups });
  },

  getStartupById: (id: string) => {
    return get().startups.find(startup => startup.id === id);
  },

  getUserVoteForStartup: (startupId: string) => {
    return get().userVotes.find(vote => vote.startupId === startupId);
  },

  calculatePopularityScore: (startupId: string) => {
    const startup = get().getStartupById(startupId);
    if (!startup) return 0;

    // Algorithm: (yes votes * 10) + (comments * 5) + (honeypot clicks * 2)
    return (startup.yesVotes * 10) + (startup.comments.length * 5) + (startup.honeypotClicks * 2);
  },

  checkForStageAdvancement: (startupId: string) => {
    const state = get();
    const startup = state.getStartupById(startupId);
    if (!startup) return false;

    let shouldAdvance = false;
    let newStage = startup.stage;

    // Stage advancement logic
    if (startup.stage === 'Stage 1: Initial Voting' && startup.yesVotes >= 5) {
      newStage = 'Stage 2: Community Review';
      shouldAdvance = true;
    } else if (startup.stage === 'Stage 2: Community Review' && startup.yesVotes >= 15) {
      newStage = 'Stage 3: Expert Review';
      shouldAdvance = true;
    } else if (startup.stage === 'Stage 3: Expert Review' && startup.yesVotes >= 30) {
      newStage = 'Stage 4: Final Round';
      shouldAdvance = true;
    } else if (startup.stage === 'Stage 4: Final Round' && startup.yesVotes >= 50) {
      newStage = 'HOT MONEY!!!';
      shouldAdvance = true;
    }

    if (shouldAdvance) {
      const updatedStartups = state.startups.map(s => {
        if (s.id === startupId) {
          return { ...s, stage: newStage };
        }
        return s;
      });

      set({ startups: updatedStartups });
    }

    return shouldAdvance;
  }
}));