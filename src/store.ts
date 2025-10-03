// src/store.ts

import { Startup, StoreState } from './types';
import { create } from 'zustand';
import { persist, StateStorage } from 'zustand/middleware';
import startupData from './data/startupData';


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
    }),
    {
      name: 'hot-money-honey-store',
    }
  )
);

