// src/store.ts

import { Startup, StoreState } from './types';
import { create } from 'zustand';
import { persist, StateStorage } from 'zustand/middleware';
import startupData from './data/startupData';
import { getStartupUploads } from './lib/investorService';

// Function to load approved startups from Supabase
export async function loadApprovedStartups(): Promise<Startup[]> {
  try {
    const { data, error } = await getStartupUploads('approved');
    
    if (error || !data) {
      console.error('Error loading approved startups:', error);
      return [];
    }

    // Convert startup_uploads to Startup format
    return data.map((upload: any, index: number) => ({
      id: startupData.length + index, // Use unique IDs after static data
      name: upload.name || 'Unnamed Startup',
      description: upload.description || '',
      pitch: upload.pitch || upload.tagline || '',
      tagline: upload.tagline || '',
      marketSize: upload.extracted_data?.marketSize || '',
      unique: upload.extracted_data?.unique || '',
      raise: upload.raise_amount || '',
      stage: upload.stage || 1,
      yesVotes: 0,
      noVotes: 0,
      hotness: 0,
      answersCount: 0,
      fivePoints: upload.extracted_data?.fivePoints || [],
      website: upload.website,
      linkedin: upload.linkedin,
      comments: [],
    }));
  } catch (err) {
    console.error('Failed to load approved startups:', err);
    return [];
  }
}

export const useStore = create<StoreState>()(
  persist<StoreState>(
  (set, get) => ({
      unvote: (startup: Startup) => {
        const state = get();
        // Remove from portfolio
        const newPortfolio = state.portfolio.filter((s: Startup) => s.id !== startup.id);
        // Decrement yesVotes in startups
        const updatedStartups = state.startups.map((s: Startup) =>
          s.id === startup.id ? { ...s, yesVotes: Math.max((s.yesVotes || 1) - 1, 0) } : s
        );
        set({
          startups: updatedStartups,
          portfolio: newPortfolio,
        });
      },
      startups: startupData.map((s, idx) => ({
        ...s,
        id: idx,
        yesVotes: 0,
      })),
      currentIndex: 0,
      portfolio: [],
      voteYes: (startup: Startup) => {
        const state = get();
        console.log('voteYes called for:', startup.name, 'Current portfolio:', state.portfolio);
        const updatedStartups = [...state.startups];
        const index = updatedStartups.findIndex(s => s.id === startup.id);
        let updatedStartup = startup;
        if (index !== -1) {
          updatedStartups[index].yesVotes = (updatedStartups[index].yesVotes || 0) + 1;
          updatedStartup = { ...updatedStartups[index] };
        }
        // Only add to portfolio if not already present
        const alreadyInPortfolio = state.portfolio.some((s: Startup) => s.id === updatedStartup.id);
        const newPortfolio = alreadyInPortfolio
          ? state.portfolio.map((s: Startup) => s.id === updatedStartup.id ? updatedStartup : s)
          : [...state.portfolio, updatedStartup];
        
        console.log('New portfolio will be:', newPortfolio);
        
        // Save YES votes to localStorage for Dashboard
        const myYesVotes = JSON.parse(localStorage.getItem('myYesVotes') || '[]');
        const startupIdStr = updatedStartup.id.toString();
        if (!myYesVotes.includes(startupIdStr)) {
          myYesVotes.push(startupIdStr);
          localStorage.setItem('myYesVotes', JSON.stringify(myYesVotes));
        }
        
        // Also save to votedStartups
        const votedStartups = JSON.parse(localStorage.getItem('votedStartups') || '[]');
        if (!votedStartups.includes(startupIdStr)) {
          votedStartups.push(startupIdStr);
          localStorage.setItem('votedStartups', JSON.stringify(votedStartups));
        }
        
        set({
          startups: updatedStartups,
          portfolio: newPortfolio,
          currentIndex: state.currentIndex + 1,
        });
      },
      voteNo: () => {
        set((state) => ({
          currentIndex: state.currentIndex + 1,
        }));
      },
      rateStartup: (index: number, rating: number) => {
        set((state) => {
          const updated = [...state.portfolio];
          if (updated[index]) {
            updated[index].rating = rating;
          }
          return { portfolio: updated };
        });
      },
      resetVoting: () => {
        set((state) => ({
          currentIndex: 0,
        }));
      },
      loadStartupsFromDatabase: async () => {
        const approvedStartups = await loadApprovedStartups();
        const allStartups = [
          ...startupData.map((s, idx) => ({ ...s, id: idx, yesVotes: 0 })),
          ...approvedStartups
        ];
        set({ startups: allStartups });
      },
    }),
    {
      name: 'hot-money-honey-store',
    }
  )
);

